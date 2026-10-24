// @ts-ignore
import { env } from "cloudflare:workers";

import { parseInsights, INSIGHT_SYSTEM_PROMPT, buildInsightPrompt } from "@/lib/insight-grounding";
import { insightsInputSchema } from "@/lib/rewind-schemas";

const MAX_REQUEST_BYTES = 24000;
const INSIGHTS_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        personaTitle: { type: "string" },
        headline: { type: "string" },
        yearlyOverview: { type: "string" },
        significantAchievements: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    text: { type: "string" },
                    facts: { type: "array", items: { type: "string" } },
                },
                required: ["text", "facts"],
            },
        },
        areasOfGrowth: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    text: { type: "string" },
                    facts: { type: "array", items: { type: "string" } },
                },
                required: ["text", "facts"],
            },
        },
        codingStyle: { type: "string" },
        shareCaption: { type: "string" },
        caveat: { type: ["string", "null"] },
    },
    required: [
        "personaTitle",
        "headline",
        "yearlyOverview",
        "significantAchievements",
        "areasOfGrowth",
        "codingStyle",
        "shareCaption",
        "caveat",
    ],
} as const;

export async function POST(request: Request) {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
        return Response.json({ error: "Insights request is too large." }, { status: 413 });
    }

    let bodyText: string;
    try {
        const reader = request.body?.getReader();
        if (!reader) {
            return Response.json({ error: "Insights request body is required." }, { status: 400 });
        }

        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_REQUEST_BYTES) {
                await reader.cancel();
                return Response.json({ error: "Insights request is too large." }, { status: 413 });
            }
            chunks.push(value);
        }

        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        }
        bodyText = new TextDecoder().decode(bytes);
    } catch {
        return Response.json({ error: "Could not read the insights request." }, { status: 400 });
    }

    let body: unknown;
    try {
        body = JSON.parse(bodyText);
    } catch {
        return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = insightsInputSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: "Invalid insights data." }, { status: 400 });
    }

    const input = parsed.data;
    if (
        input.facts.some((fact, index) => fact.id !== `f${index + 1}` || /[\r\n\0]/.test(fact.text))
    ) {
        return Response.json({ error: "Invalid insights facts." }, { status: 400 });
    }

    // Only Cloudflare's client IP header is trusted; forwarded headers can be spoofed.
    const clientIp = request.headers.get("cf-connecting-ip")?.trim();
    const rateLimitKey = clientIp && clientIp.length <= 64 ? clientIp : "unknown";

    try {
        const { success } = await env.INSIGHTS_RATE_LIMITER.limit({ key: rateLimitKey });
        if (!success) {
            return Response.json(
                { error: "Insights are being requested too often. Please try again shortly." },
                { status: 429 },
            );
        }
    } catch (error) {
        console.error("Insights rate limiter failed:", error);
        return Response.json({ error: "Insights are temporarily unavailable." }, { status: 500 });
    }

    try {
        const result = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [
                { role: "system", content: INSIGHT_SYSTEM_PROMPT },
                { role: "user", content: buildInsightPrompt(input.login, input.year, input.facts) },
            ],
            max_tokens: 1500,
            response_format: {
                type: "json_schema",
                json_schema: INSIGHTS_RESPONSE_SCHEMA,
            },
        });

        const message = result?.choices?.[0]?.message?.content;
        if (typeof message !== "string" || !message.trim()) {
            return Response.json(
                { error: "The AI did not return an insights response." },
                { status: 502 },
            );
        }
        return Response.json({
            insights: parseInsights(message, input.facts, input.year, input.login),
        });
    } catch (error) {
        console.error("Insights generation failed:", error);
        const message =
            error instanceof Error && error.message === "AI returned an invalid JSON response."
                ? "The AI returned an incomplete response. Please try again."
                : "Could not generate grounded insights. Please try again.";
        return Response.json({ error: message }, { status: 502 });
    }
}

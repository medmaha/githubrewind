// @ts-ignore
import { env } from "cloudflare:workers";

import {
    apiJson,
    apiOptions,
    getRateLimitKey,
    readJsonBody,
    rejectCrossOrigin,
    requireJsonContentType,
} from "@/lib/api-security";
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

export function OPTIONS(request: Request) {
    return apiOptions(request);
}

export async function POST(request: Request) {
    const rejectedOrigin = rejectCrossOrigin(request);
    if (rejectedOrigin) return rejectedOrigin;

    const invalidContentType = requireJsonContentType(request);
    if (invalidContentType) return invalidContentType;

    const body = await readJsonBody(request, MAX_REQUEST_BYTES);
    if (!body.ok) return body.response;

    const parsed = insightsInputSchema.safeParse(body.body);
    if (!parsed.success) {
        return apiJson({ error: "Invalid insights data." }, { status: 400 });
    }

    const input = parsed.data;
    if (
        input.facts.some((fact, index) => fact.id !== `f${index + 1}` || /[\r\n\0]/.test(fact.text))
    ) {
        return apiJson({ error: "Invalid insights facts." }, { status: 400 });
    }

    try {
        const { success } = await env.INSIGHTS_RATE_LIMITER.limit({
            key: getRateLimitKey(request),
        });
        if (!success) {
            return apiJson(
                { error: "Insights are being requested too often. Please try again shortly." },
                { status: 429 },
            );
        }
    } catch (error) {
        console.error("Insights rate limiter failed:", error);
        return apiJson({ error: "Insights are temporarily unavailable." }, { status: 503 });
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
            return apiJson(
                { error: "The AI did not return an insights response." },
                { status: 502 },
            );
        }
        return apiJson({
            insights: parseInsights(message, input.facts, input.year, input.login),
        });
    } catch (error) {
        console.error("Insights generation failed:", error);
        const message =
            error instanceof Error && error.message === "AI returned an invalid JSON response."
                ? "The AI returned an incomplete response. Please try again."
                : "Could not generate grounded insights. Please try again.";
        return apiJson({ error: message }, { status: 502 });
    }
}

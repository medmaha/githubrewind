// @ts-ignore
import { env } from "cloudflare:workers";
import { fetchRewindRaw } from "@/lib/github.api";
import {
    apiJson,
    apiOptions,
    getRateLimitKey,
    readJsonBody,
    rejectCrossOrigin,
    requireJsonContentType,
} from "@/lib/api-security";
import { rewindInputSchema } from "@/lib/rewind-schemas";

const MAX_REQUEST_BYTES = 2048;
const serverRewindInputSchema = rewindInputSchema.pick({ username: true, year: true }).strict();

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

    const parsed = serverRewindInputSchema.safeParse(body.body);
    if (!parsed.success) {
        return apiJson({ error: "Invalid rewind request." }, { status: 400 });
    }

    try {
        const { success } = await env.REWIND_RATE_LIMITER.limit({
            key: getRateLimitKey(request),
        });
        if (!success) {
            return apiJson(
                {
                    code: "INTERNAL_LIMIT",
                    error: "Shared GitHub request limit reached. Try again shortly or use your own token.",
                },
                { status: 429 },
            );
        }
    } catch (error) {
        console.error("Rewind rate limiter failed:", error);
        return apiJson({ error: "Rewind requests are temporarily unavailable." }, { status: 503 });
    }

    const token = process.env.INTERNAL_GITHUB_API_TOKEN;
    if (!token) {
        console.error("INTERNAL_GITHUB_API_TOKEN is not configured.");
        return apiJson({ error: "Rewind requests are temporarily unavailable." }, { status: 503 });
    }

    try {
        const raw = await fetchRewindRaw(parsed.data.username, parsed.data.year, token, {
            includePrivateRepos: false,
        });
        return apiJson({ ok: true, raw });
    } catch (error) {
        console.error("Rewind GitHub request failed:", error);
        return apiJson(
            { error: "Could not fetch GitHub activity. Please try again." },
            { status: 502 },
        );
    }
}

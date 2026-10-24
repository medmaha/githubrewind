"use server";

import { z } from "zod";

import { fetchRewindRaw } from "./github.api";
import { enforceSharedTokenRateLimit, enforceInsightsRateLimit } from "./rate-limit.server";
import { generateInsights } from "./ai-insights";
import { insightsInputSchema, rewindInputSchema } from "./rewind-schemas";
import type { InternalInsightResult, InternalRewindResult } from "./rewind-types";

/**
 * Runs a rewind with OUR token. Capped at 2 requests / 5 min / IP.
 * Any user-supplied token in the payload is deliberately ignored here: users with their
 * own token run the request in the browser and never touch the shared quota.
 */
export const analyzeGithubServer = async (payload: unknown): Promise<InternalRewindResult> => {
    const data = rewindInputSchema.parse(payload);

    const limit = await enforceSharedTokenRateLimit();
    if (!limit.ok) {
        return {
            ok: false,
            code: "INTERNAL_LIMIT",
            message:
                limit.reason === "rate_limit"
                    ? "Shared token limit reached (2 requests per 5 minutes)."
                    : "Request blocked.",
            retryAt: limit.reason === "rate_limit" ? limit.retryAt : null,
        };
    }

    try {
        // Fetch only. All computation happens on the client (rewind-utils.ts) to save server CPU.
        const raw = await fetchRewindRaw(
            data.username,
            data.year,
            process.env.INTERNAL_GITHUB_API_TOKEN,
        );
        return { ok: true, raw };
    } catch (e) {
        return {
            ok: false,
            code: "ERROR",
            message: (e as Error).message || "Something went wrong",
            retryAt: null,
        };
    }
};

export const getAiInsightsServer = async (payload: unknown): Promise<InternalInsightResult> => {
    const data = insightsInputSchema.parse(payload);
    const limit = await enforceInsightsRateLimit();
    if (!limit.ok) {
        return {
            ok: false,
            code: "INTERNAL_LIMIT",
            message:
                limit.reason === "rate_limit"
                    ? "AI Insight quota reached (2 requests per 10 minutes)."
                    : "Request blocked.",
            retryAt: limit.reason === "rate_limit" ? limit.retryAt : null,
        };
    }

    const insights = await generateInsights(
        data.summary as z.infer<typeof insightsInputSchema>["summary"],
    );
    return { ok: true, insights };
};

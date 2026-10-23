"use server";

import { z } from "zod";

import { buildRewind } from "./github.api";
import { enforceRateLimit } from "./rate-limit.server";
import { generateInsights } from "./ai-insights";
import { insightsInputSchema, rewindInputSchema } from "./rewind-schemas";

export const analyzeGithubServer = async (payload: unknown) => {
    const data = rewindInputSchema.parse(payload);
    await enforceRateLimit("api");
    return buildRewind(data.username, data.year, process.env.INTERNAL_GITHUB_API_TOKEN);
};

export const getAiInsights = async (payload: unknown) => {
    const data = insightsInputSchema.parse(payload);
    await enforceRateLimit("insights");
    return generateInsights(data.summary as z.infer<typeof insightsInputSchema>["summary"]);
};

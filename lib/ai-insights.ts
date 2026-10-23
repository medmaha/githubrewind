"server only";

import type { InsightsSummary } from "./rewind-schemas";
import type { AiInsights } from "./rewind-types";

import { GoogleGenerativeAI } from "@google/generative-ai";

const schemaHint = `
You are a senior engineering manager writing a concise, professional developer year-in-review. Never invent numbers that are not in the data.
Return STRICT JSON only, matching:
{
  "personaTitle": string (max 40 chars, e.g. "The Systems Craftsman"),
  "headline": string (max 90 chars),
  "yearlyOverview": string (2-4 sentences, professional, factual, no hype),
  "significantAchievements": string[] (3-5 items, each max 130 chars),
  "areasOfGrowth": string[] (3-4 items, each max 130 chars, constructive),
  "codingStyle": string (2-3 sentences inferred from languages, repo mix and cadence),
  "shareCaption": string (max 260 chars, LinkedIn-ready, first person, 1-2 emojis max)
}`;

const apiKey = process.env.GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function generateInsights(summary: InsightsSummary): Promise<AiInsights> {
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const prompt = `System: ${schemaHint}\n\n User: Developer GitHub metrics for ${summary.year}:\n${JSON.stringify(summary)}`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const raw = response.text();
        const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);

        let parsed: Partial<AiInsights>;
        try {
            parsed = JSON.parse(jsonText) as Partial<AiInsights>;
        } catch {
            throw new Error("AI returned an unexpected response. Please try again.");
        }

        const list = (value: unknown, fallback: string[]) =>
            Array.isArray(value)
                ? value.filter((v): v is string => typeof v === "string").slice(0, 5)
                : fallback;

        return {
            personaTitle: parsed.personaTitle?.slice(0, 60) ?? "The Builder",
            headline: parsed.headline?.slice(0, 140) ?? `A year of shipping on GitHub`,
            yearlyOverview: parsed.yearlyOverview ?? "",
            significantAchievements: list(parsed.significantAchievements, []),
            areasOfGrowth: list(parsed.areasOfGrowth, []),
            codingStyle: parsed.codingStyle ?? "",
            shareCaption: (parsed.shareCaption ?? "").slice(0, 400),
        };
    } catch (response: any) {
        console.error(`AI gateway failed [${response.status}]: ${summary}`);
        if (response.status === 429)
            throw new Error("AI is busy right now. Please retry in a moment.");
        if (response.status === 402) throw new Error("AI credits exhausted for this workspace.");
        throw new Error(`AI request failed (${response.status}).`);
    }
}

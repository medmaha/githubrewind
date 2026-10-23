import { z } from "zod";

const currentYear = new Date().getUTCFullYear();

export const rewindInputSchema = z.object({
    username: z
        .string()
        .trim()
        .min(1, "Enter a GitHub username")
        .max(39)
        .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/, "Invalid GitHub username"),
    year: z.coerce.number().int().min(2008).max(currentYear),
    token: z
        .string()
        .trim()
        .max(255)
        .regex(/^[A-Za-z0-9_.-]*$/, "Invalid token format")
        .optional()
        .or(z.literal("")),
});

/** Only aggregate, non-sensitive numbers are ever sent to the AI model. */
export const insightsInputSchema = z.object({
    summary: z.object({
        login: z.string().max(39),
        year: z
            .number()
            .int()
            .min(2008)
            .max(currentYear + 1),
        repos: z.number().int().min(0).max(100000),
        commits: z.number().int().min(0).max(1000000),
        prs: z.number().int().min(0).max(1000000),
        prsMerged: z.number().int().min(0).max(1000000),
        issues: z.number().int().min(0).max(1000000),
        reviews: z.number().int().min(0).max(1000000),
        stars: z.number().int().min(0).max(10000000),
        followers: z.number().int().min(0).max(10000000),
        activeDays: z.number().int().min(0).max(366),
        longestStreak: z.number().int().min(0).max(366),
        estimatedLinesOfCode: z.number().int().min(0),
        languages: z.array(z.object({ name: z.string().max(40), percent: z.number() })).max(10),
        topRepoNames: z.array(z.string().max(120)).max(6),
        topics: z.array(z.string().max(40)).max(20),
    }),
});

export type RewindInput = z.infer<typeof rewindInputSchema>;
export type InsightsSummary = z.infer<typeof insightsInputSchema>["summary"];

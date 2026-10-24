import { z } from "zod";

const minYear = 2010;

const yearSchema = z.coerce
    .number()
    .int()
    .min(minYear)
    .refine((value) => {
        const year = Number(value);
        const currentYear = new Date().getUTCFullYear();
        return !Number.isNaN(year) && year <= currentYear + 1;
    }, `Year must be between ${minYear} and the current year`);

export const rewindInputSchema = z.object({
    username: z
        .string()
        .trim()
        .min(1, "Enter a GitHub username")
        .max(39)
        .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/, "Invalid GitHub username"),
    year: yearSchema,
    token: z
        .string()
        .trim()
        .max(255)
        .regex(/^[A-Za-z0-9_.-]*$/, "Invalid token format")
        .optional()
        .or(z.literal("")),
});

export const insightsInputSchema = z.object({
    login: z
        .string()
        .trim()
        .min(1)
        .max(39)
        .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/),
    year: yearSchema,
    facts: z
        .array(
            z.object({
                id: z.string().regex(/^f[1-9]\d{0,2}$/),
                text: z.string().trim().min(1).max(300),
            }),
        )
        .min(1)
        .max(40),
});

export type RewindInput = z.infer<typeof rewindInputSchema>;
export type InsightsInput = z.infer<typeof insightsInputSchema>;

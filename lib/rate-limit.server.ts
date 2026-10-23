"use server";

import arcjet, { fixedWindow, request, shield } from "@arcjet/next";

const mode = process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN";

const rateLimiters = {
    api: arcjet({
        key: process.env.ARCJET_KEY!,
        characteristics: ["ip.src"],
        rules: [
            shield({ mode }),
            fixedWindow({
                mode,
                window: "80s", // 5 minutes fixed window
                max: 6, // allow a maximum of 3 requests
            }),
        ],
    }),
    insights: arcjet({
        key: process.env.ARCJET_KEY!,
        characteristics: ["ip.src"],
        rules: [
            shield({ mode }),
            fixedWindow({
                mode,
                window: "60s", // 5 minutes fixed window
                max: 2, // allow a maximum of 3 requests
            }),
        ],
    }),
    feedback: arcjet({
        key: process.env.ARCJET_KEY!,
        characteristics: ["ip.src"],
        rules: [
            shield({ mode }),
            fixedWindow({
                mode,
                window: "60s", // 5 minutes fixed window
                max: 2, // allow a maximum of 3 requests
            }),
        ],
    }),
};

export async function enforceRateLimit(key: "insights" | "api") {
    if (process.env.CF_WORKER_DEV === "true") return

    const req = await request();
    const decision = await rateLimiters[key].protect(req);
    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error("You've hit the rate limit please try again in 2mins");
        } else {
            throw new Error("Forbidden");
        }
    }
}

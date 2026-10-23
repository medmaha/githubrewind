"use server";

import arcjet, { fixedWindow, request, shield } from "@arcjet/next";

const mode = process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN";

const rateLimiters = {
    // We're using our internal API key because GitHub rate-limits its free requests.
    api: arcjet({
        key: process.env.ARCJET_KEY!,
        characteristics: ["ip.src"],
        rules: [
            shield({ mode }),
            fixedWindow({
                mode,
                window: "300s", // 5 minutes fixed window
                max: 1, // allow a maximum of 1 requests
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
                window: "60s", // 1 minutes fixed window
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
            const ttl = decision.ttl;
            let msg = "You've hit the rate limit. Please try again in 2 minutes.";
            if (ttl) {
                const resetAt = new Date(ttl);
                const resetTime = resetAt.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                });
                const diffMs = Math.max(resetAt.getTime() - Date.now(), 0);
                const minutes = Math.ceil(diffMs / 60000);
                const timeText = minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}` : "a moment";

                msg = `You've hit the rate limit. Please try again in ${timeText} (at ${resetTime}).`;
            }

            throw new Error(msg);
        } else {
            throw new Error("Forbidden");
        }
    }
}

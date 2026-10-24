"use server";

import arcjet, { ArcjetDecision, fixedWindow, request, shield } from "@arcjet/next";

import type { InternalLimitResult } from "./rewind-types";

const mode = process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN";

const _rateLimiters = {
    // We're using our internal API key because GitHub rate-limits its free requests.
    api: arcjet({
        key: process.env.ARCJET_KEY!,
        characteristics: ["ip.src"],
        rules: [
            shield({ mode }),
            fixedWindow({
                mode,
                window: "300s", // 5 minutes fixed window
                max: 2, // shared internal token: 2 requests per IP per window
            }),
        ],
    }),
};

export async function enforceSharedTokenRateLimit(): Promise<InternalLimitResult> {
    const req = await request();
    const decision = await _rateLimiters.api.protect(req);
    return getInternalLimitResponse(decision);
}

const getInternalLimitResponse = (decision: ArcjetDecision): InternalLimitResult => {
    if (!decision.isDenied()) return { ok: true };

    if (decision.reason.isRateLimit()) {
        // `reset` = seconds until the current window resets.
        const reset = decision.reason.reset;
        return {
            ok: false,
            reason: "rate_limit",
            retryAt: typeof reset === "number" ? Date.now() + reset * 1000 : null,
        };
    }
    return { ok: false, reason: "forbidden" };
};

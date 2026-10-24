export function rejectCrossOrigin(request: Request): Response | null {
    const origin = request.headers.get("origin");
    if (origin) {
        try {
            if (new URL(origin).origin !== new URL(request.url).origin) {
                return apiJson(
                    { error: "Cross-origin requests are not allowed." },
                    { status: 403 },
                );
            }
        } catch {
            return apiJson({ error: "Invalid request origin." }, { status: 403 });
        }
    }

    if (request.headers.get("sec-fetch-site")?.toLowerCase() === "cross-site") {
        return apiJson({ error: "Cross-origin requests are not allowed." }, { status: 403 });
    }

    return null;
}

export function requireJsonContentType(request: Request): Response | null {
    const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "application/json") {
        return apiJson({ error: "Content-Type must be application/json." }, { status: 415 });
    }
    return null;
}

export async function readJsonBody(
    request: Request,
    maxBytes: number,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        return {
            ok: false,
            response: apiJson({ error: "Request body is too large." }, { status: 413 }),
        };
    }

    const reader = request.body?.getReader();
    if (!reader) {
        return {
            ok: false,
            response: apiJson({ error: "Request body is required." }, { status: 400 }),
        };
    }

    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > maxBytes) {
                await reader.cancel();
                return {
                    ok: false,
                    response: apiJson({ error: "Request body is too large." }, { status: 413 }),
                };
            }
            chunks.push(value);
        }
    } catch {
        return {
            ok: false,
            response: apiJson({ error: "Could not read the request body." }, { status: 400 }),
        };
    }

    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }

    try {
        return { ok: true, body: JSON.parse(new TextDecoder().decode(bytes)) };
    } catch {
        return { ok: false, response: apiJson({ error: "Invalid JSON body." }, { status: 400 }) };
    }
}

export function getRateLimitKey(request: Request): string {
    const clientIp = request.headers.get("cf-connecting-ip")?.trim();
    return clientIp && clientIp.length <= 64 ? clientIp : "unknown";
}

export function apiJson(body: unknown, init: ResponseInit = {}): Response {
    const headers = new Headers(init.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    return Response.json(body, { ...init, headers });
}

export function apiOptions(request: Request): Response {
    const rejected = rejectCrossOrigin(request);
    if (rejected) return rejected;
    return new Response(null, {
        status: 204,
        headers: {
            Allow: "POST, OPTIONS",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Cross-Origin-Resource-Policy": "same-origin",
        },
    });
}

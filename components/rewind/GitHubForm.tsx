"use client";

import { useState } from "react";
import {
    ExternalLink,
    GitBranch,
    Info,
    KeyRound,
    Loader2,
    Search,
    ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { GhButton, GhInput, Chip } from "./primitives";
import { useRewindStore } from "@/store/rewind-store";
import { rewindInputSchema } from "@/lib/rewind-schemas";
import { buildRewind } from "@/lib/github.api";
import { analyzeGithubServer } from "@/lib/rewind-actions";

const PRIVATE_CONTRIBUTIONS_DOCS =
    "https://docs.github.com/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-settings-on-your-profile/viewing-contributions-on-your-profile";
const NEW_FINE_GRAINED_TOKEN = "https://github.com/settings/personal-access-tokens/new";

export class RewindError extends Error {
    code: "INTERNAL_LIMIT" | "ERROR";
    retryAt: number | null;
    constructor(code: "INTERNAL_LIMIT" | "ERROR", message: string, retryAt: number | null = null) {
        super(message);
        this.code = code;
        this.retryAt = retryAt;
    }
}

export const analyzeGithubClient = async (payload: unknown, useInternalToken = false) => {
    const data = rewindInputSchema.parse(payload);
    if (useInternalToken) {
        const res = await analyzeGithubServer({ username: data.username, year: data.year });
        if (!res.ok) throw new RewindError(res.code, res.message, res.retryAt);
        return res.data;
    }
    return buildRewind(data.username, data.year, data.token || undefined);
};

const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getUTCFullYear() - i);

function minutesUntil(ts: number | null) {
    if (!ts) return null;
    return Math.max(1, Math.ceil((ts - Date.now()) / 60_000));
}

export default function GitHubForm() {
    const [showToken, setShowToken] = useState(false);
    // GitHub rate-limited the user's anonymous browser requests -> offer the shared token.
    const [offerInternal, setOfferInternal] = useState(false);
    const [useInternal, setUseInternal] = useState(false);
    // The shared token's 2-per-5-min quota is spent -> user must bring their own token.
    const [internalExhausted, setInternalExhausted] = useState<{ retryAt: number | null } | null>(
        null,
    );

    const {
        username,
        year,
        token,
        status,
        setUsername,
        setYear,
        setToken,
        startLoading,
        setData,
        setError,
    } = useRewindStore();

    const loading = status === "loading";
    const hasOwnToken = token.trim().length > 0;
    // A user's own token always wins and never touches the shared quota.
    const sharedActive = useInternal && !hasOwnToken;
    const retryMinutes = minutesUntil(internalExhausted?.retryAt ?? null);

    async function onSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!username.trim()) {
            toast.error("Enter a GitHub username first");
            return;
        }
        startLoading();
        try {
            const data = await analyzeGithubClient(
                { username: username.trim(), year, token: token.trim() },
                sharedActive,
            );
            setData(data);
            setInternalExhausted(null);
            toast.success(`Rewind ready for @${data.profile.login}`);
        } catch (err) {
            const message = (err as Error).message || "Something went wrong";

            if (err instanceof RewindError && err.code === "INTERNAL_LIMIT") {
                setUseInternal(false);
                setOfferInternal(false);
                setInternalExhausted({ retryAt: err.retryAt });
                setShowToken(true);
            } else if (message.includes("GitHub rate limit reached") && !hasOwnToken) {
                setOfferInternal(true);
            }
            setError(message);
            toast.error(message, { className: "bg-red-500 text-white" });
        }
    }

    return (
        <form onSubmit={onSubmit} className="surface glow-ring p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <GitBranch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <GhInput
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="github-username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className="pl-9 font-mono"
                        aria-label="GitHub username"
                    />
                </div>
                <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    aria-label="Year"
                    className="h-10 rounded-lg border border-border-strong bg-(--background)/60 px-3 font-mono text-sm focus-visible:border-primary focus-visible:outline-none"
                >
                    {YEARS.map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
                <GhButton type="submit" disabled={loading} className="sm:w-40">
                    {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Search className="size-4" />
                    )}
                    {loading ? "Analyzing…" : "Run rewind"}
                </GhButton>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <GhButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowToken((v) => !v)}
                    className="px-2"
                >
                    <KeyRound className="size-3.5" />
                    {showToken ? "Hide token" : "Add your token for better analytics"}
                </GhButton>
                <Chip tone={hasOwnToken ? "success" : sharedActive ? "primary" : "default"}>
                    {hasOwnToken
                        ? "your token"
                        : sharedActive
                            ? "shared token"
                            : "public scope"}
                </Chip>
            </div>

            {showToken ? (
                <div className="mt-3 rounded-xl border border-border-strong bg-(--background)/50 p-3">
                    <GhInput
                        autoFocus
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="github_pat_… fine-grained, read-only"
                        autoComplete="off"
                        className="font-mono"
                        aria-label="GitHub fine-grained personal access token"
                    />
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        <span>
                            A fine-grained token unlocks better analytics: your full-year
                            contribution calendar (without one, only ~90 days), GitHub&apos;s higher
                            rate limit (5,000 requests/hour instead of 60), no shared-quota cap, and
                            activity from private repositories you own.{" "}
                            <a
                                href={NEW_FINE_GRAINED_TOKEN}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-primary hover:underline"
                            >
                                Create one <ExternalLink className="size-3" />
                            </a>
                        </span>
                    </p>
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        <span>
                            Private <em>contributions</em> only show up if you&apos;ve enabled them
                            on your profile.{" "}
                            <a
                                href={PRIVATE_CONTRIBUTIONS_DOCS}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-primary hover:underline"
                            >
                                How to check <ExternalLink className="size-3" />
                            </a>
                        </span>
                    </p>
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
                        Used only for this request, kept in memory, never written to storage or a
                        database. Use a read-only token and revoke it any time.
                    </p>
                </div>
            ) : null}

            {internalExhausted ? (
                <div className="mt-3 rounded-xl border border-attention/40 bg-attention/10 p-3 text-xs">
                    <p className="font-medium text-foreground">
                        The shared token allows 2 requests per 5 minutes, and yours are used up.
                    </p>
                    <p className="mt-1 text-muted-foreground">
                        Add your own fine-grained token above to continue right away
                        {retryMinutes
                            ? `, or try again in about ${retryMinutes} minute${retryMinutes === 1 ? "" : "s"}.`
                            : "."}
                    </p>
                </div>
            ) : null}

            {offerInternal && !hasOwnToken && !internalExhausted ? (
                <div className="mt-3">
                    <GhButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setUseInternal((v) => !v)}
                        className="px-2"
                    >
                        <KeyRound className="size-3.5" />
                        {useInternal
                            ? "Stop using shared token"
                            : "Use our shared token (2 requests / 5 min)"}
                    </GhButton>
                    <p className="mt-2 text-xs text-muted-foreground">
                        GitHub limits anonymous requests. You can borrow our token for 2 requests
                        every 5 minutes, or add your own token for unlimited use within GitHub&apos;s
                        own limits.
                    </p>
                    {useInternal ? (
                        <p className="mt-2 flex items-start gap-1.5 text-xs text-primary">
                            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
                            Your next request will use our shared GitHub token.
                        </p>
                    ) : null}
                </div>
            ) : null}
        </form>
    );
}
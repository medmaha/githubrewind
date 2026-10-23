"use client"

import { useState } from "react";
import { GitBranch, KeyRound, Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { GhButton, GhInput, Chip } from "./primitives";
import { useRewindStore } from "@/store/rewind-store";
import { rewindInputSchema } from "@/lib/rewind-schemas";
import { buildRewind } from "@/lib/github.api";
import { analyzeGithubServer } from "@/lib/rewind-actions";

export const analyzeGithubClient = async (payload: unknown, useInternalToken = false) => {
    const data = rewindInputSchema.parse(payload);
    if (useInternalToken) {
        return analyzeGithubServer({ username: data.username, year: data.year })
    }
    return buildRewind(data.username, data.year, data.token || undefined);
};

const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getUTCFullYear() - i);

export default function GitHubForm() {
    const [showToken, setShowToken] = useState(false);
    const [showTokenInternalTokenPrompt, setShowTokenInternalTokenPrompt] = useState(false);
    const [useInternalToken, setUseInternalTokens] = useState(false);

    const {
        username,
        year,
        token,
        status,
        error,
        setUsername,
        setYear,
        setToken,
        startLoading,
        setData,
        setError,
    } = useRewindStore();

    const loading = status === "loading";

    async function onSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!username.trim()) {
            toast.error("Enter a GitHub username first");
            return;
        }
        startLoading();
        try {
            const data = await analyzeGithubClient({
                username: username.trim(),
                year,
                token: token.trim(),
            }, useInternalToken);
            setData(data);
            toast.success(`Rewind ready for @${data.profile.login}`);
        } catch (error) {
            const message = (error as Error).message || "Something went wrong";
            if (message.includes("GitHub rate limit reached")) {
                setShowTokenInternalTokenPrompt(true)
            }
            setError(message);
            toast.error(message, { className: "bg-red-500 text-white" });
        } finally {
            if (showTokenInternalTokenPrompt) {
                setUseInternalTokens(false)
                setShowTokenInternalTokenPrompt(false)
            }
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
                    {showToken ? "Hide token" : "Include private repos"}
                </GhButton>
                <Chip tone={token ? "success" : "default"}>
                    {token ? "authenticated scope" : "public scope"}
                </Chip>
            </div>

            {showToken ? (
                <div className="mt-3 rounded-xl border border-border-strong bg-(--background)/50 p-3">
                    <GhInput
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="ghp_… fine-grained token with read-only repo scope"
                        autoComplete="off"
                        className="font-mono"
                        aria-label="GitHub personal access token"
                    />
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
                        Used only for this request, kept in memory, never written to storage or a
                        database. Use a read-only, fine-grained token and revoke it any time.
                    </p>
                </div>
            ) : null}
            {showTokenInternalTokenPrompt && error ? (
                <div className="mt-3">
                    <GhButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (!useInternalToken) {
                                setUseInternalTokens(true)
                                return
                            }
                            setUseInternalTokens(false)
                            setShowTokenInternalTokenPrompt(false)
                        }}
                        className="px-2"
                    >
                        <KeyRound className="size-3.5" />
                        {!useInternalToken ? "Use our internal token (1 more req)" : "Remove internal token"}
                    </GhButton>
                    {useInternalToken &&
                        <p className="mt-2 flex items-start gap-1.5 text-xs text-primary">
                            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
                            Using our internal fine-grained GitHub token for your next request.
                        </p>
                    }
                </div>
            ) : null}
        </form>
    );
}

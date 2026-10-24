import { ReactNode } from "react";
import { Brain, Loader2, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Panel, PanelHeader, Chip, GhButton } from "./primitives";
import { buildInsightFacts } from "@/lib/insight-facts";
import type { InsightsInput } from "@/lib/rewind-schemas";
import type { AiInsights, RewindData } from "@/lib/rewind-types";
import { useRewindStore } from "@/store/rewind-store";

function isAiInsights(value: unknown): value is AiInsights {
    if (!value || typeof value !== "object") return false;
    const output = value as Record<string, unknown>;
    return (
        typeof output.personaTitle === "string" &&
        typeof output.headline === "string" &&
        typeof output.yearlyOverview === "string" &&
        Array.isArray(output.significantAchievements) &&
        output.significantAchievements.every((item) => typeof item === "string") &&
        Array.isArray(output.areasOfGrowth) &&
        output.areasOfGrowth.every((item) => typeof item === "string") &&
        typeof output.codingStyle === "string" &&
        typeof output.shareCaption === "string" &&
        (output.caveat === undefined || typeof output.caveat === "string") &&
        (output.achievementEvidence === undefined ||
            (Array.isArray(output.achievementEvidence) &&
                output.achievementEvidence.every(
                    (evidence) =>
                        Array.isArray(evidence) &&
                        evidence.every((item) => typeof item === "string"),
                ))) &&
        (output.growthEvidence === undefined ||
            (Array.isArray(output.growthEvidence) &&
                output.growthEvidence.every(
                    (evidence) =>
                        Array.isArray(evidence) &&
                        evidence.every((item) => typeof item === "string"),
                )))
    );
}

function toInsightsInput(data: RewindData): InsightsInput {
    return {
        login: data.profile.login,
        year: data.year,
        facts: buildInsightFacts(data),
    };
}

export function InsightsPanel({
    data,
    HighlightCard,
}: {
    data: RewindData;
    HighlightCard: ReactNode;
}) {
    const {
        insights,
        insightsStatus,
        insightsError,
        startInsights,
        setInsights,
        setInsightsError,
    } = useRewindStore();
    const loading = insightsStatus === "loading";

    async function generate() {
        startInsights();
        try {
            const response = await fetch("/api/insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(toInsightsInput(data)),
            });
            let result: unknown;
            try {
                result = await response.json();
            } catch {
                throw new Error("The insights service returned an invalid response.");
            }
            if (!response.ok) {
                const error =
                    result && typeof result === "object" && "error" in result
                        ? result.error
                        : undefined;
                throw new Error(typeof error === "string" ? error : "Could not generate insights.");
            }
            if (
                !result ||
                typeof result !== "object" ||
                !("insights" in result) ||
                !isAiInsights(result.insights)
            ) {
                throw new Error("The insights service returned an invalid response.");
            }
            setInsights(result.insights);
            toast.success("AI insights generated");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not generate insights";
            setInsightsError(message);
            toast.error(message);
        }
    }

    if (!insights) {
        return (
            <Panel className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-elevated text-primary">
                        <Brain className="size-5" />
                    </span>
                    <div>
                        <h3 className="text-sm font-semibold tracking-tight">AI year-in-review</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Turn your activity into a specific, evidence-backed narrative. Only
                            bounded facts are sent; no GitHub token or raw activity is included.
                        </p>
                        {insightsError ? (
                            <p className="mt-1.5 text-xs text-destructive">{insightsError}</p>
                        ) : null}
                    </div>
                </div>
                <GhButton onClick={generate} disabled={loading} className="w-full sm:w-auto">
                    {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Sparkles className="size-4" />
                    )}
                    {loading ? "Thinking…" : "Generate insights"}
                </GhButton>
            </Panel>
        );
    }

    return (
        <div className="grid gap-3 lg:grid-cols-2">
            <Panel className="lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Chip tone="primary">
                        <Sparkles className="size-3" /> {insights.personaTitle}
                    </Chip>
                    <GhButton variant="ghost" size="sm" onClick={generate} disabled={loading}>
                        {loading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Sparkles className="size-3.5" />
                        )}
                        {loading ? "Thinking…" : "Regenerate"}
                    </GhButton>
                </div>
                {insightsError ? (
                    <p className="mt-2 text-xs text-destructive">{insightsError}</p>
                ) : null}
                <h2 className="mt-3 text-balance text-xl font-semibold tracking-tight sm:text-2xl">
                    {insights.headline}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {insights.yearlyOverview}
                </p>
                {insights.caveat ? (
                    <p className="mt-3 rounded-md border border-border bg-elevated/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">A note on the data: </span>
                        {insights.caveat}
                    </p>
                ) : null}
            </Panel>

            {HighlightCard}

            <Panel>
                <PanelHeader
                    icon={<Trophy className="size-4" />}
                    title="Significant achievements"
                />
                {insights.significantAchievements.length ? (
                    <ul className="space-y-2">
                        {insights.significantAchievements.map((item, i) => (
                            <li
                                key={i}
                                className="flex gap-2.5 rounded-lg bg-(--elevated)/60 px-3 py-2 text-sm"
                            >
                                <span className="font-mono text-xs text-success">
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <span className="text-muted-foreground">
                                    {item}
                                    {insights.achievementEvidence?.[i]?.length ? (
                                        <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground/75">
                                            Based on: {insights.achievementEvidence[i]?.join(" ")}
                                        </span>
                                    ) : null}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        The available facts did not support a distinct achievement claim.
                    </p>
                )}
            </Panel>

            <Panel>
                <PanelHeader icon={<TrendingUp className="size-4" />} title="Areas of growth" />
                {insights.areasOfGrowth.length ? (
                    <ul className="space-y-2">
                        {insights.areasOfGrowth.map((item, i) => (
                            <li
                                key={i}
                                className="flex gap-2.5 rounded-lg bg-(--elevated)/60 px-3 py-2 text-sm"
                            >
                                <span className="font-mono text-xs text-attention">→</span>
                                <span className="text-muted-foreground">
                                    {item}
                                    {insights.growthEvidence?.[i]?.length ? (
                                        <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground/75">
                                            Based on: {insights.growthEvidence[i]?.join(" ")}
                                        </span>
                                    ) : null}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No specific growth observation is supported by these facts.
                    </p>
                )}
            </Panel>

            <Panel className="lg:col-span-2">
                <PanelHeader icon={<Brain className="size-4" />} title="Coding style" />
                {insights.codingStyle ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        {insights.codingStyle}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        There is not enough evidence to describe a coding style.
                    </p>
                )}
            </Panel>
        </div>
    );
}

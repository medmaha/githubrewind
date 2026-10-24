import { ReactNode } from "react";
import { Brain, Loader2, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Panel, PanelHeader, Chip, GhButton } from "./primitives";
import { getAiInsightsServer } from "@/lib/rewind-actions";
import type { InsightsSummary } from "@/lib/rewind-schemas";
import type { RewindData } from "@/lib/rewind-types";
import { useRewindStore } from "@/store/rewind-store";

function toSummary(data: RewindData): InsightsSummary {
    const t = data.totals;
    return {
        login: data.profile.login,
        year: data.year,
        repos: t.repos,
        commits: t.commitsThisYear,
        prs: t.prs,
        prsMerged: t.prsMerged,
        issues: t.issues,
        reviews: t.reviews,
        stars: t.stars,
        followers: data.profile.followers,
        activeDays: t.activeDays,
        longestStreak: t.longestStreak,
        estimatedLinesOfCode: t.estimatedLinesOfCode,
        languages: data.languages.slice(0, 8).map((l) => ({ name: l.name, percent: l.percent })),
        topRepoNames: data.topRepos.slice(0, 6).map((r) => r.name),
        topics: Array.from(new Set(data.topRepos.flatMap((r) => r.topics))).slice(0, 20),
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
            const result = await getAiInsightsServer({ summary: toSummary(data) });
            if (!result.ok) {
                throw new Error(result.message);
            }
            setInsights(result.insights);
            toast.success("AI insights generated");
        } catch (error) {
            const message = (error as Error).message || "Could not generate insights";
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
                            Turn these numbers into a professional narrative - persona, highlights,
                            growth areas and a ready-to-post caption.
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
                    {/* <GhButton variant="ghost" size="sm" onClick={generate} disabled={loading}>
                        {loading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Wand2 className="size-3.5" />
                        )}
                        Regenerate
                    </GhButton> */}
                </div>
                <h2 className="mt-3 text-balance text-xl font-semibold tracking-tight sm:text-2xl">
                    {insights.headline}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {insights.yearlyOverview}
                </p>
            </Panel>

            {HighlightCard}

            <Panel>
                <PanelHeader
                    icon={<Trophy className="size-4" />}
                    title="Significant achievements"
                />
                <ul className="space-y-2">
                    {insights.significantAchievements.map((item, i) => (
                        <li
                            key={i}
                            className="flex gap-2.5 rounded-lg bg-(--elevated)/60 px-3 py-2 text-sm"
                        >
                            <span className="font-mono text-xs text-success">
                                {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="text-muted-foreground">{item}</span>
                        </li>
                    ))}
                </ul>
            </Panel>

            <Panel>
                <PanelHeader icon={<TrendingUp className="size-4" />} title="Areas of growth" />
                <ul className="space-y-2">
                    {insights.areasOfGrowth.map((item, i) => (
                        <li
                            key={i}
                            className="flex gap-2.5 rounded-lg bg-(--elevated)/60 px-3 py-2 text-sm"
                        >
                            <span className="font-mono text-xs text-attention">→</span>
                            <span className="text-muted-foreground">{item}</span>
                        </li>
                    ))}
                </ul>
            </Panel>

            <Panel className="lg:col-span-2">
                <PanelHeader icon={<Brain className="size-4" />} title="Coding style" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                    {insights.codingStyle}
                </p>
            </Panel>
        </div>
    );
}

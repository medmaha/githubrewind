"use client";

import { useRewindStore } from "@/store/rewind-store";
import { RequireRewind } from "@/components/RequireRewind";
import { HighlightCard } from "@/components/rewind/HighlightCard";
import { InsightsPanel } from "@/components/rewind/InsightsWidgets";
import { SharePanel } from "@/components/rewind/SharePanel";

export default function InsightsPage() {
    const { data, insights } = useRewindStore();

    return (
        <RequireRewind>
            {data ? (
                <main className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6 sm:py-12">
                    <header>
                        <p className="font-mono text-xs uppercase tracking-widest text-primary">
                            AI narrative &amp; share
                        </p>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                            Insights
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Generate an AI year-in-review from your fetched data, then create and
                            share a highlight card.
                        </p>
                    </header>
                    <InsightsPanel data={data} />
                    {insights ? (
                        <>
                            <HighlightCard data={data} insights={insights} />
                            <SharePanel data={data} insights={insights} />
                        </>
                    ) : null}
                </main>
            ) : null}
        </RequireRewind>
    );
}

"use client";

import { RequireRewind } from "@/components/RequireRewind";
import { StoryView } from "@/components/rewind/Storyview";
import { useRewindStore } from "@/store/rewind-store";

export default function StoriesPage() {
    const data = useRewindStore((state) => state.data);

    return (
        <RequireRewind>
            {data ? (
                <main className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6 sm:py-12">
                    <header>
                        <p className="font-mono text-xs uppercase tracking-widest text-primary">
                            A year told by your activity
                        </p>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Stories</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Chapters are computed from your contribution calendar, with GitHub links
                            so you can verify the moments behind them.
                        </p>
                    </header>
                    <StoryView data={data} />
                </main>
            ) : null}
        </RequireRewind>
    );
}

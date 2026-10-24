"use client";
import { useRewindStore } from "@/store/rewind-store";

export default function PageHeader() {
    const { data } = useRewindStore();
    if (data) return null;

    return (
        <section className="pb-2 text-left sm:pb-4">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Your <span className="text-primary">GitHub year</span>, rewound
            </h1>
            <p className="mt-2 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
                Pull a full breakdown of commits, pull requests, issues, languages and achievements,
                then get an AI year-in-review and a highlight card built for LinkedIn.
            </p>
        </section>
    );
}

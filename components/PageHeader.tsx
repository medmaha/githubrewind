"use client"
import { useRewindStore } from "@/store/rewind-store";

export default function PageHeader() {
    const { data } = useRewindStore();
    if (data) return null

    return (
        <section className="pb-2 text-center sm:pb-4">
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
                Your <span className="text-gradient">GitHub year</span>, rewound
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
                Pull a full breakdown of commits, pull requests, issues, languages
                and achievements, then get an AI year-in-review and a highlight card
                built for LinkedIn.
            </p>
        </section>
    )
}
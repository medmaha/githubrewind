"use client";

import PageData from "@/components/PageData";
import { RequireRewind } from "@/components/RequireRewind";

export default function RewindPage() {
    return (
        <RequireRewind>
            <main className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6 sm:py-12">
                <header>
                    <p className="font-mono text-xs uppercase tracking-widest text-primary">
                        The numbers
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your rewind</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        A factual breakdown of the GitHub activity and repositories we fetched.
                        AI-generated insights are on their own page.
                    </p>
                </header>
                <PageData />
            </main>
        </RequireRewind>
    );
}

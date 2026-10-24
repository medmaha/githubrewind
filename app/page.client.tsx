"use client";
import PageHeader from "@/components/PageHeader";
import PageError from "@/components/PageError";

import GitHubForm from "@/components/rewind/GitHubForm";

export default function PageClient() {
    return (
        <main className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6 sm:py-12">
            <PageHeader />
            <GitHubForm />
            <PageError />
        </main>
    );
}

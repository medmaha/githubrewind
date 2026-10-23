"use client"
import TopNav from "@/components/TopNav";
import PageHeader from "@/components/PageHeader";
import PageError from "@/components/PageError";
import PageData from "@/components/PageData";

import GitHubForm from "@/components/rewind/GitHubForm";
import { Footer } from "@/components/Footer";

export default function PageClient() {
    return (
        <>
            <div className="min-h-screen bg-background pb-20 text-foreground">
                <TopNav />
                <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
                    <PageHeader />
                    <GitHubForm />
                    <PageError />
                    <PageData />
                </main>
            </div>
            <Footer />
        </>
    );
}

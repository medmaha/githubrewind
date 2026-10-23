"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useRewindStore } from "@/store/rewind-store";

export function RequireRewind({ children }: { children: ReactNode }) {
    const router = useRouter();
    const data = useRewindStore((state) => state.data);
    const hydrated = useRewindStore((state) => state.hydrated);

    useEffect(() => {
        if (hydrated && !data) router.replace("/");
    }, [data, hydrated, router]);

    if (!hydrated || !data) {
        return (
            <main className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted-foreground sm:px-6">
                {hydrated
                    ? "Return to the home page to generate a rewind first."
                    : "Restoring your saved rewind…"}
            </main>
        );
    }

    return children;
}

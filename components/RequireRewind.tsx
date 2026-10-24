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

    if (!hydrated || !data) return null;

    return children;
}

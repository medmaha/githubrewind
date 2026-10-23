import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AiInsights, RewindData } from "@/lib/rewind-types";

type Status = "idle" | "loading" | "ready" | "error";

type RewindState = {
    username: string;
    year: number;
    token: string;
    status: Status;
    error: string | null;
    data: RewindData | null;
    insights: AiInsights | null;
    insightsStatus: Status;
    insightsError: string | null;
    hydrated: boolean;
    setUsername: (v: string) => void;
    setYear: (v: number) => void;
    setToken: (v: string) => void;
    startLoading: () => void;
    setData: (data: RewindData) => void;
    setError: (message: string) => void;
    startInsights: () => void;
    setInsights: (insights: AiInsights) => void;
    setInsightsError: (message: string) => void;
    finishHydration: () => void;
    reset: () => void;
};

const currentYear = new Date().getUTCFullYear();
export const REWIND_STORAGE_KEY = "github-activity-rewind";

export const useRewindStore = create<RewindState>()(
    persist(
        (set) => ({
            username: "",
            year: currentYear,
            // Token lives in memory only - never persisted to storage.
            token: "",
            status: "idle",
            error: null,
            data: null,
            insights: null,
            insightsStatus: "idle",
            insightsError: null,
            hydrated: false,
            setUsername: (username) => set({ username }),
            setYear: (year) => set({ year }),
            setToken: (token) => set({ token }),
            startLoading: () => set({ status: "loading", error: null }),
            setData: (data) =>
                set({
                    data,
                    status: "ready",
                    error: null,
                    insights: null,
                    insightsStatus: "idle",
                    insightsError: null,
                }),
            setError: (error) => set({ error, status: "error" }),
            startInsights: () => set({ insightsStatus: "loading", insightsError: null }),
            setInsights: (insights) => set({ insights, insightsStatus: "ready" }),
            setInsightsError: (insightsError) => set({ insightsError, insightsStatus: "error" }),
            finishHydration: () =>
                set((state) => ({
                    hydrated: true,
                    status: state.data ? "ready" : "idle",
                    insightsStatus: state.insights ? "ready" : "idle",
                })),
            reset: () =>
                set({
                    username: "",
                    year: currentYear,
                    token: "",
                    status: "idle",
                    error: null,
                    data: null,
                    insights: null,
                    insightsStatus: "idle",
                    insightsError: null,
                }),
        }),
        {
            name: REWIND_STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            skipHydration: true,
            partialize: ({ username, year, data, insights }) => ({
                username,
                year,
                data,
                insights,
            }),
            onRehydrateStorage: () => (state) => {
                state?.finishHydration();
            },
        },
    ),
);

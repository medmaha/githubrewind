import { create } from "zustand";

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
    setUsername: (v: string) => void;
    setYear: (v: number) => void;
    setToken: (v: string) => void;
    startLoading: () => void;
    setData: (data: RewindData) => void;
    setError: (message: string) => void;
    startInsights: () => void;
    setInsights: (insights: AiInsights) => void;
    setInsightsError: (message: string) => void;
    reset: () => void;
};

export const useRewindStore = create<RewindState>((set) => ({
    username: "",
    year: new Date().getUTCFullYear(),
    // Token lives in memory only - never persisted to storage.
    token: "",
    status: "idle",
    error: null,
    data: null,
    insights: null,
    insightsStatus: "idle",
    insightsError: null,
    setUsername: (username) => set({ username }),
    setYear: (year) => set({ year }),
    setToken: (token) => set({ token }),
    startLoading: () => set({ status: "loading", error: null }),
    setData: (data) =>
        set({ data, status: "ready", error: null, insights: null, insightsStatus: "idle" }),
    setError: (error) => set({ error, status: "error" }),
    startInsights: () => set({ insightsStatus: "loading", insightsError: null }),
    setInsights: (insights) => set({ insights, insightsStatus: "ready" }),
    setInsightsError: (insightsError) => set({ insightsError, insightsStatus: "error" }),
    reset: () =>
        set({
            status: "idle",
            data: null,
            insights: null,
            insightsStatus: "idle",
            error: null,
            insightsError: null,
        }),
}));

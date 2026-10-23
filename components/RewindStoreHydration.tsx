"use client";

import { useEffect } from "react";

import { useRewindStore } from "@/store/rewind-store";

export function RewindStoreHydration() {
    useEffect(() => {
        void Promise.resolve(useRewindStore.persist.rehydrate()).catch((error: unknown) => {
            console.error("Unable to restore the saved rewind from browser storage.", error);
            useRewindStore.getState().finishHydration();
        });
    }, []);

    return null;
}

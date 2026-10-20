"use client"
import { useRewindStore } from "@/store/rewind-store";
import { Panel } from "./rewind/primitives";

export default function PageError() {
    const { error, status } = useRewindStore();

    if (status === "error" && error)
        return (
            <Panel className="border-destructive/40">
                <p className="text-sm text-destructive">{error}</p>
            </Panel>
        )
    return null
}
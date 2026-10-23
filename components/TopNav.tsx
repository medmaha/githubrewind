"use client"
import { useRewindStore } from "@/store/rewind-store";
import GithubIconLink from "./GithubIconLink";
import { Chip, GhButton } from "./rewind/primitives";
import { RotateCcwIcon, SparklesIcon } from "lucide-react";


export default function TopNav() {
    const { data, reset } = useRewindStore();
    return (<header className="border-b border-border bg-[#010409]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
                <GithubIconLink className="w-8 h-8" />
                <div>
                    <p className="text-sm font-semibold tracking-tight">
                        GitHub Rewind
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                        Year in code, analyzed
                    </p>
                </div>
            </div>
            {data ? (
                <GhButton variant="outline" size="sm" onClick={reset}>
                    <RotateCcwIcon className="size-3.5" />
                    New rewind
                </GhButton>
            ) : (
                <Chip tone="primary">
                    <SparklesIcon className="size-3" /> AI powered
                </Chip>
            )}
        </div>
    </header>)
}

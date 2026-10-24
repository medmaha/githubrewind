import { ShieldCheck } from "lucide-react";

import { Chip, Panel, PanelHeader } from "./primitives";
import { COVERAGE_LEVELS, buildCoverage, type CoverageLevel } from "@/lib/coverage";
import type { RewindData } from "@/lib/rewind-types";

const TONE: Record<CoverageLevel, "success" | "primary" | "attention" | "done" | "default"> = {
    verified: "success",
    approximate: "primary",
    partial: "attention",
    estimated: "done",
    unavailable: "default",
};

/** Shows where every number on this page comes from, and how far to trust it. */
export function CoveragePanel({ data }: { data: RewindData }) {
    const coverage = buildCoverage(data);
    const summary = (Object.keys(COVERAGE_LEVELS) as CoverageLevel[])
        .filter((level) => coverage.counts[level] > 0)
        .map((level) => `${coverage.counts[level]} ${COVERAGE_LEVELS[level].label.toLowerCase()}`)
        .join(" · ");

    return (
        <Panel>
            <PanelHeader
                icon={<ShieldCheck className="size-4" />}
                title="Data coverage"
                hint="Where each number comes from and how far to trust it."
                action={
                    <Chip tone={coverage.mode === "limited" ? "attention" : "success"}>
                        {coverage.headline}
                    </Chip>
                }
            />
            <p className="mb-2 text-xs text-muted-foreground">{summary}</p>
            <ul className="divide-y divide-border">
                {coverage.items.map((item) => (
                    <li
                        key={item.id}
                        className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                    >
                        <div className="min-w-0">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.source}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
                        </div>
                        <span title={COVERAGE_LEVELS[item.level].meaning} className="shrink-0">
                            <Chip tone={TONE[item.level]}>{COVERAGE_LEVELS[item.level].label}</Chip>
                        </span>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}

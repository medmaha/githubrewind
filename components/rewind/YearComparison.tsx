import { ArrowDown, ArrowRight, ArrowUp, GitCompareArrows } from "lucide-react";

import type { CalendarData, RewindData } from "@/lib/rewind-types";
import { Chip, Panel, PanelHeader } from "./primitives";

const nf = (value: number) => value.toLocaleString("en-US");

function activeDays(calendar: CalendarData) {
    return calendar.days.filter((day) => day.count > 0).length;
}

function ComparisonRow({
    label,
    description,
    previous,
    current,
}: {
    label: string;
    description: string;
    previous: number;
    current: number;
}) {
    const delta = current - previous;
    const percent = previous > 0 ? Math.round((delta / previous) * 100) : null;
    const TrendIcon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : ArrowRight;
    const tone = delta > 0 ? "success" : delta < 0 ? "attention" : "default";
    const change =
        percent === null
            ? delta > 0
                ? `+${nf(delta)} · new`
                : "No change"
            : `${delta > 0 ? "+" : ""}${nf(delta)} · ${percent > 0 ? "+" : ""}${percent}%`;

    return (
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg bg-(--elevated)/60 px-3 py-2.5">
            <span
                title={`${label}: ${description}`}
                className="min-w-0 text-sm text-muted-foreground"
            >
                <span className="block">{label}</span>
                <span className="block text-[10px] leading-tight">{description}</span>
            </span>
            <span className="font-mono text-sm tabular-nums">{nf(previous)}</span>
            <span className="font-mono text-sm tabular-nums">{nf(current)}</span>
            <Chip tone={tone}>
                <TrendIcon className="size-3" />
                {change}
            </Chip>
        </div>
    );
}

export function YearComparison({ data }: { data: RewindData }) {
    if (!data.comparison || !data.calendar) {
        const message = !data.calendar
            ? "Add a read-only GitHub token when generating your rewind to compare contribution calendars across years."
            : "The previous-year contribution calendar could not be loaded. Run a new rewind to retry the comparison.";

        return (
            <Panel>
                <PanelHeader
                    icon={<GitCompareArrows className="size-4" />}
                    title="Year over year"
                />
                <p className="text-sm text-muted-foreground">{message}</p>
            </Panel>
        );
    }

    const previous = data.comparison.calendar;
    const current = data.calendar;
    const rows = [
        {
            label: "Contributions",
            description: "Total activity counted on your GitHub calendar.",
            previous: previous.totalContributions,
            current: current.totalContributions,
        },
        {
            label: "Commits",
            description: "Commits GitHub recorded for the year.",
            previous: previous.breakdown.commits,
            current: current.breakdown.commits,
        },
        {
            label: "Pull requests",
            description: "Pull request contributions recorded by GitHub.",
            previous: previous.breakdown.prs,
            current: current.breakdown.prs,
        },
        {
            label: "Reviews",
            description: "Pull request reviews submitted.",
            previous: previous.breakdown.reviews,
            current: current.breakdown.reviews,
        },
        {
            label: "Issues",
            description: "Issue contributions recorded by GitHub.",
            previous: previous.breakdown.issues,
            current: current.breakdown.issues,
        },
        {
            label: "Active days",
            description: "Days with at least one calendar contribution.",
            previous: activeDays(previous),
            current: activeDays(current),
        },
    ];

    return (
        <Panel>
            <PanelHeader
                icon={<GitCompareArrows className="size-4" />}
                title="Year over year"
                hint="Contribution calendar totals, compared over matching periods"
            />
            <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Metric</span>
                <span>{data.comparison.year}</span>
                <span>{data.year}</span>
                <span>Change</span>
            </div>
            <div className="space-y-2">
                {rows.map((row) => (
                    <ComparisonRow key={row.label} {...row} />
                ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
                {data.year === new Date().getUTCFullYear()
                    ? `Comparing year to date through today with the same dates in ${data.comparison.year}.`
                    : `Comparing full calendar years ${data.comparison.year} and ${data.year}.`}
            </p>
        </Panel>
    );
}

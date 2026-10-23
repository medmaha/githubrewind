"use client";

import { useMemo } from "react";
import { BookOpen, ExternalLink } from "lucide-react";

import { buildChapters } from "@/lib/chapters";
import type { CalendarData, Chapter, RewindData } from "@/lib/rewind-types";
import { Panel, PanelHeader } from "./primitives";

const CELL = 10;
const GAP = 3;
const STEP = CELL + GAP;
const LEVEL_MIX = [0, 30, 50, 75, 100];

/** Whole-year contribution heatmap. The chapter's date range (or weekday) stays bright, the rest dims. */
function YearHeatmap({ calendar, chapter }: { calendar: CalendarData; chapter: Chapter }) {
    const cells = useMemo(() => {
        const { days } = calendar;
        if (days.length === 0) return { items: [], cols: 0 };
        const counts = days.filter((d) => d.count > 0).map((d) => d.count).sort((a, b) => a - b);
        const q = (p: number) => counts[Math.min(counts.length - 1, Math.floor(counts.length * p))] ?? 0;
        const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
        const level = (c: number) => (c === 0 ? 0 : c <= q1 ? 1 : c <= q2 ? 2 : c <= q3 ? 3 : 4);

        const offset = new Date(`${days[0]!.date}T00:00:00Z`).getUTCDay();
        const items = days.map((d, i) => ({
            date: d.date,
            count: d.count,
            level: level(d.count),
            col: Math.floor((offset + i) / 7),
            row: (offset + i) % 7,
        }));
        return { items, cols: Math.ceil((offset + days.length) / 7) };
    }, [calendar]);

    const { range, weekday } = chapter;

    return (
        <svg
            viewBox={`0 0 ${cells.cols * STEP - GAP} ${7 * STEP - GAP}`}
            className="h-auto w-full"
            role="img"
            aria-label={`Contribution heatmap highlighting: ${chapter.title}`}
        >
            {cells.items.map((c) => {
                const dim = range
                    ? c.date < range.from || c.date > range.to
                    : weekday !== undefined
                        ? c.row !== weekday
                        : false;
                return (
                    <rect
                        key={c.date}
                        x={c.col * STEP}
                        y={c.row * STEP}
                        width={CELL}
                        height={CELL}
                        rx={2}
                        style={{
                            fill:
                                c.level === 0
                                    ? "var(--elevated)"
                                    : `color-mix(in oklch, var(--chart-2) ${LEVEL_MIX[c.level]}%, transparent)`,
                            opacity: dim ? 0.18 : 1,
                        }}
                    >
                        <title>{`${c.date}: ${c.count}`}</title>
                    </rect>
                );
            })}
        </svg>
    );
}

export function StoryView({ data }: { data: RewindData }) {
    const chapters = useMemo(() => buildChapters(data), [data]);
    if (!data.calendar || chapters.length === 0) return null;
    const { calendar } = data;

    return (
        <Panel>
            <PanelHeader
                icon={<BookOpen className="size-4" />}
                title={`Your ${data.year}, in chapters`}
                hint="Every line below is computed from your contribution calendar, with links to check it on GitHub."
            />
            <ol className="space-y-3">
                {chapters.map((c, i) => (
                    <li
                        key={c.id}
                        className="rounded-xl border border-border bg-(--elevated)/50 p-4"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                    Chapter {i + 1}
                                </p>
                                <h3 className="mt-0.5 text-base font-semibold tracking-tight">
                                    {c.title}
                                </h3>
                                <p className="mt-2 text-sm text-foreground">{c.headline}</p>
                                {c.detail ? (
                                    <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>
                                ) : null}
                                {c.evidence.length ? (
                                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                        {c.evidence.map((e) => (
                                            <li key={e.url}>
                                                <a
                                                    href={e.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                >
                                                    {e.label} <ExternalLink className="size-3" />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                            <div className="shrink-0 sm:text-right">
                                <p className="font-mono text-2xl font-semibold tabular-nums text-primary">
                                    {c.stat.value}
                                </p>
                                <p className="text-xs text-muted-foreground">{c.stat.label}</p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <YearHeatmap calendar={calendar} chapter={c} />
                        </div>
                    </li>
                ))}
            </ol>
        </Panel>
    );
}
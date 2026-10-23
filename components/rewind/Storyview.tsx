"use client";

import { useMemo } from "react";
import { BookOpen, ExternalLink } from "lucide-react";

import { buildChapters } from "@/lib/chapters";
import { toWeeks } from "@/lib/rewind-utils";
import type { CalendarData, Chapter, RewindData } from "@/lib/rewind-types";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Panel, PanelHeader } from "./primitives";

const BAR = 10;
const GAP = 3;
const STEP = BAR + GAP;
const RIBBON_H = 64;
const LEVEL_MIX = [0, 30, 50, 75, 100];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The whole year as one bar per week (Monday to Sunday). The chapter's range stays bright and
 * everything else dims. Bar height is a square-root scale so one huge week doesn't flatten the rest.
 */
function WeekRibbon({ calendar, chapter }: { calendar: CalendarData; chapter: Chapter }) {
    const { weeks, bars, months } = useMemo(() => {
        const weeks = toWeeks(calendar.days);
        const nonZero = weeks.map((w) => w.total).filter((t) => t > 0).sort((a, b) => a - b);
        const q = (p: number) =>
            nonZero[Math.min(nonZero.length - 1, Math.floor(nonZero.length * p))] ?? 0;
        const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
        const level = (t: number) => (t === 0 ? 0 : t <= q1 ? 1 : t <= q2 ? 2 : t <= q3 ? 3 : 4);
        const max = Math.max(1, ...weeks.map((w) => w.total));

        const bars = weeks.map((w, i) => ({
            ...w,
            x: i * STEP,
            h: w.total === 0 ? 2 : 4 + Math.sqrt(w.total / max) * (RIBBON_H - 4),
            level: level(w.total),
        }));

        // Month labels sit under the week that contains the 1st of each month.
        const year = calendar.days[0]?.date.slice(0, 4);
        const months = MONTHS.flatMap((name, m) => {
            const first = `${year}-${String(m + 1).padStart(2, "0")}-01`;
            const idx = weeks.findIndex((w) => w.end >= first);
            return idx === -1 ? [] : [{ name, pct: (idx / weeks.length) * 100 }];
        });
        return { weeks, bars, months };
    }, [calendar]);

    const { range } = chapter;

    return (
        <div>
            <svg
                viewBox={`0 0 ${weeks.length * STEP - GAP} ${RIBBON_H}`}
                className="h-auto w-full"
                role="img"
                aria-label={`Weekly contribution ribbon highlighting: ${chapter.title}`}
            >
                {bars.map((b) => {
                    const dim = range ? b.end < range.from || b.start > range.to : false;
                    return (
                        <rect
                            key={b.start}
                            x={b.x}
                            y={RIBBON_H - b.h}
                            width={BAR}
                            height={b.h}
                            rx={2}
                            style={{
                                fill:
                                    b.level === 0
                                        ? "var(--elevated)"
                                        : `color-mix(in oklch, var(--chart-2) ${LEVEL_MIX[b.level]}%, transparent)`,
                                opacity: dim ? 0.18 : 1,
                            }}
                        >
                            <title>{`${b.start} – ${b.end}: ${b.total}`}</title>
                        </rect>
                    );
                })}
            </svg>
            <div className="relative mt-1 h-4" aria-hidden>
                {months.map((m) => (
                    <span
                        key={m.name}
                        className="absolute text-[10px] text-muted-foreground"
                        style={{ left: `${m.pct}%` }}
                    >
                        {m.name}
                    </span>
                ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
                Each bar is one week, Monday to Sunday.
            </p>
        </div>
    );
}

/** Seven bars, Monday first. Used by the rhythm chapter, where weeks would hide the pattern. */
function WeekdayChart({ chapter }: { chapter: Chapter }) {
    const values = chapter.weekdays ?? [];
    const max = Math.max(1, ...values);
    return (
        <div className="grid grid-cols-7 gap-2" role="img" aria-label="Contributions by weekday">
            {values.map((v, i) => (
                <div key={WEEKDAY_LABELS[i]} className="flex flex-col items-center gap-1">
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                        {v}
                    </span>
                    <div className="flex h-20 w-full items-end">
                        <div
                            className="w-full rounded-sm"
                            style={{
                                height: `${Math.max(4, (v / max) * 100)}%`,
                                background:
                                    i === chapter.weekday
                                        ? "var(--primary)"
                                        : "color-mix(in oklch, var(--chart-2) 45%, transparent)",
                            }}
                        />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{WEEKDAY_LABELS[i]}</span>
                </div>
            ))}
        </div>
    );
}

export function StoryView({ data }: { data: RewindData }) {
    const chapters = useMemo(() => buildChapters(data), [data]);
    if (!data.calendar || chapters.length === 0) {
        return (
            <Panel>
                <PanelHeader
                    icon={<BookOpen className="size-4" />}
                    title="No chapters available yet"
                />
                <p className="text-sm text-muted-foreground">
                    {data.calendar
                        ? "There was not enough contribution activity in this calendar to form chapters."
                        : "Stories need a full-year contribution calendar. Add a read-only GitHub token when generating your rewind to fetch that calendar."}
                </p>
            </Panel>
        );
    }
    const { calendar } = data;

    return (
        <Panel>
            <PanelHeader
                icon={<BookOpen className="size-4" />}
                title={`Your ${data.year}, in chapters`}
                hint="Every line below is computed from your contribution calendar, with links to check it on GitHub."
            />
            <Accordion defaultValue={[chapters?.[0].id || "opening"]} type="multiple" className="space-y-3">
                {chapters.map((c, i) => (
                    <AccordionItem
                        key={c.id}
                        defaultChecked={i === 0}
                        value={c.id}
                        className="rounded-xl border border-border bg-(--elevated)/50 px-4"
                    >
                        <AccordionTrigger className="gap-4 py-4 hover:no-underline">
                            <div className="flex min-w-0 flex-1 flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                        Chapter {i + 1}
                                    </p>
                                    <h3 className="mt-0.5 text-base font-semibold tracking-tight">
                                        {c.title}
                                    </h3>
                                    <p className="mt-2 text-sm font-normal text-foreground">
                                        {c.headline}
                                    </p>
                                </div>
                                <div className="shrink-0 sm:text-right">
                                    <p className="font-mono text-2xl font-semibold tabular-nums text-primary">
                                        {c.stat.value}
                                    </p>
                                    <p className="text-xs font-normal text-muted-foreground">
                                        {c.stat.label}
                                    </p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                            {c.detail ? (
                                <p className="mb-3 text-xs text-muted-foreground">{c.detail}</p>
                            ) : null}
                            {c.evidence.length ? (
                                <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
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
                            {c.weekdays ? (
                                <WeekdayChart chapter={c} />
                            ) : (
                                <WeekRibbon calendar={calendar} chapter={c} />
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </Panel>
    );
}

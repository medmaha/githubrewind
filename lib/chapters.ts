import { format, parseISO } from "date-fns";

import { mondayIndex, toWeeks } from "./rewind-utils";
import type { CalendarWeek, Chapter, RewindData } from "./rewind-types";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const fmtDay = (date: string) => format(parseISO(date), "MMM d");

const fmtSpan = (a: string, b: string) => `${fmtDay(a)} – ${fmtDay(b)}`;
const nf = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, word: string) => `${nf(n)} ${word}${n === 1 ? "" : "s"}`;

const profileLink = (login: string, from: string, to: string) =>
    `https://github.com/${login}?tab=overview&from=${from}&to=${to}`;

/**
 * Deterministic "story" of the year, told in Monday-to-Sunday weeks. Every sentence is a fact
 * derived from the contribution calendar; no causes or motives are guessed. Chapters the data
 * can't support are skipped.
 */
export function buildChapters(data: RewindData): Chapter[] {
    const cal = data.calendar;
    if (!cal || cal.days.length === 0) return [];

    const { days } = cal;
    const login = data.profile.login;
    const total = days.reduce((acc, d) => acc + d.count, 0);
    const activeDayCount = days.reduce((acc, d) => acc + (d.count > 0 ? 1 : 0), 0);
    if (total === 0 || activeDayCount < 3) return [];

    const weeks = toWeeks(days);
    let firstW = -1;
    let lastW = -1;
    weeks.forEach((w, i) => {
        if (w.total > 0) {
            if (firstW === -1) firstW = i;
            lastW = i;
        }
    });

    const span = (a: CalendarWeek, b: CalendarWeek = a) => ({ from: a.start, to: b.end });
    const evidence = (
        a: Pick<CalendarWeek, "start" | "end">,
        b: Pick<CalendarWeek, "start" | "end"> = a,
    ) => ({
        label: `Activity ${fmtSpan(a.start, b.end)}`,
        url: profileLink(login, a.start, b.end),
    });
    const chapters: Chapter[] = [];

    // 1. Opening ---------------------------------------------------------------------------
    {
        const week = weeks[firstW]!;
        const firstDay = days.find((d) => d.date >= week.start && d.count > 0)!;
        const onJan1 = firstDay.date.endsWith("-01-01");
        chapters.push({
            id: "opening",
            title: "The opening act",
            headline: onJan1
                ? "You were active on the very first day of the year."
                : `Your year began on ${fmtDay(firstDay.date)}.`,
            detail: `That week (${fmtSpan(week.start, week.end)}) brought ${plural(week.total, "contribution")}.`,
            stat: { value: fmtDay(firstDay.date), label: "first contribution" },
            range: span(week),
            evidence: [evidence(week)],
        });
    }

    // 2. Rhythm (weekday totals, Monday first) ----------------------------------------------
    if (total >= 14) {
        const byWeekday = new Array<number>(7).fill(0);
        for (const d of days) byWeekday[mondayIndex(d.date)]! += d.count;
        const top = byWeekday.indexOf(Math.max(...byWeekday));
        const weekend = byWeekday[5]! + byWeekday[6]!;
        chapters.push({
            id: "rhythm",
            title: "Your rhythm",
            headline: `${Math.round((byWeekday[top]! / total) * 100)}% of your contributions landed on a ${WEEKDAYS[top]}.`,
            detail: `Weekends made up ${Math.round((weekend / total) * 100)}% of your year.`,
            stat: { value: `${WEEKDAYS[top]}s`, label: "your busiest weekday" },
            weekday: top,
            weekdays: byWeekday,
            evidence: [],
        });
    }

    // A month and a single day make the yearly pattern concrete and easy to verify.
    {
        const monthTotals = new Map<string, number>();
        for (const day of days) {
            const month = day.date.slice(0, 7);
            monthTotals.set(month, (monthTotals.get(month) ?? 0) + day.count);
        }
        const busiestMonth = [...monthTotals.entries()].reduce((best, entry) =>
            entry[1] > best[1] ? entry : best,
        );
        const monthDays = days.filter((day) => day.date.startsWith(busiestMonth[0]));
        const start = monthDays[0]!.date;
        const end = monthDays[monthDays.length - 1]!.date;
        const monthName = format(parseISO(`${busiestMonth[0]}-01`), "MMMM");
        chapters.push({
            id: "busiest-month",
            title: "Your busiest month",
            headline: `${monthName} had the most contributions of any month (${nf(busiestMonth[1])}).`,
            detail: `That is ${fmtSpan(start, end)} on your contribution calendar.`,
            stat: { value: nf(busiestMonth[1]), label: `contributions in ${monthName}` },
            range: { from: start, to: end },
            evidence: [evidence({ start, end })],
        });
    }

    {
        // Only a day that clearly stands out: at least 5 contributions and twice a typical active day.
        const counts = days
            .filter((d) => d.count > 0)
            .map((d) => d.count)
            .sort((a, b) => a - b);
        const typical = counts[Math.floor(counts.length / 2)] ?? 0;
        const peak = days.reduce((best, day) => (day.count > best.count ? day : best));
        if (peak.count >= 5 && peak.count >= typical * 2) {
            chapters.push({
                id: "standout-day",
                title: "Your standout day",
                headline: `${fmtDay(peak.date)} was your biggest day, with ${plural(peak.count, "contribution")}.`,
                detail: `A typical active day for you had ${plural(typical, "contribution")}. Counts come from your contribution calendar and may include commits, pull requests, reviews, and issues.`,
                stat: { value: nf(peak.count), label: "contributions in one day" },
                range: { from: peak.date, to: peak.date },
                evidence: [
                    {
                        label: `Check ${fmtDay(peak.date)} on GitHub`,
                        url: profileLink(login, peak.date, peak.date),
                    },
                ],
            });
        }
    }

    // 3. Busiest week ----------------------------------------------------------------------
    if (weeks.length >= 2) {
        let best = weeks[0]!;
        for (const w of weeks) if (w.total > best.total) best = w;
        const peak = days
            .filter((d) => d.date >= best.start && d.date <= best.end)
            .reduce((a, b) => (b.count > a.count ? b : a));
        chapters.push({
            id: "busiest",
            title: "Your busiest week",
            headline: `The week of ${fmtSpan(best.start, best.end)} was your busiest, with ${plural(best.total, "contribution")}.`,
            detail: `That week included ${fmtDay(peak.date)}, your busiest individual day (${plural(peak.count, "contribution")}).`,
            stat: { value: nf(best.total), label: "contributions in one week" },
            range: span(best),
            evidence: [evidence(best)],
        });
    }

    // 4 + 5. Quiet stretch and the comeback (whole empty weeks *between* active weeks) ------
    {
        let bestLen = 0;
        let bestStart = -1;
        let runStart = -1;
        for (let i = firstW; i <= lastW; i++) {
            if (weeks[i]!.total === 0) {
                if (runStart === -1) runStart = i;
            } else if (runStart !== -1) {
                if (i - runStart > bestLen) {
                    bestLen = i - runStart;
                    bestStart = runStart;
                }
                runStart = -1;
            }
        }
        if (bestLen >= 2) {
            const a = weeks[bestStart]!;
            const b = weeks[bestStart + bestLen - 1]!;
            chapters.push({
                id: "quiet",
                title: "The quiet stretch",
                headline: `For ${plural(bestLen, "week")} (${fmtSpan(a.start, b.end)}) no contributions were recorded.`,
                detail: "Work outside GitHub, or in private repositories you haven't chosen to show, doesn't appear in this calendar.",
                stat: { value: `${bestLen}w`, label: "longest quiet stretch" },
                range: span(a, b),
                evidence: [evidence(a, b)],
            });

            const back = weeks[bestStart + bestLen]!; // active by construction
            const next = weeks[bestStart + bestLen + 1];
            const after = back.total + (next?.total ?? 0);
            chapters.push({
                id: "comeback",
                title: "The comeback",
                headline: `In the week of ${fmtSpan(back.start, back.end)} you were back.`,
                detail: `${next ? "That week and the next brought" : "That week brought"} ${plural(after, "contribution")}.`,
                stat: { value: fmtDay(back.start), label: "first week back" },
                range: span(back, next ?? back),
                evidence: [evidence(back, next ?? back)],
            });
        }
    }

    // 6. The project you kept returning to -------------------------------------------------
    {
        const top = cal.repoCommits[0];
        if (top && top.commits > 0) {
            const denom = Math.max(cal.breakdown.commits, top.commits);
            const share = Math.round((top.commits / denom) * 100);
            chapters.push({
                id: "project",
                title: "The project you kept returning to",
                headline: top.isPrivate
                    ? `A private repository took ${share}% of your commits.`
                    : `${top.fullName} took ${share}% of your commits.`,
                detail: `${plural(top.commits, "commit")} this year.`,
                stat: { value: nf(top.commits), label: "commits in one repo" },
                // Never link or name a private repo: the card is meant to be shared.
                evidence: top.isPrivate ? [] : [{ label: top.fullName, url: top.url }],
            });
        }
    }

    // 7. How the year ended / lately (last 4 weeks, compared per day so a partial week is fair)
    if (weeks.length >= 10) {
        const recentWeeks = weeks.slice(-4);
        const recent = recentWeeks.reduce((acc, w) => acc + w.total, 0);
        const recentDays = recentWeeks.reduce((acc, w) => acc + w.dayCount, 0);
        const expected = (total / days.length) * recentDays;
        const diff = Math.round((recent / expected - 1) * 100);
        const a = recentWeeks[0]!;
        const b = recentWeeks[recentWeeks.length - 1]!;
        const ongoing = data.year === new Date().getUTCFullYear();
        chapters.push({
            id: "ending",
            title: ongoing ? "Lately" : "How the year ended",
            headline:
                recent === 0
                    ? "No contributions were recorded in the last 4 weeks."
                    : diff >= 10
                      ? `The last 4 weeks ran ${diff}% above your yearly pace.`
                      : diff <= -10
                        ? `The last 4 weeks ran ${Math.abs(diff)}% below your yearly pace.`
                        : "The last 4 weeks were in line with your yearly pace.",
            detail: `${plural(recent, "contribution")} between ${fmtSpan(a.start, b.end)}.`,
            stat: { value: nf(recent), label: "contributions in the last 4 weeks" },
            range: span(a, b),
            evidence: [evidence(a, b)],
        });
    }

    return chapters;
}

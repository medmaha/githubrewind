import type { CalendarDay, Chapter, RewindData } from "./rewind-types";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const parse = (date: string) => new Date(`${date}T00:00:00Z`);

export const fmtDay = (date: string) =>
    parse(date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const nf = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, word: string) => `${nf(n)} ${word}${n === 1 ? "" : "s"}`;

function profileLink(login: string, from: string, to: string) {
    return `https://github.com/${login}?tab=overview&from=${from}&to=${to}`;
}

function sum(days: CalendarDay[], from: number, to: number) {
    let total = 0;
    for (let i = from; i <= to; i++) total += days[i]?.count ?? 0;
    return total;
}

/**
 * Deterministic "story" of the year. Every sentence is a fact derived from the contribution
 * calendar; no causes or motives are guessed. Chapters that the data can't support are skipped.
 */
export function buildChapters(data: RewindData): Chapter[] {
    const cal = data.calendar;
    if (!cal || cal.days.length === 0) return [];

    const { days } = cal;
    const login = data.profile.login;
    const total = days.reduce((acc, d) => acc + d.count, 0);
    const activeIdx = days.flatMap((d, i) => (d.count > 0 ? [i] : []));
    if (total === 0 || activeIdx.length < 3) return [];

    const firstActive = activeIdx[0]!;
    const lastActive = activeIdx[activeIdx.length - 1]!;
    const last = days.length - 1;
    const link = (a: number, b: number, label: string) => ({
        label,
        url: profileLink(login, days[a]!.date, days[b]!.date),
    });
    const chapters: Chapter[] = [];

    // 1. Opening ---------------------------------------------------------------------------
    {
        const day = days[firstActive]!;
        const endIdx = Math.min(firstActive + 6, last);
        const week = sum(days, firstActive, endIdx);
        const onJan1 = day.date.endsWith("-01-01");
        chapters.push({
            id: "opening",
            title: "The opening act",
            headline: onJan1
                ? "You were active on the very first day of the year."
                : `Your year began on ${fmtDay(day.date)}.`,
            detail: `That first week brought ${plural(week, "contribution")}.`,
            stat: { value: fmtDay(day.date), label: "first contribution" },
            range: { from: day.date, to: days[endIdx]!.date },
            evidence: [link(firstActive, endIdx, `Activity ${fmtDay(day.date)} – ${fmtDay(days[endIdx]!.date)}`)],
        });
    }

    // 2. Rhythm ----------------------------------------------------------------------------
    if (total >= 14) {
        const byWeekday = new Array<number>(7).fill(0);
        for (const d of days) byWeekday[parse(d.date).getUTCDay()]! += d.count;
        const top = byWeekday.indexOf(Math.max(...byWeekday));
        const weekend = byWeekday[0]! + byWeekday[6]!;
        chapters.push({
            id: "rhythm",
            title: "Your rhythm",
            headline: `${Math.round((byWeekday[top]! / total) * 100)}% of your contributions landed on a ${WEEKDAYS[top]}.`,
            detail: `Weekends made up ${Math.round((weekend / total) * 100)}% of your year.`,
            stat: { value: `${WEEKDAYS[top]}s`, label: "your busiest weekday" },
            weekday: top,
            evidence: [],
        });
    }

    // 3. Busiest stretch (best rolling 7 days) --------------------------------------------
    if (days.length >= 7) {
        let best = -1;
        let bestStart = 0;
        for (let i = 0; i + 6 <= last; i++) {
            const s = sum(days, i, i + 6);
            if (s > best) {
                best = s;
                bestStart = i;
            }
        }
        const end = bestStart + 6;
        const peak = days.slice(bestStart, end + 1).reduce((a, b) => (b.count > a.count ? b : a));
        chapters.push({
            id: "busiest",
            title: "Your busiest stretch",
            headline: `Between ${fmtDay(days[bestStart]!.date)} and ${fmtDay(days[end]!.date)} you made ${plural(best, "contribution")}.`,
            detail: `The peak day in that week was ${fmtDay(peak.date)} with ${nf(peak.count)}.`,
            stat: { value: nf(best), label: "contributions in 7 days" },
            range: { from: days[bestStart]!.date, to: days[end]!.date },
            evidence: [link(bestStart, end, `Activity ${fmtDay(days[bestStart]!.date)} – ${fmtDay(days[end]!.date)}`)],
        });
    }

    // 4 + 5. Quiet stretch and the comeback (only gaps *between* active days) --------------
    {
        let bestLen = 0;
        let bestStart = -1;
        let runStart = -1;
        for (let i = firstActive; i <= lastActive; i++) {
            if (days[i]!.count === 0) {
                if (runStart === -1) runStart = i;
            } else if (runStart !== -1) {
                const len = i - runStart;
                if (len > bestLen) {
                    bestLen = len;
                    bestStart = runStart;
                }
                runStart = -1;
            }
        }
        if (bestLen >= 7) {
            const end = bestStart + bestLen - 1;
            chapters.push({
                id: "quiet",
                title: "The quiet stretch",
                headline: `From ${fmtDay(days[bestStart]!.date)} to ${fmtDay(days[end]!.date)} (${plural(bestLen, "day")}) no contributions were recorded.`,
                detail:
                    "Work outside GitHub, or in private repositories you haven't chosen to show, doesn't appear in this calendar.",
                stat: { value: `${bestLen}d`, label: "longest gap" },
                range: { from: days[bestStart]!.date, to: days[end]!.date },
                evidence: [link(bestStart, end, `Activity ${fmtDay(days[bestStart]!.date)} – ${fmtDay(days[end]!.date)}`)],
            });

            const back = end + 1; // active by construction
            const backEnd = Math.min(back + 13, last);
            const after = sum(days, back, backEnd);
            chapters.push({
                id: "comeback",
                title: "The comeback",
                headline: `On ${fmtDay(days[back]!.date)} you were back.`,
                detail: `The next ${plural(backEnd - back + 1, "day")} brought ${plural(after, "contribution")}.`,
                stat: { value: fmtDay(days[back]!.date), label: "first day back" },
                range: { from: days[back]!.date, to: days[backEnd]!.date },
                evidence: [link(back, backEnd, `Activity ${fmtDay(days[back]!.date)} – ${fmtDay(days[backEnd]!.date)}`)],
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

    // 7. How the year ended / lately -------------------------------------------------------
    if (days.length >= 60) {
        const from = days.length - 30;
        const recent = sum(days, from, last);
        const pace = (total / days.length) * 30;
        const ongoing = data.year === new Date().getUTCFullYear();
        const diff = Math.round((recent / pace - 1) * 100);
        const headline =
            recent === 0
                ? "No contributions were recorded in the last 30 days."
                : diff >= 10
                    ? `The last 30 days ran ${diff}% above your yearly pace.`
                    : diff <= -10
                        ? `The last 30 days ran ${Math.abs(diff)}% below your yearly pace.`
                        : "The last 30 days were in line with your yearly pace.";
        chapters.push({
            id: "ending",
            title: ongoing ? "Lately" : "How the year ended",
            headline,
            detail: `${plural(recent, "contribution")} between ${fmtDay(days[from]!.date)} and ${fmtDay(days[last]!.date)}.`,
            stat: { value: nf(recent), label: "contributions in the last 30 days" },
            range: { from: days[from]!.date, to: days[last]!.date },
            evidence: [link(from, last, `Activity ${fmtDay(days[from]!.date)} – ${fmtDay(days[last]!.date)}`)],
        });
    }

    return chapters;
}
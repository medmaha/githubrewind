import type {
    RawContributions,
    RawEvent,
    RawRepo,
    RawRepoLanguages,
    RawRewind,
} from "./rewind-raw";
import type {
    Achievement,
    CalendarData,
    CalendarDay,
    CalendarWeek,
    LanguageStat,
    MonthlyPoint,
    RepoSummary,
    RewindData,
} from "./rewind-types";

/**
 * CLIENT-SIDE COMPUTATION. Takes the trimmed responses collected by `github.api.ts` and turns
 * them into `RewindData`. Pure functions, no network, no server imports: keep it that way so the
 * server only ever pays for fetching.
 */

// --- repositories ------------------------------------------------------------------------

function toSummary(r: RawRepo): RepoSummary {
    return {
        name: r.name,
        fullName: r.full_name,
        url: r.html_url,
        description: r.description,
        stars: r.stargazers_count,
        forks: r.forks_count,
        watchers: r.watchers_count,
        language: r.language,
        isPrivate: r.private,
        isFork: r.fork,
        sizeKb: r.size,
        createdAt: r.created_at,
        pushedAt: r.pushed_at ?? r.updated_at,
        topics: r.topics,
    };
}

function aggregateLanguages(perRepo: RawRepoLanguages[]) {
    const totals = new Map<string, { bytes: number; repos: number }>();
    for (const { bytes } of perRepo) {
        for (const [lang, n] of Object.entries(bytes)) {
            const entry = totals.get(lang) ?? { bytes: 0, repos: 0 };
            entry.bytes += n;
            entry.repos += 1;
            totals.set(lang, entry);
        }
    }
    const sum = [...totals.values()].reduce((acc, v) => acc + v.bytes, 0) || 1;
    const languages: LanguageStat[] = [...totals.entries()]
        .map(([name, v]) => ({
            name,
            bytes: v.bytes,
            repos: v.repos,
            percent: Math.round((v.bytes / sum) * 1000) / 10,
        }))
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 10);
    return { languages, totalBytes: sum };
}

// --- contribution calendar ---------------------------------------------------------------

function normalizeCalendar(cc: RawContributions, year: number): CalendarData {
    const days: CalendarDay[] = [];
    for (const week of cc.contributionCalendar.weeks) {
        for (const d of week.contributionDays) {
            if (typeof d.date === "string" && d.date.startsWith(`${year}-`))
                days.push({ date: d.date, count: d.contributionCount ?? 0 });
        }
    }
    days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const repoCommits = (cc.commitContributionsByRepository ?? [])
        .map((r) => ({
            fullName: r.repository.nameWithOwner,
            url: r.repository.url,
            isPrivate: Boolean(r.repository.isPrivate),
            commits: r.contributions?.totalCount ?? 0,
        }))
        .sort((a, b) => b.commits - a.commits);

    return {
        days,
        totalContributions: cc.contributionCalendar.totalContributions ?? 0,
        restrictedContributions: cc.restrictedContributionsCount ?? 0,
        breakdown: {
            commits: cc.totalCommitContributions ?? 0,
            prs: cc.totalPullRequestContributions ?? 0,
            reviews: cc.totalPullRequestReviewContributions ?? 0,
            issues: cc.totalIssueContributions ?? 0,
            newRepos: cc.totalRepositoryContributions ?? 0,
        },
        repoCommits,
    };
}

/** Monday = 0 ... Sunday = 6, for a YYYY-MM-DD date. */
export const mondayIndex = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;

/**
 * Groups consecutive calendar days into weeks, Monday to Sunday. The first and last week of the
 * data can be partial (`dayCount < 7`); `start` / `end` are the first / last day actually present.
 */
export function toWeeks(days: CalendarDay[]): CalendarWeek[] {
    const weeks: CalendarWeek[] = [];
    let current: CalendarWeek | null = null;
    for (const d of days) {
        if (!current || mondayIndex(d.date) === 0) {
            current = { start: d.date, end: d.date, total: 0, activeDays: 0, dayCount: 0 };
            weeks.push(current);
        }
        current.end = d.date;
        current.total += d.count;
        current.dayCount += 1;
        if (d.count > 0) current.activeDays += 1;
    }
    return weeks;
}

function streakFromDays(days: CalendarDay[]) {
    let activeDays = 0;
    let longestStreak = 0;
    let current = 0;
    for (const d of days) {
        if (d.count > 0) {
            activeDays++;
            current++;
            longestStreak = Math.max(longestStreak, current);
        } else {
            current = 0;
        }
    }
    return { activeDays, longestStreak };
}

// --- event feed fallback (public feed only covers ~90 days) -------------------------------

const pushCommitCount = (e: RawEvent) => e.commits ?? 1;

function streakStats(events: RawEvent[], year: number) {
    const days = new Set<string>();
    for (const e of events) {
        const d = new Date(e.created_at);
        if (d.getUTCFullYear() === year) days.add(d.toISOString().slice(0, 10));
    }
    const sorted = [...days].sort();
    let longest = 0;
    let current = 0;
    let previous: number | null = null;
    for (const day of sorted) {
        const t = Date.parse(day);
        current = previous !== null && t - previous === 86_400_000 ? current + 1 : 1;
        previous = t;
        longest = Math.max(longest, current);
    }
    return { activeDays: days.size, longestStreak: longest };
}

function buildMonthly(
    events: RawEvent[],
    repos: RawRepo[],
    year: number,
    calendar: CalendarData | null,
): MonthlyPoint[] {
    const months = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(Date.UTC(year, i, 1)).toLocaleString("en-US", { month: "short" }),
        commits: 0,
        repos: 0,
        contributions: 0,
    }));
    for (const e of events) {
        const d = new Date(e.created_at);
        if (d.getUTCFullYear() !== year) continue;
        const bucket = months[d.getUTCMonth()];
        if (bucket && e.type === "PushEvent") bucket.commits += pushCommitCount(e);
    }
    for (const r of repos) {
        const d = new Date(r.created_at);
        const bucket = months[d.getUTCMonth()];
        if (bucket && d.getUTCFullYear() === year) bucket.repos += 1;
    }
    if (calendar) {
        for (const day of calendar.days) {
            const bucket = months[Number(day.date.slice(5, 7)) - 1];
            if (bucket) bucket.contributions += day.count;
        }
    } else {
        for (const m of months) m.contributions = m.commits;
    }
    return months;
}

// --- achievements ------------------------------------------------------------------------

function buildAchievements(data: Omit<RewindData, "achievements">): Achievement[] {
    const a: Achievement[] = [];
    const t = data.totals;
    const push = (id: string, title: string, description: string, tier: Achievement["tier"]) =>
        a.push({ id, title, description, tier });

    if (t.stars >= 1000)
        push(
            "star-legend",
            "Star Legend",
            `${t.stars.toLocaleString()} stars across your work`,
            "gold",
        );
    else if (t.stars >= 100)
        push("star-collector", "Star Collector", `${t.stars} stars earned`, "silver");
    else if (t.stars > 0) push("first-stars", "First Light", `${t.stars} stars earned`, "bronze");

    if (t.prsMerged >= 100)
        push("merge-master", "Merge Master", `${t.prsMerged} pull requests merged`, "gold");
    else if (t.prsMerged >= 10)
        push("shipper", "Consistent Shipper", `${t.prsMerged} pull requests merged`, "silver");
    else if (t.prs > 0)
        push("contributor", "Contributor", `${t.prs} pull requests opened`, "bronze");

    if (data.languages.length >= 6)
        push("polyglot", "Polyglot", `${data.languages.length} languages in active use`, "gold");
    else if (data.languages.length >= 4)
        push("multilingual", "Multilingual", `${data.languages.length} languages used`, "silver");

    if (t.longestStreak >= 14)
        push("streak", "Streak Runner", `${t.longestStreak}-day activity streak`, "gold");
    else if (t.longestStreak >= 8)
        push("momentum", "Momentum", `${t.longestStreak}-day activity streak`, "silver");

    if (t.reposCreatedThisYear >= 15)
        push(
            "builder",
            "Serial Builder",
            `${t.reposCreatedThisYear} new repositories in ${data.year}`,
            "gold",
        );
    else if (t.reposCreatedThisYear > 2)
        push(
            "starter",
            "Fresh Starts",
            `${t.reposCreatedThisYear} new repositories in ${data.year}`,
            "bronze",
        );

    if (t.issues >= 50) push("triage", "Issue Triager", `${t.issues} issues opened`, "silver");
    if (t.reviews >= 20)
        push("reviewer", "Code Reviewer", `${t.reviews} reviews contributed`, "gold");
    if (data.profile.followers >= 100)
        push("community", "Community Magnet", `${data.profile.followers} followers`, "silver");
    if (t.commitsThisYear >= 1000)
        push(
            "commit-machine",
            "Commit Machine",
            `${t.commitsThisYear} commits in ${data.year}`,
            "gold",
        );

    return a.slice(0, 8);
}

// --- entry point -------------------------------------------------------------------------

export function computeRewind(raw: RawRewind): RewindData {
    const { year, user, events } = raw;
    const notes = [...raw.notes];

    const calendar = raw.contributions ? normalizeCalendar(raw.contributions, year) : null;

    if (!raw.authenticated)
        notes.push(
            "Full-year activity needs a GitHub token. Without one, activity covers roughly the last 90 days.",
        );
    if (calendar && calendar.restrictedContributions > 0)
        notes.push(
            `Includes ${calendar.restrictedContributions} private contributions this user chose to show on their profile.`,
        );
    if (raw.authenticated && !raw.privateReposIncluded)
        notes.push("Private repository details are excluded from this shared rewind response.");
    else if (raw.authenticated && !raw.isSelf)
        notes.push("Private repositories are only included when the token belongs to this user.");
    if (raw.repos.length === 0) notes.push("No repositories found for this account.");

    const repos = raw.repos.map(toSummary);
    const owned = repos.filter((r) => !r.isFork);
    const { languages, totalBytes } = aggregateLanguages(raw.languages);

    const { activeDays, longestStreak } = calendar
        ? streakFromDays(calendar.days)
        : streakStats(events, year);

    const pushCommits = events
        .filter((e) => e.type === "PushEvent")
        .reduce((acc, e) => acc + pushCommitCount(e), 0);
    const yearCommits = calendar
        ? Math.max(raw.counts.commitSearch, calendar.breakdown.commits)
        : Math.max(raw.counts.commitSearch, pushCommits);

    const base: Omit<RewindData, "achievements"> = {
        year,
        scope: raw.isSelf ? "authenticated" : "public",
        generatedAt: raw.generatedAt,
        profile: {
            login: user.login,
            name: user.name,
            avatarUrl: user.avatar_url,
            bio: user.bio,
            company: user.company,
            location: user.location,
            followers: user.followers,
            following: user.following,
            createdAt: user.created_at,
            htmlUrl: user.html_url,
        },
        totals: {
            repos: repos.length,
            ownedRepos: owned.length,
            reposCreatedThisYear: repos.filter(
                (r) => new Date(r.createdAt).getUTCFullYear() === year,
            ).length,
            privateRepos: repos.filter((r) => r.isPrivate).length,
            stars: owned.reduce((acc, r) => acc + r.stars, 0),
            forks: owned.reduce((acc, r) => acc + r.forks, 0),
            commits: yearCommits,
            commitsThisYear: yearCommits,
            prs: calendar ? calendar.breakdown.prs : (raw.counts.prs ?? 0),
            prsMerged: raw.counts.prsMerged,
            issues: calendar ? calendar.breakdown.issues : (raw.counts.issues ?? 0),
            reviews: calendar ? calendar.breakdown.reviews : (raw.counts.reviews ?? 0),
            // Rough LOC estimate: ~55 bytes per line of code.
            estimatedLinesOfCode: Math.round(totalBytes / 55),
            linesEstimated: true,
            activeDays,
            longestStreak,
        },
        languages,
        topRepos: [...owned].sort((a, b) => b.stars - a.stars).slice(0, 6),
        recentRepos: [...repos]
            .sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt))
            .slice(0, 6),
        monthly: buildMonthly(events, raw.repos, year, calendar),
        calendar,
        comparison:
            raw.comparisonContributions && year > 2008
                ? {
                      year: year - 1,
                      calendar: normalizeCalendar(raw.comparisonContributions, year - 1),
                  }
                : null,
        notes,
        events,
    };

    return { ...base, achievements: buildAchievements(base) };
}

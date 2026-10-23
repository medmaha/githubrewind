import type {
    Achievement,
    CalendarData,
    CalendarDay,
    LanguageStat,
    MonthlyPoint,
    RepoSummary,
    RewindData,
} from "./rewind-types";

const API = "https://api.github.com";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

function headers(token?: string): HeadersInit {
    const h: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "githubrewind",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
}

async function gh<T = Json>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${API}${path}`, { headers: headers(token) });
    if (!res.ok) {
        const body = await res.text();
        if (res.status === 404) throw new Error("GitHub user not found.");
        if (res.status === 401) throw new Error("The provided GitHub token is invalid or expired.");
        if (res.status === 403 || res.status === 429) {
            throw new Error(
                "GitHub rate limit reached. Add a personal access token for higher limits and try again.",
            );
        }
        console.error(`GitHub request failed [${res.status}] ${path}: ${body.slice(0, 400)}`);
        throw new Error(`GitHub request failed (${res.status}).`);
    }
    return (await res.json()) as T;
}

async function ghGraphql<T = Json>(
    query: string,
    variables: Record<string, unknown>,
    token: string,
): Promise<T> {
    const res = await fetch(`${API}/graphql`, {
        method: "POST",
        headers: { ...(headers(token) as Record<string, string>), "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
    });
    if (res.status === 401) throw new Error("The provided GitHub token is invalid or expired.");
    if (res.status === 403 || res.status === 429)
        throw new Error("GitHub rate limit reached. Add a personal access token for higher limits and try again.");
    if (!res.ok) throw new Error(`GitHub GraphQL request failed (${res.status}).`);
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (json.errors?.length) throw new Error(json.errors[0]?.message ?? "GraphQL error");
    return json.data as T;
}

async function safe<T>(fn: () => Promise<T>, fallback: T, notes: string[], label: string) {
    try {
        return await fn();
    } catch (error) {
        notes.push(`${label} unavailable: ${(error as Error).message}`);
        return fallback;
    }
}

async function searchCount(q: string, token?: string) {
    const data = await gh<{ total_count: number }>(
        `/search/issues?q=${encodeURIComponent(q)}&per_page=1`,
        token,
    );
    return data.total_count ?? 0;
}

async function fetchRepos(
    login: string,
    token: string | undefined,
    notes: string[],
    isSelf: boolean,
) {
    const repos: Json[] = [];
    // `/user/repos` lists the TOKEN OWNER's repos, so only use it when that owner is the
    // user being searched. Otherwise we'd show the token owner's repositories for any username.
    const base = token && isSelf
        ? `/user/repos?affiliation=owner,collaborator,organization_member`
        : `/users/${login}/repos?type=owner`;
    for (let page = 1; page <= 3; page++) {
        const chunk = await gh<Json[]>(`${base}&sort=updated&per_page=100&page=${page}`, token);
        repos.push(...chunk);
        if (chunk.length < 100) break;
    }
    if (repos.length === 0) notes.push("No repositories found for this account.");
    return repos;
}

function toSummary(r: Json): RepoSummary {
    return {
        name: r.name,
        fullName: r.full_name,
        url: r.html_url,
        description: r.description ?? null,
        stars: r.stargazers_count ?? 0,
        forks: r.forks_count ?? 0,
        watchers: r.watchers_count ?? 0,
        language: r.language ?? null,
        isPrivate: Boolean(r.private),
        isFork: Boolean(r.fork),
        sizeKb: r.size ?? 0,
        createdAt: r.created_at,
        pushedAt: r.pushed_at ?? r.updated_at,
        topics: Array.isArray(r.topics) ? r.topics : [],
    };
}

async function fetchLanguages(repos: Json[], token: string | undefined, notes: string[]) {
    const targets = repos
        .filter((r) => !r.fork)
        .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0))
        .slice(0, 20);

    const totals = new Map<string, { bytes: number; repos: number }>();
    const results = await Promise.allSettled(
        targets.map((r) => gh<Record<string, number>>(`/repos/${r.full_name}/languages`, token)),
    );
    let failures = 0;
    for (const result of results) {
        if (result.status !== "fulfilled") {
            failures++;
            continue;
        }
        for (const [lang, bytes] of Object.entries(result.value)) {
            const entry = totals.get(lang) ?? { bytes: 0, repos: 0 };
            entry.bytes += bytes;
            entry.repos += 1;
            totals.set(lang, entry);
        }
    }
    if (failures) notes.push(`Language details unavailable for ${failures} repositories.`);

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

type GithubEvent = {
    id: string;
    type: "PublicEvent" | "PushEvent";
    actor: {
        id: number;
        login: string;
        display_login: string;
        gravatar_id: string;
        url: string;
    };
    repo: {
        id: number;
        name: string;
        url: string;
    };
    payload: { commits?: any[] };
    public: boolean;
    created_at: string;
};

async function fetchEvents(login: string, token: string | undefined) {
    const events: GithubEvent[] = [];

    for (let page = 1; page <= 3; page++) {
        const chunk = await gh<Json[]>(`/users/${login}/events?per_page=100&page=${page}`, token);
        events.push(...chunk);
        if (chunk.length < 100) break;
    }
    return events;
}

function buildMonthly(
    events: GithubEvent[],
    repos: Json[],
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
        if (bucket && e.type === "PushEvent") bucket.commits += e.payload?.commits?.length ?? 1;
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

/** Fallback when there is no calendar: derived from the (short) public event feed. */
function streakStats(events: GithubEvent[], year: number) {
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

const CALENDAR_QUERY = `
query RewindCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
  viewer { login }
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      totalRepositoryContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
      commitContributionsByRepository(maxRepositories: 10) {
        repository { nameWithOwner url isPrivate }
        contributions { totalCount }
      }
    }
  }
}`;

type CalendarResult = { calendar: CalendarData; viewerLogin: string | null };

/** Full-year daily contribution counts. GraphQL always requires a token. */
async function fetchCalendar(login: string, year: number, token: string): Promise<CalendarResult> {
    const now = new Date();
    const end =
        year === now.getUTCFullYear() ? now : new Date(Date.UTC(year, 11, 31, 23, 59, 59));
    const data = await ghGraphql<Json>(
        CALENDAR_QUERY,
        { login, from: `${year}-01-01T00:00:00Z`, to: end.toISOString() },
        token,
    );
    const cc = data?.user?.contributionsCollection;
    if (!cc) throw new Error("no contribution data returned");

    const days: CalendarDay[] = [];
    for (const week of cc.contributionCalendar.weeks as Json[]) {
        for (const d of week.contributionDays as Json[]) {
            if (typeof d.date === "string" && d.date.startsWith(`${year}-`))
                days.push({ date: d.date, count: d.contributionCount ?? 0 });
        }
    }
    days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const repoCommits = ((cc.commitContributionsByRepository ?? []) as Json[])
        .map((r) => ({
            fullName: r.repository.nameWithOwner as string,
            url: r.repository.url as string,
            isPrivate: Boolean(r.repository.isPrivate),
            commits: (r.contributions?.totalCount ?? 0) as number,
        }))
        .sort((a, b) => b.commits - a.commits);

    return {
        viewerLogin: data?.viewer?.login ?? null,
        calendar: {
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
        },
    };
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

export async function buildRewind(
    username: string,
    year: number,
    token?: string,
): Promise<RewindData> {
    const notes: string[] = [];
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;

    const user = await gh<Json>(`/users/${username}`, token);
    const login: string = user.login;

    // Full-year contribution calendar. GraphQL needs a token (the user's own, or the shared one).
    const cal = token
        ? await safe<CalendarResult | null>(
            () => fetchCalendar(login, year, token),
            null,
            notes,
            "Contribution calendar",
        )
        : null;
    const calendar = cal?.calendar ?? null;
    if (!token)
        notes.push(
            "Full-year activity needs a GitHub token. Without one, activity covers roughly the last 90 days.",
        );
    if (calendar && calendar.restrictedContributions > 0)
        notes.push(
            `Includes ${calendar.restrictedContributions} private contributions this user chose to show on their profile.`,
        );

    // Private repos are only listed when the token belongs to the user being searched.
    const isSelf = Boolean(cal?.viewerLogin && cal.viewerLogin.toLowerCase() === login.toLowerCase());
    if (token && !isSelf)
        notes.push("Private repositories are only included when the token belongs to this user.");

    const [rawRepos, events] = await Promise.all([
        fetchRepos(login, token, notes, isSelf),
        safe(() => fetchEvents(login, token), [] as Json[], notes, "Recent event feed"),
    ]);

    const { languages, totalBytes } = await fetchLanguages(rawRepos, token, notes);

    const [prs, prsMerged, issues, reviews, commitsThisYear] = await Promise.all([
        calendar
            ? Promise.resolve(calendar.breakdown.prs)
            : safe(
                () => searchCount(`author:${login} type:pr created:${from}..${to}`, token),
                0,
                notes,
                "PR count",
            ),
        safe(
            () => searchCount(`author:${login} type:pr is:merged created:${from}..${to}`, token),
            0,
            notes,
            "Merged PR count",
        ),
        calendar
            ? Promise.resolve(calendar.breakdown.issues)
            : safe(
                () => searchCount(`author:${login} type:issue created:${from}..${to}`, token),
                0,
                notes,
                "Issue count",
            ),
        calendar
            ? Promise.resolve(calendar.breakdown.reviews)
            : safe(
                () => searchCount(`reviewed-by:${login} type:pr updated:${from}..${to}`, token),
                0,
                notes,
                "Review count",
            ),
        safe(
            async () => {
                const res = await fetch(
                    `${API}/search/commits?q=${encodeURIComponent(`author:${login} author-date:${from}..${to}`)}&per_page=1`,
                    { headers: headers(token) },
                );
                if (!res.ok) throw new Error(`status ${res.status}`);
                const data = (await res.json()) as { total_count: number };
                return data.total_count ?? 0;
            },
            0,
            notes,
            "Commit search",
        ),
    ]);

    const repos = rawRepos.map(toSummary);
    const owned = repos.filter((r) => !r.isFork);
    const stars = owned.reduce((acc, r) => acc + r.stars, 0);
    const forks = owned.reduce((acc, r) => acc + r.forks, 0);
    const { activeDays, longestStreak } = calendar
        ? streakFromDays(calendar.days)
        : streakStats(events, year);

    const pushCommits = events
        .filter((e) => e.type === "PushEvent")
        .reduce((acc, e) => acc + (e.payload?.commits?.length ?? 1), 0);

    const yearCommits = calendar
        ? Math.max(commitsThisYear, calendar.breakdown.commits)
        : Math.max(commitsThisYear, pushCommits);

    // Rough LOC estimate: GitHub reports repo size in KB; ~55 bytes per line of code.
    const estimatedLinesOfCode = Math.round(totalBytes / 55);

    const base: Omit<RewindData, "achievements"> = {
        year,
        scope: isSelf ? "authenticated" : "public",
        generatedAt: new Date().toISOString(),
        profile: {
            login,
            name: user.name ?? null,
            avatarUrl: user.avatar_url,
            bio: user.bio ?? null,
            company: user.company ?? null,
            location: user.location ?? null,
            followers: user.followers ?? 0,
            following: user.following ?? 0,
            createdAt: user.created_at,
            htmlUrl: user.html_url,
        },
        totals: {
            repos: repos.length,
            reposCreatedThisYear: repos.filter(
                (r) => new Date(r.createdAt).getUTCFullYear() === year,
            ).length,
            privateRepos: repos.filter((r) => r.isPrivate).length,
            stars,
            forks,
            commits: yearCommits,
            commitsThisYear: yearCommits,
            prs,
            prsMerged,
            issues,
            reviews,
            estimatedLinesOfCode,
            linesEstimated: true,
            activeDays,
            longestStreak,
        },
        languages,
        topRepos: [...owned].sort((a, b) => b.stars - a.stars).slice(0, 6),
        recentRepos: [...repos]
            .sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt))
            .slice(0, 6),
        monthly: buildMonthly(events, rawRepos, year, calendar),
        calendar,
        notes,
        events,
    };

    return { ...base, achievements: buildAchievements(base) };
}
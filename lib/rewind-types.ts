import type { RawRewind } from "./rewind-raw";

export type RewindProfile = {
    login: string;
    name: string | null;
    avatarUrl: string;
    bio: string | null;
    company: string | null;
    location: string | null;
    followers: number;
    following: number;
    createdAt: string;
    htmlUrl: string;
};

export type RepoSummary = {
    name: string;
    fullName: string;
    url: string;
    description: string | null;
    stars: number;
    forks: number;
    watchers: number;
    language: string | null;
    isPrivate: boolean;
    isFork: boolean;
    sizeKb: number;
    createdAt: string;
    pushedAt: string;
    topics: string[];
};

export type LanguageStat = {
    name: string;
    bytes: number;
    percent: number;
    repos: number;
};

export type Achievement = {
    id: string;
    title: string;
    description: string;
    tier: "bronze" | "silver" | "gold";
};

export type CalendarDay = { date: string; count: number };

export type CalendarData = {
    /** Every day of the year, sorted ascending. Counts include commits, PRs, issues and reviews. */
    days: CalendarDay[];
    totalContributions: number;
    /** Private contributions the user chose to show on their profile (included in the counts). */
    restrictedContributions: number;
    breakdown: { commits: number; prs: number; reviews: number; issues: number; newRepos: number };
    /** Commits per repository, busiest first. Private repos are flagged so the UI can hide links. */
    repoCommits: { fullName: string; url: string; isPrivate: boolean; commits: number }[];
};

/** One Monday-to-Sunday week. First / last week of the year can be partial (`dayCount < 7`). */
export type CalendarWeek = {
    /** First day present in this week (YYYY-MM-DD). */
    start: string;
    /** Last day present in this week (YYYY-MM-DD). */
    end: string;
    total: number;
    activeDays: number;
    dayCount: number;
};

export type MonthlyPoint = {
    month: string;
    /** Push-event commits (public event feed, ~90 days only). Legacy. */
    commits: number;
    repos: number;
    /** Full-year contributions when a calendar is available, otherwise equals `commits`. */
    contributions: number;
};

export type RewindData = {
    year: number;
    scope: "public" | "authenticated";
    generatedAt: string;
    profile: RewindProfile;
    totals: {
        repos: number;
        reposCreatedThisYear: number;
        privateRepos: number;
        stars: number;
        forks: number;
        commits: number;
        commitsThisYear: number;
        prs: number;
        prsMerged: number;
        issues: number;
        reviews: number;
        estimatedLinesOfCode: number;
        linesEstimated: boolean;
        activeDays: number;
        longestStreak: number;
    };
    languages: LanguageStat[];
    topRepos: RepoSummary[];
    recentRepos: RepoSummary[];
    monthly: MonthlyPoint[];
    /** Full-year GraphQL contribution calendar. null when no token / request failed. */
    calendar: CalendarData | null;
    achievements: Achievement[];
    notes: string[];
    events: any;
};

export type AiInsights = {
    headline: string;
    yearlyOverview: string;
    significantAchievements: string[];
    areasOfGrowth: string[];
    codingStyle: string;
    personaTitle: string;
    shareCaption: string;
};

export type InternalLimitResult =
    | { ok: true }
    | { ok: false; reason: "rate_limit"; retryAt: number | null }
    | { ok: false; reason: "forbidden" };

/**
 * Returned (not thrown) by the server action: Next.js redacts thrown error messages in production.
 * The server only fetches: the client turns `raw` into RewindData with `computeRewind`.
 */
export type InternalRewindResult =
    | { ok: true; raw: RawRewind }
    | { ok: false; code: "INTERNAL_LIMIT" | "ERROR"; message: string; retryAt: number | null };

export type InternalInsightResult =
    | { ok: true; insights: AiInsights }
    | { ok: false; code: "INTERNAL_LIMIT" | "ERROR"; message: string; retryAt: number | null };

export type Chapter = {
    id: "opening" | "rhythm" | "busiest" | "quiet" | "comeback" | "project" | "ending";
    title: string;
    /** One factual sentence. Everything here is computed from the calendar, never AI-written. */
    headline: string;
    detail?: string;
    stat: { value: string; label: string };
    /** Inclusive YYYY-MM-DD range the chapter is about (highlighted on the weekly ribbon). */
    range?: { from: string; to: string };
    /** Index of the highlighted weekday, 0 = Monday ... 6 = Sunday. */
    weekday?: number;
    /** Contributions per weekday, Monday first. Present on the rhythm chapter. */
    weekdays?: number[];
    /** Receipts: where the reader can verify the claim on GitHub. */
    evidence: { label: string; url: string }[];
};

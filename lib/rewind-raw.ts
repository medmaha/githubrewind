/**
 * What the fetch layer (`github.api.ts`) returns. Fields are trimmed to what the client needs
 * (a GitHub repo object has ~90 fields, we keep ~14) but nothing is aggregated or derived:
 * all computation lives in `rewind-utils.ts` and runs in the browser.
 */

// TODO introduce zod schema and infer types from them. schema parsing should be done in `github.api.ts`

export type RawUser = {
    login: string;
    name: string | null;
    avatar_url: string;
    bio: string | null;
    company: string | null;
    location: string | null;
    followers: number;
    following: number;
    created_at: string;
    html_url: string;
};

export type RawRepo = {
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    watchers_count: number;
    language: string | null;
    private: boolean;
    fork: boolean;
    size: number;
    created_at: string;
    pushed_at: string | null;
    updated_at: string;
    topics: string[];
};

/** `commits` is the number of commits in a PushEvent, or null for any other event. */
export type RawEvent = { type: string; created_at: string; commits: number | null };

/** Language byte counts for one repository, as returned by `/repos/{repo}/languages`. */
export type RawRepoLanguages = { fullName: string; bytes: Record<string, number> };

/** `null` = deliberately not fetched (the contribution calendar already has the number). */
export type RawCounts = {
    prs: number | null;
    prsMerged: number;
    issues: number | null;
    reviews: number | null;
    commitSearch: number;
};

/** The GraphQL `contributionsCollection` object, exactly as requested. */
export type RawContributions = {
    totalCommitContributions: number;
    totalPullRequestContributions: number;
    totalPullRequestReviewContributions: number;
    totalIssueContributions: number;
    totalRepositoryContributions: number;
    restrictedContributionsCount: number;
    contributionCalendar: {
        totalContributions: number;
        weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
    };
    commitContributionsByRepository: {
        repository: { nameWithOwner: string; url: string; isPrivate: boolean };
        contributions: { totalCount: number };
    }[];
};

export type RawRewind = {
    year: number;
    generatedAt: string;
    /** A token (shared or the user's own) was used for the requests. */
    authenticated: boolean;
    /** The token belongs to the searched user, so private repositories are included. */
    isSelf: boolean;
    user: RawUser;
    repos: RawRepo[];
    languages: RawRepoLanguages[];
    events: RawEvent[];
    counts: RawCounts;
    contributions: RawContributions | null;
    comparisonContributions: RawContributions | null;
    /** Fetch-time problems only (a request failed). Derived notes are added by the client. */
    notes: string[];
};

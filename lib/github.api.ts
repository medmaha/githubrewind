/**
 * FETCH LAYER ONLY. This file runs on the server (shared token) or in the browser (user's token)
 * and does the minimum: call GitHub, trim each response to the fields we need, return it.
 * Everything else (totals, languages, streaks, achievements, ...) is in `rewind-utils.ts`
 * and runs on the client, so it never costs server CPU.
 */

import type {
    RawContributions,
    RawCounts,
    RawEvent,
    RawRepo,
    RawRepoLanguages,
    RawRewind,
    RawUser,
} from "./rewind-raw";

const API = "https://api.github.com";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

function headers(token?: string): HeadersInit {
    const h: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "GithubRewind",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
}

async function ghREST<T = Json>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${API}${path}`, { headers: headers(token) });
    if (!res.ok) {
        if (res.status === 404) throw new Error("GitHub user not found.");
        if (res.status === 401) throw new Error("The provided GitHub token is invalid or expired.");
        if (res.status === 403 || res.status === 429) {
            throw new Error(
                "GitHub rate limit reached. Add a personal access token for higher limits and try again.",
            );
        }
        console.error(`GitHub request failed [${res.status}] ${path}`);
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
        headers: {
            ...(headers(token) as Record<string, string>),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
    });
    if (res.status === 401) throw new Error("The provided GitHub token is invalid or expired.");
    if (res.status === 403 || res.status === 429)
        throw new Error(
            "GitHub rate limit reached. Add a personal access token for higher limits and try again.",
        );
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

async function totalCount(path: string, token?: string) {
    const data = await ghREST<{ total_count: number }>(path, token);
    return data.total_count ?? 0;
}

const searchIssues = (q: string, token?: string) =>
    totalCount(`/search/issues?q=${encodeURIComponent(q)}&per_page=1`, token);

const pickUser = (u: Json): RawUser => ({
    login: u.login,
    name: u.name ?? null,
    avatar_url: u.avatar_url,
    bio: u.bio ?? null,
    company: u.company ?? null,
    location: u.location ?? null,
    followers: u.followers ?? 0,
    following: u.following ?? 0,
    created_at: u.created_at,
    html_url: u.html_url,
});

const pickRepo = (r: Json): RawRepo => ({
    name: r.name,
    full_name: r.full_name,
    html_url: r.html_url,
    description: r.description ?? null,
    stargazers_count: r.stargazers_count ?? 0,
    forks_count: r.forks_count ?? 0,
    watchers_count: r.watchers_count ?? 0,
    language: r.language ?? null,
    private: Boolean(r.private),
    fork: Boolean(r.fork),
    size: r.size ?? 0,
    created_at: r.created_at,
    pushed_at: r.pushed_at ?? null,
    updated_at: r.updated_at,
    topics: Array.isArray(r.topics) ? r.topics : [],
});

async function fetchRepos(login: string, token: string | undefined, isSelf: boolean) {
    const repos: RawRepo[] = [];
    // `/user/repos` lists the TOKEN OWNER's repos, so only use it when that owner is the
    // user being searched. Otherwise we'd show the token owner's repositories for any username.
    const base =
        token && isSelf
            ? `/user/repos?affiliation=owner,collaborator,organization_member`
            : `/users/${login}/repos?type=owner`;
    for (let page = 1; page <= 3; page++) {
        const chunk = await ghREST<Json[]>(`${base}&sort=updated&per_page=100&page=${page}`, token);
        for (const r of chunk) repos.push(pickRepo(r));
        if (chunk.length < 100) break;
    }
    return repos;
}

/** Language bytes for the 20 most-starred non-fork repos. Aggregation happens on the client. */
async function fetchLanguages(
    repos: RawRepo[],
    token: string | undefined,
    notes: string[],
): Promise<RawRepoLanguages[]> {
    const targets = repos
        .filter((r) => !r.fork)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 20);

    const results = await Promise.allSettled(
        targets.map((r) =>
            ghREST<Record<string, number>>(`/repos/${r.full_name}/languages`, token),
        ),
    );
    const out: RawRepoLanguages[] = [];
    let failures = 0;
    results.forEach((result, i) => {
        if (result.status === "fulfilled")
            out.push({ fullName: targets[i]!.full_name, bytes: result.value });
        else failures++;
    });
    if (failures) notes.push(`Language details unavailable for ${failures} repositories.`);
    return out;
}

async function fetchEvents(login: string, token: string | undefined) {
    const events: RawEvent[] = [];
    for (let page = 1; page <= 3; page++) {
        const chunk = await ghREST<Json[]>(
            `/users/${login}/events?per_page=100&page=${page}`,
            token,
        );
        for (const e of chunk) {
            events.push({
                type: e.type,
                created_at: e.created_at,
                commits: e.type === "PushEvent" ? (e.payload?.commits?.length ?? null) : null,
            });
        }
        if (chunk.length < 100) break;
    }
    return events;
}

const CONTRIBUTIONS_QUERY = `
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

/** Full-year contribution data. GraphQL always requires a token. Returned as GitHub sent it. */
async function fetchContributions(login: string, year: number, token: string) {
    const now = new Date();
    const end = year === now.getUTCFullYear() ? now : new Date(Date.UTC(year, 11, 31, 23, 59, 59));
    const data = await ghGraphql<Json>(
        CONTRIBUTIONS_QUERY,
        { login, from: `${year}-01-01T00:00:00Z`, to: end.toISOString() },
        token,
    );
    const collection = data?.user?.contributionsCollection as RawContributions | undefined;
    if (!collection) throw new Error("no contribution data returned");
    return { viewerLogin: (data?.viewer?.login ?? null) as string | null, collection };
}

async function fetchCounts(
    login: string,
    year: number,
    token: string | undefined,
    hasContributions: boolean,
    notes: string[],
): Promise<RawCounts> {
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    // With a contribution calendar, PR / issue / review totals come from it: skip those searches.
    const skip = hasContributions ? Promise.resolve(null) : null;

    const [prs, prsMerged, issues, reviews, commitSearch] = await Promise.all([
        skip ??
            safe<number | null>(
                () => searchIssues(`author:${login} type:pr created:${from}..${to}`, token),
                0,
                notes,
                "PR count",
            ),
        safe(
            () => searchIssues(`author:${login} type:pr is:merged created:${from}..${to}`, token),
            0,
            notes,
            "Merged PR count",
        ),
        skip ??
            safe<number | null>(
                () => searchIssues(`author:${login} type:issue created:${from}..${to}`, token),
                0,
                notes,
                "Issue count",
            ),
        skip ??
            safe<number | null>(
                () => searchIssues(`reviewed-by:${login} type:pr updated:${from}..${to}`, token),
                0,
                notes,
                "Review count",
            ),
        safe(
            () =>
                totalCount(
                    `/search/commits?q=${encodeURIComponent(`author:${login} author-date:${from}..${to}`)}&per_page=1`,
                    token,
                ),
            0,
            notes,
            "Commit search",
        ),
    ]);

    return { prs, prsMerged, issues, reviews, commitSearch };
}

/** Fetch everything the rewind needs. No aggregation: feed the result to `computeRewind`. */
export async function fetchRewindRaw(
    username: string,
    year: number,
    token?: string,
): Promise<RawRewind> {
    const notes: string[] = [];

    const user = pickUser(await ghREST<Json>(`/users/${username}`, token));
    const login = user.login;

    const contributions = token
        ? await safe(
              () => fetchContributions(login, year, token),
              null,
              notes,
              "Contribution calendar",
          )
        : null;
    const isSelf = Boolean(
        contributions?.viewerLogin &&
        contributions.viewerLogin.toLowerCase() === login.toLowerCase(),
    );

    const [repos, events] = await Promise.all([
        fetchRepos(login, token, isSelf),
        safe(() => fetchEvents(login, token), [] as RawEvent[], notes, "Recent event feed"),
    ]);

    const [languages, counts] = await Promise.all([
        fetchLanguages(repos, token, notes),
        fetchCounts(login, year, token, Boolean(contributions), notes),
    ]);

    return {
        year,
        generatedAt: new Date().toISOString(),
        authenticated: Boolean(token),
        isSelf,
        user,
        repos,
        languages,
        events,
        counts,
        contributions: contributions?.collection ?? null,
        notes,
    };
}

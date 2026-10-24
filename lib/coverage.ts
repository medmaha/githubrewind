import type { RewindData } from "./rewind-types";

/**
 * "How far can I trust each number?" Pure function over `RewindData`: no network, no AI.
 * It states where every figure came from, so the UI can show it next to the numbers.
 */

export type CoverageLevel = "verified" | "approximate" | "partial" | "estimated" | "unavailable";

export const COVERAGE_LEVELS: Record<CoverageLevel, { label: string; meaning: string }> = {
    verified: {
        label: "Verified",
        meaning: "Read straight from GitHub's contribution calendar or repository list.",
    },
    approximate: {
        label: "Approximate",
        meaning: "From GitHub search or all-time data. Can differ slightly from your profile.",
    },
    partial: {
        label: "Partial",
        meaning: "Covers only part of the year, or only a sample of your repositories.",
    },
    estimated: {
        label: "Estimated",
        meaning: "A rough calculation, not a count.",
    },
    unavailable: {
        label: "Unavailable",
        meaning: "Could not be computed with the data we have.",
    },
};

export type CoverageItem = {
    id: string;
    label: string;
    level: CoverageLevel;
    source: string;
    note: string;
};

export type Coverage = {
    /** Distinguishes full calendar years from a current-year calendar through today. */
    mode: "full" | "year-to-date" | "limited";
    headline: string;
    items: CoverageItem[];
    counts: Record<CoverageLevel, number>;
};

/** The repository list reads at most 3 pages of 100. */
export const REPO_LIST_CAP = 300;
/** Language bytes are read for at most this many repositories. */
export const LANGUAGE_REPO_SAMPLE = 20;

export function buildCoverage(data: RewindData): Coverage {
    const cal = data.calendar;
    const hasCal = Boolean(cal);
    const yearToDate = data.year === new Date().getUTCFullYear();
    const t = data.totals;
    const authed = data.scope === "authenticated";

    // `ownedRepos` = non-fork repositories. Older saved rewinds don't have it: fall back to all repos.
    const ownedRepos = t.ownedRepos ?? t.repos;
    const sampled = ownedRepos > LANGUAGE_REPO_SAMPLE;
    const langFailed = data.notes.some((n) => n.startsWith("Language details unavailable"));
    const repoCapped = t.repos >= REPO_LIST_CAP;

    const items: CoverageItem[] = [];
    const add = (item: CoverageItem) => items.push(item);

    // Activity: active days, streaks, monthly bars, story chapters ---------------------------
    add(
        hasCal
            ? {
                  id: "activity",
                  label: "Active days, streaks, monthly activity",
                  level: "verified",
                  source: "GitHub contribution calendar",
                  note: `${yearToDate ? "Year to date through today." : "Full calendar year."} ${
                      cal!.restrictedContributions > 0
                          ? `Includes ${cal!.restrictedContributions} private contributions you chose to show on your profile.`
                          : "Private contributions appear only if you enabled them on your profile."
                  }`,
              }
            : {
                  id: "activity",
                  label: "Active days, streaks, monthly activity",
                  level: "partial",
                  source: "Public events feed",
                  note: "Only roughly the last 90 days (at most 300 events). Add a token for the full year.",
              },
    );

    add(
        hasCal
            ? {
                  id: "commits",
                  label: "Commits",
                  level: "verified",
                  source: "Contribution calendar and commit search (the higher of the two)",
                  note: "Counted the way GitHub counts them for your profile.",
              }
            : {
                  id: "commits",
                  label: "Commits",
                  level: "partial",
                  source: "Commit search and recent push events (the higher of the two)",
                  note: "Push events cover only ~90 days, so this may undercount.",
              },
    );

    add(
        hasCal
            ? {
                  id: "collab",
                  label: "Pull requests, issues, reviews",
                  level: "verified",
                  source: "GitHub contribution calendar",
                  note: "Same totals as your profile's contribution breakdown.",
              }
            : {
                  id: "collab",
                  label: "Pull requests, issues, reviews",
                  level: "approximate",
                  source: "GitHub search",
                  note: "Reviews are PRs you reviewed that were updated this year, so they can differ from your profile.",
              },
    );

    add({
        id: "merged",
        label: "Pull requests merged",
        level: "approximate",
        source: "GitHub search",
        note: "Merged PRs you opened this year. Search results can lag slightly behind GitHub.",
    });

    // Repositories ---------------------------------------------------------------------------
    add({
        id: "repos",
        label: "Repositories, stars, forks",
        level: repoCapped ? "partial" : "verified",
        source: authed ? "Your repository list (private included)" : "Public repository list",
        note: repoCapped
            ? `Only the ${REPO_LIST_CAP} most recently updated repositories are read, so older ones may be missing.`
            : authed
              ? "Includes private repositories because the token belongs to this account."
              : "Public repositories only. A token for this account adds private ones.",
    });

    add({
        id: "languages",
        label: "Languages",
        level: sampled || langFailed ? "partial" : "approximate",
        source: `Language bytes from up to ${LANGUAGE_REPO_SAMPLE} most-starred non-fork repositories`,
        note: `${sampled ? `A sample: ${LANGUAGE_REPO_SAMPLE} of ${ownedRepos} repositories. ` : ""}${langFailed ? "Some repositories could not be read. " : ""}All-time bytes, not only this year.`,
    });

    add({
        id: "loc",
        label: "Lines of code",
        level: "estimated",
        source: "Language bytes ÷ 55 bytes per line",
        note: "A rough size of the repositories we read, not lines changed in the selected year.",
    });

    // Year over year ---------------------------------------------------------------------------
    const cmp = data.comparison;
    const ytd = data.year === new Date().getUTCFullYear();
    add(
        hasCal && cmp
            ? {
                  id: "comparison",
                  label: "Year over year",
                  level: "verified",
                  source: `Contribution calendar for ${cmp.year} and ${data.year}`,
                  note: ytd
                      ? `Year to date, against the same dates in ${cmp.year}, so a partial year is never compared with a full one.`
                      : `Full calendar years ${cmp.year} and ${data.year}.`,
              }
            : {
                  id: "comparison",
                  label: "Year over year",
                  level: "unavailable",
                  source: hasCal
                      ? "Previous-year calendar could not be loaded"
                      : "Needs the contribution calendar",
                  note: hasCal
                      ? "Run the rewind again to retry the comparison."
                      : "Add a GitHub token to unlock the comparison.",
              },
    );

    add(
        hasCal
            ? {
                  id: "story",
                  label: "Story chapters and fingerprint",
                  level: "verified",
                  source: "Computed from the contribution calendar",
                  note: "Describes patterns in the numbers. It does not explain why they happened.",
              }
            : {
                  id: "story",
                  label: "Story chapters and fingerprint",
                  level: "unavailable",
                  source: "Needs the contribution calendar",
                  note: "Add a GitHub token to unlock the weekly story and the calendar-based fingerprint.",
              },
    );

    const counts: Record<CoverageLevel, number> = {
        verified: 0,
        approximate: 0,
        partial: 0,
        estimated: 0,
        unavailable: 0,
    };
    for (const i of items) counts[i.level]++;

    return {
        mode: hasCal ? (yearToDate ? "year-to-date" : "full") : "limited",
        headline: hasCal
            ? yearToDate
                ? "Year-to-date calendar"
                : "Full-year calendar"
            : "Limited: about the last 90 days",
        items,
        counts,
    };
}

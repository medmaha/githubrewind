import { buildChapters } from "./chapters";
import { buildFingerprint } from "./fingerprint";
import type { RewindData } from "./rewind-types";

export type InsightFact = { id: string; text: string };

const MAX_FACTS = 40;
const MAX_LENGTH = 300;
const nf = (value: number) => value.toLocaleString("en-US");
const activeDays = (days: { count: number }[]) => days.filter((day) => day.count > 0).length;

export function buildInsightFacts(data: RewindData): InsightFact[] {
    const texts: string[] = [];
    const add = (value: string) => {
        const text = value.replace(/\s+/g, " ").trim();
        if (text) texts.push(text.slice(0, MAX_LENGTH));
    };

    const { totals } = data;
    const year = data.year;

    if (!data.calendar) {
        add(
            "Only roughly the last 90 days of public activity were available, so this year's activity totals understate the year.",
        );
    }

    add(
        `${nf(totals.commitsThisYear)} commits, ${nf(totals.prs)} pull requests (${nf(totals.prsMerged)} merged), ${nf(totals.reviews)} reviews and ${nf(totals.issues)} issues in ${year}.`,
    );
    add(
        `Active on ${nf(totals.activeDays)} days in ${year}, with a longest streak of ${nf(totals.longestStreak)} days.`,
    );
    add(
        `${nf(totals.repos)} repositories in total, ${nf(totals.reposCreatedThisYear)} created in ${year}; ${nf(totals.stars)} stars across owned repositories; ${nf(data.profile.followers)} followers.`,
    );

    const languages = data.languages.slice(0, 5);
    if (languages.length) {
        add(
            `Languages by share of code (all-time, across up to 20 repositories): ${languages.map((language) => `${language.name} ${language.percent}%`).join(", ")}.`,
        );
    }

    const publicRepos = data.topRepos.filter((repo) => !repo.isPrivate).slice(0, 4);
    if (publicRepos.length) {
        add(
            `Most-starred public repositories: ${publicRepos.map((repo) => `${repo.name} (${nf(repo.stars)} stars)`).join(", ")}.`,
        );
    }
    const topics = Array.from(new Set(publicRepos.flatMap((repo) => repo.topics))).slice(0, 8);
    if (topics.length) add(`Topics on those public repositories: ${topics.join(", ")}.`);

    for (const chapter of buildChapters(data)) {
        add(`${chapter.title}: ${chapter.headline}${chapter.detail ? ` ${chapter.detail}` : ""}`);
    }

    const fingerprint = buildFingerprint(data);
    if (fingerprint) {
        for (const trait of fingerprint.traits) {
            add(`Pattern, ${trait.label}: ${trait.evidence}.`);
        }
    }

    if (data.comparison && data.calendar) {
        const previous = data.comparison.calendar;
        const current = data.calendar;
        const yearToDate = year === new Date().getUTCFullYear();
        const comparisons: [string, number, number][] = [
            ["Contributions", previous.totalContributions, current.totalContributions],
            ["Commits", previous.breakdown.commits, current.breakdown.commits],
            ["Pull requests", previous.breakdown.prs, current.breakdown.prs],
            ["Reviews", previous.breakdown.reviews, current.breakdown.reviews],
            ["Issues", previous.breakdown.issues, current.breakdown.issues],
            ["Active days", activeDays(previous.days), activeDays(current.days)],
        ];

        for (const [label, before, now] of comparisons) {
            const delta = now - before;
            const percentage =
                before >= 10
                    ? ` (${delta > 0 ? "+" : ""}${Math.round((delta / before) * 100)}%)`
                    : "";
            add(
                `${label}: ${nf(now)} in ${year} vs ${nf(before)} in ${data.comparison.year}${percentage}${yearToDate ? ", year to date over the same dates" : ""}.`,
            );
        }
    }

    for (const achievement of data.achievements.slice(0, 4)) {
        add(`Badge earned, ${achievement.title}: ${achievement.description}.`);
    }

    return texts.slice(0, MAX_FACTS).map((text, index) => ({ id: `f${index + 1}`, text }));
}

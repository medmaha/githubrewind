import { mondayIndex, toWeeks } from "./rewind-utils";
import type { RewindData } from "./rewind-types";

/**
 * "Developer fingerprint": rule-based, never AI. Every trait states the rule it passed and the
 * numbers that passed it, so it reads as earned, not as an opaque label.
 */

export type FingerprintAxis = {
    id: "consistency" | "weekend" | "bursts" | "collaboration" | "focus";
    label: string;
    /** 0-100 */
    value: number;
    /** The numbers behind the value, in words. */
    display: string;
    /** How the value is defined. */
    rule: string;
};

export type FingerprintTrait = {
    id: string;
    label: string;
    /** The numbers that earned it. */
    evidence: string;
    /** The threshold it had to pass. */
    rule: string;
    /** value / threshold, used only to rank traits. */
    strength: number;
};

export type Fingerprint = {
    /** `calendar`: full-year calendar available. `totals`: only totals-based traits possible. */
    basis: "calendar" | "totals";
    title: string;
    traits: FingerprintTrait[];
    /** null when there is no calendar to measure. */
    axes: FingerprintAxis[] | null;
};

const pct = (x: number) => Math.round(x * 100);
const nf = (n: number) => n.toLocaleString("en-US");
const MAX_TRAITS = 3;
/** Below this the numbers are too thin to call anything a pattern. */
const MIN_CONTRIBUTIONS = 20;
const MIN_ACTIVE_DAYS = 5;

export function buildFingerprint(data: RewindData): Fingerprint | null {
    const t = data.totals;
    const cal = data.calendar;
    const candidates: FingerprintTrait[] = [];
    const add = (trait: FingerprintTrait) => {
        // Strength only ranks traits that already passed their rule; cap it so one extreme
        // number (a 365-day streak, zero weekend activity) can't crowd out everything else.
        if (trait.strength >= 1)
            candidates.push({ ...trait, strength: Math.min(trait.strength, 3) });
    };

    let axes: FingerprintAxis[] | null = null;

    if (cal) {
        const total = cal.days.reduce((a, d) => a + d.count, 0);
        const activeDays = cal.days.reduce((a, d) => a + (d.count > 0 ? 1 : 0), 0);
        if (total < MIN_CONTRIBUTIONS || activeDays < MIN_ACTIVE_DAYS) return null;

        const weeks = toWeeks(cal.days);
        const activeWeeks = weeks.filter((w) => w.total > 0).length;
        const consistency = activeWeeks / weeks.length;

        const weekendTotal = cal.days.reduce(
            (a, d) => a + (mondayIndex(d.date) >= 5 ? d.count : 0),
            0,
        );
        const weekend = weekendTotal / total;

        const k = Math.max(1, Math.ceil(weeks.length * 0.1));
        const topWeeks = [...weeks].sort((a, b) => b.total - a.total).slice(0, k);
        const bursts = topWeeks.reduce((a, w) => a + w.total, 0) / total;

        const b = cal.breakdown;
        const teamwork = b.prs + b.reviews + b.issues;
        const everything = b.commits + teamwork;
        const collaboration = everything > 0 ? teamwork / everything : 0;

        const topRepo = cal.repoCommits[0];
        const focus = topRepo && b.commits > 0 ? Math.min(1, topRepo.commits / b.commits) : 0;

        axes = [
            {
                id: "consistency",
                label: "Consistency",
                value: pct(consistency),
                display: `Active in ${activeWeeks} of ${weeks.length} weeks`,
                rule: "Share of weeks (Monday to Sunday) with at least one contribution.",
            },
            {
                id: "weekend",
                label: "Weekends",
                value: pct(weekend),
                display: `${pct(weekend)}% of contributions on Saturday or Sunday`,
                rule: "Share of contributions made on a weekend. An even spread would be 29%.",
            },
            {
                id: "bursts",
                label: "Bursts",
                value: pct(bursts),
                display: `Your busiest ${k} week${k === 1 ? "" : "s"} hold ${pct(bursts)}% of the year`,
                rule: "Share of the year's contributions in the busiest 10% of weeks. An even year would be about 10%.",
            },
            {
                id: "collaboration",
                label: "Collaboration",
                value: pct(collaboration),
                display: `${nf(teamwork)} of ${nf(everything)} are PRs, reviews or issues`,
                rule: "Share of commits, PRs, reviews and issues that are PRs, reviews or issues.",
            },
            {
                id: "focus",
                label: "Focus",
                value: pct(focus),
                display:
                    focus > 0
                        ? `${pct(focus)}% of commits went to one repository`
                        : "No commit data for a top repository",
                rule: "Share of the year's commits that went to your most-committed repository.",
            },
        ];

        add({
            id: "steady",
            label: "Steady contributor",
            evidence: `Active in ${activeWeeks} of ${weeks.length} weeks`,
            rule: "Active in at least 75% of weeks.",
            strength: consistency / 0.75,
        });
        add({
            id: "sprinter",
            label: "Sprint builder",
            evidence: `Your busiest ${k} week${k === 1 ? "" : "s"} hold ${pct(bursts)}% of the year`,
            rule: "The busiest 10% of weeks hold at least half of the year's contributions.",
            strength: bursts / 0.5,
        });
        add({
            id: "weekend",
            label: "Weekend builder",
            evidence: `${pct(weekend)}% of contributions on a Saturday or Sunday`,
            rule: "At least 40% of contributions on weekends (an even spread is 29%).",
            strength: weekend / 0.4,
        });
        add({
            id: "weekday",
            label: "Weekday regular",
            evidence:
                pct(weekend) === 0
                    ? "No contributions on weekends"
                    : `Only ${pct(weekend)}% of contributions on weekends`,
            rule: "At most 10% of contributions on weekends.",
            strength: 0.1 / Math.max(weekend, 0.033),
        });
        if (teamwork >= 20)
            add({
                id: "collaborator",
                label: "Collaborator",
                evidence: `${nf(teamwork)} PRs, reviews and issues (${pct(collaboration)}% of activity)`,
                rule: "PRs, reviews and issues make up at least 30% of activity (minimum 20).",
                strength: collaboration / 0.3,
            });
        if (b.commits >= 50)
            add({
                id: "solo",
                label: "Solo committer",
                evidence: `${nf(b.commits)} commits, only ${pct(collaboration)}% of activity is PRs, reviews or issues`,
                rule: "At most 10% of activity is PRs, reviews or issues (minimum 50 commits).",
                strength: 0.1 / Math.max(collaboration, 0.033),
            });
        if (topRepo && b.commits >= 20)
            add({
                id: "focused",
                label: "One-project focus",
                evidence: `${topRepo.isPrivate ? "A private repository" : topRepo.fullName} took ${pct(focus)}% of commits`,
                rule: "One repository holds at least 60% of commits (minimum 20 commits).",
                strength: focus / 0.6,
            });
        add({
            id: "streak",
            label: "Streak keeper",
            evidence: `${t.longestStreak}-day streak`,
            rule: "A streak of at least 30 days.",
            strength: t.longestStreak / 30,
        });
    }

    // Totals-based traits work with or without a calendar.
    add({
        id: "explorer",
        label: "Explorer",
        evidence: `${t.reposCreatedThisYear} new repositories in ${data.year}`,
        rule: "Created at least 5 repositories this year.",
        strength: t.reposCreatedThisYear / 5,
    });
    if (t.reviews >= 20 && t.reviews >= t.prs)
        add({
            id: "reviewer",
            label: "Reviewer",
            evidence: `${nf(t.reviews)} reviews vs ${nf(t.prs)} PRs opened`,
            rule: "At least 20 reviews, and more reviews than PRs opened.",
            strength: t.reviews / 20,
        });
    if (t.prs >= 10)
        add({
            id: "finisher",
            label: "Finisher",
            evidence: `${nf(Math.min(t.prsMerged, t.prs))} of ${nf(t.prs)} PRs merged`,
            rule: "At least 70% of your PRs merged (minimum 10 PRs).",
            strength: Math.min(t.prsMerged / t.prs, 1) / 0.7,
        });
    const bigLanguages = data.languages.filter((l) => l.percent >= 5).length;
    add({
        id: "polyglot",
        label: "Polyglot",
        evidence: `${bigLanguages} languages each above 5% of your code`,
        rule: "At least 5 languages each making up 5% or more of your code.",
        strength: bigLanguages / 5,
    });

    const traits = candidates.sort((a, b) => b.strength - a.strength).slice(0, MAX_TRAITS);

    if (traits.length === 0) {
        if (!axes) return null; // nothing to show without a calendar
        traits.push({
            id: "all-rounder",
            label: "All-rounder",
            evidence: "No single pattern stands out",
            rule: "Shown when no other trait's threshold is met.",
            strength: 1,
        });
    }

    return {
        basis: cal ? "calendar" : "totals",
        title: traits
            .slice(0, 2)
            .map((x) => x.label)
            .join(" · "),
        traits,
        axes,
    };
}

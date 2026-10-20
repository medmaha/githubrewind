import type { AiInsights, RewindData } from "./rewind-types";

export type Platform = "linkedin" | "twitter" | "facebook" | "instagram";

export const PLATFORMS: Record<
    Platform,
    { label: string; limit: number; note: string; brand: string }
> = {
    linkedin: {
        label: "LinkedIn",
        limit: 3000,
        note: "Post limit 3,000 characters",
        brand: "oklch(0.62 0.13 245)",
    },
    twitter: {
        label: "X / Twitter",
        limit: 280,
        note: "Tweet limit 280 characters",
        brand: "oklch(0.85 0.01 250)",
    },
    facebook: {
        label: "Facebook",
        limit: 2000,
        note: "Readable limit ~2,000 characters",
        brand: "oklch(0.6 0.17 265)",
    },
    instagram: {
        label: "Instagram",
        limit: 2200,
        note: "Caption limit 2,200 characters",
        brand: "oklch(0.68 0.19 10)",
    },
};

const nf = (n: number) => n.toLocaleString("en-US");

export function buildShareText(
    data: RewindData,
    insights: AiInsights | null,
    platform: Platform,
): string {
    const t = data.totals;
    const name = data.profile.name ?? data.profile.login;
    const langs = data.languages.slice(0, 3).map((l) => l.name);
    const tags = [
        "GitHubRewind",
        "BuildInPublic",
        ...langs.map((l) => l.replace(/[^A-Za-z0-9]/g, "")),
    ]
        .slice(0, 5)
        .map((t2) => `#${t2}`)
        .join(" ");

    if (platform === "twitter") {
        const short = `My ${data.year} GitHub Rewind 🚀\n${nf(t.commitsThisYear)} commits · ${nf(t.prsMerged)} PRs merged · ${nf(t.repos)} repos · ${nf(t.stars)} stars\nTop: ${langs.join(", ") || "code"}\n#GitHubRewind`;
        return clamp(short, PLATFORMS.twitter.limit);
    }

    const body = [
        `${name}'s ${data.year} GitHub Rewind ${insights?.personaTitle ? `- ${insights.personaTitle}` : ""}`.trim(),
        "",
        insights?.yearlyOverview ?? insights?.headline ?? "",
        "",
        "📊 By the numbers",
        `• ${nf(t.commitsThisYear)} commits`,
        `• ${nf(t.prs)} pull requests (${nf(t.prsMerged)} merged)`,
        `• ${nf(t.issues)} issues · ${nf(t.reviews)} reviews`,
        `• ${nf(t.repos)} repositories · ${nf(t.stars)} stars earned`,
        `• ~${nf(t.estimatedLinesOfCode)} lines of code (estimated)`,
        `• Top languages: ${langs.join(", ") || "-"}`,
        "",
        insights?.significantAchievements?.length
            ? `🏆 Highlights\n${insights.significantAchievements
                .slice(0, 3)
                .map((a) => `• ${a}`)
                .join("\n")}`
            : "",
        "",
        insights?.shareCaption ?? "",
        "",
        tags,
    ]
        .filter((line) => line !== undefined)
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    return clamp(body, PLATFORMS[platform].limit);
}

export function clamp(text: string, limit: number) {
    return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}

export function shareUrl(platform: Platform, text: string, url: string): string | null {
    const t = encodeURIComponent(text);
    const u = encodeURIComponent(url);
    switch (platform) {
        case "twitter":
            return `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
        case "linkedin":
            return `https://www.linkedin.com/feed/?shareActive=true&text=${t}`;
        case "facebook":
            return `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`;
        case "instagram":
            return null; // Instagram has no web share intent - copy caption + download the card.
    }
}

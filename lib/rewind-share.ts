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
    insights: AiInsights,
    platform: Platform,
): string {
    const t = data.totals;
    const name = data.profile.name ?? data.profile.login;
    const langs = data.languages.slice(0, 3).map((l) => l.name);

    if (platform === "twitter") {
        const details = [
            `${data.year} · ${nf(t.commitsThisYear)} commits · ${nf(t.prsMerged)} PRs merged · ${nf(t.repos)} repos · ${nf(t.stars)} stars`,
            langs.length ? `Top languages: ${langs.join(", ")}` : "",
        ]
            .filter(Boolean)
            .join("\n");
        const captionLength = Math.max(
            0,
            PLATFORMS.twitter.limit - details.length - (insights.shareCaption ? 1 : 0),
        );
        const caption = clamp(insights.shareCaption, captionLength);
        return [details, caption].filter(Boolean).join("\n");
    }

    const body = [
        `${name}'s ${data.year} GitHub Rewind - ${insights.personaTitle}`,
        "",
        insights.yearlyOverview,
        "",
        "📊 By the numbers",
        `• ${nf(t.commitsThisYear)} commits`,
        `• ${nf(t.prs)} pull requests (${nf(t.prsMerged)} merged)`,
        `• ${nf(t.issues)} issues · ${nf(t.reviews)} reviews`,
        `• ${nf(t.repos)} repositories · ${nf(t.stars)} stars earned`,
        `• ~${nf(t.estimatedLinesOfCode)} lines of code (estimated)`,
        ...(langs.length ? [`• Top languages: ${langs.join(", ")}`] : []),
        "",
        insights.significantAchievements.length
            ? `🏆 Highlights\n${insights.significantAchievements.slice(0, 3).map((a) => `• ${a}`).join("\n")}`
            : "",
        "",
        insights.shareCaption,
        "",
    ]
        .filter(Boolean)
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

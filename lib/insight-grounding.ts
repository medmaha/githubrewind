import type { InsightFact } from "./insight-facts";
import type { AiInsights } from "./rewind-types";

export const INSIGHT_SYSTEM_PROMPT = `You write a developer's year-in-review using ONLY the numbered facts supplied by the user.

Voice: a perceptive friend who read the year carefully. Specific, a little wry, warm but never gushing. Short sentences. Say what happened, not what it proves about someone's character. Avoid stock praise and phrases such as "journey", "testament", "passionate", "dedicated", "impressive", "showcase", "leverage", "robust", and "game-changer". No exclamation marks.

Rules:
1. Every claim must be supported by the facts. Never invent numbers, repositories, employers, feelings, or events. Never explain why something happened.
2. Use numbers exactly as written. Do not round, add, or calculate numbers.
3. Prefer distinctive details (a standout day, a comeback, a year-over-year change, or a measured pattern) over repeating the biggest totals.
4. If a fact says the data is limited, mention that once in "caveat" and do not treat missing activity as low effort.
5. Every significant achievement and growth observation must cite one or more supplied fact IDs.
6. Growth observations must be specific, supported by the data, and phrased as something worth noticing—not generic advice. Return fewer than two if the facts do not support them.

Return STRICT JSON only, with this shape:
{
  "personaTitle": string (max 40 characters, a concise description of the developer's supported activity pattern; never use their username or real name),
  "headline": string (max 90 characters, based on one distinctive fact),
  "yearlyOverview": string (3-4 short sentences),
  "significantAchievements": [{ "text": string (max 130 characters), "facts": ["f3", "f7"] }] (up to 5 items),
  "areasOfGrowth": [{ "text": string (max 130 characters), "facts": ["f2"] }] (0-4 items),
  "codingStyle": string (2-3 sentences about patterns and languages in the facts),
  "shareCaption": string (max 260 characters, first person, at most 2 emojis, suitable for LinkedIn),
  "caveat": string or null (one sentence about what these numbers cannot tell)
}`;

export function buildInsightPrompt(login: string, year: number, facts: InsightFact[]): string {
    return `Developer: ${login}\nYear: ${year}\n\nFacts:\n${facts.map((fact) => `${fact.id}: ${fact.text}`).join("\n")}`;
}

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;
const normalizeNumber = (value: string) => value.replace(/,/g, "").replace(/\.$/, "");

function numbersIn(text: string): string[] {
    return (text.match(NUMBER) ?? []).map(normalizeNumber);
}

function allowedNumbers(facts: InsightFact[], year: number): Set<string> {
    const allowed = new Set<string>([String(year), String(year - 1)]);
    for (const fact of facts) {
        for (const number of numbersIn(fact.text)) {
            allowed.add(number);
            if (number.includes(".")) allowed.add(number.split(".")[0]!);
        }
    }
    return allowed;
}

function isGrounded(text: string, allowed: Set<string>): boolean {
    return numbersIn(text).every((number) => /^\d$/.test(number) || allowed.has(number));
}

function sentencesOf(text: string): string[] {
    return (text.match(/(?:[^.!?]|\.(?=\d))+(?:[.!?]+|$)\s*/g) ?? [])
        .map((sentence) => sentence.trim())
        .filter(Boolean);
}

function keepGroundedSentences(text: string, allowed: Set<string>): string {
    return sentencesOf(text)
        .filter((sentence) => isGrounded(sentence, allowed))
        .join(" ");
}

function asString(value: unknown, max: number): string {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function extractJson(raw: string): unknown {
    const text = raw.trim();
    try {
        return JSON.parse(text);
    } catch {
        let start = -1;
        let depth = 0;
        let inString = false;
        let escaped = false;

        for (let index = 0; index < text.length; index++) {
            const character = text[index];
            if (start < 0) {
                if (character === "{") {
                    start = index;
                    depth = 1;
                }
                continue;
            }

            if (inString) {
                if (escaped) escaped = false;
                else if (character === "\\") escaped = true;
                else if (character === '"') inString = false;
                continue;
            }

            if (character === '"') inString = true;
            else if (character === "{") depth++;
            else if (character === "}" && --depth === 0) {
                try {
                    return JSON.parse(text.slice(start, index + 1));
                } catch {
                    break;
                }
            }
        }
    }
    throw new Error("AI returned an invalid JSON response.");
}

export function parseInsights(
    raw: string,
    facts: InsightFact[],
    year: number,
    login: string,
): AiInsights {
    const parsed = extractJson(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("AI returned an unexpected response.");
    }

    const output = parsed as Record<string, unknown>;
    const allowed = allowedNumbers(facts, year);
    const rawPersona = asString(output.personaTitle, 40);
    const normalizedLogin = login.trim().toLowerCase();
    const personaFact = facts.find((fact) => fact.text.startsWith("Pattern, "));
    const factPersona = personaFact?.text.match(/^Pattern, ([^:]+):/)?.[1];
    const personaTitle =
        rawPersona &&
        rawPersona.toLowerCase() !== normalizedLogin &&
        isGrounded(rawPersona, allowed)
            ? rawPersona
            : (factPersona ?? "A year of patterns").slice(0, 40);
    const factById = new Map(facts.map((fact) => [fact.id, fact.text]));

    const parseItems = (value: unknown, max: number) => {
        const texts: string[] = [];
        const evidence: string[][] = [];
        if (!Array.isArray(value)) return { texts, evidence };

        for (const entry of value) {
            if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
            const item = entry as { text?: unknown; facts?: unknown };
            const text = asString(item.text, 130);
            const factIds = Array.isArray(item.facts)
                ? [
                      ...new Set(item.facts.filter((id): id is string => typeof id === "string")),
                  ].filter((id) => factById.has(id))
                : [];
            if (!text || !factIds.length || !isGrounded(text, allowed)) continue;
            texts.push(text);
            evidence.push(factIds.slice(0, 3).map((id) => factById.get(id)!));
            if (texts.length === max) break;
        }
        return { texts, evidence };
    };

    const achievements = parseItems(output.significantAchievements, 5);
    const growth = parseItems(output.areasOfGrowth, 4);
    const overview =
        keepGroundedSentences(asString(output.yearlyOverview, 900), allowed) ||
        facts
            .slice(0, 2)
            .map((fact) => fact.text)
            .join(" ");
    const rawHeadline = asString(output.headline, 90);
    const headline =
        rawHeadline && isGrounded(rawHeadline, allowed)
            ? rawHeadline
            : (sentencesOf(overview)[0]?.slice(0, 90) ?? `${year} on GitHub`);

    const codingStyle = keepGroundedSentences(asString(output.codingStyle, 700), allowed);
    const shareCaption =
        keepGroundedSentences(asString(output.shareCaption, 260), allowed).slice(0, 260) ||
        headline;
    const caveat = keepGroundedSentences(asString(output.caveat, 240), allowed);

    return {
        personaTitle,
        headline,
        yearlyOverview: overview,
        significantAchievements: achievements.texts,
        areasOfGrowth: growth.texts,
        codingStyle,
        shareCaption,
        achievementEvidence: achievements.evidence,
        growthEvidence: growth.evidence,
        ...(caveat ? { caveat } : {}),
    };
}

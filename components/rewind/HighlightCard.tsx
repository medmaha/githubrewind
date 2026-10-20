import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Panel, PanelHeader, GhButton, Chip } from "./primitives";
import type { AiInsights, RewindData } from "@/lib/rewind-types";

const W = 1200;
const H = 630;

const PALETTE = {
    bg: "#0d1117",
    bgAlt: "#161b22",
    border: "#30363d",
    text: "#e6edf3",
    muted: "#8b949e",
    accents: ["#2f81f7", "#3fb950", "#d29922", "#a371f7", "#db6d28"],
};

const nf = (n: number) => n.toLocaleString("en-US");

const accent = (i: number) => PALETTE.accents[i % PALETTE.accents.length] ?? "#2f81f7";

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > maxWidth && line) {
            lines.push(line);
            line = word;
            if (lines.length === maxLines) break;
        } else {
            line = next;
        }
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines && words.length) {
        const last = lines[maxLines - 1] ?? "";
        if (last && ctx.measureText(last).width > maxWidth - 10) {
            lines[maxLines - 1] = `${last.slice(0, Math.max(0, last.length - 2))}…`;
        }
    }
    return lines;
}

async function loadAvatar(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = `${url}${url.includes("?") ? "&" : "?"}s=200`;
    });
}

export function HighlightCard({
    data,
    insights,
}: {
    data: RewindData;
    insights: AiInsights | null;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [rendering, setRendering] = useState(true);

    const draw = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        setRendering(true);

        canvas.width = W;
        canvas.height = H;

        // Background
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, PALETTE.bg);
        bg.addColorStop(0.55, "#10161f");
        bg.addColorStop(1, "#0b1220");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Grid texture
        ctx.strokeStyle = "rgba(48,54,61,0.35)";
        ctx.lineWidth = 1;
        for (let x = 0; x <= W; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, H);
            ctx.stroke();
        }
        for (let y = 0; y <= H; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(W, y + 0.5);
            ctx.stroke();
        }

        // Glow
        const glow = ctx.createRadialGradient(W - 160, 90, 10, W - 160, 90, 480);
        glow.addColorStop(0, "rgba(47,129,247,0.30)");
        glow.addColorStop(1, "rgba(47,129,247,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        // Frame
        ctx.strokeStyle = PALETTE.border;
        ctx.lineWidth = 2;
        roundRect(ctx, 24, 24, W - 48, H - 48, 28);
        ctx.stroke();

        const padX = 64;
        let y = 96;

        // Avatar
        const avatar = await loadAvatar(data.profile.avatarUrl);
        if (avatar) {
            ctx.save();
            roundRect(ctx, padX, y - 30, 84, 84, 24);
            ctx.clip();
            ctx.drawImage(avatar, padX, y - 30, 84, 84);
            ctx.restore();
            ctx.strokeStyle = PALETTE.border;
            ctx.lineWidth = 2;
            roundRect(ctx, padX, y - 30, 84, 84, 24);
            ctx.stroke();
        }

        const textX = padX + (avatar ? 104 : 0);
        ctx.fillStyle = PALETTE.text;
        ctx.font = "700 40px ui-sans-serif, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText(data.profile.name ?? data.profile.login, textX, y + 6);
        ctx.fillStyle = PALETTE.muted;
        ctx.font = "400 22px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(`@${data.profile.login}`, textX, y + 40);

        // Year badge
        ctx.font = "800 76px ui-monospace, SFMono-Regular, Menlo, monospace";
        const yearText = String(data.year);
        const yearW = ctx.measureText(yearText).width;
        const yearGrad = ctx.createLinearGradient(W - padX - yearW, 40, W - padX, 120);
        yearGrad.addColorStop(0, "#2f81f7");
        yearGrad.addColorStop(1, "#3fb950");
        ctx.fillStyle = yearGrad;
        ctx.textAlign = "right";
        ctx.fillText(yearText, W - padX, y + 24);
        ctx.fillStyle = PALETTE.muted;
        ctx.font = "600 15px ui-sans-serif, -apple-system, Segoe UI, sans-serif";
        ctx.fillText("GITHUB REWIND", W - padX, y + 50);
        ctx.textAlign = "left";

        // Headline
        y += 108;
        ctx.fillStyle = PALETTE.text;
        ctx.font = "600 30px ui-sans-serif, -apple-system, Segoe UI, Roboto, sans-serif";
        const headline =
            insights?.headline ??
            `${nf(data.totals.commitsThisYear)} commits and a whole lot of shipping`;
        for (const line of wrap(ctx, headline, W - padX * 2, 2)) {
            ctx.fillText(line, padX, y);
            y += 40;
        }

        if (insights?.personaTitle) {
            ctx.fillStyle = "#2f81f7";
            ctx.font = "600 20px ui-monospace, SFMono-Regular, Menlo, monospace";
            ctx.fillText(insights.personaTitle, padX, y + 4);
            y += 20;
        }

        // Stat tiles
        const stats: [string, string][] = [
            ["COMMITS", nf(data.totals.commitsThisYear)],
            ["PRS MERGED", nf(data.totals.prsMerged)],
            ["ISSUES", nf(data.totals.issues)],
            ["REPOS", nf(data.totals.repos)],
            ["STARS", nf(data.totals.stars)],
            ["STREAK", `${data.totals.longestStreak}d`],
        ];
        const tileTop = 356;
        const gap = 18;
        const tileW = (W - padX * 2 - gap * 5) / 6;
        stats.forEach(([label, value], i) => {
            const x = padX + i * (tileW + gap);
            ctx.fillStyle = "rgba(22,27,34,0.92)";
            roundRect(ctx, x, tileTop, tileW, 108, 18);
            ctx.fill();
            ctx.strokeStyle = PALETTE.border;
            ctx.lineWidth = 1.5;
            roundRect(ctx, x, tileTop, tileW, 108, 18);
            ctx.stroke();

            ctx.fillStyle = accent(i);
            ctx.fillRect(x + 18, tileTop + 100, tileW - 36, 3);

            ctx.fillStyle = PALETTE.muted;
            ctx.font = "600 13px ui-sans-serif, -apple-system, Segoe UI, sans-serif";
            ctx.fillText(label, x + 18, tileTop + 32);
            ctx.fillStyle = PALETTE.text;
            ctx.font = "700 34px ui-monospace, SFMono-Regular, Menlo, monospace";
            ctx.fillText(value, x + 18, tileTop + 76);
        });

        // Language bar
        const barY = 508;
        ctx.fillStyle = PALETTE.muted;
        ctx.font = "600 14px ui-sans-serif, -apple-system, Segoe UI, sans-serif";
        ctx.fillText("TOP LANGUAGES", padX, barY - 14);

        const barW = W - padX * 2;
        let cursor = padX;
        ctx.save();
        roundRect(ctx, padX, barY, barW, 14, 7);
        ctx.clip();
        const langs = data.languages.slice(0, 5);
        const totalPct = langs.reduce((s, l) => s + l.percent, 0) || 1;
        langs.forEach((lang, i) => {
            const w = (lang.percent / totalPct) * barW;
            ctx.fillStyle = accent(i);
            ctx.fillRect(cursor, barY, w, 14);
            cursor += w;
        });
        if (!langs.length) {
            ctx.fillStyle = PALETTE.border;
            ctx.fillRect(padX, barY, barW, 14);
        }
        ctx.restore();

        let legendX = padX;
        langs.forEach((lang, i) => {
            ctx.fillStyle = accent(i);
            ctx.beginPath();
            ctx.arc(legendX + 5, barY + 40, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PALETTE.muted;
            ctx.font = "500 16px ui-sans-serif, -apple-system, Segoe UI, sans-serif";
            const label = `${lang.name} ${Math.round(lang.percent)}%`;
            ctx.fillText(label, legendX + 18, barY + 45);
            legendX += 18 + ctx.measureText(label).width + 26;
        });

        // Footer
        ctx.textAlign = "right";
        ctx.fillStyle = PALETTE.muted;
        ctx.font = "500 15px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(
            `~${nf(data.totals.estimatedLinesOfCode)} lines · ${data.totals.activeDays} active days`,
            W - padX,
            barY + 45,
        );
        ctx.textAlign = "left";

        setRendering(false);
    }, [data, insights]);

    useEffect(() => {
        void draw();
    }, [draw]);

    function download() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        try {
            const url = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = url;
            a.download = `github-rewind-${data.profile.login}-${data.year}.png`;
            a.click();
            toast.success("Highlight card downloaded");
        } catch {
            toast.error("Could not export the card image");
        }
    }

    return (
        <Panel>
            <PanelHeader
                icon={<ImageIcon className="size-4" />}
                title="Highlight card"
                hint="1200×630 - sized for LinkedIn, X and Facebook previews"
                action={
                    <GhButton size="sm" onClick={download} disabled={rendering}>
                        {rendering ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Download className="size-3.5" />
                        )}
                        PNG
                    </GhButton>
                }
            />
            <div className="overflow-hidden rounded-xl border border-border-strong bg-background">
                <canvas
                    ref={canvasRef}
                    className="block h-auto w-full"
                    role="img"
                    aria-label={`GitHub Rewind ${data.year} highlight card for ${data.profile.login}`}
                />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <Chip tone="primary">1200 × 630</Chip>
                <Chip>PNG export</Chip>
                {insights ? (
                    <Chip tone="success">AI headline</Chip>
                ) : (
                    <Chip>generate AI for headline</Chip>
                )}
            </div>
        </Panel>
    );
}

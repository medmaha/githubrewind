import { CalendarDays } from "lucide-react";

import { Chip, Panel, PanelHeader } from "./primitives";
import { buildFingerprint, type FingerprintAxis } from "@/lib/fingerprint";
import type { RewindData } from "@/lib/rewind-types";

const SIZE = { w: 440, h: 290, cx: 220, cy: 148, r: 96, labelR: 118 };

const point = (i: number, count: number, radius: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    return [SIZE.cx + Math.cos(angle) * radius, SIZE.cy + Math.sin(angle) * radius] as const;
};

/** Five measurable axes drawn as a polygon: the shape is yours alone. */
function Radar({ axes }: { axes: FingerprintAxis[] }) {
    const n = axes.length;
    const ring = (f: number) =>
        axes
            .map((_, i) =>
                point(i, n, SIZE.r * f)
                    .map((v) => v.toFixed(1))
                    .join(","),
            )
            .join(" ");
    const shape = axes
        .map((a, i) =>
            point(i, n, (SIZE.r * Math.max(a.value, 2)) / 100)
                .map((v) => v.toFixed(1))
                .join(","),
        )
        .join(" ");

    return (
        <svg
            viewBox={`0 0 ${SIZE.w} ${SIZE.h}`}
            className="mx-auto h-auto w-full max-w-[440px]"
            role="img"
            aria-label={`Fingerprint: ${axes.map((a) => `${a.label} ${a.value}%`).join(", ")}`}
        >
            {[0.25, 0.5, 0.75, 1].map((f) => (
                <polygon
                    key={f}
                    points={ring(f)}
                    fill="none"
                    style={{ stroke: "var(--border)" }}
                    strokeWidth={1}
                />
            ))}
            {axes.map((a, i) => {
                const [x, y] = point(i, n, SIZE.r);
                return (
                    <line
                        key={a.id}
                        x1={SIZE.cx}
                        y1={SIZE.cy}
                        x2={x}
                        y2={y}
                        style={{ stroke: "var(--border)" }}
                        strokeWidth={1}
                    />
                );
            })}
            <polygon
                points={shape}
                style={{
                    fill: "color-mix(in oklch, var(--primary) 28%, transparent)",
                    stroke: "var(--primary)",
                }}
                strokeWidth={2}
                strokeLinejoin="round"
            />
            {axes.map((a, i) => {
                const [x, y] = point(i, n, (SIZE.r * Math.max(a.value, 2)) / 100);
                return <circle key={a.id} cx={x} cy={y} r={3} style={{ fill: "var(--primary)" }} />;
            })}
            {axes.map((a, i) => {
                const [x, y] = point(i, n, SIZE.labelR);
                const anchor = x < SIZE.cx - 4 ? "end" : x > SIZE.cx + 4 ? "start" : "middle";
                return (
                    <text
                        key={a.id}
                        x={x}
                        y={y}
                        textAnchor={anchor}
                        dominantBaseline="middle"
                        fontSize={13}
                        style={{ fill: "var(--muted-foreground)" }}
                    >
                        {a.label} {a.value}%
                    </text>
                );
            })}
        </svg>
    );
}

export function FingerprintPanel({ data }: { data: RewindData }) {
    const fp = buildFingerprint(data);
    if (!fp) return null;

    return (
        <Panel>
            <PanelHeader
                icon={<CalendarDays className="size-4" />}
                title="Developer fingerprint"
                hint="Rule-based, not AI. Every label shows the rule it passed and the numbers behind it."
                action={<Chip tone="primary">{fp.title}</Chip>}
            />
            <div className="grid gap-6 lg:grid-cols-2">
                {fp.axes ? (
                    <div>
                        <Radar axes={fp.axes} />
                        <ul className="mt-3 space-y-2">
                            {fp.axes.map((a) => (
                                <li key={a.id} className="text-xs">
                                    <span className="font-medium text-foreground">
                                        {a.label}: {a.display}
                                    </span>
                                    <span className="block text-muted-foreground">{a.rule}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        The radar needs the full-year contribution calendar. Add a GitHub token to
                        unlock it. The traits on the right use only your totals.
                    </p>
                )}
                <ol className="space-y-3">
                    {fp.traits.map((t, i) => (
                        <li
                            key={t.id}
                            className="rounded-xl border border-border bg-(--elevated)/50 p-4"
                        >
                            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                Trait {i + 1}
                            </p>
                            <h3 className="mt-0.5 text-base font-semibold tracking-tight">
                                {t.label}
                            </h3>
                            <p className="mt-2 text-sm text-foreground">{t.evidence}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Rule: {t.rule}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </Panel>
    );
}

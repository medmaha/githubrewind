import {
    Activity,
    Code2,
    Flame,
    GitFork,
    GitMerge,
    GitPullRequest,
    CircleDot,
    Star,
    BookMarked,
    Eye,
    CalendarDays,
    Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Panel, PanelHeader, Chip } from "./primitives";
import type { RewindData } from "@/lib/rewind-types";

const nf = (n: number) => n.toLocaleString("en-US");

function Stat({
    icon: Icon,
    label,
    value,
    sub,
    accent,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    sub?: string;
    accent: string;
}) {
    return (
        <Panel className="p-4">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                </span>
                <Icon className="size-4" style={{ color: accent }} />
            </div>
            <div className="mt-2 font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
                {value}
            </div>
            {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
            <div
                className="absolute inset-x-0 bottom-0 h-px opacity-70"
                style={{
                    background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                }}
            />
        </Panel>
    );
}

export function StatsGrid({ data }: { data: RewindData }) {
    const t = data.totals;
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
                icon={Activity}
                label="Commits"
                value={nf(t.commitsThisYear)}
                sub={`in ${data.year}`}
                accent="var(--chart-2)"
            />
            <Stat
                icon={GitPullRequest}
                label="Pull requests"
                value={nf(t.prs)}
                sub={`${nf(t.prsMerged)} merged`}
                accent="var(--chart-1)"
            />
            <Stat
                icon={CircleDot}
                label="Issues"
                value={nf(t.issues)}
                sub={`${nf(t.reviews)} reviews`}
                accent="var(--chart-3)"
            />
            <Stat
                icon={BookMarked}
                label="Repositories"
                value={nf(t.repos)}
                sub={`${nf(t.reposCreatedThisYear)} created this year`}
                accent="var(--chart-4)"
            />
            <Stat
                icon={Star}
                label="Stars earned"
                value={nf(t.stars)}
                sub={`${nf(t.forks)} forks`}
                accent="var(--attention)"
            />
            <Stat
                icon={Code2}
                label="Lines of code"
                value={`~${nf(t.estimatedLinesOfCode)}`}
                sub="estimated from repo size"
                accent="var(--chart-5)"
            />
            <Stat
                icon={Flame}
                label="Longest streak"
                value={`${t.longestStreak}d`}
                sub={`${t.activeDays} active days tracked`}
                accent="var(--destructive)"
            />
            <Stat
                icon={Users}
                label="Followers"
                value={nf(data.profile.followers)}
                sub={`following ${nf(data.profile.following)}`}
                accent="var(--chart-1)"
            />
        </div>
    );
}

export function ProfileWidget({ data }: { data: RewindData }) {
    const joined = new Date(data.profile.createdAt).getUTCFullYear();
    return (
        <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <img
                src={data.profile.avatarUrl}
                alt={`${data.profile.login} avatar`}
                className="size-16 rounded-full border border-border sm:size-20"
                loading="lazy"
            />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold tracking-tight">
                        {data.profile.name ?? data.profile.login}
                    </h2>
                    <Chip tone="primary">@{data.profile.login}</Chip>
                    <Chip tone={data.scope === "authenticated" ? "success" : "default"}>
                        {data.scope === "authenticated" ? "private + public" : "public only"}
                    </Chip>
                </div>
                {data.profile.bio ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {data.profile.bio}
                    </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" /> Joined {joined}
                    </span>
                    {data.profile.location ? <span>{data.profile.location}</span> : null}
                    {data.profile.company ? <span>{data.profile.company}</span> : null}
                    <span className="inline-flex items-center gap-1">
                        <GitFork className="size-3.5" /> {nf(data.totals.forks)} forks
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Eye className="size-3.5" /> {nf(data.totals.privateRepos)} private repos
                    </span>
                </div>
            </div>
            <div className="shrink-0 text-right">
                <div className="font-mono text-4xl font-semibold text-primary sm:text-5xl">
                    {data.year}
                </div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Rewind
                </p>
            </div>
        </Panel>
    );
}

export function LanguagesWidget({ data }: { data: RewindData }) {
    const colors = [
        "var(--chart-1)",
        "var(--chart-2)",
        "var(--chart-3)",
        "var(--chart-4)",
        "var(--chart-5)",
    ];
    return (
        <Panel>
            <PanelHeader
                icon={<Code2 className="size-4" />}
                title="Language breakdown"
                hint="By bytes across top repositories"
            />
            {data.languages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No language data available.</p>
            ) : (
                <>
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-elevated">
                        {data.languages.map((lang, i) => (
                            <div
                                key={lang.name}
                                style={{
                                    width: `${lang.percent}%`,
                                    background: colors[i % colors.length],
                                }}
                                title={`${lang.name} ${lang.percent}%`}
                            />
                        ))}
                    </div>
                    <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {data.languages.slice(0, 8).map((lang, i) => (
                            <li
                                key={lang.name}
                                className="flex items-center justify-between gap-2 rounded-lg bg-(--elevated)/60 px-3 py-2"
                            >
                                <span className="flex min-w-0 items-center gap-2 text-sm">
                                    <span
                                        className="size-2.5 shrink-0 rounded-full"
                                        style={{ background: colors[i % colors.length] }}
                                    />
                                    <span className="truncate">{lang.name}</span>
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                    {lang.percent}%
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Panel>
    );
}

export function ActivityWidget({ data }: { data: RewindData }) {
    const max = Math.max(1, ...data.monthly.map((m) => m.commits));
    return (
        <Panel>
            <PanelHeader
                icon={<Activity className="size-4" />}
                title="Activity cadence"
                hint="Push activity from the public event stream (last ~90 days of events)"
            />
            <div className="flex h-40 items-end gap-1.5">
                {data.monthly.map((m) => (
                    <div
                        key={m.month}
                        className="group flex h-full flex-1 flex-col items-center gap-1.5"
                    >
                        <div className="relative flex w-full flex-1 items-end">
                            <div
                                className="w-full rounded-t-md bg-[linear-gradient(180deg,var(--chart-2),color-mix(in_oklch,var(--chart-1)_70%,transparent))] transition-all group-hover:brightness-125"
                                style={{ height: `${Math.max(3, (m.commits / max) * 100)}%` }}
                            />
                            <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                {m.commits}
                            </span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">
                            {m.month.slice(0, 1)}
                        </span>
                    </div>
                ))}
            </div>
        </Panel>
    );
}

export function ReposWidget({ data }: { data: RewindData }) {
    return (
        <Panel>
            <PanelHeader
                icon={<Star className="size-4" />}
                title="Top repositories"
                hint="Ranked by stars"
            />
            <ul className="space-y-2">
                {data.topRepos.slice(0, 3).map((repo) => (
                    <li key={repo.fullName}>
                        <a
                            href={repo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-start justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5 transition-colors hover:border-border-strong"
                        >
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-primary">
                                    {repo.name}
                                </span>
                                <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">
                                    {repo.description ?? "No description"}
                                </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-3 font-mono text-xs text-muted-foreground">
                                {repo.language ? <span>{repo.language}</span> : null}
                                <span className="inline-flex items-center gap-1">
                                    <Star className="size-3" /> {nf(repo.stars)}
                                </span>
                            </span>
                        </a>
                    </li>
                ))}
                {data.topRepos.length === 0 ? (
                    <li className="text-sm text-muted-foreground">No repositories found.</li>
                ) : null}
            </ul>
        </Panel>
    );
}

export function AchievementsWidget({ data }: { data: RewindData }) {
    const tones = { gold: "attention", silver: "primary", bronze: "default" } as const;
    return (
        <Panel>
            <PanelHeader
                icon={<GitMerge className="size-4" />}
                title="Achievements"
                hint="Unlocked from your activity"
            />
            <div className="grid gap-2 sm:grid-cols-2">
                {data.achievements.map((a) => (
                    <div
                        key={a.id}
                        className="rounded-md border border-border bg-background p-3"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{a.title}</span>
                            <Chip tone={tones[a.tier]}>{a.tier}</Chip>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                    </div>
                ))}
                {data.achievements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No achievements unlocked yet.</p>
                ) : null}
            </div>
        </Panel>
    );
}

"use client"
import { useRewindStore } from "@/store/rewind-store";
import { AchievementsWidget, ActivityWidget, LanguagesWidget, ProfileWidget, ReposWidget, StatsGrid } from "./rewind/StatsWidgets";
import { InsightsPanel } from "./rewind/InsightsWidgets";
import { HighlightCard } from "./rewind/HighlightCard";
import { SharePanel } from "./rewind/SharePanel";
import { Panel } from "./rewind/primitives";

export default function PageData() {
    const { data, insights } = useRewindStore();
    if (!data) return null

    return (
        <div className="space-y-4">
            <ProfileWidget data={data} />
            <StatsGrid data={data} />
            <InsightsPanel data={data} />
            <div className="grid gap-4 lg:grid-cols-2">
                <LanguagesWidget data={data} />
                <ActivityWidget data={data} />
                <ReposWidget data={data} />
                <AchievementsWidget data={data} />
            </div>
            <HighlightCard data={data} insights={insights} />
            <SharePanel data={data} insights={insights} />
            {data.notes.length ? (
                <Panel>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Data notes
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {data.notes.map((note) => (
                            <li key={note}>• {note}</li>
                        ))}
                    </ul>
                </Panel>
            ) : null}
        </div>
    )
}
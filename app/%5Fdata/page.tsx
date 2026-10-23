"use client";

import { useEffect, useState } from "react";
import { useRewindStore } from "@/store/rewind-store";
import { REWIND_STORAGE_KEY } from "@/store/rewind-store";
import { GhButton, Panel, PanelHeader } from "@/components/rewind/primitives";
import { toast } from "sonner";

export default function StoredDataPage() {
    const { data, hydrated, insights, reset, username, year } = useRewindStore();
    const [clearing, setClearing] = useState(false);
    const [storedBytes, setStoredBytes] = useState<number | null>(null);
    const [storageError, setStorageError] = useState<string | null>(null);

    const savedSnapshot = {
        username,
        year,
        rewind: data,
        insights,
    };
    const hasSavedData = Boolean(
        username || data || insights || year !== new Date().getUTCFullYear(),
    );

    useEffect(() => {
        if (!hydrated) return;
        try {
            const persistedValue = localStorage.getItem(REWIND_STORAGE_KEY);
            setStoredBytes(persistedValue ? new TextEncoder().encode(persistedValue).length : 0);
            setStorageError(null);
        } catch (error) {
            console.error("Unable to measure saved GithubRewind data.", error);
            setStoredBytes(null);
            setStorageError("Could not read this app's saved data size from browser storage.");
        }
    }, [data, hydrated, insights, username, year]);

    const formattedSize =
        storedBytes === null
            ? null
            : storedBytes < 1024
                ? `${storedBytes} bytes`
                : `${(storedBytes / 1024).toFixed(2)} KB (${(storedBytes / (1024 * 1024)).toFixed(3)} MB)`;

    async function clearSavedData() {
        if (!hasSavedData || clearing) return;
        const confirmed = window.confirm(
            "Clear all GithubRewind data saved by this app from this browser? This cannot be undone.",
        );
        if (!confirmed) return;

        setClearing(true);
        try {
            reset();
            await useRewindStore.persist.clearStorage();
            toast.success("Saved GithubRewind data cleared");
        } catch (error) {
            console.error("Unable to clear saved GithubRewind data.", error);
            toast.error("Could not clear saved data. Please try again.");
        } finally {
            setClearing(false);
        }
    }

    return (
        <main className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6 sm:py-12">
            <header>
                <p className="font-mono text-xs uppercase tracking-widest text-primary">
                    Your device
                </p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Saved data</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Review the GithubRewind information this app has saved in this browser. Your
                    data stays in local storage on this device.
                </p>
            </header>

            {!hydrated ? (
                <Panel>
                    <p className="text-sm text-muted-foreground">Loading saved data…</p>
                </Panel>
            ) : (
                <>
                    <Panel>
                        <PanelHeader
                            title="Stored by GithubRewind"
                            hint="The app currently stores one local-storage record for your latest rewind."
                            action={
                                <GhButton
                                    variant="outline"
                                    size="sm"
                                    onClick={clearSavedData}
                                    disabled={!hasSavedData || clearing}
                                >
                                    {clearing ? "Clearing…" : "Clear all saved data"}
                                </GhButton>
                            }
                        />
                        {hasSavedData ? (
                            <dl className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-md border border-border bg-elevated p-3">
                                    <dt className="text-xs text-muted-foreground">Username</dt>
                                    <dd className="mt-1 font-mono text-sm">
                                        {username || data?.profile.login || "Not set"}
                                    </dd>
                                </div>
                                <div className="rounded-md border border-border bg-elevated p-3">
                                    <dt className="text-xs text-muted-foreground">Year</dt>
                                    <dd className="mt-1 font-mono text-sm">{year}</dd>
                                </div>
                                <div className="rounded-md border border-border bg-elevated p-3">
                                    <dt className="text-xs text-muted-foreground">
                                        Total stored size
                                    </dt>
                                    <dd className="mt-1 font-mono text-sm">
                                        {formattedSize ?? "Unavailable"}
                                    </dd>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        UTF-8 size of the app&apos;s complete saved record.
                                    </p>
                                </div>
                                <div className="rounded-md border border-border bg-elevated p-3">
                                    <dt className="text-xs text-muted-foreground">Rewind data</dt>
                                    <dd className="mt-1 text-sm">
                                        {data
                                            ? `${data.totals.repos.toLocaleString("en-US")} repositories, activity metrics, languages, chapters, and profile data`
                                            : "None"}
                                    </dd>
                                </div>
                                <div className="rounded-md border border-border bg-elevated p-3">
                                    <dt className="text-xs text-muted-foreground">AI insights</dt>
                                    <dd className="mt-1 text-sm">
                                        {insights ? "Generated insights saved" : "None"}
                                    </dd>
                                </div>
                                <div className="rounded-md border border-border bg-elevated p-3">
                                    <dt className="text-xs text-muted-foreground">Tokens</dt>
                                    <dd className="mt-1 text-sm">
                                        Used temporarily in memory; never saved or sent to the server.
                                    </dd>
                                </div>
                            </dl>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                This app has no GithubRewind data saved in this browser.
                            </p>
                        )}
                    </Panel>

                    {hasSavedData ? (
                        <Panel className="">
                            <PanelHeader
                                title="Complete saved record"
                                hint="This is the full app-owned data record currently persisted on this device."
                            />
                            <pre className="max-h-100 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                                {JSON.stringify(savedSnapshot, null, 2)}
                            </pre>
                        </Panel>
                    ) : null}

                    <p className="text-xs text-muted-foreground">
                        {storageError ? `${storageError} ` : ""}
                        GitHub tokens are never included in this saved record. Clearing removes only
                        this app&apos;s saved rewind; it does not clear unrelated browser storage.
                    </p>
                </>
            )}
        </main>
    );
}

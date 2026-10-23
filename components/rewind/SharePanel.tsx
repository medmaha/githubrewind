import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Panel, PanelHeader, GhButton, Chip } from "./primitives";
import { PLATFORMS, buildShareText, shareUrl, type Platform } from "@/lib/rewind-share";
import type { AiInsights, RewindData } from "@/lib/rewind-types";
import { cn } from "@/lib/utils";

export function SharePanel({ data, insights }: { data: RewindData; insights: AiInsights | null }) {
    const [platform, setPlatform] = useState<Platform>("linkedin");
    const [copied, setCopied] = useState(false);

    const text = useMemo(
        () => buildShareText(data, insights, platform),
        [data, insights, platform],
    );
    const meta = PLATFORMS[platform];
    const link = shareUrl(platform, text, data.profile.htmlUrl);

    async function copy() {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success(`${meta.label} caption copied`);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error("Clipboard not available");
        }
    }

    return (
        <Panel>
            <PanelHeader
                icon={<Share2 className="size-4" />}
                title="Share your rewind"
                hint="Platform-tuned captions, ready to paste alongside the highlight card"
            />

            <div className="flex flex-wrap gap-2">
                {(Object.keys(PLATFORMS) as Platform[]).map((key) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setPlatform(key)}
                        className={cn(
                            "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                            platform === key
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-elevated text-muted-foreground hover:text-foreground",
                        )}
                        style={platform === key ? { borderColor: PLATFORMS[key].brand } : undefined}
                    >
                        {PLATFORMS[key].label}
                    </button>
                ))}
            </div>

            <textarea
                readOnly
                value={text}
                rows={10}
                aria-label={`${meta.label} caption`}
                className="mt-3 w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip tone={text.length > meta.limit ? "attention" : "success"}>
                    {text.length.toLocaleString("en-US")} / {meta.limit.toLocaleString("en-US")}
                </Chip>
                <span className="text-xs text-muted-foreground">{meta.note}</span>
                <div className="ml-auto flex gap-2">
                    <GhButton variant="outline" size="sm" onClick={copy}>
                        {copied ? (
                            <Check className="size-3.5 text-success" />
                        ) : (
                            <Copy className="size-3.5" />
                        )}
                        {copied ? "Copied" : "Copy"}
                    </GhButton>
                    {link ? (
                        <GhButton
                            size="sm"
                            onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
                        >
                            <ExternalLink className="size-3.5" />
                            Open {meta.label}
                        </GhButton>
                    ) : (
                        <Chip>Copy caption, then upload the card</Chip>
                    )}
                </div>
            </div>
        </Panel>
    );
}

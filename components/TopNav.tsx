"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRewindStore } from "@/store/rewind-store";
import { Chip, GhButton } from "./rewind/primitives";
import { RotateCcwIcon, SparklesIcon } from "lucide-react";
import Image from "next/image";

const NAV_LINKS = [
    { href: "/rewind", label: "Rewind" },
    { href: "/stories", label: "Stories" },
    { href: "/insights", label: "Insights" },
] as const;

export default function TopNav() {
    const { data, reset } = useRewindStore();
    const pathname = usePathname();
    const router = useRouter();
    return (
        <header className="border-b border-border bg-[#010409]">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-white rounded-full overflow-hidden flex justify-center items-center">
                        <Image
                            src="/logo.png"
                            alt="github rewind logo"
                            width={20}
                            height={20}
                            priority
                            fetchPriority="high"
                            className={"w-7 h-7"}
                        />
                    </div>
                    <Link href={data ? "/rewind" : "/"}>
                        <span className="block text-sm font-semibold tracking-tight">
                            GitHubRewind
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                            Year in code, analyzed
                        </span>
                    </Link>
                </div>
                {data ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <nav aria-label="Rewind sections" className="flex items-center gap-1">
                            {NAV_LINKS.map(({ href, label }) => {
                                const active = pathname === href;
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        aria-current={active ? "page" : undefined}
                                        className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${active
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-elevated hover:text-foreground"
                                            }`}
                                    >
                                        {label}
                                    </Link>
                                );
                            })}
                        </nav>
                        <GhButton
                            variant="primary"
                            size="sm"
                            onClick={() => {
                                const confirmed = window.confirm(
                                    "Start a new rewind? This clears your saved rewind and AI insights from this browser.",
                                );
                                if (!confirmed) return;
                                reset();
                                router.push("/");
                            }}
                        >
                            <RotateCcwIcon className="size-3.5" />
                            New rewind
                        </GhButton>
                    </div>
                ) : (
                    <Chip tone="primary">
                        <SparklesIcon className="size-3" /> AI powered
                    </Chip>
                )}
            </div>
        </header>
    );
}

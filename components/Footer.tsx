import Image from "next/image";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-border py-6 px-2 sm:px-4 text-muted-foreground flex gap-4 flex-wrap max-sm:gap-2 h-max items-center justify-between">
            <div className="flex flex-wrap sm:items-center gap-2">
                <p className="text-xs">© 2024-{new Date().getFullYear()} GitHub Rewind</p>
                <Link href={"/_data"} className="text-xs underline underline-offset-2">
                    Data
                </Link>
            </div>
            <Link
                href="https://github.com/medmaha/github-activity-rewind"
                target="_blank"
                rel="noopener noreferrer"
                className={"inline-flex items-center justify-center gap-2 w-max"}
            >
                <div className="w-7 h-7 bg-white rounded-full overflow-hidden flex justify-center items-center">
                    <Image
                        src="/github.png"
                        alt="github logo"
                        width={18}
                        height={18}
                        priority
                        fetchPriority="high"
                        className={"w-6 h-6"}
                    />
                </div>
                <p className="text-sm text-muted-foreground">
                    Github-Rewind
                </p>
                <ExternalLink size={16} />
            </Link>

        </footer >
    );
}

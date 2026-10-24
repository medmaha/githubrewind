import Image from "next/image";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-border py-6 px-2 sm:px-4 text-muted-foreground flex gap-4 flex-wrap max-sm:gap-2 h-max items-center justify-between">
            <div className="flex max-sm:flex-wrap sm:items-center gap-2">
                <p className="text-xs">© 2024-{new Date().getFullYear()} GithubRewind</p>
                <Link href={"/_data"} className="text-xs underline underline-offset-2">
                    Data & Storage
                </Link>
            </div>
            <Link
                href="https://github.com/medmaha/githubrewind"
                target="_blank"
                title="Open Repository"
                rel="noopener noreferrer"
                className={"inline-flex items-center justify-center bg-white rounded-full w-7 h-7"}
            >
                <Image
                    src="/github.png"
                    alt="github logo"
                    width={16}
                    height={16}
                    priority
                    fetchPriority="high"
                    className={"w-6 h-6"}
                />
            </Link>
        </footer>
    );
}

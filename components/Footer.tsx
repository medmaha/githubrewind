import GithubIconLink from "./GithubIconLink";
import { ExternalLink } from "lucide-react";

export function Footer() {
    return (
        <footer className="text-card-foreground py-6 bg-linear-to-br to-background from-card-800">
            <div className="flex items-center justify-center">
                <GithubIconLink className="w-auto px-2 gap-3">
                    <div className="flex gap-3 items-center">
                        <small className="underline underline-offset-2 text-black/70 text-[12px]">
                            medmaha/github-activity-rewind
                        </small>
                        <ExternalLink className="w-3 h-3 text-black/70 text-[12px]" />
                    </div>
                </GithubIconLink>
            </div>
            <div className="container flex items-center justify-center px-4 mt-4">
                <p>&copy; {new Date().getFullYear()}. All rights Reserved</p>
            </div>
        </footer>
    );
}

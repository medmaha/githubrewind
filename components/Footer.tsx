import GithubIconLink from "./GithubIconLink";
import { ExternalLink } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-border py-6 text-muted-foreground">
            <div className="flex items-center justify-center">
                <GithubIconLink className="w-auto px-2 gap-3">
                    <div className="flex gap-3 items-center">
                        <small className="text-[12px] text-muted-foreground hover:text-primary">
                            medmaha/git-rewind
                        </small>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                </GithubIconLink>
            </div>
            <div className="container flex items-center justify-center px-4 mt-4">
                <p className="text-xs">© {new Date().getFullYear()} GitHub Rewind</p>
            </div>
        </footer>
    );
}

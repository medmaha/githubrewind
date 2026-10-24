import type { ReactNode } from "react";

import { Footer } from "@/components/Footer";
import { RewindStoreHydration } from "@/components/RewindStoreHydration";
import TopNav from "@/components/TopNav";

export function SiteShell({ children }: { children: ReactNode }) {
    return (
        <>
            <RewindStoreHydration />
            <div className="bg-background text-foreground flex flex-col min-h-screen">
                <TopNav />
                <div className="flex-1 block h-full">{children}</div>
                <Footer />
            </div>
        </>
    );
}

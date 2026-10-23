import AppQueryProvider from "@/providers/query-provider";
import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
    title: process.env.NODE_ENV === "development" ? "DEV | Rewind-Github" : "Rewind-Github",
    description:
        "Get your own Github rewind card with AI insights? This fun and interactive tool allows you to showcase your coding journey in 2024",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="scroll-smooth">
            <body>
                <AppQueryProvider>{children}</AppQueryProvider>
                <Toaster />
            </body>
        </html>
    );
}

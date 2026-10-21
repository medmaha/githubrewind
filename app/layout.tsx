import AppQueryProvider from "@/providers/query-provider";
import "./globals.css";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
    weight: ["300", "400", "500", "600", "700"],
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: process.env.NODE_ENV === "development" ? "DEV | Rewind-Github" : "Rewind-Github",
    description:
        "Get your own Github rewind card with AI insights? This fun and interactive tool allows you to showcase your coding journey in 2024",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="scroll-smooth">
            <body className={`${poppins.className}`}>
                <AppQueryProvider>{children}</AppQueryProvider>
                <Toaster />
            </body>
        </html>
    );
}

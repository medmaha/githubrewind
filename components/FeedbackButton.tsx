"use client";

import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";

const FeedbackFormLazy = lazy(() => import("./FeedbackForm"));

export function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <>
            <Suspense>
                {isOpen && <FeedbackFormLazy isOpen={isOpen} onClose={setIsOpen} />}
            </Suspense>
            <Button
                title="Give me us a feedback"
                className="fixed z-30 bottom-3 left-3 inline-flex items-center gap-2 w-max h-max rounded-full p-2 bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={() => setIsOpen((p) => !p)}
            >
                <PlusIcon />
                {/* <span className="max-sm:hidden">Feedback</span> */}
            </Button>
        </>
    );
}

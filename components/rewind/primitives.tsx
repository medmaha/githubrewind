import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function Panel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "surface motion-preset-slide-up-sm relative overflow-hidden p-4 sm:p-5",
                "transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg hover:shadow-black/10",
                "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function PanelHeader({
    icon,
    title,
    hint,
    action,
}: {
    icon?: ReactNode;
    title: string;
    hint?: string;
    action?: ReactNode;
}) {
    return (
        <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
                {icon ? (
                    <span className="grid size-8 place-items-center rounded-md bg-elevated text-muted-foreground">
                        {icon}
                    </span>
                ) : null}
                <div>
                    <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
                    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
                </div>
            </div>
            {action}
        </div>
    );
}

export function Chip({
    children,
    tone = "default",
    className,
}: {
    children: ReactNode;
    tone?: "default" | "success" | "attention" | "done" | "primary";
    className?: string;
}) {
    const tones: Record<string, string> = {
        default: "border-border bg-[var(--elevated)] text-muted-foreground",
        primary: "border-primary/40 bg-primary/10 text-primary",
        success: "border-success/40 bg-success/10 text-success",
        attention: "border-attention/40 bg-attention/10 text-attention",
        done: "border-done/40 bg-done/10 text-done",
    };
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs leading-4",
                tones[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}

export function GhButton({
    className,
    variant = "primary",
    size = "md",
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "outline";
    size?: "sm" | "md";
}) {
    const variants = {
        primary:
            "border border-[color-mix(in_srgb,var(--success)_70%,black)] bg-success text-white font-medium hover:bg-[color-mix(in_srgb,var(--success)_88%,white)]",
        outline:
            "border border-[var(--border-strong)] bg-[var(--elevated)] text-foreground hover:bg-[color-mix(in_oklch,var(--elevated)_80%,white_6%)]",
        ghost: "text-muted-foreground hover:bg-[var(--elevated)] hover:text-foreground",
    } as const;
    return (
        <Button
            variant={variant === "primary" ? "default" : variant}
            className={cn(
                "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent text-sm transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none motion-reduce:transition-none",
                size === "sm" ? "h-8 px-3" : "h-10 px-4",
                className,
            )}
            {...props}
        />
    );
}

export function GhInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <Input
            className={cn(
                "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/70",
                "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                className,
            )}
            {...props}
            name="github_username"
        />
    );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// One status vocabulary for the Admin UI. Tone carries meaning, never entity:
// success is healthy/active, warning needs attention, danger is a problem,
// neutral is inactive/archived and info is reference data.
export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info";

const toneClasses: Record<BadgeTone, string> = {
  success: "border-emerald-600/20 bg-emerald-50 text-emerald-700",
  warning: "border-amber-600/20 bg-amber-50 text-amber-800",
  danger: "border-red-600/20 bg-red-50 text-red-700",
  neutral: "border-slate-300/60 bg-slate-100 text-slate-600",
  info: "border-sky-600/20 bg-sky-50 text-sky-700",
};

const dotClasses: Record<BadgeTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  neutral: "bg-slate-400",
  info: "bg-sky-500",
};

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("size-1.5 shrink-0 rounded-full", dotClasses[tone])}
        />
      )}
      {children}
    </span>
  );
}

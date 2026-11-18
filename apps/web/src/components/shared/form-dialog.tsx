"use client";

import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, Loader2 } from "lucide-react";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shared chrome for the Admin add/edit dialogs, so every form reads the same
// way: a tinted header with an icon tile, grouped fields, and an action band.
// Dialogs cancel the shell's own padding with negative margins, which is why
// the header and footer pull out by `-mx-6`.
export function FormDialogHeader({
  icon,
  title,
  description,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "-mx-6 -mt-6 mb-6 flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-5 pr-14",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3EA] text-[#A84E0D] ring-1 ring-[#B9520A]/15"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <DialogTitle className="text-base font-bold text-slate-900">
          {title}
        </DialogTitle>
        {description && (
          <DialogDescription className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {description}
          </DialogDescription>
        )}
      </div>
    </header>
  );
}

export function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-slate-100 pb-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </h2>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function FormDialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-6 -mb-6 mt-1 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
      {children}
    </div>
  );
}

export function FieldError({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-1.5 text-xs font-medium text-red-600"
    >
      <CircleAlert size={13} className="mt-px shrink-0" aria-hidden />
      {children}
    </p>
  );
}

// Form-level message for a failed save, as opposed to a single field.
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
    >
      <CircleAlert size={14} className="mt-px shrink-0" aria-hidden />
      {children}
    </p>
  );
}

export function FormSaveButton({
  saving,
  savingLabel = "Saving…",
  className,
  disabled,
  children,
  ...rest
}: Omit<ComponentProps<typeof Button>, "children"> & {
  saving: boolean;
  savingLabel?: string;
  children: ReactNode;
}) {
  return (
    <Button
      {...rest}
      disabled={disabled || saving}
      className={cn(
        "min-w-32 bg-[#B9520A] hover:bg-[#9E4508] focus-visible:outline-[#B9520A]",
        className,
      )}
    >
      {saving && <Loader2 size={15} className="animate-spin" aria-hidden />}
      {saving ? savingLabel : children}
    </Button>
  );
}

import { X } from "lucide-react";

// A filter the admin has applied, removable in place. Used by the Admin list
// pages so an active filter is never invisible.
export function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-xs font-medium text-slate-600">
      {label}
      <button
        type="button"
        aria-label={`Remove ${label} filter`}
        className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        onClick={onRemove}
      >
        <X size={12} />
      </button>
    </span>
  );
}

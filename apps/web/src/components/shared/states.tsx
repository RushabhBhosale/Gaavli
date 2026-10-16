"use client";
import { Sprout, TriangleAlert } from "lucide-react";
import { Button } from "../ui/button";
export function EmptyState({
  title = "Coming soon",
  description = "We’re growing something useful. Check back soon.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="card flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-emerald-50 p-4 text-emerald-700">
        <Sprout size={30} />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="card flex flex-wrap items-center gap-3 border-red-100 p-5 text-sm text-red-700"
    >
      <TriangleAlert size={20} />
      <span className="flex-1">{error.message}</span>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function Skeleton({ className = "h-12" }: { className?: string }) {
  return (
    <div
      aria-label="Loading"
      role="status"
      className={`animate-pulse rounded-lg bg-slate-100 ${className}`}
    />
  );
}

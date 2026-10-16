"use client";
import { ErrorState } from "@/components/shared/states";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl p-8">
      <ErrorState
        error={
          new Error(
            "Unable to load this page. Check the server configuration and try again.",
          )
        }
        retry={reset}
      />
    </div>
  );
}

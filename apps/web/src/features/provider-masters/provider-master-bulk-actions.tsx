"use client";
import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileDown, Upload } from "lucide-react";
import type { ProviderMasterType, ProviderType } from "@gaavli/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { providerMasterSampleCsv } from "@/lib/provider-master-csv";

type Filters = {
  providerType: ProviderType;
  masterType: ProviderMasterType;
  search: string;
  status: string;
  sort: string;
  direction: "asc" | "desc";
};
type ImportResult = {
  created: number;
  failed: { line: number; message: string }[];
};

async function readError(response: Response) {
  try {
    const payload = await response.json();
    return payload.error?.message || "Unable to complete this request.";
  } catch {
    return "Unable to complete this request.";
  }
}

export function ProviderMasterBulkActions({
  filters,
  children,
}: {
  filters: Filters;
  children?: ReactNode;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"download" | "upload" | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function download() {
    setError("");
    setBusy("download");
    const params = new URLSearchParams({
      providerType: filters.providerType,
      masterType: filters.masterType,
      search: filters.search,
      status: filters.status,
      sort: filters.sort,
      direction: filters.direction,
    });
    try {
      const response = await fetch(
        `/api/v1/admin/provider-masters/export?${params}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "provider-masters.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Unable to download master options.");
    } finally {
      setBusy(null);
    }
  }

  async function upload(file: File) {
    setError("");
    setBusy("upload");
    const params = new URLSearchParams({
      providerType: filters.providerType,
      masterType: filters.masterType,
    });
    try {
      const response = await fetch(
        `/api/v1/admin/provider-masters/import?${params}`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "text/csv" },
          body: await file.text(),
        },
      );
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload.error?.message || "Unable to upload master options.");
        return;
      }
      setResult(payload.data as ImportResult);
      if (payload.data.created > 0)
        await client.invalidateQueries({
          queryKey: ["admin-provider-masters"],
        });
    } catch {
      setError("Unable to upload master options.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Download master options as CSV"
          disabled={busy !== null}
          onClick={() => void download()}
        >
          <Download size={15} />
          Download
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Download a sample master options CSV"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([providerMasterSampleCsv()], {
                type: "text/csv;charset=utf-8",
              }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "provider-masters-sample.csv";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          <FileDown size={15} />
          Sample
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Upload master options from CSV"
          disabled={busy !== null}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={15} />
          Upload
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          aria-label="Master options CSV file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
        {children}
      </div>
      {error && (
        <p role="alert" className="text-right text-xs text-red-700">
          {error}
        </p>
      )}
      <Dialog
        open={!!result}
        onOpenChange={(open) => {
          if (!open) setResult(null);
        }}
      >
        <DialogContent>
          <DialogTitle className="text-xl font-bold">
            {result?.created ? "Master options uploaded" : "No options added"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-slate-500">
            Added {result?.created ?? 0}{" "}
            {result?.created === 1 ? "option" : "options"} to the provider
            types and master groups defined by the CSV or selected page.
            {result?.failed.length
              ? ` ${result.failed.length} ${result.failed.length === 1 ? "row was" : "rows were"} skipped.`
              : ""}
          </DialogDescription>
          {!!result?.failed.length && (
            <ul className="mt-4 max-h-64 space-y-2 overflow-auto text-sm text-slate-600">
              {result.failed.map((failure) => (
                <li key={`${failure.line}-${failure.message}`}>
                  Row {failure.line}: {failure.message}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

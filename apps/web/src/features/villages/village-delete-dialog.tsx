"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/shared/states";
import type { AdminVillageDto, VillageDependencies } from "@/lib/contracts";
import { api } from "@/lib/api";

export function VillageDeleteDialog({
  village,
  onClose,
  onDeleted,
}: {
  village: AdminVillageDto;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const client = useQueryClient();
  const dependencies = useQuery({
    queryKey: ["village-dependencies", village.id],
    queryFn: () =>
      api<VillageDependencies>(`/v1/admin/villages/${village.id}/dependencies`),
    refetchOnMount: "always",
  });
  const blocked =
    !dependencies.data ||
    Object.values(dependencies.data).some((count) => count > 0);
  const remove = useMutation({
    mutationFn: () =>
      api(`/v1/admin/villages/${village.id}`, {
        method: "DELETE",
        body: JSON.stringify({ version: village.version }),
      }),
    onSuccess: async () => {
      await Promise.all(
        ["admin-villages", "villages", "village-dependencies"].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      onDeleted();
    },
    onError: () => void dependencies.refetch(),
  });
  const deactivate = useMutation({
    mutationFn: () =>
      api(`/v1/admin/villages/${village.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "inactive", version: village.version }),
      }),
    onSuccess: async () => {
      await Promise.all(
        ["admin-villages", "villages"].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      onDeleted();
    },
  });
  const busy = remove.isPending || deactivate.isPending;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle className="text-xl font-bold">
          Delete {village.name}?
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-slate-500">
          Deletion is permanent. Review linked records before continuing. Audit
          history is retained.
        </DialogDescription>
        {dependencies.isPending ? (
          <div className="mt-4">
            <Skeleton />
          </div>
        ) : dependencies.error ? (
          <ErrorState
            error={dependencies.error}
            retry={() => void dependencies.refetch()}
          />
        ) : (
          <dl className="my-5 grid grid-cols-2 gap-2 text-sm">
            {Object.entries(dependencies.data ?? {}).map(([label, count]) => (
              <div
                key={label}
                className="flex justify-between gap-2 rounded bg-slate-50 p-2"
              >
                <dt className="capitalize">{label}</dt>
                <dd className="font-semibold">{count}</dd>
              </div>
            ))}
          </dl>
        )}
        {blocked && dependencies.data && (
          <p className="text-sm text-amber-700">
            Reassign linked users and listings, remove the coordinator
            assignment, and clear other links before deleting. You can
            deactivate the village to preserve its history.
          </p>
        )}
        {(remove.error || deactivate.error) && (
          <p role="alert" className="mt-3 field-error">
            {remove.error?.message || deactivate.error?.message}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          {village.status === "active" && (
            <Button
              variant="outline"
              disabled={busy || !dependencies.data || dependencies.isFetching}
              onClick={() => deactivate.mutate()}
            >
              {deactivate.isPending ? "Updating…" : "Deactivate instead"}
            </Button>
          )}
          <Button
            variant="destructive"
            disabled={
              busy || blocked || !!dependencies.error || dependencies.isFetching
            }
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? "Deleting…" : "Delete village"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

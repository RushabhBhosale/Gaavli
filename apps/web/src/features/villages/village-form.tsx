"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/shared/states";
import { api } from "@/lib/api";
import { parseCoordinates } from "@/lib/coordinates";
import type { AdminVillageDto, CoordinatorOption } from "@/lib/contracts";
import { createVillageSchema } from "@/schemas";
import { VillageDeleteDialog } from "./village-delete-dialog";

export function VillageForm({
  village,
  onClose,
}: {
  village?: AdminVillageDto;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [name, setName] = useState(village?.name ?? "");
  const [nameMr, setNameMr] = useState(village?.nameMr ?? "");
  const [taluka, setTaluka] = useState(village?.taluka ?? "");
  const [district, setDistrict] = useState(village?.district ?? "");
  const [pinCode, setPinCode] = useState(village?.pinCode ?? "");
  const [coordinates, setCoordinates] = useState(
    village?.latitude != null && village.longitude != null
      ? `${village.latitude}, ${village.longitude}`
      : "",
  );
  const [selected, setSelected] = useState(
    village?.coordinators?.map((coordinator) => coordinator.id) ?? [],
  );
  const [validation, setValidation] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const options = useQuery({
    queryKey: ["coordinator-options"],
    queryFn: () => api<CoordinatorOption[]>("/v1/admin/coordinators"),
  });
  const dependencies = useQuery({
    queryKey: ["village-dependencies", village?.id],
    queryFn: () =>
      api<{ users: number; listings: number; coordinators: number }>(
        `/v1/admin/villages/${village!.id}/dependencies`,
      ),
    enabled: !!village && confirm,
  });
  async function refresh() {
    await Promise.all(
      [
        "admin-villages",
        "villages",
        "users",
        "counts",
        "coordinator-options",
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
    onClose();
  }
  const save = useMutation({
    mutationFn: async () => {
      const parsed = village ? parseCoordinates(coordinates) : undefined;
      if (village && coordinates.trim() && !parsed)
        throw new Error(
          "Enter valid coordinates, for example 16.9944° N, 73.3120° E.",
        );
      const input = createVillageSchema.parse({
        name,
        nameMr,
        taluka,
        district,
        pinCode,
        ...parsed,
        coordinatorIds: selected,
      });
      return api(
        village ? `/v1/admin/villages/${village.id}` : "/v1/admin/villages",
        {
          method: village ? "PUT" : "POST",
          body: JSON.stringify(
            village ? { ...input, version: village.version } : input,
          ),
        },
      );
    },
    onSuccess: refresh,
  });
  const status = useMutation({
    mutationFn: () =>
      api(`/v1/admin/villages/${village!.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: village!.status === "active" ? "inactive" : "active",
          version: village!.version,
        }),
      }),
    onSuccess: refresh,
  });
  const busy = save.isPending || status.isPending;
  if (deleting && village)
    return (
      <VillageDeleteDialog
        village={village}
        onClose={() => setDeleting(false)}
        onDeleted={refresh}
      />
    );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent>
        <div className="flex items-center gap-3 pr-6">
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to villages"
            disabled={busy}
            onClick={onClose}
          >
            <ChevronLeft size={16} />
          </Button>
          <DialogTitle className="text-xl font-bold">
            {village ? village.name : "Add Village"}
          </DialogTitle>
        </div>
        <DialogDescription className="mt-3 text-sm text-slate-500">
          Manage village details and the assigned coordinator.
        </DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setValidation("");
            const parsed = village ? parseCoordinates(coordinates) : undefined;
            const result = createVillageSchema.safeParse({
              name,
              nameMr,
              taluka,
              district,
              pinCode,
              ...parsed,
              coordinatorIds: selected,
            });
            if (village && coordinates.trim() && !parsed) {
              setValidation(
                "Enter valid coordinates, for example 16.9944° N, 73.3120° E.",
              );
              return;
            }
            if (!result.success) {
              setValidation(
                result.error.issues[0]?.message ?? "Check the village details.",
              );
              return;
            }
            save.mutate();
          }}
        >
          <fieldset disabled={busy || confirm} className="space-y-4">
            <div className="field">
              <label htmlFor="village-name">
                Village name <span className="text-red-600">*</span>
              </label>
              <input
                id="village-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="village-name-mr">
                Village name (Marathi) <span className="text-red-600">*</span>
              </label>
              <input
                id="village-name-mr"
                lang="mr"
                value={nameMr}
                onChange={(event) => setNameMr(event.target.value)}
                maxLength={100}
                required
              />
            </div>
            {village && (
              <div className="field">
                <label htmlFor="village-coordinates">
                  Coordinates (optional; use verified coordinates only)
                </label>
                <input
                  id="village-coordinates"
                  value={coordinates}
                  onChange={(event) => setCoordinates(event.target.value)}
                  placeholder="16.9944° N, 73.3120° E"
                  aria-describedby="coordinate-help"
                />
                <p id="coordinate-help" className="text-xs text-slate-400">
                  Latitude, longitude. Nearby villages are mapped separately.
                </p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="village-taluka">
                  Taluka <span className="text-red-600">*</span>
                </label>
                <input
                  id="village-taluka"
                  value={taluka}
                  onChange={(event) => setTaluka(event.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="village-district">
                  District <span className="text-red-600">*</span>
                </label>
                <input
                  id="village-district"
                  value={district}
                  onChange={(event) => setDistrict(event.target.value)}
                  maxLength={100}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="village-pin">PIN code (optional)</label>
              <input
                id="village-pin"
                inputMode="numeric"
                maxLength={6}
                value={pinCode}
                onChange={(event) => setPinCode(event.target.value)}
                placeholder="Verified six-digit PIN"
              />
            </div>
            <div className="field">
              <label htmlFor="assigned-coordinator">Assigned coordinator</label>
              {options.isPending ? (
                <Skeleton />
              ) : options.error ? (
                <ErrorState
                  error={options.error}
                  retry={() => void options.refetch()}
                />
              ) : !options.data?.length ? (
                <p className="text-xs text-slate-500">
                  No coordinators available. Grant the Coordinator role from
                  Users first.
                </p>
              ) : (
                <select
                  id="assigned-coordinator"
                  value={selected[0] ?? ""}
                  aria-describedby="coordinator-help"
                  onChange={(event) =>
                    setSelected(event.target.value ? [event.target.value] : [])
                  }
                >
                  <option value="">Select coordinator (unassigned)</option>
                  {options.data.map((coordinator) => (
                    <option
                      key={coordinator.id}
                      value={coordinator.id}
                      disabled={
                        coordinator.status !== "active" &&
                        !selected.includes(coordinator.id)
                      }
                    >
                      {coordinator.name}
                      {coordinator.status !== "active"
                        ? ` (${coordinator.status})`
                        : ""}
                    </option>
                  ))}
                </select>
              )}
              <p id="coordinator-help" className="text-xs text-slate-400">
                Select a coordinator and save to show their name in the village
                listing.
              </p>
            </div>
          </fieldset>
          {(validation || save.error) && (
            <p role="alert" className="field-error">
              {validation || save.error?.message}
            </p>
          )}
          {!confirm && (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button disabled={busy || options.isPending || !!options.error}>
                {save.isPending
                  ? "Saving…"
                  : village
                    ? "Save Changes"
                    : "Add Village"}
              </Button>
            </div>
          )}
        </form>
        {village && (
          <section
            className="mt-6 space-y-3 border-t border-slate-100 pt-5"
            aria-label="Danger zone"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Danger zone
            </h2>
            {confirm ? (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-semibold">
                  {village.status === "active" ? "Deactivate" : "Reactivate"}{" "}
                  {village.name}?
                </h3>
                <p className="text-xs text-slate-600">
                  Users, listings, coordinator assignments and village history
                  will be retained. Deactivation removes the village from active
                  village selection.
                </p>
                {dependencies.isPending ? (
                  <Skeleton />
                ) : dependencies.error ? (
                  <ErrorState
                    error={dependencies.error}
                    retry={() => void dependencies.refetch()}
                  />
                ) : (
                  <p className="text-xs text-slate-600">
                    Linked records: {dependencies.data?.users} users,{" "}
                    {dependencies.data?.listings} listings,{" "}
                    {dependencies.data?.coordinators} coordinator assignments.
                  </p>
                )}
                {status.error && (
                  <p role="alert" className="field-error">
                    {status.error.message}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={
                      busy || !dependencies.data || !!dependencies.error
                    }
                    onClick={() => status.mutate()}
                  >
                    {status.isPending ? "Updating…" : "Confirm"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed"
                disabled={busy}
                onClick={() => {
                  status.reset();
                  setConfirm(true);
                }}
              >
                {village.status === "active"
                  ? "Deactivate village"
                  : "Reactivate village"}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full border-red-300 text-red-600"
              disabled={busy}
              onClick={() => setDeleting(true)}
            >
              Delete village
            </Button>
            <p className="text-xs text-slate-400">
              Permanent deletion requires dependency review and reassignment.
              Use Deactivate to preserve village history.
            </p>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}

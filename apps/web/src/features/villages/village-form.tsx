"use client";

import { useEffect, useRef, useState } from "react";
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
import type {
  AdminVillageDto,
  GeographyPlace,
  GeographyVillage,
} from "@/lib/contracts";
import { createVillageSchema } from "@/schemas";
import { onlyPlaceMatch, onlyVillageMatch } from "@/lib/place-match";

function VillageCombobox({
  options,
  value,
  disabled,
  onChange,
}: {
  options: GeographyVillage[];
  value: string;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value);
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? options.filter((option) =>
        `${option.nameEn} ${option.nameMr ?? ""}`.toLowerCase().includes(needle),
      )
    : options;
  const label = selected?.nameEn ?? "";
  return (
    <div className="field">
      <label htmlFor="village-master">
        Village name <span className="text-red-600">*</span>
      </label>
      <input
        id="village-master"
        role="combobox"
        aria-expanded={open}
        aria-controls="village-master-list"
        aria-autocomplete="list"
        disabled={disabled}
        placeholder="Search villages in this taluka"
        value={open ? query : label}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <ul
          id="village-master-list"
          role="listbox"
          className="max-h-52 overflow-auto rounded-md border border-slate-200 bg-white"
        >
          {shown.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">
              No villages match.
            </li>
          ) : (
            shown.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option.id);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {option.nameEn}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function VillageForm({
  village,
  onClose,
}: {
  village?: AdminVillageDto;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [districtId, setDistrictId] = useState(village?.districtId ?? "");
  const [talukaId, setTalukaId] = useState(village?.talukaId ?? "");
  const [villageMasterId, setVillageMasterId] = useState(
    village?.villageMasterId ?? "",
  );
  const [nameMr, setNameMr] = useState(village?.nameMr ?? "");
  const [pinCode, setPinCode] = useState(village?.pinCode ?? "");
  const [coordinates, setCoordinates] = useState(
    village?.latitude != null && village.longitude != null
      ? `${village.latitude}, ${village.longitude}`
      : "",
  );
  const [validation, setValidation] = useState("");
  const [confirm, setConfirm] = useState(false);
  const districts = useQuery({
    queryKey: ["geography-districts"],
    queryFn: () => api<GeographyPlace[]>("/v1/admin/geography/districts"),
  });
  const talukas = useQuery({
    queryKey: ["geography-talukas", districtId],
    queryFn: () =>
      api<GeographyPlace[]>(
        `/v1/admin/geography/talukas?districtId=${districtId}`,
      ),
    enabled: Boolean(districtId),
  });
  const masterVillages = useQuery({
    queryKey: ["geography-villages", talukaId],
    queryFn: () =>
      api<GeographyVillage[]>(
        `/v1/admin/geography/villages?talukaId=${talukaId}`,
      ),
    enabled: Boolean(talukaId),
  });
  const dependencies = useQuery({
    queryKey: ["village-dependencies", village?.id],
    queryFn: () =>
      api<{ users: number; listings: number; coordinators: number }>(
        `/v1/admin/villages/${village!.id}/dependencies`,
      ),
    enabled: !!village && confirm,
  });
  const matchedDistrict = useRef(Boolean(village?.districtId));
  const matchedTaluka = useRef(Boolean(village?.talukaId));
  const matchedVillage = useRef(Boolean(village?.villageMasterId));
  useEffect(() => {
    if (matchedDistrict.current || !districts.data || !village?.district) return;
    matchedDistrict.current = true;
    const match = onlyPlaceMatch(
      districts.data.map((option) => ({
        ...option,
        nameMr: option.nameMr || null,
      })),
      village.district,
    );
    if (match) setDistrictId(match.id);
  }, [districts.data, village]);
  useEffect(() => {
    if (matchedTaluka.current || !districtId || !talukas.data || !village?.taluka)
      return;
    matchedTaluka.current = true;
    const match = onlyPlaceMatch(
      talukas.data.map((option) => ({
        ...option,
        nameMr: option.nameMr || null,
      })),
      village.taluka,
    );
    if (match) setTalukaId(match.id);
  }, [districtId, talukas.data, village]);
  useEffect(() => {
    if (
      matchedVillage.current ||
      !talukaId ||
      !masterVillages.data ||
      !village?.name
    )
      return;
    matchedVillage.current = true;
    const match = onlyVillageMatch(
      masterVillages.data,
      village.name,
      village.nameMr,
    );
    if (match) {
      setVillageMasterId(match.id);
      setNameMr(match.nameMr || village.nameMr);
    }
  }, [masterVillages.data, talukaId, village]);
  const selected = masterVillages.data?.find(
    (option) => option.id === villageMasterId,
  );
  async function refresh() {
    await Promise.all(
      ["admin-villages", "villages", "users", "counts"].map((key) =>
        client.invalidateQueries({ queryKey: [key] }),
      ),
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
        villageMasterId,
        ...(selected?.nameMrMissing && nameMr.trim().length >= 2
          ? { nameMr }
          : {}),
        pinCode,
        ...parsed,
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
  function chooseDistrict(id: string) {
    setDistrictId(id);
    setTalukaId("");
    setVillageMasterId("");
    setNameMr("");
  }
  function chooseTaluka(id: string) {
    setTalukaId(id);
    setVillageMasterId("");
    setNameMr("");
  }
  function chooseVillage(id: string) {
    setVillageMasterId(id);
    const option = masterVillages.data?.find((item) => item.id === id);
    setNameMr(
      option?.nameMr ||
        (id === village?.villageMasterId ? village.nameMr : ""),
    );
  }
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
          {village
            ? "District, taluka, and village names are read-only while editing."
            : "Choose the official district, taluka, and village."}
        </DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setValidation("");
            const parsed = village ? parseCoordinates(coordinates) : undefined;
            if (!villageMasterId) {
              setValidation("Choose a district, taluka, and village.");
              return;
            }
            if (
              !village &&
              selected?.nameMrMissing &&
              nameMr.trim().length < 2
            ) {
              setValidation("Enter the Marathi village name.");
              return;
            }
            if (village && coordinates.trim() && !parsed) {
              setValidation(
                "Enter valid coordinates, for example 16.9944° N, 73.3120° E.",
              );
              return;
            }
            const result = createVillageSchema.safeParse({
              villageMasterId,
              ...(selected?.nameMrMissing && nameMr.trim().length >= 2
                ? { nameMr }
                : {}),
              pinCode,
              ...parsed,
            });
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
            {districts.isPending ? (
              <Skeleton />
            ) : districts.error ? (
              <ErrorState
                error={districts.error}
                retry={() => void districts.refetch()}
              />
            ) : (
              <div className="field">
                <label htmlFor="village-district">
                  District <span className="text-red-600">*</span>
                </label>
                {village ? (
                  <input
                    id="village-district"
                    value={
                      districts.data.find((option) => option.id === districtId)
                        ?.nameEn ?? village.district
                    }
                    readOnly
                  />
                ) : (
                  <select
                    id="village-district"
                    value={districtId}
                    required
                    onChange={(event) => chooseDistrict(event.target.value)}
                  >
                    <option value="">Select a district</option>
                    {districts.data.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.nameEn}
                        {option.nameMr ? ` · ${option.nameMr}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <div className="field">
              <label htmlFor="village-taluka">
                Taluka <span className="text-red-600">*</span>
              </label>
              {village ? (
                <input
                  id="village-taluka"
                  value={
                    talukas.data?.find((option) => option.id === talukaId)
                      ?.nameEn ?? village.taluka
                  }
                  readOnly
                />
              ) : (
                <select
                  id="village-taluka"
                  value={talukaId}
                  required
                  disabled={!districtId || talukas.isPending}
                  onChange={(event) => chooseTaluka(event.target.value)}
                >
                  <option value="">
                    {districtId
                      ? "Select a taluka"
                      : "Select a district first"}
                  </option>
                  {(talukas.data ?? []).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.nameEn}
                      {option.nameMr ? ` · ${option.nameMr}` : ""}
                    </option>
                  ))}
                </select>
              )}
              {talukas.error && (
                <p role="alert" className="field-error">
                  {talukas.error.message}
                </p>
              )}
            </div>
            {village ? (
              <div className="field">
                <label htmlFor="village-master">
                  Village name <span className="text-red-600">*</span>
                </label>
                <input id="village-master" value={village.name} readOnly />
              </div>
            ) : talukaId ? (
              masterVillages.isPending ? (
                <Skeleton />
              ) : masterVillages.error ? (
                <ErrorState
                  error={masterVillages.error}
                  retry={() => void masterVillages.refetch()}
                />
              ) : (
                <VillageCombobox
                  options={masterVillages.data}
                  value={villageMasterId}
                  disabled={busy || confirm}
                  onChange={chooseVillage}
                />
              )
            ) : (
              <div className="field">
                <label htmlFor="village-master-waiting">
                  Village name <span className="text-red-600">*</span>
                </label>
                <input
                  id="village-master-waiting"
                  disabled
                  placeholder="Select a taluka first"
                />
              </div>
            )}
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
                readOnly={Boolean(village) || Boolean(selected?.nameMr)}
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
              <Button disabled={busy}>
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
            aria-label="Village status"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Village status
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
                    disabled={busy || !dependencies.data || !!dependencies.error}
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
            <p className="text-xs text-slate-400">
              Deactivation keeps users, listings, coordinator assignments, and
              village history while removing the village from active selection.
            </p>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}

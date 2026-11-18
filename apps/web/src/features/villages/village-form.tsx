"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, MapPinPlus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/shared/badge";
import {
  FieldError,
  FormAlert,
  FormDialogFooter,
  FormDialogHeader,
  FormSaveButton,
} from "@/components/shared/form-dialog";
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
        `${option.nameEn} ${option.nameMr ?? ""}`
          .toLowerCase()
          .includes(needle),
      )
    : options;
  const label = selected?.nameEn ?? "";
  return (
    <div className="field">
      <label htmlFor="village-master">
        Village name <span className="text-red-500">*</span>
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
          className="max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
        >
          {shown.length === 0 ? (
            <li className="px-2.5 py-2 text-xs text-slate-500">
              No villages match.
            </li>
          ) : (
            shown.map((option) => {
              const active = option.id === value;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-[#FEF3EA] font-medium text-[#A84E0D]"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
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
              );
            })
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
    if (matchedDistrict.current || !districts.data || !village?.district)
      return;
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
    if (
      matchedTaluka.current ||
      !districtId ||
      !talukas.data ||
      !village?.taluka
    )
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
      option?.nameMr || (id === village?.villageMasterId ? village.nameMr : ""),
    );
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="village-form-dialog sm:max-w-xl">
        <FormDialogHeader
          icon={village ? <MapPin size={19} /> : <MapPinPlus size={19} />}
          title={village ? village.name : "Add Village"}
          className={village ? "mb-2" : undefined}
          description={
            village
              ? "District, taluka, and village names are read-only while editing."
              : "Choose the official district, taluka, and village."
          }
        />
        <form
          className="space-y-5"
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
          <fieldset disabled={busy || confirm} className="space-y-5">
            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      District <span className="text-red-500">*</span>
                    </label>
                    {village ? (
                      <input
                        id="village-district"
                        value={
                          districts.data.find(
                            (option) => option.id === districtId,
                          )?.nameEn ?? village.district
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
                    Taluka <span className="text-red-500">*</span>
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
                    <FieldError>{talukas.error.message}</FieldError>
                  )}
                </div>
                {village ? (
                  <div className="field">
                    <label htmlFor="village-master">
                      Village name <span className="text-red-500">*</span>
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
                      Village name <span className="text-red-500">*</span>
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
                    Village name (Marathi){" "}
                    <span className="text-red-500">*</span>
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
              </div>
            </section>
            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {village && (
                  <div className="field min-w-0 self-start">
                    <label htmlFor="village-coordinates">
                      Coordinates (optional)
                    </label>
                    <input
                      id="village-coordinates"
                      className="h-10 w-full"
                      value={coordinates}
                      onChange={(event) => setCoordinates(event.target.value)}
                      placeholder="16.9944° N, 73.3120° E"
                      aria-describedby="coordinate-help"
                    />
                    <p id="coordinate-help" className="text-xs text-slate-400">
                      Use verified coordinates only. Latitude, longitude. Nearby
                      villages are mapped separately.
                    </p>
                  </div>
                )}
                <div className="field min-w-0 self-start">
                  <label htmlFor="village-pin">PIN code (optional)</label>
                  <input
                    id="village-pin"
                    className="h-10 w-full"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinCode}
                    onChange={(event) => setPinCode(event.target.value)}
                    placeholder="Verified six-digit PIN"
                  />
                </div>
              </div>
            </section>
          </fieldset>
          {(validation || save.error) && (
            <FormAlert>{validation || save.error?.message}</FormAlert>
          )}
          {village && (
            <section
              aria-label="Village status"
              className="rounded-xl border border-slate-200 bg-white"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Village status
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Deactivation keeps users, listings, coordinator assignments,
                    and village history while removing the village from active
                    selection.
                  </p>
                </div>
                <Badge
                  tone={village.status === "active" ? "success" : "neutral"}
                  dot
                  className="shrink-0"
                >
                  {village.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="px-4 py-3">
                {confirm ? (
                  <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <h3 className="text-sm font-semibold text-amber-900">
                      {village.status === "active"
                        ? "Deactivate"
                        : "Reactivate"}{" "}
                      {village.name}?
                    </h3>
                    <p className="text-xs leading-relaxed text-amber-900/75">
                      Users, listings, coordinator assignments and village
                      history will be retained. Deactivation removes the village
                      from active village selection.
                    </p>
                    {dependencies.isPending ? (
                      <Skeleton />
                    ) : dependencies.error ? (
                      <ErrorState
                        error={dependencies.error}
                        retry={() => void dependencies.refetch()}
                      />
                    ) : (
                      <p className="text-xs text-amber-900/75">
                        Linked records: {dependencies.data?.users} users,{" "}
                        {dependencies.data?.listings} listings,{" "}
                        {dependencies.data?.coordinators} coordinator
                        assignments.
                      </p>
                    )}
                    {status.error && (
                      <FieldError>{status.error.message}</FieldError>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
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
                    type="button"
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
              </div>
            </section>
          )}
          {!confirm && (
            <FormDialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </Button>
              <FormSaveButton saving={save.isPending} disabled={busy}>
                {village ? "Save Changes" : "Add Village"}
              </FormSaveButton>
            </FormDialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { MobileVillage } from "@gaavli/types";
import { villagePageSchema } from "@gaavli/validation";
import { api } from "../api";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { DropdownField } from "./ui";
import { VillagePicker, useVillageSearch } from "./VillagePicker";

// A village dropdown with search, for forms (registration, provider details).
export function VillageField({
  label,
  value,
  onChange,
  error,
  disabled = false,
}: {
  label: string;
  value: MobileVillage | null;
  onChange: (village: MobileVillage) => void;
  error?: string;
  disabled?: boolean;
}) {
  const language = useAppStore((state) => state.language);
  const offline = useAppStore((state) => state.offline);
  const t = messages(language);
  const [open, setOpen] = useState(false);
  const { search, setSearch, debouncedSearch, searchPending } =
    useVillageSearch();
  const query = useInfiniteQuery({
    queryKey: ["browse-villages", debouncedSearch],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api(
        `/villages?page=${pageParam}&limit=20&search=${encodeURIComponent(debouncedSearch)}`,
        villagePageSchema,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    enabled: open && !offline,
  });
  return (
    <>
      <DropdownField
        label={label}
        value={
          value ? (language !== "en" ? value.nameMr : value.name) : undefined
        }
        placeholder={t.regVillagePlaceholder}
        disabled={disabled}
        expanded={open}
        error={error}
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
      />
      <VillagePicker
        open={open}
        selected={value}
        search={search}
        searchPending={searchPending}
        query={query}
        title={label}
        offlineHint={t.browsingVillageOffline}
        onSearch={setSearch}
        onClose={() => setOpen(false)}
        onSelect={(village) => {
          onChange(village);
          setOpen(false);
        }}
      />
    </>
  );
}

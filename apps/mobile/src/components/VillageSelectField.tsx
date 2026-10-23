import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { MobileVillage } from "@gaavli/types";
import { villagePageSchema } from "@gaavli/validation";
import { api } from "../api";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { DropdownField } from "./ui";
import { VillagePicker, useVillageSearch } from "./VillagePicker";

export function VillageSelectField({
  selected,
  disabled = false,
  onSelect,
}: {
  selected: MobileVillage | null;
  disabled?: boolean;
  onSelect: (village: MobileVillage) => void;
}) {
  const language = useAppStore((state) => state.language);
  const offline = useAppStore((state) => state.offline);
  const t = messages(language);
  const [open, setOpen] = useState(false);
  const { search, setSearch, debouncedSearch, searchPending } =
    useVillageSearch();
  const query = useInfiniteQuery({
    queryKey: ["guest-villages", debouncedSearch],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api(
        `/villages?page=${pageParam}&limit=20&search=${encodeURIComponent(debouncedSearch)}`,
        villagePageSchema,
        {
          signal,
        },
      ),
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    enabled: open && !offline,
  });
  const villageName = (village: MobileVillage) =>
    language === "mr" ? village.nameMr : village.name;
  return (
    <>
      <DropdownField
        label={t.villageLabel}
        value={selected ? villageName(selected) : undefined}
        placeholder={t.villageTitle}
        expanded={open}
        disabled={disabled}
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
      />
      <VillagePicker
        open={open}
        selected={selected}
        search={search}
        searchPending={searchPending}
        query={query}
        onSearch={setSearch}
        onClose={() => setOpen(false)}
        onSelect={(village) => {
          onSelect(village);
          setOpen(false);
        }}
      />
    </>
  );
}

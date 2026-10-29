import type { z } from "zod";
import type { directoryEntrySchema } from "@gaavli/validation";
import type { HomeListing } from "../types/home";

export function directoryPreview(
  entry: z.infer<typeof directoryEntrySchema>,
  now = Date.now(),
): HomeListing {
  return {
    id: entry.id,
    module: entry.module,
    name: entry.name,
    nameMr: entry.nameMr || entry.name,
    description: entry.description,
    category: entry.category,
    categoryMr: entry.category,
    price: entry.price,
    unit: entry.unit,
    availableQuantity: null,
    village: entry.village.name,
    villageMr: entry.village.nameMr || entry.village.name,
    sellerName: "",
    sellerNameMr: "",
    postedMinutesAgo: Math.max(
      0,
      Math.floor((now - Date.parse(entry.createdAt)) / 60000),
    ),
    image: null,
  };
}

import { productMasterPageSchema } from "@gaavli/validation";

export async function loadMasterProducts(options: {
  storage: {
    read(): Promise<string | null>;
    write(value: string): Promise<void>;
  };
  fetch: () => Promise<unknown>;
  offline: boolean;
}) {
  if (!options.offline) {
    try {
      const page = productMasterPageSchema.parse(await options.fetch());
      await options.storage.write(JSON.stringify(page)).catch(() => undefined);
      return { ...page, cached: false };
    } catch {
      /* Validated reference cache remains usable during outages. */
    }
  }
  const saved = await options.storage.read();
  if (!saved) throw new Error("PRODUCT_MASTER_UNAVAILABLE");
  return { ...productMasterPageSchema.parse(JSON.parse(saved)), cached: true };
}
export function matchesProductSearch(names: string, search: string) {
  const normalized = names.normalize("NFKC").toLocaleLowerCase();
  return search
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => normalized.includes(term));
}

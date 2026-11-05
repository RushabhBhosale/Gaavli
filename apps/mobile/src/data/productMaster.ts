import {
  catalogSearchPageSchema,
  productMasterPageSchema,
} from "@gaavli/validation";
import { editDistance, maxEdits } from "@gaavli/utils";

function parseCachedMasterProducts(value: string) {
  const stored = JSON.parse(value) as {
    products?: Record<string, unknown>[];
  };
  return productMasterPageSchema.parse({
    ...stored,
    products: stored.products?.map((product) => ({
      ...product,
      nameHi: product.nameHi ?? null,
    })),
  });
}

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
  return { ...parseCachedMasterProducts(saved), cached: true };
}

export async function searchMasterProducts(options: {
  storage: {
    read(): Promise<string | null>;
    write(value: string): Promise<void>;
  };
  fetch: (search: string, signal?: AbortSignal) => Promise<unknown>;
  offline: boolean;
  search: string;
  signal?: AbortSignal;
}) {
  const search = options.search.trim();
  if (!search) return { products: [], didYouMean: null, cached: false };

  if (!options.offline) {
    try {
      const result = catalogSearchPageSchema.parse({
        didYouMean: null,
        ...((await options.fetch(search, options.signal)) as object),
      });
      const page = { products: result.products };
      const stored = await options.storage.read().catch(() => null);
      let products = productMasterPageSchema.parse({ products: [] }).products;
      if (stored) {
        try {
          products = parseCachedMasterProducts(stored).products;
        } catch {
          products = [];
        }
      }
      const byId = new Map(
        products.map((product) => [product.productId, product]),
      );
      for (const product of page.products) {
        byId.delete(product.productId);
        byId.set(product.productId, product);
      }
      const merged = Array.from(byId.values())
        .slice(-1000)
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
        );
      await options.storage
        .write(JSON.stringify({ products: merged }))
        .catch(() => undefined);
      return { ...page, didYouMean: result.didYouMean, cached: false };
    } catch (error) {
      if (options.signal?.aborted) throw error;
      /* Search can fall back to validated reference data saved on this device. */
    }
  }

  const saved = await options.storage.read();
  if (!saved) throw new Error("PRODUCT_MASTER_UNAVAILABLE");
  const page = parseCachedMasterProducts(saved);
  return {
    products: page.products.filter((product) =>
      matchesProductSearch(
        [product.nameEn, product.nameMr, product.nameHi]
          .filter(Boolean)
          .join(" "),
        search,
      ),
    ),
    didYouMean: null,
    cached: true,
  };
}

function typoOf(token: string, word: string) {
  const allowed = maxEdits(Array.from(token).length);
  return allowed > 0 && editDistance(token, word, allowed) <= allowed;
}

// Every typed word must match: as part of a name, or as a close misspelling of
// one of its words. Word order does not matter.
export function matchesProductSearch(names: string, search: string) {
  const normalized = names.normalize("NFKC").toLocaleLowerCase();
  const words = normalized.split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
  return search
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every(
      (term) =>
        normalized.includes(term) || words.some((word) => typoOf(term, word)),
    );
}

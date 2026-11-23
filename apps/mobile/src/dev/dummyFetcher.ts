import data from "./dummyData.json";

// Development-only stand-in for the Gaavli API. Enabled by
// EXPO_PUBLIC_USE_DUMMY_DATA=true in a __DEV__ build; never used otherwise.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const ok = (payload: unknown) => json({ success: true, data: payload });

function pageOf<T>(items: T[], page: number, limit: number) {
  return items.slice((page - 1) * limit, page * limit);
}

export const dummyFetcher: typeof fetch = async (input) => {
  const url = new URL(String(input));
  const path = url.pathname.replace(/^\/api\/v1/, "");
  const q = url.searchParams;
  const page = Number(q.get("page") ?? 1);
  const limit = Number(q.get("limit") ?? 20);

  if (path === "/health") return ok({ status: "ok" });

  if (path === "/villages/mapped") return ok({ villages: data.villages });

  if (path === "/villages") {
    const search = (q.get("search") ?? "").toLowerCase();
    const found = data.villages.filter(
      (v) =>
        v.name.toLowerCase().includes(search) || v.nameMr.includes(search),
    );
    return ok({
      villages: pageOf(found, page, limit),
      page,
      total: found.length,
      limit,
    });
  }

  if (path === "/listings") {
    const search = (q.get("search") ?? "").toLowerCase();
    const group = q.get("productGroup");
    const found = data.listings.filter(
      (l) =>
        (!search ||
          l.productName.toLowerCase().includes(search) ||
          (l.productNameMr ?? "").includes(search)) &&
        (!group || l.category === group),
    );
    return ok({
      allProductCount: data.listings.length,
      productGroupCounts: data.productGroupCounts,
      villageCounts: [],
      listings: pageOf(found, page, limit),
      total: found.length,
      page,
      limit,
      categories: data.categories,
      isSeller: false,
    });
  }

  if (path === "/dashboard")
    return ok({
      coordinator: data.coordinator,
      services: {
        entries: data.services,
        total: data.services.length,
        page: 1,
        limit: 50,
      },
      transport: {
        entries: data.transport,
        total: data.transport.length,
        page: 1,
        limit: 50,
      },
    });

  if (path === "/directory/summary")
    return ok(
      q.get("module") === "transport"
        ? data.transportSummary
        : data.servicesSummary,
    );

  if (path === "/directory/product-shops")
    return ok({
      product: null,
      haveIt: { entries: [], total: 0 },
      sellsGroup: { entries: [], total: 0 },
    });

  if (path === "/directory") {
    const module = q.get("module") === "transport" ? "transport" : "services";
    const search = (q.get("search") ?? "").toLowerCase();
    const category = q.get("category");
    const found = (module === "transport" ? data.transport : data.services)
      .filter(
        (e) =>
          (!search || e.name.toLowerCase().includes(search)) &&
          (!category || e.providerType === category),
      );
    return ok({
      entries: pageOf(found, page, limit),
      total: found.length,
      page,
      limit,
    });
  }

  const entryMatch = path.match(/^\/directory\/([a-f0-9]{24})(\/products)?$/);
  if (entryMatch) {
    if (entryMatch[2]) return ok({ groups: [], products: [] });
    const entry = [...data.services, ...data.transport].find(
      (e) => e.id === entryMatch[1],
    );
    if (entry) return ok(entry);
  }

  return json(
    {
      success: false,
      error: {
        code: "DUMMY_DATA_UNAVAILABLE",
        message: `No dummy data for ${path}`,
      },
    },
    404,
  );
};

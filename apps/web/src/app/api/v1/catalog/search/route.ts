import { z } from "zod";
import { catalogSearchPageSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { limitRequests } from "@/server/repositories/mobile";
import { searchCatalog } from "@/server/repositories/catalog-search";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";

export const runtime = "nodejs";
const querySchema = z
  .object({
    q: z.string().trim().min(1).max(80),
    limit: z.coerce.number().int().min(1).max(20).default(10),
  })
  .strict();

export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const user = await requireMobile(request);
    await limitRequests("catalog-search", String(user._id), 240, 60_000);
    return ok(
      catalogSearchPageSchema.parse(await searchCatalog(query.q, query.limit)),
    );
  });
}

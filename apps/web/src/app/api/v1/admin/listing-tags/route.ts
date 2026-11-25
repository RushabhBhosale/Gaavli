import { adminListingTagCreateSchema } from "@/schemas";
import {
  createListingTag,
  listAdminListingTags,
} from "@/server/services/listing-tags";
import { endpoint, jsonBody, ok } from "@/server/utils/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return endpoint(request, async () => ok(await listAdminListingTags()));
}

export async function POST(request: Request) {
  return endpoint(request, async (admin) =>
    ok(
      await createListingTag(
        admin.id,
        adminListingTagCreateSchema.parse(await jsonBody(request)),
      ),
      201,
    ),
  );
}

import { usersQuerySchema, userSchema } from "@/schemas";
import { listUsers, saveUser } from "@/server/services/users";
import { endpoint, jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(request, async () =>
    ok(
      await listUsers(
        usersQuerySchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    ),
  );
}
export async function POST(request: Request) {
  return endpoint(request, async (admin) =>
    ok(
      await saveUser(admin.id, userSchema.parse(await jsonBody(request))),
      201,
    ),
  );
}

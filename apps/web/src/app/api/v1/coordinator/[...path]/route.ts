import {
  coordinatorQuerySchema,
  coordinatorBuyerSchema,
  coordinatorUserEditSchema,
  coordinatorConnectionInputSchema,
  coordinatorReportActionSchema,
  coordinatorActivityIdSchema,
  listingIdSchema,
  listingOperationKeySchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import * as coordinator from "@/server/services/coordinator";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";
import { AppError } from "@/server/utils/errors";
export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
function dispatch(request: Request, context: Context) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const actorId = String(user._id);
    // Role/assignment checks are authoritative and never read from client DTOs.
    await coordinator.coordinatorScope(actorId);
    const { path } = await context.params;
    const query = coordinatorQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const [resource, rawId, subresource, rawConnectionId] = path;
    const id = rawId
      ? resource === "activity"
        ? coordinatorActivityIdSchema.parse(rawId)
        : listingIdSchema.parse(rawId)
      : undefined;
    const village = await coordinator.coordinatorScope(
      actorId,
      resource === "villages" ? id : query.villageId,
    );
    const villageId = String(village._id);
    const scopedQuery = { ...query, villageId };
    const key = () =>
      listingOperationKeySchema.parse(request.headers.get("idempotency-key"));
    if (request.method === "GET") {
      if (path.length === 1 && resource === "dashboard")
        return ok(await coordinator.coordinatorDashboard(actorId, scopedQuery));
      if (path.length === 1 && ["users", "buyers"].includes(resource))
        return ok(
          await coordinator.coordinatorUsers(
            actorId,
            resource === "buyers"
              ? { ...scopedQuery, filter: "preregistered" }
              : scopedQuery,
          ),
        );
      if (path.length === 2 && resource === "users")
        return ok(await coordinator.coordinatorUser(actorId, scopedQuery, id!));
      if (
        path.length === 3 &&
        resource === "villages" &&
        subresource === "connections"
      )
        return ok(
          await coordinator.coordinatorConnections(
            actorId,
            scopedQuery,
            villageId,
          ),
        );
      if (
        path.length === 3 &&
        resource === "villages" &&
        subresource === "candidates"
      )
        return ok(
          await coordinator.coordinatorCandidates(
            actorId,
            scopedQuery,
            villageId,
          ),
        );
      if (path.length <= 2 && resource === "activity")
        return ok(
          await coordinator.coordinatorActivity(actorId, scopedQuery, id),
        );
      if (path.length === 1 && resource === "reports")
        return ok(await coordinator.coordinatorReports(actorId, scopedQuery));
      if (path.length === 2 && resource === "reports")
        return ok(
          await coordinator.coordinatorReport(actorId, scopedQuery, id!),
        );
      if (path.length === 2 && resource === "listings")
        return ok(
          await coordinator.coordinatorListing(actorId, scopedQuery, id!),
        );
    }
    if (
      request.method === "POST" &&
      path.length === 1 &&
      resource === "buyers"
    ) {
      const input = coordinatorBuyerSchema.parse(await jsonBody(request));
      const result = await coordinator.coordinatorAddBuyer(
        actorId,
        villageId,
        key(),
        input,
      );
      return ok(result.data, result.status);
    }
    if (
      request.method === "PATCH" &&
      path.length === 2 &&
      resource === "users"
    ) {
      const input = coordinatorUserEditSchema.parse(await jsonBody(request));
      const result = await coordinator.coordinatorEditUser(
        actorId,
        villageId,
        id!,
        key(),
        input,
      );
      return ok(result.data, result.status);
    }
    if (
      request.method === "POST" &&
      path.length === 3 &&
      resource === "villages" &&
      subresource === "connections"
    ) {
      const input = coordinatorConnectionInputSchema.parse(
        await jsonBody(request),
      );
      const result = await coordinator.coordinatorConnect(
        actorId,
        villageId,
        key(),
        input,
      );
      return ok(result.data, result.status);
    }
    if (
      request.method === "DELETE" &&
      path.length === 4 &&
      resource === "villages" &&
      subresource === "connections"
    ) {
      const result = await coordinator.coordinatorDisconnect(
        actorId,
        villageId,
        listingIdSchema.parse(rawConnectionId),
        key(),
      );
      return ok(result.data, result.status);
    }
    if (
      request.method === "PATCH" &&
      path.length === 2 &&
      resource === "reports"
    ) {
      const input = coordinatorReportActionSchema.parse(
        await jsonBody(request),
      );
      const result = await coordinator.coordinatorModerate(
        actorId,
        villageId,
        id!,
        key(),
        input,
      );
      return ok(result.data, result.status);
    }
    throw new AppError(404, "NOT_FOUND", "Endpoint unavailable.");
  });
}
export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;

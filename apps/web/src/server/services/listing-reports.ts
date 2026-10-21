import "server-only";
import { Listing, AuditLog } from "../models";
import { VillageReport } from "../models/coordinator";
import { visibleSellerContact } from "../repositories/listing-contact";
import { listingOperation } from "../repositories/listing-mutations";
import { limitRequests } from "../repositories/mobile";
import { AppError } from "../utils/errors";

export async function reportListing(
  userId: string,
  id: string,
  key: string,
  reason: string,
) {
  await VillageReport.init();
  await limitRequests("listing-report", userId, 20, 3600000);
  return listingOperation(
    userId,
    key,
    `report-listing:${id}`,
    { reason },
    async (session, user) => {
      if (
        !user.village ||
        !(await visibleSellerContact(id, String(user.village), session))
      )
        throw new AppError(404, "LISTING_UNAVAILABLE", "Listing unavailable.");
      const listing = await Listing.findById(id).session(session);
      if (!listing || String(listing.seller) === userId)
        throw new AppError(403, "FORBIDDEN", "Cannot report your own listing.");
      let report = await VillageReport.findOne({
        listingId: id,
        reporterId: userId,
        status: { $in: ["pending", "flagged", "escalated"] },
      }).session(session);
      if (report && report.reason !== reason)
        throw new AppError(
          409,
          "REPORT_ALREADY_EXISTS",
          "A complaint for this listing is already open.",
        );
      if (!report) {
        [report] = await VillageReport.create(
          [
            {
              villageId: listing.village,
              listingId: id,
              reporterId: userId,
              productName: listing.productName,
              reason,
              status: "pending",
            },
          ],
          { session },
        );
        await AuditLog.create(
          [
            {
              actorUserId: userId,
              villageId: listing.village,
              targetId: report._id,
              action: "report.created",
              targetName: listing.productName,
            },
          ],
          { session },
        );
      }
      return { status: 200, data: { id: String(report._id), confirmed: true } };
    },
  );
}

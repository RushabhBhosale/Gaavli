import "server-only";
import {
  indianMobileSchema,
  sellerContactSchema,
  sellerDetailsSchema,
} from "@gaavli/validation";
import { connectMobileDb } from "../db/mobile";
import { User, Village } from "../models";
import { ListingInterest } from "../models/listing-interest";
import {
  visibleSellerContact,
  recordListingInterest,
} from "../repositories/listing-contact";
import { limitRequests } from "../repositories/mobile";
import { AppError } from "../utils/errors";

export async function revealListingContact(
  userId: string,
  id: string,
  mode: "record" | "restore" | "view" = "record",
) {
  await connectMobileDb();
  await ListingInterest.init();
  await limitRequests(
    mode === "record" ? "listing-contact" : "listing-contact-read",
    userId,
    mode === "record" ? 60 : 120,
    3600_000,
  );
  for (let attempt = 0; ; attempt++) {
    try {
      return await User.db.transaction(async (session) => {
        const user = await User.findOne({
          _id: userId,
          status: "active",
        }).session(session);
        if (!user) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
        if (
          !user.village ||
          !(await Village.exists({ _id: user.village, isActive: true }).session(
            session,
          ))
        )
          throw new AppError(
            422,
            "VILLAGE_UNAVAILABLE",
            "Select an active village.",
          );
        const row = await visibleSellerContact(
          id,
          String(user.village),
          session,
        );
        if (!row)
          throw new AppError(
            404,
            "LISTING_UNAVAILABLE",
            "This listing is unavailable.",
          );
        if (row.sellerId === userId)
          throw new AppError(
            403,
            "OWN_LISTING_CONTACT",
            "This is your own listing.",
          );
        if (
          mode === "restore" &&
          !(await ListingInterest.exists({ userId, listingId: id }).session(
            session,
          ))
        )
          return { listingId: id, interested: false as const };
        const mobile = indianMobileSchema.safeParse(row.mobile);
        if (!mobile.success)
          throw new AppError(
            422,
            "CONTACT_UNAVAILABLE",
            "Seller contact is unavailable.",
          );
        const dto = sellerContactSchema.parse({
          listingId: id,
          interested: true,
          seller: { name: row.name, mobile: `+91${mobile.data}` },
        });
        if (mode === "view")
          return sellerDetailsSchema.parse({
            listingId: id,
            seller: dto.seller,
          });
        if (mode === "record") await recordListingInterest(userId, id, session);
        return dto;
      });
    } catch (error) {
      // Concurrent first taps can race on the natural listing/buyer key.
      if (
        attempt < 2 &&
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      )
        continue;
      throw error;
    }
  }
}

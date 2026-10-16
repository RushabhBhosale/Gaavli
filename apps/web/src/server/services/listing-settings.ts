import "server-only";
import type { z } from "zod";
import type { listingSettingsInputSchema } from "@gaavli/validation";
import { ListingSettings } from "../models/listing-operations";
import { AuditLog } from "../models";
import { connectDb } from "../db/connect";
import { AppError } from "../utils/errors";
export async function getListingSettings() {
  await connectDb();
  const row = await ListingSettings.findById("listing-policy").lean();
  return {
    activeListingLimit: row?.activeListingLimit || 10,
    version: row?.version || 0,
  };
}
export async function setListingSettings(
  actorId: string,
  input: z.infer<typeof listingSettingsInputSchema>,
) {
  await connectDb();
  await Promise.all([ListingSettings.init(), AuditLog.init()]);
  try {
    return await ListingSettings.db.transaction(async (session) => {
      const existing =
        await ListingSettings.findById("listing-policy").session(session);
      if ((existing?.version || 0) !== input.version)
        throw new AppError(
          409,
          "STALE_VERSION",
          "Settings changed. Reload them before editing.",
        );
      if (existing) {
        existing.activeListingLimit = input.activeListingLimit;
        existing.version += 1;
        await existing.save({ session });
      } else
        await ListingSettings.create(
          [
            {
              _id: "listing-policy",
              activeListingLimit: input.activeListingLimit,
              version: 1,
            },
          ],
          { session },
        );
      await AuditLog.create([{ actorId, action: "LISTING_LIMIT_UPDATED" }], {
        session,
      });
      return {
        activeListingLimit: input.activeListingLimit,
        version: input.version + 1,
      };
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      throw new AppError(
        409,
        "STALE_VERSION",
        "Settings changed. Reload them before editing.",
      );
    throw error;
  }
}

import "server-only";
import mongoose, { Schema, type InferSchemaType } from "mongoose";
const operationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    key: { type: String, required: true },
    scope: { type: String, required: true },
    requestHash: { type: String, required: true },
    response: { type: Schema.Types.Mixed, required: true },
    responseStatus: { type: Number, required: true },
  },
  { timestamps: true },
);
operationSchema.index({ user: 1, key: 1 }, { unique: true });
const eventSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listing: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    action: {
      type: String,
      enum: ["created", "updated", "deactivated", "sold_out", "relisted"],
      required: true,
    },
    version: { type: Number, required: true },
  },
  { timestamps: true },
);
eventSchema.index({ listing: 1, createdAt: -1 });
const settingsSchema = new Schema(
  {
    _id: { type: String, default: "listing-policy" },
    activeListingLimit: { type: Number, min: 1, max: 1000, default: 10 },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);
export const ListingOperation =
  (mongoose.models.ListingOperation as mongoose.Model<
    InferSchemaType<typeof operationSchema>
  >) || mongoose.model("ListingOperation", operationSchema);
export const ListingEvent =
  (mongoose.models.ListingEvent as mongoose.Model<
    InferSchemaType<typeof eventSchema>
  >) || mongoose.model("ListingEvent", eventSchema);
export const ListingSettings =
  (mongoose.models.ListingSettings as mongoose.Model<
    InferSchemaType<typeof settingsSchema>
  >) || mongoose.model("ListingSettings", settingsSchema);

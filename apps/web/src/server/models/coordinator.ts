import "server-only";
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const connectionSchema = new Schema(
  {
    sourceVillageId: {
      type: Schema.Types.ObjectId,
      ref: "Village",
      required: true,
    },
    targetVillageId: {
      type: Schema.Types.ObjectId,
      ref: "Village",
      required: true,
    },
    active: { type: Boolean, default: true, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, collection: "villageRelationships" },
);
connectionSchema.index(
  { sourceVillageId: 1, targetVillageId: 1 },
  { unique: true },
);
connectionSchema.index({ targetVillageId: 1, active: 1 });
connectionSchema.index({ sourceVillageId: 1, active: 1 });
export const VillageConnection =
  (mongoose.models.VillageConnection as mongoose.Model<
    InferSchemaType<typeof connectionSchema>
  >) || mongoose.model("VillageConnection", connectionSchema);

const reportSchema = new Schema(
  {
    villageId: { type: Schema.Types.ObjectId, ref: "Village", required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    productName: { type: String, required: true },
    reason: { type: String, required: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "dismissed", "flagged", "hidden", "escalated"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true, optimisticConcurrency: true, collection: "reports" },
);
reportSchema.index({ villageId: 1, status: 1, createdAt: -1, _id: -1 });
export const VillageReport =
  (mongoose.models.VillageReport as mongoose.Model<
    InferSchemaType<typeof reportSchema>
  >) || mongoose.model("VillageReport", reportSchema);

import "server-only";
import mongoose, { Schema, type InferSchemaType } from "mongoose";

// Self-declared directory entries; transport is a static directory, not dispatch.
const serviceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    villageId: { type: Schema.Types.ObjectId, ref: "Village", required: true },
    module: {
      type: String,
      enum: ["services", "transport"],
      default: "services",
    },
    profession: { type: String, required: true, trim: true, maxlength: 120 },
    professionMr: { type: String, trim: true, maxlength: 120 },
    professionCode: String,
    serviceCategory: {
      type: String,
      enum: ["Utility", "Medical", "Shop", "Other"],
      default: "Other",
    },
    // Set when the entry is the public face of a registered provider profile.
    profileId: { type: Schema.Types.ObjectId, ref: "ProviderProfile" },
    providerType: String,
    // Public phone numbers, in the order villagers should try them.
    contacts: {
      type: [
        new Schema(
          {
            label: String,
            mobile: String,
            whatsapp: { type: Boolean, default: false },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    images: { type: [String], default: [] },
    description: { type: String, trim: true, maxlength: 2000 },
    keywords: [String],
    price: { type: Number, min: 0 },
    unit: { type: String, trim: true, maxlength: 30 },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    available: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "services" },
);
serviceSchema.index({
  villageId: 1,
  module: 1,
  status: 1,
  createdAt: -1,
  _id: -1,
});
serviceSchema.index({ userId: 1 });
serviceSchema.index({ profileId: 1 }, { unique: true, sparse: true });
export const Service =
  (mongoose.models.Service as mongoose.Model<
    InferSchemaType<typeof serviceSchema>
  >) || mongoose.model("Service", serviceSchema);

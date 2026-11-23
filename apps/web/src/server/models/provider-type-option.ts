import "server-only";
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const nameSchema = new Schema(
  {
    en: { type: String, required: true, trim: true, maxlength: 160 },
    mr: { type: String, required: true, trim: true, maxlength: 160 },
    hi: { type: String, required: true, trim: true, maxlength: 160 },
  },
  { _id: false },
);
const schema = new Schema(
  {
    code: { type: String, required: true, unique: true, immutable: true },
    name: { type: nameSchema, required: true },
    sortOrder: { type: Number, min: 0, max: 1000000, default: 0, required: true },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true, optimisticConcurrency: true, collection: "providerTypeOptions" },
);
export const ProviderTypeOption =
  (mongoose.models.ProviderTypeOption as mongoose.Model<
    InferSchemaType<typeof schema>
  >) || mongoose.model("ProviderTypeOption", schema);

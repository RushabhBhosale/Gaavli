import "server-only";
import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { ProviderType, PROVIDER_MASTER_TYPES } from "@gaavli/constants";

const names = new Schema(
  {
    en: { type: String, required: true, trim: true, maxlength: 160 },
    mr: { type: String, required: true, trim: true, maxlength: 160 },
    hi: { type: String, required: true, trim: true, maxlength: 160 },
  },
  { _id: false },
);
const schema = new Schema(
  {
    providerType: {
      type: String,
      enum: Object.values(ProviderType),
      required: true,
      immutable: true,
    },
    masterType: {
      type: String,
      enum: PROVIDER_MASTER_TYPES,
      required: true,
      immutable: true,
    },
    code: { type: String, required: true, immutable: true, maxlength: 80 },
    name: { type: names, required: true },
    normalizedName: { type: names, required: true },
    isActive: { type: Boolean, default: true, required: true },
    sortOrder: { type: Number, default: 0, min: 0, required: true },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    collection: "providerMasters",
  },
);
schema.index({ providerType: 1, masterType: 1, code: 1 }, { unique: true });
for (const language of ["en", "mr", "hi"])
  schema.index(
    { providerType: 1, masterType: 1, [`normalizedName.${language}`]: 1 },
    { unique: true },
  );
schema.index({
  providerType: 1,
  masterType: 1,
  isActive: 1,
  sortOrder: 1,
  "name.en": 1,
});
export const ProviderMaster =
  (mongoose.models.ProviderMaster as mongoose.Model<
    InferSchemaType<typeof schema>
  >) || mongoose.model("ProviderMaster", schema);

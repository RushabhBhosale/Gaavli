import "server-only";
import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { LISTING_PRODUCT_GROUPS } from "@gaavli/constants";

const schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 80,
    },
    nameMr: { type: String, required: true, trim: true, maxlength: 120 },
    nameEn: { type: String, required: true, trim: true, maxlength: 120 },
    productGroup: {
      type: String,
      required: true,
      enum: LISTING_PRODUCT_GROUPS,
    },
    defaultUnit: { type: String, required: true, trim: true, maxlength: 30 },
    status: {
      type: String,
      required: true,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    sortOrder: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, collection: "productMasters" },
);
schema.index({ status: 1, sortOrder: 1, code: 1 });
export const ProductMaster =
  (mongoose.models.ProductMaster as mongoose.Model<
    InferSchemaType<typeof schema>
  >) || mongoose.model("ProductMaster", schema);

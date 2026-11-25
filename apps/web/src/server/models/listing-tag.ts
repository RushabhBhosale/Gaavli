import "server-only";
import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { LISTING_PRODUCT_GROUPS } from "@gaavli/constants";

// A quality tag sellers can put on a listing ("Organic", "Desi", ...). The id
// is permanent because listings store it; labels and where the tag is offered
// can change at any time.
const schema = new Schema(
  {
    tagId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[a-z][a-z0-9_]{1,39}$/,
    },
    en: { type: String, required: true, trim: true, maxlength: 40 },
    mr: { type: String, required: true, trim: true, maxlength: 40 },
    hi: { type: String, required: true, trim: true, maxlength: 40 },
    groups: { type: [String], enum: LISTING_PRODUCT_GROUPS, default: [] },
    status: {
      type: String,
      required: true,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    sortOrder: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true, collection: "listingTags" },
);
schema.index({ status: 1, sortOrder: 1, tagId: 1 });
export const ListingTagModel =
  (mongoose.models.ListingTag as mongoose.Model<
    InferSchemaType<typeof schema>
  >) || mongoose.model("ListingTag", schema);

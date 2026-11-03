import "server-only";
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const schema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "ProductMaster",
      required: true,
    },
    term: { type: String, required: true, maxlength: 120 },
    kind: { type: String, enum: ["name", "alias", "word"], required: true },
    deletions: { type: [String], default: [] },
    // Sounds-alike keys: spelling-neutral form and consonant skeleton.
    key: { type: String, default: "" },
    skel: { type: String, default: "" },
  },
  { collection: "catalogSearchTerms", versionKey: false },
);
schema.index({ product: 1, term: 1 }, { unique: true });
schema.index({ term: 1, product: 1 });
schema.index({ deletions: 1, product: 1 });
schema.index({ key: 1, product: 1 });
schema.index({ skel: 1, product: 1 });
export const CatalogSearchTerm =
  (mongoose.models.CatalogSearchTerm as mongoose.Model<
    InferSchemaType<typeof schema>
  >) || mongoose.model("CatalogSearchTerm", schema);

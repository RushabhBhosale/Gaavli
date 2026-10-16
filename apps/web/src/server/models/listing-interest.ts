import mongoose, { Schema, type InferSchemaType } from "mongoose";

const schema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, collection: "interests" },
);
schema.index({ listingId: 1, userId: 1 }, { unique: true });
export const ListingInterest =
  (mongoose.models.ListingInterest as mongoose.Model<
    InferSchemaType<typeof schema>
  >) || mongoose.model("ListingInterest", schema);

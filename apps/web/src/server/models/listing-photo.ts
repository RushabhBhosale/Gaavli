import "server-only";
import mongoose, { Schema, type InferSchemaType } from "mongoose";

// Immutable publication record: the existing API key resolves to a GridFS ID.
const schema = new Schema(
  {
    _id: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileId: { type: Schema.Types.ObjectId, required: true, unique: true },
    digest: { type: String, required: true },
    state: {
      type: String,
      enum: ["ready", "deleting", "deleted"],
      default: "ready",
      required: true,
    },
    revision: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const ListingPhoto =
  (mongoose.models.ListingPhoto as mongoose.Model<
    InferSchemaType<typeof schema>
  >) || mongoose.model("ListingPhoto", schema);

import "server-only";
import mongoose, { Schema, type InferSchemaType } from "mongoose";

// A village one person added next to their own. It only widens what that
// user sees; nobody else in either village is affected.
const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
  },
  { timestamps: true, collection: "userVillageMappings" },
);
schema.index(
  { userId: 1, sourceVillageId: 1, targetVillageId: 1 },
  { unique: true },
);
export const UserVillageMapping =
  (mongoose.models.UserVillageMapping as mongoose.Model<
    InferSchemaType<typeof schema>
  >) || mongoose.model("UserVillageMapping", schema);

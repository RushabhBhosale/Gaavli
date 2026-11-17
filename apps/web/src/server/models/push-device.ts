import "server-only";
import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { MOBILE_LANGUAGES } from "@gaavli/constants";

const pushDeviceSchema = new Schema({
  // An FCM registration belongs to a single installation and can move accounts.
  _id: { type: String, required: true },
  sessionId: { type: Schema.Types.ObjectId, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  language: { type: String, enum: MOBILE_LANGUAGES, required: true },
  registeredAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});
pushDeviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PushDevice =
  (mongoose.models.PushDevice as mongoose.Model<
    InferSchemaType<typeof pushDeviceSchema>
  >) || mongoose.model("PushDevice", pushDeviceSchema);

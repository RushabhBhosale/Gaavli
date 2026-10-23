import mongoose, { Schema, type InferSchemaType } from "mongoose";

const challengeSchema = new Schema({
  mobile: { type: String, required: true, unique: true },
  challengeId: { type: String, required: true, unique: true },
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  language: { type: String, enum: ["mr", "en"], required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
  resendAt: { type: Date, required: true },
  consumed: { type: Boolean, default: false },
  deleteAt: { type: Date, required: true },
});
challengeSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });
const sessionSchema = new Schema(
  {
    provider: { type: String, required: true, enum: ["test"] },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accessHash: { type: String, required: true, unique: true },
    refreshHash: { type: String, required: true, unique: true },
    accessExpiresAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const phoneChangeSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  challengeId: { type: String, required: true, unique: true },
  oldMobile: { type: String, required: true },
  mobile: { type: String, required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
  resendAt: { type: Date, required: true },
  consumed: { type: Boolean, default: false },
  deleteAt: { type: Date, required: true },
});
phoneChangeSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });
export const MobilePhoneChange =
  (mongoose.models.MobilePhoneChange as mongoose.Model<
    InferSchemaType<typeof phoneChangeSchema>
  >) || mongoose.model("MobilePhoneChange", phoneChangeSchema);
const limitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
limitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const eventSchema = new Schema(
  {
    challengeId: String,
    action: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
eventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const OtpChallenge =
  (mongoose.models.MobileOtpChallenge as mongoose.Model<
    InferSchemaType<typeof challengeSchema>
  >) || mongoose.model("MobileOtpChallenge", challengeSchema);
export const MobileSession =
  (mongoose.models.MobileSession as mongoose.Model<
    InferSchemaType<typeof sessionSchema>
  >) || mongoose.model("MobileSession", sessionSchema);
export const MobileRateLimit =
  (mongoose.models.MobileRateLimit as mongoose.Model<
    InferSchemaType<typeof limitSchema>
  >) || mongoose.model("MobileRateLimit", limitSchema);
export const MobileAuthEvent =
  (mongoose.models.MobileAuthEvent as mongoose.Model<
    InferSchemaType<typeof eventSchema>
  >) || mongoose.model("MobileAuthEvent", eventSchema);

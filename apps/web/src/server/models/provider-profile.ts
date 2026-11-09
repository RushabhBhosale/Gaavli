import "server-only";
import mongoose, { Schema, type InferSchemaType } from "mongoose";
import {
  CLAIM_STATUSES,
  CONTACT_LABELS,
  LINK_STATUSES,
  PROVIDER_STATUSES,
  ProviderType,
} from "@gaavli/constants";

// A shop, service, doctor, facility, institution, organisation, helper or
// office that a villager registered. The public directory entry (Service) is
// a projection of this record.
const contactSchema = new Schema(
  {
    label: {
      type: String,
      enum: CONTACT_LABELS.map((item) => item.id),
      required: true,
    },
    mobile: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    whatsapp: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
  },
  { _id: false },
);
const profileSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    providerType: {
      type: String,
      enum: Object.values(ProviderType),
      required: true,
      immutable: true,
    },
    villageId: { type: Schema.Types.ObjectId, ref: "Village", required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Lowercase, spacing and punctuation removed: used to spot duplicates.
    nameKey: { type: String, required: true },
    address: { type: String, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 1500 },
    contacts: { type: [contactSchema], default: [] },
    details: { type: Schema.Types.Mixed, default: {} },
    // Doctors: how they practise, and the facility they are linked to.
    practiceMode: {
      type: String,
      enum: ["existing_facility", "own_clinic", "home_visits"],
    },
    facilityId: { type: Schema.Types.ObjectId, ref: "ProviderProfile" },
    status: { type: String, enum: PROVIDER_STATUSES, default: "ACTIVE" },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    collection: "providerProfiles",
  },
);
profileSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
profileSchema.index({ villageId: 1, providerType: 1, status: 1 });
profileSchema.index({ villageId: 1, "contacts.mobile": 1 });
profileSchema.index({ villageId: 1, nameKey: 1 });
export const ProviderProfile =
  (mongoose.models.ProviderProfile as mongoose.Model<
    InferSchemaType<typeof profileSchema>
  >) || mongoose.model("ProviderProfile", profileSchema);

// A doctor practising at a facility. Either side can ask; the other confirms.
const linkSchema = new Schema(
  {
    doctorProfileId: {
      type: Schema.Types.ObjectId,
      ref: "ProviderProfile",
      required: true,
    },
    facilityProfileId: {
      type: Schema.Types.ObjectId,
      ref: "ProviderProfile",
      required: true,
    },
    initiatedBy: { type: String, enum: ["doctor", "facility"], required: true },
    status: { type: String, enum: LINK_STATUSES, default: "PENDING" },
  },
  { timestamps: true, collection: "providerLinks" },
);
linkSchema.index(
  { doctorProfileId: 1, facilityProfileId: 1 },
  { unique: true },
);
linkSchema.index({ facilityProfileId: 1, status: 1 });
export const ProviderLink =
  (mongoose.models.ProviderLink as mongoose.Model<
    InferSchemaType<typeof linkSchema>
  >) || mongoose.model("ProviderLink", linkSchema);

// "I own or manage this place": reviewed by Gaavli staff, who can hand the
// profile over or turn the claim down.
const claimSchema = new Schema(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "ProviderProfile",
      required: true,
    },
    claimantId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: CLAIM_STATUSES, default: "PENDING" },
    resolvedAt: Date,
  },
  { timestamps: true, collection: "providerClaims" },
);
claimSchema.index({ profileId: 1, claimantId: 1, status: 1 });
claimSchema.index({ status: 1, createdAt: -1 });
export const ProviderClaim =
  (mongoose.models.ProviderClaim as mongoose.Model<
    InferSchemaType<typeof claimSchema>
  >) || mongoose.model("ProviderClaim", claimSchema);

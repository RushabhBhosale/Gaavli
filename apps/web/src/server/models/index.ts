import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { LISTING_PRODUCT_GROUPS } from "@gaavli/constants";
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    address: { type: String, trim: true, maxlength: 300 },
    alternativeMobile: { type: String, trim: true },
    occupation: { type: String, trim: true, maxlength: 100 },
    profilePhotoObjectKey: String,
    mobileVerified: Boolean,
    registeredAt: Date,
    preRegisteredAt: Date,
    createdByCoordinator: { type: Schema.Types.ObjectId, ref: "User" },
    sellerActivatedAt: Date,
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    mobile: { type: String, unique: true, sparse: true },
    roles: {
      type: [String],
      enum: ["buyer", "seller", "coordinator", "service_provider"],
      default: ["buyer"],
    },
    village: { type: Schema.Types.ObjectId, ref: "Village", default: null },
    status: {
      type: String,
      enum: ["active", "blocked", "pending"],
      default: "active",
      required: true,
    },
    preferredLanguage: { type: String, default: "mr" },
  },
  { timestamps: true, optimisticConcurrency: true },
);
userSchema.index({ roles: 1, status: 1, village: 1, createdAt: -1 });
userSchema.index({ createdAt: -1, _id: -1 });
userSchema.index({ name: 1 });
userSchema.index({ village: 1 });
userSchema.index({ status: 1 });
const adminSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, lowercase: true, unique: true, sparse: true },
    mobile: { type: String, unique: true, sparse: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["super_admin"],
      default: "super_admin",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "blocked", "pending"],
      default: "active",
    },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    lastLoginAt: Date,
  },
  { timestamps: true },
);
const villageSchema = new Schema(
  {
    nameEn: { type: String, required: true, unique: true },
    nameMr: { type: String, required: true },
    taluka: String,
    district: String,
    pinCode: { type: String, match: /^[1-9]\d{5}$/ },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date, default: null },
    location: {
      type: new Schema(
        {
          type: { type: String, enum: ["Point"], required: true },
          coordinates: { type: [Number], required: true },
        },
        { _id: false },
      ),
      default: undefined,
    },
  },
  { timestamps: true },
);
villageSchema.index({ location: "2dsphere" });
villageSchema.index({ isActive: 1, pinCode: 1 });
const listingSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "ProductMaster" },
    productName: { type: String, required: true, trim: true, maxlength: 120 },
    productNameMr: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 2000 },
    productGroup: {
      type: String,
      enum: LISTING_PRODUCT_GROUPS,
    },
    photoObjectKey: { type: String, trim: true },
    photoImageId: { type: Schema.Types.ObjectId },
    isDemo: { type: Boolean, default: false },
    category: String,
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    version: { type: Number, default: 1, min: 1 },
    minimumPurchaseQuantity: { type: Number, min: 0 },
    fulfillmentOptions: {
      type: [String],
      enum: ["farm_pickup", "local_transport"],
      default: [],
    },
    deactivatedAt: Date,
    moderationFlaggedAt: Date,
    quantity: { type: Number, min: 0, max: 1e9 },
    unit: { type: String, trim: true, maxlength: 30 },
    price: { type: Number, min: 0, max: 1e9 },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
    village: { type: Schema.Types.ObjectId, ref: "Village", required: true },
    status: {
      type: String,
      enum: [
        "active",
        "expired",
        "reported",
        "pending",
        "sold_out",
        "deactivated",
      ],
      default: "active",
    },
    expiresAt: Date,
  },
  { timestamps: true, optimisticConcurrency: true },
);
const categorySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameMr: { type: String, required: true },
    defaultShelfLife: { type: String, required: true },
    notifyMode: {
      type: String,
      enum: ["daily_digest", "change_only", "weekly_digest"],
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      required: true,
    },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true },
);
export const Category =
  (mongoose.models.Category as mongoose.Model<
    InferSchemaType<typeof categorySchema>
  >) || mongoose.model("Category", categorySchema);
listingSchema.index({ status: 1, expiresAt: 1, createdAt: -1 });
listingSchema.index({ seller: 1 });
listingSchema.index({ seller: 1, status: 1, createdAt: -1, _id: -1 });
listingSchema.index({ village: 1 });
listingSchema.index({ village: 1, status: 1, createdAt: -1, _id: -1 });
const sessionSchema = new Schema(
  {
    admin: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const auditSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "Admin" },
    actorUserId: { type: Schema.Types.ObjectId, ref: "User" },
    villageId: { type: Schema.Types.ObjectId, ref: "Village" },
    targetName: String,
    action: { type: String, required: true },
    targetId: Schema.Types.ObjectId,
  },
  { timestamps: true },
);
auditSchema.index({ createdAt: -1 });
auditSchema.index({ villageId: 1, createdAt: -1, _id: -1 });
auditSchema.index({ villageId: 1, targetId: 1, createdAt: -1 });
const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "COORDINATOR_GRANTED",
        "COORDINATOR_REMOVED",
        "VILLAGE_ASSIGNED",
        "VILLAGE_UNASSIGNED",
        "BUYER_TRIED_CONTACT",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    titleMr: String,
    bodyMr: String,
    data: {
      listingId: { type: Schema.Types.ObjectId, ref: "Listing" },
      buyerId: { type: Schema.Types.ObjectId, ref: "User" },
      quantity: { type: Number, min: 0, max: 1e9 },
      callbackConsent: Boolean,
      message: { type: String, trim: true, maxlength: 500 },
      productName: String,
      productNameMr: String,
      photoObjectKey: String,
      unit: String,
      buyerName: String,
      sellerName: String,
      buyerVillageName: String,
      buyerVillageNameMr: String,
      sellerVillageName: String,
      sellerVillageNameMr: String,
    },
    readAt: { type: Date, default: null },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });
notificationSchema.index({
  "data.buyerId": 1,
  type: 1,
  createdAt: -1,
  _id: -1,
});
notificationSchema.index({
  userId: 1,
  type: 1,
  "data.listingId": 1,
  "data.buyerId": 1,
  createdAt: -1,
});
const villageCoordinatorSchema = new Schema(
  {
    villageId: { type: Schema.Types.ObjectId, ref: "Village", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
villageCoordinatorSchema.index({ villageId: 1, userId: 1 }, { unique: true });
villageCoordinatorSchema.index({ villageId: 1 }, { unique: true });
villageCoordinatorSchema.index({ userId: 1 });
export type UserRecord = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
  __v: number;
};
export const User =
  (mongoose.models.User as mongoose.Model<
    InferSchemaType<typeof userSchema>
  >) || mongoose.model("User", userSchema);
export const Admin =
  (mongoose.models.Admin as mongoose.Model<
    InferSchemaType<typeof adminSchema>
  >) || mongoose.model("Admin", adminSchema);
export const Village =
  (mongoose.models.Village as mongoose.Model<
    InferSchemaType<typeof villageSchema>
  >) || mongoose.model("Village", villageSchema);
export const Listing =
  (mongoose.models.Listing as mongoose.Model<
    InferSchemaType<typeof listingSchema>
  >) || mongoose.model("Listing", listingSchema);
export const AdminSession =
  (mongoose.models.AdminSession as mongoose.Model<
    InferSchemaType<typeof sessionSchema>
  >) || mongoose.model("AdminSession", sessionSchema);
export const AuditLog =
  (mongoose.models.AuditLog as mongoose.Model<
    InferSchemaType<typeof auditSchema>
  >) || mongoose.model("AuditLog", auditSchema);
export const Notification =
  (mongoose.models.Notification as mongoose.Model<
    InferSchemaType<typeof notificationSchema>
  >) || mongoose.model("Notification", notificationSchema);
export const VillageCoordinator =
  (mongoose.models.VillageCoordinator as mongoose.Model<
    InferSchemaType<typeof villageCoordinatorSchema>
  >) || mongoose.model("VillageCoordinator", villageCoordinatorSchema);

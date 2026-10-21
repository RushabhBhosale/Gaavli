import "server-only";
import type { ClientSession } from "mongoose";
import type { z } from "zod";
import {
  coordinatorBuyerSchema,
  coordinatorUserEditSchema,
  coordinatorConnectionInputSchema,
  coordinatorReportActionSchema,
  coordinatorDashboardSchema,
  coordinatorUsersSchema,
  coordinatorUserDetailSchema,
  coordinatorActivityPageSchema,
  coordinatorReportSchema,
  coordinatorReportsSchema,
  coordinatorListingSchema,
  coordinatorConnectionsSchema,
} from "@gaavli/validation";
import {
  User,
  Village,
  VillageCoordinator,
  Listing,
  AuditLog,
} from "../models";
import { VillageConnection, VillageReport } from "../models/coordinator";
import { listingOperation } from "../repositories/listing-mutations";
import {
  mobileVillageDto,
  searchMobileVillages,
  limitRequests,
} from "../repositories/mobile";
import {
  coordinatorUserDto,
  coordinatorListingDto,
  coordinatorReportDto,
  findCoordinatorUsers,
  findCoordinatorActivity,
  findConnections,
  dateRange,
  type CoordinatorQuery,
} from "../repositories/coordinator";
import { AppError } from "../utils/errors";

export async function coordinatorScope(
  actorId: string,
  villageId?: string,
  session: ClientSession | null = null,
  lock = false,
) {
  const filter = { _id: actorId, status: "active", roles: "coordinator" };
  const actor = lock
    ? await User.findOneAndUpdate(
        filter,
        { $inc: { __v: 1 } },
        { new: true, session },
      )
    : await User.findOne(filter).session(session);
  if (!actor)
    throw new AppError(
      403,
      "COORDINATOR_REQUIRED",
      "Coordinator access is unavailable.",
    );
  const assignments = await VillageCoordinator.find({
    userId: actorId,
    ...(villageId ? { villageId } : {}),
  })
    .sort({ villageId: 1 })
    .session(session);
  const village = await Village.findOne({
    _id: { $in: assignments.map((row) => row.villageId) },
    isActive: true,
  })
    .sort({ _id: 1 })
    .session(session);
  if (!village)
    throw new AppError(
      403,
      "COORDINATOR_REQUIRED",
      "No active assignment for this village.",
    );
  if (lock)
    await Village.updateOne(
      { _id: village._id },
      { $inc: { __v: 1 } },
      { session: session || undefined },
    );
  return village;
}
const missing = () =>
  new AppError(
    404,
    "COORDINATOR_NOT_FOUND",
    "This record is unavailable in your village.",
  );
async function coordinatorWrite(
  actorId: string,
  villageId: string,
  key: string,
  scope: string,
  body: unknown,
  work: (
    session: ClientSession,
    village: InstanceType<typeof Village>,
  ) => Promise<string>,
  validateTarget?: (session: ClientSession) => Promise<void>,
) {
  await coordinatorScope(actorId, villageId);
  await Promise.all([VillageConnection.init(), VillageReport.init()]);
  await limitRequests("coordinator-write", actorId, 120, 3600000);
  return listingOperation(
    actorId,
    key,
    `coordinator:${villageId}:${scope}`,
    body,
    async (session) => {
      const village = await coordinatorScope(actorId, villageId, session, true);
      await validateTarget?.(session);
      return {
        status: 200,
        data: { id: await work(session, village), confirmed: true },
      };
    },
    async (session) => {
      await coordinatorScope(actorId, villageId, session, true);
      await validateTarget?.(session);
    },
  );
}
async function recordAction(
  actorId: string,
  villageId: string,
  targetId: unknown,
  action: string,
  targetName: string,
  session: ClientSession,
) {
  await AuditLog.create(
    [{ actorUserId: actorId, villageId, targetId, action, targetName }],
    { session },
  );
}
export async function coordinatorDashboard(
  actorId: string,
  query: CoordinatorQuery,
) {
  const village = await coordinatorScope(actorId, query.villageId);
  const range = dateRange(query);
  const [users, buyers, sellers, listings, mapping, reports] =
    await Promise.all([
      User.countDocuments({
        village: village._id,
        $or: [
          { registeredAt: range.filter },
          {
            registeredAt: { $exists: false },
            preRegisteredAt: { $exists: false },
            createdAt: range.filter,
          },
        ],
      }),
      User.countDocuments({
        village: village._id,
        preRegisteredAt: range.filter,
      }),
      User.countDocuments({
        village: village._id,
        sellerActivatedAt: range.filter,
      }),
      Listing.countDocuments({ village: village._id, createdAt: range.filter }),
      AuditLog.countDocuments({
        villageId: village._id,
        action: "connection.added",
        createdAt: range.filter,
      }),
      VillageReport.countDocuments({
        villageId: village._id,
        status: { $in: ["pending", "escalated", "flagged"] },
        createdAt: range.filter,
      }),
    ]);
  return coordinatorDashboardSchema.parse({
    village: mobileVillageDto(village),
    from: range.from,
    to: range.to,
    counts: { users, buyers, sellers, listings, mapping, reports },
  });
}
export async function coordinatorUsers(
  actorId: string,
  query: CoordinatorQuery,
) {
  const village = await coordinatorScope(actorId, query.villageId);
  return coordinatorUsersSchema.parse(
    await findCoordinatorUsers(actorId, village, query),
  );
}
export async function coordinatorUser(
  actorId: string,
  query: CoordinatorQuery,
  id: string,
) {
  const village = await coordinatorScope(actorId, query.villageId);
  const user = await User.findOne({ _id: id, village: village._id });
  if (!user) throw missing();
  const listings = await Listing.find({ seller: id, village: village._id })
    .sort({ createdAt: -1 })
    .limit(50);
  return coordinatorUserDetailSchema.parse({
    user: coordinatorUserDto(user, village, actorId),
    listings: listings.map(coordinatorListingDto),
  });
}
export async function coordinatorAddBuyer(
  actorId: string,
  villageId: string,
  key: string,
  input: z.infer<typeof coordinatorBuyerSchema>,
) {
  const targetId = input.targetVillageId || villageId;
  const validateTarget = async (session: ClientSession) => {
    const target = await Village.findOneAndUpdate(
      { _id: targetId, isActive: true },
      { $inc: { __v: 1 } },
      { session, new: true },
    );
    if (!target) throw missing();
  };
  return coordinatorWrite(
    actorId,
    villageId,
    key,
    "buyers",
    input,
    async (session) => {
      const existing = await User.exists({
        mobile: {
          $in: [input.mobile, `+91${input.mobile}`, `91${input.mobile}`],
        },
      }).session(session);
      if (existing)
        throw new AppError(
          409,
          "MOBILE_ALREADY_EXISTS",
          "An account already uses this mobile number. No duplicate was created.",
        );
      const [user] = await User.create(
        [
          {
            firstName: input.firstName,
            lastName: input.lastName,
            mobile: input.mobile,
            name: `${input.firstName} ${input.lastName}`,
            village: targetId,
            roles: ["buyer"],
            mobileVerified: false,
            preRegisteredAt: new Date(),
            createdByCoordinator: actorId,
            status: "active",
          },
        ],
        { session },
      );
      await recordAction(
        actorId,
        targetId,
        user._id,
        "buyer.added",
        user.name,
        session,
      );
      return String(user._id);
    },
    validateTarget,
  );
}
export async function coordinatorEditUser(
  actorId: string,
  villageId: string,
  id: string,
  key: string,
  input: z.infer<typeof coordinatorUserEditSchema>,
) {
  return coordinatorWrite(
    actorId,
    villageId,
    key,
    `user:${id}`,
    input,
    async (session, village) => {
      const user = await User.findOne({
        _id: id,
        village: village._id,
      }).session(session);
      if (!user) throw missing();
      if (!coordinatorUserDto(user, village, actorId).canEdit)
        throw new AppError(
          403,
          "COORDINATOR_EDIT_FORBIDDEN",
          "Only your unverified pre-registrations can be corrected.",
        );
      if ((user.__v || 0) !== input.version)
        throw new AppError(
          409,
          "STALE_VERSION",
          "Refresh this user before editing.",
        );
      user.firstName = input.firstName;
      user.lastName = input.lastName;
      user.name = `${input.firstName} ${input.lastName}`;
      await user.save({ session });
      await recordAction(
        actorId,
        villageId,
        user._id,
        "user.corrected",
        user.name,
        session,
      );
      return id;
    },
  );
}
export async function coordinatorConnections(
  actorId: string,
  query: CoordinatorQuery,
  villageId: string,
) {
  await coordinatorScope(actorId, villageId);
  return coordinatorConnectionsSchema.parse(
    await findConnections(villageId, query),
  );
}
export async function coordinatorCandidates(
  actorId: string,
  query: CoordinatorQuery,
  villageId: string,
) {
  const source = await coordinatorScope(actorId, villageId);
  if (
    query.area !== "all" &&
    (!source.district ||
      (["taluka", "other_talukas"].includes(query.area) && !source.taluka))
  )
    return { villages: [], total: 0, page: query.page, limit: query.limit };
  const connected = await VillageConnection.find({
    active: true,
    $or: [{ sourceVillageId: villageId }, { targetVillageId: villageId }],
  }).lean();
  const excluded = [
    villageId,
    ...connected.map((row) =>
      String(row.sourceVillageId) === villageId
        ? String(row.targetVillageId)
        : String(row.sourceVillageId),
    ),
  ];
  return searchMobileVillages(
    {
      search: query.search,
      page: query.page,
      limit: query.limit,
      latitude: query.latitude,
      longitude: query.longitude,
    },
    excluded,
    query.area === "taluka"
      ? { district: source.district!, taluka: source.taluka! }
      : query.area === "other_talukas"
        ? { district: source.district!, excludeTaluka: source.taluka! }
        : query.area === "district"
          ? { district: source.district! }
          : {},
  );
}
export async function coordinatorConnect(
  actorId: string,
  villageId: string,
  key: string,
  input: z.infer<typeof coordinatorConnectionInputSchema>,
) {
  if (villageId === input.targetVillageId)
    throw new AppError(422, "CONNECTION_SELF", "Choose a different village.");
  return coordinatorWrite(
    actorId,
    villageId,
    key,
    "connection:add",
    input,
    async (session, source) => {
      const other = await Village.findOneAndUpdate(
        { _id: input.targetVillageId, isActive: true },
        { $inc: { __v: 1 } },
        { session, new: true },
      );
      if (!other) throw missing();
      const [left, right] = [villageId, input.targetVillageId].sort();
      let connection = await VillageConnection.findOne({
        sourceVillageId: left,
        targetVillageId: right,
      }).session(session);
      if (connection?.active) return String(connection._id);
      if (connection) {
        connection.active = true;
        await connection.save({ session });
      } else
        [connection] = await VillageConnection.create(
          [
            {
              sourceVillageId: left,
              targetVillageId: right,
              active: true,
              createdBy: actorId,
            },
          ],
          { session },
        );
      // Each village sees the same manual connection and its own audit event.
      await recordAction(
        actorId,
        villageId,
        connection._id,
        "connection.added",
        other.nameEn,
        session,
      );
      await recordAction(
        actorId,
        input.targetVillageId,
        connection._id,
        "connection.added",
        source.nameEn,
        session,
      );
      return String(connection._id);
    },
  );
}
export async function coordinatorDisconnect(
  actorId: string,
  villageId: string,
  id: string,
  key: string,
) {
  return coordinatorWrite(
    actorId,
    villageId,
    key,
    `connection:remove:${id}`,
    {},
    async (session, source) => {
      const connection = await VillageConnection.findOne({
        _id: id,
        $or: [{ sourceVillageId: villageId }, { targetVillageId: villageId }],
      }).session(session);
      if (!connection) throw missing();
      if (connection.active) {
        const otherId =
          String(connection.sourceVillageId) === villageId
            ? connection.targetVillageId
            : connection.sourceVillageId;
        const other = await Village.findById(otherId).session(session);
        connection.active = false;
        await connection.save({ session });
        await recordAction(
          actorId,
          villageId,
          connection._id,
          "connection.removed",
          other?.nameEn || "",
          session,
        );
        await recordAction(
          actorId,
          String(otherId),
          connection._id,
          "connection.removed",
          source.nameEn,
          session,
        );
      }
      return id;
    },
  );
}
export async function coordinatorActivity(
  actorId: string,
  query: CoordinatorQuery,
  id?: string,
) {
  const village = await coordinatorScope(actorId, query.villageId);
  const page = await findCoordinatorActivity(String(village._id), query, id);
  if (id && !page.activities.length) throw missing();
  return coordinatorActivityPageSchema.parse(page);
}
export async function coordinatorReports(
  actorId: string,
  query: CoordinatorQuery,
) {
  const village = await coordinatorScope(actorId, query.villageId);
  const filter = {
    villageId: village._id,
    createdAt: dateRange(query).filter,
    ...(query.reportStatus === "open"
      ? { status: { $in: ["pending", "flagged", "escalated"] } }
      : {}),
  };
  const [rows, total] = await Promise.all([
    VillageReport.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    VillageReport.countDocuments(filter),
  ]);
  return coordinatorReportsSchema.parse({
    reports: rows.map(coordinatorReportDto),
    total,
    page: query.page,
    limit: query.limit,
  });
}
export async function coordinatorReport(
  actorId: string,
  query: CoordinatorQuery,
  id: string,
) {
  const village = await coordinatorScope(actorId, query.villageId);
  const row = await VillageReport.findOne({ _id: id, villageId: village._id });
  if (!row) throw missing();
  const listing = await Listing.findOne({
    _id: row.listingId,
    village: village._id,
  });
  const history = await AuditLog.find({ targetId: id, villageId: village._id })
    .sort({ createdAt: -1 })
    .limit(50);
  return coordinatorReportSchema.parse({
    report: coordinatorReportDto(row),
    listing: listing ? coordinatorListingDto(listing) : null,
    history: history.map((event) => ({
      action: event.action,
      createdAt: event.createdAt.toISOString(),
    })),
  });
}
export async function coordinatorModerate(
  actorId: string,
  villageId: string,
  id: string,
  key: string,
  input: z.infer<typeof coordinatorReportActionSchema>,
) {
  return coordinatorWrite(
    actorId,
    villageId,
    key,
    `report:${id}`,
    input,
    async (session, village) => {
      const report = await VillageReport.findOne({
        _id: id,
        villageId: village._id,
      }).session(session);
      if (!report) throw missing();
      if ((report.__v || 0) !== input.version)
        throw new AppError(
          409,
          "STALE_VERSION",
          "Refresh this report before moderating.",
        );
      const listing = await Listing.findOne({
        _id: report.listingId,
        village: village._id,
      }).session(session);
      report.status = {
        dismiss: "dismissed",
        flag: "flagged",
        hide: "hidden",
        escalate: "escalated",
      }[input.action] as typeof report.status;
      if (
        input.action === "hide" &&
        listing &&
        ["active", "pending"].includes(listing.status)
      ) {
        listing.status = "reported";
        listing.version = (listing.version || 1) + 1;
        await listing.save({ session });
      }
      if (input.action === "flag" && listing) {
        listing.moderationFlaggedAt = new Date();
        listing.version = (listing.version || 1) + 1;
        await listing.save({ session });
      }
      await report.save({ session });
      await recordAction(
        actorId,
        villageId,
        report._id,
        `report.${input.action}`,
        report.productName,
        session,
      );
      return id;
    },
  );
}
export async function coordinatorListing(
  actorId: string,
  query: CoordinatorQuery,
  id: string,
) {
  const village = await coordinatorScope(actorId, query.villageId);
  const listing = await Listing.findOne({ _id: id, village: village._id });
  if (!listing) throw missing();
  return coordinatorListingSchema.parse({
    listing: coordinatorListingDto(listing),
  });
}

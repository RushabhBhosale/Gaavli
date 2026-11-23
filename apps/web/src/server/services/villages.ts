import "server-only";
import { indianMobileSchema } from "@gaavli/validation";
import { Types, type ClientSession } from "mongoose";
import type { z } from "zod";
import type {
  villagesFilterSchema,
  villagesQuerySchema,
  VillageInput,
} from "@/schemas";
import {
  fieldsFromMaster,
  rejectIfMasterTaken,
  requireMasterSnapshot,
  villageDuplicateMessage,
  type MasterSnapshot,
} from "@/lib/village-master";
import { connectDb } from "../db/connect";
import {
  findVillages,
  findVillagesForExport,
  countVillageDependencies,
} from "../repositories/villages";
import {
  readVillageCsv,
  villageCsvKey,
  villageInputFromCsvRow,
  villageNotAddedMessage,
  villagesToCsv,
  VILLAGE_CSV_BYTE_LIMIT,
} from "@/lib/village-csv";
import {
  AuditLog,
  Notification,
  User,
  Village,
  VillageCoordinator,
} from "../models";
import { AppError } from "../utils/errors";

export async function coordinatorOptions() {
  await connectDb();
  return (
    await User.find({ roles: "coordinator" })
      .select("name status")
      .sort({ name: 1, _id: 1 })
      .lean()
  ).map((user) => ({
    id: String(user._id),
    name: user.name,
    status: user.status,
  }));
}

function exactText(value: string) {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
}

async function textVillageFields(
  input: VillageInput,
  session: ClientSession,
  id?: string,
) {
  if (!input.name || !input.nameMr || !input.taluka || !input.district)
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "Enter the village name, Marathi name, taluka, and district.",
    );
  const taken = await Village.findOne({
    nameEn: exactText(input.name),
    taluka: exactText(input.taluka),
    district: exactText(input.district),
    ...(id ? { _id: { $ne: id } } : {}),
  })
    .select("_id")
    .session(session)
    .lean();
  if (taken)
    throw new AppError(
      409,
      "CONFLICT",
      "A village with this name, taluka, and district already exists.",
    );
  return {
    nameEn: input.name,
    nameMr: input.nameMr,
    taluka: input.taluka,
    district: input.district,
  };
}

async function masterSnapshot(
  id: string,
  session: ClientSession,
): Promise<MasterSnapshot | null> {
  const db = Village.db.db;
  if (!db || !Types.ObjectId.isValid(id)) return null;
  const village = await db
    .collection("villageMasters")
    .findOne({ _id: new Types.ObjectId(id) }, { session });
  if (!village) return null;
  const [district, taluka] = await Promise.all([
    db
      .collection("districts")
      .findOne({ _id: village.districtId }, { session }),
    db.collection("talukas").findOne({ _id: village.talukaId }, { session }),
  ]);
  const linked =
    district &&
    taluka &&
    String(taluka.districtId) === String(village.districtId);
  const marathi =
    typeof village.nameMr === "string" && village.nameMr.trim()
      ? village.nameMr
      : null;
  return {
    id: String(village._id),
    nameEn: typeof village.nameEn === "string" ? village.nameEn : "",
    nameMr: marathi,
    lgdCode: typeof village.lgdCode === "string" ? village.lgdCode : "",
    districtId: district ? String(district._id) : "",
    talukaId: taluka ? String(taluka._id) : "",
    districtName:
      linked && typeof district.nameEn === "string" ? district.nameEn : "",
    talukaName:
      linked && typeof taluka.nameEn === "string" ? taluka.nameEn : "",
  };
}

async function masterVillageFields(
  villageMasterId: string,
  typedNameMr: string | undefined,
  session: ClientSession,
  id?: string,
) {
  const identity = fieldsFromMaster(
    requireMasterSnapshot(await masterSnapshot(villageMasterId, session)),
    typedNameMr,
  );
  const taken = await Village.findOne({
    villageMasterId: new Types.ObjectId(identity.villageMasterId),
    ...(id ? { _id: { $ne: id } } : {}),
  })
    .select("_id")
    .session(session)
    .lean();
  rejectIfMasterTaken(taken ? String(taken._id) : null, id);
  return identity;
}

export async function saveVillage(
  actorId: string,
  input: VillageInput & { version?: number },
  id?: string,
) {
  await connectDb();
  const assignCoordinators = input.coordinatorIds !== undefined;
  if (
    assignCoordinators &&
    input.publicCoordinatorPhone &&
    !input.coordinatorIds?.length
  )
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "Assign a coordinator before publishing a contact number.",
    );
  try {
    return await Village.db.transaction(async (session) => {
      const previous = id ? await Village.findById(id).session(session) : null;
      if (id && !previous)
        throw new AppError(404, "NOT_FOUND", "Village not found.");
      const previousLinks =
        id && assignCoordinators
          ? await VillageCoordinator.find({ villageId: id })
              .session(session)
              .lean()
          : [];
      const before = new Set(previousLinks.map((link) => String(link.userId)));
      const after = new Set(
        assignCoordinators ? (input.coordinatorIds ?? []) : [],
      );
      // Lock coordinator documents so concurrent role revocation cannot leave an invalid assignment.
      for (const userId of [...after].sort()) {
        const coordinator = await User.findOneAndUpdate(
          {
            _id: userId,
            roles: "coordinator",
            ...(before.has(userId) ? {} : { status: "active" }),
          },
          { $inc: { __v: 1 } },
          { new: true, session },
        );
        if (!coordinator)
          throw new AppError(
            422,
            "VALIDATION_ERROR",
            "Choose an active coordinator. Refresh if their role changed.",
          );
        if (input.publicCoordinatorPhone) {
          const registeredPhone = indianMobileSchema.safeParse(
            coordinator.mobile,
          );
          if (
            !registeredPhone.success ||
            `+91${registeredPhone.data}` !== input.publicCoordinatorPhone
          )
            throw new AppError(
              422,
              "VALIDATION_ERROR",
              "Public contact must match the assigned coordinator's registered mobile number.",
            );
        }
      }
      const masterIdentity = input.villageMasterId
        ? await masterVillageFields(
            input.villageMasterId,
            input.nameMr,
            session,
            id,
          )
        : null;
      const textIdentity = masterIdentity
        ? null
        : await textVillageFields(input, session, id);
      const identity = masterIdentity ?? textIdentity!;
      const fields = {
        nameEn: identity.nameEn,
        nameMr: identity.nameMr,
        taluka: identity.taluka,
        district: identity.district,
        ...(masterIdentity
          ? {
              villageMasterId: new Types.ObjectId(
                masterIdentity.villageMasterId,
              ),
              lgdCode: masterIdentity.lgdCode,
              districtId: new Types.ObjectId(masterIdentity.districtId),
              talukaId: new Types.ObjectId(masterIdentity.talukaId),
            }
          : {}),
        ...(input.pinCode !== undefined
          ? { pinCode: input.pinCode || null }
          : {}),
        ...(input.latitude !== undefined && input.longitude !== undefined
          ? {
              location: {
                type: "Point",
                coordinates: [input.longitude, input.latitude],
              },
            }
          : {}),
      };
      let village;
      if (id) {
        village = await Village.findOneAndUpdate(
          { _id: id, __v: input.version },
          { $set: fields, $inc: { __v: 1 } },
          { new: true, runValidators: true, session },
        );
        if (!village)
          throw new AppError(
            409,
            "STALE_VERSION",
            "This village changed. Close and reopen the editor to refresh.",
          );
      } else {
        [village] = await Village.create([{ ...fields, isActive: true }], {
          session,
        });
      }
      const added = [...after].filter((userId) => !before.has(userId));
      const removed = [...before].filter((userId) => !after.has(userId));
      if (removed.length)
        await VillageCoordinator.deleteMany({
          villageId: village._id,
          userId: { $in: removed },
        }).session(session);
      if (added.length)
        await VillageCoordinator.create(
          added.map((userId) => ({ villageId: village._id, userId })),
          { session, ordered: true },
        );
      if (input.publicCoordinatorPhone !== undefined && after.size)
        await VillageCoordinator.updateOne(
          { villageId: village._id, userId: [...after][0] },
          {
            $set: { publicContactPhone: input.publicCoordinatorPhone || null },
          },
          { session, runValidators: true },
        );
      await AuditLog.create(
        [
          {
            actorId,
            action: id ? "village.updated" : "village.created",
            targetId: village._id,
          },
        ],
        { session },
      );
      for (const [userIds, assigned] of [
        [added, true],
        [removed, false],
      ] as const) {
        for (const userId of userIds) {
          await AuditLog.create(
            [
              {
                actorId,
                action: assigned
                  ? "village.coordinator.assigned"
                  : "village.coordinator.removed",
                targetId: village._id,
              },
            ],
            { session },
          );
          await Notification.create(
            [
              {
                userId,
                type: assigned ? "VILLAGE_ASSIGNED" : "VILLAGE_UNASSIGNED",
                title: assigned
                  ? "गावाची जबाबदारी मिळाली"
                  : "गावाची जबाबदारी काढली",
                body: assigned
                  ? `${identity.nameMr} गावासाठी तुमची समन्वयक म्हणून नियुक्ती झाली आहे.`
                  : `${identity.nameMr} गावासाठी तुमची समन्वयक नियुक्ती काढली आहे. तुमचे खाते आणि इतिहास कायम आहेत.`,
              },
            ],
            { session },
          );
        }
      }
      return { id: String(village._id), version: village.__v ?? 0 };
    });
  } catch (error) {
    const duplicate = villageDuplicateMessage(error);
    if (duplicate) throw new AppError(409, "CONFLICT", duplicate);
    throw error;
  }
}

export async function villageDependencies(id: string) {
  await connectDb();
  if (!(await Village.exists({ _id: id })))
    throw new AppError(404, "NOT_FOUND", "Village not found.");
  return countVillageDependencies(id);
}

export async function deleteVillage(
  actorId: string,
  id: string,
  version: number,
) {
  await connectDb();
  return Village.db.transaction(async (session) => {
    // Membership and assignment writers also lock this village before adding references.
    const locked = await Village.findOneAndUpdate(
      { _id: id, __v: version },
      { $inc: { __v: 1 } },
      { new: true, session },
    );
    if (!locked) {
      if (!(await Village.exists({ _id: id }).session(session)))
        throw new AppError(404, "NOT_FOUND", "Village not found.");
      throw new AppError(
        409,
        "STALE_VERSION",
        "This village changed. Refresh before deleting.",
      );
    }
    const dependencies = await countVillageDependencies(id, session);
    if (Object.values(dependencies).some((count) => count > 0))
      throw new AppError(
        409,
        "DEPENDENCIES_EXIST",
        "This village has linked records. Deactivate it or reassign the linked records before deleting.",
      );
    await Village.deleteOne({ _id: id }).session(session);
    await AuditLog.create(
      [{ actorId, action: "village.deleted", targetId: locked._id }],
      { session },
    );
    return { id };
  });
}

export async function setVillageStatus(
  actorId: string,
  id: string,
  status: "active" | "inactive",
  version: number,
) {
  await connectDb();
  return Village.db.transaction(async (session) => {
    const village = await Village.findOneAndUpdate(
      { _id: id, __v: version },
      {
        $set: {
          isActive: status === "active",
          deactivatedAt: status === "inactive" ? new Date() : null,
        },
        $inc: { __v: 1 },
      },
      { new: true, runValidators: true, session },
    );
    if (!village) {
      if (!(await Village.exists({ _id: id }).session(session)))
        throw new AppError(404, "NOT_FOUND", "Village not found.");
      throw new AppError(
        409,
        "STALE_VERSION",
        "This village changed. Close and reopen the editor to refresh.",
      );
    }
    await AuditLog.create(
      [
        {
          actorId,
          action:
            status === "active" ? "village.activated" : "village.deactivated",
          targetId: village._id,
        },
      ],
      { session },
    );
    return { id, status, version: village.__v };
  });
}

export const VILLAGE_EXPORT_LIMIT = 5000;

function villageFilter(query: z.infer<typeof villagesFilterSchema>) {
  const search = query.search?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    ...(query.district ? { district: query.district } : {}),
    ...(query.taluka ? { taluka: query.taluka } : {}),
    ...(query.status ? { isActive: query.status === "active" } : {}),
    ...(search
      ? {
          $or: ["nameEn", "nameMr", "taluka", "district", "pinCode"].map(
            (field) => ({
              [field]: { $regex: search, $options: "i" },
            }),
          ),
        }
      : {}),
  };
}
export async function listVillages(query: z.infer<typeof villagesQuerySchema>) {
  await connectDb();
  return findVillages(
    villageFilter(query),
    query.page,
    query.limit,
    query.sort,
    query.direction,
  );
}
export async function exportVillagesCsv(
  query: z.infer<typeof villagesFilterSchema>,
) {
  await connectDb();
  const page = await findVillagesForExport(
    villageFilter(query),
    VILLAGE_EXPORT_LIMIT,
  );
  if (page.total > VILLAGE_EXPORT_LIMIT)
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "Narrow the filters. An export can include at most 5,000 villages.",
    );
  return villagesToCsv(page.villages);
}
export async function importVillages(actorId: string, text: string) {
  if (text.length > VILLAGE_CSV_BYTE_LIMIT)
    throw new AppError(413, "VALIDATION_ERROR", "CSV file is too large.");
  const read = readVillageCsv(text);
  if ("error" in read) throw new AppError(422, "VALIDATION_ERROR", read.error);
  const failed: { line: number; message: string }[] = [];
  const seen = new Set<string>();
  let created = 0;
  for (const row of read.rows) {
    const key = villageCsvKey(row);
    if (seen.has(key)) {
      failed.push({
        line: row.line,
        message: villageNotAddedMessage(
          row.name,
          "This village is repeated in the file.",
        ),
      });
      continue;
    }
    seen.add(key);
    const input = villageInputFromCsvRow(row);
    if (!input.ok) {
      failed.push({
        line: row.line,
        message: villageNotAddedMessage(row.name, input.message),
      });
      continue;
    }
    try {
      await saveVillage(actorId, input.data);
      created += 1;
    } catch (error) {
      failed.push({
        line: row.line,
        message: villageNotAddedMessage(
          row.name,
          error instanceof AppError
            ? error.message
            : "Unable to add this village.",
        ),
      });
    }
  }
  return { created, failed };
}

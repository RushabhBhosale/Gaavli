import "server-only";
import { Types } from "mongoose";
import type { z } from "zod";
import {
  PROVIDER_KINDS,
  ProviderType,
  isDoctorType,
  isFacilityType,
  type ProviderField,
} from "@gaavli/constants";
import { editDistance, maxEdits } from "@gaavli/utils";
import type {
  createProviderProfileSchema,
  providerDuplicateCheckSchema,
  providerSearchQuerySchema,
  updateProviderProfileSchema,
} from "@gaavli/validation";
import { connectDb } from "../db/connect";
import { User, Village, type UserRecord } from "../models";
import { Service } from "../models/service";
import { ProviderMaster } from "../models/provider-master";
import { ListingPhoto } from "../models/listing-photo";
import { listingPhotoUrl } from "../providers/listing-photos";
import {
  ProviderClaim,
  ProviderLink,
  ProviderProfile,
} from "../models/provider-profile";
import { AppError } from "../utils/errors";

type Profile = InstanceType<typeof ProviderProfile>;
type Create = z.infer<typeof createProviderProfileSchema>;
const MAX_PROFILES_PER_USER = 25;

const keyOf = (name: string) =>
  name
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN")
    .replace(/[^\p{L}\p{N}]+/gu, "");
const oid = (value: string) => new Types.ObjectId(value);
const masked = (mobile: string) =>
  `${mobile.slice(0, 2)}xxxx${mobile.slice(-4)}`;
const mobileOf = (user: UserRecord) => user.mobile ?? "";

async function activeVillage(id: string) {
  const village = await Village.findOne({ _id: id, isActive: true })
    .select("nameEn nameMr")
    .lean();
  if (!village)
    throw new AppError(422, "VILLAGE_UNAVAILABLE", "Select an active village.");
  return village;
}
async function villageMap(ids: Types.ObjectId[]) {
  const rows = await Village.find({ _id: { $in: ids } })
    .select("nameEn nameMr")
    .lean();
  return new Map(
    rows.map((row) => [
      String(row._id),
      {
        id: String(row._id),
        name: row.nameEn || "",
        nameMr: row.nameMr || row.nameEn || "",
      },
    ]),
  );
}
// Every select value must be an active option the admin manages.
async function checkMasters(
  type: ProviderType,
  details: Record<string, unknown>,
) {
  for (const field of PROVIDER_KINDS[type].fields as readonly ProviderField[]) {
    if (field.kind !== "master") continue;
    const code = details[field.key];
    if (typeof code !== "string" || !code) continue;
    const ok = await ProviderMaster.exists({
      providerType: type,
      masterType: field.master,
      code,
      isActive: true,
    });
    if (!ok)
      throw new AppError(
        422,
        "INVALID_MASTER_OPTION",
        `Choose a valid option for ${field.key}.`,
        { field: field.key },
      );
  }
}
function checkPrimary(user: UserRecord, contacts: Create["contacts"]) {
  const primary = contacts.find((row) => row.label === "primary");
  if (!primary || primary.mobile !== mobileOf(user))
    throw new AppError(
      422,
      "PRIMARY_NUMBER_MISMATCH",
      "The primary number is the one verified for your account.",
    );
}

// Every image must be a ready upload that belongs to the signed-in owner.
async function checkImages(ownerId: string, keys: readonly string[]) {
  if (!keys.length) return;
  const found = await ListingPhoto.countDocuments({
    _id: { $in: keys },
    owner: ownerId,
    state: "ready",
  });
  if (found !== keys.length)
    throw new AppError(
      422,
      "PHOTO_UNAVAILABLE",
      "Upload the photo again, then save.",
    );
}
const imageDtos = (keys: readonly string[] | undefined | null) =>
  (keys ?? []).flatMap((key) => {
    const url = listingPhotoUrl(key);
    return url ? [{ key, url }] : [];
  });

// ---- Output -----------------------------------------------------------------
async function toDtos(rows: Profile[], viewerId: string | null) {
  const villages = await villageMap(rows.map((row) => row.villageId));
  const links = rows.length
    ? await ProviderLink.find({
        doctorProfileId: { $in: rows.map((row) => row._id) },
      }).lean()
    : [];
  const facilityIds = links.map((link) => link.facilityProfileId);
  const facilities = facilityIds.length
    ? await ProviderProfile.find({ _id: { $in: facilityIds } })
        .select("name")
        .lean()
    : [];
  const facilityName = new Map(
    facilities.map((row) => [String(row._id), row.name]),
  );
  return rows.map((row) => {
    const link = links.find(
      (item) => String(item.doctorProfileId) === String(row._id),
    );
    return {
      id: String(row._id),
      providerType: row.providerType as ProviderType,
      name: row.name,
      village: villages.get(String(row.villageId)) ?? {
        id: String(row.villageId),
        name: "",
        nameMr: "",
      },
      address: row.address || null,
      description: row.description || null,
      contacts: row.contacts.map((contact) => ({
        label: contact.label,
        mobile: contact.mobile,
        whatsapp: !!contact.whatsapp,
        isPublic: contact.isPublic !== false,
        verified: !!contact.verified,
      })),
      images: imageDtos(row.images),
      details: (row.details ?? {}) as Record<string, unknown>,
      status: row.status as "ACTIVE" | "INACTIVE",
      version: row.__v ?? 0,
      practice: row.practiceMode
        ? {
            mode: row.practiceMode,
            facility: link
              ? {
                  id: String(link.facilityProfileId),
                  name: facilityName.get(String(link.facilityProfileId)) ?? "",
                  status: link.status as "PENDING" | "CONFIRMED" | "REJECTED",
                  linkId: String(link._id),
                }
              : null,
          }
        : null,
      mine: !!viewerId && String(row.ownerId) === viewerId,
      createdAt: (
        row as unknown as { createdAt: Date }
      ).createdAt.toISOString(),
    };
  });
}
async function linkDtos(
  links: InstanceType<typeof ProviderLink>[],
  viewerId: string,
) {
  const ids = [
    ...links.map((link) => link.doctorProfileId),
    ...links.map((link) => link.facilityProfileId),
  ];
  const profiles = await ProviderProfile.find({ _id: { $in: ids } }).lean();
  const byId = new Map(profiles.map((row) => [String(row._id), row]));
  return links.flatMap((link) => {
    const doctor = byId.get(String(link.doctorProfileId));
    const facility = byId.get(String(link.facilityProfileId));
    if (!doctor || !facility) return [];
    const answerer = link.initiatedBy === "doctor" ? facility : doctor;
    return [
      {
        id: String(link._id),
        status: link.status as "PENDING" | "CONFIRMED" | "REJECTED",
        initiatedBy: link.initiatedBy as "doctor" | "facility",
        doctor: {
          id: String(doctor._id),
          name: doctor.name,
          specialization:
            ((doctor.details as Record<string, unknown>)?.specialization as
              string | undefined) ?? null,
        },
        facility: { id: String(facility._id), name: facility.name },
        needsMyAnswer:
          link.status === "PENDING" && String(answerer.ownerId) === viewerId,
        createdAt: (
          link as unknown as { createdAt: Date }
        ).createdAt.toISOString(),
      },
    ];
  });
}

// ---- Public directory projection ---------------------------------------------
function publicContacts(profile: Profile) {
  return profile.contacts
    .filter((contact) => contact.isPublic !== false)
    .map((contact) => ({
      label: contact.label,
      mobile: contact.mobile,
      whatsapp: !!contact.whatsapp,
    }));
}
export async function syncDirectoryEntry(profile: Profile) {
  const kind = PROVIDER_KINDS[profile.providerType as ProviderType];
  const details = (profile.details ?? {}) as Record<string, unknown>;
  const category = String(details[kind.categoryKey] ?? "");
  const categoryField = kind.fields.find((f) => f.key === kind.categoryKey);
  const master =
    category && categoryField?.kind === "master"
      ? await ProviderMaster.findOne({
          providerType: profile.providerType,
          masterType: categoryField.master,
          code: category,
        }).lean()
      : null;
  let contacts = publicContacts(profile);
  if (!contacts.length && profile.facilityId) {
    const link = await ProviderLink.findOne({
      doctorProfileId: profile._id,
      facilityProfileId: profile.facilityId,
      status: "CONFIRMED",
    }).lean();
    const facility = link
      ? await ProviderProfile.findById(profile.facilityId)
      : null;
    if (facility) contacts = publicContacts(facility);
  }
  const type = profile.providerType as ProviderType;
  const summary =
    profile.description ||
    [
      "servicesOffered",
      "servicesProvided",
      "servicesAvailable",
      "items",
      "publicServices",
      "mainActivity",
    ]
      .map((key) => details[key])
      .find((value) => typeof value === "string" && value) ||
    null;
  const active = profile.status === "ACTIVE";
  await Service.updateOne(
    { profileId: profile._id },
    {
      $set: {
        userId: profile.ownerId,
        villageId: profile.villageId,
        module:
          type === ProviderType.TRANSPORT_DRIVER ? "transport" : "services",
        profession: profile.name,
        professionMr: profile.name,
        professionCode: category || undefined,
        serviceCategory:
          isFacilityType(type) || isDoctorType(type)
            ? "Medical"
            : type === ProviderType.SHOP_BUSINESS
              ? "Shop"
              : type === ProviderType.PROFESSIONAL_SERVICE
                ? "Utility"
                : "Other",
        providerType: type,
        description:
          typeof summary === "string" ? summary.slice(0, 1500) : undefined,
        keywords: master
          ? [master.code, master.name.en, master.name.mr, master.name.hi]
          : [],
        contacts,
        images: profile.images ?? [],
        status: active ? "ACTIVE" : "INACTIVE",
        available: active,
      },
    },
    { upsert: true },
  );
}

// ---- Create -----------------------------------------------------------------
function contactDocs(contacts: Create["contacts"]) {
  return contacts.map((contact) => ({
    ...contact,
    verified: contact.label === "primary",
  }));
}
async function ownFacilityFor(
  user: UserRecord,
  doctor: Create,
): Promise<Profile> {
  const details = doctor.details as Record<string, unknown>;
  const option =
    (await ProviderMaster.findOne({
      providerType: ProviderType.MEDICAL_FACILITY,
      masterType: "FACILITY_TYPE",
      code: "CLINIC",
      isActive: true,
    }).lean()) ??
    (await ProviderMaster.findOne({
      providerType: ProviderType.MEDICAL_FACILITY,
      masterType: "FACILITY_TYPE",
      isActive: true,
    })
      .sort({ sortOrder: 1 })
      .lean());
  if (!option)
    throw new AppError(
      422,
      "FACILITY_TYPE_UNAVAILABLE",
      "No facility type is available right now.",
    );
  const village = await Village.findById(doctor.villageId)
    .select("nameEn")
    .lean();
  return ProviderProfile.create({
    ownerId: user._id,
    providerType: ProviderType.MEDICAL_FACILITY,
    villageId: oid(doctor.villageId),
    name: `${doctor.name} Clinic`.slice(0, 120),
    nameKey: keyOf(`${doctor.name} Clinic`),
    address: doctor.address,
    contacts: contactDocs(doctor.contacts),
    details: {
      facilityType: option.code,
      servicesAvailable: String(details.specialization ?? "Consultation"),
      operatingHours: String(details.consultationHours ?? ""),
      location: doctor.address || village?.nameEn || "",
    },
    status: "ACTIVE",
  });
}
export async function createProviderProfile(user: UserRecord, input: Create) {
  await connectDb();
  const userId = String(user._id);
  await activeVillage(input.villageId);
  checkPrimary(user, input.contacts);
  await checkImages(userId, input.images);
  await checkMasters(input.providerType, input.details);
  if (
    (await ProviderProfile.countDocuments({
      ownerId: user._id,
      status: "ACTIVE",
    })) >= MAX_PROFILES_PER_USER
  )
    throw new AppError(
      409,
      "PROFILE_LIMIT",
      "You have reached the profile limit.",
    );
  const parsedDetails = input.details;
  let facility: Profile | null = null;
  let linkFacilityId: Types.ObjectId | null = null;
  let linkStatus: "CONFIRMED" | "PENDING" = "CONFIRMED";
  if (input.providerType === ProviderType.HEALTHCARE_PROFESSIONAL) {
    const practice = input.practice!;
    if (practice.mode === "existing_facility") {
      const target = await ProviderProfile.findOne({
        _id: practice.facilityId,
        providerType: ProviderType.MEDICAL_FACILITY,
        status: "ACTIVE",
      });
      if (!target)
        throw new AppError(
          404,
          "FACILITY_UNAVAILABLE",
          "That facility is unavailable.",
        );
      linkFacilityId = target._id;
      linkStatus = String(target.ownerId) === userId ? "CONFIRMED" : "PENDING";
    } else if (practice.mode === "own_clinic") {
      facility = await ownFacilityFor(user, input);
      linkFacilityId = facility._id;
    }
  }
  let profile: Profile;
  try {
    profile = await ProviderProfile.create({
      ownerId: user._id,
      providerType: input.providerType,
      villageId: oid(input.villageId),
      name: input.name,
      nameKey: keyOf(input.name),
      address: input.address,
      description: input.description,
      contacts: contactDocs(input.contacts),
      images: input.images,
      details: parsedDetails,
      practiceMode: input.practice?.mode,
      facilityId:
        linkFacilityId && linkStatus === "CONFIRMED"
          ? linkFacilityId
          : undefined,
      status: "ACTIVE",
    });
  } catch (error) {
    if (facility) await ProviderProfile.deleteOne({ _id: facility._id });
    throw error;
  }
  if (linkFacilityId)
    await ProviderLink.create({
      doctorProfileId: profile._id,
      facilityProfileId: linkFacilityId,
      initiatedBy: "doctor",
      status: linkStatus,
    });
  await ensureProviderRole(user);
  if (facility) await syncDirectoryEntry(facility);
  await syncDirectoryEntry(profile);
  const [dto] = await toDtos([profile], userId);
  const facilityDto = facility ? (await toDtos([facility], userId))[0] : null;
  return { profile: dto, facility: facilityDto };
}
async function ensureProviderRole(user: UserRecord) {
  if (!user.roles.includes("service_provider"))
    await User.updateOne(
      { _id: user._id, roles: { $ne: "service_provider" } },
      { $addToSet: { roles: "service_provider" } },
    );
}

// ---- Read ---------------------------------------------------------------------
async function myLinks(profiles: Profile[], viewerId: string) {
  const doctors = profiles
    .filter((p) => isDoctorType(p.providerType))
    .map((p) => p._id);
  const facilities = profiles
    .filter((p) => isFacilityType(p.providerType))
    .map((p) => p._id);
  if (!doctors.length && !facilities.length) return [];
  const links = await ProviderLink.find({
    $or: [
      { doctorProfileId: { $in: doctors } },
      { facilityProfileId: { $in: facilities } },
    ],
    status: { $ne: "REJECTED" },
  }).sort({ createdAt: -1 });
  return linkDtos(links, viewerId);
}
export async function listMyProfiles(user: UserRecord) {
  await connectDb();
  const userId = String(user._id);
  const rows = await ProviderProfile.find({ ownerId: user._id }).sort({
    createdAt: -1,
  });
  return {
    profiles: await toDtos(rows, userId),
    links: await myLinks(rows, userId),
  };
}
async function ownedProfile(user: UserRecord, id: string) {
  const row = await ProviderProfile.findOne({ _id: id, ownerId: user._id });
  if (!row)
    throw new AppError(
      404,
      "PROFILE_UNAVAILABLE",
      "This profile is unavailable.",
    );
  return row;
}
export async function getMyProfile(user: UserRecord, id: string) {
  await connectDb();
  const row = await ownedProfile(user, id);
  const userId = String(user._id);
  return {
    profile: (await toDtos([row], userId))[0],
    links: await myLinks([row], userId),
  };
}

// ---- Update ---------------------------------------------------------------------
export async function updateProviderProfile(
  user: UserRecord,
  id: string,
  input: z.infer<typeof updateProviderProfileSchema>,
) {
  await connectDb();
  const row = await ownedProfile(user, id);
  if ((row.__v ?? 0) !== input.version)
    throw new AppError(
      409,
      "STALE_VERSION",
      "This profile changed. Reload it.",
    );
  const type = row.providerType as ProviderType;
  if (input.contacts) {
    checkPrimary(user, input.contacts);
    row.contacts = contactDocs(input.contacts) as never;
  }
  if (input.images) {
    await checkImages(String(user._id), input.images);
    row.images = input.images as never;
  }
  if (input.details) {
    const { providerDetailsSchema } = await import("@gaavli/validation");
    const parsed = providerDetailsSchema(type).safeParse(input.details);
    if (!parsed.success)
      throw new AppError(
        422,
        "VALIDATION_ERROR",
        "Check the highlighted fields.",
      );
    await checkMasters(type, parsed.data);
    row.details = parsed.data;
  }
  if (input.name !== undefined) {
    row.name = input.name;
    row.nameKey = keyOf(input.name);
  }
  if (input.address !== undefined) row.address = input.address || undefined;
  if (input.description !== undefined)
    row.description = input.description || undefined;
  await row.save();
  await syncDirectoryEntry(row);
  return { profile: (await toDtos([row], String(user._id)))[0] };
}
export async function setProviderStatus(
  user: UserRecord,
  id: string,
  status: "ACTIVE" | "INACTIVE",
  version: number,
) {
  await connectDb();
  const row = await ownedProfile(user, id);
  if ((row.__v ?? 0) !== version)
    throw new AppError(
      409,
      "STALE_VERSION",
      "This profile changed. Reload it.",
    );
  row.status = status;
  await row.save();
  await syncDirectoryEntry(row);
  return { profile: (await toDtos([row], String(user._id)))[0] };
}

// ---- Duplicate check and search -----------------------------------------------
export async function checkDuplicates(
  user: UserRecord,
  input: z.infer<typeof providerDuplicateCheckSchema>,
) {
  await connectDb();
  const userId = String(user._id);
  const sameNumber = input.mobiles.length
    ? await ProviderProfile.find({
        villageId: oid(input.villageId),
        status: "ACTIVE",
        "contacts.mobile": { $in: input.mobiles },
      }).limit(10)
    : [];
  const key = keyOf(input.name);
  const sameType = await ProviderProfile.find({
    villageId: oid(input.villageId),
    providerType: input.providerType,
    status: "ACTIVE",
  })
    .select("name nameKey providerType villageId contacts ownerId")
    .limit(500);
  const similar = key
    ? sameType.filter(
        (row) =>
          row.nameKey === key ||
          (key.length >= 4 &&
            editDistance(row.nameKey, key, maxEdits(key.length)) <=
              maxEdits(key.length)),
      )
    : [];
  const seen = new Set<string>();
  const ordered: { row: Profile; reason: "same_number" | "similar_name" }[] =
    [];
  for (const row of sameNumber)
    if (!seen.has(String(row._id))) {
      seen.add(String(row._id));
      ordered.push({ row, reason: "same_number" });
    }
  for (const row of similar)
    if (!seen.has(String(row._id))) {
      seen.add(String(row._id));
      ordered.push({ row: row as Profile, reason: "similar_name" });
    }
  const villages = await villageMap(ordered.map((item) => item.row.villageId));
  return {
    matches: ordered.slice(0, 5).map(({ row, reason }) => {
      const publicContact = row.contacts.find((c) => c.isPublic !== false);
      return {
        id: String(row._id),
        providerType: row.providerType as ProviderType,
        name: row.name,
        village: villages.get(String(row.villageId))!,
        maskedMobile: publicContact ? masked(publicContact.mobile) : null,
        reason,
        mine: String(row.ownerId) === userId,
      };
    }),
  };
}
export async function searchProfiles(
  input: z.infer<typeof providerSearchQuerySchema>,
) {
  await connectDb();
  await activeVillage(input.villageId);
  const key = keyOf(input.q);
  const rows = await ProviderProfile.find({
    villageId: oid(input.villageId),
    status: "ACTIVE",
    ...(input.providerType ? { providerType: input.providerType } : {}),
    ...(key
      ? { nameKey: { $regex: key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") } }
      : {}),
  })
    .sort({ name: 1 })
    .limit(input.limit);
  const villages = await villageMap(rows.map((row) => row.villageId));
  return {
    results: rows.map((row) => ({
      id: String(row._id),
      providerType: row.providerType as ProviderType,
      name: row.name,
      village: villages.get(String(row.villageId))!,
    })),
  };
}

// ---- Doctor and facility links -------------------------------------------------
export async function requestLink(
  user: UserRecord,
  profileId: string,
  otherProfileId: string,
) {
  await connectDb();
  const mine = await ownedProfile(user, profileId);
  const other = await ProviderProfile.findOne({
    _id: otherProfileId,
    status: "ACTIVE",
  });
  if (!other)
    throw new AppError(
      404,
      "PROFILE_UNAVAILABLE",
      "That profile is unavailable.",
    );
  const doctor = isDoctorType(mine.providerType) ? mine : other;
  const facility = isFacilityType(mine.providerType) ? mine : other;
  if (
    !isDoctorType(doctor.providerType) ||
    !isFacilityType(facility.providerType) ||
    doctor === facility
  )
    throw new AppError(422, "LINK_INVALID", "Link a doctor with a facility.");
  const initiatedBy = mine === doctor ? "doctor" : "facility";
  const sameOwner = String(doctor.ownerId) === String(facility.ownerId);
  const existing = await ProviderLink.findOne({
    doctorProfileId: doctor._id,
    facilityProfileId: facility._id,
  });
  if (existing && existing.status !== "REJECTED")
    throw new AppError(
      409,
      "LINK_EXISTS",
      "Already linked or waiting for an answer.",
    );
  const status = sameOwner ? "CONFIRMED" : "PENDING";
  if (existing) {
    existing.status = status;
    existing.initiatedBy = initiatedBy;
    await existing.save();
  } else
    await ProviderLink.create({
      doctorProfileId: doctor._id,
      facilityProfileId: facility._id,
      initiatedBy,
      status,
    });
  if (status === "CONFIRMED") await applyLink(doctor, facility);
  return listMyProfiles(user);
}
async function applyLink(doctor: Profile, facility: Profile) {
  doctor.facilityId = facility._id;
  doctor.practiceMode = "existing_facility";
  await doctor.save();
  await syncDirectoryEntry(doctor);
}
export async function answerLink(
  user: UserRecord,
  linkId: string,
  action: "confirm" | "reject" | "remove",
) {
  await connectDb();
  const link = await ProviderLink.findById(linkId);
  if (!link)
    throw new AppError(404, "LINK_UNAVAILABLE", "This link is unavailable.");
  const doctor = await ProviderProfile.findById(link.doctorProfileId);
  const facility = await ProviderProfile.findById(link.facilityProfileId);
  if (!doctor || !facility)
    throw new AppError(404, "LINK_UNAVAILABLE", "This link is unavailable.");
  const userId = String(user._id);
  const isDoctorOwner = String(doctor.ownerId) === userId;
  const isFacilityOwner = String(facility.ownerId) === userId;
  if (!isDoctorOwner && !isFacilityOwner)
    throw new AppError(404, "LINK_UNAVAILABLE", "This link is unavailable.");
  const answerer =
    link.initiatedBy === "doctor" ? isFacilityOwner : isDoctorOwner;
  if (action === "remove") {
    await link.deleteOne();
    if (String(doctor.facilityId) === String(facility._id)) {
      doctor.facilityId = undefined;
      await doctor.save();
      await syncDirectoryEntry(doctor);
    }
  } else {
    if (link.status !== "PENDING" || !answerer)
      throw new AppError(
        403,
        "LINK_NOT_YOURS",
        "Only the other side can answer.",
      );
    link.status = action === "confirm" ? "CONFIRMED" : "REJECTED";
    await link.save();
    if (action === "confirm") await applyLink(doctor, facility);
  }
  return listMyProfiles(user);
}

// ---- Claims ---------------------------------------------------------------------
export async function claimProfile(
  user: UserRecord,
  profileId: string,
  note: string | undefined,
) {
  await connectDb();
  const row = await ProviderProfile.findOne({
    _id: profileId,
    status: "ACTIVE",
  });
  if (!row)
    throw new AppError(
      404,
      "PROFILE_UNAVAILABLE",
      "That profile is unavailable.",
    );
  if (String(row.ownerId) === String(user._id))
    throw new AppError(409, "ALREADY_YOURS", "This profile is already yours.");
  const existing = await ProviderClaim.findOne({
    profileId: row._id,
    claimantId: user._id,
    status: "PENDING",
  });
  if (existing) return { id: String(existing._id), status: "PENDING" as const };
  const created = await ProviderClaim.create({
    profileId: row._id,
    claimantId: user._id,
    note,
    status: "PENDING",
  });
  return { id: String(created._id), status: "PENDING" as const };
}

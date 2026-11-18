import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import mongoose, {
  Types,
  type mongo as Mongo,
} from "mongoose";
import { connectDb } from "../src/server/db/connect";

type RawRow = Record<string, unknown>;
type DistrictSource = {
  districtcode: string;
  districtnameenglish: string;
  districtlocalname: string;
};
type TalukaSource = {
  districtcode: string;
  subdistrictcode: string;
  subdistrictnameenglish: string;
  subdistrictlocalname: string;
};
type VillageSource = {
  districtcode: string;
  subdistrictcode: string;
  villagecode: string;
  villagenameenglish: string;
  villagelocalname?: string;
};
type ImportStats = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
};
type BulkCollection = Mongo.Collection;
type BulkOperation = Mongo.AnyBulkWriteOperation;

const collectionNames = {
  districts: "districts",
  talukas: "talukas",
  villages: "villageMasters",
} as const;
const batchSize = 500;
const apply = process.argv.includes("--apply");
const dataFile = (name: string) =>
  fileURLToPath(new URL(`../data/${name}`, import.meta.url));

function requiredText(row: RawRow, key: string, file: string, index: number) {
  const value = row[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${file} record ${index + 1}: ${key} is required`);
  }
  return value.trim();
}

function optionalText(row: RawRow, key: string) {
  const value = row[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`${key} must be text`);
  return value.trim() || undefined;
}

async function readRows<T extends RawRow>(file: string) {
  const parsed: unknown = JSON.parse(await readFile(dataFile(file), "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${file} must contain a JSON array`);
  return parsed.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${file} record ${index + 1} must be an object`);
    }
    return value as T;
  });
}

function uniqueCodes<T>(
  rows: T[],
  codeFor: (row: T) => string,
  label: string,
) {
  const seen = new Set<string>();
  for (const row of rows) {
    const code = codeFor(row);
    if (seen.has(code)) throw new Error(`${label} has duplicate official code ${code}`);
    seen.add(code);
  }
  return seen;
}

async function loadSources() {
  const [districtInput, talukaInput, villageInput] = await Promise.all([
    readRows<RawRow>("Distrcit Json.json"),
    readRows<RawRow>("Taluka Json.json"),
    readRows<RawRow>("Villages Json.json"),
  ]);
  const districts: DistrictSource[] = districtInput.map((row, index) => ({
    districtcode: requiredText(row, "districtcode", "Distrcit Json.json", index),
    districtnameenglish: requiredText(
      row,
      "districtnameenglish",
      "Distrcit Json.json",
      index,
    ),
    districtlocalname: requiredText(
      row,
      "districtlocalname",
      "Distrcit Json.json",
      index,
    ),
  }));
  const talukas: TalukaSource[] = talukaInput.map((row, index) => ({
    districtcode: requiredText(row, "districtcode", "Taluka Json.json", index),
    subdistrictcode: requiredText(
      row,
      "subdistrictcode",
      "Taluka Json.json",
      index,
    ),
    subdistrictnameenglish: requiredText(
      row,
      "subdistrictnameenglish",
      "Taluka Json.json",
      index,
    ),
    subdistrictlocalname: requiredText(
      row,
      "subdistrictlocalname",
      "Taluka Json.json",
      index,
    ),
  }));
  const villages: VillageSource[] = villageInput.map((row, index) => ({
    districtcode: requiredText(row, "districtcode", "Villages Json.json", index),
    subdistrictcode: requiredText(
      row,
      "subdistrictcode",
      "Villages Json.json",
      index,
    ),
    villagecode: requiredText(row, "villagecode", "Villages Json.json", index),
    villagenameenglish: requiredText(
      row,
      "villagenameenglish",
      "Villages Json.json",
      index,
    ),
    ...(optionalText(row, "villagelocalname")
      ? { villagelocalname: optionalText(row, "villagelocalname") }
      : {}),
  }));

  const districtCodes = uniqueCodes(
    districts,
    (row) => row.districtcode,
    "Districts",
  );
  const talukaCodes = uniqueCodes(
    talukas,
    (row) => row.subdistrictcode,
    "Talukas",
  );
  uniqueCodes(villages, (row) => row.villagecode, "Villages");
  const unknownTalukaDistricts = talukas.filter(
    (row) => !districtCodes.has(row.districtcode),
  );
  const unknownVillageDistricts = villages.filter(
    (row) => !districtCodes.has(row.districtcode),
  );
  const unknownVillageTalukas = villages.filter(
    (row) => !talukaCodes.has(row.subdistrictcode),
  );
  if (unknownTalukaDistricts.length || unknownVillageDistricts.length || unknownVillageTalukas.length) {
    throw new Error(
      `Invalid geographic references: ${unknownTalukaDistricts.length} taluka district, ${unknownVillageDistricts.length} village district, ${unknownVillageTalukas.length} village taluka`,
    );
  }
  return { districts, talukas, villages };
}

async function bulkUpsert<T>(
  collection: BulkCollection,
  rows: T[],
  makeOperation: (row: T) => BulkOperation,
): Promise<ImportStats> {
  const stats: ImportStats = {
    total: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    try {
      const result = await collection.bulkWrite(batch.map(makeOperation), {
        ordered: false,
      });
      stats.inserted += result.upsertedCount;
      stats.updated += result.modifiedCount;
      stats.skipped += result.matchedCount - result.modifiedCount;
    } catch (error) {
      const bulkError = error as {
        result?: {
          upsertedCount?: number;
          modifiedCount?: number;
          matchedCount?: number;
        };
        writeErrors?: { err?: { index?: number }; index?: number }[];
      };
      const result = bulkError.result;
      stats.inserted += result?.upsertedCount ?? 0;
      stats.updated += result?.modifiedCount ?? 0;
      stats.skipped +=
        (result?.matchedCount ?? 0) - (result?.modifiedCount ?? 0);
      const failedIndexes = new Set(
        (bulkError.writeErrors ?? []).map((item) => item.index ?? item.err?.index),
      );
      stats.failed += failedIndexes.size || batch.length;
      console.error(
        `Bulk write failed for ${collection.collectionName}, batch starting at record ${start + 1}:`,
        error,
      );
    }
  }
  return stats;
}

async function main() {
  const sources = await loadSources();
  const records = {
    districts: sources.districts.length,
    talukas: sources.talukas.length,
    villages: sources.villages.length,
  };
  const missingMarathiNames = sources.villages.filter(
    (row) => !row.villagelocalname,
  ).length;
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "validation-only",
          collections: collectionNames,
          records,
          missingVillageMarathiNames: missingMarathiNames,
          duplicateOfficialCodes: 0,
          invalidReferences: 0,
          instruction: "Pass --apply to import and verify records.",
        },
        null,
        2,
      ),
    );
    return;
  }

  await connectDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB database connection is unavailable");
  const districtCollection = db.collection(collectionNames.districts);
  const talukaCollection = db.collection(collectionNames.talukas);
  const villageCollection = db.collection(collectionNames.villages);

  await Promise.all([
    districtCollection.createIndex({ lgdCode: 1 }, { unique: true, name: "uq_lgd_code" }),
    talukaCollection.createIndex({ lgdCode: 1 }, { unique: true, name: "uq_lgd_code" }),
    villageCollection.createIndex({ lgdCode: 1 }, { unique: true, name: "uq_lgd_code" }),
    talukaCollection.createIndex({ districtId: 1, nameEn: 1 }, { name: "district_name_en" }),
    villageCollection.createIndex({ districtId: 1, talukaId: 1 }, { name: "district_taluka" }),
    villageCollection.createIndex({ talukaId: 1, nameEn: 1 }, { name: "taluka_name_en" }),
    villageCollection.createIndex({ districtLgdCode: 1, talukaLgdCode: 1 }, { name: "district_taluka_codes" }),
  ]);

  const districtStats = await bulkUpsert(
    districtCollection,
    sources.districts,
    (row) => ({
      updateOne: {
        filter: { lgdCode: row.districtcode },
        update: {
          $set: {
            lgdCode: row.districtcode,
            nameEn: row.districtnameenglish,
            nameMr: row.districtlocalname,
            state: "Maharashtra",
            source: "maharashtra-lgd-json",
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    }),
  );
  const districtIds = new Map<string, Types.ObjectId>();
  for await (const row of districtCollection.find(
    { lgdCode: { $in: sources.districts.map((item) => item.districtcode) } },
    { projection: { _id: 1, lgdCode: 1 } },
  )) districtIds.set(String(row.lgdCode), row._id as Types.ObjectId);

  const talukaStats = await bulkUpsert(
    talukaCollection,
    sources.talukas,
    (row) => ({
      updateOne: {
        filter: { lgdCode: row.subdistrictcode },
        update: {
          $set: {
            lgdCode: row.subdistrictcode,
            districtLgdCode: row.districtcode,
            districtId: districtIds.get(row.districtcode),
            nameEn: row.subdistrictnameenglish,
            nameMr: row.subdistrictlocalname,
            state: "Maharashtra",
            source: "maharashtra-lgd-json",
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    }),
  );
  const talukaIds = new Map<string, Types.ObjectId>();
  for await (const row of talukaCollection.find(
    { lgdCode: { $in: sources.talukas.map((item) => item.subdistrictcode) } },
    { projection: { _id: 1, lgdCode: 1 } },
  )) talukaIds.set(String(row.lgdCode), row._id as Types.ObjectId);

  const villageStats = await bulkUpsert(
    villageCollection,
    sources.villages,
    (row) => ({
      updateOne: {
        filter: { lgdCode: row.villagecode },
        update: {
          $set: {
            lgdCode: row.villagecode,
            districtLgdCode: row.districtcode,
            talukaLgdCode: row.subdistrictcode,
            districtId: districtIds.get(row.districtcode),
            talukaId: talukaIds.get(row.subdistrictcode),
            nameEn: row.villagenameenglish,
            nameMr: row.villagelocalname ?? null,
            state: "Maharashtra",
            source: "maharashtra-lgd-json",
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    }),
  );

  const invalidTalukaDistrictReferences = await talukaCollection
    .aggregate([
      {
        $match: {
          lgdCode: { $in: sources.talukas.map((row) => row.subdistrictcode) },
        },
      },
      {
        $lookup: {
          from: collectionNames.districts,
          localField: "districtId",
          foreignField: "_id",
          as: "district",
        },
      },
      {
        $set: { matchedDistrict: { $arrayElemAt: ["$district", 0] } },
      },
      {
        $match: {
          $expr: { $ne: ["$matchedDistrict.lgdCode", "$districtLgdCode"] },
        },
      },
      { $count: "invalid" },
    ])
    .toArray();
  const invalidVillageReferences = await villageCollection
    .aggregate([
      {
        $match: {
          lgdCode: { $in: sources.villages.map((row) => row.villagecode) },
        },
      },
      {
        $lookup: {
          from: collectionNames.districts,
          localField: "districtId",
          foreignField: "_id",
          as: "district",
        },
      },
      {
        $lookup: {
          from: collectionNames.talukas,
          localField: "talukaId",
          foreignField: "_id",
          as: "taluka",
        },
      },
      {
        $set: {
          matchedDistrict: { $arrayElemAt: ["$district", 0] },
          matchedTaluka: { $arrayElemAt: ["$taluka", 0] },
        },
      },
      {
        $match: {
          $expr: {
            $or: [
              { $ne: ["$matchedDistrict.lgdCode", "$districtLgdCode"] },
              { $ne: ["$matchedTaluka.lgdCode", "$talukaLgdCode"] },
              { $ne: ["$matchedTaluka.districtId", "$districtId"] },
            ],
          },
        },
      },
      { $count: "invalid" },
    ])
    .toArray();
  const verification = {
    collectionTotals: {
      districts: await districtCollection.countDocuments({}),
      talukas: await talukaCollection.countDocuments({}),
      villages: await villageCollection.countDocuments({}),
    },
    districts: await districtCollection.countDocuments({
      lgdCode: { $in: sources.districts.map((row) => row.districtcode) },
    }),
    talukas: await talukaCollection.countDocuments({
      lgdCode: { $in: sources.talukas.map((row) => row.subdistrictcode) },
    }),
    villages: await villageCollection.countDocuments({
      lgdCode: { $in: sources.villages.map((row) => row.villagecode) },
    }),
    invalidTalukaDistrictReferences:
      invalidTalukaDistrictReferences[0]?.invalid ?? 0,
    invalidVillageReferences: invalidVillageReferences[0]?.invalid ?? 0,
    duplicateDistrictCodes: await districtCollection
      .aggregate([
        { $match: { lgdCode: { $in: sources.districts.map((row) => row.districtcode) } } },
        { $group: { _id: "$lgdCode", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: "duplicates" },
      ])
      .toArray(),
    duplicateTalukaCodes: await talukaCollection
      .aggregate([
        { $match: { lgdCode: { $in: sources.talukas.map((row) => row.subdistrictcode) } } },
        { $group: { _id: "$lgdCode", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: "duplicates" },
      ])
      .toArray(),
    duplicateVillageCodes: await villageCollection
      .aggregate([
        { $match: { lgdCode: { $in: sources.villages.map((row) => row.villagecode) } } },
        { $group: { _id: "$lgdCode", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: "duplicates" },
      ])
      .toArray(),
    retrievableSamples: {
      district: await districtCollection.findOne(
        { lgdCode: sources.districts[0]?.districtcode },
        { projection: { lgdCode: 1, nameEn: 1, nameMr: 1 } },
      ),
      taluka: await talukaCollection.findOne(
        { lgdCode: sources.talukas[0]?.subdistrictcode },
        { projection: { lgdCode: 1, nameEn: 1, nameMr: 1, districtId: 1 } },
      ),
      village: await villageCollection.findOne(
        { lgdCode: sources.villages[0]?.villagecode },
        {
          projection: {
            lgdCode: 1,
            nameEn: 1,
            nameMr: 1,
            districtId: 1,
            talukaId: 1,
          },
        },
      ),
    },
  };
  const failures =
    districtStats.failed + talukaStats.failed + villageStats.failed;
  const hasVerificationFailure =
    verification.districts !== records.districts ||
    verification.talukas !== records.talukas ||
    verification.villages !== records.villages ||
    verification.invalidTalukaDistrictReferences !== 0 ||
    verification.invalidVillageReferences !== 0 ||
    verification.duplicateDistrictCodes.length !== 0 ||
    verification.duplicateTalukaCodes.length !== 0 ||
    verification.duplicateVillageCodes.length !== 0;
  console.log(
    JSON.stringify(
      {
        mode: "applied",
        collections: collectionNames,
        missingVillageMarathiNames: missingMarathiNames,
        statistics: {
          districts: districtStats,
          talukas: talukaStats,
          villages: villageStats,
        },
        verification,
      },
      null,
      2,
    ),
  );
  if (failures || hasVerificationFailure) {
    throw new Error(
      `Geographic import verification failed (${failures} failed writes)`,
    );
  }
}

nextEnv.loadEnvConfig(process.cwd());
try {
  await main();
} finally {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

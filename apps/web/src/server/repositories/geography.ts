import "server-only";
import mongoose, { Types } from "mongoose";
import type { GeographyPlace, GeographyVillage } from "@/lib/contracts";
import { onlyPlaceMatch, onlyVillageMatch } from "@/lib/place-match";
import { connectDb } from "../db/connect";

const districtLimit = 100;
const talukaLimit = 500;
const villageLimit = 2000;

function names(row: { _id: unknown; nameEn?: unknown; nameMr?: unknown }) {
  return {
    id: String(row._id),
    nameEn: typeof row.nameEn === "string" ? row.nameEn : "",
    nameMr: typeof row.nameMr === "string" ? row.nameMr : "",
  };
}

async function collection(name: string) {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB database connection is unavailable");
  return db.collection(name);
}

export async function listMasterDistricts(): Promise<GeographyPlace[]> {
  const districts = await collection("districts");
  const rows = await districts
    .find({}, { projection: { nameEn: 1, nameMr: 1 } })
    .sort({ nameEn: 1, _id: 1 })
    .limit(districtLimit)
    .toArray();
  return rows.map(names);
}

export async function listMasterTalukas(
  districtId: string,
): Promise<GeographyPlace[]> {
  const talukas = await collection("talukas");
  const rows = await talukas
    .find(
      { districtId: new Types.ObjectId(districtId) },
      { projection: { nameEn: 1, nameMr: 1 } },
    )
    .sort({ nameEn: 1, _id: 1 })
    .limit(talukaLimit)
    .toArray();
  return rows.map(names);
}

export async function listMasterVillages(
  talukaId: string,
): Promise<GeographyVillage[]> {
  const villages = await collection("villageMasters");
  const rows = await villages
    .find(
      { talukaId: new Types.ObjectId(talukaId) },
      { projection: { nameEn: 1, nameMr: 1 } },
    )
    .sort({ nameEn: 1, _id: 1 })
    .limit(villageLimit)
    .toArray();
  return rows.map((row) => {
    const place = names(row);
    const nameMr = place.nameMr.trim() ? place.nameMr : null;
    return {
      id: place.id,
      nameEn: place.nameEn,
      nameMr,
      nameMrMissing: !nameMr,
    };
  });
}

export async function masterLinksForVillages(
  villages: {
    id: string;
    name: string;
    nameMr: string;
    taluka: string;
    district: string;
  }[],
) {
  const links = new Map<
    string,
    { districtId: string; talukaId: string; villageMasterId: string }
  >();
  if (!villages.length) return links;
  const districts = (await listMasterDistricts()).map((row) => ({
    ...row,
    nameMr: row.nameMr.trim() ? row.nameMr : null,
  }));
  const districtIds = [
    ...new Set(
      villages.flatMap((village) => {
        const district = onlyPlaceMatch(districts, village.district);
        return district ? [district.id] : [];
      }),
    ),
  ];
  if (!districtIds.length) return links;
  const talukaCollection = await collection("talukas");
  const talukaRows = await talukaCollection
    .find(
      { districtId: { $in: districtIds.map((id) => new Types.ObjectId(id)) } },
      { projection: { nameEn: 1, nameMr: 1, districtId: 1 } },
    )
    .toArray();
  const talukas = talukaRows.map((row) => ({
    ...names(row),
    nameMr: names(row).nameMr.trim() ? names(row).nameMr : null,
    districtId: String(row.districtId),
  }));
  const talukaIds = [
    ...new Set(
      villages.flatMap((village) => {
        const district = onlyPlaceMatch(districts, village.district);
        if (!district) return [];
        const taluka = onlyPlaceMatch(
          talukas.filter((row) => row.districtId === district.id),
          village.taluka,
        );
        return taluka ? [taluka.id] : [];
      }),
    ),
  ];
  if (!talukaIds.length) return links;
  const villageCollection = await collection("villageMasters");
  const villageRows = await villageCollection
    .find(
      {
        talukaId: { $in: talukaIds.map((id) => new Types.ObjectId(id)) },
        nameEn: {
          $in: [...new Set(villages.map((village) => village.name.trim()))],
        },
      },
      { projection: { nameEn: 1, nameMr: 1, talukaId: 1 } },
    )
    .toArray();
  const masters = villageRows.map((row) => ({
    ...names(row),
    nameMr: names(row).nameMr.trim() ? names(row).nameMr : null,
    talukaId: String(row.talukaId),
  }));
  for (const village of villages) {
    const district = onlyPlaceMatch(districts, village.district);
    if (!district) continue;
    const taluka = onlyPlaceMatch(
      talukas.filter((row) => row.districtId === district.id),
      village.taluka,
    );
    if (!taluka) continue;
    const master = onlyVillageMatch(
      masters.filter((row) => row.talukaId === taluka.id),
      village.name,
      village.nameMr,
    );
    if (!master) continue;
    links.set(village.id, {
      districtId: district.id,
      talukaId: taluka.id,
      villageMasterId: master.id,
    });
  }
  return links;
}

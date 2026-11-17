import { createVillageSchema, type VillageInput } from "@/schemas";
import { csvTable, parseCsv } from "@/lib/user-csv";

export const VILLAGE_CSV_HEADERS = [
  "name",
  "nameMr",
  "taluka",
  "district",
  "pinCode",
  "latitude",
  "longitude",
] as const;
export const VILLAGE_CSV_ROW_LIMIT = 100;
export const VILLAGE_CSV_BYTE_LIMIT = 256 * 1024;

export type VillageCsvRow = {
  line: number;
  name: string;
  nameMr: string;
  taluka: string;
  district: string;
  pinCode: string;
  latitude: string;
  longitude: string;
};

function plainText(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && /^[=+\-@]/.test(trimmed.slice(1)))
    return trimmed.slice(1);
  return trimmed;
}

export function villagesToCsv(
  villages: {
    name: string;
    nameMr: string;
    taluka: string;
    district: string;
    pinCode: string;
    latitude: string;
    longitude: string;
  }[],
) {
  return csvTable(
    VILLAGE_CSV_HEADERS,
    villages.map((village) => [
      village.name,
      village.nameMr,
      village.taluka,
      village.district,
      village.pinCode,
      village.latitude,
      village.longitude,
    ]),
  );
}

export function villageSampleCsv() {
  return villagesToCsv([
    {
      name: "Example Village",
      nameMr: "उदाहरण गाव",
      taluka: "Haveli",
      district: "Pune",
      pinCode: "412206",
      latitude: "18.5204",
      longitude: "73.8567",
    },
    {
      name: "Second Village",
      nameMr: "दुसरे गाव",
      taluka: "Haveli",
      district: "Pune",
      pinCode: "",
      latitude: "",
      longitude: "",
    },
  ]);
}

export function readVillageCsv(
  text: string,
): { rows: VillageCsvRow[] } | { error: string } {
  if (text.length > VILLAGE_CSV_BYTE_LIMIT)
    return { error: "CSV file is too large." };
  const table = parseCsv(text);
  if (!table.length) return { error: "Use a CSV file with a header row." };
  const header = table[0].cells.map((value) => value.trim().toLowerCase());
  if (
    header.length !== VILLAGE_CSV_HEADERS.length ||
    VILLAGE_CSV_HEADERS.some(
      (name, index) => header[index] !== name.toLowerCase(),
    )
  )
    return {
      error:
        "Use the columns name, nameMr, taluka, district, pinCode, latitude, and longitude.",
    };
  const body = table.slice(1);
  if (!body.length)
    return { error: "Add at least one village under the header row." };
  if (body.length > VILLAGE_CSV_ROW_LIMIT)
    return {
      error: `Upload at most ${VILLAGE_CSV_ROW_LIMIT} villages at a time.`,
    };
  return {
    rows: body.map((record) => ({
      line: record.line,
      name: plainText(record.cells[0] || ""),
      nameMr: plainText(record.cells[1] || ""),
      taluka: plainText(record.cells[2] || ""),
      district: plainText(record.cells[3] || ""),
      pinCode: (record.cells[4] || "").trim(),
      latitude: (record.cells[5] || "").trim(),
      longitude: (record.cells[6] || "").trim(),
    })),
  };
}

function coordinate(value: string, label: string) {
  if (!value) return { ok: true as const, value: undefined };
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value))
    return { ok: false as const, message: `Enter a valid ${label}.` };
  return { ok: true as const, value: Number(value) };
}

export function villageNotAddedMessage(name: string, message: string) {
  const village = name.trim();
  return village ? `${village} was not added. ${message}` : message;
}

export function villageCsvKey(row: {
  name: string;
  taluka: string;
  district: string;
}) {
  return [row.name, row.taluka, row.district]
    .map((value) => value.trim().toLowerCase())
    .join("\0");
}

export function villageInputFromCsvRow(
  row: VillageCsvRow,
): { ok: true; data: VillageInput } | { ok: false; message: string } {
  const latitude = coordinate(row.latitude, "latitude");
  if (!latitude.ok) return latitude;
  const longitude = coordinate(row.longitude, "longitude");
  if (!longitude.ok) return longitude;
  if ((latitude.value === undefined) !== (longitude.value === undefined))
    return {
      ok: false,
      message: "Provide both latitude and longitude, or omit both.",
    };
  const parsed = createVillageSchema.safeParse({
    name: row.name,
    nameMr: row.nameMr,
    taluka: row.taluka,
    district: row.district,
    pinCode: row.pinCode,
    ...(latitude.value !== undefined && longitude.value !== undefined
      ? { latitude: latitude.value, longitude: longitude.value }
      : {}),
  });
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid village.",
    };
  return { ok: true, data: parsed.data };
}

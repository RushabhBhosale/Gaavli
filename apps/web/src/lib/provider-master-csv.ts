import {
  providerMasterCreateSchema,
  providerMasterGroupSchema,
} from "@gaavli/validation";
import { ProviderType, type ProviderMasterType } from "@gaavli/constants";
import { csvTable, parseCsv } from "@/lib/user-csv";

export const PROVIDER_MASTER_CSV_HEADERS = [
  "providerType",
  "masterType",
  "englishName",
  "marathiName",
  "hindiName",
  "sortOrder",
  "status",
] as const;
const LEGACY_HEADERS = [
  "englishName",
  "marathiName",
  "hindiName",
  "sortOrder",
  "status",
] as const;
export const PROVIDER_MASTER_CSV_ROW_LIMIT = 100;
export const PROVIDER_MASTER_CSV_BYTE_LIMIT = 256 * 1024;

export type ProviderMasterCsvRow = {
  line: number;
  hasGroupColumns: boolean;
  providerType: string;
  masterType: string;
  englishName: string;
  marathiName: string;
  hindiName: string;
  sortOrder: string;
  status: string;
};

type CsvRecord = {
  providerType: ProviderType;
  masterType: ProviderMasterType;
  name: { en: string; mr: string; hi: string };
  sortOrder: number;
  isActive: boolean;
};

function plainText(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && /^[=+\-@]/.test(trimmed.slice(1)))
    return trimmed.slice(1);
  return trimmed;
}

export function providerMastersToCsv(records: CsvRecord[]) {
  return csvTable(
    PROVIDER_MASTER_CSV_HEADERS,
    records.map((record) => [
      record.providerType,
      record.masterType,
      record.name.en,
      record.name.mr,
      record.name.hi,
      String(record.sortOrder),
      record.isActive ? "active" : "inactive",
    ]),
  );
}

export function providerMasterSampleCsv() {
  return providerMastersToCsv([
    {
      providerType: ProviderType.SHOP_BUSINESS,
      masterType: "SHOP_TYPE",
      name: { en: "Grocery Store", mr: "?????? ?????", hi: "?????? ?????" },
      sortOrder: 1,
      isActive: false,
    },
    {
      providerType: ProviderType.PROFESSIONAL_SERVICE,
      masterType: "PROFESSION",
      name: { en: "Electrician", mr: "?????????????", hi: "????? ????????" },
      sortOrder: 1,
      isActive: false,
    },
    {
      providerType: ProviderType.HEALTHCARE_PROFESSIONAL,
      masterType: "DOCTOR_SPECIALIZATION",
      name: { en: "Pediatrician", mr: "????????????", hi: "??? ??? ????????" },
      sortOrder: 1,
      isActive: false,
    },
    {
      providerType: ProviderType.HEALTHCARE_PROFESSIONAL,
      masterType: "DOCTOR_QUALIFICATION",
      name: { en: "MBBS", mr: "????????", hi: "????????" },
      sortOrder: 1,
      isActive: false,
    },
    {
      providerType: ProviderType.MEDICAL_FACILITY,
      masterType: "FACILITY_TYPE",
      name: { en: "Clinic", mr: "???????", hi: "???????" },
      sortOrder: 1,
      isActive: false,
    },
    {
      providerType: ProviderType.TRANSPORT_DRIVER,
      masterType: "TRANSPORT_TYPE",
      name: { en: "Passenger Transport", mr: "??????? ??????", hi: "?????? ??????" },
      sortOrder: 1,
      isActive: false,
    },
    {
      providerType: ProviderType.TRANSPORT_DRIVER,
      masterType: "VEHICLE_TYPE",
      name: { en: "Auto Rickshaw", mr: "??? ??????", hi: "??? ??????" },
      sortOrder: 1,
      isActive: false,
    },
    {
      providerType: ProviderType.OTHER_SERVICE,
      masterType: "OTHER_SERVICE_CATEGORY",
      name: { en: "Tailoring", mr: "???????", hi: "?????" },
      sortOrder: 1,
      isActive: false,
    },
    {
      providerType: ProviderType.PUBLIC_INSTITUTION,
      masterType: "INSTITUTION_TYPE",
      name: { en: "Government Office", mr: "?????? ????????", hi: "?????? ????????" },
      sortOrder: 1,
      isActive: false,
    },
    {
      providerType: ProviderType.COMMUNITY_ORGANISATION,
      masterType: "ORGANISATION_TYPE",
      name: { en: "NGO", mr: "????????? ??????", hi: "??? ?????? ?????" },
      sortOrder: 1,
      isActive: false,
    },
    {
      providerType: ProviderType.SOCIAL_HELPER,
      masterType: "HELPER_CATEGORY",
      name: { en: "Community Helper", mr: "?????? ???????", hi: "????????? ?????" },
      sortOrder: 1,
      isActive: false,
    },
    {
      providerType: ProviderType.EMERGENCY_ASSISTANCE,
      masterType: "ASSISTANCE_CATEGORY",
      name: { en: "Ambulance Service", mr: "??????????? ????", hi: "????????? ????" },
      sortOrder: 1,
      isActive: false,
    },
    {
      providerType: ProviderType.POLITICAL_OFFICE,
      masterType: "OFFICE_TYPE",
      name: { en: "Political Party Office", mr: "?????? ???? ????????", hi: "???????? ?? ????????" },
      sortOrder: 1,
      isActive: false,
    },
  ]);
}

export function readProviderMasterCsv(
  text: string,
): { rows: ProviderMasterCsvRow[] } | { error: string } {
  if (text.length > PROVIDER_MASTER_CSV_BYTE_LIMIT)
    return { error: "CSV file is too large." };
  const table = parseCsv(text);
  if (!table.length) return { error: "Use a CSV file with a header row." };
  const header = table[0].cells.map((value) => value.trim().toLowerCase());
  const hasGroupColumns =
    header.length === PROVIDER_MASTER_CSV_HEADERS.length &&
    PROVIDER_MASTER_CSV_HEADERS.every(
      (name, index) => header[index] === name.toLowerCase(),
    );
  const isLegacy =
    header.length === LEGACY_HEADERS.length &&
    LEGACY_HEADERS.every((name, index) => header[index] === name.toLowerCase());
  if (!hasGroupColumns && !isLegacy)
    return {
      error:
        "Use providerType, masterType, englishName, marathiName, hindiName, sortOrder, and status columns.",
    };
  const body = table.slice(1);
  if (!body.length)
    return { error: "Add at least one master option under the header row." };
  if (body.length > PROVIDER_MASTER_CSV_ROW_LIMIT)
    return {
      error: `Upload at most ${PROVIDER_MASTER_CSV_ROW_LIMIT} master options at a time.`,
    };
  const offset = hasGroupColumns ? 2 : 0;
  return {
    rows: body.map((record) => ({
      line: record.line,
      hasGroupColumns,
      providerType: hasGroupColumns
        ? plainText(record.cells[0] || "").toUpperCase()
        : "",
      masterType: hasGroupColumns
        ? plainText(record.cells[1] || "").toUpperCase()
        : "",
      englishName: plainText(record.cells[offset] || ""),
      marathiName: plainText(record.cells[offset + 1] || ""),
      hindiName: plainText(record.cells[offset + 2] || ""),
      sortOrder: (record.cells[offset + 3] || "").trim(),
      status: (record.cells[offset + 4] || "").trim().toLowerCase(),
    })),
  };
}

export function providerMasterInputFromCsvRow(
  row: ProviderMasterCsvRow,
  fallbackGroup?: {
    providerType: ProviderType;
    masterType: ProviderMasterType;
  },
) {
  if (row.status !== "active" && row.status !== "inactive")
    return {
      ok: false as const,
      message: "Status must be active or inactive.",
    };
  if (row.sortOrder && !/^\d+$/.test(row.sortOrder))
    return {
      ok: false as const,
      message: "Enter a whole number for the sort order.",
    };
  const rowHasProviderType = !!row.providerType;
  const rowHasMasterType = !!row.masterType;
  if (row.hasGroupColumns && (!rowHasProviderType || !rowHasMasterType))
    return {
      ok: false as const,
      message: "Provider Type and Master Group must both be provided.",
    };
  if (!row.hasGroupColumns && !fallbackGroup)
    return {
      ok: false as const,
      message: "Provider Type and Master Group are required for this CSV format.",
    };
  const group = providerMasterGroupSchema.safeParse(
    row.hasGroupColumns
      ? rowHasProviderType && rowHasMasterType
        ? { providerType: row.providerType, masterType: row.masterType }
        : {}
      : fallbackGroup,
  );
  if (!group.success)
    return {
      ok: false as const,
      message: "Choose a valid Provider Type and matching Master Group.",
    };
  const parsed = providerMasterCreateSchema.safeParse({
    ...group.data,
    name: { en: row.englishName, mr: row.marathiName, hi: row.hindiName },
    sortOrder: row.sortOrder ? Number(row.sortOrder) : 0,
    isActive: row.status === "active",
  });
  if (!parsed.success)
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message || "Invalid master option.",
    };
  return { ok: true as const, data: parsed.data };
}

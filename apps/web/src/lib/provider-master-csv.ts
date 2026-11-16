import { providerMasterCreateSchema } from "@gaavli/validation";
import type { ProviderMasterType, ProviderType } from "@gaavli/constants";
import { csvTable, parseCsv } from "@/lib/user-csv";

export const PROVIDER_MASTER_CSV_HEADERS = [
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
  englishName: string;
  marathiName: string;
  hindiName: string;
  sortOrder: string;
  status: string;
};

function plainText(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && /^[=+\-@]/.test(trimmed.slice(1)))
    return trimmed.slice(1);
  return trimmed;
}

export function providerMastersToCsv(
  records: {
    name: { en: string; mr: string; hi: string };
    sortOrder: number;
    isActive: boolean;
  }[],
) {
  return csvTable(
    PROVIDER_MASTER_CSV_HEADERS,
    records.map((record) => [
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
      name: {
        en: "Example Shop",
        mr: "उदाहरण दुकान",
        hi: "उदाहरण दुकान",
      },
      sortOrder: 1,
      isActive: true,
    },
    {
      name: {
        en: "Example Inactive",
        mr: "निष्क्रिय उदाहरण",
        hi: "निष्क्रिय उदाहरण",
      },
      sortOrder: 2,
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
  if (
    header.length !== PROVIDER_MASTER_CSV_HEADERS.length ||
    PROVIDER_MASTER_CSV_HEADERS.some(
      (name, index) => header[index] !== name.toLowerCase(),
    )
  )
    return {
      error:
        "Use the columns englishName, marathiName, hindiName, sortOrder, and status.",
    };
  const body = table.slice(1);
  if (!body.length)
    return { error: "Add at least one master option under the header row." };
  if (body.length > PROVIDER_MASTER_CSV_ROW_LIMIT)
    return {
      error: `Upload at most ${PROVIDER_MASTER_CSV_ROW_LIMIT} master options at a time.`,
    };
  return {
    rows: body.map((record) => ({
      line: record.line,
      englishName: plainText(record.cells[0] || ""),
      marathiName: plainText(record.cells[1] || ""),
      hindiName: plainText(record.cells[2] || ""),
      sortOrder: (record.cells[3] || "").trim(),
      status: (record.cells[4] || "").trim().toLowerCase(),
    })),
  };
}

export function providerMasterInputFromCsvRow(
  row: ProviderMasterCsvRow,
  group: { providerType: ProviderType; masterType: ProviderMasterType },
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
  const parsed = providerMasterCreateSchema.safeParse({
    ...group,
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

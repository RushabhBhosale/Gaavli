import { userSchema, type UserInput } from "@/schemas";

export const USER_CSV_HEADERS = [
  "name",
  "mobile",
  "roles",
  "village",
  "status",
] as const;
export const USER_CSV_ROW_LIMIT = 100;
export const USER_CSV_BYTE_LIMIT = 256 * 1024;

export type UserCsvRow = {
  line: number;
  name: string;
  mobile: string;
  roles: string;
  village: string;
  status: string;
};

type CsvRecord = { line: number; cells: string[] };

function csvCell(value: string) {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`;
  return safe;
}

export function csvTable(headers: readonly string[], rows: string[][]) {
  const lines = [
    headers.join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function usersToCsv(
  users: {
    name: string;
    mobile: string;
    roles: string[];
    village: { name: string } | null;
    status: string;
  }[],
) {
  return csvTable(
    USER_CSV_HEADERS,
    users.map((user) => [
      user.name,
      user.mobile,
      ["buyer", "seller", "coordinator"]
        .filter((role) => user.roles.includes(role))
        .join(";"),
      user.village?.name || "",
      user.status,
    ]),
  );
}

export function userSampleCsv() {
  return usersToCsv([
    {
      name: "Example Buyer",
      mobile: "9000000001",
      roles: ["buyer"],
      village: { name: "Your Village" },
      status: "active",
    },
    {
      name: "Example Seller",
      mobile: "9000000002",
      roles: ["buyer", "seller"],
      village: { name: "Your Village" },
      status: "active",
    },
    {
      name: "Example Coordinator",
      mobile: "9000000003",
      roles: ["buyer", "coordinator"],
      village: { name: "Your Village" },
      status: "pending",
    },
    {
      name: "Example Blocked",
      mobile: "9000000004",
      roles: ["buyer"],
      village: { name: "Your Village" },
      status: "blocked",
    },
  ]);
}

export function parseCsv(text: string): CsvRecord[] {
  const source = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const rows: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  const finish = () => {
    cells.push(cell);
    if (cells.some((value) => value.trim() !== ""))
      rows.push({ line: rowLine, cells });
    cells = [];
    cell = "";
    line += 1;
    rowLine = line;
  };
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else {
        if (char === "\n") line += 1;
        cell += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      cells.push(cell);
      cell = "";
    } else if (char === "\n") finish();
    else cell += char;
  }
  if (quoted) return [];
  if (cell.length || cells.length) finish();
  return rows;
}

function normalizeMobile(value: string) {
  const compact = value.trim().replace(/[\s-]/g, "");
  if (/^\+91[6-9]\d{9}$/.test(compact)) return compact.slice(3);
  if (/^91[6-9]\d{9}$/.test(compact)) return compact.slice(2);
  return compact;
}

function plainText(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && /^[=+\-@]/.test(trimmed.slice(1)))
    return trimmed.slice(1);
  return trimmed;
}

export function readUserCsv(
  text: string,
): { rows: UserCsvRow[] } | { error: string } {
  if (text.length > USER_CSV_BYTE_LIMIT)
    return { error: "CSV file is too large." };
  const table = parseCsv(text);
  if (!table.length) return { error: "Use a CSV file with a header row." };
  const header = table[0].cells.map((value) => value.trim().toLowerCase());
  if (
    header.length !== USER_CSV_HEADERS.length ||
    USER_CSV_HEADERS.some((name, index) => header[index] !== name)
  )
    return {
      error: "Use the columns name, mobile, roles, village, and status.",
    };
  const body = table.slice(1);
  if (!body.length)
    return { error: "Add at least one user under the header row." };
  if (body.length > USER_CSV_ROW_LIMIT)
    return { error: `Upload at most ${USER_CSV_ROW_LIMIT} users at a time.` };
  return {
    rows: body.map((record) => ({
      line: record.line,
      name: plainText(record.cells[0] || ""),
      mobile: normalizeMobile(record.cells[1] || ""),
      roles: (record.cells[2] || "").trim(),
      village: plainText(record.cells[3] || ""),
      status: (record.cells[4] || "").trim().toLowerCase(),
    })),
  };
}

export function userInputFromCsvRow(
  row: UserCsvRow,
  villageId: string | undefined,
): { ok: true; data: UserInput } | { ok: false; message: string } {
  if (!villageId)
    return {
      ok: false,
      message: "Enter the English name of an active village.",
    };
  if (!["active", "blocked", "pending"].includes(row.status))
    return {
      ok: false,
      message: "Status must be active, blocked, or pending.",
    };
  const roles = row.roles
    .split(/[;,|]/)
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
  if (roles.some((role) => !["buyer", "seller", "coordinator"].includes(role)))
    return {
      ok: false,
      message: "Roles must be buyer, seller, or coordinator.",
    };
  const parsed = userSchema.safeParse({
    name: row.name,
    mobile: row.mobile,
    roles,
    village: villageId,
    status: row.status,
  });
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid user.",
    };
  return { ok: true, data: parsed.data };
}

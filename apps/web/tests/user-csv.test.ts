import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readUserCsv,
  userInputFromCsvRow,
  userSampleCsv,
  usersToCsv,
  USER_CSV_ROW_LIMIT,
} from "../src/lib/user-csv";

const villageId = "64b7f3c2a1d4e5f678901234";

test("user csv keeps quoted commas and accepts the upload columns", () => {
  const read = readUserCsv(
    'name,mobile,roles,village,status\r\n"Rao, Anil",+91 98765-43210,Seller;Buyer,Kalamb,Active\n',
  );
  assert.ok(!("error" in read));
  if ("error" in read) return;
  assert.equal(read.rows[0]?.name, "Rao, Anil");
  assert.equal(read.rows[0]?.mobile, "9876543210");
  assert.equal(read.rows[0]?.line, 2);
  const input = userInputFromCsvRow(read.rows[0], villageId);
  assert.equal(input.ok, true);
  if (!input.ok) return;
  assert.deepEqual(input.data.roles, ["seller", "buyer"]);
  assert.equal(input.data.status, "active");
  assert.equal(input.data.village, villageId);
});

test("user csv rejects a bad header, empty body, unknown role and oversized files", () => {
  assert.equal("error" in readUserCsv("name,mobile\nA,9876543210\n"), true);
  const empty = readUserCsv("name,mobile,roles,village,status\n");
  assert.equal("error" in empty, true);
  if ("error" in empty) assert.match(empty.error, /at least one user/);
  const unknown = readUserCsv(
    "name,mobile,roles,village,status\nAnil Rao,9876543210,admin,Kalamb,active\n",
  );
  assert.ok(!("error" in unknown));
  if ("error" in unknown) return;
  const input = userInputFromCsvRow(unknown.rows[0], villageId);
  assert.equal(input.ok, false);
  const rows = Array.from(
    { length: USER_CSV_ROW_LIMIT + 1 },
    (_, index) => `User ${index},9876543210,buyer,Kalamb,active`,
  );
  const tooMany = readUserCsv(
    `name,mobile,roles,village,status\n${rows.join("\n")}\n`,
  );
  assert.equal("error" in tooMany, true);
});

test("user sample csv is a valid upload file", () => {
  const read = readUserCsv(userSampleCsv());
  assert.ok(!("error" in read));
  if ("error" in read) return;
  assert.equal(read.rows.length, 4);
  assert.deepEqual(
    read.rows.map((row) => row.roles),
    ["buyer", "buyer;seller", "buyer;coordinator", "buyer"],
  );
  assert.deepEqual(
    read.rows.map((row) => row.status),
    ["active", "active", "pending", "blocked"],
  );
  assert.equal(read.rows[0]?.village, "Your Village");
});

test("user csv export escapes formulas and quotes", () => {
  const csv = usersToCsv([
    {
      name: '=HYPERLINK("https://example.test")',
      mobile: "9876543210",
      roles: ["seller", "buyer", "service_provider"],
      village: { name: "Kalamb" },
      status: "active",
    },
  ]);
  assert.match(csv, /^\uFEFF/);
  assert.match(csv, /name,mobile,roles,village,status/);
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example.test""\)"/);
  assert.match(csv, /,buyer;seller,Kalamb,active/);
  const read = readUserCsv(csv);
  assert.ok(!("error" in read));
  if ("error" in read) return;
  assert.equal(read.rows[0]?.name, '=HYPERLINK("https://example.test")');
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readVillageCsv,
  villageInputFromCsvRow,
  villageSampleCsv,
  VILLAGE_CSV_ROW_LIMIT,
} from "../src/lib/village-csv";

test("village sample csv is a valid upload file", () => {
  const read = readVillageCsv(villageSampleCsv());
  assert.ok(!("error" in read));
  if ("error" in read) return;
  assert.equal(read.rows.length, 2);
  assert.equal(read.rows[0]?.nameMr, "उदाहरण गाव");
  const located = villageInputFromCsvRow(read.rows[0]);
  assert.equal(located.ok, true);
  if (!located.ok) return;
  assert.equal(located.data.latitude, 18.5204);
  assert.equal(located.data.longitude, 73.8567);
  assert.equal(located.data.pinCode, "412206");
  const open = villageInputFromCsvRow(read.rows[1]);
  assert.equal(open.ok, true);
  if (!open.ok) return;
  assert.equal(open.data.latitude, undefined);
  assert.equal(open.data.pinCode, "");
});

test("village csv rejects a partial coordinate and a bad header", () => {
  const partial = readVillageCsv(
    "name,nameMr,taluka,district,pinCode,latitude,longitude\nKalamb,कळंब,Haveli,Pune,,18.5,\n",
  );
  assert.ok(!("error" in partial));
  if ("error" in partial) return;
  const input = villageInputFromCsvRow(partial.rows[0]);
  assert.equal(input.ok, false);
  assert.equal("error" in readVillageCsv("name,district\nKalamb,Pune\n"), true);
  const rows = Array.from(
    { length: VILLAGE_CSV_ROW_LIMIT + 1 },
    (_, index) => `Village ${index},गाव ${index},Haveli,Pune,,,`,
  );
  assert.equal(
    "error" in
      readVillageCsv(
        `name,nameMr,taluka,district,pinCode,latitude,longitude\n${rows.join("\n")}\n`,
      ),
    true,
  );
});

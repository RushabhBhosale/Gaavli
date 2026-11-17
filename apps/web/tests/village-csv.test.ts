import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readVillageCsv,
  villageCsvKey,
  villageInputFromCsvRow,
  villageNotAddedMessage,
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

test("village csv keeps the free-text columns and distinguishes the same English name", () => {
  const read = readVillageCsv(
    "name,nameMr,taluka,district,pinCode,latitude,longitude\nNandgaon,नांदगाव,Haveli,Pune,,,\nNandgaon,नांदगाव,Karjat,Raigad,,,\n",
  );
  assert.ok(!("error" in read));
  if ("error" in read) return;
  assert.notEqual(villageCsvKey(read.rows[0]), villageCsvKey(read.rows[1]));
  assert.equal(villageCsvKey(read.rows[0]), villageCsvKey({ ...read.rows[0] }));
  const first = villageInputFromCsvRow(read.rows[0]);
  const second = villageInputFromCsvRow(read.rows[1]);
  assert.equal(first.ok && second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.data.villageMasterId, undefined);
  assert.equal(first.data.name, "Nandgaon");
  assert.equal(second.data.taluka, "Karjat");
  assert.equal(second.data.district, "Raigad");
});

test("a skipped village upload names the village that was not added", () => {
  assert.equal(
    villageNotAddedMessage(
      "Kalamb",
      "A village with this name, taluka, and district already exists.",
    ),
    "Kalamb was not added. A village with this name, taluka, and district already exists.",
  );
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

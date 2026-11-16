import { test } from "node:test";
import assert from "node:assert/strict";
import { ProviderType } from "@gaavli/constants";
import {
  providerMasterInputFromCsvRow,
  providerMasterSampleCsv,
  readProviderMasterCsv,
  PROVIDER_MASTER_CSV_ROW_LIMIT,
} from "../src/lib/provider-master-csv";

const group = {
  providerType: ProviderType.SHOP_BUSINESS,
  masterType: "SHOP_TYPE" as const,
};

test("provider master sample csv is a valid upload file", () => {
  const read = readProviderMasterCsv(providerMasterSampleCsv());
  assert.ok(!("error" in read));
  if ("error" in read) return;
  assert.equal(read.rows.length, 2);
  const active = providerMasterInputFromCsvRow(read.rows[0], group);
  assert.equal(active.ok, true);
  if (!active.ok) return;
  assert.equal(active.data.name.en, "Example Shop");
  assert.equal(active.data.name.mr, "उदाहरण दुकान");
  assert.equal(active.data.sortOrder, 1);
  assert.equal(active.data.isActive, true);
  assert.equal(active.data.masterType, "SHOP_TYPE");
  const inactive = providerMasterInputFromCsvRow(read.rows[1], group);
  assert.equal(inactive.ok, true);
  if (!inactive.ok) return;
  assert.equal(inactive.data.isActive, false);
});

test("provider master csv rejects a bad status and too many rows", () => {
  const invalid = readProviderMasterCsv(
    "englishName,marathiName,hindiName,sortOrder,status\nShop,दुकान,दुकान,1,open\n",
  );
  assert.ok(!("error" in invalid));
  if ("error" in invalid) return;
  assert.equal(providerMasterInputFromCsvRow(invalid.rows[0], group).ok, false);
  assert.equal(
    "error" in readProviderMasterCsv("englishName,status\nShop,active\n"),
    true,
  );
  const rows = Array.from(
    { length: PROVIDER_MASTER_CSV_ROW_LIMIT + 1 },
    (_, index) => `Shop ${index},दुकान,दुकान,0,active`,
  );
  assert.equal(
    "error" in
      readProviderMasterCsv(
        `englishName,marathiName,hindiName,sortOrder,status\n${rows.join("\n")}\n`,
      ),
    true,
  );
});

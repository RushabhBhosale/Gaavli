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

test("provider master sample csv includes each valid type and master group", () => {
  const read = readProviderMasterCsv(providerMasterSampleCsv());
  assert.ok(!("error" in read));
  if ("error" in read) return;
  assert.equal(read.rows.length, 13);
  const groups = read.rows.map((row) => {
    const parsed = providerMasterInputFromCsvRow(row, group);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return "";
    assert.equal(parsed.data.isActive, false);
    return parsed.data.providerType + "/" + parsed.data.masterType;
  });
  assert.deepEqual(groups, [
    "SHOP_BUSINESS/SHOP_TYPE",
    "PROFESSIONAL_SERVICE/PROFESSION",
    "HEALTHCARE_PROFESSIONAL/DOCTOR_SPECIALIZATION",
    "HEALTHCARE_PROFESSIONAL/DOCTOR_QUALIFICATION",
    "MEDICAL_FACILITY/FACILITY_TYPE",
    "TRANSPORT_DRIVER/TRANSPORT_TYPE",
    "TRANSPORT_DRIVER/VEHICLE_TYPE",
    "OTHER_SERVICE/OTHER_SERVICE_CATEGORY",
    "PUBLIC_INSTITUTION/INSTITUTION_TYPE",
    "COMMUNITY_ORGANISATION/ORGANISATION_TYPE",
    "SOCIAL_HELPER/HELPER_CATEGORY",
    "EMERGENCY_ASSISTANCE/ASSISTANCE_CATEGORY",
    "POLITICAL_OFFICE/OFFICE_TYPE",
  ]);
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

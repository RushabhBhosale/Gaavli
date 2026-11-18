import { test } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../src/server/utils/errors";
import { districtIdQuery, talukaIdQuery } from "../src/lib/geography-query";
import { onlyPlaceMatch, onlyVillageMatch } from "../src/lib/place-match";
import {
  fieldsFromMaster,
  rejectIfMasterTaken,
  requireMasterSnapshot,
  villageDuplicateMessage,
  type MasterSnapshot,
} from "../src/lib/village-master";

const master: MasterSnapshot = {
  id: "1234567890abcdef12345678",
  nameEn: "Nandgaon",
  nameMr: "नांदगाव",
  lgdCode: "5001",
  districtId: "abcdef1234567890abcdef12",
  talukaId: "1234abcdef567890abcdef12",
  districtName: "Pune",
  talukaName: "Haveli",
};

test("unknown village master is rejected", () => {
  assert.throws(
    () => requireMasterSnapshot(null),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 422 &&
      error.message === "Choose an official village.",
  );
});

test("district and taluka names come from the master", () => {
  const fields = fieldsFromMaster(master, "ब्राउझर");
  assert.equal(fields.district, "Pune");
  assert.equal(fields.taluka, "Haveli");
  assert.equal(fields.nameEn, "Nandgaon");
  assert.equal(fields.nameMr, "नांदगाव");
  assert.equal(fields.villageMasterId, master.id);
});

test("Marathi from the master replaces a typed name, and a missing master name is required", () => {
  assert.equal(fieldsFromMaster(master, "दुसरे").nameMr, "नांदगाव");
  const missing = { ...master, nameMr: null };
  assert.throws(
    () => fieldsFromMaster(missing, undefined),
    (error: unknown) =>
      error instanceof AppError &&
      error.message === "Enter the Marathi village name.",
  );
  assert.throws(
    () => fieldsFromMaster(missing, "अ"),
    (error: unknown) => error instanceof AppError && error.status === 422,
  );
  assert.equal(fieldsFromMaster(missing, "  नाव  ").nameMr, "नाव");
});

test("a second live village with the same master id is rejected", () => {
  assert.throws(
    () => rejectIfMasterTaken("abcdef1234567890abcdef12"),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 409 &&
      error.message === "This official village is already added.",
  );
  assert.doesNotThrow(() =>
    rejectIfMasterTaken("abcdef1234567890abcdef12", "abcdef1234567890abcdef12"),
  );
});

test("E11000 on villageMasterId becomes the same conflict as a duplicate master", () => {
  assert.equal(
    villageDuplicateMessage({
      code: 11000,
      keyPattern: { villageMasterId: 1 },
    }),
    "This official village is already added.",
  );
  assert.equal(
    villageDuplicateMessage({
      code: 11000,
      message: "E11000 duplicate key error collection: villages index: uq_village_master",
    }),
    "This official village is already added.",
  );
  assert.equal(
    villageDuplicateMessage({ code: 11000, keyPattern: { nameEn: 1 } }),
    "A village with this name already exists.",
  );
});

test("an existing village name resolves one district, taluka and village master", () => {
  const districts = [
    { id: "district-pune", nameEn: "Pune", nameMr: "पुणे" },
    { id: "district-raigad", nameEn: "Raigad", nameMr: "रायगड" },
  ];
  const talukas = [
    { id: "taluka-ambegaon", nameEn: "Ambegaon", nameMr: "आंबेगाव" },
    { id: "taluka-haveli", nameEn: "Haveli", nameMr: "हवेली" },
  ];
  const villages = [
    { id: "village-kalamb", nameEn: "Kalamb", nameMr: "कळंब" },
    { id: "village-other", nameEn: "Kalamb", nameMr: "दुसरे" },
  ];
  assert.equal(onlyPlaceMatch(districts, "Pune")?.id, "district-pune");
  assert.equal(onlyPlaceMatch(talukas, "Ambegaon")?.id, "taluka-ambegaon");
  assert.equal(
    onlyVillageMatch(villages, "Kalamb", "कळंब")?.id,
    "village-kalamb",
  );
  assert.equal(onlyVillageMatch(villages, "Kalamb", ""), undefined);
  assert.equal(onlyPlaceMatch(districts, "Unknown"), undefined);
});

test("geography queries reject a missing or invalid parent id", () => {
  assert.throws(
    () => talukaIdQuery("http://localhost/api/v1/admin/geography/villages"),
    (error: unknown) => error instanceof AppError && error.status === 400,
  );
  assert.throws(
    () =>
      talukaIdQuery(
        "http://localhost/api/v1/admin/geography/villages?talukaId=",
      ),
    (error: unknown) => error instanceof AppError && error.status === 400,
  );
  assert.throws(
    () =>
      talukaIdQuery(
        "http://localhost/api/v1/admin/geography/villages?talukaId=nope",
      ),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 400 &&
      error.message === "Invalid ID",
  );
  assert.equal(
    talukaIdQuery(
      "http://localhost/api/v1/admin/geography/villages?talukaId=1234567890abcdef12345678",
    ),
    "1234567890abcdef12345678",
  );
  assert.throws(
    () => districtIdQuery("http://localhost/api/v1/admin/geography/talukas"),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 400 &&
      error.message === "Choose a district.",
  );
});

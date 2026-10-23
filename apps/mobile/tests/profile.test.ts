import assert from "node:assert/strict";
import { test } from "node:test";
import {
  updateMobileProfileSchema,
  mobileChangeSchema,
} from "@gaavli/validation";
import { editableProfileDraft, profileSaveBody } from "../src/data/profile";
import { messages } from "../src/i18n";
import { errorMessage } from "../src/errors";
import { ApiError } from "../src/api/client";

const profile = {
  firstName: "Riya",
  lastName: "More",
  mobile: "9876543210",
  address: null,
  alternativeMobile: null,
  occupation: null,
  photoUrl: null,
  version: 2,
};
test("profile Save serializes only editable fields and never names, primary phone or photo", () => {
  const draft = editableProfileDraft(profile);
  const result = profileSaveBody({
    ...draft,
    address: " Main road ",
    occupation: " Farmer ",
    alternativeMobile: "+91 98765 43211",
    ...{
      firstName: "Changed",
      mobile: "9999999999",
      photoObjectKey: "invalid",
    },
  });
  assert.ok(result.success);
  assert.deepEqual(result.data, {
    address: "Main road",
    occupation: "Farmer",
    alternativeMobile: "9876543211",
    version: 2,
  });
  assert.equal(profile.firstName, "Riya");
  for (const field of [
    "name",
    "firstName",
    "lastName",
    "mobile",
    "roles",
    "userId",
    "photoObjectKey",
  ])
    assert.equal(
      updateMobileProfileSchema.safeParse({ ...draft, [field]: "injected" })
        .success,
      false,
    );
});
test("profile fields can be cleared; invalid phone, oversized text and invalid versions fail", () => {
  assert.deepEqual(profileSaveBody(editableProfileDraft(profile)), {
    success: true,
    data: {
      address: null,
      alternativeMobile: null,
      occupation: null,
      version: 2,
    },
  });
  for (const patch of [
    { address: "a".repeat(301) },
    { occupation: "x".repeat(101) },
    { alternativeMobile: "123" },
    { version: -1 },
  ])
    assert.equal(
      profileSaveBody({ ...editableProfileDraft(profile), ...patch }).success,
      false,
    );
  assert.equal(
    mobileChangeSchema.safeParse({ mobile: "+91 98765 43211" }).success,
    true,
  );
  assert.equal(
    mobileChangeSchema.safeParse({ mobile: "123", firstName: "Injected" })
      .success,
    false,
  );
});
test("profile conflict and OTP/mobile errors are localized in Marathi and English", () => {
  for (const language of ["mr", "en"] as const) {
    const t = messages(language);
    for (const value of [
      t.myProfile,
      t.firstName,
      t.lastName,
      t.registeredFieldsReadOnly,
      t.changeWithOtp,
      t.alternativeMobile,
      t.profileOccupation,
      t.profileSaved,
    ])
      assert.ok(value.trim());
    assert.equal(
      errorMessage(new ApiError("PROFILE_CONFLICT", 409), language),
      t.profileConflict,
    );
    assert.equal(
      errorMessage(new ApiError("MOBILE_UNAVAILABLE", 409), language),
      t.mobileUnavailable,
    );
  }
});

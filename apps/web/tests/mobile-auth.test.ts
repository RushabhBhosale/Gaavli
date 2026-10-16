import { test } from "node:test";
import assert from "node:assert/strict";
import {
  indianMobileSchema,
  registrationSchema,
  sendOtpSchema,
  loginSchema,
  verifyOtpSchema,
  villageSearchSchema,
  selectVillageSchema,
} from "@gaavli/validation";
import {
  otpProvider,
  hashToken,
  newToken,
  otpDigest,
} from "../src/server/auth/mobile-policy";
import { editVillageSchema } from "../src/schemas";

test("Indian numbers normalize to the existing ten-digit identity", () => {
  for (const value of [
    "9876543210",
    "+91 98765 43210",
    "919876543210",
    "98765-43210",
  ])
    assert.equal(indianMobileSchema.parse(value), "9876543210");
  for (const value of [
    "1234567890",
    "+19876543210",
    "987654321",
    "98765432100",
    "9876543210abc",
  ])
    assert.equal(indianMobileSchema.safeParse(value).success, false);
});
test("registration requires both names and rejects role injection", () => {
  const valid = {
    firstName: "रिया",
    lastName: "मोरे",
    mobile: "9876543210",
    language: "mr",
  };
  assert.ok(registrationSchema.safeParse(valid).success);
  assert.equal(
    registrationSchema.safeParse({
      ...valid,
      firstName: "A".repeat(60),
      lastName: "B".repeat(60),
    }).success,
    false,
    "new display names must remain editable in admin",
  );
  for (const invalid of [
    { ...valid, firstName: " " },
    { ...valid, lastName: "" },
    { ...valid, firstName: "<script>" },
    { ...valid, roles: ["coordinator"] },
    { ...valid, language: "hi" },
  ])
    assert.equal(registrationSchema.safeParse(invalid).success, false);
  assert.equal(
    verifyOtpSchema.safeParse({
      challengeId: crypto.randomUUID(),
      code: "12345",
    }).success,
    false,
  );
});
test("returning login needs only a normalized mobile and language; partial registration and injected roles fail", () => {
  const login = { mobile: "+91 98765 43210", language: "mr" };
  assert.deepEqual(sendOtpSchema.parse(login), {
    mobile: "9876543210",
    language: "mr",
  });
  assert.ok(loginSchema.safeParse(login).success);
  assert.ok(
    sendOtpSchema.safeParse({ ...login, firstName: "Riya", lastName: "More" })
      .success,
  );
  for (const invalid of [
    { ...login, firstName: "Riya" },
    { ...login, firstName: "", lastName: "" },
    { ...login, roles: ["seller"] },
    { ...login, mobile: "123" },
  ])
    assert.equal(sendOtpSchema.safeParse(invalid).success, false);
});

test("village query constrains pagination and coordinates and selection accepts only IDs", () => {
  assert.ok(
    villageSearchSchema.safeParse({ search: "410221", page: "2" }).success,
  );
  for (const invalid of [
    { latitude: "19" },
    { latitude: "91", longitude: "73" },
    { page: "0" },
    { limit: "1000" },
    { isActive: "false" },
  ])
    assert.equal(villageSearchSchema.safeParse(invalid).success, false);
  assert.equal(
    selectVillageSchema.safeParse({ villageId: "bad", roles: ["seller"] })
      .success,
    false,
  );
  const edit = {
    name: "Village",
    nameMr: "गाव",
    taluka: "Panvel",
    district: "Raigad",
    coordinatorIds: [],
    version: 0,
    pinCode: "410221",
  };
  assert.ok(
    editVillageSchema.safeParse(edit).success,
    "PIN editing must not require fabricated coordinates",
  );
  assert.equal(
    editVillageSchema.safeParse({ ...edit, pinCode: "123" }).success,
    false,
  );
});
test("test OTP provider fails closed outside development and secrets are hashed", async () => {
  const old = {
    NODE_ENV: process.env.NODE_ENV,
    OTP_PROVIDER: process.env.OTP_PROVIDER,
    OTP_TEST_CODE: process.env.OTP_TEST_CODE,
    MOBILE_AUTH_SECRET: process.env.MOBILE_AUTH_SECRET,
  };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      OTP_PROVIDER: "test",
      OTP_TEST_CODE: "123456",
      MOBILE_AUTH_SECRET: "a".repeat(64),
    });
    assert.throws(otpProvider);
    Object.assign(process.env, { NODE_ENV: "development" });
    assert.equal(otpProvider().code().length, 6);
    assert.notEqual(
      otpDigest("first", "123456"),
      otpDigest("second", "123456"),
    );
    const token = newToken();
    assert.equal(token.length, 64);
    assert.notEqual(hashToken(token), token);
  } finally {
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

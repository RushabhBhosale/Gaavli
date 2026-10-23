// Runs ONLY against a randomly named, isolated test database on the configured server.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import {
  registrationSchema,
  loginSchema,
  villageSearchSchema,
} from "@gaavli/validation";
nextEnv.loadEnvConfig(process.cwd());
const originalUri = process.env.MONGODB_URI;
if (!originalUri)
  throw new Error(
    "MONGODB_URI is needed for isolated integration verification.",
  );
const databaseName = `gaavli_mobile_test_${randomBytes(8).toString("hex")}`;
const uri = new URL(originalUri);
uri.pathname = `/${databaseName}`;
process.env.MONGODB_URI = uri.toString();
Object.assign(process.env, {
  NODE_ENV: "development",
  OTP_PROVIDER: "test",
  OTP_TEST_CODE: "123456",
  MOBILE_AUTH_SECRET: randomBytes(32).toString("hex"),
});
const { sendOtp, verifyOtp, requireMobile, refreshMobile, logoutMobile } =
  await import("../src/server/services/mobile-auth");
const { User, Village, AdminSession } = await import("../src/server/models");
const { OtpChallenge, MobileSession, MobileRateLimit } =
  await import("../src/server/models/mobile-auth");
const { searchMobileVillages, saveMobileVillage, mobileUserDto } =
  await import("../src/server/repositories/mobile");
const { hashToken } = await import("../src/server/auth/mobile-policy");
const { AppError } = await import("../src/server/utils/errors");
const input = registrationSchema.parse({
  firstName: "Riya",
  lastName: "More",
  mobile: "+91 9876543210",
  language: "mr",
});
const rejects = async (work: Promise<unknown>, code: string) =>
  assert.rejects(
    work,
    (error: unknown) => error instanceof AppError && error.code === code,
  );
const request = (token: string) =>
  new Request("http://localhost/api/v1/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
try {
  const challenge = await sendOtp(input, "integration");
  assert.equal(
    await User.countDocuments(),
    0,
    "sending OTP must not create an account",
  );
  assert.equal("code" in challenge, false);
  const stored = await OtpChallenge.findOne({
    challengeId: challenge.challengeId,
  });
  assert.ok(stored?.codeHash && stored.codeHash !== process.env.OTP_TEST_CODE);
  await rejects(sendOtp(input, "integration"), "OTP_THROTTLED");
  await rejects(
    verifyOtp(
      { challengeId: challenge.challengeId, code: "000000" },
      "integration",
    ),
    "OTP_INVALID",
  );
  const signedIn = await verifyOtp(
    { challengeId: challenge.challengeId, code: "123456" },
    "integration",
  );
  assert.equal(signedIn.user.village, null);
  assert.equal(signedIn.user.firstName, "Riya");
  assert.equal(await User.countDocuments(), 1);
  assert.deepEqual((await User.findById(signedIn.user.id))?.roles, ["buyer"]);
  assert.ok(
    await MobileSession.exists({ accessHash: hashToken(signedIn.accessToken) }),
  );
  assert.equal(await AdminSession.countDocuments(), 0);
  await rejects(
    verifyOtp(
      { challengeId: challenge.challengeId, code: "123456" },
      "integration",
    ),
    "OTP_EXPIRED",
  );
  const restored = await requireMobile(request(signedIn.accessToken));
  assert.equal((await mobileUserDto(restored)).village, null);

  const villages = await Village.create([
    {
      nameEn: "Palaspe",
      nameMr: "पळस्पे",
      taluka: "Panvel",
      district: "Raigad",
      pinCode: "410221",
      location: { type: "Point", coordinates: [73.1, 19.0] },
    },
    {
      nameEn: "Nearby",
      nameMr: "जवळचे",
      taluka: "Panvel",
      district: "Raigad",
      pinCode: "410221",
    },
    {
      nameEn: "Inactive",
      nameMr: "बंद",
      taluka: "Panvel",
      district: "Raigad",
      pinCode: "410221",
      isActive: false,
    },
  ]);
  for (const search of ["410221", "Panvel"])
    assert.equal(
      (await searchMobileVillages(villageSearchSchema.parse({ search }))).total,
      2,
    );
  assert.equal(
    (
      await searchMobileVillages(
        villageSearchSchema.parse({ search: "पळस्पे" }),
      )
    ).total,
    1,
  );
  assert.equal(
    (await searchMobileVillages(villageSearchSchema.parse({ search: ".*" })))
      .total,
    0,
  );
  const page = await searchMobileVillages(
    villageSearchSchema.parse({ search: "410221", page: 2, limit: 1 }),
  );
  assert.equal(page.villages.length, 1);
  assert.equal(page.total, 2);
  const nearby = await searchMobileVillages(
    villageSearchSchema.parse({ latitude: 19, longitude: 73.1 }),
  );
  assert.equal(nearby.total, 1, "missing coordinates are not fabricated");
  await rejects(
    saveMobileVillage(signedIn.user.id, String(villages[2]._id)),
    "VILLAGE_UNAVAILABLE",
  );
  await saveMobileVillage(signedIn.user.id, String(villages[0]._id));
  assert.equal(
    (await mobileUserDto(await requireMobile(request(signedIn.accessToken))))
      .village?.id,
    String(villages[0]._id),
  );

  await OtpChallenge.updateOne(
    { mobile: input.mobile },
    { $set: { resendAt: new Date(0) } },
  );
  const again = await sendOtp(
    { ...input, firstName: "DoNotOverwrite" },
    "integration",
  );
  const parallel = await Promise.allSettled([
    verifyOtp(
      { challengeId: again.challengeId, code: "123456" },
      "integration",
    ),
    verifyOtp(
      { challengeId: again.challengeId, code: "123456" },
      "integration",
    ),
  ]);
  assert.equal(
    parallel.filter((result) => result.status === "fulfilled").length,
    1,
    "OTP is consumed atomically",
  );
  assert.equal(
    await User.countDocuments(),
    1,
    "repeat login cannot duplicate an account",
  );
  assert.equal((await User.findById(signedIn.user.id))?.name, "Riya More");

  const refreshed = await refreshMobile(signedIn.refreshToken);
  assert.equal(refreshed.user.village?.id, String(villages[0]._id));
  await rejects(requireMobile(request(signedIn.accessToken)), "AUTH_REQUIRED");
  await requireMobile(request(refreshed.accessToken));
  Object.assign(process.env, { NODE_ENV: "production" });
  await requireMobile(request(refreshed.accessToken));
  Object.assign(process.env, { NODE_ENV: "development" });
  await User.updateOne(
    { _id: signedIn.user.id },
    { $set: { status: "blocked" } },
  );
  await rejects(requireMobile(request(refreshed.accessToken)), "AUTH_REQUIRED");
  await rejects(refreshMobile(refreshed.refreshToken), "AUTH_REQUIRED");
  await User.updateOne(
    { _id: signedIn.user.id },
    { $set: { status: "active" } },
  );
  await logoutMobile(refreshed.refreshToken);
  await rejects(requireMobile(request(refreshed.accessToken)), "AUTH_REQUIRED");
  await rejects(refreshMobile(refreshed.refreshToken), "AUTH_REQUIRED");

  // A logged-out account signs back in without submitting names.
  await User.updateOne(
    { _id: signedIn.user.id },
    { $addToSet: { roles: "seller" } },
  );
  await OtpChallenge.updateOne(
    { mobile: input.mobile },
    { $set: { resendAt: new Date(0) } },
  );
  const loginInput = loginSchema.parse({
    mobile: input.mobile,
    language: "mr",
  });
  const returningChallenge = await sendOtp(loginInput, "returning");
  const returningStored = await OtpChallenge.findOne({
    challengeId: returningChallenge.challengeId,
  });
  assert.equal(
    returningStored?.firstName,
    null,
    "old registration names must not leak into a login challenge",
  );
  const returning = await verifyOtp(
    { challengeId: returningChallenge.challengeId, code: "123456" },
    "returning",
  );
  assert.equal(returning.user.id, signedIn.user.id);
  assert.equal(returning.user.name, "Riya More");
  assert.equal(returning.user.firstName, "Riya");
  assert.equal(returning.user.lastName, "More");
  assert.equal(returning.user.village?.id, String(villages[0]._id));
  assert.equal(returning.user.isSeller, true);
  assert.equal(await User.countDocuments(), 1);
  await logoutMobile(returning.refreshToken);

  const unknownChallenge = await sendOtp(
    loginSchema.parse({ mobile: "9876543299", language: "mr" }),
    "returning",
  );
  assert.equal(
    "user" in unknownChallenge,
    false,
    "send must not disclose whether an account exists",
  );
  await rejects(
    verifyOtp(
      { challengeId: unknownChallenge.challengeId, code: "000000" },
      "returning",
    ),
    "OTP_INVALID",
  );
  await rejects(
    verifyOtp(
      { challengeId: unknownChallenge.challengeId, code: "123456" },
      "returning",
    ),
    "REGISTRATION_REQUIRED",
  );
  assert.equal(
    await User.countDocuments(),
    1,
    "mobile-only login cannot create a nameless user",
  );
  console.log(
    "PASS: logout then mobile-only OTP login restores profile/village/seller; unknown numbers require registration only after valid OTP.",
  );

  const attemptInput = { ...input, mobile: "9876543211" };
  const attempts = await sendOtp(attemptInput, "integration");
  for (let i = 0; i < 4; i++)
    await rejects(
      verifyOtp(
        { challengeId: attempts.challengeId, code: "000000" },
        "integration",
      ),
      "OTP_INVALID",
    );
  await rejects(
    verifyOtp(
      { challengeId: attempts.challengeId, code: "000000" },
      "integration",
    ),
    "OTP_ATTEMPTS_EXCEEDED",
  );
  await rejects(
    verifyOtp(
      { challengeId: attempts.challengeId, code: "123456" },
      "integration",
    ),
    "OTP_ATTEMPTS_EXCEEDED",
  );
  const expired = await sendOtp(
    { ...input, mobile: "9876543212" },
    "integration",
  );
  await OtpChallenge.updateOne(
    { challengeId: expired.challengeId },
    { $set: { expiresAt: new Date(0) } },
  );
  await rejects(
    verifyOtp(
      { challengeId: expired.challengeId, code: "123456" },
      "integration",
    ),
    "OTP_EXPIRED",
  );
  const legacy = await User.create({
    name: "Existing Display Name",
    mobile: "9876543213",
    roles: ["buyer", "seller", "coordinator"],
    village: villages[0]._id,
  });
  const legacyChallenge = await sendOtp(
    loginSchema.parse({ mobile: legacy.mobile!, language: "mr" }),
    "integration",
  );
  const legacyLogin = await verifyOtp(
    { challengeId: legacyChallenge.challengeId, code: "123456" },
    "integration",
  );
  assert.equal(legacyLogin.user.id, String(legacy._id));
  assert.equal(legacyLogin.user.firstName, null);
  assert.equal(legacyLogin.user.name, "Existing Display Name");
  assert.deepEqual((await User.findById(legacy._id))?.roles, [
    "buyer",
    "seller",
    "coordinator",
  ]);
  assert.equal(await User.countDocuments(), 2);
  assert.ok((await MobileRateLimit.countDocuments()) > 0);
  console.log(
    "PASS: isolated MongoDB onboarding integration (OTP, concurrency, sessions, legacy accounts, village search and confirmation, production test sessions).",
  );
} finally {
  // Drop only the exact fresh test database; never use the configured application's DB.
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_mobile_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

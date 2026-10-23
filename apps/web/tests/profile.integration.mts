// All writes are confined to this randomly named database and photo directory.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { rm } from "node:fs/promises";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import sharp from "sharp";

nextEnv.loadEnvConfig(process.cwd());
const originalUri = process.env.MONGODB_URI;
if (!originalUri)
  throw new Error("MONGODB_URI is required for isolated profile integration.");
const databaseName = `gaavli_profile_test_${randomBytes(8).toString("hex")}`;
const uri = new URL(originalUri);
uri.pathname = `/${databaseName}`;
const photoBase = path.resolve(process.cwd(), ".local", "profile-tests");
const photoDir = path.resolve(photoBase, databaseName);
Object.assign(process.env, {
  MONGODB_URI: uri.toString(),
  NODE_ENV: "development",
  OTP_PROVIDER: "test",
  OTP_TEST_CODE: "123456",
  MOBILE_AUTH_SECRET: randomBytes(32).toString("hex"),
  LISTING_PHOTO_UPLOAD_DIR: photoDir,
});

const { connectMobileDb } = await import("../src/server/db/mobile");
const { User } = await import("../src/server/models");
const { MobileSession, MobilePhoneChange, OtpChallenge } =
  await import("../src/server/models/mobile-auth");
const { hashToken } = await import("../src/server/auth/mobile-policy");
const { GET, PATCH } = await import("../src/app/api/v1/users/me/profile/route");
const { POST: send } =
  await import("../src/app/api/v1/users/me/mobile/send-otp/route");
const { POST: verify } =
  await import("../src/app/api/v1/users/me/mobile/verify-otp/route");
const { POST: photo } =
  await import("../src/app/api/v1/users/me/profile/photo/route");
const { uploadListingPhoto } =
  await import("../src/server/services/photo-upload");
const { verifyMobileChangeOtp } =
  await import("../src/server/services/mobile-change");
const token = randomBytes(32).toString("hex");
const otherToken = randomBytes(32).toString("hex");
const oldDeviceToken = randomBytes(32).toString("hex");
function request(route: string, body?: unknown, access = token) {
  return new Request(`http://localhost/api/v1/users/me/${route}`, {
    method: body === undefined ? "GET" : route === "profile" ? "PATCH" : "POST",
    headers: {
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
async function payload(response: Response, status = 200) {
  const body = await response.json();
  assert.equal(response.status, status, JSON.stringify(body));
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  return body;
}
try {
  await connectMobileDb();
  await MobilePhoneChange.init();
  const owner = await User.create({
    name: "Riya More",
    firstName: "Riya",
    lastName: "More",
    mobile: "9876543210",
    mobileVerified: true,
    roles: ["buyer", "seller"],
    status: "active",
  });
  const other = await User.create({
    name: "Legacy Display Name",
    mobile: "9876543212",
    status: "active",
  });
  for (const [access, user] of [
    [token, owner],
    [oldDeviceToken, owner],
    [otherToken, other],
  ] as const)
    await MobileSession.create({
      provider: "test",
      user: user._id,
      accessHash: hashToken(access),
      refreshHash: hashToken(randomBytes(32).toString("hex")),
      accessExpiresAt: new Date(Date.now() + 3600_000),
      expiresAt: new Date(Date.now() + 86400_000),
    });
  await payload(await GET(request("profile", undefined, "")), 401);
  const initial = (await payload(await GET(request("profile")))).data;
  assert.equal(initial.firstName, "Riya");
  assert.equal(initial.lastName, "More");
  assert.equal(initial.mobile, owner.mobile);
  const body = {
    address: " Village road ",
    alternativeMobile: "+91 98765 43213",
    occupation: " Farmer ",
    version: initial.version,
  };
  for (const field of [
    "name",
    "firstName",
    "lastName",
    "mobile",
    "userId",
    "roles",
    "profilePhotoObjectKey",
  ])
    await payload(
      await PATCH(request("profile", { ...body, [field]: "injected" })),
      422,
    );
  const saved = (await payload(await PATCH(request("profile", body)))).data;
  assert.equal(saved.address, "Village road");
  assert.equal(saved.alternativeMobile, "9876543213");
  assert.equal(saved.occupation, "Farmer");
  assert.equal((await User.findById(owner._id))?.name, "Riya More");
  await payload(await PATCH(request("profile", body)), 409);
  const foreign = (
    await payload(await GET(request("profile", undefined, otherToken)))
  ).data;
  assert.equal(foreign.firstName, null);
  assert.equal(foreign.lastName, null);
  assert.equal(foreign.address, null);
  assert.equal((await User.findById(other._id))?.name, "Legacy Display Name");
  const crossOrigin = new Request(
    request("profile", { ...body, version: saved.version }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Origin: "https://foreign.example",
      },
    },
  );
  await payload(await PATCH(crossOrigin), 403);
  const cleared = (
    await payload(
      await PATCH(
        request("profile", {
          address: "",
          alternativeMobile: "",
          occupation: "",
          version: saved.version,
        }),
      ),
    )
  ).data;
  assert.equal(cleared.address, null);
  assert.equal(cleared.alternativeMobile, null);

  const bytes = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#8BC34A" },
  })
    .png()
    .toBuffer();
  const uploaded = await uploadListingPhoto(
    String(owner._id),
    "profile-integration-photo-1",
    new Blob([new Uint8Array(bytes)], { type: "image/png" }),
  );
  await payload(
    await photo(
      request("profile/photo", {
        photoObjectKey: "../foreign.webp",
        version: cleared.version,
      }),
    ),
    422,
  );
  await payload(
    await photo(
      request("profile/photo", {
        photoObjectKey: `listings/${owner._id}/uploads/${"0".repeat(64)}.webp`,
        version: cleared.version,
      }),
    ),
    422,
  );
  await payload(
    await photo(
      request(
        "profile/photo",
        { photoObjectKey: uploaded.photoObjectKey, version: foreign.version },
        otherToken,
      ),
    ),
    403,
  );
  const attached = (
    await payload(
      await photo(
        request("profile/photo", {
          photoObjectKey: uploaded.photoObjectKey,
          version: cleared.version,
        }),
      ),
    )
  ).data;
  assert.ok(attached.photoUrl.endsWith(uploaded.photoObjectKey));
  const replay = (
    await payload(
      await photo(
        request("profile/photo", {
          photoObjectKey: uploaded.photoObjectKey,
          version: cleared.version,
        }),
      ),
    )
  ).data;
  assert.equal(replay.version, attached.version);
  assert.equal((await User.findById(owner._id))?.name, "Riya More");

  await payload(
    await send(request("mobile/send-otp", { mobile: other.mobile })),
    409,
  );
  const challenge = (
    await payload(
      await send(request("mobile/send-otp", { mobile: "9876543214" })),
    )
  ).data;
  const stored = await MobilePhoneChange.findOne({
    challengeId: challenge.challengeId,
  }).lean();
  assert.notEqual(stored?.codeHash, "123456");
  assert.equal("code" in challenge, false);
  await payload(
    await send(request("mobile/send-otp", { mobile: "9876543214" })),
    429,
  );
  await payload(
    await verify(
      request(
        "mobile/verify-otp",
        { challengeId: challenge.challengeId, code: "123456" },
        otherToken,
      ),
    ),
    400,
  );
  await payload(
    await verify(
      request("mobile/verify-otp", {
        challengeId: challenge.challengeId,
        code: "000000",
      }),
    ),
    400,
  );
  await OtpChallenge.create({
    mobile: "9876543210",
    challengeId: randomBytes(16).toString("hex"),
    language: "mr",
    codeHash: "old",
    expiresAt: new Date(Date.now() + 60_000),
    resendAt: new Date(),
    deleteAt: new Date(Date.now() + 60_000),
  });
  const results = await Promise.all([
    verify(
      request("mobile/verify-otp", {
        challengeId: challenge.challengeId,
        code: "123456",
      }),
    ),
    verify(
      request("mobile/verify-otp", {
        challengeId: challenge.challengeId,
        code: "123456",
      }),
    ),
  ]);
  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal((await User.findById(owner._id))?.mobile, "9876543214");
  assert.equal((await User.findById(owner._id))?.name, "Riya More");
  assert.equal(await MobileSession.countDocuments({ user: owner._id }), 1);
  assert.equal(await OtpChallenge.countDocuments({ mobile: "9876543210" }), 0);
  await payload(await GET(request("profile", undefined, oldDeviceToken)), 401);
  await payload(await GET(request("profile")), 200);
  await payload(
    await verify(
      request("mobile/verify-otp", {
        challengeId: challenge.challengeId,
        code: "123456",
      }),
    ),
    400,
  );
  await payload(
    await send(request("mobile/send-otp", { mobile: "9876543214" })),
    422,
  );

  const limited = (
    await payload(
      await send(
        request("mobile/send-otp", { mobile: "9876543215" }, otherToken),
      ),
    )
  ).data;
  for (let i = 0; i < 5; i++)
    await payload(
      await verify(
        request(
          "mobile/verify-otp",
          { challengeId: limited.challengeId, code: "000000" },
          otherToken,
        ),
      ),
      400,
    );
  const exhausted = await payload(
    await verify(
      request(
        "mobile/verify-otp",
        { challengeId: limited.challengeId, code: "123456" },
        otherToken,
      ),
    ),
    400,
  );
  assert.equal(exhausted.error.code, "OTP_ATTEMPTS_EXCEEDED");
  await MobilePhoneChange.updateOne(
    { user: other._id },
    { $set: { resendAt: new Date(0) } },
  );
  const expires = (
    await payload(
      await send(
        request("mobile/send-otp", { mobile: "9876543216" }, otherToken),
      ),
    )
  ).data;
  await MobilePhoneChange.updateOne(
    { challengeId: expires.challengeId },
    { $set: { expiresAt: new Date(0) } },
  );
  const expired = await payload(
    await verify(
      request(
        "mobile/verify-otp",
        { challengeId: expires.challengeId, code: "123456" },
        otherToken,
      ),
    ),
    400,
  );
  assert.equal(expired.error.code, "OTP_EXPIRED");
  Object.assign(process.env, { NODE_ENV: "production" });
  const { sendOtp, verifyOtp, requireMobile, refreshMobile, logoutMobile } =
    await import("../src/server/services/mobile-auth");
  const hostedChallenge = await sendOtp(
    {
      firstName: "Hosted",
      lastName: "Tester",
      mobile: "9876543217",
      language: "en",
    },
    "hosted-integration",
  );
  await assert.rejects(
    verifyOtp(
      { challengeId: hostedChallenge.challengeId, code: "000000" },
      "hosted-integration",
    ),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "OTP_INVALID",
  );
  const hostedSession = await verifyOtp(
    { challengeId: hostedChallenge.challengeId, code: "123456" },
    "hosted-integration",
  );
  assert.equal(
    (
      await requireMobile(
        request("profile", undefined, hostedSession.accessToken),
      )
    ).name,
    "Hosted Tester",
  );
  await payload(
    await GET(request("profile", undefined, hostedSession.accessToken)),
  );
  const hostedRefresh = await refreshMobile(hostedSession.refreshToken);
  await requireMobile(request("profile", undefined, hostedRefresh.accessToken));
  await logoutMobile(hostedRefresh.refreshToken);
  await payload(
    await GET(request("profile", undefined, hostedRefresh.accessToken)),
    401,
  );

  // Existing development-issued sessions and mobile-change OTPs also work hosted.
  await MobilePhoneChange.updateOne(
    { user: owner._id },
    { $set: { resendAt: new Date(0) } },
  );
  const hostedMobileChallenge = (
    await payload(
      await send(request("mobile/send-otp", { mobile: "9876543218" })),
    )
  ).data;
  const hostedMobileProfile = (
    await payload(
      await verify(
        request("mobile/verify-otp", {
          challengeId: hostedMobileChallenge.challengeId,
          code: "123456",
        }),
      ),
    )
  ).data;
  assert.equal(hostedMobileProfile.mobile, "9876543218");
  Object.assign(process.env, { OTP_PROVIDER: "disabled" });
  await assert.rejects(
    verifyMobileChangeOtp(
      String(owner._id),
      { challengeId: challenge.challengeId, code: "123456" },
      token,
    ),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "AUTH_UNAVAILABLE",
  );
  console.log(
    "PASS: isolated profile protections, photo ownership/replay, OTP limits/concurrency, production fixed-code login/session refresh/logout/mobile change, and disabled-provider rejection.",
  );
} finally {
  Object.assign(process.env, { NODE_ENV: "development" });
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_profile_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  // Verify the exact absolute temporary target before recursive cleanup on Windows.
  if (
    path.dirname(photoDir) === photoBase &&
    path.basename(photoDir) === databaseName &&
    /^gaavli_profile_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await rm(photoDir, { recursive: true, force: true });
}

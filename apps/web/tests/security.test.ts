import { test } from "node:test";
import assert from "node:assert/strict";
import { SignJWT, decodeJwt } from "jose";
import {
  loginSchema,
  userSchema,
  usersQuerySchema,
  statusUpdateSchema,
  villagesQuerySchema,
  villageSchema,
  createVillageSchema,
  editVillageSchema,
  deleteVillageSchema,
  categorySchema,
  categoriesQuerySchema,
} from "../src/schemas";
import { parseCoordinates } from "../src/lib/coordinates";
test("admin categories reject query injection, invalid modes and unrecognized fields", () => {
  const input = {
    code: "PERISHABLE",
    name: "Perishable",
    nameMr: "नाशवंत",
    defaultShelfLife: "1–2 days",
    notifyMode: "daily_digest",
  };
  assert.equal(categorySchema.safeParse(input).success, true);
  for (const invalid of [
    { ...input, code: "$where" },
    { ...input, notifyMode: "instant" },
    { ...input, nameMr: "" },
    { ...input, status: "ACTIVE" },
    { ...input, sendTime: "6 AM" },
  ])
    assert.equal(categorySchema.safeParse(invalid).success, false);
  assert.equal(
    categoriesQuerySchema.safeParse({
      sort: "activeListings",
      direction: "desc",
      page: "2",
    }).success,
    true,
  );
  for (const invalid of [
    { sort: "$where" },
    { search: { $ne: null } },
    { page: "0" },
    { limit: "101" },
    { direction: "invalid" },
  ])
    assert.equal(categoriesQuerySchema.safeParse(invalid).success, false);
});
test("village form coordinates and coordinator assignment validation", () => {
  assert.deepEqual(parseCoordinates("16.9944° N, 73.3120° E"), {
    latitude: 16.9944,
    longitude: 73.312,
  });
  assert.deepEqual(parseCoordinates("16.5 S, 73.5 W"), {
    latitude: -16.5,
    longitude: -73.5,
  });
  assert.deepEqual(parseCoordinates("0, 0"), { latitude: 0, longitude: 0 });
  for (const value of [
    "91, 73",
    "16, 181",
    "16 E, 73 N",
    "-16 N, 73 E",
    "",
    "garbage",
  ])
    assert.equal(parseCoordinates(value), null);
  const village = {
    name: "Kajali",
    nameMr: "काजळी",
    taluka: "Ratnagiri",
    district: "Ratnagiri",
    latitude: 16.9944,
    longitude: 73.312,
    coordinatorIds: ["1234567890abcdef12345678"],
  };
  assert.equal(villageSchema.safeParse(village).success, true);
  const withoutCoordinates = {
    name: village.name,
    nameMr: village.nameMr,
    taluka: village.taluka,
    district: village.district,
    coordinatorIds: village.coordinatorIds,
  };
  assert.equal(createVillageSchema.safeParse(withoutCoordinates).success, true);
  assert.equal(createVillageSchema.safeParse(village).success, true);
  assert.equal(
    createVillageSchema.safeParse({ ...withoutCoordinates, latitude: 16 })
      .success,
    false,
  );
  assert.equal(
    editVillageSchema.safeParse({ ...withoutCoordinates, version: 0 }).success,
    true,
  );
  assert.equal(
    villageSchema.safeParse({
      ...village,
      coordinatorIds: ["1234567890abcdef12345678", "abcdef1234567890abcdef12"],
    }).success,
    false,
  );
  assert.equal(deleteVillageSchema.safeParse({}).success, false);
  assert.equal(deleteVillageSchema.safeParse({ version: 0 }).success, true);
  assert.equal(deleteVillageSchema.safeParse({ version: -1 }).success, false);
  assert.equal(
    villageSchema.safeParse({ ...village, coordinatorIds: [] }).success,
    true,
  );
  assert.equal(
    villageSchema.safeParse({
      ...village,
      coordinatorIds: [...village.coordinatorIds, ...village.coordinatorIds],
    }).success,
    false,
  );
  assert.equal(
    villageSchema.safeParse({ ...village, latitude: 91 }).success,
    false,
  );
  assert.equal(
    villageSchema.safeParse({ ...village, isActive: false }).success,
    false,
  );
  assert.equal(editVillageSchema.safeParse(village).success, false);
  assert.equal(
    editVillageSchema.safeParse({ ...village, version: 0 }).success,
    true,
  );
});
import { signToken, verifyToken } from "../src/server/auth/token";
import { mergeUserRoles, coordinatorRoleChange } from "../src/lib/user-roles";
test("overlapping roles retain buyer and unrelated capabilities; coordinator changes are explicit", () => {
  assert.deepEqual(mergeUserRoles(["seller", "buyer", "coordinator"]), [
    "buyer",
    "seller",
    "coordinator",
  ]);
  assert.deepEqual(mergeUserRoles(["coordinator"]), ["buyer", "coordinator"]);
  assert.deepEqual(
    mergeUserRoles(
      ["buyer", "seller"],
      ["buyer", "seller", "coordinator", "service_provider"],
    ),
    ["buyer", "seller", "service_provider"],
  );
  assert.equal(coordinatorRoleChange([], ["buyer", "coordinator"]), "granted");
  assert.equal(
    coordinatorRoleChange(
      ["buyer", "seller", "coordinator"],
      ["buyer", "seller"],
    ),
    "removed",
  );
  assert.equal(
    coordinatorRoleChange(
      ["buyer", "coordinator"],
      ["buyer", "seller", "coordinator"],
    ),
    null,
  );
});
test("village queries bound pagination and reject invalid filters", () => {
  assert.deepEqual(villagesQuerySchema.parse({}), { page: 1, limit: 6 });
  assert.deepEqual(
    villagesQuerySchema.parse({
      search: " मोरबे ",
      district: " Raigad ",
      status: "inactive",
      page: "2",
      limit: "6",
    }),
    {
      search: "मोरबे",
      district: "Raigad",
      status: "inactive",
      page: 2,
      limit: 6,
    },
  );
  for (const input of [
    { page: "0" },
    { page: "1.5" },
    { limit: "101" },
    { status: "blocked" },
    { search: "x".repeat(101) },
    { district: { $ne: null } },
    { isActive: "true" },
  ])
    assert.equal(villagesQuerySchema.safeParse(input).success, false);
});
test("validates identifier, capabilities, pagination and mutation version", () => {
  assert.equal(
    loginSchema.safeParse({
      identifier: " admin@gaavli.com ",
      password: "secret",
      remember: true,
    }).success,
    true,
  );
  assert.equal(
    loginSchema.safeParse({
      identifier: "9000000000",
      password: "secret",
      remember: false,
    }).success,
    true,
  );
  assert.equal(
    loginSchema.safeParse({
      identifier: "123",
      password: "secret",
      remember: true,
    }).success,
    false,
  );
  const user = {
    name: "Ganesh Patil",
    mobile: "9000000000",
    roles: ["buyer"],
    village: "1234567890abcdef12345678",
    status: "active",
  };
  assert.equal(
    userSchema.safeParse({ ...user, roles: ["super_admin"] }).success,
    false,
  );
  assert.equal(
    usersQuerySchema.safeParse({ role: "coordinator" }).success,
    true,
  );
  assert.equal(
    usersQuerySchema.safeParse({ role: "super_admin" }).success,
    false,
  );
  assert.equal(
    userSchema.safeParse({ ...user, roles: ["buyer", "coordinator"] }).success,
    true,
  );
  assert.equal(
    userSchema.safeParse({ ...user, roles: ["buyer", "seller", "coordinator"] })
      .success,
    true,
  );
  assert.equal(
    userSchema.safeParse({ ...user, roles: ["coordinator", "coordinator"] })
      .success,
    false,
  );
  assert.equal(
    userSchema.safeParse({ ...user, passwordHash: "injected" }).success,
    false,
  );
  assert.equal(usersQuerySchema.safeParse({ limit: "1000" }).success, false);
  assert.equal(
    usersQuerySchema.safeParse({ village: "{$ne:null}" }).success,
    false,
  );
  assert.equal(
    statusUpdateSchema.safeParse({ status: "blocked" }).success,
    false,
  );
});
test("JWT enforces signature, expiry, audience and admin role", async () => {
  process.env.JWT_SECRET = "test-secret-only-32-characters-minimum";
  const adminId = "1234567890abcdef12345678",
    sessionId = "abcdef1234567890abcdef12";
  const token = await signToken(adminId, sessionId, 86400);
  assert.deepEqual(await verifyToken(token), { adminId, sessionId });
  const day = decodeJwt(token),
    month = decodeJwt(await signToken(adminId, sessionId, 30 * 86400));
  assert.equal(day.exp! - day.iat!, 86400);
  assert.equal(month.exp! - month.iat!, 30 * 86400);
  assert.equal(await verifyToken(`${token.slice(0, -8)}invalid!`), null);
  assert.equal(
    await verifyToken(await signToken(adminId, sessionId, -1)),
    null,
  );
  const buyerToken = await new SignJWT({ role: "buyer" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setJti(sessionId)
    .setIssuer("gaavli-admin")
    .setAudience("gaavli-admin-panel")
    .setExpirationTime("1d")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  assert.equal(await verifyToken(buyerToken), null);
  const wrongAudience = await new SignJWT({ role: "super_admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setJti(sessionId)
    .setIssuer("gaavli-admin")
    .setAudience("another-app")
    .setExpirationTime("1d")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  assert.equal(await verifyToken(wrongAudience), null);
  assert.equal(await verifyToken(), null);
});

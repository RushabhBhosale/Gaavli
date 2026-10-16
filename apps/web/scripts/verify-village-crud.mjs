import nextEnv from "@next/env";
import mongoose from "mongoose";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

nextEnv.loadEnvConfig(process.cwd());
const base = "http://localhost:3000";
const marker = `Verification-${randomUUID().slice(0, 8)}`;
const fixtures = [];
let fixtureUserId;
let cookie;
async function request(path, method = "GET", body, expected = 200) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { Origin: base, "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${payload.error?.message ?? response.status}`,
  );
  return { response, data: payload.data };
}
try {
  const login = await request("/auth/login", "POST", {
    identifier: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    remember: false,
  });
  cookie = login.response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const { data: options } = await request("/v1/admin/coordinators");
  const coordinators = options.filter(
    (user) =>
      ["Anjali Joshi", "Santosh Chavan"].includes(user.name) &&
      user.status === "active",
  );
  assert.equal(
    coordinators.length,
    2,
    "Expected active coordinator development samples",
  );
  const input = {
    name: `${marker}-A`,
    nameMr: `${marker}-अ`,
    taluka: "Test",
    district: "Test",
    latitude: 16.9944,
    longitude: 73.312,
    coordinatorIds: [coordinators[0].id],
  };
  const { data: first } = await request(
    "/v1/admin/villages",
    "POST",
    { ...input, latitude: undefined, longitude: undefined },
    201,
  );
  fixtures.push(first.id);
  const { data: second } = await request(
    "/v1/admin/villages",
    "POST",
    {
      ...input,
      name: `${marker}-B`,
      nameMr: `${marker}-ब`,
      coordinatorIds: [coordinators[0].id],
    },
    201,
  );
  fixtures.push(second.id);
  const { data: page } = await request(`/v1/admin/villages?search=${marker}`);
  assert.equal(page.total, 2);
  const row = page.villages.find((village) => village.id === first.id);
  assert.equal(row.coordinators.length, 1);
  assert.equal(row.coordinators[0].id, coordinators[0].id);
  await request(
    "/v1/admin/villages",
    "POST",
    {
      ...input,
      name: `${marker}-Multi`,
      coordinatorIds: coordinators.map((user) => user.id),
    },
    422,
  );
  await request(
    `/v1/admin/villages/${first.id}`,
    "DELETE",
    { version: first.version },
    409,
  );
  assert.equal(row.latitude, null);
  assert.equal(row.longitude, null);
  const { data: edited } = await request(
    `/v1/admin/villages/${first.id}`,
    "PUT",
    {
      ...input,
      name: `${marker}-Edited`,
      coordinatorIds: [coordinators[1].id],
      version: first.version,
    },
  );
  await request(
    `/v1/admin/villages/${first.id}`,
    "PUT",
    { ...input, version: first.version },
    409,
  );
  await request(
    "/v1/admin/villages",
    "POST",
    {
      ...input,
      name: `${marker}-Invalid`,
      coordinatorIds: ["000000000000000000000001"],
    },
    422,
  );
  const { data: dependencies } = await request(
    `/v1/admin/villages/${first.id}/dependencies`,
  );
  assert.deepEqual(dependencies, {
    users: 0,
    listings: 0,
    coordinators: 1,
    mappings: 0,
    preferences: 0,
    services: 0,
    subscriptions: 0,
  });
  const { data: deactivated } = await request(
    `/v1/admin/villages/${first.id}/status`,
    "PATCH",
    { status: "inactive", version: edited.version },
  );
  const { data: active } = await request("/villages");
  assert.equal(
    active.some((village) => village.id === first.id),
    false,
  );
  await request(`/v1/admin/villages/${first.id}/status`, "PATCH", {
    status: "active",
    version: deactivated.version,
  });
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const notices = await db.collection("notifications").countDocuments({
    body: { $regex: marker },
    type: { $in: ["VILLAGE_ASSIGNED", "VILLAGE_UNASSIGNED"] },
  });
  assert.equal(notices, 4, "Three assignment notices and one removal notice");
  assert.ok(
    await db.collection("auditlogs").findOne({
      targetId: new mongoose.Types.ObjectId(first.id),
      action: "village.updated",
    }),
  );
  const { data: fixtureUser } = await request(
    "/users",
    "POST",
    {
      name: `${marker}-Coordinator`,
      mobile: String(9000000000 + Math.floor(Math.random() * 1000000000)),
      roles: ["buyer", "coordinator"],
      village: second.id,
      status: "active",
    },
    201,
  );
  fixtureUserId = fixtureUser.id;
  const { data: refreshed } = await request(
    `/v1/admin/villages?search=${marker}`,
  );
  const refreshedVillage = refreshed.villages.find(
    (village) => village.id === first.id,
  );
  await request(`/v1/admin/villages/${first.id}`, "PUT", {
    ...input,
    name: `${marker}-Edited`,
    coordinatorIds: [fixtureUser.id],
    version: refreshedVillage.version,
  });
  const { data: users } = await request(`/users?search=${marker}`);
  const assignedUser = users.users.find((user) => user.id === fixtureUser.id);
  await request(`/users/${fixtureUser.id}`, "PUT", {
    name: assignedUser.name,
    mobile: assignedUser.mobile,
    roles: ["buyer"],
    village: second.id,
    status: "active",
    version: assignedUser.version,
  });
  assert.equal(
    await db
      .collection("villagecoordinators")
      .countDocuments({ userId: new mongoose.Types.ObjectId(fixtureUser.id) }),
    0,
    "Revoking coordinator must remove village assignments",
  );
  const { data: finalPage } = await request(
    `/v1/admin/villages?search=${marker}`,
  );
  const emptyVillage = finalPage.villages.find(
    (village) => village.id === first.id,
  );
  await request(`/v1/admin/villages/${first.id}`, "DELETE", {
    version: emptyVillage.version,
  });
  const { data: afterDelete } = await request(
    `/v1/admin/villages?search=${marker}`,
  );
  assert.equal(
    afterDelete.villages.some((village) => village.id === first.id),
    false,
  );
  fixtures.splice(fixtures.indexOf(first.id), 1);
  console.log(
    "Village create/edit, single-coordinator enforcement, listing mapping, stale version rejection, dependencies, blocked and successful deletion, status, notices, audit and role-revocation cleanup: PASS.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (fixtures.length) {
    try {
      if (mongoose.connection.readyState !== 1)
        await mongoose.connect(process.env.MONGODB_URI);
      const db = mongoose.connection.db;
      const ids = fixtures.map((id) => new mongoose.Types.ObjectId(id));
      // Only remove this run's generated fixtures; preserve audit evidence and real data.
      const owned = await db
        .collection("villages")
        .find({ _id: { $in: ids }, nameEn: { $regex: `^${marker}` } })
        .toArray();
      assert.equal(owned.length, ids.length);
      await mongoose.connection.transaction(async (session) => {
        if (fixtureUserId) {
          const userId = new mongoose.Types.ObjectId(fixtureUserId);
          await db
            .collection("notifications")
            .deleteMany({ userId }, { session });
          await db
            .collection("users")
            .deleteOne(
              { _id: userId, name: `${marker}-Coordinator` },
              { session },
            );
        }
        await db
          .collection("villagecoordinators")
          .deleteMany({ villageId: { $in: ids } }, { session });
        await db.collection("notifications").deleteMany(
          {
            body: { $regex: marker },
            type: { $in: ["VILLAGE_ASSIGNED", "VILLAGE_UNASSIGNED"] },
          },
          { session },
        );
        await db
          .collection("villages")
          .deleteMany(
            { _id: { $in: ids }, nameEn: { $regex: `^${marker}` } },
            { session },
          );
      });
      console.log(
        "Temporary test villages, assignments and notices cleaned up; audit evidence retained.",
      );
    } catch (error) {
      console.error(`Fixture cleanup: ${error.message}`);
      process.exitCode = 1;
    }
  }
  if (cookie)
    await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookie, Origin: base },
    });
  await mongoose.disconnect();
}

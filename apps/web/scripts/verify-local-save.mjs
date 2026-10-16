import nextEnv from "@next/env";
import mongoose from "mongoose";
import assert from "node:assert/strict";

nextEnv.loadEnvConfig(process.cwd());
const base = "http://localhost:3000";
let cookie;
async function request(path, method = "GET", body) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json", Origin: base } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(
      `${method} ${path}: ${payload.error?.message || response.status}`,
    );
  }
  return { response, data: payload.data };
}

try {
  const login = await request("/auth/login", "POST", {
    identifier: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    remember: false,
  });
  cookie = login.response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "Login must issue a session cookie");
  const { data: listing } = await request("/users?role=coordinator");
  const user = listing.users.find((entry) => entry.name === "Anjali Joshi");
  assert.ok(user?.village, "Expected the coordinator development sample");
  const { data: saved } = await request(`/users/${user.id}`, "PUT", {
    name: user.name,
    mobile: user.mobile,
    roles: user.roles.filter((role) =>
      ["buyer", "seller", "coordinator"].includes(role),
    ),
    village: user.village.id,
    status: user.status,
    version: user.version,
  });
  assert.equal(saved.id, user.id);
  assert.equal(saved.version, user.version + 1);
  assert.deepEqual([...saved.roles].sort(), [...user.roles].sort());
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  const audit = await mongoose.connection.db.collection("auditlogs").findOne({
    targetId: new mongoose.Types.ObjectId(saved.id),
    action: "user.updated",
  });
  assert.ok(audit, "User save must have an audit entry");
  console.log(
    "Local login, Coordinator listing, PUT user save, version increment and audit record: PASS.",
  );
  console.log("Sample profile fields and roles were preserved.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (cookie) {
    try {
      await fetch(`${base}/api/auth/logout`, {
        method: "POST",
        headers: { Cookie: cookie, Origin: base },
      });
    } catch {
      console.error("Verification session logout failed.");
      process.exitCode = 1;
    }
  }
  await mongoose.disconnect();
}

import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import assert from "node:assert/strict";
import {
  Admin,
  AuditLog,
  Notification,
  User,
  Village,
  VillageCoordinator,
} from "../src/server/models";

// Explicit, idempotent local data repair requested by the administrator.
// Home-village membership alone does not grant a village assignment.
loadEnvConfig(process.cwd());
const base = "http://localhost:3000";

async function main() {
  let cookie: string | undefined;
  try {
    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        remember: false,
      }),
    });
    assert.equal(login.status, 200, "Administrator login failed");
    const { data: actor } = await login.json();
    cookie = login.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    assert.ok(process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    await Village.db.transaction(async (session) => {
      assert.ok(
        await Admin.exists({
          _id: actor.id,
          role: "super_admin",
          status: "active",
        }).session(session),
      );
      const villages = await Village.find({
        nameEn: "Karjat",
        isActive: true,
      }).session(session);
      assert.equal(villages.length, 1, "Expected one active Karjat village");
      const village = villages[0];
      const users = await User.find({
        name: "Kavita Patil",
        village: village._id,
        roles: "coordinator",
        status: "active",
      }).session(session);
      assert.equal(
        users.length,
        1,
        "Expected one active Kavita Patil coordinator in Karjat",
      );
      const user = users[0];
      const links = await VillageCoordinator.find({
        villageId: village._id,
      }).session(session);
      assert.ok(
        links.length <= 1,
        "Multiple assignments require manual review",
      );
      if (links.length) {
        assert.equal(
          String(links[0].userId),
          String(user._id),
          "Karjat already has another coordinator; refusing to replace them",
        );
        return;
      }
      // Same document locks as the village service: protect concurrent revocation/deletion.
      assert.ok(
        await User.findOneAndUpdate(
          {
            _id: user._id,
            roles: "coordinator",
            status: "active",
            village: village._id,
          },
          { $inc: { __v: 1 } },
          { session },
        ),
      );
      assert.ok(
        await Village.findOneAndUpdate(
          { _id: village._id, isActive: true },
          { $inc: { __v: 1 } },
          { session },
        ),
      );
      await VillageCoordinator.create(
        [{ villageId: village._id, userId: user._id }],
        { session, ordered: true },
      );
      await AuditLog.create(
        [
          {
            actorId: actor.id,
            action: "village.coordinator.assigned",
            targetId: village._id,
          },
        ],
        { session },
      );
      await Notification.create(
        [
          {
            userId: user._id,
            type: "VILLAGE_ASSIGNED",
            title: "गावाची जबाबदारी मिळाली",
            body: `${village.nameMr} गावासाठी तुमची समन्वयक म्हणून नियुक्ती झाली आहे.`,
          },
        ],
        { session },
      );
    });
    const response = await fetch(
      `${base}/api/v1/admin/villages?search=Karjat`,
      { headers: { Cookie: cookie } },
    );
    assert.equal(response.status, 200);
    const { data: page } = await response.json();
    const row = page.villages.find(
      (village: { name: string }) => village.name === "Karjat",
    );
    assert.ok(row);
    assert.equal(row.coordinators.length, 1);
    assert.equal(row.coordinators[0].name, "Kavita Patil");
    console.log(
      "Verified village listing: Karjat → Kavita Patil (one assigned coordinator).",
    );
  } finally {
    if (cookie)
      await fetch(`${base}/api/auth/logout`, {
        method: "POST",
        headers: { Origin: base, Cookie: cookie },
      });
    await mongoose.disconnect();
  }
}
main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});

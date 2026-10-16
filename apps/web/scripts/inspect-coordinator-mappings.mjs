import nextEnv from "@next/env";
import mongoose from "mongoose";
nextEnv.loadEnvConfig(process.cwd());
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const assignments = await db
    .collection("villagecoordinators")
    .find({})
    .toArray();
  const users = await db
    .collection("users")
    .find(
      { roles: "coordinator" },
      { projection: { name: 1, village: 1, status: 1 } },
    )
    .toArray();
  const villages = await db
    .collection("villages")
    .find({}, { projection: { nameEn: 1 } })
    .toArray();
  console.log(
    JSON.stringify({
      coordinatorUsers: users.length,
      assignedVillages: assignments.length,
      coordinatorHomes: users.map((user) => ({
        name: user.name,
        status: user.status,
        village:
          villages.find(
            (village) => String(village._id) === String(user.village),
          )?.nameEn ?? "Missing village",
      })),
      mappings: assignments.map((assignment) => ({
        village:
          villages.find(
            (village) => String(village._id) === String(assignment.villageId),
          )?.nameEn ?? "Missing village",
        coordinator:
          users.find((user) => String(user._id) === String(assignment.userId))
            ?.name ?? "Missing coordinator role/user",
      })),
    }),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

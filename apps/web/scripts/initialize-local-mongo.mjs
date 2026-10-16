import mongoose from "mongoose";

try {
  await mongoose.connect(
    "mongodb://127.0.0.1:27017/gaavli?directConnection=true",
    {
      serverSelectionTimeoutMS: 10000,
    },
  );
  const admin = mongoose.connection.db.admin();
  const hello = await admin.command({ hello: 1 });
  if (hello.setName && hello.setName !== "rs0") {
    throw new Error("Existing replica set is not rs0; it was not changed.");
  }
  if (!hello.setName) {
    try {
      await admin.command({
        replSetInitiate: {
          _id: "rs0",
          members: [{ _id: 0, host: "localhost:27017" }],
        },
      });
      console.log("Initialized local replica set rs0.");
    } catch (error) {
      if (error.code !== 23) throw error; // AlreadyInitialized is safe on rerun.
    }
  }
  let primary = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const state = await admin.command({ hello: 1 });
    if (state.isWritablePrimary && state.setName === "rs0") {
      primary = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!primary)
    throw new Error("Replica set did not elect a primary within 30 seconds.");
  const counts = await Promise.all(
    ["villages", "users", "listings"].map((name) =>
      mongoose.connection.db.collection(name).countDocuments(),
    ),
  );
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    await mongoose.connection.db.collection("users").findOne({}, { session });
    await session.commitTransaction();
    console.log("Local replica set is writable; transaction commit PASS.");
  } finally {
    await session.endSession();
  }
  console.log(
    `Existing records: ${counts[0]} villages, ${counts[1]} users, ${counts[2]} listings.`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

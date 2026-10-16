import mongoose from "mongoose";
const globalDb = globalThis as typeof globalThis & {
  gaavliDb?: Promise<typeof mongoose>;
};
export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Database configuration missing");
  if (!globalDb.gaavliDb)
    globalDb.gaavliDb = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 5000 })
      .catch((error) => {
        globalDb.gaavliDb = undefined;
        throw error;
      });
  return globalDb.gaavliDb;
}

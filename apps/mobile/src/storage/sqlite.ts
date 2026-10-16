import * as SQLite from "expo-sqlite";
import type { PreferenceStorage } from "./preferences";
import { orderedDraftStorage } from "./orderedDrafts";

let connection: Promise<SQLite.SQLiteDatabase> | undefined;
async function openSettings() {
  const db = await SQLite.openDatabaseAsync("gaavli.db");
  try {
    await db.execAsync("PRAGMA journal_mode = WAL;");
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
      );
      if ((row?.user_version ?? 0) > 1)
        throw new Error("Unsupported settings database version");
      if ((row?.user_version ?? 0) < 1) {
        await db.execAsync(
          "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); PRAGMA user_version = 1;",
        );
      }
    });
    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}
function database() {
  connection ??= openSettings().catch((error) => {
    connection = undefined;
    throw error;
  });
  return connection;
}
export const preferenceStorage: PreferenceStorage = {
  async readLanguage() {
    const db = await database();
    return (
      (
        await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM settings WHERE key = ?",
          "language",
        )
      )?.value ?? null
    );
  },
  async writeLanguage(language) {
    const db = await database();
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      "language",
      language,
    );
  },
};

// Namespaced by account and village. No token/contact data is stored here.
export const listingDraftStorage = orderedDraftStorage({
  async list(prefix: string) {
    const db = await database();
    const namespace = `listing-draft:${prefix}`;
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      "SELECT key, value FROM settings WHERE substr(key, 1, ?) = ? ORDER BY key",
      namespace.length,
      namespace,
    );
    return rows.map((row) => ({
      key: row.key.slice("listing-draft:".length),
      value: row.value,
    }));
  },
  async read(key: string) {
    const db = await database();
    return (
      (
        await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM settings WHERE key = ?",
          `listing-draft:${key}`,
        )
      )?.value ?? null
    );
  },
  async write(key: string, value: string) {
    const db = await database();
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      `listing-draft:${key}`,
      value,
    );
  },
  async remove(key: string) {
    const db = await database();
    await db.runAsync(
      "DELETE FROM settings WHERE key = ?",
      `listing-draft:${key}`,
    );
  },
});

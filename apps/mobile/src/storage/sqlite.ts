import * as SQLite from "expo-sqlite";
import type { PreferenceStorage } from "./preferences";
import type { BrowsingVillageStorage } from "./browsingVillage";
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
async function readSetting(key: string) {
  const db = await database();
  return (
    (
      await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM settings WHERE key = ?",
        key,
      )
    )?.value ?? null
  );
}
async function writeSetting(key: string, value: string) {
  const db = await database();
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}
export const preferenceStorage: PreferenceStorage & BrowsingVillageStorage = {
  readLanguage: () => readSetting("language"),
  writeLanguage: (language) => writeSetting("language", language),
  readGuestVillage: () => readSetting("guest-village"),
  writeGuestVillage: (value) => writeSetting("guest-village", value),
  readBrowsingVillage: () => readSetting("browsing-village"),
  writeBrowsingVillage: (value) => writeSetting("browsing-village", value),
};

// Public product reference data only; no session, phone or account details.
export const productMasterCache = {
  async read() {
    const db = await database();
    return (
      (
        await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM settings WHERE key = ?",
          "reference:product-master:v1",
        )
      )?.value ?? null
    );
  },
  async write(value: string) {
    const db = await database();
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      "reference:product-master:v1",
      value,
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

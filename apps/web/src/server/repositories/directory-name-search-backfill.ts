import "server-only";
import { isDeepStrictEqual } from "node:util";
import { Service } from "../models/service";
import { directoryNameSearchWords } from "../utils/directory-name-search";

const batchSize = 250;

export async function backfillDirectoryNameSearch(apply: boolean) {
  const rows = Service.find()
    .select("profession professionMr nameSearchWords")
    .lean()
    .cursor({ batchSize });
  type Write = Parameters<typeof Service.collection.bulkWrite>[0][number];
  const writes: Write[] = [];
  let scanned = 0;
  let pending = 0;
  let updated = 0;

  async function flush() {
    if (!writes.length) return;
    const result = await Service.collection.bulkWrite(writes, {
      ordered: false,
    });
    updated += result.modifiedCount;
    writes.length = 0;
  }

  try {
    for await (const row of rows) {
      scanned++;
      const nameSearchWords = directoryNameSearchWords(
        row.profession,
        row.professionMr,
      );
      if (isDeepStrictEqual(row.nameSearchWords, nameSearchWords)) continue;
      pending++;
      if (!apply) continue;
      writes.push({
        updateOne: {
          // A concurrent profile rename publishes its own search words.
          filter: {
            _id: row._id,
            profession: row.profession,
            professionMr: row.professionMr ?? null,
          },
          update: { $set: { nameSearchWords } },
        },
      });
      if (writes.length === batchSize) await flush();
    }
    await flush();
  } finally {
    await rows.close();
  }

  return { scanned, pending, updated };
}

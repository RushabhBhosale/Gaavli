import "server-only";
import type { Types } from "mongoose";
import { CatalogSearchTerm } from "../models/catalog-search-term";
import { ProductMaster } from "../models/product-master";
import {
  deletionKeys,
  editDistance,
  maxEdits,
  normalizeCatalogTerm,
  phoneticKey,
  prefixEditDistance,
  queryTokens,
  skeletonKey,
  swapVariants,
  twoDeletionKeys,
} from "../catalog/search-text";

const CANDIDATE_LIMIT = 100;
const VERIFY_LIMIT = 2000;
const VERIFY_PRODUCTS = 300;
const POOL = 60;
const MIN_TYPO_TARGET = 4;
const QUERY_TIMEOUT_MS = 1000;

type Row = {
  product: Types.ObjectId;
  term: string;
  kind: "name" | "alias" | "word";
  key?: string;
};
// Lower scores rank first: 0 exact name, 1 exact alias, 2 exact inner word,
// 3 name/alias prefix, 4 inner-word prefix, 5 sounds alike, 6 one typo (also a
// typo while still typing), 7 two typos. 10+ are partial matches.
type Match = { score: number; term: string };
type Hit = { score: number; tokens: (Match | undefined)[] };

// What one matched word costs inside a multi-word query.
const cost = (score: number) =>
  score <= 2 ? 0 : score <= 4 ? 1 : score <= 5 ? 2 : score <= 6 ? 3 : 4;
const guessed = (match: Match | undefined) => !!match && cost(match.score) >= 2;

function classify(
  token: string,
  row: Row,
  last: boolean,
  key: string,
): Match | null {
  const term = row.term;
  if (term === token)
    return {
      score: row.kind === "name" ? 0 : row.kind === "alias" ? 1 : 2,
      term,
    };
  if (last && term.startsWith(token))
    return { score: row.kind === "word" ? 4 : 3, term };
  // Whole multi-word names only match as a whole or by prefix; their words are
  // indexed separately.
  if (term.includes(" ")) return null;
  const length = Array.from(token).length;
  let score = Infinity;
  if (length >= 3 && key && row.key === key) score = 5;
  // Very short terms (tmt, dal) are matched exactly or by sound only; as typo
  // targets they would match unrelated words.
  if (Array.from(term).length >= MIN_TYPO_TARGET) {
    const allowed = maxEdits(length);
    if (allowed) {
      const distance = editDistance(token, term, allowed);
      if (distance <= allowed) score = Math.min(score, distance === 1 ? 6 : 7);
    }
    if (last && length >= 4 && prefixEditDistance(token, term) <= 1)
      score = Math.min(score, 6);
  }
  return score === Infinity ? null : { score, term };
}

const range = (value: string) => ({
  term: { $gte: value, $lt: `${value}￿` },
});

// Every way a word can match: exact (also with two letters swapped), prefix of
// the word being typed, sounds-alike or a typo (indexed keys, never a scan), and
// a typo inside the prefix. Each query is index-backed and bounded.
async function lookup(token: string, last: boolean, ids?: string[]) {
  const scope = ids ? { product: { $in: ids } } : {};
  const limit = ids ? VERIFY_LIMIT : CANDIDATE_LIMIT;
  const length = Array.from(token).length;
  const key = phoneticKey(token);
  const skeleton = skeletonKey(token);
  const find = (filter: object, sorted = false) => {
    const query = CatalogSearchTerm.find({ ...scope, ...filter }).select(
      "product term kind key -_id",
    );
    return (sorted ? query.sort({ term: 1, product: 1 }) : query)
      .limit(limit)
      .maxTimeMS(QUERY_TIMEOUT_MS)
      .lean<Row[]>();
  };
  const similar: object[] = [];
  const deletions = [...deletionKeys(token), ...twoDeletionKeys(token)];
  if (deletions.length) similar.push({ deletions: { $in: deletions } });
  if (length >= 3 && key) similar.push({ key });
  if (length >= 4 && skeleton) similar.push({ skel: skeleton });
  const [exact, prefix, fuzzy, typing] = await Promise.all([
    find({ term: { $in: [token, ...swapVariants(token)] } }),
    last ? find(range(token), true) : [],
    similar.length ? find({ $or: similar }) : [],
    last && length >= 4 && length <= 40
      ? find(range(Array.from(token).slice(0, -1).join("")), true)
      : [],
  ]);
  // Complete when no query hit its cap, so a product missing here truly has no
  // such word and needs no second check.
  const complete = [exact, prefix, fuzzy, typing].every(
    (rows) => rows.length < limit,
  );
  const best = new Map<string, Match>();
  for (const row of [...exact, ...prefix, ...fuzzy, ...typing]) {
    const match = classify(token, row, last, key);
    if (!match) continue;
    const id = String(row.product);
    if (match.score < (best.get(id)?.score ?? Infinity)) best.set(id, match);
  }
  return { best, complete };
}

// The whole phrase as typed (for example "kanda lasun masala").
async function phraseLookup(query: string) {
  const find = (filter: object, sorted = false) => {
    const request = CatalogSearchTerm.find(filter).select(
      "product term kind -_id",
    );
    return (sorted ? request.sort({ term: 1, product: 1 }) : request)
      .limit(CANDIDATE_LIMIT)
      .maxTimeMS(QUERY_TIMEOUT_MS)
      .lean<Row[]>();
  };
  return Promise.all([find({ term: query }), find(range(query), true)]);
}

export async function searchCatalog(input: string, limit: number) {
  const query = normalizeCatalogTerm(input);
  const tokens = queryTokens(query);
  if (!tokens.length)
    return { products: [], didYouMean: null as string | null };
  const finals = new Map<string, Hit>();
  const keep = (id: string, hit: Hit) => {
    if (hit.score < (finals.get(id)?.score ?? Infinity)) finals.set(id, hit);
  };

  const [lookups, [phrase, phrasePrefix]] = await Promise.all([
    Promise.all(
      tokens.map((token, i) => lookup(token, i === tokens.length - 1)),
    ),
    tokens.length > 1
      ? phraseLookup(query)
      : Promise.resolve([[], []] as Row[][]),
  ]);
  const perToken = lookups.map((found) => found.best);
  if (tokens.length === 1) {
    for (const [id, match] of perToken[0])
      keep(id, { score: match.score, tokens: [match] });
  } else {
    // Words in any order. A word with too many candidates to list in full is
    // checked by product id, so a common word can never hide a real match.
    const ids = new Set(perToken.flatMap((found) => [...found.keys()]));
    // The most selective word typed: a close (partial) match must contain it.
    const rarest = perToken
      .map((found, i) => [found.size, i] as const)
      .filter(([size]) => size > 0)
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])[0]?.[1];
    const ranked = [...ids]
      .map((id) => ({
        id,
        count: perToken.filter((found) => found.has(id)).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, VERIFY_PRODUCTS)
      .map((row) => row.id);
    await Promise.all(
      tokens.map(async (token, i) => {
        if (lookups[i].complete) return;
        const wanted = ranked.filter((id) => !perToken[i].has(id));
        if (!wanted.length) return;
        const { best } = await lookup(token, i === tokens.length - 1, wanted);
        for (const [id, match] of best) perToken[i].set(id, match);
      }),
    );
    for (const id of ids) {
      const matches = tokens.map((_, i) => perToken[i].get(id));
      const found = matches.filter((match): match is Match => !!match);
      const mean =
        found.reduce((sum, match) => sum + cost(match.score), 0) / found.length;
      if (found.length === tokens.length)
        keep(id, { score: 3 + mean, tokens: matches });
      else if (
        // Close but relevant: contains the most distinctive word typed and at
        // least half of all words, matched exactly or by prefix, never guessed.
        rarest !== undefined &&
        matches[rarest] &&
        found.length >= Math.ceil(tokens.length / 2) &&
        found.every((match) => cost(match.score) <= 1)
      )
        keep(id, {
          score: 10 + 3 * (tokens.length - found.length) + mean,
          tokens: matches,
        });
    }
    // The whole phrase as typed beats any word-by-word match.
    for (const row of phrase)
      keep(String(row.product), {
        score: row.kind === "alias" ? 1 : 0,
        tokens: finals.get(String(row.product))?.tokens ?? [],
      });
    for (const row of phrasePrefix)
      if (row.kind !== "word")
        keep(String(row.product), {
          score: 2.5,
          tokens: finals.get(String(row.product))?.tokens ?? [],
        });
  }
  if (!finals.size) return { products: [], didYouMean: null };

  // Resolve current status and current display values from the authoritative
  // master, never from the search index. No seller information is returned.
  const pool = [...finals]
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, POOL)
    .map(([id]) => id);
  const rows = await ProductMaster.find({
    _id: { $in: pool },
    status: "ACTIVE",
  })
    .select(
      "code nameEn nameMr nameHi productGroup defaultUnit status sortOrder",
    )
    .maxTimeMS(QUERY_TIMEOUT_MS)
    .lean();
  rows.sort(
    (a, b) =>
      finals.get(String(a._id))!.score - finals.get(String(b._id))!.score ||
      a.sortOrder - b.sortOrder ||
      a.code.localeCompare(b.code),
  );
  const top = rows[0] && finals.get(String(rows[0]._id));
  // Suggest a spelling only when the best answer needed a guess.
  let didYouMean: string | null = null;
  if (top?.tokens.some(guessed)) {
    const corrected = tokens
      .map((token, i) => {
        const match = top.tokens[i];
        return guessed(match) ? match!.term : token;
      })
      .join(" ");
    if (corrected !== query) didYouMean = corrected;
  }
  return {
    products: rows.slice(0, limit).map((row) => ({
      productId: String(row._id),
      code: row.code,
      nameMr: row.nameMr,
      nameEn: row.nameEn,
      nameHi: row.nameHi || null,
      productGroup: row.productGroup,
      defaultUnit: row.defaultUnit,
      status: row.status,
      sortOrder: row.sortOrder,
    })),
    didYouMean,
  };
}

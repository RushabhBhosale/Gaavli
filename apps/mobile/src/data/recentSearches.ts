export const MAX_RECENT_SEARCHES = 8;

// Newest first, no repeats (ignoring case and spacing), never more than
// MAX_RECENT_SEARCHES. Blank text is not a search.
export function addRecentSearch(list: readonly string[], text: string) {
  const clean = text.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!clean) return [...list];
  const key = clean.toLowerCase();
  return [clean, ...list.filter((item) => item.toLowerCase() !== key)].slice(
    0,
    MAX_RECENT_SEARCHES,
  );
}
export function parseRecentSearches(raw: string | null): string[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === "string")
          .slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch {
    return [];
  }
}

// Quick picks under the search box. Text is what gets searched; Marathi and
// Hindi readers get the Marathi names, which the market search matches.
export const POPULAR_SEARCHES = [
  { en: "Tomato", mr: "टोमॅटो" },
  { en: "Onion", mr: "कांदा" },
  { en: "Potato", mr: "बटाटा" },
  { en: "Milk", mr: "दूध" },
  { en: "Mango", mr: "आंबा" },
  { en: "Rice", mr: "तांदूळ" },
  { en: "Banana", mr: "केळी" },
  { en: "Jaggery", mr: "गूळ" },
] as const;

// Matching part of a name, so the typed letters stand out in suggestions.
export function splitMatch(name: string, query: string) {
  const index = query
    ? name.toLowerCase().indexOf(query.trim().toLowerCase())
    : -1;
  return index < 0 || !query.trim()
    ? { before: name, match: "", after: "" }
    : {
        before: name.slice(0, index),
        match: name.slice(index, index + query.trim().length),
        after: name.slice(index + query.trim().length),
      };
}

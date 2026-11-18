export function samePlaceName(left: string, right: string | null | undefined) {
  return left.trim().toLowerCase() === (right ?? "").trim().toLowerCase();
}

export function onlyPlaceMatch<T extends { nameEn: string; nameMr: string | null }>(
  rows: T[],
  name: string,
) {
  const matches = rows.filter(
    (row) => samePlaceName(name, row.nameEn) || samePlaceName(name, row.nameMr),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export function onlyVillageMatch<
  T extends { nameEn: string; nameMr: string | null },
>(rows: T[], name: string, nameMr: string) {
  let matches = rows.filter((row) => samePlaceName(name, row.nameEn));
  if (matches.length > 1 && nameMr.trim()) {
    const marathi = matches.filter((row) => samePlaceName(nameMr, row.nameMr));
    if (marathi.length === 1) matches = marathi;
  }
  return matches.length === 1 ? matches[0] : undefined;
}

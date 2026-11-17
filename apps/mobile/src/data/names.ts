// Older accounts have one display name and no first/last name. Split it so
// forms can show it; a bare mobile number is not a name.
export function legacyNameParts(name?: string | null, mobile?: string | null) {
  const full = (name ?? "").trim();
  if (!full || /^[+\d\s-]+$/.test(full) || full === mobile) return null;
  const words = full.split(/\s+/);
  return {
    firstName: words.slice(0, -1).join(" ") || words[0],
    lastName: words.length > 1 ? words[words.length - 1] : "",
  };
}

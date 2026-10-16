export function normalizedProductName(name: string) {
  return name
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]/gu, "")
    .replace(/([a-z])\1{2,}/g, "$1");
}
export function similarProductName(left: string, right: string) {
  const a = Array.from(normalizedProductName(left)),
    b = Array.from(normalizedProductName(right));
  if (!a.length || !b.length) return false;
  const max = Math.max(a.length, b.length);
  const allowance = max < 4 ? 0 : max < 8 ? 1 : 2;
  if (Math.abs(a.length - b.length) > allowance) return false;
  let previous = b.map((_, index) => index + 1);
  previous.unshift(0);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++)
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    previous = current;
  }
  return previous[b.length] <= allowance;
}

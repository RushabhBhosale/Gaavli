export function parseCoordinates(value: string) {
  const match = value
    .trim()
    .match(
      /^([+-]?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*,\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([EW])?$/i,
    );
  if (!match) return null;
  let latitude = Number(match[1]);
  let longitude = Number(match[3]);
  if ((match[2] && latitude < 0) || (match[4] && longitude < 0)) return null;
  if (match[2]?.toUpperCase() === "S") latitude *= -1;
  if (match[4]?.toUpperCase() === "W") longitude *= -1;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

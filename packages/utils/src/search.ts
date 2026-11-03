// Typo tolerance shared by the server search and the offline picker.

// Longer words tolerate more mistakes; short words must be nearly exact or
// every typo would match something unrelated.
export function maxEdits(length: number) {
  return length <= 3 ? 0 : length <= 6 ? 1 : 2;
}

// Optimal string alignment distance (insert, delete, substitute, swap), over
// Unicode code points. Returns max + 1 as soon as the bound is exceeded.
export function editDistance(left: string, right: string, max: number) {
  const a = Array.from(left),
    b = Array.from(right);
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous2: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        previous[j] + 1,
        row[j - 1] + 1,
        previous[j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        value = Math.min(value, previous2[j - 2] + 1);
      row.push(value);
      best = Math.min(best, value);
    }
    if (best > max) return max + 1;
    previous2 = previous;
    previous = row;
  }
  return Math.min(previous[b.length], max + 1);
}

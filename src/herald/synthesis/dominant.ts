/**
 * Picks the most frequent value in a sequence; ties are broken by which
 * value reached that count first in sequence order — fully deterministic,
 * no wall-clock or randomness. Shared by the Heraldic Epithet and the
 * Herald-form synthesis so both aggregate the seven readings identically.
 */
export function dominant<T extends string>(sequence: T[]): T {
  const counts = new Map<T, number>();
  let best: T = sequence[0];
  let bestCount = 0;
  for (const value of sequence) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    // Strictly greater: an equal count reached later never displaces the earlier value.
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

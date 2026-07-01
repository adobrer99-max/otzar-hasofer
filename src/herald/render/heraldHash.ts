/**
 * A plain deterministic string hash (djb2 variant). Used only to make
 * discrete, enumerated layout choices (e.g. which of several equivalent
 * ornament templates to use) — never to pick colors or content that should
 * instead be derived directly from meaningful fields. Same string always
 * produces the same number; no Math.random, no wall-clock.
 */
export function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

export function pickVariant(input: string, variantCount: number, salt = ""): number {
  return hashString(`${input}::${salt}`) % variantCount;
}

/**
 * A signature colour for each of the 22 letters, drawn from its own
 * association — the three Mothers by element (Air/Water/Fire), the seven
 * Doubles by planet, the twelve Simples by zodiac (and its element). This is
 * what lets each Herald be coloured from the letters actually drawn, so no two
 * feel alike, rather than every sigil sharing one gold palette.
 *
 * Deliberately outside the page Visual Canon's five brand constants: the
 * Herald is the one surface where colour is meant to be individual. Kept as a
 * fixed, curated table (not the raw --color-* tokens) so the render stays
 * deterministic and each colour is a considered correspondence, not a random
 * hue.
 */
export const letterColors: Record<string, string> = {
  // Mothers — the elements.
  aleph: "#e6d488", // Air — luminous pale gold
  mem: "#3f7fb8", // Water — deep blue
  shin: "#d1452f", // Fire — flame red

  // Doubles — the seven planets (traditional planetary colours).
  bet: "#6f7391", // Saturn — leaden violet
  gimel: "#5a6fd0", // Jupiter — royal blue
  dalet: "#b83a2e", // Mars — iron red
  kaf: "#e6b422", // Sun — radiant gold
  peh: "#3fa06a", // Venus — verdant green
  resh: "#d98a3d", // Mercury — quick orange
  tav: "#b9c0cc", // Moon — silver

  // Simples — the twelve of the zodiac, by sign (grouped by element).
  heh: "#d6452e", // Aries — fire, scarlet
  tet: "#e08a2a", // Leo — fire, amber
  samech: "#c85a2a", // Sagittarius — fire, burnt orange
  vav: "#6b8f3a", // Taurus — earth, olive
  yod: "#93a04e", // Virgo — earth, moss
  ayin: "#5e6b3a", // Capricorn — earth, dark loam
  zayin: "#d9c34a", // Gemini — air, gold-yellow
  lamed: "#7fa0c8", // Libra — air, pale sky
  tzadi: "#5fb0c4", // Aquarius — air, aqua
  chet: "#4a86a8", // Cancer — water, sea blue
  nun: "#2f7f8a", // Scorpio — water, deep teal
  kuf: "#4f6fb0", // Pisces — water, indigo
};

const FALLBACK = "#c9a24b";

export function colorFor(letterId: string): string {
  return letterColors[letterId] ?? FALLBACK;
}

function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function toHex(rgb: number[]): string {
  return "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

/** Blend toward white by `amt` (0..1). */
export function lighten(hex: string, amt: number): string {
  const [r, g, b] = parse(hex);
  return toHex([r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt]);
}
/** Blend toward black by `amt` (0..1). */
export function darken(hex: string, amt: number): string {
  const [r, g, b] = parse(hex);
  return toHex([r * (1 - amt), g * (1 - amt), b * (1 - amt)]);
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

/**
 * Deepen a letter's signature colour into a rich, saturated heraldic field
 * tincture — a jewel tone, not the muddy near-black the old flat darken
 * produced. Saturation is boosted and lightness pulled into a deep band so a
 * gold charge always reads over it (metal on colour), while the hue — the
 * letter's own correspondence — stays intact and each field reads distinct.
 */
export function jewelTone(hex: string): string {
  const [r, g, b] = parse(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const richS = Math.min(1, s * 1.15 + 0.14);
  const deepL = Math.max(0.16, Math.min(l, 0.29));
  const [nr, ng, nb] = hslToRgb(h, richS, deepL);
  return toHex([nr, ng, nb]);
}

/** The average of several colours — used to tint the field from the drawn letters. */
export function blend(hexes: string[]): string {
  if (hexes.length === 0) return FALLBACK;
  const acc = [0, 0, 0];
  for (const h of hexes) {
    const p = parse(h);
    acc[0] += p[0];
    acc[1] += p[1];
    acc[2] += p[2];
  }
  return toHex([acc[0] / hexes.length, acc[1] / hexes.length, acc[2] / hexes.length]);
}

/** The 22 letter ids, for generating the per-letter glyph gradients once in <defs>. */
export const letterColorIds = Object.keys(letterColors);

/**
 * A human-readable colour name for each letter's signature tincture — the words
 * already carried in the table's comments above. Used by the image-prompt
 * export so a field reads as "deep blue, pale sky, radiant gold" rather than
 * hex codes.
 */
export const letterColorNames: Record<string, string> = {
  aleph: "pale gold",
  mem: "deep blue",
  shin: "flame red",
  bet: "leaden violet",
  gimel: "royal blue",
  dalet: "iron red",
  kaf: "radiant gold",
  peh: "verdant green",
  resh: "warm orange",
  tav: "silver",
  heh: "scarlet",
  tet: "amber",
  samech: "burnt orange",
  vav: "olive green",
  yod: "moss green",
  ayin: "dark earthen brown",
  zayin: "gold-yellow",
  lamed: "pale sky blue",
  tzadi: "aqua",
  chet: "sea blue",
  nun: "deep teal",
  kuf: "indigo",
};

export function colorNameFor(letterId: string): string {
  return letterColorNames[letterId] ?? "gold";
}

/**
 * The Ascent's colours, read from the Treasury's own theme at runtime.
 *
 * The canvas cannot use CSS variables directly, so the tokens are resolved
 * once per resize and cached. Reading them (rather than hard-coding the
 * charcoal canon) is what lets the game turn to vellum with the rest of the
 * app when the sun/moon seal is pressed — the ground under the Scribe's feet
 * is literally the page's own ground.
 */
export interface Palette {
  bg: string;
  bgDeep: string;
  stone: string;
  stoneEdge: string;
  gold: string;
  goldBright: string;
  goldDim: string;
  blue: string;
  blueBright: string;
  copper: string;
  silver: string;
  text: string;
  muted: string;
  /** True on the vellum ground, where light marks must read dark. */
  light: boolean;
}

const FALLBACK: Palette = {
  bg: "#14171c",
  bgDeep: "#0f1216",
  stone: "#1c2027",
  stoneEdge: "#2a2f38",
  gold: "#c9a24b",
  goldBright: "#e4c579",
  goldDim: "#7d6530",
  blue: "#1f3a5f",
  blueBright: "#3f6ea5",
  copper: "#c98056",
  silver: "#c7ccd4",
  text: "#ece6d8",
  muted: "#9aa1ad",
  light: false,
};

function read(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * On the vellum ground the app's own surface tokens are all within a few
 * percent of each other — which is right for a page of text and useless for
 * terrain, where stone has to read as solid mass against open air at a
 * glance. So the light theme gets its own two values: a darker sepia for the
 * rock and a true ink line around it. Everything else still comes from the
 * theme, so the game turns with the rest of the Treasury.
 */
const VELLUM_STONE = "#cbbb90";
const VELLUM_STONE_EDGE = "#9c8955";

export function readPalette(): Palette {
  if (typeof window === "undefined") return FALLBACK;
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const light = root.getAttribute("data-theme") === "light";
  return {
    bg: read(styles, "--bg", FALLBACK.bg),
    bgDeep: read(styles, "--bg-sunken", FALLBACK.bgDeep),
    stone: light ? VELLUM_STONE : read(styles, "--bg-raised", FALLBACK.stone),
    stoneEdge: light ? VELLUM_STONE_EDGE : read(styles, "--border-hairline", FALLBACK.stoneEdge),
    gold: read(styles, "--accent", FALLBACK.gold),
    goldBright: read(styles, "--accent-bright", FALLBACK.goldBright),
    goldDim: FALLBACK.goldDim,
    blue: read(styles, "--color-blue", FALLBACK.blue),
    blueBright: read(styles, "--color-blue-bright", FALLBACK.blueBright),
    copper: read(styles, "--color-copper", FALLBACK.copper),
    silver: read(styles, "--color-silver", FALLBACK.silver),
    text: read(styles, "--text", FALLBACK.text),
    muted: read(styles, "--text-muted", FALLBACK.muted),
    light,
  };
}

// ---------------------------------------------------------------------------
// the ten places
// ---------------------------------------------------------------------------

/**
 * **A Sefirah's own light, laid over the theme rather than instead of it.**
 *
 * Every rung of the Tree has been drawn in one set of colours since the game
 * shipped — the renderer takes a palette and never asks where it is, so
 * Malchut's mud and Binah's sea are the same grey stone under the same sky.
 * Ten places, one place.
 *
 * The colours are **the traditional correspondences**, not invented ones, in
 * the same spirit as everything else here: the Ari's scheme is what a reader
 * of this material already carries, and inventing a tenth palette when a
 * received one exists would be the game talking over the tradition it is made
 * of. Malchut is the earth and the many colours; Yesod violet; Hod and Netzach
 * the pair, orange and green; Tiferet the golden middle; Gevurah red and
 * Chesed white; Binah the dark understanding, Chochmah the grey before form,
 * and Keter has no colour at all, which is drawn as the faintest tint of any
 * of them rather than as an exception in the code.
 *
 * **A tint, and deliberately a weak one.** The theme is still what decides
 * whether this game is charcoal or vellum — press the sun/moon seal and the
 * ground still turns with the rest of the Treasury, because every value below
 * is *mixed into* the resolved theme token rather than replacing it. What a
 * place changes is which way its stone leans, not what stone is.
 */
export interface Place {
  /** What the rock leans toward. */
  stone: string;
  /** What the air leans toward. */
  sky: string;
  /** How far, in `[0, 1]`. Keter is nearly nothing, which is the point of it. */
  weight: number;
}

export const PLACES: Record<string, Place> = {
  // Earth, and the colour of everything mixed — the kingdom is the many.
  malchut: { stone: "#6b5433", sky: "#3d2a14", weight: 0.42 },
  // Violet: the foundation, the moon's own colour, where the paths gather.
  yesod: { stone: "#4a3f6b", sky: "#251d4a", weight: 0.4 },
  // Orange — splendour, and the fiery serpents that hold it.
  hod: { stone: "#8a5a2c", sky: "#43230c", weight: 0.4 },
  // Green: endurance, the thing that keeps growing.
  netzach: { stone: "#3f6b45", sky: "#153a1d", weight: 0.4 },
  // Gold and the middle pillar — the harmony everything else is balanced on.
  tiferet: { stone: "#8a7333", sky: "#3a2f0c", weight: 0.36 },
  // Red: severity, judgment, the ceiling that comes down.
  gevurah: { stone: "#7a3030", sky: "#3f0f0f", weight: 0.42 },
  // White, and water: loving-kindness, the open tent, the tanninim.
  chesed: { stone: "#9aa6b0", sky: "#17364d", weight: 0.36 },
  // The dark of understanding, which tradition calls the sea. Leviathan's.
  binah: { stone: "#2b4a52", sky: "#062c38", weight: 0.44 },
  // Grey — the flash before the form, the highest ground a Scribe stands on.
  chochmah: { stone: "#7b8288", sky: "#26303a", weight: 0.34 },
  // No colour at all, which is the tradition's own answer for the crown.
  keter: { stone: "#d8d4c8", sky: "#31313f", weight: 0.16 },
};

/** Mix two `#rrggbb` toward each other. `t` of 0 is all `a`, 1 is all `b`. */
export function mix(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const n = Number.parseInt(full.slice(0, 6), 16);
    return Number.isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const at = Math.max(0, Math.min(1, t));
  const to = (x: number, y: number) => Math.round(x + (y - x) * at);
  return `#${[to(ar, br), to(ag, bg), to(ab, bb)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * The palette a given Sefirah's ground is drawn in.
 *
 * Pure, and pure on purpose: the theme palette goes in and a tinted one comes
 * out, so nothing about *where* the Scribe is has to reach the renderer's
 * signature — `World.sefirah` was already there, and this is read once per
 * frame beside `readPalette`.
 *
 * On the vellum ground the tint is halved. A light theme has far less room
 * between its stone and its page than a dark one does, and a place that leans
 * hard on vellum stops reading as terrain — which is the same reason the
 * light theme has its own two stone values above.
 */
export function paletteOf(base: Palette, sefirah: string | undefined): Palette {
  const place = sefirah ? PLACES[sefirah] : undefined;
  if (!place) return base;
  const w = base.light ? place.weight * 0.5 : place.weight;
  return {
    ...base,
    stone: mix(base.stone, place.stone, w),
    stoneEdge: mix(base.stoneEdge, place.stone, w * 0.7),
    bg: mix(base.bg, place.sky, w * 0.8),
    bgDeep: mix(base.bgDeep, place.sky, w),
  };
}

/** `#rrggbb` plus an alpha, as a canvas-ready rgba string. */
export function alpha(hex: string, a: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return `rgba(201, 162, 75, ${a})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

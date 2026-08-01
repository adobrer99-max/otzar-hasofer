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

/** `#rrggbb` plus an alpha, as a canvas-ready rgba string. */
export function alpha(hex: string, a: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return `rgba(201, 162, 75, ${a})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

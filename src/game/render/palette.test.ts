import { describe, expect, it } from "vitest";
import { regions } from "../regions";
import { mix, paletteOf, PLACES, type Palette } from "./palette";

/**
 * **Ten places, or one place ten times.**
 *
 * Every rung of the Tree was drawn in one set of colours since the game
 * shipped: the renderer took a palette and never asked where it was, so
 * Malchut's mud and Binah's sea were the same grey stone under the same sky.
 * These hold the two things that make the fix real rather than decorative —
 * that no two places come out the same, and that a place still cannot
 * overrule the theme.
 */

const DARK: Palette = {
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
const VELLUM: Palette = { ...DARK, stone: "#cbbb90", stoneEdge: "#9c8955", bg: "#f4efe2", light: true };

describe("mixing two colours", () => {
  it("is either end at either end, and between in between", () => {
    expect(mix("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mix("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("clamps rather than overshooting", () => {
    expect(mix("#000000", "#ffffff", 4)).toBe("#ffffff");
    expect(mix("#000000", "#ffffff", -2)).toBe("#000000");
  });

  it("survives a token the theme did not give it", () => {
    expect(() => mix("", "#ffffff", 0.5)).not.toThrow();
    expect(mix("#abc", "#abc", 0.5)).toBe("#aabbcc");
  });
});

describe("a Sefirah's own light", () => {
  it("gives every one of the ten a place", () => {
    for (const region of regions) {
      expect(PLACES[region.sefirah], `${region.name} has no colour`).toBeDefined();
    }
    // And nothing that is not one of them: a stray key would be a place
    // nobody can stand in.
    for (const key of Object.keys(PLACES)) {
      expect(regions.some((r) => r.sefirah === key), `${key} is not a Sefirah`).toBe(true);
    }
  });

  /**
   * **The one that matters.** A tint too weak to tell apart is the same
   * failure as no tint: it prints as "ten palettes" in a commit message and a
   * player sees one place. Measured against the real dark theme, every pair
   * of the ten must differ in the stone a Scribe is actually walking on.
   */
  it("makes no two places the same ground", () => {
    const stones = new Map<string, string>();
    for (const region of regions) {
      const stone = paletteOf(DARK, region.sefirah).stone;
      const clash = [...stones.entries()].find(([, s]) => s === stone);
      expect(clash, `${region.sefirah} and ${clash?.[0]} are the same stone`).toBeUndefined();
      stones.set(region.sefirah, stone);
    }
  });

  it("moves the ground away from the theme's own, in every place", () => {
    for (const region of regions) {
      const here = paletteOf(DARK, region.sefirah);
      expect(here.stone, `${region.sefirah} leaves the stone alone`).not.toBe(DARK.stone);
      expect(here.bgDeep, `${region.sefirah} leaves the sky alone`).not.toBe(DARK.bgDeep);
    }
  });

  /**
   * The theme still decides whether this game is charcoal or vellum. A place
   * changes which way its stone leans, never what stone is — so a vellum
   * ground stays plainly lighter than a charcoal one everywhere on the Tree.
   */
  it("never overrules the theme", () => {
    const brightness = (hex: string) => {
      const n = Number.parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
    };
    for (const region of regions) {
      const dark = paletteOf(DARK, region.sefirah);
      const vellum = paletteOf(VELLUM, region.sefirah);
      expect(vellum.light).toBe(true);
      expect(
        brightness(vellum.stone),
        `${region.sefirah} is darker on vellum than on charcoal`,
      ).toBeGreaterThan(brightness(dark.stone));
    }
  });

  it("leaves everything that is not ground exactly as the theme set it", () => {
    const here = paletteOf(DARK, "gevurah");
    // The gold a letter is drawn in, the blue of water, the text: all the
    // theme's, because a place is the terrain and not the ink.
    expect(here.gold).toBe(DARK.gold);
    expect(here.goldBright).toBe(DARK.goldBright);
    expect(here.blue).toBe(DARK.blue);
    expect(here.text).toBe(DARK.text);
    expect(here.muted).toBe(DARK.muted);
  });

  it("passes a world with no Sefirah straight through", () => {
    expect(paletteOf(DARK, undefined)).toBe(DARK);
    expect(paletteOf(DARK, "nowhere")).toBe(DARK);
  });
});

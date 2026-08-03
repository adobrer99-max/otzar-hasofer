import { cardsByHouse, housesBySefirah } from "../../data/dorot";
import { letters as allLetters } from "../../data/letters";
import type { AscentRecord } from "../../storage/ascentRepo";
import { LAMPS } from "../combat";
import { lettersOnEntering, regions, TOTAL_REGIONS } from "../regions";
import { SCROLL_LETTER } from "../scroll";

/**
 * A way into the middle of the game.
 *
 * A full climb is fifty-two thousand pixels — four minutes of pure running,
 * and fifteen to twenty-five with the fighting and the plates. Until this
 * existed there was **no dev affordance of any kind** in the repo, which meant
 * that everything past the first region could only be verified by unit test:
 * the House testimony, the plea at the crown in each of its four states, the
 * going-out plate and the husks themselves all shipped without once being
 * looked at. That is how three separate false alarms got raised in one
 * session — with no way to look, every surprise has to be reasoned about.
 *
 * This module is **pure**, and it is deliberately the only new game logic in
 * the dev tooling: it turns options into an `AscentRecord` and nothing more.
 * `GamePage` hands that record to the same `beginAt` the real threshold uses,
 * so a warped run cannot exercise a path a player never takes.
 *
 * Reachable two ways, because two different things need it — query params on
 * the hash route for the harness, which cannot click, and a small panel for a
 * person, who would rather not type. Both are gated on `import.meta.env.DEV`
 * and a test asserts `DEV_MARKER` never appears in a production build.
 *
 * **A trap worth writing down:** `import.meta.env.DEV` is *false* under
 * `vite preview`, which is what every browser check in this project had been
 * running against. Use `npm run dev`.
 */

/** Grepped for in `dist/` by the build test. Must appear nowhere in production. */
export const DEV_MARKER = "otzar-dev-warp";

export type WarpLetters = "none" | "as-of-rung" | "all" | "all-but-peh";

export interface WarpOptions {
  /** 1 = Malchut … 10 = Keter. */
  rung: number;
  letters: WarpLetters;
  lamps: number;
  seed?: number;
  /** Whether to lay the taught porch, which is normally a first climb only. */
  porch: boolean;
  /**
   * How many Houses have already been spoken with. The plea at the crown is
   * heard in their words, so without this its four states — mute, alone,
   * heard, whole — cannot be reached at all.
   */
  witnesses: number;
}

export const WARP_DEFAULTS: WarpOptions = {
  rung: 1,
  letters: "as-of-rung",
  lamps: LAMPS,
  porch: false,
  witnesses: 0,
};

const clamp = (n: number, low: number, high: number) =>
  Number.isFinite(n) ? Math.max(low, Math.min(high, Math.round(n))) : low;

/** Which letters a warped Scribe is holding. */
export function lettersFor(mode: WarpLetters, rung: number): string[] {
  switch (mode) {
    case "none":
      return [];
    case "all":
      return allLetters.map((l) => l.id);
    case "all-but-peh":
      // Not a curiosity. The Mouth is required to plead, and without it the
      // Scribe reaches the crown unable to say anything — the harshest outcome
      // in the game, and one no one had ever seen.
      return allLetters.map((l) => l.id).filter((id) => id !== SCROLL_LETTER);
    case "as-of-rung":
    default:
      return [...lettersOnEntering(rung)];
  }
}

/** Options as they came off a URL, coerced and clamped into something real. */
export function readWarp(params: URLSearchParams): WarpOptions | undefined {
  if (!params.has("rung") && !params.has("letters")) return undefined;
  const mode = params.get("letters") ?? WARP_DEFAULTS.letters;
  return {
    rung: clamp(Number(params.get("rung") ?? WARP_DEFAULTS.rung), 1, TOTAL_REGIONS),
    letters: (["none", "as-of-rung", "all", "all-but-peh"] as WarpLetters[]).includes(
      mode as WarpLetters,
    )
      ? (mode as WarpLetters)
      : WARP_DEFAULTS.letters,
    lamps: clamp(Number(params.get("lamps") ?? WARP_DEFAULTS.lamps), 1, LAMPS),
    seed: params.has("seed") ? Number(params.get("seed")) : undefined,
    porch: params.get("porch") === "1",
    witnesses: clamp(Number(params.get("witnesses") ?? 0), 0, HOUSE_RUNGS.length),
  };
}

/** The rungs that hold a House, in climb order — the seven below the Abyss. */
const HOUSE_RUNGS = regions.filter((r) => r.hasHouse).map((r) => r.sefirah);

/**
 * One card per Sefirah, so a warped Scribe arrives with a case already made.
 * The first card of the Sefirah's first House — which one does not matter,
 * since `witnessesOf` keys the testimony by rung rather than by figure.
 */
export function witnessCards(count: number): string[] {
  return HOUSE_RUNGS.slice(0, clamp(count, 0, HOUSE_RUNGS.length))
    .map((sefirah) => cardsByHouse(housesBySefirah(sefirah)[0]?.id ?? "")[0]?.id)
    .filter((id): id is string => Boolean(id));
}

export function warpParams(options: WarpOptions): string {
  const params = new URLSearchParams({
    rung: String(options.rung),
    letters: options.letters,
    lamps: String(options.lamps),
  });
  if (options.seed !== undefined) params.set("seed", String(options.seed));
  if (options.porch) params.set("porch", "1");
  if (options.witnesses > 0) params.set("witnesses", String(options.witnesses));
  return params.toString();
}

/**
 * The record itself. Shaped exactly like the one `beginAscent` builds, because
 * a warp that produced a subtly different ascent would verify a game nobody
 * plays.
 */
export function warpRecord(
  options: WarpOptions,
  base: {
    id: string;
    seed: number;
    seedLabel: string;
    notes: string[];
    ascendantLetterId?: string;
    encounterNumber?: number;
  },
): AscentRecord {
  const now = new Date().toISOString();
  const rung = clamp(options.rung, 1, TOTAL_REGIONS);
  return {
    id: base.id,
    seed: options.seed ?? base.seed,
    seedLabel: base.seedLabel,
    createdAt: now,
    updatedAt: now,
    regionIndex: rung,
    lettersHeld: lettersFor(options.letters, rung),
    or: 0,
    // Everything below this rung counts as behind you, or the ladder on the
    // threshold reads as though the climb had not happened.
    regionsCleared: Array.from({ length: rung - 1 }, (_, i) => i + 1),
    housesMet: witnessCards(options.witnesses),
    ascendantLetterId: base.ascendantLetterId,
    encounterNumber: base.encounterNumber,
  };
}

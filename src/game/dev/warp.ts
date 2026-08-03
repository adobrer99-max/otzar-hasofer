import { cardsByHouse, housesBySefirah } from "../../data/dorot";
import { letters as allLetters } from "../../data/letters";
import type { AscentRecord } from "../../storage/ascentRepo";
import { LAMPS } from "../combat";
import { lettersOnEntering, regionAt, regions, TOTAL_REGIONS } from "../regions";
import { pathsFrom, type TreePath } from "../tree";
import type { SefirahId } from "../../types/letter";
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
  /**
   * 1 = Malchut … 10 = Keter — **and now a place on the Tree, not a rung on a
   * ladder.** The record this becomes stands the Scribe on that Sefirah with a
   * plausible route behind them; the ground is whatever path they choose from
   * there. It used to drop them straight onto `buildRegion(rung)`, the
   * pre-Tree linear road, which meant the harness verified a road no player
   * has walked since the overworld shipped.
   */
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
  /**
   * Whether the guardians at and below this Sefirah are already broken.
   *
   * A Sefirah cannot be kindled while something holds it, so without this a
   * warp can reach a place and do nothing there — which is most of what the
   * map is for. Off by default: a warp that silently freed the Tree would make
   * the fights invisible to the harness.
   */
  freed: boolean;
  /**
   * Whether the Sefirot at and below this one are already kindled.
   *
   * The ending is offered only when all ten are lit (`allKindled` in
   * `GamePage`), and lighting them honestly is three hundred light and a
   * full tour — so without this the crown's four pleas cannot be reached from
   * the map at all. It used to be unnecessary because a warp dropped onto the
   * linear road, whose tenth rung raised the sealed plate by walking off the
   * end of it; that road is gone, and this is what replaces it.
   */
  lit: boolean;
}

export const WARP_DEFAULTS: WarpOptions = {
  rung: 1,
  letters: "as-of-rung",
  lamps: LAMPS,
  porch: false,
  witnesses: 0,
  freed: false,
  lit: false,
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
    freed: params.get("freed") === "1",
    lit: params.get("lit") === "1",
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
  if (options.freed) params.set("freed", "1");
  if (options.lit) params.set("lit", "1");
  return params.toString();
}

/**
 * The shortest route from the kingdom to a Sefirah, as path ids.
 *
 * A warped record has to carry a *plausible history*, not just a position:
 * `pathsWalked` is what makes ground already crossed pay `SPENT_LIGHT`, what
 * `regionsCleared` means on the map, and — most of all — what tells `GamePage`
 * this is a Tree climb rather than a record from before the overworld existed.
 * The route is the one a Scribe would most likely have taken, which is the
 * shortest.
 */
export function routeToSefirah(to: SefirahId): string[] {
  const back = new Map<SefirahId, TreePath>();
  const queue: SefirahId[] = ["malchut"];
  const seen = new Set<SefirahId>(["malchut"]);
  while (queue.length > 0) {
    const here = queue.shift()!;
    if (here === to) break;
    for (const path of pathsFrom(here)) {
      const next = path.ends[0] === here ? path.ends[1] : path.ends[0];
      if (seen.has(next)) continue;
      seen.add(next);
      back.set(next, path);
      queue.push(next);
    }
  }
  const walked: string[] = [];
  let cursor = to;
  while (cursor !== "malchut") {
    const path = back.get(cursor);
    if (!path) return [];
    walked.unshift(path.id);
    cursor = path.ends[0] === cursor ? path.ends[1] : path.ends[0];
  }
  return walked;
}

/**
 * The record itself. Shaped exactly like the one `beginAscent` builds, because
 * a warp that produced a subtly different ascent would verify a game nobody
 * plays.
 *
 * **Tree-native**: it carries `at` and `pathsWalked`, so `GamePage` stands the
 * Scribe on the overworld and the climb continues by choosing a way out — the
 * same door a player uses. Before this it carried neither, and a record with
 * no `at` is by definition a record from before the Tree, which sent every
 * warp down the linear road.
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
  const at = regionAt(rung).sefirah;
  const below = regions.filter((r) => r.index <= rung).map((r) => r.sefirah);
  return {
    id: base.id,
    seed: options.seed ?? base.seed,
    seedLabel: base.seedLabel,
    createdAt: now,
    updatedAt: now,
    regionIndex: rung,
    at,
    pathsWalked: routeToSefirah(at),
    lettersHeld: lettersFor(options.letters, rung),
    or: 0,
    // Everything below this rung counts as behind you, or the ladder on the
    // threshold reads as though the climb had not happened.
    regionsCleared: Array.from({ length: rung - 1 }, (_, i) => i + 1),
    housesMet: witnessCards(options.witnesses),
    ...(options.freed ? { guardiansBroken: below } : {}),
    ...(options.lit ? { sefirotLit: below } : {}),
    ascendantLetterId: base.ascendantLetterId,
    encounterNumber: base.encounterNumber,
  };
}

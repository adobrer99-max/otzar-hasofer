import type { AscentRecord } from "../../storage/ascentRepo";
import { Tile, TILE_SIZE } from "../world/tiles";
import type { World } from "../world/types";
import { DEV_MARKER } from "./warp";

/**
 * A live readout of the climb, on `window`, for something outside the page to
 * watch.
 *
 * The reason this exists rather than the harness reading the DOM: the HUD
 * shows three numbers, and the questions worth asking are about the other
 * twenty. How many husks were left standing? How far did he get before the
 * lamps went out? Which plate is up? Reading that off rendered text would be
 * both fragile and thin, and the canvas says nothing at all.
 *
 * It publishes a **getter**, not a snapshot, so a poll always sees the current
 * tick without the page having to push at some rate the harness didn't choose.
 * It is read-only by construction — the harness can look at the climb and
 * cannot reach into it, which keeps a measurement from becoming a cheat.
 *
 * Dev only, and keyed on `DEV_MARKER` so the same `dist/` grep that guards the
 * warp guards this too.
 */

export const PROBE_KEY = `__${DEV_MARKER}`;

export interface Probe {
  tick: number;
  regionIndex: number;
  sefirah: string;
  x: number;
  y: number;
  vx: number;
  onGround: boolean;
  veiled: boolean;
  /** Hanging from the Hook — the one state where pressing act again is wrong. */
  grappled: boolean;
  /**
   * In water, and on a vine. Both are states a driver cannot infer from
   * position and both need the *up* key held — `step` starts a climb on
   * `onVine && (up || down || climbing)`, so a driver that never presses up
   * cannot begin one, which is not a thing you find by watching a video.
   */
  inWater: boolean;
  onVine: boolean;
  lamps: number;
  iframes: number;
  or: number;
  orGathered: number;
  veilings: number;
  /** Width of the region in pixels, so progress can be read as a fraction. */
  width: number;
  progress: number;
  husks: { total: number; standing: number; broken: number; nearest?: number };
  /** Where the rung's House figure stands, from the Scribe. Absent if none. */
  house?: { dx: number; dy: number };
  /**
   * And where the pedestal is, for the same reason and with a sharper one
   * behind it: the vessel is the collectible whose whole wiring was broken for
   * months and could not be seen. See below.
   */
  vessel?: { dx: number; dy: number };
  /**
   * Where the hidden thing is, if this rung's chamber still holds one, and
   * whether the Eye has been opened.
   *
   * Both, because the chamber is the first thing in the game with **two**
   * gates: the driver has to press act to make the staircase exist and then
   * climb it, and told only the first it would report a clean run from the
   * floor. `revealed` is what says the press landed — Ayin is on the same key
   * as the Hook and four other letters, and which one answers depends on what
   * is standing beside you.
   */
  relic?: { dx: number; dy: number };
  /**
   * Where the rung's un-answered Tav shrine stands, from the Scribe. Absent
   * once it has answered — so on netzach-bound ground, where the rung rule
   * keeps every shrine cold (P15-R1), it never goes absent at all, which is
   * itself the fact a script can steer by and then assert.
   */
  shrine?: { dx: number; dy: number };
  /** What this climb has brought out of a chamber — the twin of `items`. */
  relics: string[];
  revealed: boolean;
  marks: number;
  /**
   * Marks thrown on this rung — `World.marksThrown`, the count Gevurah's
   * ration is judged against, so a script can watch a ration spend down.
   */
  thrown: number;
  letters: string[];
  /** The vessels actually lifted, so a script can assert taking rather than offering. */
  items: string[];
  housesMet: number;
  /**
   * The bargains ledger, verbatim off the record — so a script can assert a
   * choice was *remembered*, not merely that a plate rose. The P13e-1 rule:
   * content the harness cannot see is content that ships blind.
   */
  bargains: { sefirah: string; outcome: string }[];
  fragments: number;
  /** Which plate is up, if any — the only way to know a story beat landed. */
  plate?: string;
  message?: string;
  finished: boolean;
  out: boolean;
  /**
   * **Where the Scribe stands when there is no world** — the overworld.
   *
   * The probe used to return `null` without a world, which was true of the
   * game it was written for: a warp dropped straight onto a rung, so no-world
   * meant nothing was happening. The warp is Tree-native now, so no-world is
   * the ordinary state *between* rungs — standing on the map, choosing a way
   * — and a harness that cannot see it cannot check the door every player
   * comes through.
   */
  onMap: boolean;
  at?: string;
  sefirotLit: number;
  guardiansBroken: number;
  /**
   * The root the rung's Word-Gate is asking for, while its plate is up.
   *
   * The one thing a driver could never do: `playtest.mjs` says outright that
   * "a crossing is unfinishable by the tool by construction", because no key
   * opens a gate and the answer lives in a 3,100-root lexicon. It is not a
   * cheat to hand it over — the clue is on the plate for a person to read, and
   * this is the machine reading it.
   */
  gate?: { letterIds: string[]; hebrew: string; clue: string };
}

export function probeOf(
  world: World | null,
  ascent: AscentRecord | null,
  plate?: string,
): Probe | null {
  // Standing on the Tree: no world, but a climb very much in progress.
  if (!world) {
    if (!ascent) return null;
    return {
      ...EMPTY_WORLD,
      letters: [...ascent.lettersHeld],
      items: [...(ascent.items ?? [])],
      relics: [...(ascent.relicsFound ?? [])],
      housesMet: ascent.housesMet.length,
      bargains: [...(ascent.bargains ?? [])],
      fragments: ascent.scrollFragments?.length ?? 0,
      plate,
      onMap: true,
      at: ascent.at ?? "malchut",
      sefirotLit: ascent.sefirotLit?.length ?? 0,
      guardiansBroken: ascent.guardiansBroken?.length ?? 0,
    };
  }
  // A broken husk is filtered out of `world.husks` on the tick it breaks, so
  // the array is what is still standing and the region's total is that plus
  // the count. Reading `world.husks.length` as the total would report "0 of 5
  // broken" in a region where two had just been broken.
  const standing = world.husks.filter((h) => !h.broken);
  const nearest = standing
    .map((h) => Math.abs(h.x - world.player.x))
    .sort((a, b) => a - b)[0];
  const px = world.width * TILE_SIZE; // `width` is in tiles
  /**
   * **Where the figure of the Houses is standing, relative to the Scribe.**
   *
   * A House comes from an `H` marker inside whichever chunks a rung happens to
   * lay, so it can be anywhere — including a ledge the walking driver has no
   * reason to climb onto. That is not a guess: the `house` script and three
   * attempts at the `vow` script all walked past the marker's column and never
   * raised a plate. A driver cannot steer to something it cannot see, so this
   * is the seeing.
   */
  const house = world.entities.find((e) => e.kind === "house" && !e.taken);
  /**
   * **And the pedestal**, which needed this more than the House did.
   *
   * `onVessel` was threaded through `GameCanvas`'s props and never assigned
   * onto the step context, so `ctx.onVessel?.()` was a no-op and **no vessel
   * could be taken in the shipped game at all**. Nothing saw it: the fight
   * probes build their own `StepContext` and pass `items` straight in, so they
   * measured a game nobody was playing, and no harness script could reach a
   * pedestal — `VESSEL_CHUNK` puts it on a shelf two rows up, exactly the ledge
   * the walking driver has no reason to climb. A type now makes the wiring
   * mistake impossible; this makes the *reaching* possible, so a script can
   * watch the plate rise.
   */
  const keli = world.entities.find((e) => e.kind === "vessel" && !e.taken);
  const hidden = world.entities.find((e) => e.kind === "relic" && !e.taken);
  const altar = world.entities.find((e) => e.kind === "mark" && !e.active);
  return {
    tick: world.tick,
    regionIndex: world.regionIndex,
    sefirah: world.sefirah,
    x: Math.round(world.player.x),
    y: Math.round(world.player.y),
    vx: Math.round(world.player.vx),
    onGround: world.player.onGround,
    veiled: world.player.veiled > 0,
    inWater: world.player.inWater,
    onVine: world.player.climbing || onVine(world),
    grappled: Boolean(world.player.grappleTo),
    lamps: world.player.lamps,
    iframes: world.player.iframes,
    or: world.or,
    orGathered: world.orGathered,
    veilings: world.veilings,
    width: px,
    progress: px > 0 ? Math.min(1, Math.max(0, world.player.x / px)) : 0,
    husks: {
      total: standing.length + world.husksBroken,
      standing: standing.length,
      broken: world.husksBroken,
      nearest: nearest === undefined ? undefined : Math.round(nearest),
    },
    marks: world.marks.length,
    thrown: world.marksThrown,
    vessel: keli
      ? { dx: Math.round(keli.x - world.player.x), dy: Math.round(keli.y - world.player.y) }
      : undefined,
    relic: hidden
      ? { dx: Math.round(hidden.x - world.player.x), dy: Math.round(hidden.y - world.player.y) }
      : undefined,
    shrine: altar
      ? { dx: Math.round(altar.x - world.player.x), dy: Math.round(altar.y - world.player.y) }
      : undefined,
    relics: [...(ascent?.relicsFound ?? [])],
    revealed: world.revealed,
    items: [...(ascent?.items ?? [])],
    house: house
      ? { dx: Math.round(house.x - world.player.x), dy: Math.round(house.y - world.player.y) }
      : undefined,
    letters: [...(ascent?.lettersHeld ?? [])],
    housesMet: ascent?.housesMet.length ?? 0,
    bargains: [...(ascent?.bargains ?? [])],
    fragments: ascent?.scrollFragments?.length ?? 0,
    plate,
    message: world.message?.text,
    finished: world.finished,
    out: Boolean(world.out),
    onMap: false,
    at: ascent?.at,
    sefirotLit: ascent?.sefirotLit?.length ?? 0,
    guardiansBroken: ascent?.guardiansBroken?.length ?? 0,
    gate:
      world.wordGate && !world.wordGateOpen
        ? {
            letterIds: [...world.wordGate.letterIds],
            hebrew: world.wordGate.hebrew,
            clue: world.wordGate.clue,
          }
        : undefined,
  };
}

/** What a Scribe standing on the map has instead of a world. */
const EMPTY_WORLD = {
  tick: 0,
  regionIndex: 0,
  sefirah: "",
  x: 0,
  y: 0,
  vx: 0,
  onGround: true,
  veiled: false,
  inWater: false,
  onVine: false,
  grappled: false,
  lamps: 0,
  iframes: 0,
  or: 0,
  orGathered: 0,
  veilings: 0,
  width: 0,
  progress: 0,
  husks: { total: 0, standing: 0, broken: 0, nearest: undefined },
  marks: 0,
  thrown: 0,
  revealed: false,
  message: undefined,
  finished: false,
  out: false,
} satisfies Omit<
  Probe,
  | "letters"
  | "items"
  | "relics"
  | "housesMet"
  | "bargains"
  | "fragments"
  | "plate"
  | "onMap"
  | "at"
  | "sefirotLit"
  | "guardiansBroken"
  | "gate"
>;

/**
 * The tiles immediately around the Scribe, as names.
 *
 * The harness's driver has to see what the traversal probe in the test suite
 * sees — a gap one stride ahead, a thornbrake two tiles up, floor somewhere
 * below — or it will be a *worse* player than the one the suite already
 * guarantees can finish, and every level will look impossible. That mistake
 * has already been made once today; this is what makes it not repeat.
 *
 * `[dy][dx]`, relative to the tile the Scribe stands in, `radius` each way.
 */
export function neighbourhood(world: World | null, radius = 4): string[][] {
  if (!world) return [];
  const p = world.player;
  const cx = Math.floor((p.x + p.w / 2) / TILE_SIZE);
  const cy = Math.floor((p.y + p.h + 1) / TILE_SIZE);
  const rows: string[][] = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    const row: string[] = [];
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = cx + dx;
      const y = cy + dy;
      row.push(
        x < 0 || y < 0 || x >= world.width || y >= world.height
          ? "out"
          : tileName(world.tiles[y * world.width + x] ?? 0),
      );
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Every tile there is, by name.
 *
 * **`Record<Tile, string>` and not `Record<number, string>`, so that "every" is
 * the compiler's business rather than a reader's.** Under the looser type this
 * table stopped at `WordGate`, and the two tiles authored after it fell through
 * the lookup's old `?? "empty"` — so `look()` reported a door closed behind the
 * Scribe, and a figured stone, to every driver in the harness as **open air**.
 *
 * Both were live faults, and each is the exact inverse of the tile's purpose. A
 * `Seal` is the one tile that appears on its own to hold a body in a room, and
 * the driver was told there was nothing there. A `Maskit` is solid and
 * *indistinguishable from hewn stone* — its whole design — and the driver was
 * told the floor had a hole in it, on every rung, twice a rung since P13d
 * raised the budget.
 *
 * This is the third table with a silent default to go stale behind a new tile:
 * `TILE_CHARS` had no character for `Maskit` until P13a, `MARKER_CHARS` had no
 * case for `*` for the life of the library. It is the first one where adding a
 * tile and forgetting this file will fail to compile.
 */
export const TILE_NAMES: Record<Tile, string> = {
  [Tile.Empty]: "empty",
  [Tile.Stone]: "stone",
  [Tile.Ledge]: "ledge",
  [Tile.Water]: "water",
  [Tile.Thorn]: "thorn",
  [Tile.Growth]: "growth",
  [Tile.Vine]: "vine",
  [Tile.Veiled]: "veiled",
  [Tile.Door]: "door",
  [Tile.Anchor]: "anchor",
  [Tile.LowGap]: "lowgap",
  [Tile.Placed]: "placed",
  [Tile.WordGate]: "wordgate",
  [Tile.Seal]: "seal",
  [Tile.Maskit]: "maskit",
};

/**
 * A tile's name, or `"unknown"` for a number that is not a tile at all.
 *
 * Deliberately **not** `"empty"`. A driver reads these names as terrain, and of
 * all the wrong answers a byte outside the enum could be given, open air is the
 * only one that makes a body *walk into* whatever is actually there. That is
 * what the old fallback handed out for free, and it is why two real tiles were
 * invisible rather than merely unnamed.
 */
function tileName(t: number): string {
  return Object.hasOwn(TILE_NAMES, t) ? TILE_NAMES[t as Tile] : "unknown";
}

export interface ProbeApi {
  read: () => Probe | null;
  look: (radius?: number) => string[][];
  /** What a frame costs — see `frameStats`. The P6 perf gate reads this. */
  frames: () => ReturnType<typeof frameStats>;
  /** Where the frame went — see `phaseStats`. */
  phases: () => ReturnType<typeof phaseStats>;
}

/**
 * Whether the Scribe's own body overlaps a vine — which is what `step` asks
 * before it will begin a climb, and which a driver cannot see from the tile
 * grid alone without knowing the body's height.
 */
function onVine(world: World): boolean {
  const p = world.player;
  const x = Math.floor((p.x + p.w / 2) / TILE_SIZE);
  for (let y = Math.floor(p.y / TILE_SIZE); y <= Math.floor((p.y + p.h - 1) / TILE_SIZE); y += 1) {
    if (world.tiles[y * world.width + x] === Tile.Vine) return true;
  }
  return false;
}

/**
 * **What a frame costs**, kept as a rolling window on the module rather than in
 * React — a measurement that caused a render would be measuring itself.
 *
 * The renderer re-synthesizes every visible tile from vector primitives sixty
 * times a second: no sprite atlas, no layer cache, a gradient allocated per
 * frame. That is the roadmap's most likely mid-phone cliff and its P6 work is
 * explicitly gated on numbers rather than on suspicion — these are the
 * numbers. Recorded only in DEV, and only when someone asks for them.
 */
const FRAMES: number[] = [];
const FRAME_WINDOW = 600;

export function recordFrame(ms: number): void {
  FRAMES.push(ms);
  if (FRAMES.length > FRAME_WINDOW) FRAMES.shift();
}

/**
 * **Where a frame goes**, split into the two halves that can be optimised
 * separately: the tile loop, which re-synthesizes every visible tile from
 * vector primitives, and everything with a body in it. Temporary — this exists
 * to point the P6 work at the right half rather than at the plausible one.
 */
const PHASES: Record<string, { ms: number; n: number; count: number }> = {};

export function recordPhase(name: string, ms: number, count: number): void {
  const p = (PHASES[name] ??= { ms: 0, n: 0, count: 0 });
  p.ms += ms;
  p.n += 1;
  p.count = count;
}

export function phaseStats(): Record<string, { avgMs: number; frames: number; count: number }> {
  const out: Record<string, { avgMs: number; frames: number; count: number }> = {};
  for (const [name, p] of Object.entries(PHASES)) {
    out[name] = { avgMs: Math.round((p.ms / p.n) * 1000) / 1000, frames: p.n, count: p.count };
  }
  return out;
}

/** p50 and p95 over the last ten seconds of frames, in milliseconds. */
export function frameStats(): { frames: number; p50: number; p95: number; worst: number } {
  if (FRAMES.length === 0) return { frames: 0, p50: 0, p95: 0, worst: 0 };
  const sorted = [...FRAMES].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  return {
    frames: sorted.length,
    p50: Math.round(at(0.5) * 100) / 100,
    p95: Math.round(at(0.95) * 100) / 100,
    worst: Math.round(sorted[sorted.length - 1] * 100) / 100,
  };
}

/** Hang the readout on `window`, and return the way to take it down again. */
export function installProbe(api: ProbeApi): () => void {
  const holder = window as unknown as Record<string, unknown>;
  holder[PROBE_KEY] = api;
  return () => {
    delete holder[PROBE_KEY];
  };
}

import { abilityByLetter, type Grace, type Verb } from "../abilities";
import { HUSKS, type HuskKind } from "../combat";
import { buildRegion, setTile } from "./build";
import { outOfReach, step, strikeHusk, type StepContext } from "./step";
import { Tile, TILE_SIZE } from "./tiles";
import { NO_INPUT, type Husk, type World } from "./types";

/**
 * **The bench — one klipah, one room, and a Scribe who does the same seven
 * things to all of them.**
 *
 * Every kind has had its own `case` in `stepHusks` since the creature tier was
 * written, so "does it have a behaviour?" has never been the useful question.
 * The useful question is whether the behaviour is *distinguishable*: five of
 * them face the Scribe and run at him and differ only in the condition on the
 * front, and a condition nothing in play ever satisfies is a comment.
 *
 * So this puts each kind in a room and asks it the same questions the game
 * does — a Scribe standing in front of it, a Scribe with his back turned, a
 * Scribe above it, a Scribe below it, a Scribe walking away, a Scribe who has
 * just hit it, and a Scribe standing behind a stone he set — and writes down
 * what it did. Two kinds that answer all seven the same way are the same
 * creature wearing two names, whatever their cases look like.
 *
 * **And the room is the one the kind was authored for**, which the first
 * version of this file got wrong and which is worth writing down: a bench that
 * lays Leviathan on dry stone and the Nefilim on the floor measures three
 * creatures doing nothing and calls them identical. The klipah is put in its
 * element — water for the two that live in it, the ceiling for the two that
 * hang from it, a mote on the ground for the one that hunts them — because the
 * element is not scenery, it is half the behaviour.
 *
 * It is deliberately **not** a region walk. A rung answers a different question
 * (does this thing cost a lamp in play), it answers it with the terrain's voice
 * mixed in, and it cannot ask about a posture because the probe chooses its
 * own. Here the Scribe is a fixture and the klipah is the only thing moving.
 */

/** What one klipah did over one posture, in numbers a test can compare. */
export interface Trace {
  /** Ground covered, in tiles — zero for the rooted ones. */
  travelled: number;
  /** Tiles nearer the Scribe at the end than at the start. Negative is retreat. */
  closed: number;
  /** How much of its life it spent moving at all. */
  moving: number;
  /** The highest it got above where it started, in tiles. */
  rose: number;
  /** The lowest it got below where it started. */
  fell: number;
  /** Marks it put into the world. */
  threw: number;
  /**
   * Of those, how many were born over the Scribe rather than near itself.
   * This is the whole difference between the Saraf and Og, and without it the
   * bench calls them the same creature.
   */
  threwOver: number;
  /** Whether it ever reached the Scribe. */
  touched: boolean;
  /** Times it turned around. */
  turns: number;
  /**
   * Shells it took off itself. The Scribe throws nothing on this bench, so any
   * shell lost here was lost to the creature's own momentum — which exactly
   * one klipah in the game does, and which is the only thing separating the
   * Re'em from Behemoth once both are asked the same seven questions.
   */
  selfHarm: number;
}

/** The seven things a Scribe can be, as far as a klipah is concerned. */
export type Posture =
  | "facing"
  | "turned"
  | "above"
  | "under"
  | "leaving"
  | "struck"
  | "blocked";

export const POSTURES: readonly Posture[] = [
  "facing",
  "turned",
  "above",
  "under",
  "leaving",
  "struck",
  "blocked",
];

const ROUND = (n: number) => Math.round(n * 10) / 10;

/** The kinds that were authored for water, and are scenery without it. */
const SWIMMERS: ReadonlySet<HuskKind> = new Set<HuskKind>(["tannin", "livyatan"]);
/** The kinds that were authored to hang, and are inert on the floor. */
const HANGERS: ReadonlySet<HuskKind> = new Set<HuskKind>(["nefilim", "ziz"]);

/**
 * An empty room with a floor and nothing in it — built from a real region so
 * every field is the one the game uses, then wiped so only what the bench
 * places is present.
 */
function room(kind: HuskKind, posture?: Posture): World {
  const world = buildRegion(1, 7, 1, false, 1);
  world.tiles.fill(Tile.Empty);
  world.entities = [];
  world.husks = [];
  world.marks = [];
  world.rooms = [];
  const floor = world.height - 1;
  for (let x = 0; x < world.width; x += 1) setTile(world, x, floor, Tile.Stone);
  // A pool for the two that live in one, on the klipah's side of the room so
  // the Scribe still stands on dry stone and the bank is where the fight is.
  if (SWIMMERS.has(kind)) {
    for (let x = 10; x < world.width; x += 1) {
      for (let y = floor - 3; y < floor; y += 1) setTile(world, x, y, Tile.Water);
    }
  }
  // A stone the Scribe set, standing between him and it. This is a posture
  // like the others — it is something a Scribe *does*, with Bet — and it is
  // the only question that tells the two great chargers apart: one goes into
  // it and takes a shell off itself, and one stops dead in front of it.
  if (posture === "blocked") {
    for (let y = floor - 5; y < floor; y += 1) setTile(world, 9, y, Tile.Placed);
  }
  // A loose mote, for the one that hunts them rather than the Scribe.
  if (kind === "atalya") {
    world.entities = [
      { id: "bench-mote", kind: "mote", x: 16 * TILE_SIZE, y: (floor - 1) * TILE_SIZE },
    ];
  }
  return world;
}

/** One klipah of a kind, laid where it belongs, facing the Scribe. */
function lay(world: World, kind: HuskKind): Husk {
  const spec = HUSKS[kind];
  const floor = world.height - 1;
  const tall = Math.ceil(spec.size.h / TILE_SIZE);
  // Twelve tiles out, which is inside every finite `notices` in the table.
  const atX = 12 * TILE_SIZE;
  const atY = HANGERS.has(kind) ? (floor - 8) * TILE_SIZE : (floor - tall) * TILE_SIZE;
  const husk: Husk = {
    id: `bench-${kind}`,
    kind,
    x: atX,
    y: atY,
    w: spec.size.w,
    h: spec.size.h,
    vx: 0,
    vy: 0,
    shells: spec.shells,
    facing: -1,
    home: { x: atX, y: atY },
    cooldown: 0,
    charging: 0,
    struck: 0,
  };
  world.husks = [husk];
  return husk;
}

/**
 * **The room and its one klipah, handed out** — for a test that needs a
 * creature standing in the element it was authored for and has a question the
 * seven postures do not answer.
 *
 * Exported rather than copied, because the element is half the behaviour and a
 * second hand-built pool beside this one would drift from it within a phase:
 * the Tannin's whole rule is about being in water, and a test that laid it on
 * dry stone would prove whatever it liked.
 */
export function laid(kind: HuskKind): { world: World; husk: Husk } {
  const world = room(kind);
  return { world, husk: lay(world, kind) };
}

/**
 * Runs one kind against one posture and writes down what it did.
 *
 * The Scribe is pinned every tick rather than driven, because the question is
 * what the *klipah* does: a Scribe who is allowed to be pushed around turns
 * every trace into a trace of the collision instead of the behaviour. His lamps
 * are refilled each tick for the same reason — a posture that ended early
 * because he went out would measure the room's patience, not the creature.
 */
export function bench(kind: HuskKind, posture: Posture, ticks = 420): Trace {
  const world = room(kind, posture);
  const husk = lay(world, kind);
  const ctx: StepContext = { verbs: [], graces: [] };
  const floor = world.height - 1;

  const p = world.player;
  const standX = 6 * TILE_SIZE;
  const standY = (floor - 2) * TILE_SIZE;
  // **Taken from where the klipah began, not from where it is.** Read live,
  // `above` is a Scribe who climbs away from anything that comes up at him and
  // `under` one who sinks away from anything that comes down — so every kind
  // measured as ignoring him, including the three that were flying straight at
  // him the whole time. The posture is a place in the room, not a leash.
  const overX = husk.x;
  const overY = husk.y;
  const place = (t: number) => {
    p.vx = 0;
    p.vy = 0;
    p.lamps = 99;
    p.iframes = 0;
    p.facing = 1;
    switch (posture) {
      case "facing":
        p.x = standX;
        p.y = standY;
        break;
      case "turned":
        p.x = standX;
        p.y = standY;
        p.facing = -1;
        break;
      case "above":
        // Directly over it — the posture Esau gives up on.
        p.x = overX;
        p.y = overY - TILE_SIZE * 4;
        break;
      case "under":
        // Directly beneath it — the posture the Nefilim are waiting for, and
        // which nothing standing on the floor can ever be put in.
        p.x = overX;
        p.y = overY + TILE_SIZE * 4;
        break;
      case "leaving":
        p.x = standX - t * 1.4;
        p.y = standY;
        p.facing = -1;
        break;
      case "struck":
      case "blocked":
        p.x = standX;
        p.y = standY;
        break;
    }
  };

  place(0);
  const startY = husk.y;
  const startNear = Math.hypot(husk.x - p.x, husk.y - p.y);
  let travelled = 0;
  let moved = 0;
  let rose = 0;
  let fell = 0;
  let turns = 0;
  let threw = 0;
  let threwOver = 0;
  let touched = false;
  let wasFacing = husk.facing;
  let wasX = husk.x;
  let wasShells = husk.shells;
  let selfHarm = 0;

  for (let t = 0; t < ticks; t += 1) {
    place(t);
    // One blow, early, for the kind that does nothing until it is hit — and
    // only one, so what is measured is the answer to it rather than a beating.
    if (posture === "struck" && t === 30) strikeHusk(world, husk, 1, 1, husk.x);
    const before = world.marks.length;
    step(world, NO_INPUT, ctx);
    if (husk.broken) break;
    for (const m of world.marks.slice(before)) {
      threw += 1;
      // Born over the Scribe rather than near itself — Og's ceiling against
      // the Saraf's floor.
      if (Math.abs(m.x - (p.x + p.w / 2)) < TILE_SIZE * 2) threwOver += 1;
    }
    // A shell gone with nothing of the Scribe's in the air is a shell the
    // creature took off itself.
    if (husk.shells < wasShells && posture !== "struck") selfHarm += wasShells - husk.shells;
    wasShells = husk.shells;
    travelled += Math.abs(husk.x - wasX);
    if (Math.abs(husk.x - wasX) > 0.2 || Math.abs(husk.vy) > 20) moved += 1;
    wasX = husk.x;
    rose = Math.max(rose, startY - husk.y);
    fell = Math.max(fell, husk.y - startY);
    if (husk.facing !== wasFacing) turns += 1;
    wasFacing = husk.facing;
    if (
      Math.abs(husk.x + husk.w / 2 - (p.x + p.w / 2)) < (husk.w + p.w) / 2 &&
      Math.abs(husk.y + husk.h / 2 - (p.y + p.h / 2)) < (husk.h + p.h) / 2
    ) {
      touched = true;
    }
  }

  const endNear = Math.hypot(husk.x - p.x, husk.y - p.y);
  return {
    travelled: ROUND(travelled / TILE_SIZE),
    closed: ROUND((startNear - endNear) / TILE_SIZE),
    moving: ROUND(moved / ticks),
    rose: ROUND(rose / TILE_SIZE),
    fell: ROUND(fell / TILE_SIZE),
    threw,
    threwOver,
    touched,
    turns,
    selfHarm,
  };
}

/** Every posture for one kind, which is what makes two kinds comparable. */
export function benchAll(kind: HuskKind): Record<Posture, Trace> {
  return Object.fromEntries(POSTURES.map((s) => [s, bench(kind, s)])) as Record<Posture, Trace>;
}

/**
 * A kind's seven traces as one string, coarse enough that a pixel of drift is
 * not a difference and fine enough that a different idea is.
 *
 * The coarseness is the whole design of it: comparing raw numbers would call
 * every kind distinct and prove nothing, since no two of them have the same
 * speed in the table. What is compared is the *shape* — did it come, did it
 * wait, did it climb, what did it throw and where, did it reach you.
 */
export function signature(kind: HuskKind): string {
  return POSTURES.map((posture) => {
    const t = bench(kind, posture);
    const came = t.closed > 1 ? "come" : t.closed < -1 ? "flee" : "hold";
    const busy = t.moving > 0.6 ? "walks" : t.moving > 0.1 ? "stirs" : "still";
    const air = t.rose > 1 ? "rises" : t.fell > 1 ? "drops" : "level";
    const arms = t.threw === 0 ? "-" : t.threwOver > t.threw / 2 ? "overhead" : "underfoot";
    const own = t.selfHarm > 0 ? "/breaks-itself" : "";
    return `${posture}:${came}/${busy}/${air}/${arms}/${t.touched ? "reaches" : "-"}${own}`;
  }).join(" ");
}

const ALL_VERBS: Verb[] = Object.values(abilityByLetter)
  .map((a) => a?.verb)
  .filter((v): v is Verb => Boolean(v));
const ALL_GRACES: Grace[] = Object.values(abilityByLetter)
  .map((a) => a?.grace)
  .filter((g): g is Grace => Boolean(g));

/**
 * **How long a Scribe who is actually trying takes to break one.**
 *
 * The walking probes answer a different question and answer it well: they walk
 * to the way out and write on what gets in front of them, which is what a climb
 * is. What they cannot tell you is whether a klipah is *breakable at all* —
 * a creature the probe never happens to face reads exactly like a creature no
 * mark can touch, and the two want opposite fixes.
 *
 * So this Scribe does nothing but the one thing: he stands his ground, he faces
 * it, he aims up or down at it, and he throws every time the cooldown is off.
 * He holds all twenty-two letters, because the question is whether the *game*
 * can break it rather than whether a particular hand can. If this returns -1
 * for any kind in the table, that kind is furniture, and there is no arrangement
 * of skill or letters that makes it otherwise.
 *
 * This is the test that was missing. Korach was laid in three of the ten
 * regions for the whole life of the creature tier and could not be broken by
 * anybody, and every instrument the game had reported it as merely difficult.
 */
export function breakIn(kind: HuskKind, ticks = 4000): number {
  const world = room(kind);
  const husk = lay(world, kind);
  const ctx: StepContext = { verbs: ALL_VERBS, graces: ALL_GRACES };
  const p = world.player;

  for (let t = 0; t < ticks; t += 1) {
    // **He keeps station on it** rather than standing on one spot. The question
    // is whether the creature can be broken, not whether a fixed pair of feet
    // happens to be in the right place: a klipah that runs for a mote or hangs
    // six tiles up would otherwise read as unbreakable when what it actually
    // is, is somewhere else. Two tiles off its shoulder and level with its
    // middle — the place a player ends up after chasing it.
    p.x = husk.x - TILE_SIZE * 2;
    /**
     * **...but never inside the earth.** Keeping station is right for a klipah
     * that hangs from a ceiling or swims; it is nonsense for the one that
     * travels *under the floor*, and it put the Scribe twelve tiles below the
     * room with the whole world above his head. That was harmless while the
     * eruption was measured from his own body — it simply opened wherever he
     * was — and stopped being harmless the moment it was anchored to the
     * ground, because there is no ground beneath a Scribe who is under it: the
     * creature never surfaced at all and read as unbreakable.
     *
     * A Scribe stands on things. The floor of the bench is its bottom row.
     */
    const standing = (world.height - 1) * TILE_SIZE - p.h;
    p.y = Math.min(husk.y + husk.h / 2 - p.h / 2, standing);
    p.vx = 0;
    p.vy = 0;
    p.lamps = 99;
    p.iframes = 0;
    p.veiled = 0;
    p.facing = husk.x + husk.w / 2 > p.x + p.w / 2 ? 1 : -1;
    // **Aimed against the mark's own line, not against the two centres.**
    // A mark leaves the Scribe's middle, and the Scribe is taller than most of
    // the klipot — so a creature resting on the same floor he is standing on
    // sits entirely *below* the line his marks fly along, and comparing the two
    // centres with a one-tile tolerance says "level" and throws it over their
    // heads. Measured that way, twelve of the twenty read as unbreakable, which
    // said nothing about the twelve and everything about the instrument.
    const line = p.y + p.h / 2;
    step(
      world,
      {
        ...NO_INPUT,
        strike: true,
        up: husk.y + husk.h < line - 3,
        down: husk.y > line + 3,
      },
      ctx,
    );
    if (husk.broken || world.husks.length === 0) return t;
  }
  return -1;
}


/**
 * **How much of its life a mark can touch it at all**, as a fraction.
 *
 * One for nineteen of the twenty, because a klipah is a thing you write on.
 * The exception is Korach, who is inside the ground for most of his cycle and
 * is supposed to be — but "most" is a number, and nobody had ever taken it.
 * It was sixteen per cent, which is not a creature that hides, it is a creature
 * that cannot be broken: over sixty-six honest walks the fighting probe laid
 * thirty-seven and took one.
 *
 * `breakIn` does not catch this and cannot. Its Scribe keeps station, so he is
 * standing over the hole at the one moment the thing is out, and he takes it —
 * a perfect player answers a sixteen-per-cent window, and every real one walks
 * past. This is the measurement that tells them apart.
 */
export function reachable(kind: HuskKind, ticks = 3000): number {
  const world = room(kind);
  const husk = lay(world, kind);
  const ctx: StepContext = { verbs: ALL_VERBS, graces: ALL_GRACES };
  const p = world.player;
  const standY = (world.height - 3) * TILE_SIZE;
  let out = 0;
  for (let t = 0; t < ticks; t += 1) {
    p.x = 6 * TILE_SIZE;
    p.y = standY;
    p.vx = 0;
    p.vy = 0;
    p.lamps = 99;
    p.iframes = 0;
    step(world, NO_INPUT, ctx);
    if (husk.broken) break;
    if (!outOfReach(husk)) out += 1;
  }
  return Math.round((out / ticks) * 100) / 100;
}

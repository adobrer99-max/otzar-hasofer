import { describe, expect, it } from "vitest";
import { CHUNK_H, CHUNK_W, CHUNKS, chunksById, END_CHUNK, START_CHUNK } from "./chunks";
import { paintChunks, tileAt } from "./build";
import { chainFor, declares, hurried, probe } from "./probes";
import { routeTo } from "./route";
import { openWordGate } from "./step";
import { makeRng, randomInt } from "../rng";
import { Tile } from "./tiles";
import type { Chunk } from "./types";

/**
 * **How much a screen asks of a body that will not slow down.**
 *
 * Everything else in this suite that walks the library asks whether a screen
 * can be *crossed* — the soft-lock question, settled for every screen there is,
 * on every seed, by `traversal.test.ts`. This file asks the other one, and
 * until `hurried` existed nothing could: **does the ground cost anything to run
 * past?**
 *
 * The play report the terrain phase came from is that it does not — that the
 * small klipot can be skipped by running and the ground does not punish it —
 * and the reason is written down rather than felt. The authoring alphabet is
 * nine things a screen can hold besides stone, ledge and air, and every one of
 * the nine is a **lock**: a thorn, water, a thicket, a vine, veiled stone, a
 * door, a ring, a low crawl, a Word-Gate. Each is answered by a letter and each
 * costs exactly nothing once the letter is held. The one tile in the game that
 * charges a careless body rather than an unequipped one is `Tile.Maskit`, and
 * until P13a it had no character in `TILE_CHARS`, so no screen had ever been
 * composed around one.
 *
 * ## The measurement
 *
 * **Seventy-six screens** — everything `chunksById` holds but `START_CHUNK` and
 * `END_CHUNK`, which are the harness itself. That is the body library, the
 * three taught screens, and every fixed screen a rung lays: the Tav shrine at
 * both heights, the letter alcove, the genizah niche, the House, the pedestal,
 * the relic chamber, the five Word-Gate rooms and the Abyss gate. **They are in
 * scope on purpose** — a runner sprints through all of them, and if a quarter
 * of what a rung lays is guaranteed free ground then that is part of why
 * progress is cheap. The guardians' arenas are out by construction rather than
 * by judgement: they are not in `chunksById`, `buildArena` names them directly,
 * a room seals while a guardian stands in it, and `guardianFight.test.ts` is
 * their instrument. Running past a guardian is not a thing that can happen.
 *
 * Ten seeds, both arms, holding exactly what the screen declares. **Every
 * screen came back unanimous — ten of ten or none of ten, not one marginal** —
 * so the buckets below are facts rather than roundings.
 *
 * | | |
 * |---|---|
 * | free to a runner | **70** |
 * | takes something and lets you through | **0** |
 * | asks a move you must stop to make | **6** |
 *
 * And the cross-tab, which is the sharper half:
 *
 * - **Every one of the thirty-nine letterless screens is free.** Not one screen
 *   in this game that a Scribe with no letters walks asks anything at all of a
 *   body in a hurry.
 * - Of the thirty-seven gated screens, thirty-one are free; all six that are
 *   not are gated, and half of those are the three Bet screens.
 * - By demand band: **28 of 30 at demand 1, 22 of 23 at demand 2, 20 of 23 at
 *   demand 3.** The crown's ground is very nearly as free to run past as the
 *   kingdom's, which is *still far too easy to progress* stated as a number.
 * - All fourteen fixed screens are free, and twelve of them are crossed in the
 *   same number of ticks by both probes — the same walk, not merely the same
 *   outcome.
 */

/** Every screen a rung can lay. The two harness screens are the chain, not the subject. */
const SUBJECTS: Chunk[] = Object.values(chunksById).filter((c) => c !== START_CHUNK && c !== END_CHUNK);

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface Reading {
  id: string;
  /** Seeds crossed, out of `SEEDS.length`. */
  crossed: number;
  veilings: number;
  sprung: number;
  /** Mean ticks a walk. */
  ticks: number;
}

/** A screen with a way in and a way out, painted the same for both arms. */
function stage(chain: readonly Chunk[], seed: number) {
  // A figured-stone budget big enough that every authored one on the chain
  // stands — otherwise a screen composed around a trap is measured with the
  // trap turned off and reported harmless.
  const world = paintChunks(chain, seed, 8);
  // The klipot are not what is being measured, and both lists have to go: a
  // figured stone stands something up out of the floor, so emptying the bodies
  // is not the same act as emptying the rung of creatures.
  world.husks = [];
  world.klipot = [];
  // **A gate is not terrain.** Neither probe can spell a root — the honest
  // crossing has its own test — so a barrier left standing reads here as ground
  // nobody can cross, which is a lie about the floor. Same precedent
  // `traversal.test.ts` set for the region walk.
  openWordGate(world, "opened for the walk");
  return world;
}

function read(chunk: Chunk, arm: "hurried" | "careful"): Reading | undefined {
  const chain = chainFor(chunk);
  if (!chain) return undefined;
  const verbs = declares(chunk);
  const out: Reading = { id: chunk.id, crossed: 0, veilings: 0, sprung: 0, ticks: 0 };
  for (const seed of SEEDS) {
    const world = stage(chain, seed);
    const ctx = { verbs, graces: [] };
    if (arm === "hurried") {
      const r = hurried(world, ctx, 8000);
      if (r.crossed) out.crossed += 1;
      out.veilings += r.veilings;
      out.sprung += r.sprung;
      out.ticks += r.ticks / SEEDS.length;
    } else {
      const r = probe(world, ctx, 8000);
      if (r.finished) out.crossed += 1;
      out.veilings += world.veilings;
      out.ticks += r.ticks / SEEDS.length;
    }
  }
  return out;
}

/** Both arms over every screen, taken once and shared — the sweep is a few seconds. */
let swept: { hurried: Reading[]; careful: Reading[] } | undefined;
function sweep() {
  if (!swept) {
    swept = {
      hurried: SUBJECTS.map((c) => read(c, "hurried")).filter((r): r is Reading => r !== undefined),
      careful: SUBJECTS.map((c) => read(c, "careful")).filter((r): r is Reading => r !== undefined),
    };
  }
  return swept;
}

const named = (rows: Reading[]) => rows.map((r) => r.id).sort();

// ---------------------------------------------------------------------------
// the two committed lists
// ---------------------------------------------------------------------------

/**
 * **Screens that charge a runner and still let them through** — the ground
 * taking something from a body that keeps going, which is the shape P13d aimed
 * at: *lose ground rather than lamps.* A screen that kills a runner teaches
 * nothing; a screen that drops one into a notch he has to climb back out of,
 * past the klipah that just came up out of the floor beside him, costs him
 * exactly the thing he was trying to save.
 *
 * **This list was empty until P13d, and that was the finding it answered.**
 * Nine screens carry an authored figured stone now, one apiece. Eight of the
 * nine are stumbles — the floor is two rows deep almost everywhere in this
 * library, so springing one is a step down into a slot — and **`the-gulf` is
 * the true fall**: its stepping stone is a single tile thick with the gulf open
 * underneath, so a body that trusts the middle of it goes all the way through
 * and is veiled.
 *
 * Seven of the nine ask for no letter at all, which is the half that matters:
 * before this, every one of the thirty-nine letterless screens was free.
 */
const TAKES_SOMETHING: readonly string[] = [
  "long-pit",
  "long-teeth",
  "narrow-stacks",
  "pit",
  "stagger-stacks",
  "the-gulf",
  "the-lip",
  "the-plinth",
  "two-pits",
];

/**
 * **Screens a body in a hurry cannot do at all** — the other kind of ask, and
 * the owner's decision is that P13d grows both and this table keeps them apart.
 * Every one of these is crossed by `probe` on every seed, so the list means
 * *asks a considered move* and never *is broken*.
 *
 * Half of them are the Bet screens, which is right: setting a stone at the lip
 * of a gap is the one genuinely considered move in this game — you have to
 * stand still at the edge, place it, step up onto it, and leap from a tile
 * further out and a tile higher — and `probe`'s own note records that it could
 * not do it either until it was taught to stand at a lip.
 */
const ASKS_A_MOVE: readonly string[] = [
  "high-vault",
  "sealed-deep",
  "set-and-set",
  "set-and-step",
  "set-stone",
  "vault-to-high",
];

describe("what a screen asks of a body in a hurry", () => {
  /**
   * A pair of hands that crosses nothing measures nothing. The floor under the
   * whole instrument: on the plainest ground there is — the opening screen and
   * the way out — a body that never stops gets out.
   */
  it("crosses plain ground without stopping", () => {
    const world = stage([START_CHUNK, END_CHUNK], 1);
    expect(hurried(world, { verbs: [], graces: [] }, 4000).crossed).toBe(true);
  });

  /**
   * **The control.** `ASKS_A_MOVE` is only meaningful if the careful arm gets
   * across everything — otherwise a screen that is simply broken would be
   * filed as a screen that asks something, which is the most flattering
   * possible way to be wrong about level design.
   */
  it("carries a careful Scribe across every screen there is, on every seed", { timeout: 300000 }, () => {
    const short = sweep()
      .careful.filter((r) => r.crossed < SEEDS.length)
      .map((r) => `${r.id} — ${r.crossed}/${SEEDS.length}`);
    expect(short, `screens a careful Scribe could not cross:\n  ${short.join("\n  ")}`).toEqual([]);
  });

  /**
   * **The whole library is covered, and the buckets are exhaustive.**
   *
   * Written as a count rather than left implicit, because the two ways this
   * measurement can quietly narrow are both ones it has already suffered:
   * `chainFor` silently dropped the four branching screens for the whole of its
   * life, and the sweep looked at `CHUNKS` when a rung lays a good deal more
   * than `CHUNKS`.
   */
  it("measures every screen a rung can lay, and files each in exactly one place", { timeout: 300000 }, () => {
    const rows = sweep().hurried;
    expect(rows.length, "some screen has no way in and no way out").toBe(SUBJECTS.length);
    expect(SUBJECTS.length).toBe(76);
    const free = rows.filter((r) => r.crossed === SEEDS.length && r.veilings === 0 && r.sprung === 0);
    expect(free.length + TAKES_SOMETHING.length + ASKS_A_MOVE.length).toBe(rows.length);
    // Unanimity, which is what lets these be lists rather than thresholds: not
    // one screen in the library is crossed on some seeds and not others.
    const wobbly = rows.filter((r) => r.crossed !== 0 && r.crossed !== SEEDS.length).map((r) => `${r.id} ${r.crossed}/${SEEDS.length}`);
    expect(wobbly, `screens the hurried arm crossed on some seeds and not others:\n  ${wobbly.join("\n  ")}`).toEqual([]);
  });

  /**
   * The committed lists, in the idiom of `combat.test.ts`'s named conditional
   * list, which exists so that **each addition is a person's decision**. P13d
   * shortens the free set one screen at a time by lengthening one of these, and
   * a screen that starts charging a runner without anybody saying so out loud
   * fails here.
   */
  it("names the screens that take something from a runner and let them past", { timeout: 300000 }, () => {
    const takes = named(
      sweep().hurried.filter((r) => r.crossed === SEEDS.length && (r.veilings > 0 || r.sprung > 0)),
    );
    expect(takes).toEqual([...TAKES_SOMETHING].sort());
  });

  it("names the screens a body in a hurry cannot do at all", { timeout: 300000 }, () => {
    const asks = named(sweep().hurried.filter((r) => r.crossed < SEEDS.length));
    expect(asks).toEqual([...ASKS_A_MOVE].sort());
  });

  /**
   * **The letterless ground is no longer free**, and this is the line P13d was
   * for.
   *
   * A screen with no verb gate is the ground a Scribe walks before the alphabet
   * has bought anything, and it is most of what the kingdom and the first rungs
   * are made of. P13b measured **thirty-nine of thirty-nine free to a runner**,
   * which meant that for the whole opening of a climb the terrain was scenery.
   * Seven of them charge one now.
   *
   * Kept as a floor rather than an exact count, because the exact membership is
   * `TAKES_SOMETHING`'s job and saying it twice would mean editing two lists to
   * author one screen. What this holds is the *claim*: the plain ground asks
   * something, and it must go on asking.
   */
  it("charges a runner on the ground that needs no letter at all", { timeout: 300000 }, () => {
    const rows = sweep().hurried;
    const gate = new Map(SUBJECTS.map((c) => [c.id, c.requires.length > 0]));
    const plain = rows.filter((r) => gate.get(r.id) === false);
    const charged = plain.filter((r) => r.veilings > 0 || r.sprung > 0);
    expect(plain.length).toBeGreaterThan(30);
    expect(
      charged.length,
      `only ${charged.length} of ${plain.length} letterless screens ask a runner for anything`,
    ).toBeGreaterThanOrEqual(6);
  });

  /**
   * **And assembling free screens does not make them cost anything**, which is
   * the control that stops the per-screen zero from being an artefact of
   * measuring three screens at a time.
   *
   * Sixteen letterless ground screens, drawn at random and laid one to
   * twenty-four deep, walked by a bare Scribe. Both arms cross essentially all
   * of it and **the careful probe is veiled slightly more often than the hurried
   * one** — 4.5 falls a walk against 2.8 at twenty-four screens — because
   * falling is one of `probe`'s own recovery behaviours and a body that never
   * stops to reconsider never uses it. Length is not a price.
   *
   * The one thing this does *not* license is a claim about a real rung. See the
   * note on `buildPath` below.
   */
  it("does not start charging a runner when free screens are laid end to end", { timeout: 300000 }, () => {
    const plain = CHUNKS.filter((c) => c.requires.length === 0 && c.entry === "ground" && c.exit === "ground");
    expect(plain.length).toBeGreaterThan(12);
    const charged: string[] = [];
    for (const n of [4, 12, 24]) {
      let crossed = 0;
      let veilings = 0;
      for (let seed = 1; seed <= 20; seed += 1) {
        const rng = makeRng(((seed * 7919) ^ (n * 0x9e3779b9)) >>> 0);
        const body = Array.from({ length: n }, () => plain[randomInt(rng, plain.length)]);
        const world = stage([START_CHUNK, ...body, END_CHUNK], seed);
        const r = hurried(world, { verbs: [], graces: [] }, 60000);
        if (r.crossed) crossed += 1;
        veilings += r.veilings;
      }
      // A wide bar on both: what is being caught is a collapse, not a wobble.
      // The measurement is 20/20 at four and twelve screens and 19/20 at
      // twenty-four, with under three falls a walk at the longest.
      if (crossed < 17) charged.push(`${n} screens: crossed only ${crossed}/20`);
      if (veilings / 20 > 6) charged.push(`${n} screens: ${(veilings / 20).toFixed(2)} veilings a walk`);
    }
    expect(charged, charged.join("\n  ")).toEqual([]);
  });
});

/**
 * **What is not measured here, and it is owed rather than forgotten.**
 *
 * The obvious next arm is a hurried Scribe over `buildPath` — a real rung on
 * the real Tree — and it was built, run over three independent pools of twelve
 * seeds, and then **cut, because it does not isolate the terrain.** The numbers
 * it gave: hurried crosses 67 / 75 / 78 per cent of rungs against a careful
 * 92 / 89 / 93, and is veiled 3.5 to 8.5 times a walk against 2.1 to 3.0.
 *
 * That reads as *a rung charges a runner about twice what it charges a walker*,
 * and it is not safe to read that way. Two controls say the gap is not in the
 * ground: the per-screen sweep above finds **zero** on every one of the
 * seventy-six screens, and the assembly control finds zero at any length with
 * the careful arm falling *more*. So whatever the wander is measuring, it is
 * not the authored screens, and at least one candidate is a fault in the arm
 * itself — it opened the Word-Gate only on the paths that cross the Abyss, so a
 * gate laid on an ordinary rung stood shut in front of a probe that cannot
 * spell.
 *
 * Reporting it as a property of the ground would be exactly the mistake P13a
 * made once already, where a driver that could not cast the Hook was reported
 * as *the anchor screens punish a runner*. **P13c re-measures over `buildPath`
 * by design** and is the place to take this properly, with the gates opened and
 * the confound named.
 */

describe("the figured stone, authored", () => {
  /**
   * A floor whose sixth and eleventh tiles are lies — the composition the
   * scatter cannot express, since it places at most two tiles per rung at
   * random and never on purpose.
   */
  const LIE: Chunk = {
    id: "test-lie",
    requires: [],
    demand: 1,
    entry: "ground",
    exit: "ground",
    rows: [
      ...Array.from({ length: CHUNK_H - 2 }, () => ".".repeat(CHUNK_W)),
      "#####m####m#####",
      "################",
    ],
  };
  const chain = [START_CHUNK, LIE, END_CHUNK];
  /** Where the authored stones land in the painted grid. */
  const at = [
    { x: CHUNK_W + 5, y: CHUNK_H - 2 },
    { x: CHUNK_W + 10, y: CHUNK_H - 2 },
  ];

  it("writes a figured stone exactly where the screen asks for one", () => {
    const world = paintChunks(chain, 1, 2);
    for (const p of at) expect(tileAt(world, p.x, p.y)).toBe(Tile.Maskit);
  });

  /**
   * **The budget is the rung's, and the authored ones come out of it first.**
   * A Sefirah that wants no untrustworthy ground gets none, however many
   * screens it lays that were drawn with some — which is what stops the two
   * ways of laying one from double-counting.
   */
  it("draws an authored stone from the rung's own budget, in reading order", () => {
    expect(tileAt(paintChunks(chain, 1, 0), at[0].x, at[0].y)).toBe(Tile.Stone);
    // One in the budget: the first is a lie, the second is stone.
    const one = paintChunks(chain, 1, 1);
    expect(tileAt(one, at[0].x, at[0].y)).toBe(Tile.Maskit);
    expect(tileAt(one, at[1].x, at[1].y)).toBe(Tile.Stone);
  });

  /**
   * **And no budget can move where a body may walk.**
   *
   * This is the property the whole thing rests on. An authored stone over
   * budget is written as ordinary hewn stone rather than dropped, and `isSolid`
   * cannot tell the two apart — so the grid a route is proved against is the
   * same grid at every setting of `region.maskit`, and the no-soft-lock
   * guarantee taken over the painted world in `route.test.ts` cannot be
   * invalidated by a number in a region table.
   */
  it("changes no tile but its own, and no route at all", () => {
    const none = paintChunks(chain, 1, 0);
    const some = paintChunks(chain, 1, 2);
    const differ: string[] = [];
    for (let i = 0; i < none.tiles.length; i += 1) {
      if (none.tiles[i] !== some.tiles[i]) differ.push(`${i % none.width},${Math.floor(i / none.width)}`);
    }
    expect(differ).toEqual(at.map((p) => `${p.x},${p.y}`));
    expect(routeTo(none, []).usable).toBe(true);
    expect(routeTo(some, []).usable).toBe(true);
  });

  /**
   * And it costs a runner the thing a runner is trying to save: the floor is
   * not there, and getting back up onto it is a jump that was not planned.
   *
   * This is also the proof that `TAKES_SOMETHING` can ever be non-empty — the
   * bucket is not empty because the instrument cannot see a price, it is empty
   * because no screen has one yet.
   */
  it("gives way under a body that will not slow down", () => {
    const world = paintChunks(chain, 1, 2);
    world.husks = [];
    world.klipot = [];
    const r = hurried(world, { verbs: [], graces: [] }, 4000);
    expect(r.sprung).toBeGreaterThan(0);
    // Ground, never lamps: it is still crossed, and nothing was veiled.
    expect(r.crossed).toBe(true);
    expect(r.veilings).toBe(0);
  });
});

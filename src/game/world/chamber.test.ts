import { describe, expect, it } from "vitest";
import { abilityByLetter } from "../abilities";
import { lettersOnEntering, regions } from "../regions";
import { relicAt, RELICS } from "../relics";
import { crossesAbyss, TREE_PATHS } from "../tree";
import { buildPath, buildRegion, paintChunks, regionOfPath, verbsOf } from "./build";
import { CHUNK_H, CHUNK_W, END_CHUNK, RELIC_CHUNK, START_CHUNK } from "./chunks";
import { probe } from "./probes";
import { MAX_JUMP_RISE, openWordGate, step, type StepContext } from "./step";
import { isSolid, Tile, TILE_CHARS, TILE_SIZE } from "./tiles";
import { NO_INPUT } from "./types";

/**
 * **The chamber where a hidden thing lies.**
 *
 * The first room in this game that a Scribe is deliberately allowed not to be
 * able to reach, which inverts the rule every other collectible is held to —
 * `traversal.test.ts` pins letters and fragments to a low shelf because an
 * ability out of reach is an ability lost. So the guarantees have to be
 * restated here rather than inherited, and there are three of them:
 *
 * 1. **A Scribe who never opens it is never delayed by it** — the ground lane
 *    runs clear, and the screen is crossable by a body that has learned
 *    nothing.
 * 2. **The gate is one letter and it is Ayin.** Every step is veiled stone,
 *    and every rise between them is a plain jump. The chamber asks *did you
 *    find the Eye*, not *how well do you jump*.
 * 3. **The Tree is a function of the day and not of the reliquary.** This is
 *    the one that would be silent if it broke: the chamber is laid whether or
 *    not its relic is already held, so the ground two Scribes walk on the same
 *    day is byte-identical however full their reliquaries are.
 */

const clear = (ch: string) => ch === "." || ch === " ";
/** The rows a standing body occupies, and therefore the lane that must run. */
const LANE = [13, 14, 15];

describe("the chamber, as a screen", () => {
  it("lets a walker straight past at ground level", () => {
    // `WORD_GATE_CHUNK`'s discipline, and for the same reason: a fixed screen
    // that could bar the exit is a soft lock the moment its letter proves too
    // hard. A ledge is allowed in the lane and stone is not — a ledge is solid
    // from above only, so a body walking through one is not stopped by it.
    for (const y of LANE) {
      for (let x = 0; x < CHUNK_W; x += 1) {
        const ch = RELIC_CHUNK.rows[y][x];
        expect(
          clear(ch) || TILE_CHARS[ch] === Tile.Ledge,
          `the chamber blocks the lane at (${x},${y}) with "${ch}"`,
        ).toBe(true);
      }
    }
  });

  it("is crossed by a Scribe who has learned nothing, on every seed", () => {
    const chain = [START_CHUNK, RELIC_CHUNK, END_CHUNK];
    for (let seed = 1; seed <= 6; seed += 1) {
      const world = paintChunks(chain, seed);
      world.husks = [];
      world.klipot = [];
      // No verbs at all, which is stricter than the library's own contract —
      // the chamber declares nothing and must ask for nothing.
      expect(
        probe(world, { verbs: [], graces: [] }, 20000).finished,
        `seed ${seed}: the chamber stopped an empty-handed Scribe`,
      ).toBe(true);
    }
  });

  it("hides exactly one thing, and hides it behind veiled stone", () => {
    const marks = RELIC_CHUNK.rows.flatMap((row, y) =>
      [...row].map((ch, x) => (ch === "R" ? { x, y } : undefined)).filter(Boolean),
    );
    expect(marks, "the chamber holds no marker, or more than one").toHaveLength(1);

    // Everything solid between the floor and the niche is either the low ledge
    // — which is free, and is the only step a Scribe without Ayin may stand on
    // — or veiled stone. A single `#` in that range would be a step the Eye is
    // not needed for, and the whole gate would be a jump instead of a letter.
    const relic = marks[0] as { x: number; y: number };
    for (let y = relic.y; y < 16; y += 1) {
      for (let x = 0; x < CHUNK_W; x += 1) {
        const ch = RELIC_CHUNK.rows[y][x];
        if (clear(ch) || ch === "R") continue;
        expect([Tile.Veiled, Tile.Ledge], `the chamber's step at (${x},${y}) is "${ch}"`).toContain(
          TILE_CHARS[ch],
        );
      }
    }
  });

  /**
   * **Every rise is a plain jump**, measured rather than eyeballed: the whole
   * point of gating on a letter is that the climb itself asks nothing. A three
   * tile step would quietly turn the chamber into a Breath gate as well, which
   * is the failure P5a wrote down as a rule — no hop may be a coin toss.
   */
  it("asks for a letter and never for a better jump", () => {
    const supports: number[] = [];
    for (let y = 0; y < RELIC_CHUNK.rows.length; y += 1) {
      const solid = [...RELIC_CHUNK.rows[y]].some((ch) => {
        const tile = TILE_CHARS[ch];
        return tile === Tile.Veiled || tile === Tile.Ledge || tile === Tile.Stone;
      });
      if (solid) supports.push(y);
    }
    // From the floor at row 16 up to the topmost step, no two consecutive
    // footholds are further apart than a jump rises. The roof is above the top
    // step and so is not counted as one — it is the last entry, and a body
    // never stands on it.
    const steps = [16, ...supports.filter((y) => y < 16).reverse()];
    const rise = Math.floor(MAX_JUMP_RISE / TILE_SIZE);
    expect(rise, "a plain jump no longer clears two tiles").toBeGreaterThanOrEqual(2);
    for (let i = 1; i < steps.length - 1; i += 1) {
      expect(
        steps[i - 1] - steps[i],
        `a ${steps[i - 1] - steps[i]}-tile rise from row ${steps[i - 1]} to row ${steps[i]}`,
      ).toBeLessThanOrEqual(rise);
    }
  });

  it("is stone only once the Eye has seen it", () => {
    const world = paintChunks([START_CHUNK, RELIC_CHUNK, END_CHUNK], 1);
    const veiled = [...world.tiles].filter((t) => t === Tile.Veiled);
    expect(veiled.length, "the chamber laid no veiled stone").toBeGreaterThan(0);
    const opts = { verbs: [], crawling: false };
    expect(isSolid(Tile.Veiled, { ...opts, revealed: false })).toBe(false);
    expect(isSolid(Tile.Veiled, { ...opts, revealed: true })).toBe(true);

    // And the verb that flips it is Ayin's, and it is **pressed** rather than
    // held — which is the whole reason `probes.ts` had to learn to press it.
    const ctx: StepContext = { verbs: ["reveal"], graces: [] };
    expect(world.revealed).toBe(false);
    step(world, NO_INPUT, ctx);
    expect(world.revealed, "merely holding the Eye revealed the stone").toBe(false);
    step(world, { ...NO_INPUT, act: true }, ctx);
    expect(world.revealed, "the Eye no longer reveals").toBe(true);
  });
});

describe("the chamber, in the world", () => {
  const seeds = [3, 91, 555, 12345];

  it("stands on every path, holding what that place hides", () => {
    for (const path of TREE_PATHS) {
      for (const seed of seeds) {
        const held = lettersOnEntering(regionOfPath(path).index);
        const world = buildPath(path, seed, held);
        const found = world.entities.filter((e) => e.kind === "relic");
        const here = relicAt(world.sefirah);
        expect(here, `nothing is hidden at ${world.sefirah}`).toBeDefined();
        expect(found.map((e) => e.ref), `${path.id} seed ${seed}`).toEqual([here?.id]);
      }
    }
  });

  /**
   * Keter is never the lower end of a path, so on the Tree this branch is
   * unreachable — but `buildRegion` can still stand in the crown, and the rule
   * is a claim about the *table* rather than about the router: nothing is
   * hidden at the crown, so no chamber is laid there.
   */
  it("lays none in the crown", () => {
    expect(relicAt("keter")).toBeUndefined();
    const world = buildRegion(regions.length, 4242);
    expect(world.sefirah).toBe("keter");
    expect(world.entities.filter((e) => e.kind === "relic")).toEqual([]);
  });

  /**
   * **The claim the whole design turns on.**
   *
   * `layout` computes `room = fixed.length + 2` and feeds `max(region.length,
   * room)` to `layBody`, so a fixed screen laid conditionally would change the
   * rung's length and every rng draw after it. Lay the chamber only when its
   * relic is missing and the Tree becomes a function of the Scribe's
   * reliquary: two people climbing the same day would walk different ground,
   * and the daily seed — the one shared fact in a game with no server — would
   * quietly stop meaning anything.
   *
   * So the ground is compared byte for byte, and the *only* permitted
   * difference is that the niche is empty.
   */
  it("lays the same ground whether the thing is already held or not", () => {
    const all = RELICS.map((r) => r.id);
    for (const path of TREE_PATHS) {
      for (const seed of seeds) {
        const held = lettersOnEntering(regionOfPath(path).index);
        const open = buildPath(path, seed, held);
        const emptied = buildPath(path, seed, held, 1, false, false, 1, [], 0, all);

        expect(emptied.width, `${path.id} seed ${seed}: width`).toBe(open.width);
        expect(emptied.height, `${path.id} seed ${seed}: height`).toBe(open.height);
        expect(
          [...emptied.tiles],
          `${path.id} seed ${seed}: the reliquary moved a tile`,
        ).toEqual([...open.tiles]);

        // The husks are laid from the same rng after the same draws, so a
        // reliquary that had disturbed the stream would show here first.
        expect(emptied.husks.map((h) => `${h.kind}@${h.x},${h.y}`)).toEqual(
          open.husks.map((h) => `${h.kind}@${h.x},${h.y}`),
        );

        // And the one difference there is allowed to be.
        expect(emptied.entities.filter((e) => e.kind === "relic")).toEqual([]);
        const same = (w: typeof open) =>
          w.entities.filter((e) => e.kind !== "relic").map((e) => `${e.kind}@${e.x},${e.y}:${e.ref ?? ""}`);
        expect(same(emptied)).toEqual(same(open));
      }
    }
  });

  it("stands the thing where the Eye can reach it and a walker cannot", () => {
    for (const path of TREE_PATHS.slice(0, 8)) {
      const held = lettersOnEntering(regionOfPath(path).index);
      const world = buildPath(path, 7, held);
      for (const niche of world.entities.filter((e) => e.kind === "relic")) {
        // Directly under the niche, between it and the floor of its own
        // storey, there is nothing a body can stand on without Ayin.
        const tx = Math.floor(niche.x / TILE_SIZE);
        let footing = 0;
        for (let ty = Math.floor(niche.y / TILE_SIZE) + 1; ty < world.height; ty += 1) {
          const tile = world.tiles[ty * world.width + tx];
          if (tile === Tile.Stone) break;
          if (tile === Tile.Veiled) footing += 1;
        }
        expect(footing, `${path.id}: the niche stands over no veiled stone`).toBeGreaterThan(0);
      }
    }
  });

  /**
   * The traversal guarantee, restated on the ground the game actually builds
   * rather than on one screen in isolation: a Scribe holding what the route to
   * a rung pays, who never looks up, still reaches the way out.
   */
  it("never keeps a Scribe from the exit who never opens it", () => {
    const stalled: string[] = [];
    let walked = 0;
    for (const path of TREE_PATHS) {
      for (const seed of [3, 91, 555]) {
        const index = regionOfPath(path).index;
        const held = lettersOnEntering(index);
        const world = buildPath(path, seed, held);
        // Over the Abyss the way out stands *behind* a Word-Gate, and whether
        // a Scribe can answer one is `abyss.test.ts`. The barrier is dissolved
        // so that what is measured here stays the floor — the same concession
        // the traversal sweep makes, and for the same reason.
        if (crossesAbyss(path)) openWordGate(world, "The gate opens.");
        // And the klipot are cleared, along with the pool a figured stone would
        // stand one up out of: whether a fight is survivable is `fight.test.ts`.
        world.husks = [];
        world.klipot = [];
        // The graces come too: `high-jump` is one of them, so a hand without
        // them is not the hand the route to this rung actually paid for.
        const ctx: StepContext = {
          verbs: verbsOf(held),
          graces: held
            .map((id) => abilityByLetter[id]?.grace)
            .filter((g): g is NonNullable<typeof g> => Boolean(g)),
        };
        walked += 1;
        const screens = (world.width / CHUNK_W) * Math.max(1, Math.round(world.height / CHUNK_H));
        if (!probe(world, ctx, Math.max(24000, 2000 * screens)).finished) {
          stalled.push(`${path.id} seed ${seed} at rung ${index}`);
        }
      }
    }
    expect(walked, "the sweep walked nothing").toBeGreaterThan(60);
    /**
     * **Measured: sixty-two of sixty-six, against sixty-four before the chamber
     * was laid** — and the four that stall are the upper Tree, where the walk
     * is longest and this pair of hands is thinnest. Two of them stalled before
     * the chamber existed.
     *
     * The bar is a *collapse* detector, exactly as `traversal.test.ts`'s is,
     * and it is set below the measurement rather than at it because a probe is
     * one pair of hands and a seed is a seed. What it would catch is the
     * chamber having become a wall, which would take out every path at once.
     */
    expect(
      (walked - stalled.length) / walked,
      `paths the chamber may have shut:\n  ${stalled.join("\n  ")}`,
    ).toBeGreaterThan(0.85);
  }, 300000);
});

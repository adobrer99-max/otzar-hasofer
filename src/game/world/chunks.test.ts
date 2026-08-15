import { describe, expect, it } from "vitest";
import {
  ARENA_A,
  ARENA_B,
  CHUNK_H,
  CHUNK_W,
  CHUNKS,
  chunksById,
  EDGE_CLEAR_ROWS,
  EDGE_COLUMNS,
  EDGE_FLOOR_ROWS,
  END_CHUNK,
  BOTH_CLEAR_ROWS,
  BOTH_FLOOR_ROWS,
  HIGH_CLEAR_ROWS,
  HIGH_FLOOR_ROWS,
  HIGH_VOID_ROWS,
  HOUSE_CHUNK,
  LETTER_CHUNK,
  SHRINE_HIGH,
  SHRINE_LOW,
  START_CHUNK,
} from "./chunks";
import { HUSKS, HUSK_CHARS, type HuskKind } from "../combat";
import { guardianOf } from "../guardians";
import { regions } from "../regions";
import { ARENA_ROOMS, paintChunks } from "./build";
import { routeTo } from "./route";
import { MARKER_CHARS, TILE_CHARS } from "./tiles";
import type { Chunk, Edge } from "./types";

const ALL: Chunk[] = Object.values(chunksById);
const LEFT = EDGE_COLUMNS.filter((x) => x < CHUNK_W / 2);
const RIGHT = EDGE_COLUMNS.filter((x) => x >= CHUNK_W / 2);
const clear = (ch: string) => ch === "." || ch === " ";

/**
 * The chunk library is level design expressed as text, which means a
 * miscounted row is a hole in the floor rather than a type error. These are
 * the checks that make the connection contract in `chunks.ts` real: a chunk
 * that violates any of them can never reach a player.
 */
describe("the chunk library", () => {
  /**
   * **No screen may be crossed under an open sky.**
   *
   * A body is thirty pixels tall in a twenty-four pixel tile, so standing on a
   * surface always occupies the two rows above it: to stand on something that
   * tops out at row one is to have your head in row *minus one*. On the topmost
   * storey of a rung that row is open sky and the crossing works. On any other
   * storey it is the floor of the storey above, and the same screen becomes a
   * wall with no way past — with the whole of the storey behind it cut off.
   *
   * Measured, on `sheer-face`: with two rows of rooms it made the lower storey
   * of a rung unreachable on every seed. The cure was one row of wall, and this
   * is the general form of it — anything solid in row one must be roofed, so
   * that nobody is ever invited to climb onto it.
   */
  it("never asks a body to stand where the sky would have to hold it", () => {
    for (const c of ALL) {
      for (let x = 0; x < CHUNK_W; x += 1) {
        if (clear(c.rows[1][x])) continue;
        expect(
          clear(c.rows[0][x]),
          `${c.id} column ${x}: stone at row 1 with room to stand on it at row 0, ` +
            `which only exists on the topmost storey of a floor`,
        ).toBe(false);
      }
    }
  });

  it("holds every chunk to the same dimensions", () => {
    for (const c of ALL) {
      expect(c.rows, `${c.id} row count`).toHaveLength(CHUNK_H);
      c.rows.forEach((row, y) => {
        expect(row.length, `${c.id} row ${y}: "${row}"`).toBe(CHUNK_W);
      });
    }
  });

  it("uses only known tile and marker characters", () => {
    for (const c of ALL) {
      for (const row of c.rows) {
        for (const ch of row) {
          const known = ch in TILE_CHARS || MARKER_CHARS.has(ch) || ch in HUSK_CHARS;
          expect(known, `${c.id} uses unknown character "${ch}"`).toBe(true);
        }
      }
    }
  });

  /**
   * **The figured stone, authored.**
   *
   * `layMaskit` keeps four rules when it scatters one, and every one of them
   * is load-bearing rather than cautious — they are what let a trap exist at
   * all beside a no-soft-lock guarantee proved on the painted grid. A screen
   * that writes its own `m` has to keep the same four, and it is checked here
   * rather than at paint time because a chunk is a fixed text: a rule kept by
   * the author is kept on every rung and every seed at once, and a rule kept
   * by the painter is only ever kept where somebody thought to look.
   *
   * Mirroring is safe by construction and is worth saying: a screen may be
   * laid back to front, which maps column `x` to `CHUNK_W - 1 - x`. All four
   * rules below are symmetric under that — the seam bands are the same at both
   * ends, and air-above, solid-below and side-by-side all travel with the
   * tile.
   */
  it("keeps an authored figured stone to the same four rules the scatter keeps", () => {
    // What paints as empty: air, and everything that is lifted out of the grid
    // into an entity or a body before the tile is written.
    const air = (ch: string | undefined) =>
      ch !== undefined && (clear(ch) || MARKER_CHARS.has(ch) || ch in HUSK_CHARS);
    for (const c of ALL) {
      for (let y = 0; y < CHUNK_H; y += 1) {
        for (let x = 0; x < CHUNK_W; x += 1) {
          if (c.rows[y][x] !== "m") continue;
          const where = `${c.id} (${x},${y})`;
          // Never on a seam. Two screens meet at every `CHUNK_W`, and a lie
          // laid at the join is a lie sprung at the exact moment a body is
          // crossing from one authored screen into the next.
          expect(x >= 2 && x <= CHUNK_W - 3, `${where}: a figured stone on the seam`).toBe(true);
          // Never two side by side: a pair is a two-tile hole, which is a pit
          // rather than a stumble and is the one shape a single step down does
          // not climb back out of.
          expect(c.rows[y][x + 1] === "m", `${where}: two figured stones side by side`).toBe(false);
          // Walked on, or it is a wall with a secret. Air above.
          expect(air(c.rows[y - 1]?.[x]), `${where}: nothing can stand on it`).toBe(true);
          // **And nothing at all about what is underneath.** A lie over hewn
          // stone is a stumble and a lie over a void is a fall, and the fall is
          // the whole point — see `layMaskit`. What keeps the second safe is
          // that the tile mends to hewn stone, and that `route.test.ts` floods
          // every rung with all of its lies removed at once. Geometry was a
          // proxy for that and the property is asserted directly now.
          //
          // The one thing still forbidden is a lie in the **last row**, because
          // the row beneath it belongs to the storey below rather than to this
          // screen, so what a body falls into is not a thing this screen can be
          // read to know.
          expect(y, `${where}: a figured stone in the bottom row`).toBeLessThan(CHUNK_H - 1);
        }
      }
    }
  });

  /**
   * Both profiles, on both sides. This is what lets any chunk follow any other
   * whose exit matches its entry — and the `high` void is the load-bearing
   * part: a high edge with a floor under it would let a fallen Scribe land
   * somewhere the next screen cannot be crossed from, which is a soft-lock. No
   * floor means a fall veils instead, and a veiling is always recoverable.
   */
  const holdsProfile = (c: Chunk, cols: number[], edge: Edge, side: string) => {
    if (edge === "ground") {
      for (const y of EDGE_CLEAR_ROWS) {
        for (const x of cols) {
          expect(clear(c.rows[y][x]), `${c.id} ${side}: needs headroom at (${x},${y})`).toBe(true);
        }
      }
      for (const y of EDGE_FLOOR_ROWS) {
        for (const x of cols) {
          expect(c.rows[y][x], `${c.id} ${side}: needs floor at (${x},${y})`).toBe("#");
        }
      }
      return;
    }
    if (edge === "both") {
      // A branch: the upper road and the lower road, side by side, both
      // walkable at this seam.
      for (const y of BOTH_CLEAR_ROWS) {
        for (const x of cols) {
          expect(clear(c.rows[y][x]), `${c.id} ${side}: needs headroom at (${x},${y})`).toBe(true);
        }
      }
      for (const y of BOTH_FLOOR_ROWS) {
        for (const x of cols) {
          expect(c.rows[y][x], `${c.id} ${side}: needs a road at (${x},${y})`).toBe("#");
        }
      }
      return;
    }
    for (const y of HIGH_CLEAR_ROWS) {
      for (const x of cols) {
        expect(clear(c.rows[y][x]), `${c.id} ${side}: needs headroom at (${x},${y})`).toBe(true);
      }
    }
    for (const y of HIGH_FLOOR_ROWS) {
      for (const x of cols) {
        expect(c.rows[y][x], `${c.id} ${side}: needs a ledge at (${x},${y})`).toBe("#");
      }
    }
    for (const y of HIGH_VOID_ROWS) {
      for (const x of cols) {
        expect(clear(c.rows[y][x]), `${c.id} ${side}: needs nothing at (${x},${y})`).toBe(true);
      }
    }
  };

  it("keeps both edges to their declared profile, so chunks chain", () => {
    for (const c of ALL) {
      holdsProfile(c, LEFT, c.entry, "entry");
      holdsProfile(c, RIGHT, c.exit, "exit");
    }
  });

  it("gives the fixed chunks exactly the marker each exists for", () => {
    const markerCount = (c: Chunk, marker: string) =>
      c.rows.join("").split("").filter((ch) => ch === marker).length;

    expect(markerCount(START_CHUNK, "S")).toBe(1);
    expect(markerCount(END_CHUNK, "E")).toBe(1);
    expect(markerCount(SHRINE_LOW, "T")).toBe(1);
    expect(markerCount(SHRINE_HIGH, "T")).toBe(1);
    expect(markerCount(LETTER_CHUNK, "L")).toBe(1);
    expect(markerCount(HOUSE_CHUNK, "H")).toBe(1);
  });

  it("keeps every fixed chunk on the ground, since that is where they are slotted", () => {
    for (const c of [START_CHUNK, END_CHUNK, SHRINE_LOW, SHRINE_HIGH, LETTER_CHUNK, HOUSE_CHUNK]) {
      expect(c.entry, `${c.id} entry`).toBe("ground");
      expect(c.exit, `${c.id} exit`).toBe("ground");
    }
  });

  it("keeps markers out of the body chunks, which the seed places freely", () => {
    for (const c of CHUNKS) {
      for (const row of c.rows) {
        for (const ch of row) {
          // `*` is a mote and `Y` is a fork: both are structural to the screen
          // itself rather than something the seed places into it. The klipot
          // are not markers at all — they become bodies.
          const structural = ch === "*" || ch === "Y" || !MARKER_CHARS.has(ch);
          expect(structural, `${c.id} may not carry the marker "${ch}"`).toBe(true);
        }
      }
    }
  });

  it("offers enough unlocked chunks to build a region before any letter is held", () => {
    const free = CHUNKS.filter((c) => c.requires.length === 0);
    expect(free.length).toBeGreaterThanOrEqual(4);
  });

  /**
   * The guarantee that a high stretch is an excursion and not a trap. Without
   * a letterless way up there would be regions that can never go high; without
   * a letterless way down there would be a Scribe standing on a ledge with the
   * exit four tiles below and no road to it.
   */
  it("keeps a letterless way up to the high road, and a letterless way down", () => {
    const up = CHUNKS.filter((c) => c.entry === "ground" && c.exit === "high" && c.requires.length === 0);
    const down = CHUNKS.filter((c) => c.entry === "high" && c.exit === "ground" && c.requires.length === 0);
    expect(up.length, "no letterless way up").toBeGreaterThan(0);
    expect(down.length, "no letterless way down").toBeGreaterThan(0);
  });

  /**
   * A branch must be able to open, run and close without any letter at all —
   * otherwise a region could fork and then find nothing to close the fork
   * with, and the two roads would run off the end of the world.
   */
  it("keeps a letterless way to divide the road, to run it, and to rejoin", () => {
    const free = CHUNKS.filter((c) => c.requires.length === 0);
    expect(
      free.filter((c) => c.entry === "ground" && c.exit === "both").length,
      "no letterless fork",
    ).toBeGreaterThan(0);
    expect(
      free.filter((c) => c.entry === "both" && c.exit === "both").length,
      "no letterless branch to run",
    ).toBeGreaterThan(0);
    expect(
      free.filter((c) => c.entry === "both" && c.exit === "ground").length,
      "no letterless merge",
    ).toBeGreaterThan(0);
  });

  /** The fork sigil is what Resh returns to, so a fork must carry exactly one. */
  it("marks the fork on every screen where the road divides", () => {
    for (const c of CHUNKS.filter((x) => x.entry !== "both" && x.exit === "both")) {
      const forks = c.rows.join("").split("").filter((ch) => ch === "Y").length;
      expect(forks, `${c.id} divides the road and does not mark where`).toBe(1);
    }
  });

  it("names only real verbs in `requires`", () => {
    const verbs = new Set([
      "double-jump",
      "wall-cling",
      "dash",
      "grapple",
      "swim",
      "cut",
      "reveal",
      "block",
      "flame",
      "climb",
      "mark",
      "open",
    ]);
    for (const c of CHUNKS) {
      for (const verb of c.requires) {
        expect(verbs.has(verb), `${c.id} requires unknown verb "${verb}"`).toBe(true);
      }
    }
  });

  /**
   * The check that would have caught the original problem. Two screens in the
   * library — sixteen columns of flat floor, and three ledges hanging over an
   * unbroken road — obstructed a walker in no way at all, and between them
   * they were a third of everything Malchut could draw.
   */
  it("gives every screen something to ask", () => {
    for (const c of CHUNKS) {
      // Something standing in the lane the body walks along, or anything in
      // the floor beneath it that is not plain stone — a hole to be jumped,
      // water to be swum, a ledge to be dropped through.
      const lane = c.entry === "ground" ? [13, 14, 15] : [7, 8, 9];
      const floor = c.entry === "ground" ? 16 : 10;
      const inLane = lane.some((y) =>
        c.rows[y]
          .slice(2, CHUNK_W - 2)
          .split("")
          // A husk standing in the lane is something the screen asks, but it
          // is not terrain — a screen must obstruct on its own account.
          .some((ch) => !clear(ch) && !(ch in HUSK_CHARS)),
      );
      const underfoot = c.rows[floor].split("").some((ch) => ch !== "#");
      expect(
        inLane || underfoot,
        `${c.id} does not obstruct a walker — it is scenery`,
      ).toBe(true);
    }
  });

  it("declares a demand on every screen, and never calls a two-letter screen easy", () => {
    for (const c of ALL) {
      expect([1, 2, 3], `${c.id} demand`).toContain(c.demand);
    }
    for (const c of CHUNKS) {
      if (c.requires.length > 1) {
        // Two letters may be *alternatives* — `two-answers` is a ring over a
        // gap the Bridge would also cross, and is laid only once both are held
        // so that the choice exists at all. What no such screen may be is a
        // walk.
        expect(c.demand, `${c.id} asks two letters and calls itself a walk`).toBeGreaterThan(1);
      }
    }
    // And the library must actually span the range, or the bands do nothing.
    for (const demand of [1, 2, 3]) {
      expect(
        CHUNKS.filter((c) => c.demand === demand).length,
        `nothing in the library is demand ${demand}`,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  /**
   * **Every screen is crossable holding exactly what it declares — no more.**
   *
   * For as long as the climb was a line this could not be asked, because it was
   * never true and never needed to be. `lettersOnEntering` made the letters a
   * function of how far up the Tree you were, so a screen laid in Gevurah was
   * met by a Scribe holding everything Malchut through Hod pays out, and a
   * screen that quietly leaned on a letter it had not declared was indented
   * from a hundred directions and load-bearing from none.
   *
   * The Tree ends that. Twenty-two paths taken in any order hand the generator
   * letter sets the linear climb never produced — the Bridge without the
   * Breath, the Eye before the Fence — and it lays screens by what they say
   * they need. A screen that needs more than it says is then a soft lock, which
   * is the one bug this game has decided it will not ship.
   *
   * Asked of every screen the library can lay, in the chain it belongs to, over
   * four seeds. It found fourteen when it was first run, and three of those were
   * real: `wide-chasm`, `sealed-deep` and `stone-chain` all wanted the Breath
   * and none of them said so. **The other eleven were this test's own
   * instrument** — a route graph that could not swim, could not cast the Hook,
   * could not set a stone with Bet, and did not think a Scribe could stand on
   * stone the Eye had revealed. That is written up at the head of `route.ts`,
   * and it is the reason this assertion is worth its runtime: a screen and the
   * thing that measures it can be wrong in the same direction for years.
   */
  it("is crossable holding exactly what each screen declares", () => {
    const up = chunksById["rise-to-high"];
    const down = chunksById["fall-to-ground"];
    expect(up, "the library lost its way up").toBeDefined();
    expect(down, "the library lost its way down").toBeDefined();

    const wanting: string[] = [];
    for (const chunk of CHUNKS) {
      // A screen is only ever laid between a start and an end, and one that
      // begins or ends on the high road needs the lift that gets it there. The
      // branching `both` screens are laid in pairs and are covered by the pair.
      const chain =
        chunk.entry === "ground" && chunk.exit === "ground" ? [START_CHUNK, chunk, END_CHUNK]
        : chunk.entry === "high" && chunk.exit === "high" ? [START_CHUNK, up, chunk, down, END_CHUNK]
        : chunk.entry === "ground" && chunk.exit === "high" ? [START_CHUNK, chunk, down, END_CHUNK]
        : chunk.entry === "high" && chunk.exit === "ground" ? [START_CHUNK, up, chunk, END_CHUNK]
        : undefined;
      if (!chain) continue;
      const crossable = [1, 2, 3, 4].some(
        (seed) => routeTo(paintChunks(chain, seed), chunk.requires).usable,
      );
      if (!crossable) wanting.push(`${chunk.id} declares [${chunk.requires.join(", ") || "-"}]`);
    }
    expect(
      wanting,
      `screens that need more than they declare, which is a soft lock on the Tree:\n  ${wanting.join("\n  ")}`,
    ).toEqual([]);
  });
});

/**
 * **The arenas, which nothing was checking.**
 *
 * `chunksById` holds the screens `layout` draws from, and the guardians' rooms
 * are deliberately not among them — an arena is named by `buildArena`, never
 * dealt. The cost of that was that the whole contract above simply did not
 * apply to them: a miscounted row in a boss room was a hole in the floor of a
 * sealed room, and the only thing that would have caught it was the duel probe
 * failing for a reason it could not explain.
 *
 * So the arenas are held to the parts of the contract that are true of them,
 * and to the one rule that is *only* true of them — the walking band.
 */
describe("the guardians' rooms", () => {
  const pairs = Object.entries(ARENA_ROOMS) as [HuskKind, readonly [Chunk, Chunk]][];
  const rooms: Chunk[] = [ARENA_A, ARENA_B, ...pairs.flatMap(([, pair]) => [...pair])];

  it("holds every room to the same dimensions and the same vocabulary", () => {
    for (const c of rooms) {
      expect(c.rows, `${c.id} row count`).toHaveLength(CHUNK_H);
      c.rows.forEach((row, y) => {
        expect(row.length, `${c.id} row ${y}: "${row}"`).toBe(CHUNK_W);
        for (const ch of row) {
          const known = ch in TILE_CHARS || MARKER_CHARS.has(ch) || ch in HUSK_CHARS;
          expect(known, `${c.id} uses unknown character "${ch}"`).toBe(true);
        }
      });
    }
  });

  it("never asks a body to stand where the sky would have to hold it", () => {
    for (const c of rooms) {
      for (let x = 0; x < CHUNK_W; x += 1) {
        if (clear(c.rows[1][x])) continue;
        expect(clear(c.rows[0][x]), `${c.id} column ${x} is stone at row 1 under open air`).toBe(false);
      }
    }
  });

  /**
   * **The walking band.** Rows thirteen to fifteen are where a standing body
   * and a thrown letter both live, so stone there is a hurdle to a Scribe *and*
   * a wall to a mark — and a wall to a mark in a room that is sealed until the
   * thing in it breaks is a room nobody leaves. Ledge and water are fine: a
   * ledge stops only a falling body, and water stops nothing at all.
   *
   * Netzach is the exception, and it is the exception on purpose: the Re'em's
   * charge tests the tile at its own mid-height, so the two stones it runs into
   * have to be in this band or they are decoration. It is named here rather
   * than waved through, so a second exception cannot arrive quietly.
   */
  it("keeps stone out of the walking band, except where the Re'em runs into it", () => {
    for (const c of rooms) {
      if (c.id === "arena-pillar") continue;
      for (const y of [13, 14, 15]) {
        for (let x = 0; x < CHUNK_W; x += 1) {
          const ch = c.rows[y][x];
          expect(
            ch === "." || ch === "=" || ch === "w",
            `${c.id} has "${ch}" at (${x},${y}), in the band a walk and a mark both cross`,
          ).toBe(true);
        }
      }
    }
  });

  /**
   * The pair is laid between two plain rooms, so the outer edges are what has
   * to chain. The seam between the two halves is theirs to do as they like with
   * — which is how Leviathan's channel and the Tannin's pool exist at all.
   */
  it("meets the plain rooms it is laid between", () => {
    for (const [kind, [first, second]] of pairs) {
      for (const y of EDGE_CLEAR_ROWS) {
        for (const x of LEFT) {
          expect(clear(first.rows[y][x]), `${kind}: nothing enters ${first.id} at (${x},${y})`).toBe(true);
        }
        for (const x of RIGHT) {
          expect(clear(second.rows[y][x]), `${kind}: nothing leaves ${second.id} at (${x},${y})`).toBe(true);
        }
      }
      for (const y of EDGE_FLOOR_ROWS) {
        for (const x of LEFT) {
          expect(first.rows[y][x], `${kind}: no floor into ${first.id} at (${x},${y})`).toBe("#");
        }
        for (const x of RIGHT) {
          expect(second.rows[y][x], `${kind}: no floor out of ${second.id} at (${x},${y})`).toBe("#");
        }
      }
    }
  });

  /**
   * **Water is a letter lock whether or not the map says so.** `touchTiles`
   * veils any Scribe standing in water without Mem — *the deep will not carry
   * you yet* — so a wet tile on the ground of a sealed room is a wall between
   * that Scribe and the way out. Binah may have it, because Binah is the one
   * rung that declares a letter for its water and whose channel was measured
   * jumpable without Mem. Chesed had a pool for exactly as long as it took to
   * measure this, and the comment over `ARENA_TENT_A` is what came of it.
   */
  it("puts water in no room but Leviathan's", () => {
    for (const [kind, pair] of pairs) {
      for (const c of pair) {
        const wet = c.rows.some((row) => row.includes("w"));
        expect(wet && kind !== "livyatan", `${kind}'s room asks for Mem and its rung never says so`).toBe(false);
      }
    }
  });

  it("gives a room only to creatures that guard, and names the plain room's tenant", () => {
    const guardians = new Set(regions.map((r) => guardianOf(r.sefirah).kind));
    for (const [kind] of pairs) {
      expect(guardians.has(kind), `${kind} has an arena and guards nothing`).toBe(true);
      expect(HUSKS[kind], `${kind} is not a klipah`).toBeDefined();
    }
    // Behemoth is the one guardian with no entry, because emptiness is its
    // terrain — see `ARENA_A`. If a second name ever falls out of the table it
    // is far more likely to be an omission than a decision, so the absence is
    // pinned to exactly this one.
    const plain = [...guardians].filter((kind) => !ARENA_ROOMS[kind]);
    expect(plain).toEqual(["behemot"]);
  });
});

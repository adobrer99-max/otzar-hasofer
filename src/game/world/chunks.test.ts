import { describe, expect, it } from "vitest";
import {
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
import { HUSK_CHARS } from "../combat";
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
});

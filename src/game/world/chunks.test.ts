import { describe, expect, it } from "vitest";
import {
  CHUNK_H,
  CHUNK_W,
  CHUNKS,
  chunksById,
  EDGE_CLEAR_ROWS,
  EDGE_FLOOR_ROWS,
  END_CHUNK,
  HOUSE_CHUNK,
  LETTER_CHUNK,
  SHRINE_CHUNK,
  START_CHUNK,
} from "./chunks";
import { MARKER_CHARS, TILE_CHARS } from "./tiles";
import type { Chunk } from "./types";

const ALL: Chunk[] = Object.values(chunksById);

/**
 * The chunk library is level design expressed as text, which means a
 * miscounted row is a hole in the floor rather than a type error. These are
 * the checks that make the connection contract in `chunks.ts` real: a chunk
 * that violates any of them can never reach a player.
 */
describe("the chunk library", () => {
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
          const known = ch in TILE_CHARS || MARKER_CHARS.has(ch);
          expect(known, `${c.id} uses unknown character "${ch}"`).toBe(true);
        }
      }
    }
  });

  it("keeps both edges walkable, so any chunk may follow any other", () => {
    const edgeColumns = [0, 1, CHUNK_W - 2, CHUNK_W - 1];
    for (const c of ALL) {
      for (const x of edgeColumns) {
        for (const y of EDGE_FLOOR_ROWS) {
          expect(c.rows[y][x], `${c.id} needs floor at (${x},${y})`).toBe("#");
        }
        for (const y of EDGE_CLEAR_ROWS) {
          const ch = c.rows[y][x];
          const clear = ch === "." || ch === " ";
          expect(clear, `${c.id} needs headroom at (${x},${y}), found "${ch}"`).toBe(true);
        }
      }
    }
  });

  it("gives the fixed chunks exactly the marker each exists for", () => {
    const markerCount = (c: Chunk, marker: string) =>
      c.rows.join("").split("").filter((ch) => ch === marker).length;

    expect(markerCount(START_CHUNK, "S")).toBe(1);
    expect(markerCount(END_CHUNK, "E")).toBe(1);
    expect(markerCount(SHRINE_CHUNK, "T")).toBe(1);
    expect(markerCount(LETTER_CHUNK, "L")).toBe(1);
    expect(markerCount(HOUSE_CHUNK, "H")).toBe(1);
  });

  it("keeps markers out of the body chunks, which the seed places freely", () => {
    for (const c of CHUNKS) {
      for (const row of c.rows) {
        for (const ch of row) {
          const structural = ch === "*" || !MARKER_CHARS.has(ch);
          expect(structural, `${c.id} may not carry the marker "${ch}"`).toBe(true);
        }
      }
    }
  });

  it("offers enough unlocked chunks to build a region before any letter is held", () => {
    const free = CHUNKS.filter((c) => c.requires.length === 0);
    expect(free.length).toBeGreaterThanOrEqual(4);
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
});

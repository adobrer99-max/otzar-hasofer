import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Tile } from "../world/tiles";
import { TILE_NAMES } from "./probe";

/**
 * **The harness is only as honest as the names it reads the floor with.**
 *
 * `look()` is the sole way a browser driver perceives terrain, and it answers
 * in the words of `TILE_NAMES`. When that table went stale behind two new
 * tiles the failure was silent and total: `Seal` and `Maskit` were reported as
 * `"empty"`, so every script in the tool spent every run believing a closed
 * door was a doorway and a figured stone was a hole in the floor.
 *
 * Nothing counted that, because nothing was counting names — the scripts still
 * finished, the bands still passed, and the numbers were drawn from a driver
 * hallucinating gaps in solid ground. These are the assertions that would have
 * said so on the day the tile was added.
 */
describe("the tile names the harness reads the floor with", () => {
  it("names every tile there is", () => {
    for (const [member, value] of Object.entries(Tile)) {
      expect(TILE_NAMES[value], `Tile.${member} has no name`).toBeTypeOf("string");
    }
  });

  it("gives no two tiles the same name", () => {
    const names = Object.values(TILE_NAMES);
    expect(new Set(names).size).toBe(names.length);
  });

  /**
   * The specific shape of the bug, pinned. A missing entry did not read as
   * absent — it read as *open air*, which is the one answer that makes a
   * driver walk into whatever is actually there.
   */
  it("calls nothing but Empty empty", () => {
    const empties = Object.entries(TILE_NAMES).filter(([, name]) => name === "empty");
    expect(empties).toEqual([[String(Tile.Empty), "empty"]]);
  });
});

/**
 * Tiles that block a body no matter what it holds — `isSolid` returns true for
 * these with any letters, crawling or not, revealed or not.
 *
 * Kept as a literal list rather than derived from `isSolid`, because the point
 * is to notice when the two disagree: a tile added to `isSolid` and to no other
 * table is exactly what happened here.
 */
const ALWAYS_SOLID = [
  Tile.Stone,
  Tile.Placed,
  Tile.Maskit,
  Tile.Growth,
  Tile.Door,
  Tile.Seal,
  Tile.WordGate,
] as const;

describe("the driver in tools/playtest.mjs", () => {
  const source = readFileSync(join(process.cwd(), "tools/playtest.mjs"), "utf8");

  /**
   * Every unconditionally solid tile has to be *named somewhere* in the driver
   * — as floor in `solid`, as a barrier to clear, as a gate to answer. Which of
   * those it is, is the tool's business and changes as the tool learns; that it
   * is known at all is not negotiable.
   *
   * This is deliberately a search of the file rather than a test of `decide`:
   * the tool is an `.mjs` script that opens a browser, and the invariant worth
   * holding is only that no solid tile is a word the driver has never heard.
   */
  it("has heard of every tile that can block a body", () => {
    for (const tile of ALWAYS_SOLID) {
      const name = TILE_NAMES[tile];
      expect(source.includes(`"${name}"`), `the driver never mentions "${name}"`).toBe(true);
    }
  });
});

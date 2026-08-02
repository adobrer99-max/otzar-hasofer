import { describe, expect, it } from "vitest";
import { abilityByLetter } from "./abilities";
import { letters } from "../data/letters";
import { regions } from "./regions";
import {
  lettersFrom,
  letterOfPath,
  nodeOf,
  otherEnd,
  pathBetween,
  pathById,
  pathsFrom,
  reachedBy,
  TREE_NODES,
  TREE_PATHS,
} from "./tree";
import type { SefirahId } from "../types/letter";

/**
 * The Tree, as a graph — and the one thing about it that is not negotiable.
 *
 * Most of what is asserted here is arithmetic: twenty-two paths, each letter
 * on exactly one, every Sefirah joined to the rest. The test that earns its
 * keep is the last one, and it is the reason the letters are laid on the paths
 * by a rule instead of by hand: **the first path a Scribe can walk must ask
 * for nothing they do not already have.** Get that wrong and the game is
 * uncrossable on its first screen, which is exactly what taking the
 * traditional arrangement whole would have done.
 */

const ALL: SefirahId[] = TREE_NODES.map((n) => n.sefirah);

describe("the Tree", () => {
  it("stands the ten in the three pillars", () => {
    expect(TREE_NODES).toHaveLength(10);
    expect(new Set(ALL).size).toBe(10);
    // Every region of the climb is a place on the Tree, and nowhere else is.
    expect([...ALL].sort()).toEqual(regions.map((r) => r.sefirah).sort());
    // The middle pillar reconciles, so it holds the ones that are neither.
    expect(ALL.filter((s) => nodeOf[s].pillar === 0).sort()).toEqual(
      ["keter", "malchut", "tiferet", "yesod"].sort(),
    );
    expect(ALL.filter((s) => nodeOf[s].pillar === 1)).toHaveLength(3);
    expect(ALL.filter((s) => nodeOf[s].pillar === -1)).toHaveLength(3);
    // Malchut is the floor of it and Keter the crown.
    expect(Math.min(...TREE_NODES.map((n) => n.row))).toBe(nodeOf.malchut.row);
    expect(Math.max(...TREE_NODES.map((n) => n.row))).toBe(nodeOf.keter.row);
  });

  /**
   * The received geometry: three across, seven down, twelve between. This is
   * the Sefer Yetzirah's own division of the letters — three Mothers, seven
   * Doubles, twelve Simples — and `letters.ts` holds those counts as canonical,
   * so the two must agree in number even though which letter sits where is
   * ours rather than the tradition's.
   */
  it("joins them by twenty-two paths, three across and seven down", () => {
    expect(TREE_PATHS).toHaveLength(22);
    expect(TREE_PATHS.filter((p) => p.kind === "horizontal")).toHaveLength(3);
    expect(TREE_PATHS.filter((p) => p.kind === "vertical")).toHaveLength(7);
    expect(TREE_PATHS.filter((p) => p.kind === "diagonal")).toHaveLength(12);

    const byClass = (kind: string) => letters.filter((l) => l.classification === kind).length;
    expect(byClass("Mother"), "three Mothers, three horizontals").toBe(3);
    expect(byClass("Double"), "seven Doubles, seven verticals").toBe(7);
    expect(byClass("Simple"), "twelve Simples, twelve diagonals").toBe(12);

    // No path is drawn twice, and none joins a Sefirah to itself.
    expect(new Set(TREE_PATHS.map((p) => p.id)).size).toBe(22);
    for (const path of TREE_PATHS) {
      expect(path.ends[0], `${path.id} joins a Sefirah to itself`).not.toBe(path.ends[1]);
      expect(nodeOf[path.ends[0]].row, `${path.id} is not read lower end first`).toBeLessThanOrEqual(
        nodeOf[path.ends[1]].row,
      );
    }
  });

  it("carries each of the twenty-two letters on exactly one path", () => {
    const carried = TREE_PATHS.map((p) => p.letter);
    expect(new Set(carried).size, "a letter lies on two paths").toBe(22);
    expect([...carried].sort()).toEqual(letters.map((l) => l.id).sort());
  });

  it("leaves no Sefirah unreachable, by any route", () => {
    // Walk every path and see where you end up: all ten, or the Tree has an
    // island in it and some rung of the climb could never be played.
    expect(reachedBy(TREE_PATHS.map((p) => p.id)).size).toBe(10);
    for (const sefirah of ALL) {
      expect(pathsFrom(sefirah).length, `${sefirah} has no way in or out`).toBeGreaterThan(0);
    }
  });

  /**
   * **The one that matters.**
   *
   * A climb starts at Malchut holding nothing at all, so whichever way the
   * Scribe steps first, that path's terrain is built for a Scribe holding
   * nothing — and the letter it gives had better be one that is worth
   * something on its own. Every verb in this game is self-sufficient, but a
   * *grace* is not: it modifies a verb, so a first path that paid out only a
   * grace would leave the second path no better off than the first.
   *
   * This is the assertion that the whole letter arrangement exists to satisfy,
   * and it is why the arrangement is a rule rather than a table: it falls out
   * of laying the letters along the Tree lowest-end-first, and it would not
   * survive the traditional ordering for a single screen.
   */
  it("pays a verb for every first step out of Malchut", () => {
    const first = pathsFrom("malchut");
    expect(first.length, "the kingdom is a dead end").toBeGreaterThan(1);
    for (const path of first) {
      const ability = abilityByLetter[path.letter];
      expect(ability, `${path.id} carries an unknown letter`).toBeDefined();
      expect(
        ability?.kind,
        `${path.id} pays only ${path.letter}, a grace — a Scribe holding nothing gains nothing by it`,
      ).toBe("verb");
    }
  });

  /**
   * And the Breath in particular. `chunks.ts` measures every reach in the
   * library against holding it, and says so: a plain gap can never gate
   * anything narrower than eight tiles *because* the Breath is had early. It
   * has to be one step from the start.
   */
  it("puts the Breath one step from the kingdom", () => {
    expect(pathsFrom("malchut").map((p) => p.letter)).toContain("aleph");
  });

  /**
   * Peh is assembled from the torn scroll rather than found, so its path is
   * the last one anybody reaches — otherwise a path would pay out nothing to a
   * Scribe who had not gathered the fragments, and a path that silently gives
   * nothing is a path nobody would walk twice.
   */
  it("keeps the Mouth for the crown", () => {
    const peh = TREE_PATHS.find((p) => p.letter === "peh");
    expect(peh).toBeDefined();
    expect(peh?.ends).toContain("keter");
  });

  it("answers about paths from either end", () => {
    const path = pathBetween("malchut", "yesod");
    expect(path).toBeDefined();
    if (!path) return;
    expect(pathBetween("yesod", "malchut")).toBe(path);
    expect(otherEnd(path, "malchut")).toBe("yesod");
    expect(otherEnd(path, "yesod")).toBe("malchut");
    expect(letterOfPath(path.id)).toBe(path.letter);
    expect(pathById[path.id]).toBe(path);
    // Nothing joins the kingdom to the crown.
    expect(pathBetween("malchut", "keter")).toBeUndefined();
  });
});

describe("what a route gathers", () => {
  it("gives a path's letter once, however often it is walked", () => {
    const there = pathBetween("malchut", "yesod");
    expect(there).toBeDefined();
    if (!there) return;
    expect(lettersFrom([there.id])).toEqual([there.letter]);
    expect(lettersFrom([there.id, there.id, there.id])).toEqual([there.letter]);
  });

  it("gathers them in the order they were walked, so the route is the alphabet", () => {
    const a = pathBetween("malchut", "yesod");
    const b = pathBetween("malchut", "hod");
    if (!a || !b) throw new Error("the kingdom lost its paths");
    expect(lettersFrom([a.id, b.id])).toEqual([a.letter, b.letter]);
    expect(lettersFrom([b.id, a.id])).toEqual([b.letter, a.letter]);
  });

  /**
   * A walked path only carries you if you had already reached one of its ends.
   * Nothing in the game can produce a disconnected set today, but a saved
   * record can be edited, and a Scribe standing somewhere they could not have
   * walked to is a worse bug than one who is refused a move.
   */
  it("never lands a Scribe somewhere no walked path could have carried them", () => {
    const stranded = pathBetween("keter", "chochmah");
    expect(stranded).toBeDefined();
    if (!stranded) return;
    expect([...reachedBy([stranded.id])]).toEqual(["malchut"]);
  });

  it("ignores a path that is not on the Tree", () => {
    expect(lettersFrom(["nowhere-nothing"])).toEqual([]);
    expect([...reachedBy(["nowhere-nothing"])]).toEqual(["malchut"]);
  });
});

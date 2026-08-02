import { describe, expect, it } from "vitest";
import { abilityByLetter } from "./abilities";
import { letters } from "../data/letters";
import { regions } from "./regions";
import {
  afterWalking,
  lettersFrom,
  pointOf,
  stateOfPath,
  TREE_CANOPY,
  TREE_FRAME,
  TREE_LIMBS,
  TREE_LINES,
  TREE_POINTS,
  TREE_ROOTS,
  TREE_VIEW,
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
import type { Standing } from "./tree";

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
   *
   * **One step, and no nearer.** Only one of the three ways out of the kingdom
   * pays Aleph, and the other two are meant to be the harder opening — a Scribe
   * who leaves by the Fence or the Mark has chosen them over the second jump
   * and walks the next few rungs without it. That is a decision and not an
   * oversight: it is the only place on the Tree where the first move a player
   * makes has consequences they can feel for the rest of the climb, and a map
   * whose doors all cost the same is a corridor with decorations.
   *
   * `traversal.test.ts` measures what it costs — a probe crosses about
   * seven-eighths of sampled paths and nearly every miss is a Breath-less
   * Scribe on a long walk — and holds that as a floor rather than a fault.
   * Nothing here should be "fixed" by giving Aleph a second path.
   */
  it("puts the Breath one step from the kingdom, and only one", () => {
    const first = pathsFrom("malchut");
    expect(first.map((p) => p.letter)).toContain("aleph");
    expect(
      first.filter((p) => p.letter === "aleph"),
      "every way out of Malchut pays the Breath — the first choice costs nothing",
    ).toHaveLength(1);
    expect(first.length, "the kingdom has only one door").toBeGreaterThan(1);
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

/**
 * The diagram, which is the one part of this anybody can check by eye — and
 * therefore the one part worth pinning down, because an error in it looks like
 * a drawing mistake rather than a bug and lives forever.
 */
describe("the Tree, drawn", () => {
  it("stands the crown at the top and the kingdom at the foot", () => {
    expect(TREE_POINTS).toHaveLength(10);
    expect(pointOf.keter.y).toBe(0);
    expect(pointOf.malchut.y).toBe(TREE_VIEW.height);
    // Nothing is drawn outside the frame it declares.
    for (const p of TREE_POINTS) {
      expect(p.x, `${p.sefirah} is off the left`).toBeGreaterThanOrEqual(0);
      expect(p.x, `${p.sefirah} is off the right`).toBeLessThanOrEqual(TREE_VIEW.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(TREE_VIEW.height);
    }
  });

  /**
   * Mercy on the left of the page. That is the printed convention and it is not
   * arbitrary: the diagram is read as a figure facing the reader, so the pillar
   * on your left is on its right hand, which is the hand of mercy.
   */
  it("puts mercy to the left and severity to the right, with the middle between", () => {
    expect(pointOf.chesed.x).toBeLessThan(pointOf.tiferet.x);
    expect(pointOf.gevurah.x).toBeGreaterThan(pointOf.tiferet.x);
    for (const s of ["keter", "tiferet", "yesod", "malchut"] as const) {
      expect(pointOf[s].x, `${s} has left the middle pillar`).toBe(TREE_VIEW.width / 2);
    }
    // The two outer pillars are mirror images across the middle.
    expect(pointOf.chesed.x + pointOf.gevurah.x).toBe(TREE_VIEW.width);
  });

  it("draws a line for every path, from end to end", () => {
    expect(TREE_LINES).toHaveLength(22);
    for (const line of TREE_LINES) {
      expect(line.from.sefirah).toBe(line.path.ends[0]);
      expect(line.to.sefirah).toBe(line.path.ends[1]);
      // No path is drawn as a dot, which would be a line with nowhere to write
      // its letter.
      expect(
        line.from.x !== line.to.x || line.from.y !== line.to.y,
        `${line.path.id} is drawn as a point`,
      ).toBe(true);
      // The letter is written beside its line, close enough to belong to it.
      const off = Math.hypot(
        line.labelX - (line.from.x + line.to.x) / 2,
        line.labelY - (line.from.y + line.to.y) / 2,
      );
      expect(off, `${line.path.id}'s letter has drifted off its line`).toBeCloseTo(0.34, 6);
    }
    // **Two paths must never be labelled in the same place.** Netzach–Hod and
    // Tiferet–Yesod share a midpoint on the printed Tree, so this is a live
    // assertion rather than a formality — it failed when the letters were
    // written on the midpoints, which is what anyone would write first.
    const marks = TREE_LINES.map((l) => `${l.labelX.toFixed(3)},${l.labelY.toFixed(3)}`);
    expect(new Set(marks).size, "two paths are labelled in the same place").toBe(22);
  });

  it("knows which paths lead out of where the Scribe stands", () => {
    const first = pathsFrom("malchut")[0];
    expect(stateOfPath(first, "malchut", [])).toBe("open");
    // Somewhere else entirely, and never walked.
    const far = pathBetween("keter", "chochmah");
    expect(far).toBeDefined();
    if (!far) return;
    expect(stateOfPath(far, "malchut", [])).toBe("far");
    expect(stateOfPath(far, "malchut", [far.id])).toBe("walked");
    // **A walked path stays open from either of its ends**, because crossing
    // back is how the Tree is a map rather than a list. Walked-and-here reads
    // as open, not as spent.
    expect(stateOfPath(first, "malchut", [first.id])).toBe("open");
  });
});

describe("walking a path", () => {
  const start = { at: "malchut" as const, pathsWalked: [] as string[] };

  it("sets the Scribe down at the far end and records the way", () => {
    const path = pathBetween("malchut", "yesod");
    expect(path).toBeDefined();
    if (!path) return;
    const after = afterWalking(start, path);
    expect(after.at).toBe("yesod");
    expect(after.pathsWalked).toEqual([path.id]);
    // And back again, which is what makes this a map.
    const back = afterWalking(after, path);
    expect(back.at).toBe("malchut");
    expect(back.pathsWalked).toEqual([path.id, path.id]);
    // Walked twice, given once.
    expect(lettersFrom(back.pathsWalked)).toEqual([path.letter]);
  });

  it("refuses a path that does not touch where the Scribe stands", () => {
    const elsewhere = pathBetween("keter", "chochmah");
    expect(elsewhere).toBeDefined();
    if (!elsewhere) return;
    expect(afterWalking(start, elsewhere)).toBe(start);
  });

  /**
   * The route is the alphabet. Two Scribes on the same day's Tree who leave the
   * kingdom by different doors are holding different letters three paths later,
   * and every rung either of them walks after that is built from what they
   * hold — which is the whole reason `route.test.ts` had to re-earn the
   * no-soft-lock guarantee over sampled routes rather than over ten regions.
   */
  it("gathers a different alphabet down a different route", () => {
    const walk = (...ids: string[]) => {
      let standing: Standing = start;
      for (const id of ids) {
        const path = pathById[id];
        if (path) standing = afterWalking(standing, path);
      }
      return lettersFrom(standing.pathsWalked);
    };
    // Two ways up to Tiferet: by the middle pillar, or round by Netzach. Note
    // the ids read lower end first, always — `hod-yesod` is not a path, because
    // Yesod is the lower of the two and the id says so.
    const byPillar = walk("malchut-yesod", "yesod-tiferet");
    const byNetzach = walk("malchut-netzach", "netzach-tiferet");
    expect(byPillar, "the middle route walked nowhere").toHaveLength(2);
    expect(byNetzach, "the outer route walked nowhere").toHaveLength(2);
    expect(byPillar, "both routes gather the same letters in the same order").not.toEqual(
      byNetzach,
    );
    // Two Scribes standing in the same place, holding four letters between them
    // and not the same two each.
    expect(new Set([...byPillar, ...byNetzach]).size).toBe(4);
  });
});

/**
 * **The Tree drawn as a tree.**
 *
 * The geometry above is the received diagram and is checked against the
 * printed frame. What is checked here is the layer over it — weight, bend,
 * root and crown — and the two things about that layer which are not a matter
 * of taste: it must not move the diagram, and it must fit in its own frame.
 *
 * A limb that reached outside `TREE_FRAME` would be clipped by the viewBox,
 * which on a phone reads as a rendering fault and on a desktop reads as a tree
 * with a branch sawn off.
 */
describe("the Tree, as a tree", () => {
  /** Every coordinate in a path string, which is all this needs to know. */
  const numbersIn = (d: string) =>
    (d.match(/-?\d+\.?\d*/g) ?? []).map(Number);

  it("gives every path a limb, and moves none of them", () => {
    expect(TREE_LIMBS).toHaveLength(TREE_LINES.length);
    for (const limb of TREE_LIMBS) {
      const line = TREE_LINES.find((l) => l.path.id === limb.path.id);
      expect(line, `${limb.path.id} has a limb and no line`).toBeDefined();
      // The letter stays exactly where the tested geometry put it — the whole
      // point of the drawing layer is that it draws the same Tree.
      expect(limb.labelX).toBe(line?.labelX);
      expect(limb.labelY).toBe(line?.labelY);
      expect(limb.d.length, `${limb.path.id} has no outline`).toBeGreaterThan(20);
      expect(limb.leaves.length).toBeGreaterThan(0);
    }
  });

  /**
   * A limb is thick where it comes out of the ground and fine at the tip, so
   * the trunk out of the kingdom has to be the widest thing on the drawing and
   * the ways into the crown the narrowest. Measured off the outlines rather
   * than off the constants, which is the only way to catch the taper being
   * applied to the wrong end.
   */
  it("makes the trunk thicker than the twigs", () => {
    const spread = (id: string) => {
      const limb = TREE_LIMBS.find((l) => l.path.id === id);
      const xs = numbersIn(limb?.d ?? "").filter((_, i) => i % 2 === 0);
      return Math.max(...xs) - Math.min(...xs);
    };
    // Malchut–Yesod is the first step out of the kingdom; Keter–Chochmah is a
    // way into the crown. Both are short, so the difference is the taper.
    expect(spread("malchut-yesod")).toBeGreaterThan(spread("keter-chochmah"));
  });

  it("keeps the whole drawing — roots and crown — inside its own frame", () => {
    const all = [...TREE_LIMBS.map((l) => l.d), ...TREE_ROOTS, ...TREE_CANOPY];
    for (const d of all) {
      const n = numbersIn(d);
      for (let i = 0; i < n.length; i += 2) {
        expect(n[i], `a limb runs off the side: ${d.slice(0, 40)}`).toBeGreaterThanOrEqual(
          TREE_FRAME.left,
        );
        expect(n[i]).toBeLessThanOrEqual(TREE_FRAME.right);
        expect(n[i + 1], `a limb runs off the end: ${d.slice(0, 40)}`).toBeGreaterThanOrEqual(
          TREE_FRAME.top,
        );
        expect(n[i + 1]).toBeLessThanOrEqual(TREE_FRAME.bottom);
      }
    }
  });

  /** Roots below the kingdom, branches above the crown, and never the reverse. */
  it("puts the roots under the kingdom and the branches over the crown", () => {
    expect(TREE_ROOTS.length).toBeGreaterThan(3);
    expect(TREE_CANOPY.length).toBeGreaterThan(2);
    const lowest = (ds: readonly string[]) =>
      Math.max(...ds.flatMap((d) => numbersIn(d).filter((_, i) => i % 2 === 1)));
    const highest = (ds: readonly string[]) =>
      Math.min(...ds.flatMap((d) => numbersIn(d).filter((_, i) => i % 2 === 1)));
    expect(lowest(TREE_ROOTS), "the roots do not go below Malchut").toBeGreaterThan(
      pointOf.malchut.y,
    );
    expect(highest(TREE_CANOPY), "the branches do not rise above Keter").toBeLessThan(
      pointOf.keter.y,
    );
  });

  /** And a limb bends the same way every time it is drawn. */
  it("draws the same Tree twice", () => {
    expect(TREE_LIMBS.map((l) => l.d)).toEqual(TREE_LIMBS.map((l) => l.d));
    expect(new Set(TREE_LIMBS.map((l) => l.d)).size, "two limbs are the same shape").toBe(
      TREE_LIMBS.length,
    );
  });
});

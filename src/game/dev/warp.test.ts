import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { letters as allLetters } from "../../data/letters";
import { LAMPS } from "../combat";
import { lettersOnEntering, regionAt, TOTAL_REGIONS } from "../regions";
import { TREE_PATHS } from "../tree";
import { SCROLL_LETTER } from "../scroll";
import { witnessesOf, WITNESSES_POSSIBLE } from "../story";
import {
  DEV_MARKER,
  lettersFor,
  readWarp,
  warpParams,
  warpRecord,
  witnessCards,
  WARP_DEFAULTS,
  type WarpOptions,
} from "./warp";

const base = {
  id: "ascent-test",
  seed: 1234,
  seedLabel: "14 Nisan 5786",
  notes: ["a note"],
  ascendantLetterId: "aleph",
  encounterNumber: 1,
};

const options = (over: Partial<WarpOptions> = {}): WarpOptions => ({
  ...WARP_DEFAULTS,
  ...over,
});

describe("what the warped Scribe is holding", () => {
  it("gives nothing for 'none'", () => {
    expect(lettersFor("none", 7)).toEqual([]);
  });

  it("gives all twenty-two for 'all'", () => {
    expect(lettersFor("all", 1)).toHaveLength(allLetters.length);
    expect(lettersFor("all", 1)).toContain(SCROLL_LETTER);
  });

  it("omits exactly Peh for 'all-but-peh' — the only road to the mute plea", () => {
    const held = lettersFor("all-but-peh", 10);
    expect(held).toHaveLength(allLetters.length - 1);
    expect(held).not.toContain(SCROLL_LETTER);
  });

  it("matches the real climb for 'as-of-rung'", () => {
    for (let rung = 1; rung <= TOTAL_REGIONS; rung += 1) {
      expect(lettersFor("as-of-rung", rung)).toEqual([...lettersOnEntering(rung)]);
    }
  });
});

describe("options off a URL", () => {
  it("is absent when nothing was asked for", () => {
    expect(readWarp(new URLSearchParams(""))).toBeUndefined();
    expect(readWarp(new URLSearchParams("lamps=1"))).toBeUndefined();
  });

  it("reads a full warp", () => {
    const read = readWarp(
      new URLSearchParams("rung=10&letters=all-but-peh&lamps=1&seed=99&porch=1&witnesses=7"),
    );
    expect(read).toEqual({
      rung: 10,
      letters: "all-but-peh",
      lamps: 1,
      seed: 99,
      porch: true,
      witnesses: 7,
      freed: false,
      lit: false,
    });
  });

  it("reads the freed flag, which is what makes a warped Sefirah kindleable", () => {
    expect(readWarp(new URLSearchParams("rung=5&freed=1"))?.freed).toBe(true);
    expect(readWarp(new URLSearchParams("rung=5"))?.freed).toBe(false);
    expect(warpParams({ ...WARP_DEFAULTS, freed: true })).toContain("freed=1");
    expect(warpParams(WARP_DEFAULTS)).not.toContain("freed");
  });

  it("reads the lit flag, which is what puts the ending within reach", () => {
    expect(readWarp(new URLSearchParams("rung=10&lit=1"))?.lit).toBe(true);
    const lit = warpRecord(options({ rung: 10, lit: true }), base).sefirotLit ?? [];
    expect(lit, "the ending is offered only when all ten are kindled").toHaveLength(TOTAL_REGIONS);
    expect(warpRecord(options({ rung: 10 }), base).sefirotLit).toBeUndefined();
  });

  it("clamps a rung, lamps and witnesses into what exists", () => {
    const high = readWarp(new URLSearchParams("rung=99&lamps=99&witnesses=99"))!;
    expect(high.rung).toBe(TOTAL_REGIONS);
    expect(high.lamps).toBe(LAMPS);
    expect(high.witnesses).toBe(WITNESSES_POSSIBLE);
    const low = readWarp(new URLSearchParams("rung=-4&lamps=0&witnesses=-1"))!;
    expect(low.rung).toBe(1);
    expect(low.lamps).toBe(1);
    expect(low.witnesses).toBe(0);
  });

  it("falls back rather than throwing on nonsense", () => {
    const read = readWarp(new URLSearchParams("rung=abc&letters=marzipan"))!;
    expect(read.rung).toBe(1);
    expect(read.letters).toBe(WARP_DEFAULTS.letters);
  });

  it("round-trips through the query string", () => {
    const written = options({ rung: 6, letters: "all", lamps: 2, seed: 7, porch: true, witnesses: 3 });
    expect(readWarp(new URLSearchParams(warpParams(written)))).toEqual(written);
  });

  it("leaves the day's own seed out of the URL when none was chosen", () => {
    expect(warpParams(options())).not.toContain("seed");
  });
});

describe("the record it builds", () => {
  it("is shaped like the one the threshold builds", () => {
    const record = warpRecord(options({ rung: 4 }), base);
    expect(record.id).toBe(base.id);
    expect(record.seed).toBe(base.seed);
    expect(record.seedLabel).toBe(base.seedLabel);
    expect(record.ascendantLetterId).toBe(base.ascendantLetterId);
    expect(record.encounterNumber).toBe(base.encounterNumber);
    expect(record.or).toBe(0);
    expect(record.sealedAt).toBeUndefined();
    expect(Date.parse(record.createdAt)).not.toBeNaN();
  });

  /**
   * **The warp stands on the Tree.** Without `at` a record is by definition
   * pre-overworld — that is what `standingAt` reads it as — so a warp that
   * omitted it sent every harness run down the linear road, which is exactly
   * why the road outlived the game that replaced it.
   */
  it("stands the Scribe on a Sefirah, with a route behind them", () => {
    for (const rung of [1, 4, 7, TOTAL_REGIONS]) {
      const record = warpRecord(options({ rung }), base);
      expect(record.at, `rung ${rung} stood nowhere`).toBe(regionAt(rung).sefirah);
      expect(record.regionIndex).toBe(rung);
      // The route is the shortest one a Scribe could have walked to get here,
      // so `pathsWalked` is a history rather than a decoration: the kingdom
      // needs none, and everywhere else needs at least one.
      const walked = record.pathsWalked ?? [];
      if (rung === 1) {
        expect(walked, "the kingdom is walked to from nowhere").toEqual([]);
        continue;
      }
      expect(walked.length, `rung ${rung} walked nothing to get there`).toBeGreaterThan(0);
      for (const id of walked) {
        expect(TREE_PATHS.some((p) => p.id === id), `${id} is not a path`).toBe(true);
      }
      // And the route ends where the Scribe stands.
      const last = TREE_PATHS.find((p) => p.id === walked[walked.length - 1])!;
      expect(last.ends).toContain(record.at);
    }
  });

  it("frees the guardians below only when asked, since a held Sefirah cannot be kindled", () => {
    expect(warpRecord(options({ rung: 5 }), base).guardiansBroken).toBeUndefined();
    const freed = warpRecord(options({ rung: 5, freed: true }), base).guardiansBroken ?? [];
    expect(freed).toHaveLength(5);
    expect(freed).toContain(regionAt(5).sefirah);
    expect(freed).not.toContain(regionAt(6).sefirah);
  });

  it("counts every rung below as behind you, or the ladder reads wrong", () => {
    expect(warpRecord(options({ rung: 1 }), base).regionsCleared).toEqual([]);
    expect(warpRecord(options({ rung: 5 }), base).regionsCleared).toEqual([1, 2, 3, 4]);
    expect(warpRecord(options({ rung: TOTAL_REGIONS }), base).regionsCleared).toHaveLength(
      TOTAL_REGIONS - 1,
    );
  });

  it("prefers the asked-for seed and falls back to the day's", () => {
    expect(warpRecord(options({ seed: 42 }), base).seed).toBe(42);
    expect(warpRecord(options(), base).seed).toBe(base.seed);
  });

  it("carries the letters the mode asked for", () => {
    expect(warpRecord(options({ rung: 10, letters: "all-but-peh" }), base).lettersHeld).not.toContain(
      SCROLL_LETTER,
    );
    expect(warpRecord(options({ rung: 3 }), base).lettersHeld).toEqual([...lettersOnEntering(3)]);
  });
});

describe("the witnesses, so the plea can be reached in all four states", () => {
  it("gives none by default — the plea alone", () => {
    expect(witnessCards(0)).toEqual([]);
    expect(witnessesOf(witnessCards(0))).toHaveLength(0);
  });

  it("names one distinct House per Sefirah, and never more than exist", () => {
    for (let count = 0; count <= WITNESSES_POSSIBLE; count += 1) {
      const witnesses = witnessesOf(witnessCards(count));
      expect(witnesses).toHaveLength(count);
      expect(new Set(witnesses.map((w) => w.sefirah)).size).toBe(count);
    }
    expect(witnessCards(99)).toHaveLength(WITNESSES_POSSIBLE);
  });

  it("reaches the whole case", () => {
    const record = warpRecord(options({ rung: 10, letters: "all", witnesses: WITNESSES_POSSIBLE }), base);
    expect(witnessesOf(record.housesMet)).toHaveLength(WITNESSES_POSSIBLE);
  });
});

/**
 * The invariant that matters more than any of the above: **nothing dev-only
 * reaches production.** Every use of the warp is behind `import.meta.env.DEV`,
 * which the build replaces with `false` — so the panel's chunk is never
 * emitted and `warp.ts` shakes out entirely. This asserts it rather than
 * trusting it. It is skipped when there is no build to look at, because
 * `npm run test` must not depend on having run `npm run build` first.
 */
describe("the production build", () => {
  const dist = join(process.cwd(), "dist");

  const filesUnder = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? filesUnder(path) : [path];
    });

  it.runIf(existsSync(dist))("carries no trace of the warp", () => {
    const guilty = filesUnder(dist).filter(
      (path) => /\.(js|css|html|map)$/.test(path) && readFileSync(path, "utf8").includes(DEV_MARKER),
    );
    expect(guilty, `dev-only code shipped in: ${guilty.join(", ")}`).toEqual([]);
  });
});

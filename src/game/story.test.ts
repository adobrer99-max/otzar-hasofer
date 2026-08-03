import { describe, expect, it } from "vitest";
import { dorotCardsById, dorotHousesById, housesBySefirah } from "../data/dorot";
import { regions } from "./regions";
import { SCROLL_LETTER } from "./scroll";
import {
  endingOf,
  ABYSS_WORD,
  pleaFor,
  PROLOGUE,
  TESTIMONY,
  witnessesOf,
  WITNESSES_POSSIBLE,
  type Witness,
} from "./story";

const witness = (sefirah: string, figure: string): Witness =>
  ({ sefirah, figure }) as Witness;
const ALL = Object.values(TESTIMONY).map((t) => witness(t.sefirah, t.sefirah));

describe("the charge, held one piece per rung", () => {
  it("puts a piece on every rung that holds a House, and none where there is none", () => {
    for (const region of regions) {
      expect(
        Boolean(TESTIMONY[region.sefirah]),
        `${region.name} — testimony and House disagree`,
      ).toBe(region.hasHouse);
    }
  });

  it("counts as many possible witnesses as there are Houses to meet", () => {
    expect(WITNESSES_POSSIBLE).toBe(regions.filter((r) => r.hasHouse).length);
  });

  it("keys each piece to its own Sefirah", () => {
    for (const [key, t] of Object.entries(TESTIMONY)) {
      expect(t.sefirah, `${key} is filed under the wrong rung`).toBe(key);
    }
  });

  /**
   * Either House may stand at a rung — the patriarchal or the matriarchal,
   * whichever the seed lays — so a piece of the charge that only made sense in
   * one of the two mouths would read as nonsense half the time.
   */
  it("has both a patriarchal and a matriarchal House at every rung it speaks for", () => {
    for (const sefirah of Object.keys(TESTIMONY)) {
      const kinds = housesBySefirah(sefirah).map((h) => h.kind);
      expect(kinds, `${sefirah}`).toContain("patriarchal");
      expect(kinds, `${sefirah}`).toContain("matriarchal");
    }
  });

  it("says something on every rung, and says it in the first person", () => {
    for (const t of Object.values(TESTIMONY)) {
      // Low on purpose: Gevurah's whole piece is "You asked why." — three
      // words, and the shortest line in the game, because that rung is
      // severity and a stark charge is what severity sounds like.
      expect(t.charge.length, `${t.sefirah} charge`).toBeGreaterThan(12);
      expect(t.answer.length, `${t.sefirah} answer`).toBeGreaterThan(80);
      expect(/\bI\b/.test(t.answer), `${t.sefirah} does not testify in its own voice`).toBe(true);
    }
  });

  it("gives the Scribe a prologue and the Abyss a word", () => {
    expect(PROLOGUE.lines.length).toBeGreaterThanOrEqual(3);
    expect(PROLOGUE.charge).toMatch(/Mouth/);
    expect(ABYSS_WORD.length).toBeGreaterThan(80);
  });
});

describe("who stood for the Scribe", () => {
  it("reads the witnesses off the Houses met", () => {
    const card = Object.values(dorotCardsById)[0];
    const house = dorotHousesById[card.houseId];
    expect(witnessesOf([card.id])).toEqual([{ sefirah: house.sefirah, figure: house.figure }]);
  });

  it("counts a rung once however many of its cards were met", () => {
    const house = housesBySefirah("malchut")[0];
    const cards = Object.values(dorotCardsById).filter((c) => c.houseId === house.id);
    expect(cards.length).toBeGreaterThan(1);
    expect(witnessesOf(cards.map((c) => c.id))).toHaveLength(1);
  });

  it("ignores a card that is not there", () => {
    expect(witnessesOf(["no-such-card"])).toEqual([]);
  });
});

describe("the plea at the crown", () => {
  it("cannot be made without the Mouth, whoever stood for you", () => {
    const plea = pleaFor({ hasMouth: false, witnesses: ALL });
    expect(plea.kind).toBe("mute");
    // And it must say where the letter was, because the whole point is that
    // it can be had on the next ascent.
    expect(plea.lines.join(" ")).toMatch(/genizah/);
  });

  it("is made alone when no House was spoken with", () => {
    expect(pleaFor({ hasMouth: true, witnesses: [] }).kind).toBe("alone");
  });

  it("names everyone who stood, and says how many did not", () => {
    const some = [witness("malchut", "Ruth"), witness("hod", "Hannah")];
    const plea = pleaFor({ hasMouth: true, witnesses: some });
    expect(plea.kind).toBe("heard");
    expect(plea.lines.join(" ")).toContain("Ruth");
    expect(plea.lines.join(" ")).toContain("Hannah");
    expect(plea.lines.join(" ")).toContain(`2 of the ${WITNESSES_POSSIBLE}`);
  });

  it("makes the whole case only when every House stood", () => {
    expect(pleaFor({ hasMouth: true, witnesses: ALL }).kind).toBe("whole");
    expect(pleaFor({ hasMouth: true, witnesses: ALL.slice(1) }).kind).toBe("heard");
  });

  /**
   * The crown does not acquit and does not condemn. Everything the seven
   * Houses testify is that the *asking* was permitted, so the strongest ending
   * available is that he is heard — which is what each of them got.
   */
  it("never returns a verdict", () => {
    for (const hasMouth of [true, false]) {
      for (const witnesses of [[], ALL.slice(0, 3), ALL]) {
        const text = pleaFor({ hasMouth, witnesses }).lines.join(" ");
        expect(text, "the crown must not judge").not.toMatch(
          /\b(forgiven|acquitted|pardoned|guilty|condemned|restored to your office)\b/i,
        );
      }
    }
  });

  it("is the Mouth that is required, and it is the letter the scroll becomes", () => {
    expect(SCROLL_LETTER).toBe("peh");
  });
});

/**
 * **The ending, frozen where it is earned.** `endingOf` is what `sealAscent`
 * writes onto the record, and the derivation for every climb sealed before the
 * fields existed — so it must agree with `pleaFor` exactly, or history and the
 * plate would tell two stories.
 */
describe("the ending a record keeps", () => {
  const card = Object.values(dorotCardsById)[0];

  it("derives all four kinds from the two persisted fields", () => {
    expect(endingOf([], []).plea).toBe("mute");
    expect(endingOf(["peh"], []).plea).toBe("alone");
    expect(endingOf(["peh"], [card.id]).plea).toBe("heard");
    const oneCardPerSefirah = Object.values(TESTIMONY).map(
      (t) => Object.values(dorotCardsById).find((c) => dorotHousesById[c.houseId]?.sefirah === t.sefirah)!.id,
    );
    expect(endingOf(["peh"], oneCardPerSefirah).plea).toBe("whole");
  });

  it("agrees with the plate, whatever was held and met", () => {
    for (const held of [[], ["peh"], ["aleph"], ["aleph", "peh"]]) {
      for (const met of [[], [card.id]]) {
        const frozen = endingOf(held, met);
        const shown = pleaFor({ hasMouth: held.includes(SCROLL_LETTER), witnesses: witnessesOf(met) });
        expect(frozen.plea).toBe(shown.kind);
      }
    }
  });

  it("names the witnesses once per Sefirah, as the plea counts them", () => {
    const house = housesBySefirah("malchut")[0];
    const cards = Object.values(dorotCardsById).filter((c) => c.houseId === house.id);
    const { witnessSefirot } = endingOf(["peh"], cards.map((c) => c.id));
    expect(witnessSefirot).toEqual(["malchut"]);
  });
});

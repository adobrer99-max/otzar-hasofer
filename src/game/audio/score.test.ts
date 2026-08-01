import { describe, expect, it } from "vitest";
import { letters } from "../../data/letters";
import { regions } from "../regions";
import { misparKatan } from "../values";
import { MODES, modeFor, pitchOf, RUNG_VOICES } from "./modes";
import { nigunim, PENDING_NIGUNIM } from "./nigunim";
import { bendToOpen, degreeForLetter, openDegrees, scoreFor } from "./score";

describe("the prayer modes", () => {
  it("gives every rung of the Tree a real mode and a register", () => {
    for (const region of regions) {
      const voice = RUNG_VOICES[region.sefirah];
      expect(voice, `${region.name} has no voice`).toBeDefined();
      expect(MODES[voice.mode], `${region.name} names an unknown mode`).toBeDefined();
      expect(voice.octave).toBeGreaterThanOrEqual(0);
    }
  });

  it("rises in pitch up the Tree — Malchut low, Keter high", () => {
    const malchut = pitchOf(modeFor("malchut"), 1, RUNG_VOICES.malchut.octave);
    const keter = pitchOf(modeFor("keter"), 1, RUNG_VOICES.keter.octave);
    expect(keter).toBeGreaterThan(malchut);
  });

  it("keeps each mode's steps ascending and inside an octave", () => {
    for (const mode of Object.values(MODES)) {
      expect(mode.steps[0], `${mode.name} must start on the tonic`).toBe(0);
      for (let i = 1; i < mode.steps.length; i += 1) {
        expect(mode.steps[i], `${mode.name} step ${i}`).toBeGreaterThan(mode.steps[i - 1]);
      }
      expect(mode.steps.at(-1)).toBeLessThan(12);
    }
  });

  it("keeps Ahavah Rabbah's signature — a flat second over a major third", () => {
    // The augmented second between them is the whole character of the mode;
    // if this ever changes, it has stopped being Ahavah Rabbah.
    const steps = MODES["ahavah-rabbah"].steps;
    expect(steps[1]).toBe(1);
    expect(steps[2]).toBe(4);
  });

  it("wraps degrees past the top of the mode into the octave above", () => {
    const mode = MODES["magen-avot"];
    expect(pitchOf(mode, 8, 0)).toBeCloseTo(pitchOf(mode, 1, 1), 5);
  });
});

describe("letters opening scale degrees", () => {
  it("gives every one of the twenty-two letters a degree in 1..9", () => {
    for (const letter of letters) {
      const degree = degreeForLetter(letter.id);
      expect(degree, letter.name).toBeDefined();
      expect(degree).toBeGreaterThanOrEqual(1);
      expect(degree).toBeLessThanOrEqual(9);
      expect(degree).toBe(misparKatan(letter.gematria));
    }
  });

  it("opens exactly the degree a letter's own gematria reduces to", () => {
    // Aleph (1), Yod (10) and Kuf (100) all reduce to 1 — the tradition
    // already counts them as one number, and they open one degree.
    expect(openDegrees(["aleph", "yod", "kuf"])).toEqual([1]);
    expect(openDegrees(["bet"])).toEqual([2]);
    expect(openDegrees(["tet", "tzadi"])).toEqual([9]);
  });

  it("opens nothing at all for a Scribe carrying nothing", () => {
    expect(openDegrees([])).toEqual([]);
  });

  it("widens as the alphabet does", () => {
    const early = openDegrees(["aleph", "tav"]);
    const late = openDegrees(letters.map((l) => l.id));
    expect(late.length).toBeGreaterThan(early.length);
    expect(late).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("bending a phrase onto what is open", () => {
  it("leaves an open degree alone", () => {
    expect(bendToOpen(5, [1, 3, 5])).toBe(5);
  });

  it("falls to the nearest open degree rather than dropping the note", () => {
    expect(bendToOpen(4, [1, 3, 7])).toBe(3);
    expect(bendToOpen(6, [1, 3, 7])).toBe(7);
  });

  it("keeps rests as rests", () => {
    expect(bendToOpen(0, [1, 3, 5])).toBe(0);
  });
});

describe("the score as a whole", () => {
  it("always gives a Scribe carrying nothing a drone and a tonic to climb over", () => {
    const score = scoreFor({ sefirah: "malchut", lettersHeld: [] });
    expect(score.openDegrees).toEqual([1]);
    expect(score.droneHz).toBeGreaterThan(0);
    // Every sounded note has fallen back to the tonic.
    const sounded = score.notes.filter((n) => n.hz > 0);
    expect(sounded.length).toBeGreaterThan(0);
    for (const note of sounded) expect(note.hz).toBeCloseTo(sounded[0].hz, 5);
  });

  it("sounds more of the phrase truly as more letters are held", () => {
    const earned = (held: string[]) =>
      scoreFor({ sefirah: "tiferet", lettersHeld: held }).notes.filter((n) => n.gain > 0.1).length;
    expect(earned(letters.map((l) => l.id))).toBeGreaterThan(earned([]));
  });

  it("ducks to a drone when the Scribe is veiled", () => {
    const plain = scoreFor({ sefirah: "hod", lettersHeld: ["aleph"] });
    const veiled = scoreFor({ sefirah: "hod", lettersHeld: ["aleph"], veiled: true });
    expect(veiled.level).toBeLessThan(plain.level);
    expect(veiled.droneHz).toBe(plain.droneHz);
  });

  it("lets the day name the nigun over the rung's own", () => {
    const ordinary = scoreFor({ sefirah: "malchut", lettersHeld: [] });
    const shabbat = scoreFor({ sefirah: "malchut", lettersHeld: [], festivalIds: ["shabbat"] });
    expect(shabbat.nigun.id).toBe("hevenu-shalom-aleichem");
    expect(ordinary.nigun.id).not.toBe(shabbat.nigun.id);
  });

  it("thins out above the Abyss", () => {
    const below = scoreFor({ sefirah: "chesed", lettersHeld: [] });
    const above = scoreFor({ sefirah: "keter", lettersHeld: [] });
    expect(above.nigun.id).toBe("supernal-phrase");
    // Slower, and more rest than note.
    expect(above.secondsPerNote).toBeGreaterThan(below.secondsPerNote);
    const rests = above.notes.filter((n) => n.hz === 0).length;
    expect(rests).toBeGreaterThan(above.notes.length / 3);
  });

  it("is deterministic — the same climb scores the same every time", () => {
    const ctx = { sefirah: "gevurah" as const, lettersHeld: ["aleph", "mem", "shin"] };
    expect(JSON.stringify(scoreFor(ctx))).toBe(JSON.stringify(scoreFor(ctx)));
  });
});

describe("the catalogue's provenance", () => {
  it("makes every entry say where it came from and how far to trust it", () => {
    for (const nigun of nigunim) {
      expect(nigun.attribution.length, nigun.name).toBeGreaterThan(0);
      expect(nigun.era.length, nigun.name).toBeGreaterThan(0);
      expect(nigun.rights.note.length, nigun.name).toBeGreaterThan(20);
      expect(["high", "moderate", "low"]).toContain(nigun.transcription.confidence);
      expect(nigun.transcription.note.length, nigun.name).toBeGreaterThan(10);
    }
  });

  it("names a real rights basis for every entry", () => {
    for (const nigun of nigunim) {
      expect(["traditional-oral", "published-pd", "composed-for-this-work"]).toContain(
        nigun.rights.basis,
      );
      // Anything claiming to be traditional must not claim an author.
      if (nigun.rights.basis === "traditional-oral") {
        expect(nigun.attribution.toLowerCase(), nigun.name).toContain("anonymous");
      }
    }
  });

  it("keeps every phrase to sane degrees", () => {
    for (const nigun of nigunim) {
      expect(nigun.phrase.length, nigun.name).toBeGreaterThan(3);
      for (const degree of nigun.phrase) {
        expect(degree, nigun.name).toBeGreaterThanOrEqual(0);
        expect(degree, nigun.name).toBeLessThanOrEqual(14);
      }
    }
  });

  it("keeps the not-yet-transcribed list honest about why each is absent", () => {
    for (const pending of PENDING_NIGUNIM) {
      expect(pending.attribution.length).toBeGreaterThan(0);
      expect(pending.why.length).toBeGreaterThan(20);
    }
  });
});

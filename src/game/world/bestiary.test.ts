import { describe, expect, it } from "vitest";
import { HUSKS, type HuskKind } from "../combat";
import { bench, breakIn, POSTURES, reachable, signature } from "./bench";
import { outOfReach } from "./step";
import type { Husk } from "./types";

/**
 * **The bestiary, held to the same standard as the silhouettes.**
 *
 * When every klipah got a shape of its own, the test that made it stick was a
 * table check: every kind has one, no two are the same, each fits its box. This
 * is that test for *behaviour*, and it was overdue — a creature's `case` in
 * `stepHusks` is the kind of code that reads correct and does nothing, and
 * until there was a bench nothing in the suite could tell a klipah with a
 * distinct idea from a klipah with a distinct comment.
 *
 * Three things are asserted, in rising order of how badly their absence hurt:
 *
 * 1. **No two kinds are the same creature.** Seven postures, and the answers
 *    have to differ somewhere.
 * 2. **Everything can be broken**, except the two whose whole design is that a
 *    mark alone will not do it — and those two are named here, so that if one
 *    of them ever quietly becomes breakable the test says so.
 * 3. **Nothing is out of reach for most of its life.** This is the one that
 *    found a real fault, and it found it because it is the only question the
 *    other two cannot answer.
 *
 * The numbers are printed by `bench.ts` and pinned here as bands rather than
 * exact values, for the reason the rest of this suite gives: a band measures
 * the design, an exact number measures one draw.
 */

const KINDS = Object.keys(HUSKS) as HuskKind[];

/**
 * The two the Scribe cannot simply write on, and why. Leviathan has to be drawn
 * out of the water with the Hook before a mark means anything, and Behemoth has
 * to be stopped with a stone the Scribe set — *he that made him can make his
 * sword approach unto him*, and the sword is not a pen. Both are proved beaten
 * in `guardianFight.test.ts`, in the rooms they were authored for.
 */
const NOT_BY_WRITING: ReadonlySet<HuskKind> = new Set<HuskKind>(["livyatan", "behemot"]);

describe("the twenty, each its own creature", () => {
  /**
   * Six of the twenty used to answer identically, and each collision was the
   * bench failing rather than the game: it laid Leviathan on dry stone, stood
   * a Scribe over the Nefilim instead of under them, never struck the Calf,
   * and gave Athaliah no light to go for. A creature asked the wrong question
   * looks exactly like a creature with nothing to say.
   */
  it("gives no two kinds the same answers", () => {
    const seen = new Map<string, HuskKind>();
    for (const kind of KINDS) {
      const sig = signature(kind);
      const twin = seen.get(sig);
      expect(twin, `${kind} and ${twin} are the same creature with two names`).toBeUndefined();
      seen.set(sig, kind);
    }
    expect(seen.size).toBe(KINDS.length);
  }, 600000);

  /** And each of them answers at least one posture differently from the rest. */
  it("asks every posture a question something answers", () => {
    for (const posture of POSTURES) {
      const answers = new Set(
        KINDS.map((k) => {
          const t = bench(k, posture);
          return `${t.closed > 1}/${t.moving > 0.1}/${t.threw > 0}/${t.touched}`;
        }),
      );
      expect(answers.size, `every kind answers "${posture}" the same way`).toBeGreaterThan(1);
    }
  }, 600000);
});

describe("everything in the table can be broken", () => {
  /**
   * A Scribe holding all twenty-two letters who keeps station on the thing and
   * throws. Not a probe walking to an exit — that answers whether a klipah gets
   * *in the way*, which is a different and much easier question, and it is the
   * question every instrument this game had was already answering.
   */
  it("breaks eighteen of the twenty by writing alone", () => {
    for (const kind of KINDS) {
      if (NOT_BY_WRITING.has(kind)) continue;
      const at = breakIn(kind);
      expect(at, `${kind} cannot be broken by a Scribe who does nothing else`).toBeGreaterThan(-1);
      // And not after a siege: a creature that takes half a minute of perfect
      // play in an empty room is one nobody breaks in a room with a floor.
      expect(at, `${kind} took ${at} ticks`).toBeLessThan(900);
    }
  }, 600000);

  it("leaves the two whose gate is not a mark", () => {
    for (const kind of NOT_BY_WRITING) {
      expect(breakIn(kind), `${kind} is broken by writing, which is its whole gate`).toBe(-1);
    }
  }, 300000);
});

describe("nothing hides for most of its life", () => {
  /**
   * **The measurement that found the fault.**
   *
   * Korach is inside the ground for most of his cycle, which is what he is, and
   * `outOfReach` is the rule that says so. It read `charging === 0` — and
   * `charging` counts only the rise, so every tick that was not the rise was
   * buried, including the ticks it spent standing in the open. The rise itself
   * stopped at the Scribe's waist, two pixels under the line his marks fly
   * along, so even those forty-two ticks were unhittable in practice.
   *
   * Eleven per cent of its life reachable, on paper. In sixty-six honest walks
   * the fighting probe laid thirty-seven of them and broke **one** — three per
   * cent, against thirty-nine to eighty-five for every other kind in the table.
   * It was laid in three of the ten regions the whole time, it takes lamps, and
   * the four light in it could never be collected by anybody.
   *
   * A klipah is allowed to be hard. It is not allowed to be weather.
   */
  it("keeps every kind answerable for at least half of its cycle", () => {
    for (const kind of KINDS) {
      expect(reachable(kind), `${kind} is beyond a mark for most of its life`).toBeGreaterThan(0.4);
    }
  }, 600000);

  it("still lets the one that burrows spend real time under the ground", () => {
    // The other side of the same band. If this ever reads 1, the earth has
    // stopped opening and Korach has become a pacer with a good name.
    expect(reachable("korach"), "Korach no longer hides at all").toBeLessThan(0.75);
    for (const kind of KINDS) {
      if (kind === "korach") continue;
      expect(reachable(kind), `${kind} has started hiding`).toBe(1);
    }
  }, 600000);
});


/**
 * **And what can be hit must be visible.**
 *
 * Three separate places asked "is Korach in the ground?" and all three answered
 * it by reading `charging`, which counts only the rise: the mark loop, the
 * contact check, and the renderer. Fixing the first two and not the third would
 * have made the creature's one answerable moment its one *invisible* moment —
 * a player throwing at empty air where something is standing.
 *
 * So the rule has one home and everything asks it. This test is the coupling
 * written down: `drawHusks` skips exactly what `outOfReach` skips, and if the
 * renderer ever grows its own opinion again, the shapes here stop agreeing.
 */
describe("the rule about being reachable has one home", () => {
  const korach = (charging: number, cooldown: number): Husk => ({
    id: "k",
    kind: "korach",
    x: 0,
    y: 0,
    w: 18,
    h: 20,
    vx: 0,
    vy: 0,
    shells: 3,
    facing: 1,
    home: { x: 0, y: 0 },
    cooldown,
    charging,
    struck: 0,
  });

  it("says out while it is rising, out while it is standing, and under between", () => {
    // Rising: `charging` is counting down from RISE.
    expect(outOfReach(korach(20, 300))).toBe(false);
    // Standing in the open, the whole of what the phase added — this is the
    // case that read as buried, in all three places at once.
    expect(outOfReach(korach(0, 260))).toBe(false);
    // Back under, which is most of its life and is meant to be.
    expect(outOfReach(korach(0, 120))).toBe(true);
    expect(outOfReach(korach(0, 0))).toBe(true);
  });

  it("says nothing about anything else", () => {
    expect(outOfReach({ ...korach(0, 0), kind: "cain" })).toBe(false);
    expect(outOfReach({ ...korach(0, 0), kind: "livyatan" })).toBe(false);
  });
});

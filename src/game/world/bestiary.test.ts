import { describe, expect, it } from "vitest";
import { HUSKS, type HuskKind } from "../combat";
import { bench, breakIn, duel, laid, openness, POSTURES, reachable, signature, unfair } from "./bench";
import { outOfReach, step, unseen, type StepContext } from "./step";
import { TILE_SIZE } from "./tiles";
import { NO_INPUT, type Husk } from "./types";

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
 * The one the Scribe cannot simply write on: Behemoth has to be stopped with a
 * stone he set — *he that made him can make his sword approach unto him*, and
 * the sword is not a pen. It is proved beaten in `guardianFight.test.ts`, in the
 * room it was authored for.
 *
 * **Behemoth alone**, and Leviathan's removal from this set is a correction.
 * Both were here, and Leviathan's place was earned by a bug: a piercing mark
 * re-struck it every tick it was inside it, and an unopened great one takes
 * `struck = 12` from every blow rather than a shell, so the thing was pinned in
 * the water sixty times a second and never left it. It leaves the water on its
 * own — that is its whole fight — and is broken when it does.
 */
const NOT_BY_WRITING: ReadonlySet<HuskKind> = new Set<HuskKind>(["behemot"]);

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
  it("breaks nineteen of the twenty by writing alone", () => {
    for (const kind of KINDS) {
      if (NOT_BY_WRITING.has(kind)) continue;
      const at = breakIn(kind);
      expect(at, `${kind} cannot be broken by a Scribe who does nothing else`).toBeGreaterThan(-1);
      // And not after a siege: a creature that takes half a minute of perfect
      // play in an empty room is one nobody breaks in a room with a floor.
      expect(at, `${kind} took ${at} ticks`).toBeLessThan(900);
    }
  }, 600000);

  /**
   * **One, not two — and the second was a lie the shredder was telling.**
   *
   * This asserted that neither Leviathan nor Behemoth could be broken by a
   * station-keeping Scribe, and it passed. It passed for the wrong reason.
   * `breakIn` hands over all twenty-two letters, and Vav is among them, so
   * every mark it throws **draws** — which is exactly Leviathan's gate: out of
   * the water and only out of it, and the Hook is what puts it there. A Scribe
   * with the Hook pulling it ashore and then writing on it is not a loophole,
   * it is the fight the creature was authored for.
   *
   * What was actually happening: a piercing mark was not consumed by what it
   * hit and struck the same body every tick it was inside it, and an unopened
   * great one takes `struck = 12` from every blow instead of a shell. So the
   * thing was re-frozen sixty times a second and could never leave the water at
   * all. The creature read as unbreakable because it was being *held down*.
   *
   * Behemoth is the one whose gate is genuinely not a mark: it opens only while
   * stopped, and only a set stone stops it — Bet, a verb no amount of writing
   * substitutes for.
   */
  it("leaves Behemoth, whose gate is a stone and not a mark", () => {
    expect(breakIn("behemot"), "Behemoth is broken by writing, which is its whole gate").toBe(-1);
  }, 300000);

  /**
   * **And the water is a price rather than a gate**, which is the other half of
   * the same correction and is worth stating rather than inferring.
   *
   * Leviathan is not locked behind Vav: it comes out of the water at you, and a
   * Scribe with no Hook at all can wait and answer it — measured at a hundred
   * and twenty-two ticks against the four to thirty-five everything else in the
   * table takes. What the Hook buys is not permission but *time*, by dragging
   * it ashore instead of waiting for it to come. Asserted as a difference,
   * because the two numbers are exact and would have to be rewritten by any
   * retune that touched either.
   */
  it("makes Leviathan cost the water, and makes the Hook worth carrying", () => {
    const landed = breakIn("livyatan");
    const waited = breakIn("livyatan", 4000, ["cut", "flame"]);
    expect(landed, "Leviathan cannot be broken at all").toBeGreaterThan(-1);
    expect(waited, "Leviathan cannot be answered without the Hook").toBeGreaterThan(-1);
    // Slower than anything else in the table that is not underground, either way.
    expect(landed, `Leviathan is as cheap as an ordinary klipah (${landed})`).toBeGreaterThan(40);
    // And the Hook is worth a third of it, which is why a Scribe carries one.
    expect(landed, `the Hook buys nothing (${landed} against ${waited})`).toBeLessThan(waited * 0.8);
  }, 300000);

  /**
   * **The same fight, with the satchel the report was actually carrying.**
   *
   * `duel` had no way to hold a vessel until now and neither did anything else
   * in the suite — see the ceiling's note in `combat.ts`. Handed the three that
   * sharpen the nib, `markBite` comes to six, and without a ceiling that breaks
   * every kind in the table in **two words**, the Arbeh and Behemoth alike.
   *
   * Measured with the ceiling in: two words for the small ones, three for the
   * five-and-six-shell kinds, four to five for the great ones — against two,
   * three and five to six for the same Scribe carrying nothing. So the vessels
   * are still plainly worth walking for, and they are no longer the whole
   * answer, which is what "too easy in certain cases" was reporting.
   *
   * Asserted as a shape rather than as the numbers: a floor of two words on
   * everything, a floor of three on everything made of five shells or more, and
   * the satchel never worth more than half the fight. Any of the three failing
   * means the nib has gone back to being a skeleton key.
   */
  it("does not become a skeleton key when the satchel is full", () => {
    const SHARP = ["kulmus", "izmel", "mishkolet"];
    for (const kind of KINDS) {
      if (NOT_BY_WRITING.has(kind)) continue;
      const bare = duel(kind, 3000);
      const kit = duel(kind, 3000, SHARP);
      expect(kit.broke, `${kind} outlived a sharpened nib`).toBeGreaterThan(-1);
      expect(kit.marks, `${kind} came apart in ${kit.marks} word(s)`).toBeGreaterThan(1);
      if (HUSKS[kind].shells >= 5) {
        expect(kit.marks, `${kind} has ${HUSKS[kind].shells} shells and took ${kit.marks} words`)
          .toBeGreaterThan(2);
      }
      // And the sharpest satchel in the game may not more than halve the fight.
      expect(
        kit.marks,
        `${kind}: ${kit.marks} words with the satchel against ${bare.marks} without`,
      ).toBeGreaterThanOrEqual(bare.marks / 2);
    }
  }, 600000);
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

  /**
   * **The two that hold something, and the eighteen that hold nothing.**
   *
   * This asserted `reachable(kind) === 1` for all nineteen non-Korach kinds and
   * it passed — including for the Tannin, whose entire fight is that a mark does
   * not follow it under the water. It passed because `reachable` called
   * `outOfReach(husk)` with **no world**, and that argument is what the water is
   * read from. The one condition in this game that is not a great one's was
   * invisible to the one instrument built to see conditions.
   *
   * Measured now that it can be: **Korach 0.43, the Tannin 0.63**, everything
   * else a flat 1.00.
   *
   * **And a third joined them**, which is what the named set is for. *Slow, and
   * it does not stop, and stone is nothing to it* — the Nachash is the one kind
   * that uses `flies` to mean rock rather than air, and being unstopped by a
   * wall was implemented while the other half of the sentence was not: a mark
   * **is** stopped by the wall, so a serpent inside one is a serpent nothing can
   * reach. It reads **0.97** on the bench and takes a third off its share broken
   * on real ground, at no cost in lamps at all, because `harmful` opens by
   * returning false for anything out of reach.
   *
   * The bench could not see it either, and for the third time in this phase the
   * reason was the room: an empty box is this creature's dry stone. `BURROWERS`
   * puts a wall between it and the Scribe, exactly as `SWIMMERS` puts a pool.
   *
   * That flat 1.00 used to read as a triviality and is now the subject: eighteen
   * of the twenty kinds are open at every moment of their lives, and P14 is the
   * phase that changes it. So the assertion is kept exactly as strict, and the
   * set is named — a kind that gains a condition has to be added here on
   * purpose, with its number, rather than sliding under a band.
   */
  it("still lets the three that hide spend real time out of reach", () => {
    // If any of these ever reads 1, the earth has stopped opening, or the water
    // has stopped holding, or the wall has — and a fight has become a pacer
    // with a good name.
    expect(reachable("korach"), "Korach no longer hides at all").toBeLessThan(0.75);
    expect(reachable("tannin"), "the Tannin no longer holds the water").toBeLessThan(0.75);
    expect(reachable("nachash"), "the Nachash no longer holds the stone").toBeLessThan(0.99);
    for (const kind of KINDS) {
      if (kind === "korach" || kind === "tannin" || kind === "nachash") continue;
      expect(reachable(kind), `${kind} has started hiding`).toBe(1);
    }
  }, 600000);

  /**
   * **And the other half of the same question, which is not the same question.**
   *
   * `reachable` asks whether a mark *arrives*. This asks whether arriving
   * counts. A Korach inside the earth is not there to be hit; an unopened
   * Behemoth is very much there, and a blow staggers it and takes nothing —
   * which is not a technicality, it is exactly how Leviathan is dragged out of
   * the water by a Hook that never takes a shell off it.
   *
   * Measured through the shipped rule: **eighteen kinds open at every moment of
   * their lives**, Leviathan at 0.63, and Behemoth at **zero** on plain ground,
   * rising once a stone is set in front of it. That zero is the whole of that
   * fight and it had never been a number.
   *
   * The eighteen are the subject of P14 rather than a background fact, so they
   * are asserted at exactly 1 and the two exceptions are named. A kind that
   * gains a condition has to be taken out of this set on purpose.
   */
  it("opens the unconditional kinds at every moment, in every posture", () => {
    for (const kind of KINDS) {
      if (HUSKS[kind].opening !== "always") continue;
      for (const posture of POSTURES) {
        expect(openness(kind, 900, posture), `${kind} has started closing when ${posture}`).toBe(1);
      }
    }
    // Out of the water and only out of it — so it is open for the part of its
    // cycle it spends ashore, and that is neither none of it nor all of it.
    expect(openness("livyatan"), "Leviathan never comes ashore").toBeGreaterThan(0.2);
    expect(openness("livyatan"), "Leviathan no longer holds the water").toBeLessThan(0.9);
    // And the one whose gate is a stone: never open until the Scribe sets one.
    expect(openness("behemot"), "Behemoth opens without a stone being set").toBe(0);
    /**
     * **The Re'em, the first of the eighteen to be closed**, and the number is
     * the surprise worth keeping: it is shut for only **eight per cent** of its
     * life and that costs it more than eight per cent of its fight. Measured on
     * the bench, `breakIn` went from 18 ticks to 105 and 2 marks to 8, and the
     * duel began costing a lamp where it had cost none — because a window does
     * not have to be *narrow* to be hard, it has to be badly timed against a
     * mark's cooldown, and this one is: the creature charges precisely when the
     * Scribe is near enough to write on it.
     *
     * On real ground the fighting probe's share of Re'em broken went 22% to
     * 13%, which puts it among the four hardest kinds in the table rather than
     * outside it. Banded generously on both sides: shut enough to matter, open
     * enough not to be weather.
     */
    expect(openness("reem"), "the Re'em no longer shuts while it runs").toBeLessThan(0.99);
    expect(openness("reem"), "the Re'em has become weather rather than a fight").toBeGreaterThan(0.5);
    /**
     * **And the two P14e gave a cycle to**, both of which had to be asked in
     * the posture that provokes them or they answer "open, always":
     *
     * - the **Calf** does nothing whatever until it is struck, so only the
     *   `struck` posture ever sees it charge — 0.66 open there against 1.00
     *   everywhere else;
     * - the **Nefilim** does nothing until somebody is underneath, so only
     *   `under` sees it fall — 0.91 open there against 1.00 everywhere else.
     *
     * Asserted at their own postures, because asserting them at the default one
     * is how both read as unconditional for the whole of the sitting they were
     * written in.
     */
    /**
     * **And Rahav, the first whose condition is a reel rather than a charge**:
     * only the `struck` posture ever lands a blow, so only there does the
     * bench see it shut — 0.96 open on a 900-tick watch with one blow in it,
     * which is one 36-tick reel, exactly. Every other posture reads 1.00.
     * The number that carries the fight is `breakIn` (a volley of four rapid
     * words became four exchanges, 94 ticks), not this share.
     */
    expect(openness("rahav", 900, "struck"), "Rahav no longer reels from a blow")
      .toBeLessThan(0.99);
    expect(openness("calf", 1500, "struck"), "the Calf no longer commits to a run")
      .toBeLessThan(0.9);
    expect(openness("nefilim", 1500, "under"), "the Nefilim no longer commits to a fall")
      .toBeLessThan(0.99);
    expect(
      openness("behemot", 3000, "blocked"),
      "a set stone no longer stops Behemoth",
    ).toBeGreaterThan(0.5);
  }, 600000);

  /**
   * **A closed klipah may not also be a dangerous one** — the rule that decides
   * whether conditions are affordable at all, and it is measured rather than
   * asserted in a comment.
   *
   * The evidence is on the record: the first version of Korach's settling phase
   * handed the creature ninety extra ticks of *contact* along with ninety ticks
   * of being hittable, and the honest dash stopped arriving on one seed in six.
   * A klipah that cannot be answered and can still take a lamp is the shell
   * count raised without raising it — the probe throws on its cooldown, the
   * marks buy nothing, it stands there longer, and the lamps go.
   *
   * **It read zero for all twenty and it does not any more, which is this band
   * doing its job on the very first authored opening.** It was zero while
   * `answerable` asked only about *reach*, where `harmful` pairs the two by
   * construction; the moment `answerable` began asking about openings as well,
   * the Re'em came out at **0.08** — the share of its life it spends running a
   * charge that cannot be written on.
   *
   * So the claim was redrawn rather than the creature, because a klipah that is
   * unanswerable *while it commits to a run at you* is the fair and classical
   * shape: stand aside, it goes into the wall, and then you answer it. That is
   * this creature's own line. What the band has to forbid is not the moment but
   * the **proportion** — a klipah shut and dangerous for a third of its life is
   * weather rather than a fight, which is the Korach lesson the other way up.
   *
   * **And the quarter it was first drawn at was measured blind.** `unfair` had
   * a Scribe standing in one fixed place, so it never provoked a creature that
   * only commits when it is struck or stood under — the Re'em's own worst
   * posture reads **0.16**, twice the 0.08 the band was drawn from, and the
   * Calf and the Nefilim read a flat zero while carrying a cycle. It sweeps all
   * seven postures now and takes the worst, which is the only reading that
   * means anything.
   *
   * Measured that way: **calf 0.34 (struck), reem 0.16 (facing), nefilim 0.09
   * (under)**, every other kind 0.00. Drawn at **0.45** — clear of the worst by
   * about a third of itself, and still forbidding a creature that spends most
   * of its life unanswerable and dangerous, which is the thing the rule is for.
   * A charger unanswerable for a third of a regular cycle is a bull; one
   * unanswerable for two thirds is weather.
   *
   * **The great ones are outside it, and `answerable` says why.** Behemoth is
   * shut *precisely while it charges*, which is the one flat contradiction of
   * this rule in the game, and it ships and is right: an arena is one creature
   * and a whole room, the fight is to set a stone, and nothing about it is a
   * Scribe walking past on a tick budget. This band is about the ordinary rung.
   */
  it("keeps a klipah's unanswerable-and-dangerous phase short, in every posture", () => {
    for (const kind of KINDS) {
      for (const posture of POSTURES) {
        expect(
          unfair(kind, 900, posture),
          `${kind} spends too much of its life beyond a mark and still taking lamps, when ${posture}`,
        ).toBeLessThan(0.45);
      }
    }
  }, 900000);
});


/**
 * **And what can be hit must be visible — but not everything visible can be
 * hit**, which is the correction this describe block carries and the reason it
 * now asks two questions instead of one.
 *
 * Three separate places asked "is Korach in the ground?" and all three answered
 * it by reading `charging`, which counts only the rise: the mark loop, the
 * contact check, and the renderer. Fixing the first two and not the third would
 * have made the creature's one answerable moment its one *invisible* moment —
 * a player throwing at empty air where something is standing. So the rule was
 * given one home and the renderer was made to ask it.
 *
 * That was right about Korach and wrong as a law, because it welded two
 * questions together that only coincide for one creature. P7 then gave the
 * Tannin the water — `outOfReach` says no mark follows it there, which is that
 * creature's whole fight — and thereby **stopped it being painted while it was
 * in the water**: measured on its own bench, on screen for fifty-eight per cent
 * of its life, gone for the forty-two per cent a player would need to see it
 * coming. Nothing failed, because the coupling below was the only thing
 * watching and it was watching the wrong thing.
 *
 * The two questions come apart cleanly once they are asked apart. Korach inside
 * the earth is **not there**. The Tannin under the water **is** there and is
 * simply out of reach.
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

  /**
   * **The renderer's question, which is a different question.** Korach under
   * the earth is the only thing in the bestiary that is not there to be drawn;
   * everything else that a mark cannot reach is standing in plain sight, and
   * saying otherwise is how the Tannin lost half its life on screen.
   */
  it("hides a buried Korach, and hides nothing else at all", () => {
    expect(unseen(korach(0, 120))).toBe(true);
    expect(unseen(korach(20, 300))).toBe(false);
    expect(unseen(korach(0, 260))).toBe(false);
    for (const kind of Object.keys(HUSKS) as HuskKind[]) {
      if (kind === "korach") continue;
      expect(unseen({ ...korach(0, 0), kind }), `${kind} is not painted`).toBe(false);
    }
  });
});

/**
 * **The earth opens in the earth.**
 *
 * Reported from play as "the creature that comes out of the stone is stuck",
 * and it was not stuck in any geometry — `flies` means nothing in the world can
 * hold it. It was stuck in the *sky*. The eruption was placed at
 * `p.y + p.h + 2.5 tiles`, which is the surface exactly as long as the Scribe
 * is standing on something and is a point in mid-air the moment he is not; the
 * creature then rose to his height, entered the settling phase — deliberately
 * weightless, since gravity would drop a thing the rock does not hold straight
 * through the floor — and hung there motionless for ninety ticks.
 *
 * Every measurement the creature has ever been given was taken with a Scribe
 * standing still, which is why nothing caught it: **a Scribe is off the ground
 * for a good part of every rung**, and this is the posture no bench has.
 */
describe("Korach comes up out of the ground, wherever the Scribe is", () => {
  it("never stands still in the air under a jumping Scribe", () => {
    const { world, husk } = laid("korach");
    const ctx: StepContext = { verbs: [], graces: [] };
    const p = world.player;
    const floor = (world.height - 1) * TILE_SIZE;
    let surfaced = 0;
    let highest = 0;
    for (let t = 0; t < 900; t += 1) {
      p.vx = 0;
      p.vy = 0;
      p.lamps = 99;
      p.iframes = 0;
      p.x = husk.home.x;
      // Six tiles up, and held there — the top of a jump, stretched.
      p.y = floor - p.h - 6 * TILE_SIZE;
      step(world, NO_INPUT, ctx);
      // Out of the ground and no longer rising: the moment it is answerable,
      // and the moment it used to be hanging in the sky.
      if (unseen(husk) || husk.charging > 0) continue;
      surfaced += 1;
      highest = Math.max(highest, floor - (husk.y + husk.h));
    }
    expect(surfaced, "it never came up at all").toBeGreaterThan(100);
    // A quarter of a tile proud of the ground is where the rise leaves it, and
    // that is deliberate — it is the line a flat mark flies along. Six tiles is
    // the bug.
    expect(highest / TILE_SIZE, "it settled in the air").toBeLessThan(0.5);
  });

  /**
   * And where there is no earth, nothing opens. A Scribe on a vine over a
   * chasm is not standing on anything, and the honest answer is that the
   * creature stays under and keeps waiting — not that the ground appears.
   */
  it("does not open under a Scribe with nothing beneath him", () => {
    const { world, husk } = laid("korach");
    const ctx: StepContext = { verbs: [], graces: [] };
    const p = world.player;
    for (let t = 0; t < 900; t += 1) {
      p.vx = 0;
      p.vy = 0;
      p.lamps = 99;
      p.iframes = 0;
      p.x = husk.home.x;
      // Above the floor by more than the depth any earth is looked for in.
      p.y = 0;
      step(world, NO_INPUT, ctx);
      expect(husk.charging, "it erupted out of thin air").toBe(0);
    }
  });
});

/**
 * **The Tannin, seen in its own water** — the claim the coupling above used to
 * make impossible, made against the shipped step rather than against a shape.
 *
 * It is asserted as a *share of a life* rather than as "true at tick 40",
 * because what went wrong was not one frame: the creature was absent for every
 * tick it spent in the element it is authored to live in, and any single-tick
 * claim would have been about whichever tick was picked.
 */
describe("a klipah out of reach is still a klipah on screen", () => {
  it("paints the Tannin for the whole of its life, water and all", () => {
    const { world, husk } = laid("tannin");
    const ctx: StepContext = { verbs: [], graces: [] };
    const p = world.player;
    let painted = 0;
    let submerged = 0;
    const ticks = 900;
    for (let t = 0; t < ticks; t += 1) {
      p.vx = 0;
      p.vy = 0;
      p.lamps = 99;
      p.iframes = 0;
      p.x = 6 * TILE_SIZE;
      p.y = (world.height - 3) * TILE_SIZE;
      step(world, NO_INPUT, ctx);
      if (!unseen(husk)) painted += 1;
      if (outOfReach(husk, world)) submerged += 1;
    }
    // It spends a real part of its life unreachable — without which the claim
    // below is about a creature that never went in the water.
    expect(submerged, "the Tannin never went under").toBeGreaterThan(ticks * 0.2);
    expect(painted, "the Tannin is not drawn while it is in the water").toBe(ticks);
  });
});

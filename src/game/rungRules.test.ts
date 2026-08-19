import { describe, expect, it } from "vitest";
import { HUSKS } from "./combat";
import { VEIL_COST } from "./encounter";
import { lettersOnEntering, regions } from "./regions";
import { RUNG_RULES, rungRule } from "./rungRules";
import { TREE_PATHS } from "./tree";
import { buildArena, buildPath, buildRegion, regionOfPath, setTile, tileAt } from "./world/build";
import { step, type StepContext } from "./world/step";
import { Tile, TILE_SIZE } from "./world/tiles";
import { NO_INPUT } from "./world/types";

describe("the question of the rung", () => {
  it("asks ten distinct questions, each actually a question", () => {
    const questions = regions.map((r) => r.question);
    expect(questions).toHaveLength(10);
    for (const [i, q] of questions.entries()) {
      expect(q.length, `${regions[i].name} has no real question`).toBeGreaterThan(20);
      expect(q.endsWith("?"), `${regions[i].name}'s question does not ask`).toBe(true);
    }
    expect(new Set(questions).size, "two rungs ask the same thing").toBe(10);
  });

  /**
   * **The destination's, on every path** — spread after `...lower` in
   * `regionOfPath` so the blend cannot average it away, the `index`
   * precedent: a path's question is where it is going.
   */
  it("surfaces the destination's question on every path of the Tree", () => {
    for (const path of TREE_PATHS) {
      const region = regionOfPath(path);
      const upper = regions.find((r) => r.sefirah === path.ends[1])!;
      expect(region.question, `${path.id} asks the wrong end's question`).toBe(upper.question);
    }
  });
});

describe("the rungs' own rules — filled one slice at a time", () => {
  /**
   * **The named list — the conditional-list discipline.** Each P15-R slice
   * replaces exactly one null by hand, here, with a person deciding it.
   * Malchut's null is load-bearing (the kingdom's rule is the taught opening)
   * and Keter's is likely permanent (the crown's rule is the presentation);
   * when a slice lands, its Sefirah moves from the null side of this list to
   * a named assertion of what its rule says.
   *
   * Ruled so far: **netzach** (P15-R1 — the shrines are cold), **gevurah**
   * (P15-R2 — the throws are rationed), **yesod** (P15-R3 — a set stone is
   * founded), **hod** (P15-R4 — the shrines give back), **chesed**
   * (P15-R5 — a sealed door opens to a gift), and **binah** (P15-R6 — the
   * lies are laid bare).
   */
  it("holds every rung at null until a slice fills it on purpose", () => {
    const ruled = Object.entries(RUNG_RULES)
      .filter(([, rule]) => rule !== null)
      .map(([sefirah]) => sefirah)
      .sort();
    expect(ruled).toEqual(["binah", "chesed", "gevurah", "hod", "netzach", "yesod"]);
    const filled = new Set(ruled);
    for (const region of regions) {
      if (filled.has(region.sefirah)) continue;
      expect(rungRule(region.sefirah), `${region.name} grew a rule without a slice`).toBeNull();
    }
  });

  it("names every filled rule to the player, and its knobs speak too", () => {
    for (const [sefirah, rule] of Object.entries(RUNG_RULES)) {
      if (!rule) continue;
      expect(rule.says.length, `${sefirah}'s rule has no real line`).toBeGreaterThan(20);
      if (rule.shrinesCold !== undefined) {
        expect(rule.shrinesCold.length, `${sefirah}'s cold shrine says nothing`).toBeGreaterThan(20);
        expect(rule.shrinesCold).not.toBe(rule.says);
      }
      if (rule.marksRationed !== undefined) {
        expect(rule.marksRationed.spent.length, `${sefirah}'s spent ration says nothing`).toBeGreaterThan(20);
        expect(rule.marksRationed.spent).not.toBe(rule.says);
      }
      if (rule.shrinesRelight !== undefined) {
        expect(rule.shrinesRelight.length, `${sefirah}'s relight says nothing`).toBeGreaterThan(20);
        expect(rule.shrinesRelight).not.toBe(rule.says);
      }
      if (rule.stonesFounded !== undefined) {
        for (const line of [rule.stonesFounded.set, rule.stonesFounded.kept]) {
          expect(line.length, `${sefirah}'s founding says nothing`).toBeGreaterThan(20);
          expect(line).not.toBe(rule.says);
        }
        expect(rule.stonesFounded.set).not.toBe(rule.stonesFounded.kept);
      }
      if (rule.liesLaidBare !== undefined) {
        expect(rule.liesLaidBare.revealed.length, `${sefirah}'s laid-bare line says nothing`).toBeGreaterThan(20);
        expect(rule.liesLaidBare.revealed).not.toBe(rule.says);
      }
      if (rule.sealOpensTo !== undefined) {
        for (const line of [rule.sealOpensTo.given, rule.sealOpensTo.wanting]) {
          expect(line.length, `${sefirah}'s gift says nothing`).toBeGreaterThan(20);
          expect(line).not.toBe(rule.says);
        }
        expect(rule.sealOpensTo.given).not.toBe(rule.sealOpensTo.wanting);
      }
    }
  });

  /**
   * **The ration is generous, held to the measurement it was chosen by.**
   * The fighting probe was run over all three gevurah-bound paths and eight
   * seeds before the number was picked: no run that broke anything needed
   * more than **31** throws, and the only runs past sixty were sprays of
   * 286–389 marks that broke nothing. A retune that brings the ration down
   * near what an honest fight actually costs has to come through here — the
   * floor is half again the dearest honest fight, so a generous ration can
   * be a round number and a mean one cannot pass unnoticed.
   */
  it("rations Gevurah well clear of the dearest honest fight", () => {
    const ration = RUNG_RULES.gevurah?.marksRationed;
    expect(ration).toBeDefined();
    expect(ration!.count).toBeGreaterThanOrEqual(Math.ceil(31 * 1.5));
  });
});

describe("the rule is keyed to the destination — `World.toward`", () => {
  /**
   * The plumbing pin: `buildPath` writes the walked path's **upper** end onto
   * the world *after* paint, so the generator's draws can never see it — a
   * rule may change behaviour, never a tile. An arena never sets it, which is
   * what keeps a guardian's room outside every rung rule by construction.
   */
  it("every path's world carries its upper end, and an arena carries none", () => {
    for (const path of TREE_PATHS) {
      const world = buildPath(path, 7, lettersOnEntering(regionOfPath(path).index));
      expect(world.toward, `${path.id} does not say where it is going`).toBe(path.ends[1]);
    }
    expect(buildArena("netzach").toward).toBeUndefined();
  });
});

describe("P15-R1 — Netzach: the shrines are cold", () => {
  /** The flat shrine room, in `verbUses.test.ts`'s idiom: Yesod's ground
   * (the kingdom keeps no shrine), with the destination set by hand so the
   * seam is tested directly — the plumbing test above covers `buildPath`
   * setting it. */
  function shrineRoom(toward?: "netzach" | "hod") {
    const world = buildRegion(2, 5);
    world.toward = toward;
    const shrine = world.entities.find((e) => e.kind === "mark");
    expect(shrine).toBeDefined();
    if (shrine) {
      world.player.x = shrine.x;
      world.player.y = shrine.y;
    }
    return { world, shrine };
  }

  const ctx: StepContext = { verbs: ["mark"], graces: [] };

  it("does not answer on netzach-bound ground, whatever the hand holds", () => {
    const { world, shrine } = shrineRoom("netzach");
    const before = { ...world.respawn };
    step(world, NO_INPUT, ctx);
    expect(shrine?.active, "a cold shrine lit up").toBeFalsy();
    expect(world.respawn).toEqual(before);
    expect(world.marksSet).toBe(0);
    expect(world.verbUses.mark, "a refusal spent the verb").toBeUndefined();
    expect(world.message?.text).toBe(RUNG_RULES.netzach?.shrinesCold);
  });

  it("answers on any other road — the rule, not the field, is what is cold", () => {
    const { world, shrine } = shrineRoom("hod");
    step(world, NO_INPUT, ctx);
    expect(shrine?.active).toBe(true);
    expect(world.respawn.x).toBe(shrine?.x);
    expect(world.marksSet).toBe(1);
  });

  it("answers where there is no destination at all — an arena, an old room", () => {
    const { world, shrine } = shrineRoom(undefined);
    step(world, NO_INPUT, ctx);
    expect(shrine?.active).toBe(true);
    expect(world.respawn.x).toBe(shrine?.x);
  });
});

describe("P15-R2 — Gevurah: the throws are rationed", () => {
  /** An empty room to write in — nothing to hit, nothing to interrupt. */
  function penRoom(toward?: "gevurah" | "hod") {
    const world = buildRegion(2, 5);
    world.entities = [];
    world.husks = [];
    world.toward = toward;
    return world;
  }
  const strike = { ...NO_INPUT, strike: true };
  const ctx: StepContext = { verbs: [], graces: [] };
  const ration = RUNG_RULES.gevurah!.marksRationed!;

  it("counts a mark at the moment it flies, and not a press the cooldown eats", () => {
    const world = penRoom("hod");
    step(world, strike, ctx);
    expect(world.marksThrown).toBe(1);
    expect(world.marks.filter((m) => m.mine)).toHaveLength(1);
    // Held through the cooldown: nothing more flies, nothing more counts.
    for (let t = 0; t < 5; t += 1) step(world, strike, ctx);
    expect(world.marksThrown).toBe(1);
  });

  it("says the spent line on the throw that spends the last of the ration", () => {
    const world = penRoom("gevurah");
    world.marksThrown = ration.count - 1;
    step(world, strike, ctx);
    expect(world.marksThrown).toBe(ration.count);
    expect(world.marks.filter((m) => m.mine), "the last rationed mark must still fly").toHaveLength(1);
    expect(world.message?.text).toBe(ration.spent);
  });

  it("refuses the press after the ration — no mark, no cooldown, the reason said", () => {
    const world = penRoom("gevurah");
    world.marksThrown = ration.count;
    step(world, strike, ctx);
    expect(world.marks.filter((m) => m.mine)).toHaveLength(0);
    expect(world.marksThrown).toBe(ration.count);
    expect(world.player.markCooldown, "a refused press must not start the cooldown").toBe(0);
    expect(world.message?.text).toBe(ration.spent);
  });

  it("rations only the road to Gevurah — any other destination writes freely", () => {
    const world = penRoom("hod");
    world.marksThrown = ration.count + 100;
    step(world, strike, ctx);
    expect(world.marks.filter((m) => m.mine)).toHaveLength(1);
  });

  it("never rations an arena — a guardian fight is not a road", () => {
    // Gevurah's own arena, which is the sharpest case: the place named for
    // severity still lets the fight be fought. An arena never sets `toward`.
    const world = buildArena("gevurah");
    world.husks = [];
    world.marksThrown = ration.count + 100;
    step(world, strike, ctx);
    expect(world.toward).toBeUndefined();
    expect(world.marks.filter((m) => m.mine)).toHaveLength(1);
  });
});

describe("P15-R6 — Binah: the lies are laid bare", () => {
  const bare = RUNG_RULES.binah!.liesLaidBare!;
  const ctx: StepContext = { verbs: [], graces: [] };

  /** A figured stone written under the standing body itself — `breakMaskit`
   * fires on weight, so the very next step is the trap's own moment. The
   * pool is pinned to Cain so the spring's pacer is deterministic. */
  function liarsFloor(toward: "binah" | "hod" | "keter", revealed: boolean) {
    const world = buildRegion(2, 5);
    world.entities = [];
    world.husks = [];
    world.klipot = ["cain"] as never;
    world.toward = toward;
    const p = world.player;
    for (let t = 0; t < 240 && !p.onGround; t += 1) step(world, NO_INPUT, ctx);
    expect(p.onGround, "the body never landed on the liar's floor").toBe(true);
    world.revealed = revealed;
    const tx = Math.floor((p.x + p.w / 2) / TILE_SIZE);
    const ty = Math.floor((p.y + p.h + 1) / TILE_SIZE);
    setTile(world, tx, ty, Tile.Maskit);
    return { world, tx, ty };
  }

  it("bears the Scribe once the Eye is open — no give-way, no pacer, no mend", () => {
    const { world, tx, ty } = liarsFloor("binah", true);
    step(world, NO_INPUT, ctx);
    expect(tileAt(world, tx, ty), "a seen lie gave way").toBe(Tile.Maskit);
    expect(world.husks).toHaveLength(0);
    expect(world.mending).toHaveLength(0);
  });

  it("still springs on an unopened eye — tier two is earned, not given", () => {
    const { world, tx, ty } = liarsFloor("binah", false);
    step(world, NO_INPUT, ctx);
    expect(tileAt(world, tx, ty)).toBe(Tile.Empty);
    expect(world.mending).toHaveLength(1);
    expect(world.husks).toHaveLength(1);
    expect(world.message?.text).toContain("under the stone");
  });

  it("springs on any other road, Eye open or not", () => {
    const { world, tx, ty } = liarsFloor("hod", true);
    step(world, NO_INPUT, ctx);
    expect(tileAt(world, tx, ty)).toBe(Tile.Empty);
  });

  it("springs on binah-keter ground — the rule follows the destination", () => {
    // The sharpest other-road there is: a path *touching* Binah whose
    // destination is the crown. `world.toward` there is keter, and Keter
    // keeps its lies.
    const { world, tx, ty } = liarsFloor("keter", true);
    step(world, NO_INPUT, ctx);
    expect(tileAt(world, tx, ty)).toBe(Tile.Empty);
  });

  it("gives the Eye's opening the rung's own words on bound ground", () => {
    const world = buildRegion(2, 5);
    world.entities = [];
    world.husks = [];
    world.toward = "binah";
    const eye: StepContext = { verbs: ["reveal"], graces: [] };
    for (let t = 0; t < 240 && !world.player.onGround; t += 1) step(world, NO_INPUT, eye);
    step(world, { ...NO_INPUT, act: true }, eye);
    expect(world.revealed).toBe(true);
    expect(world.message?.text).toBe(bare.revealed);
  });

  it("keeps Or HaGanuz everywhere else", () => {
    const world = buildRegion(2, 5);
    world.entities = [];
    world.husks = [];
    world.toward = "hod";
    const eye: StepContext = { verbs: ["reveal"], graces: [] };
    for (let t = 0; t < 240 && !world.player.onGround; t += 1) step(world, NO_INPUT, eye);
    step(world, { ...NO_INPUT, act: true }, eye);
    expect(world.revealed).toBe(true);
    expect(world.message?.text).toBe("Or HaGanuz — the hidden stone stands revealed.");
  });
});

describe("P15-R5 — Chesed: a sealed door opens to a gift", () => {
  const gift = RUNG_RULES.chesed!.sealOpensTo!;

  /**
   * A sealed door arranged by hand: the player's own room given a door whose
   * one tile is a written `Tile.Seal` beside the Scribe at foot height —
   * inside `nearestTile`'s reach, exactly where `stepRooms` writes them. The
   * entrance flag is cleared so the fixture is genuinely sealable, which the
   * control test proves rather than assumes.
   */
  const kneel = { ...NO_INPUT, down: true, act: true };
  const ctx: StepContext = { verbs: [], graces: [] };

  /**
   * Two lessons this fixture had to learn are its shape. The room must hold
   * a **live door-holder always** — `stepRooms`'s quiet branch erases a seal
   * the moment nothing holds the room, so a holderless fixture unseals
   * itself on the first tick and every assertion after it is about the
   * wrong world. And it must **settle one tick** before anything kneels:
   * `p.crouching` reads the previous tick's `onGround`, which a
   * freshly-built player has not earned yet. The holder is a charger far
   * off but registered to the room — `holding` reads the registry, never
   * positions.
   */
  function sealedDoor(toward?: "chesed" | "hod") {
    const world = buildRegion(2, 5);
    world.entities = [];
    world.toward = toward;
    const p = world.player;
    const room = world.rooms[world.roomIndex];
    expect(room).toBeDefined();
    room.entrance = false;
    const spec = HUSKS.esav;
    world.husks = [{
      id: "h-holder", kind: "esav" as const,
      x: p.x + TILE_SIZE * 40, y: p.y,
      w: spec.size.w, h: spec.size.h, vx: 0, vy: 0, facing: -1 as const,
      home: { x: p.x + TILE_SIZE * 40, y: p.y },
      shells: spec.shells, cooldown: 0, charging: 0, struck: 0,
    }];
    room.husks.push("h-holder");
    // Land first, place second: a freshly-built body falls for dozens of
    // ticks before it meets its floor, `p.crouching` reads the previous
    // tick's ground contact, and the seal must stand at the *landed* feet
    // row or the kneel reaches for a tile two storeys up.
    for (let t = 0; t < 240 && !p.onGround; t += 1) step(world, NO_INPUT, ctx);
    expect(p.onGround, "the body never landed to kneel from").toBe(true);
    const tx = Math.floor((p.x + p.w / 2) / TILE_SIZE) + p.facing;
    const ty = Math.floor((p.y + p.h - 1) / TILE_SIZE);
    room.doors.push({ side: "right", tiles: [{ x: tx, y: ty }] });
    setTile(world, tx, ty, Tile.Seal);
    world.or = 10;
    return { world, room, tx, ty };
  }

  it("opens to the gift — light spent, door open, room latched, nothing broken", () => {
    const { world, room, tx, ty } = sealedDoor("chesed");
    step(world, kneel, ctx);
    expect(world.or).toBe(10 - gift.price);
    expect(tileAt(world, tx, ty)).toBe(Tile.Empty);
    expect(room.cleared, "the gift must latch the room open").toBe(true);
    expect(world.message?.text).toBe(gift.given);
    expect(world.husks[0].broken, "the gift leaves what held the door standing").toBeFalsy();
    // The latch holds: the holder still stands, and the seal does not return.
    for (let t = 0; t < 6; t += 1) step(world, NO_INPUT, ctx);
    expect(tileAt(world, tx, ty)).toBe(Tile.Empty);
  });

  it("re-seals without the gift — the fixture is honest, the latch is real", () => {
    // The control: same room, same holder, door tile emptied by hand rather
    // than given open. `stepRooms` writes the seal back, which is exactly
    // what the latch exists to stop.
    const { world, tx, ty } = sealedDoor("chesed");
    setTile(world, tx, ty, Tile.Empty);
    for (let t = 0; t < 6; t += 1) step(world, NO_INPUT, ctx);
    expect(tileAt(world, tx, ty), "the control room never resealed — the latch test is vacuous").toBe(Tile.Seal);
  });

  it("wants what it wants — short of light, nothing is spent and the door stands", () => {
    const { world, room, tx, ty } = sealedDoor("chesed");
    world.or = gift.price - 1;
    step(world, kneel, ctx);
    expect(world.or).toBe(gift.price - 1);
    expect(tileAt(world, tx, ty)).toBe(Tile.Seal);
    expect(room.cleared).toBe(false);
    expect(world.message?.text).toBe(gift.wanting);
  });

  it("opens only to a kneeling hand — standing act gives nothing", () => {
    // The crouch gate is the claim that keeps every probe honest: the
    // fighter presses act while grounded but crouches never, so no
    // instrument can buy its way out of a fight.
    const { world, tx, ty } = sealedDoor("chesed");
    step(world, { ...NO_INPUT, act: true }, ctx);
    expect(world.or).toBe(10);
    expect(tileAt(world, tx, ty)).toBe(Tile.Seal);
  });

  it("gives nothing on any other road", () => {
    const { world, tx, ty } = sealedDoor("hod");
    step(world, kneel, ctx);
    expect(world.or).toBe(10);
    expect(tileAt(world, tx, ty)).toBe(Tile.Seal);
  });

  /**
   * **The price is a trade, held to the numbers it was chosen against**: a
   * door-holding klipah pays 3–6 light broken and a room holds one to three,
   * so force earns roughly 4–15 a room; a veiling costs `VEIL_COST`. The
   * gift must cost more than dying and no more than the dearest fight would
   * have paid — inside that band it is generosity, outside it it is either
   * free or a fine.
   */
  it("prices the gift above a veiling and inside what force would earn", () => {
    expect(gift.price).toBeGreaterThan(VEIL_COST);
    expect(gift.price).toBeLessThanOrEqual(15);
  });
});

describe("P15-R4 — Hod: the shrines give back", () => {
  function altarRoom(toward: "hod" | "tiferet", lamps: number) {
    const world = buildRegion(2, 5);
    world.toward = toward;
    world.player.lamps = lamps;
    const shrine = world.entities.find((e) => e.kind === "mark");
    expect(shrine).toBeDefined();
    if (shrine) {
      world.player.x = shrine.x;
      world.player.y = shrine.y;
    }
    return { world, shrine };
  }
  const relight = RUNG_RULES.hod!.shrinesRelight!;
  const ctx: StepContext = { verbs: ["mark"], graces: [] };

  it("relights the lamps when the mark is set with some gone out", () => {
    const { world, shrine } = altarRoom("hod", 1);
    step(world, NO_INPUT, ctx);
    expect(shrine?.active).toBe(true);
    expect(world.marksSet).toBe(1);
    expect(world.respawn.x).toBe(shrine?.x);
    expect(world.player.lamps).toBe(3);
    expect(world.message?.text).toBe(relight);
  });

  it("says the ordinary line to a hand whose lamps are all burning", () => {
    // What was not taken cannot be given back.
    const { world, shrine } = altarRoom("hod", 3);
    step(world, NO_INPUT, ctx);
    expect(shrine?.active).toBe(true);
    expect(world.player.lamps).toBe(3);
    expect(world.message?.text).toBe("Your mark is set here.");
  });

  it("offers nothing without Tav — the gift rides the answer, not the visit", () => {
    const { world, shrine } = altarRoom("hod", 1);
    step(world, NO_INPUT, { verbs: [], graces: [] });
    expect(shrine?.active).toBeFalsy();
    expect(world.player.lamps).toBe(1);
  });

  it("gives nothing back on any other road — the mark alone is the answer", () => {
    const { world, shrine } = altarRoom("tiferet", 1);
    step(world, NO_INPUT, ctx);
    expect(shrine?.active).toBe(true);
    expect(world.player.lamps).toBe(1);
    expect(world.message?.text).toBe("Your mark is set here.");
  });
});

describe("P15-R3 — Yesod: a set stone is founded", () => {
  function masonRoom(toward?: "yesod" | "hod") {
    const world = buildRegion(2, 5);
    world.entities = [];
    world.husks = [];
    world.toward = toward;
    return world;
  }
  const act = { ...NO_INPUT, act: true };
  const ctx: StepContext = { verbs: ["block"], graces: [] };
  const founded = RUNG_RULES.yesod!.stonesFounded!;
  /** Where `toggleStone` lays: beside the Scribe, at the height of the feet. */
  const besides = (world: ReturnType<typeof masonRoom>) => ({
    tx: Math.floor((world.player.x + world.player.w / 2) / TILE_SIZE) + world.player.facing,
    ty: Math.floor((world.player.y + world.player.h - 1) / TILE_SIZE),
  });

  it("lays a ledge, not a wall — it will bear a body and bar nothing", () => {
    const world = masonRoom("yesod");
    const { tx, ty } = besides(world);
    step(world, act, ctx);
    expect(tileAt(world, tx, ty)).toBe(Tile.Ledge);
    expect(world.placed).toHaveLength(1);
    expect(world.verbUses.block).toBe(1);
    expect(world.message?.text).toBe(founded.set);
  });

  it("refuses the recall — nothing founded returns to the hand", () => {
    const world = masonRoom("yesod");
    const { tx, ty } = besides(world);
    step(world, act, ctx);
    for (let t = 0; t < 4; t += 1) step(world, NO_INPUT, ctx);
    step(world, act, ctx);
    expect(tileAt(world, tx, ty), "the founded stone was taken back").toBe(Tile.Ledge);
    expect(world.placed).toHaveLength(1);
    expect(world.message?.text).toBe(founded.kept);
  });

  it("has no limit — every stone set on this road stands, all of them", () => {
    // The ordinary hand holds one stone (two with the grace); a founding that
    // kept the limit would break the set-and-set screens, whose crossing is
    // two placements. Unlimited is load-bearing, not generosity.
    const world = masonRoom("yesod");
    const first = besides(world);
    step(world, act, ctx);
    world.player.x += TILE_SIZE * 3;
    const second = besides(world);
    step(world, act, ctx);
    world.player.x += TILE_SIZE * 3;
    step(world, act, ctx);
    expect(world.placed).toHaveLength(3);
    expect(tileAt(world, first.tx, first.ty)).toBe(Tile.Ledge);
    expect(tileAt(world, second.tx, second.ty)).toBe(Tile.Ledge);
  });

  it("keeps the ordinary stone on any other road — solid, recallable, limited", () => {
    const world = masonRoom("hod");
    const { tx, ty } = besides(world);
    step(world, act, ctx);
    expect(tileAt(world, tx, ty)).toBe(Tile.Placed);
    // The limit holds: a second set elsewhere takes the first back out.
    world.player.x += TILE_SIZE * 3;
    step(world, act, ctx);
    expect(world.placed).toHaveLength(1);
    expect(tileAt(world, tx, ty)).toBe(Tile.Empty);
  });

  it("keeps the ordinary stone in an arena — a fight's stone is a shield", () => {
    // A founded ledge bars nothing, and a shield that bars nothing is no
    // shield — so the place this must never apply is a guardian's room.
    const world = buildArena("yesod");
    world.husks = [];
    const { tx, ty } = besides(world);
    if (tileAt(world, tx, ty) !== Tile.Empty) world.player.x += TILE_SIZE * 2;
    const spot = besides(world);
    step(world, act, ctx);
    expect(world.toward).toBeUndefined();
    expect(tileAt(world, spot.tx, spot.ty)).toBe(Tile.Placed);
  });
});

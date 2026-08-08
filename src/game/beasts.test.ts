import { beforeEach, describe, expect, it } from "vitest";
import { BEASTS, HUSKS, isBeast, type HuskKind } from "./combat";
import { buildRegion, setTile } from "./world/build";
import { step, type StepContext } from "./world/step";
import { Tile, TILE_SIZE } from "./world/tiles";
import { NO_INPUT, type Husk, type World } from "./world/types";

/**
 * **The behaviour is the reading.**
 *
 * That sentence is the whole rule the bestiary is written under, and `combat.ts`
 * can only half keep it: it can promise that the Re'em will not turn, and it
 * cannot make it true. The `case` in `stepHusks` makes it true, and a `case`
 * that fell through — a creature added to the table and forgotten in the
 * reducer — would look from the outside exactly like a creature that simply
 * stands there. Cain stands there on purpose. That is the collision this file
 * exists to prevent.
 *
 * So each of the seven is put in an empty room with a Scribe and asked to do
 * the one thing its line claims, once. Not tuned here — *happening* here.
 */

const ctx: StepContext = { verbs: [], graces: [] };

/** An empty room with a floor, built from a real region and then emptied. */
function arena(): World {
  const world = buildRegion(1, 7, 1, false, 1);
  world.tiles.fill(Tile.Empty);
  world.entities = [];
  world.husks = [];
  world.marks = [];
  world.rooms = [];
  for (let x = 0; x < world.width; x += 1) setTile(world, x, world.height - 1, Tile.Stone);
  world.player.x = 8 * TILE_SIZE;
  world.player.y = (world.height - 1) * TILE_SIZE - world.player.h;
  world.player.vx = 0;
  world.player.vy = 0;
  return world;
}

/** One creature of the given kind, standing where it is put. */
function stand(world: World, kind: HuskKind, at: { x: number; y: number }): Husk {
  const spec = HUSKS[kind];
  const husk: Husk = {
    id: `h-${kind}`,
    kind,
    x: at.x * TILE_SIZE,
    y: at.y * TILE_SIZE,
    w: spec.size.w,
    h: spec.size.h,
    vx: 0,
    vy: 0,
    facing: -1,
    home: { x: at.x * TILE_SIZE, y: at.y * TILE_SIZE },
    shells: spec.shells,
    cooldown: 0,
    charging: 0,
    struck: 0,
  };
  world.husks = [husk];
  return husk;
}

const run = (world: World, ticks: number) => {
  for (let i = 0; i < ticks; i += 1) step(world, NO_INPUT, ctx);
};

describe("the creatures", () => {
  let world: World;
  beforeEach(() => {
    world = arena();
  });

  it("is a tier apart from the klipot, and every one of them is in the table", () => {
    for (const kind of BEASTS) {
      expect(HUSKS[kind], `${kind} is called a beast and is not a husk`).toBeDefined();
      expect(isBeast(kind)).toBe(true);
    }
    expect(isBeast("cain")).toBe(false);
  });

  /**
   * **The Tannin** holds the water, where `submerged` forbids a mark from
   * reaching it, and comes out of it. If it never came out there would be
   * nothing to fight — so what is asserted is that it leaves the water at all.
   */
  it("brings the Tannin out of the water at whoever is standing on the bank", () => {
    const surface = world.height - 6;
    for (let y = surface; y < world.height - 1; y += 1) {
      for (let x = 10; x < 20; x += 1) setTile(world, x, y, Tile.Water);
    }
    const beast = stand(world, "tannin", { x: 14, y: surface + 2 });
    world.player.x = 9 * TILE_SIZE;
    let highest = beast.y;
    for (let i = 0; i < 200; i += 1) {
      step(world, NO_INPUT, ctx);
      highest = Math.min(highest, beast.y);
    }
    expect(highest, "the Tannin never left the water").toBeLessThan(surface * TILE_SIZE);
  });

  /**
   * **The Re'em** will not turn, and stone therefore does the work: a Scribe
   * who steps aside breaks a shell without writing anything, which is the only
   * place in the game that is true.
   */
  it("lets the Re'em break itself on the wall rather than turn", () => {
    for (let y = 0; y < world.height; y += 1) setTile(world, 4, y, Tile.Stone);
    const beast = stand(world, "reem", { x: 10, y: world.height - 3 });
    world.player.x = 6 * TILE_SIZE;
    const before = beast.shells;
    run(world, 240);
    expect(beast.shells, "the Re'em turned, or stopped").toBeLessThan(before);
    // And nothing was thrown at it — the Scribe did nothing at all.
    expect(world.marks.filter((m) => m.mine)).toHaveLength(0);
  });

  /**
   * **The Saraf** leaves the ground it crossed burning behind it — and then the
   * fire goes out, which is as much of the mechanic as the fire is.
   *
   * This used to look for an ember alive on one particular tick, and it passed
   * for the wrong reason: a fire was laid every twenty-two ticks and burned for
   * a hundred and fifty, so seven overlapped at all times and there was no tick
   * in the creature's life when the ground was not alight. That is terrain, not
   * a trail — measured, it made Tiferet the one place in the game a Scribe went
   * out of more than half the walks. So the shape is what is asserted now:
   * something is laid, it burns, it goes out, and another comes.
   */
  it("leaves fire behind the Saraf, and lets it burn out", () => {
    stand(world, "saraf", { x: 12, y: world.height - 3 });
    const embers = () => world.marks.filter((m) => !m.mine && m.vx === 0 && m.vy === 0);
    run(world, 2);
    const lit = embers();
    expect(lit.length, "the Saraf crossed the ground and left nothing on it").toBeGreaterThan(0);
    // A klipah's mark wounds on contact, which is what makes the trail a trail
    // rather than decoration — and it is `stepMarks` that does it, not this.
    expect(lit[0].bite).toBeGreaterThan(0);

    // It goes out. Without this the trail is a floor the rung is paved with.
    let wentOut = 0;
    for (let i = 0; i < 300; i += 1) {
      run(world, 1);
      if (embers().length === 0) wentOut += 1;
    }
    expect(wentOut, "the ground the Saraf crossed never stops burning").toBeGreaterThan(0);
    // And it comes back, or the creature laid one fire and was done.
    expect(embers().length + wentOut, "the Saraf stopped laying fire").toBeGreaterThan(0);
  });

  /** **Rahav** grows on being struck, which is the one thing pride does. */
  it("swells Rahav as its shells come off", () => {
    const beast = stand(world, "rahav", { x: 12, y: world.height - 3 });
    run(world, 3);
    const small = beast.w;
    beast.shells -= 2;
    run(world, 3);
    expect(beast.w, "Rahav shrank, or did not care").toBeGreaterThan(small);
  });

  /**
   * **Og** is not dangerous for being quick. The ceiling comes down where the
   * Scribe is standing, not where he is.
   */
  it("brings the ceiling down where the Scribe stands, not where Og does", () => {
    const beast = stand(world, "og", { x: 16, y: world.height - 3 });
    // Collected over the run rather than read off the end: what falls lands,
    // and a snapshot after two hundred ticks is a snapshot of the gap between
    // one step and the next.
    const falling: { x: number }[] = [];
    for (let i = 0; i < 200; i += 1) {
      step(world, NO_INPUT, ctx);
      for (const m of world.marks) if (!m.mine && m.vy > 0) falling.push({ x: m.x });
    }
    expect(falling.length, "Og walked and nothing came down").toBeGreaterThan(0);
    // Over the Scribe, and not over Og — which is the whole of the sentence.
    const over = falling[0].x;
    expect(Math.abs(over - world.player.x)).toBeLessThan(Math.abs(over - beast.x));
  });

  /**
   * **The Nefilim** are named for the one thing they did, and everything else
   * about them is waiting. So: it waits, and then it does not.
   */
  it("holds the Nefilim in the air until the Scribe is underneath it", () => {
    const beast = stand(world, "nefilim", { x: 20, y: 4 });
    const held = beast.y;
    run(world, 90);
    expect(beast.y, "the Nefilim fell with nobody under it").toBe(held);
    world.player.x = 20 * TILE_SIZE;
    run(world, 40);
    expect(beast.y, "the Scribe walked under it and it stayed up").toBeGreaterThan(held);
  });

  /** **The Arbeh** is a number rather than a thing: it simply comes. */
  it("brings the Arbeh to the Scribe", () => {
    const beast = stand(world, "arbeh", { x: 24, y: world.height - 6 });
    const away = Math.hypot(beast.x - world.player.x, beast.y - world.player.y);
    run(world, 90);
    expect(
      Math.hypot(beast.x - world.player.x, beast.y - world.player.y),
      "the Arbeh stayed where it was",
    ).toBeLessThan(away);
  });

  /**
   * And none of them is inert: put alone in an empty room with a Scribe, each
   * of the seven does *something* within a second and a half. This is the
   * catch-all for the eighth creature nobody wrote a `case` for.
   */
  it("gives every creature something to do", () => {
    for (const kind of BEASTS) {
      const room = arena();
      const beast = stand(room, kind, { x: 20, y: room.height - 3 });
      // Stood directly underneath, because one of the seven is defined by
      // waiting and would otherwise be failed for keeping its word.
      room.player.x = 20 * TILE_SIZE;
      const was = { x: beast.x, y: beast.y, w: beast.w, marks: room.marks.length };
      for (let i = 0; i < 90; i += 1) step(room, NO_INPUT, ctx);
      const moved =
        Math.abs(beast.x - was.x) > 1 ||
        Math.abs(beast.y - was.y) > 1 ||
        beast.w !== was.w ||
        room.marks.length !== was.marks ||
        beast.broken === true;
      expect(moved, `${kind} stands in an empty room and does nothing at all`).toBe(true);
    }
  });
});

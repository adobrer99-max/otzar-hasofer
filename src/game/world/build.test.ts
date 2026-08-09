import { describe, expect, it } from "vitest";
import { lettersOnEntering, regionAt, regions, TOTAL_REGIONS } from "../regions";
import { CHUNKS, CHUNK_H, CHUNK_W, chunksById, GATE_ROOMS, TEACH_CHUNKS } from "./chunks";
import {
  buildPath,
  buildRegion,
  cardsOpen,
  CARDS_PER_STANDING,
  FIRST_CARDS,
  gateRoomFor,
  keliOnPath,
  layoutOf,
  verbsOf,
} from "./build";
import { TREE_PATHS } from "../tree";
import { step } from "./step";
import { NO_INPUT } from "./types";
import { THE_OPENING } from "../combat";
import { ROOM_H, ROOM_W } from "./rooms";
import { TILE_SIZE } from "./tiles";
import { cardsByHouse, dorotHouses, dorotHousesById, housesBySefirah } from "../../data/dorot";

const SEEDS = [3, 91, 555, 12345, 777];

/**
 * How a region is assembled, as opposed to what it is made of.
 *
 * Two things are being protected here. The first is the chain: chunks now hand
 * the Scribe on at different heights, so a mismatched pair would drop them
 * into a wall. The second is the band — the knob that did not exist when the
 * pool grew with the letters held and the demand never grew with it, which is
 * how the crown ended up the easiest ground in the game.
 */

/** What a region can actually draw on, given its letters and its band. */
function poolFor(regionIndex: number) {
  const region = regionAt(regionIndex);
  const verbs = verbsOf(lettersOnEntering(regionIndex));
  return CHUNKS.filter(
    (c) =>
      c.requires.every((v) => verbs.includes(v)) &&
      c.demand >= region.demand.min &&
      c.demand <= region.demand.max,
  );
}

describe("assembling a region", () => {
  it("never leaves the Scribe stranded between two screens", () => {
    // A chunk's exit profile must be the next chunk's entry profile. There is
    // no direct handle on the laid sequence, so this asserts the property the
    // chain exists to produce: the tiles line up at every seam.
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const world = buildRegion(region, seed);
        for (let seam = CHUNK_W; seam < world.width; seam += CHUNK_W) {
          for (let y = 0; y < world.height; y += 1) {
            const left = world.tiles[y * world.width + seam - 1];
            const right = world.tiles[y * world.width + seam];
            // Solid on one side and open on the other is fine mid-screen; what
            // must never happen is the *floor* disagreeing, which is what a
            // profile mismatch looks like on the ground.
            // Floor rows *within a screen*, not within the world: a floor is
            // several storeys tall now, and every storey has its own floor.
            if (y % CHUNK_H >= 16) {
              expect(
                left === right,
                `region ${region} seed ${seed}: floor disagrees at seam ${seam}, row ${y}`,
              ).toBe(true);
            }
          }
        }
      }
    }
  });

  it("begins and ends every region on the ground", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const world = buildRegion(region, seed);
        const floorAt = (tx: number) => world.tiles[16 * world.width + tx];
        expect(floorAt(0), `region ${region} seed ${seed}: no floor at the mouth`).toBeGreaterThan(0);
        expect(
          floorAt(world.width - 1),
          `region ${region} seed ${seed}: no floor at the tail`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("gives every region enough distinct screens to draw on", () => {
    for (const region of regions) {
      expect(
        poolFor(region.index).length,
        `${region.name} can only draw on ${poolFor(region.index).length} screens`,
      ).toBeGreaterThanOrEqual(5);
    }
  });

  /**
   * The inversion, asserted away. Before the bands, the pool grew monotonically
   * with the letters held while every screen in it stayed a one-press solve, so
   * Keter drew on all seventeen chunks holding all twelve verbs and was the
   * gentlest ground in the ascent.
   */
  it("raises what a region asks as the Tree is climbed", () => {
    const mean = (index: number) => {
      const pool = poolFor(index);
      return pool.reduce((sum, c) => sum + c.demand, 0) / pool.length;
    };
    expect(mean(1), "Malchut should be the gentlest").toBeLessThan(mean(10));
    expect(mean(10), "Keter should ask a great deal").toBeGreaterThan(2.4);
    // And no gentle screen may reach the supernals at all.
    for (const index of [8, 9, 10]) {
      for (const c of poolFor(index)) {
        expect(c.demand, `${c.id} is a walk and reached region ${index}`).toBeGreaterThan(1);
      }
    }
  });

  it("keeps a region's terrain within the letters carried into it", () => {
    for (const region of regions) {
      const verbs = verbsOf(lettersOnEntering(region.index));
      for (const c of poolFor(region.index)) {
        for (const verb of c.requires) {
          expect(verbs, `${c.id} in ${region.name} asks for ${verb}`).toContain(verb);
        }
      }
    }
  });

  /**
   * A region that hands you twelve verbs and then never asks for one is the
   * flat feeling this whole change is about. Measured before the quota
   * existed: better than half of all upper-Tree assemblies could be crossed
   * without pressing a key beyond the two that move you.
   *
   * The Breath and the Fence do not count — they live on the leap key and are
   * spent without deciding to.
   */
  it("makes every region past the on-ramp actually ask for a letter", () => {
    const reachedFor = (c: { requires: string[] }) =>
      c.requires.some((v) => v !== "double-jump" && v !== "wall-cling");
    for (let region = 4; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const asked = layoutOf(region, seed).filter(reachedFor).length;
        expect(
          asked,
          `${regionAt(region).name} seed ${seed} asks for nothing`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("sets a mark below the Abyss and none above it", () => {
    for (const region of regions) {
      const world = buildRegion(region.index, 4242);
      const marks = world.entities.filter((e) => e.kind === "mark").length;
      expect(marks, `${region.name}`).toBe(region.hasShrine ? 1 : 0);
    }
  });

  /**
   * **Pacing.** A fixed screen is one you *stop* on — an alcove, a niche, a
   * gate, the shrine, the House — and the question this asks is how much game
   * there is between two of them.
   *
   * Both answers used to be bad, and in opposite directions. `region.length`
   * was authored as a length and read as one, so the fixed screens were pushed
   * into whatever boundaries happened to exist: Malchut carried six of them in
   * fourteen screens while Keter carried two in thirteen, and Hod and Netzach
   * had *fewer* ground boundaries than fixed screens, which dropped them into
   * a fallback that repeats a slot — three plates in a row, in half of all
   * climbs, measured over forty seeds.
   *
   * The body now grows to fit what the rung holds, so this is a property of
   * every rung rather than a hope about the ones that happened to be long.
   */
  it("never lays two screens you stop on back to back", () => {
    const FIXED = new Set([
      "letter-alcove",
      "genizah-niche",
      "word-gate",
      "shrine-low",
      "shrine-high",
      "house",
    ]);
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of [...SEEDS, 40404, 8, 1234, 60606, 31337]) {
        const laid = layoutOf(region, seed);
        for (let i = 1; i < laid.length; i += 1) {
          expect(
            FIXED.has(laid[i].id) && FIXED.has(laid[i - 1].id),
            `region ${region} seed ${seed}: ${laid[i - 1].id} then ${laid[i].id}`,
          ).toBe(false);
        }
      }
    }
  });

  /**
   * And the first rung in particular, because it is the one that also carries
   * the teaching. Four screens to stop on in Malchut — two letters, a genizah
   * niche and the House — against six before, when it also kept a shrine it
   * could not use and a second fragment.
   */
  it("keeps the kingdom the least crowded rung below the Abyss", () => {
    const stops = (region: number) =>
      layoutOf(region, 555).filter((c) =>
        ["letter-alcove", "genizah-niche", "word-gate", "shrine-low", "shrine-high", "house"].includes(
          c.id,
        ),
      ).length;
    for (let region = 2; region <= 7; region += 1) {
      expect(stops(1), `Malchut ${stops(1)} vs region ${region} ${stops(region)}`).toBeLessThanOrEqual(
        stops(region),
      );
    }
  });

  it("still lays the taught porch in Malchut and nowhere else", () => {
    for (const seed of SEEDS) {
      /**
       * **Read off the screens rather than off the width**, which is the
       * correction the relic chamber forced and which was owed anyway.
       *
       * This asserted that the taught rung is three to four screens wider than
       * the plain one. A rung is squared up to whole *rooms* of two screens, so
       * what that arithmetic actually measures is the parity of the plain
       * rung's screen count: an even one grows by four and an odd one by two.
       * Both are the same three-screen porch. Malchut's count happened to be
       * even for the whole life of the assertion, and adding one fixed screen
       * to the rung made it odd — so a band drawn around a rounding artefact
       * failed on a change that did not touch the porch at all.
       *
       * The porch is three screens. That is the claim, and `layoutOf` says it
       * exactly.
       */
      const laid = layoutOf(1, seed, true).map((c) => c.id);
      const bare = layoutOf(1, seed).map((c) => c.id);
      expect(laid.filter((id) => id.startsWith("teach-")), `seed ${seed}`).toHaveLength(
        TEACH_CHUNKS.length,
      );
      expect(bare.filter((id) => id.startsWith("teach-")), `seed ${seed}`).toEqual([]);
      // And the porch is *prepended*: everything a Scribe stops at is exactly
      // what it would otherwise be. Not the whole chain — a rung is squared up
      // to whole rooms with plain ground, so three extra screens can pull one
      // more filler screen in with them, and that is the porch costing a beat
      // rather than the seed being disturbed.
      const stops = (ids: string[]) =>
        ids.filter((id) => id in chunksById && !CHUNKS.some((c) => c.id === id));
      expect(stops(laid).filter((id) => !id.startsWith("teach-")), `seed ${seed}`).toEqual(
        stops(bare),
      );
    }
    for (let region = 2; region <= TOTAL_REGIONS; region += 1) {
      expect(buildRegion(region, 7, 1, true).width, `region ${region}`).toBe(
        buildRegion(region, 7).width,
      );
    }
  });

  /**
   * The frame. A room is two screens across and one tall, and a rung that came
   * out half a room wide would leave the camera framing a hole — so the shape
   * is asserted rather than assumed, on every rung and every seed.
   */
  it("builds every rung out of whole rooms", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of [...SEEDS, 40404, 8]) {
        const world = buildRegion(region, seed);
        expect(world.width % ROOM_W, `region ${region} seed ${seed} width`).toBe(0);
        expect(world.height % ROOM_H, `region ${region} seed ${seed} height`).toBe(0);
        expect(world.rooms.length, `region ${region} seed ${seed}`).toBe(
          (world.width / ROOM_W) * (world.height / ROOM_H),
        );
        // And the Scribe starts inside one of them.
        expect(world.rooms[world.roomIndex], `region ${region} seed ${seed}`).toBeDefined();
      }
    }
  });
});

/**
 * **The Houses open as they stand for you.**
 *
 * A hundred and sixty-eight cards ship with this game and a climb meets about
 * four per cent of them. Drawn uniformly, twenty climbs gave a Scribe a flat
 * shallow sample of everybody and a deep acquaintance with nobody — an
 * anthology rather than a relationship. The pool is a window now, widened by
 * how often that Sefirah's House has stood at the crown.
 */
describe("how far into a House a rung may draw", () => {
  it("opens two to a Scribe nobody has ever stood for", () => {
    expect(cardsOpen(8, 0)).toBe(FIRST_CARDS);
    expect(cardsOpen(16, 0)).toBe(FIRST_CARDS);
  });

  it("widens by two on every standing, and stops at the House's own size", () => {
    expect(cardsOpen(8, 1)).toBe(FIRST_CARDS + CARDS_PER_STANDING);
    expect(cardsOpen(8, 3)).toBe(8);
    expect(cardsOpen(8, 99)).toBe(8);
    expect(cardsOpen(16, 7)).toBe(16);
  });

  /**
   * The arc is deliberately the length of the Seven Encounters: a patriarchal
   * House of eight is whole at the third standing, a matriarchal one of
   * sixteen at the seventh.
   */
  it("matches the real Houses, and finishes inside seven standings", () => {
    for (const house of dorotHouses) {
      const total = cardsByHouse(house.id).length;
      expect(total, `${house.figure} has no cards`).toBeGreaterThan(0);
      expect(
        cardsOpen(total, 7),
        `${house.figure} is not whole after seven standings`,
      ).toBe(total);
    }
  });

  it("never opens nothing, whatever it is asked", () => {
    expect(cardsOpen(1, 0)).toBe(1);
    expect(cardsOpen(0, 0)).toBe(1);
    expect(cardsOpen(8, -4)).toBe(FIRST_CARDS);
  });

  /**
   * **Per House, not over the pool.** A rung's pool is both Houses' cards end
   * to end, so a window over the concatenation would give a new Scribe the
   * patriarchal House's opening and lock the matriarchal one out entirely —
   * and `story.ts` leans on either being able to stand at a rung.
   */
  it("lets either House stand at a rung, from the very first climb", () => {
    for (const sefirah of ["malchut", "yesod", "hod", "netzach", "tiferet", "gevurah", "chesed"]) {
      const open = housesBySefirah(sefirah).flatMap((house) =>
        cardsByHouse(house.id).slice(0, cardsOpen(cardsByHouse(house.id).length, 0)),
      );
      const kinds = new Set(open.map((c) => dorotHousesById[c.houseId]?.kind));
      expect(kinds, `${sefirah} offers only one kind of House at the start`).toEqual(
        new Set(["patriarchal", "matriarchal"]),
      );
    }
  });

  /** And the generator actually honours it — the window is not decoration. */
  it("draws a figure from inside the window and nowhere else", () => {
    const path = TREE_PATHS.find((p) => p.ends.includes("malchut"))!;
    const inside = new Set(
      housesBySefirah("malchut").flatMap((house) =>
        cardsByHouse(house.id).slice(0, cardsOpen(cardsByHouse(house.id).length, 0)).map((c) => c.id),
      ),
    );
    let seen = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const world = buildPath(path, seed, [], 1, false, false, 1, [], 0);
      const figure = world.entities.find((e) => e.kind === "house");
      if (!figure?.ref) continue;
      seen += 1;
      expect(inside.has(figure.ref), `${figure.ref} is past the window`).toBe(true);
    }
    expect(seen, "no seed put a figure on this rung at all").toBeGreaterThan(0);
  });
});

/**
 * **A screen that says where the light is, and is obeyed.**
 *
 * `"*"` is a member of `MARKER_CHARS`, so every authored mote entered `paint`'s
 * marker switch, matched no case, fell to `default` and was eaten by the
 * `continue` — with the block that would have laid it sitting a few lines below,
 * unreachable. Seventy-eight of them across forty-nine of the seventy-four
 * screens, none ever laid.
 *
 * Nothing looked wrong, and that is the part worth remembering: `scatterMotes`
 * tops a rung up to the day's budget, so the light was never *missing*. It was
 * **moved** — off the ledge somebody put it on and onto whatever standable
 * ground the shuffle picked, which is mostly the walking line. A count would
 * have reported the game healthy; only a claim about *where* could fail.
 *
 * So the claim is about the one place a player is guaranteed to look. Reported
 * from play as the Word-Gate offering nothing when it opens, and that is the
 * sharpest case of it: the chamber holds two of these, and it is the one screen
 * in the game that asks a Scribe to *know* something before it opens.
 */
describe("what a screen says about its own light", () => {
  const SEEDS = [3, 91, 555, 12345, 777, 40404, 8, 1234, 60606, 31337];

  /**
   * The motes inside the chamber, either hand — a screen is laid mirrored as
   * often as not, which puts the room on the other side of its own porch.
   *
   * At least a tile away and at most eight, on the porch's own row: the chamber
   * runs cols 7-12 of a screen whose porch is col 5, and the approach ledge and
   * the ground lane are three rows and more below it.
   */
  const chamberOf = (world: ReturnType<typeof buildPath>, gate: { x: number; y: number }) =>
    world.entities.filter(
      (e) =>
        e.kind === "mote" &&
        Math.abs(e.x - gate.x) >= TILE_SIZE &&
        Math.abs(e.x - gate.x) <= TILE_SIZE * 8 &&
        Math.abs(e.y - gate.y) <= TILE_SIZE,
    ).length;

  it("puts something behind a Word-Gate that has been answered", () => {
    let gates = 0;
    let held = 0;
    for (const path of TREE_PATHS) {
      for (const seed of SEEDS) {
        const world = buildPath(path, seed, lettersOnEntering(5), 1, false, false, 1, []);
        for (const gate of world.entities.filter((e) => e.kind === "word-gate")) {
          gates += 1;
          if (chamberOf(world, gate) > 0) held += 1;
        }
      }
    }
    expect(gates, "no path laid a Word-Gate at all").toBeGreaterThan(50);
    // Measured at 187 of 220 with the marker laid and 117 of 220 without it —
    // about half of every answered gate opened on an empty room. A share rather
    // than a count, and drawn clear of both: the chamber is inside the scatter's
    // reach, so a few will always be filled by luck and a few missed by it.
    expect(held / gates, `${held} of ${gates} chambers hold anything`).toBeGreaterThan(0.7);
  });

  /**
   * **And the ledges empty when the ground has been gleaned.** The moment
   * authored motes started existing they were a farm — `SPENT_LIGHT` is applied
   * to the day's light on its way to `scatterMotes`'s budget and nothing else,
   * so a star would have stood at full value on every re-walk forever.
   * `economy.test.ts`'s re-walk band caught it on the first run; this says the
   * same thing about the one screen, where it can be read.
   */
  it("empties the chamber of a path already walked", () => {
    let first = 0;
    let again = 0;
    for (const path of TREE_PATHS) {
      for (const seed of SEEDS) {
        const fresh = buildPath(path, seed, lettersOnEntering(5), 1, false, false, 1, []);
        const walked = buildPath(path, seed, lettersOnEntering(5), 1, false, true, 1, []);
        for (const gate of fresh.entities.filter((e) => e.kind === "word-gate")) {
          first += chamberOf(fresh, gate);
        }
        for (const gate of walked.entities.filter((e) => e.kind === "word-gate")) {
          again += chamberOf(walked, gate);
        }
      }
    }
    expect(first, "no light behind any gate on a first walk").toBeGreaterThan(0);
    expect(again, `a re-walk holds ${again} against ${first} — the farm is open`).toBeLessThan(
      first * 0.5,
    );
  });
});

/**
 * **What a gate opens onto.**
 *
 * The chamber was three tiles by two — a cupboard with two motes in it, and the
 * same two motes every time anybody answered anything. It is a room now, and
 * there are four of them.
 */
describe("the rooms behind a Word-Gate", () => {
  const OUTSIDE = new Set(["word-gate"]);

  /** A path and day whose gate is the one that opens underneath. */
  const buildFall = () => {
    for (const path of TREE_PATHS) {
      for (let day = 0; day < 90; day += 1) {
        if (gateRoomFor(path.id, day).id !== "word-gate-fall") continue;
        const world = buildPath(path, day, lettersOnEntering(5), 1, false, false, 1, []);
        if (world.entities.some((e) => e.kind === "opening")) return world;
      }
    }
    throw new Error("no path on any day laid the fall room");
  };

  /**
   * **Identical outside the chamber, to the tile.** The ledge, the porch, the
   * barrier and the clear ground lane are not decoration — they are the
   * traversal guarantee, which is why the screen's own doc says rows 13-15 do
   * nothing. A variant that moved the mouth by a tile would move it for one
   * path in four and nowhere else, which is the hardest kind of fault to see.
   */
  it("changes nothing outside the chamber", () => {
    const base = chunksById["word-gate"];
    for (const room of GATE_ROOMS) {
      expect(room.rows).toHaveLength(base.rows.length);
      room.rows.forEach((row, y) => {
        [...row].forEach((ch, x) => {
          // The chamber is cols 7-12 of rows 9-11; everything else is contract.
          const inside = x >= 7 && x <= 12 && y >= 9 && y <= 11;
          if (inside) return;
          expect(ch, `${room.id} differs at (${x},${y})`).toBe(base.rows[y][x]);
        });
      });
    }
  });

  /**
   * **Chosen by the day and the path, and by nothing else.** Everyone answering
   * the same gate on the same day finds the same thing behind it; the same path
   * tomorrow holds something else.
   */
  it("gives a path the same room twice and different paths different rooms", () => {
    for (const path of TREE_PATHS) {
      expect(gateRoomFor(path.id, 7).id).toBe(gateRoomFor(path.id, 7).id);
    }
    const onADay = new Set(TREE_PATHS.map((p) => gateRoomFor(p.id, 7).id));
    expect(onADay.size, "every path holds the same thing on a given day").toBeGreaterThan(1);
    const overDays = new Set(
      Array.from({ length: 40 }, (_, d) => gateRoomFor(TREE_PATHS[0].id, d).id),
    );
    expect(overDays.size, "one path holds the same thing for ever").toBeGreaterThan(1);
    // And all four are actually reachable, or one of them is decoration.
    // All five are reachable, or one of them is decoration. Taken over a wide
    // sweep because the fall is laid at one gate in nine — see `GATE_ODDS`.
    const everywhere = new Set(
      TREE_PATHS.flatMap((p) => Array.from({ length: 60 }, (_, d) => gateRoomFor(p.id, d).id)),
    );
    expect(everywhere.size).toBe(GATE_ROOMS.length);
    void OUTSIDE;
  });

  /**
   * **The vessel is untouched**, which is the one thing that could not be seen
   * by looking. `buildPath` seeds one generator and `drawKeli` is its first
   * consumer; `keliOnPath` recreates exactly that draw so the Tree map can name
   * a path's vessel without building it. A room chosen off that generator would
   * move every screen on every path — so it is hashed instead, and this is the
   * claim that says the hashing held.
   */
  it("leaves every path holding the vessel the map says it holds", () => {
    for (const path of TREE_PATHS) {
      for (const seed of [3, 91, 555, 12345]) {
        const world = buildPath(path, seed, lettersOnEntering(5), 1, false, false, 1, []);
        const onTheMap = keliOnPath(path, seed, []);
        const pedestal = world.entities.find((e) => e.kind === "vessel");
        if (!pedestal) continue;
        expect(pedestal.ref, `${path.id} seed ${seed}`).toBe(onTheMap?.id);
      }
    }
  });

  /**
   * **The floor was not there**, and it costs exactly what the last lamp costs.
   *
   * The owner's reasoning for putting a trap behind a door somebody *answered*
   * is that it has to do with why the Scribe fell in the first place: a
   * Word-Gate is crossed by **inscribing**, and writing what was said is the
   * office he was cast out of. What makes it fair rather than a cheat is that
   * it invents no rule — page five of the prologue teaches this one before the
   * first rung, and `afterFalling` has always applied it.
   *
   * Asserted through the shipped `step` rather than by reading the table,
   * because a marker with no case is this repo's most repeated bug and the one
   * that hid seventy-eight motes for the whole life of the library.
   */
  it("ends the rung for a Scribe who reaches the back of the wrong chamber", () => {
    const world = buildFall();
    const opening = world.entities.find((e) => e.kind === "opening");
    expect(opening, "the fall room laid no opening").toBeDefined();
    const p = world.player;
    p.x = (opening as { x: number }).x;
    p.y = (opening as { y: number }).y;
    p.vx = 0;
    p.vy = 0;
    expect(world.out, "it was already over").toBeFalsy();
    step(world, NO_INPUT, { verbs: [], graces: [] });
    expect(world.out, "the floor held").toBe(true);
    expect(world.message?.text).toBe(THE_OPENING);
  });

  /**
   * And it is rare. A trap at one gate in five is a tax rather than a trap:
   * measured over the full tour at even odds it took one seed from ten Sefirot
   * lit to four and got a letter credited to the probe, which is the one
   * concession the tour is forbidden to pass on.
   */
  it("lays the fall at about one gate in nine", () => {
    const drawn = TREE_PATHS.flatMap((path) =>
      Array.from({ length: 90 }, (_, day) => gateRoomFor(path.id, day).id),
    );
    const falls = drawn.filter((id) => id === "word-gate-fall").length;
    expect(falls / drawn.length, `${falls} of ${drawn.length}`).toBeGreaterThan(0.05);
    expect(falls / drawn.length, `${falls} of ${drawn.length}`).toBeLessThan(0.2);
  });

  /**
   * **A figure behind a gate is a second figure, not the same one twice.** The
   * rung's own House stands where it always did — taking the screen away would
   * shorten the rung, which is what `room = max(fixed.length, stopping + 2)`
   * does to anything removed from `fixed[]`, and it put the tour two walks over
   * its cap the first time it was tried.
   */
  it("never stands the same person twice on one rung", () => {
    let rungsWithTwo = 0;
    for (const path of TREE_PATHS) {
      for (const seed of [3, 91, 555, 12345, 777, 40404]) {
        const world = buildPath(path, seed, lettersOnEntering(5), 1, false, false, 1, []);
        const figures = world.entities.filter((e) => e.kind === "house");
        const refs = new Set(figures.map((f) => f.ref));
        expect(refs.size, `${path.id} seed ${seed} stands one person twice`).toBe(figures.length);
        if (figures.length > 1) rungsWithTwo += 1;
      }
    }
    expect(rungsWithTwo, "no gate ever held a figure").toBeGreaterThan(0);
  });
});

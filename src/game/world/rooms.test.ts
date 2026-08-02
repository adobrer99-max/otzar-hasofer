import { describe, expect, it } from "vitest";
import { TOTAL_REGIONS } from "../regions";
import { buildRegion, rowsFor } from "./build";
import { doorsOf, roomAtPoint, ROOM_H, ROOM_W } from "./rooms";
import { Tile, TILE_SIZE } from "./tiles";

/**
 * The floor, as a grid of rooms.
 *
 * A room is the unit the camera frames and the unit a fight is sealed into, so
 * two things have to be true of every rung on every seed: the grid is whole —
 * no half rooms, nothing outside one — and every room has a way in. The second
 * is the no-soft-lock guarantee restated for the new shape: a room with no door
 * is a room nobody can reach, and generating one would be exactly the failure
 * the chunk contract exists to make impossible in the horizontal direction.
 */

const SEEDS = [3, 91, 555, 12345, 777, 40404];

describe("the floor", () => {
  it("is a whole grid of rooms, with the Scribe inside one", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const world = buildRegion(region, seed);
        const cols = world.width / ROOM_W;
        const rows = world.height / ROOM_H;
        expect(Number.isInteger(cols), `region ${region} seed ${seed}: ${cols} cols`).toBe(true);
        expect(Number.isInteger(rows), `region ${region} seed ${seed}: ${rows} rows`).toBe(true);
        expect(rows, `region ${region}`).toBe(rowsFor(region));
        expect(world.rooms.length).toBe(cols * rows);

        const spawn = world.rooms[world.roomIndex];
        expect(spawn, `region ${region} seed ${seed}: the Scribe starts nowhere`).toBeDefined();
      }
    }
  });

  it("gives every room a way in", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const world = buildRegion(region, seed);
        for (const room of world.rooms) {
          const ways = room.doors.reduce((n, d) => n + d.tiles.length, 0);
          expect(
            ways,
            `region ${region} seed ${seed}: room ${room.col},${room.row} is sealed shut`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  /**
   * Doors are read off the painted grid rather than derived from the edge
   * profiles, which is the whole reason a ground join, a high one and a divided
   * road all work without restating any of them. This asserts the reading:
   * every door tile is genuinely empty, and every empty boundary tile is a
   * door.
   */
  it("finds exactly the openings that are there", () => {
    const world = buildRegion(5, 91);
    for (const room of world.rooms) {
      const found = doorsOf(room, world.tiles, world.width, world.height);
      for (const door of found) {
        for (const tile of door.tiles) {
          expect(world.tiles[tile.y * world.width + tile.x]).toBe(Tile.Empty);
        }
      }
      const counted = found.reduce((n, d) => n + d.tiles.length, 0);
      let open = 0;
      for (let y = room.y; y < room.y + room.h; y += 1) {
        for (let x = room.x; x < room.x + room.w; x += 1) {
          const edgeX = x === room.x || x === room.x + room.w - 1;
          const edgeY = y === room.y || y === room.y + room.h - 1;
          if (!edgeX && !edgeY) continue;
          // Only boundaries that face another room count as ways through.
          const facing =
            (x === room.x && room.x > 0) ||
            (x === room.x + room.w - 1 && room.x + room.w < world.width) ||
            (y === room.y && room.y > 0) ||
            (y === room.y + room.h - 1 && room.y + room.h < world.height);
          if (facing && world.tiles[y * world.width + x] === Tile.Empty) open += 1;
        }
      }
      expect(counted).toBe(open);
    }
  });

  it("knows which room a point is in, and says so when it is none", () => {
    const world = buildRegion(2, 3);
    const first = world.rooms[0];
    expect(roomAtPoint(world.rooms, first.x, first.y)).toBe(0);
    expect(roomAtPoint(world.rooms, first.x + ROOM_W, first.y)).toBe(
      world.rooms.length > 1 ? 1 : -1,
    );
    expect(roomAtPoint(world.rooms, -1, 0)).toBe(-1);
    expect(roomAtPoint(world.rooms, 0, world.height + 4)).toBe(-1);
  });

  /**
   * Every klipah stands in exactly one room, and the room knows it. This is
   * what sealing will be judged against — a husk in no room could never be the
   * reason a door opens, and one counted twice would keep a door shut forever.
   */
  it("assigns every klipah to the room it stands in", () => {
    for (let region = 1; region <= TOTAL_REGIONS; region += 1) {
      for (const seed of SEEDS) {
        const world = buildRegion(region, seed);
        const claimed = world.rooms.flatMap((r) => r.husks);
        expect(new Set(claimed).size, `region ${region} seed ${seed}`).toBe(claimed.length);
        for (const husk of world.husks) {
          expect(
            claimed,
            `region ${region} seed ${seed}: a husk at ${Math.round(husk.x / TILE_SIZE)} belongs to no room`,
          ).toContain(husk.id);
        }
      }
    }
  });
});

import { CHUNK_H, CHUNK_W } from "./chunks";
import { Tile } from "./tiles";
import type { Chunk, Door, Room, RoomKind } from "./types";

/**
 * A floor, as a grid of rooms.
 *
 * Until now a rung was one row of screens read left to right, and the world was
 * a tile grid that happened to be one screen tall. Almost nothing in the
 * simulation ever knew that: collision, the camera, the marks and the klipot
 * are all tile- and pixel-based, and `tileAt` already answers correctly off the
 * top and the bottom. So a floor is not a new kind of world — it is the same
 * grid, taller, with the screens laid in rows instead of a line.
 *
 * **A room is two chunks wide**, and that is arithmetic rather than taste. A
 * chunk is 16×18 tiles, which is *portrait*; the canvas is 20:9. Fitting an
 * eighteen-tile-tall room to that frame takes a zoom of about 1.25, at which
 * forty tiles of width are visible — two and a half chunks. There is no zoom at
 * which a single chunk fills the view. Two chunks side by side is 32×18, near
 * enough 16:9, and it leaves about four tiles of the neighbouring rooms showing
 * at each edge — which is what makes a sealed door legible before you reach it.
 *
 * Pairing chunks costs nothing, because the two inside a room chain by exactly
 * the edge contract they always did. And it lands on a rule that is already
 * true: `spaceOut` in `build.ts` never lays two screens-you-stop-on back to
 * back, so a room can never contain two fixed screens.
 *
 * This module is **pure** and knows nothing about painting. It says where the
 * screens go and what each room is; `build.ts` writes the tiles, and `doorsOf`
 * reads the doors back off the finished grid rather than deriving them — which
 * is the only way to get ground, high and branching joins right without
 * restating the edge profiles here.
 */

/** A room is two chunks across and one tall. */
export const ROOM_W = CHUNK_W * 2;
export const ROOM_H = CHUNK_H;

export interface Placement {
  chunk: Chunk;
  /** Chunk column within the whole floor, not within the room. */
  x: number;
  y: number;
  /**
   * Whether the screen is laid back to front.
   *
   * Every other row of a floor is walked right to left, and a screen read that
   * way meets its neighbours the wrong way round — its *entry* edge would face
   * the previous screen's *entry*. Mirroring the screen swaps the two, so the
   * edge contract holds in both directions and the whole authored library
   * works backwards for free. It also doubles what the eye sees.
   */
  mirrored: boolean;
}

export interface Floor {
  cols: number;
  rows: number;
  rooms: Room[];
  placements: Placement[];
}

/** Which room kind a screen makes the room it lands in. */
const KIND_OF: Record<string, RoomKind> = {
  "letter-alcove": "letter",
  "genizah-niche": "niche",
  "word-gate": "gate",
  // Every room a gate can open onto is still a gate room — see `GATE_ROOMS`.
  // The kind is asked exactly one functional question, which is whether the
  // room may close behind the Scribe, and the answer is the same for all four.
  "word-gate-hoard": "gate",
  "word-gate-house": "gate",
  "word-gate-den": "gate",
  "word-gate-sukkah": "gate",
  "word-gate-lamps": "gate",
  "word-gate-fall": "gate",
  "shrine-low": "shrine",
  "shrine-high": "shrine",
  house: "house",
  vessel: "vessel",
  "relic-chamber": "relic",
  end: "exit",
  // The crossing's way out is a gate *and* an exit, and it is named for the
  // exit — because the one thing the kind is asked functionally is whether the
  // room may close behind the Scribe, and a room that holds the way out never
  // may. See `stepRooms`.
  "abyss-gate": "exit",
};

/**
 * Lay a sequence of screens out as a floor.
 *
 * `rows` is how many rows of rooms the rung is built from — one is a corridor,
 * which is what every rung is today and what the teaching rung will stay. The
 * screens are dealt into rows in order, and **odd rows run right to left**, so
 * the way through a floor is a boustrophedon: along, up, back along. That keeps
 * the sequence the generator produced — its difficulty curve, its branch runs,
 * its fixed-screen spacing — intact while folding it into two dimensions.
 */
export function planFloor(laid: readonly Chunk[], rows: number): Floor {
  // Rooms are two chunks wide, so an odd screen would leave a half room. The
  // caller pads; this asserts the shape it is given rather than papering over
  // it, because a half room is a camera bug and not a level bug.
  const perRow = Math.ceil(laid.length / rows / 2) * 2;
  const cols = perRow / 2;

  const placements: Placement[] = [];
  const rooms: Room[] = [];

  for (let i = 0; i < laid.length; i += 1) {
    const storey = Math.min(rows - 1, Math.floor(i / perRow));
    const withinRow = i - storey * perRow;
    // Serpentine: the row above is walked back the way you came, which is what
    // makes a floor a floor rather than a very long corridor drawn in stripes.
    const mirrored = storey % 2 === 1;
    const x = mirrored ? perRow - 1 - withinRow : withinRow;
    // **Storey nought is the bottom.** Tile rows count downward from the top of
    // the grid and the Scribe climbs upward, so the first screens laid are the
    // last rows painted — otherwise a rung would be entered at its ceiling.
    placements.push({ chunk: laid[i], x, y: rows - 1 - storey, mirrored });
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const inside = placements.filter((p) => p.y === row && Math.floor(p.x / 2) === col);
      if (inside.length === 0) continue;
      const named = inside.map((p) => KIND_OF[p.chunk.id]).find(Boolean);
      rooms.push({
        index: rooms.length,
        col,
        row,
        x: col * ROOM_W,
        y: row * ROOM_H,
        w: ROOM_W,
        h: ROOM_H,
        kind: named ?? "way",
        entrance: inside.some((p) => p.chunk.id === "start"),
        onPath: true,
        cleared: false,
        doors: [],
        husks: [],
      });
    }
  }

  return { cols, rows, rooms, placements };
}

/**
 * The doors of a room, read off the painted grid.
 *
 * Deliberately not derived from the edge profiles. A join may be on the ground,
 * up on the high road, or both at once where a road divides, and a shaft is a
 * hole in a floor — restating all of that here would be a second source of
 * truth for something the tiles already say plainly. So: whatever is *empty*
 * along a room's boundary is a way in, and sealing a room is writing those
 * tiles solid.
 */
export function doorsOf(
  room: Room,
  tiles: Uint8Array,
  width: number,
  height: number,
): Door[] {
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? Tile.Stone : tiles[y * width + x];
  const doors: Door[] = [];

  const run = (side: Door["side"], cells: { x: number; y: number }[]) => {
    const open = cells.filter((c) => at(c.x, c.y) === Tile.Empty);
    if (open.length > 0) doors.push({ side, tiles: open });
  };

  // The corners belong to the top and the bottom, not to both. Nobody passes
  // through a corner, and counting one twice would have a tile sealed by two
  // doors and reported by two — which is exactly how this was first wrong.
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let y = room.y + 1; y < room.y + room.h - 1; y += 1) {
    left.push({ x: room.x, y });
    right.push({ x: room.x + room.w - 1, y });
  }
  const up: { x: number; y: number }[] = [];
  const down: { x: number; y: number }[] = [];
  for (let x = room.x; x < room.x + room.w; x += 1) {
    up.push({ x, y: room.y });
    down.push({ x, y: room.y + room.h - 1 });
  }

  if (room.x > 0) run("left", left);
  if (room.x + room.w < width) run("right", right);
  if (room.y > 0) run("up", up);
  if (room.y + room.h < height) run("down", down);
  return doors;
}

/** The room a point is inside, if any. */
export function roomAtPoint(rooms: readonly Room[], x: number, y: number): number {
  return rooms.findIndex(
    (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h,
  );
}

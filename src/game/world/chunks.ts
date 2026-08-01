import type { Chunk } from "./types";

/**
 * The level vocabulary: hand-authored screens, assembled per seed.
 *
 * Fully procedural platforming generates unplayable ground far too easily,
 * and ten hand-drawn levels would be ten levels forever. So the middle road:
 * every screen here is authored by hand and correct by inspection, and a
 * region is a sequence of them chosen by the run's seed.
 *
 * **The contract every chunk keeps** — validated in `chunks.test.ts`, not
 * merely intended:
 *
 * 1. Exactly `CHUNK_W` × `CHUNK_H` characters.
 * 2. The two bottom rows are stone under the outermost two columns of each
 *    edge, and rows 12–15 of those columns are clear. So the Scribe always
 *    walks *into* a screen at ground level and always walks *out* of one at
 *    ground level, and any chunk may follow any other.
 * 3. `requires` lists the verbs without which the screen cannot be crossed.
 *    A chunk is only ever laid into a region once the Scribe already holds
 *    them, which is what makes a soft-lock structurally impossible rather
 *    than something to test for.
 *
 * Optional side-routes may ask for anything at all — a mote behind a low
 * crawl, a shelf above a vine — because nothing on the way to the exit
 * depends on reaching them.
 */

export const CHUNK_W = 16;
export const CHUNK_H = 18;

/** The rows the edge columns must keep clear, so an entering body fits. */
export const EDGE_CLEAR_ROWS = [12, 13, 14, 15];
/** The rows the edge columns must keep solid, so there is ground to land on. */
export const EDGE_FLOOR_ROWS = [16, 17];

const E = "................";
const F = "################";

function chunk(id: string, requires: Chunk["requires"], rows: string[]): Chunk {
  return { id, requires, rows };
}

/** The screen every region opens on. */
export const START_CHUNK: Chunk = chunk("start", [], [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  "..S.............",
  E,
  F,
  F,
]);

/** The screen every region closes on. */
export const END_CHUNK: Chunk = chunk("end", [], [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  "..........E.....",
  E,
  F,
  F,
]);

/** The Tav shrine — laid once per region, wherever the seed puts it. */
export const SHRINE_CHUNK: Chunk = chunk("shrine", [], [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  ".......T........",
  E,
  F,
  F,
]);

/**
 * The alcove a letter waits in — laid once for each letter the region gives.
 *
 * The shelf is deliberately low: two tiles above the floor, well inside a
 * plain running jump. It must be, because Malchut is where Aleph is found and
 * Aleph *is* the second jump — put the first letter of the game any higher and
 * it can only be reached by the power it grants. Every later region inherits
 * the same alcove, so no letter is ever locked behind itself.
 */
export const LETTER_CHUNK: Chunk = chunk("letter-alcove", [], [
  E, E, E, E, E, E, E, E, E, E, E, E, E,
  "......L.........",
  "......===.......",
  E,
  F,
  F,
]);

/**
 * A genizah niche: a fragment of the torn scroll, set where worn writing is
 * set aside rather than destroyed. Kept to the same low shelf as the letter
 * alcove, for the same reason — a fragment out of reach is an ability lost.
 */
export const FRAGMENT_CHUNK: Chunk = chunk("genizah-niche", [], [
  E, E, E, E, E, E, E, E, E, E, E, E, E,
  ".........F......",
  "........===.....",
  E,
  F,
  F,
]);

/** Where the House's figure stands, in the seven lower regions. */
export const HOUSE_CHUNK: Chunk = chunk("house", [], [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  ".....H..........",
  E,
  F,
  F,
]);

/**
 * The body of a region. Each is crossable with the verbs it names and no
 * others; several are crossable with none at all, which is what keeps the
 * first descent through Malchut walkable by a Scribe who holds nothing.
 */
export const CHUNKS: Chunk[] = [
  chunk("open-field", [], [
    E, E, E, E, E, E, E, E, E, E, E, E, E,
    "......*..*......",
    E, E,
    F,
    F,
  ]),

  chunk("stepped-rise", [], [
    E, E, E, E, E, E, E, E,
    "........*.......",
    ".......====.....",
    E,
    "....===.........",
    E,
    "..===...........",
    E, E,
    F,
    F,
  ]),

  chunk("pit", [], [
    E, E, E, E, E, E, E, E, E, E, E, E, E,
    ".......*........",
    E, E,
    // Three tiles. A Scribe who has not yet found the Breath must be able to
    // clear this on a plain running jump, with room to spare.
    "######...#######",
    "######...#######",
  ]),

  chunk("pillars", [], [
    E, E, E, E, E, E, E, E, E, E,
    "...==...==...==.",
    E, E, E, E, E,
    F,
    F,
  ]),

  chunk("upper-shelf", [], [
    E, E, E, E, E, E, E, E, E, E,
    ".....*..*.......",
    "....========....",
    E, E,
    "..==........==..",
    E,
    F,
    F,
  ]),

  chunk("crawl-nook", [], [
    E, E, E, E, E, E, E, E, E, E, E, E, E, E,
    "...#######......",
    "...cc*cc........",
    F,
    F,
  ]),

  chunk("thorn-hedge", ["cut"], [
    E, E, E, E, E, E, E, E, E, E, E, E,
    ".......^........",
    ".......^....*...",
    ".......^........",
    ".......^........",
    F,
    F,
  ]),

  chunk("vine-wall", ["climb"], [
    E, E, E, E,
    "........*.......",
    "......####......",
    ".....v####......",
    ".....v####......",
    ".....v####......",
    ".....v####......",
    ".....v####......",
    ".....v####......",
    ".....v####......",
    ".....v####......",
    ".....v####......",
    ".....v####......",
    F,
    F,
  ]),

  chunk("deep-channel", ["swim"], [
    E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E,
    "###wwwwwwwwww###",
    "###wwwwwwwwww###",
  ]),

  chunk("veiled-span", ["reveal"], [
    E, E, E, E, E, E, E, E, E, E, E, E, E, E,
    "....V..V..V.....",
    E,
    "###..........###",
    "###..........###",
  ]),

  chunk("anchor-gap", ["grapple"], [
    E, E, E, E, E, E, E, E, E, E,
    "....A....A......",
    E, E, E, E, E,
    "###..........###",
    "###..........###",
  ]),

  // One sheer face, six tiles of it. Hold toward the wall and jump: the
  // Fence is climbed by catching it again and again, not by bouncing between
  // two of them.
  chunk("sheer-wall", ["wall-cling"], [
    E, E, E, E, E, E, E, E, E,
    ".......##.......",
    ".......##.......",
    ".......##.......",
    ".......##.......",
    ".......##.......",
    ".......##.......",
    ".......##.......",
    F,
    F,
  ]),

  // Six tiles. Beyond a running jump, and comfortably within a jump carried
  // by the Bridge — the dash should feel decisive, not frame-perfect.
  chunk("wide-chasm", ["dash"], [
    E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E,
    "#####......#####",
    "#####......#####",
  ]),

  chunk("overgrown-pass", ["flame"], [
    E, E, E, E, E, E, E, E, E, E, E, E,
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    F,
    F,
  ]),

  chunk("sealed-gate", ["open"], [
    E, E, E, E, E, E, E, E, E, E, E, E,
    ".......DD.......",
    ".......DD.......",
    ".......DD.......",
    ".......DD.......",
    F,
    F,
  ]),

  chunk("high-vault", ["double-jump"], [
    E, E, E, E, E, E, E, E,
    "...=========....",
    E, E, E,
    "..==...##...==..",
    ".......##.......",
    ".......##.......",
    ".......##.......",
    F,
    F,
  ]),

  chunk("set-stone", ["block"], [
    E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E,
    "#####.....######",
    "#####.....######",
  ]),
];

export const chunksById: Record<string, Chunk> = Object.fromEntries(
  [...CHUNKS, START_CHUNK, END_CHUNK, SHRINE_CHUNK, LETTER_CHUNK, FRAGMENT_CHUNK, HOUSE_CHUNK].map((c) => [c.id, c]),
);

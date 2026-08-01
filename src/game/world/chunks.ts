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

/**
 * A Word-Gate and the chamber it seals.
 *
 * The chamber is raised and reached by a stepping ledge; the gate stands at
 * its mouth, and `?` is the porch you inscribe from. Note what the ground
 * floor does: **nothing.** Rows 13–15 are clear the whole width, so a Scribe
 * who never solves a gate — or never wants to — walks straight past at ground
 * level. That is not politeness, it is the traversal guarantee: a gate that
 * could bar the exit would be a soft-lock the moment a clue proved too hard.
 */
export const WORD_GATE_CHUNK: Chunk = chunk("word-gate", [], [
  E, E, E, E, E, E, E, E, E,
  ".....######.....",
  "......W...#.....",
  ".....?W.**#.....",
  ".....######.....",
  E,
  "...==...........",
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
 * The porch of a first ascent — three screens laid before the seeded body of
 * Malchut, and only for a Scribe who has never climbed.
 *
 * They exist so the teaching has somewhere to land. A coaching line that says
 * "press ▲ to leap" has to arrive where there is something to leap, and the
 * seed cannot be relied on to lay a gap early — or at all. So the first three
 * screens of a first climb are fixed: flat ground to find the walk in, a low
 * step that must be jumped, and a gap that must be cleared.
 *
 * They ask for nothing. `requires: []` is not a formality here: the Breath is
 * found *inside* Malchut, so the porch has to be crossable by a Scribe holding
 * no letters at all, and the pit is the same three tiles as `pit` — a plain
 * running jump with room to spare.
 *
 * Note what this costs: a first Malchut is three screens longer than the one
 * everyone else climbs that day. The daily seed still governs the whole Tree
 * past the porch; it is only the porch that is a Scribe's own.
 */
export const TEACH_WALK: Chunk = chunk("teach-walk", [], [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  "....*......*....",
  E,
  F,
  F,
]);

export const TEACH_STEP: Chunk = chunk("teach-step", [], [
  E, E, E, E, E, E, E, E, E, E, E, E, E,
  ".......*........",
  ".....######.....",
  ".....######.....",
  F,
  F,
]);

export const TEACH_PIT: Chunk = chunk("teach-pit", [], [
  E, E, E, E, E, E, E, E, E, E, E, E, E,
  ".......*........",
  E,
  E,
  "######...#######",
  "######...#######",
]);

/** The porch, in order. Laid only on a first ascent, only in Malchut. */
export const TEACH_CHUNKS: Chunk[] = [TEACH_WALK, TEACH_STEP, TEACH_PIT];

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
  [
    ...CHUNKS,
    ...TEACH_CHUNKS,
    START_CHUNK,
    END_CHUNK,
    SHRINE_CHUNK,
    LETTER_CHUNK,
    FRAGMENT_CHUNK,
    WORD_GATE_CHUNK,
    HOUSE_CHUNK,
  ].map((c) => [c.id, c]),
);

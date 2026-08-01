import type { Verb } from "../abilities";

/**
 * The world is a grid of these, and nothing else. Every locked way in the
 * game is a tile that answers "am I solid?" differently depending on which
 * letters the Scribe carries — which is what makes the alphabet the key to
 * the Tree rather than a score printed on top of it.
 *
 * A const object rather than an `enum`: the project builds with
 * `erasableSyntaxOnly`, which rules enums out, and this erases to plain
 * numbers while still giving both `Tile.Stone` and a `Tile` type.
 */
export const Tile = {
  Empty: 0,
  /** Hewn stone. Always solid. */
  Stone: 1,
  /** A ledge — solid from above only, so it can be jumped up through. */
  Ledge: 2,
  /** Water. Passable, but only survivable as a way through with Mem. */
  Water: 3,
  /** Thornbrake. Veils the Scribe on contact; Zayin cuts it away. */
  Thorn: 4,
  /** Overgrowth. Solid until Shin burns it back. */
  Growth: 5,
  /** Hanging vine. Climbed with Kuf; otherwise only scenery. */
  Vine: 6,
  /** Veiled stone — the hidden light. Solid only once Ayin has seen it. */
  Veiled: 7,
  /** A sealed door. Solid until Dalet opens it. */
  Door: 8,
  /** An anchor ring for the Hook. Not solid; Vav casts to it. */
  Anchor: 9,
  /** A low passage, blocked to anyone unwilling to fold themselves small. */
  LowGap: 10,
  /** A stone the Scribe set with Bet. Solid, and retrievable. */
  Placed: 11,
} as const;

export type Tile = (typeof Tile)[keyof typeof Tile];

export const TILE_SIZE = 24;

/** The character each tile is authored as in the chunk library. */
export const TILE_CHARS: Record<string, Tile> = {
  ".": Tile.Empty,
  " ": Tile.Empty,
  "#": Tile.Stone,
  "=": Tile.Ledge,
  w: Tile.Water,
  "^": Tile.Thorn,
  G: Tile.Growth,
  v: Tile.Vine,
  V: Tile.Veiled,
  D: Tile.Door,
  A: Tile.Anchor,
  c: Tile.LowGap,
};

/** Markers that become entities at load rather than tiles in the grid. */
export const MARKER_CHARS = new Set(["S", "E", "L", "*", "T", "H", "F"]);

/**
 * Whether a tile stops a body, given what the Scribe carries and how they are
 * moving. `crawling` and `revealed` are the two states that change the
 * answer, and both come from letters.
 */
export function isSolid(
  tile: Tile,
  opts: { verbs: readonly Verb[]; crawling: boolean; revealed: boolean },
): boolean {
  switch (tile) {
    case Tile.Stone:
    case Tile.Placed:
      return true;
    case Tile.Growth:
      // Shin burns it back — but only once it has actually been burnt, which
      // the world records by replacing the tile. Held alone it stays solid.
      return true;
    case Tile.Veiled:
      return opts.revealed;
    case Tile.Door:
      return true;
    case Tile.LowGap:
      return !opts.crawling;
    default:
      return false;
  }
}

/** Ledges stop a body only when it is falling onto them from above. */
export function isLedge(tile: Tile): boolean {
  return tile === Tile.Ledge;
}

export function isWater(tile: Tile): boolean {
  return tile === Tile.Water;
}

export function isHazard(tile: Tile): boolean {
  return tile === Tile.Thorn;
}

export function isClimbable(tile: Tile): boolean {
  return tile === Tile.Vine;
}

/**
 * Which letter answers a tile — the key the way is locked with. Used by the
 * HUD to tell a Scribe what a barrier is waiting for, and by the chunk
 * library's own check that a region never asks for a letter not yet found.
 */
export const TILE_KEY: Partial<Record<Tile, Verb | "crawl">> = {
  [Tile.Thorn]: "cut",
  [Tile.Growth]: "flame",
  [Tile.Veiled]: "reveal",
  [Tile.Door]: "open",
  [Tile.Vine]: "climb",
  [Tile.Anchor]: "grapple",
  [Tile.LowGap]: "crawl",
};

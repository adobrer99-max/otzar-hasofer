import type { SefirahId } from "../../types/letter";
import type { Verb } from "../abilities";
import type { HuskKind } from "../combat";
import type { WordGateTarget } from "../wordGate";

export interface Vec {
  x: number;
  y: number;
}

/** An axis-aligned body. Positions are in pixels, not tiles. */
export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

export type EntityKind =
  | "letter"
  | "mote"
  | "mark"
  | "house"
  | "exit"
  | "fragment"
  | "word-gate"
  /** A vessel on its pedestal — see `items.ts`. */
  | "vessel"
  /** Where a road divides. Resh returns you here. */
  | "fork";

export interface Entity {
  id: string;
  kind: EntityKind;
  x: number;
  y: number;
  /**
   * Letter pickups carry the letter they give, house figures their card id,
   * and scroll fragments their index in the verse.
   */
  ref?: string;
  taken?: boolean;
  /** Marks light when the Scribe sets them. */
  active?: boolean;
}

export interface Player extends Body {
  facing: 1 | -1;
  onGround: boolean;
  /** Frames of grace after leaving a ledge in which a jump still counts. */
  coyote: number;
  /** Frames a jump press is remembered for, so an early press still lands. */
  jumpBuffer: number;
  /** Whether the second, airborne jump is still available. */
  airJump: boolean;
  /** Ticks remaining in a dash, and until another may be taken. */
  dash: number;
  dashCooldown: number;
  /** The wall being held, if any: -1 left, 1 right, 0 none. */
  clinging: -1 | 0 | 1;
  climbing: boolean;
  inWater: boolean;
  crouching: boolean;
  /** Ticks of the veiling — the Scribe is insubstantial and returning. */
  veiled: number;
  /** The anchor currently held by the Hook, in tile coordinates. */
  grappleTo?: Vec;
  /** Ticks before the Hook may be cast again, so it chains instead of yo-yos. */
  grappleCooldown: number;
  /**
   * What the Scribe is, as opposed to what he carries. `or` is gathered light
   * and buys the kindling of a Sefirah; these are the lamps he is made of, and
   * a husk takes one. Conflating the two would charge every mistake twice.
   */
  lamps: number;
  /** Ticks of grace after a hit, in which nothing can touch him. */
  iframes: number;
  /** Ticks before another mark may be thrown. */
  markCooldown: number;
}

/** A husk of the klipot, standing between the Scribe and the light in it. */
export interface Husk extends Body {
  id: string;
  kind: HuskKind;
  /** Shells left. At zero it breaks and gives up what it held. */
  shells: number;
  facing: 1 | -1;
  /** Where it began, which is what a rooted husk returns to and guards. */
  home: Vec;
  /** Ticks until it may throw or charge again. */
  cooldown: number;
  /** Ticks left of a charge, for the ones that commit to one. */
  charging: number;
  /** Ticks of white after being struck, so a hit reads. */
  struck: number;
  broken?: boolean;
}

/** A mark in flight — the Scribe's, or the dark a spitter throws. */
export interface Mark extends Body {
  id: string;
  /** Whose it is. The Scribe's breaks husks; a husk's takes a lamp. */
  mine: boolean;
  life: number;
  pierces: boolean;
  bite: number;
  draws: boolean;
  /** The letter written, for the renderer. */
  glyph: string;
}

/**
 * What a room is for. At most one per room, because `spaceOut` in `build.ts`
 * never lays two screens-you-stop-on back to back and a room is two screens.
 */
export type RoomKind =
  | "way"
  | "letter"
  | "niche"
  | "gate"
  | "shrine"
  | "house"
  | "vessel"
  | "exit";

/**
 * A way in or out of a room: whichever tiles along that boundary are empty.
 *
 * Read off the painted grid rather than derived from the edge profiles, so a
 * ground join, a high one, a divided road and a shaft are all just "the empty
 * tiles along this side" — see `doorsOf` in `rooms.ts`.
 */
export interface Door {
  side: "left" | "right" | "up" | "down";
  tiles: Vec[];
}

export interface Room {
  index: number;
  col: number;
  row: number;
  /** In tiles, so the camera and the sealing both read straight off it. */
  x: number;
  y: number;
  w: number;
  h: number;
  kind: RoomKind;
  entrance: boolean;
  /** Whether the way to the exit runs through here. Only the way seals. */
  onPath: boolean;
  cleared: boolean;
  doors: Door[];
  /** Ids of the klipot standing in this room when it was built. */
  husks: string[];
}

export interface World {
  regionIndex: number;
  sefirah: SefirahId;
  /** Column-major-free: `tiles[y * width + x]`. */
  tiles: Uint8Array;
  width: number;
  height: number;
  player: Player;
  entities: Entity[];
  /**
   * The rooms this rung is built from, and which one the Scribe is standing
   * in. A one-row floor is a corridor, which is what the lower rungs are.
   */
  rooms: Room[];
  roomIndex: number;
  /** Where the Scribe wakes after a veiling. */
  respawn: Vec;
  /**
   * The last fork passed — the head of the road the Scribe is on.
   *
   * Resh, the Beginning, is what makes this matter: veiled on a branch, a
   * Scribe carrying it wakes at the fork rather than back at the mark, which
   * is to say they are returned to the main climb instead of losing the
   * ground between. Without Resh the fork is recorded and simply not used.
   */
  fork?: Vec;
  /**
   * Where this veiling will set the Scribe down, decided the moment they are
   * veiled — because that is the moment the letters they carry are known.
   */
  wakeAt?: Vec;
  /** Tile coordinates the Eye has opened, so a reveal persists. */
  revealed: boolean;
  /** The single stone Bet has set, plus the second the Palm allows. */
  placed: Vec[];
  /**
   * The root this region's Word-Gate names, if it has one. Chosen at build
   * time from what the Scribe could already spell, so it is always solvable.
   */
  wordGate?: WordGateTarget;
  /** Set once the gate's chamber has been opened. */
  wordGateOpen?: boolean;
  /** Light gathered in this region. */
  or: number;
  /**
   * How much light a single mote is worth here. Two in the region the run's
   * Encounter illuminates, one everywhere else — set by the page, which is
   * what knows the Encounter.
   */
  orPerMote: number;
  /**
   * Running counts a vow is judged against at the exit (see
   * `ushpizinOffers.ts`). Cumulative for the region; the page snapshots them
   * when a vow is taken and compares at the way out.
   */
  orGathered: number;
  veilings: number;
  marksSet: number;
  /** The klipot standing in this region, and everything in flight. */
  husks: Husk[];
  marks: Mark[];
  /** How many husks have been broken here — for the record, and for doors. */
  husksBroken: number;
  /**
   * Set when the Scribe's light goes out. The run is over; `GamePage` seals it
   * as a fall rather than a crowning.
   */
  out?: boolean;
  /** Ticks elapsed — the simulation's own clock, never wall time. */
  tick: number;
  /** Set when the Scribe reaches the exit. */
  finished: boolean;
  /** The most recent thing worth saying, shown as a caption. */
  message?: { text: string; until: number };
}

/** Everything the simulation needs from outside itself, once per tick. */
export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Edge-triggered: true only on the tick the key went down. */
  jump: boolean;
  /** Held, for variable jump height and slow-fall. */
  jumpHeld: boolean;
  act: boolean;
  dash: boolean;
  /** Edge-triggered: the mark is thrown once per press. */
  strike: boolean;
}

export const NO_INPUT: Input = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  jumpHeld: false,
  act: false,
  dash: false,
  strike: false,
};

/**
 * Where a screen is walked into and out of.
 *
 * `ground` is the floor every region begins and ends on. `high` is a ledge
 * four tiles up with nothing beneath it — which is what gives the Tree height
 * rather than length. `both` carries the two at once, and is how a region
 * *branches*: a road divides, runs as two independent roads for a screen or
 * three, and comes back together. That is the shape of the Tree itself — three
 * pillars that part and rejoin — and it is what makes Resh worth having, since
 * the Beginning is what returns you to the fork when a branch defeats you.
 *
 * A chunk's `exit` must match the next chunk's `entry`, and `build.ts` chains
 * them accordingly.
 */
export type Edge = "ground" | "high" | "both";

/** A hand-authored screen. See `chunks.ts` for the connection contract. */
export interface Chunk {
  id: string;
  /**
   * Verbs without which this chunk is impassable — it is only laid if held.
   * More than one is allowed and is where the late Tree gets its teeth: a
   * screen that asks for the Bridge *and* the Breath cannot be laid until both
   * are found, which the existing filter already guarantees.
   */
  requires: Verb[];
  /**
   * What the screen asks of the hands: 1 a walk, 2 a demand, 3 a real one.
   *
   * Before this existed, `region.length` was the only per-region knob in the
   * game — it controlled how *long* a region was and nothing about how hard,
   * so the pool grew with the letters held while every screen in it stayed a
   * one-press solve, and Keter ended up the easiest ground in the ascent.
   */
  demand: 1 | 2 | 3;
  entry: Edge;
  exit: Edge;
  /** Rows of characters, `TILE_CHARS` and `MARKER_CHARS`. */
  rows: string[];
}

export interface RegionBuild {
  regionIndex: number;
  sefirah: SefirahId;
  /** Letters awarded in this region, consumed by `L` markers in reading order. */
  letters: string[];
  /** The Dorot card standing here, placed at the `H` marker. */
  dorotCardId?: string;
  verbsHeld: Verb[];
  seed: number;
}

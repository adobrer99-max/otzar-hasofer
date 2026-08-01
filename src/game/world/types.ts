import type { SefirahId } from "../../types/letter";
import type { Verb } from "../abilities";
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

export type EntityKind = "letter" | "mote" | "mark" | "house" | "exit" | "fragment" | "word-gate";

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
  /** Where the Scribe wakes after a veiling. */
  respawn: Vec;
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
};

/**
 * Where a screen is walked into and out of.
 *
 * `ground` is the floor every region begins and ends on. `high` is a ledge
 * four tiles up with nothing beneath it — which is what gives the Tree height
 * rather than length. A chunk's `exit` must match the next chunk's `entry`,
 * and `build.ts` chains them accordingly.
 */
export type Edge = "ground" | "high";

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

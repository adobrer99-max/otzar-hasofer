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
  /** A hidden thing in its chamber, kept past the seal — see `relics.ts`. */
  | "relic"
  /** Where a road divides. Resh returns you here. */
  | "fork"
  /**
   * **The floor of a chamber that was never a chamber** — see `GATE_FALL`.
   * Touching it ends the rung the way the last lamp does: the light in hand
   * goes out, and the Scribe wakes at the highest Sefirah still lit.
   */
  | "opening";

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
  /**
   * The shell this mote came out of, when it came out of one — set by
   * `strikeHusk`, read by the renderer alone. Inert on purpose: the light a
   * break frees is worth the same and gathers the same as any other, and the
   * field changes no value, no count, and no pickup. What it buys is the
   * *look* — freed light hangs a little differently by what held it, which
   * is birur made visible without an economy change wearing a costume.
   */
  from?: HuskKind;
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
  /**
   * Down is held and the Scribe is on their feet: the body is short, the walk
   * is slow, and things thrown at head height go over.
   *
   * **Anybody can do this**, which for a long time was not true — ducking was
   * gated on Tet's Coil, so a Scribe without it held down and nothing whatever
   * happened. That made a body verb into a letter, which is the one thing this
   * game's alphabet is not for: the letters say what a body can *reach*, not
   * whether it has knees.
   */
  crouching: boolean;
  /**
   * Crouched **and** carrying the Coil, which is a different thing.
   *
   * This is what a low passage tests. Tet buys folding yourself small enough
   * to get through `Tile.LowGap`, and nothing else in the game reads it — so
   * every screen that declares `crawl` still asks for exactly what it always
   * asked for, and the no-soft-lock guarantee is untouched.
   */
  crawling: boolean;
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

/** A mark in flight — the Scribe's, or the dark a klipah throws. */
export interface Mark extends Body {
  id: string;
  /** Whose it is. The Scribe's breaks husks; a husk's takes a lamp. */
  mine: boolean;
  life: number;
  pierces: boolean;
  bite: number;
  draws: boolean;
  /** Whether it bends after the Scribe in flight — Jezebel's, and only hers. */
  seeks?: boolean;
  /**
   * Ticks of bending after the nearest shell left — the Scribe's side of
   * `seeks`, lent by a vessel rather than owned by a klipah. Counted rather
   * than thresholded on `life`, because his marks are short-lived.
   */
  hunts?: number;
  /** Bounces left off stone. Zero, and stone stops it as it always did. */
  turns?: number;
  /** Breaking a shell throws two shards out of it. Shards never carry it. */
  splits?: boolean;
  /** It has weight, and falls as it flies. */
  arcs?: boolean;
  /**
   * Ticks it will go on hanging where it stops — the Scoring's blind line,
   * which every letter hangs from. Carried from the throw and counted down only
   * once the flight is over, so it is a mark's afterlife rather than its reach.
   */
  hangs?: number;
  /** Whether it turns for home when its life runs out, and whether it has. */
  returns?: boolean;
  turned?: boolean;
  /**
   * **What it has already gone through**, so a piercing mark cannot bite the
   * same shell twice.
   *
   * A mark that does not pierce is consumed by the thing it hits, which ends
   * the question. A piercing one is not — and nothing stopped it striking the
   * *same* husk again on the next tick, while it was still passing through the
   * body. Measured on the bench: a Scribe holding Chet broke eighteen of the
   * twenty in four to six ticks with a single mark, klipot with five and six
   * shells among them, because one mark was landing five hits.
   *
   * Piercing means the mark carries on to what is behind it. It has never meant
   * a drill.
   */
  through?: string[];
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
  | "relic"
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
  /**
   * Set when this world is a guardian's room rather than a rung.
   *
   * Two things read it. `stepRooms` shuts an arena on *any* unbroken body in
   * it, where a rung only shuts on the ones that will come to you — a door held
   * by something that may not be coming is the one thing sealing must never be
   * on a rung, and in a room holding one creature and nothing else it is not a
   * risk, it is the fight. And `GamePage` reads it to know that reaching the
   * way out means a Sefirah has been freed.
   */
  arena?: SefirahId;
  /**
   * Where this rung is *going* — the walked path's upper end, set by
   * `buildPath` and never by an arena. The rungs' own rules key on it
   * (`rungRules.ts`): a path's question is its destination's, and so is its
   * law. `sefirah` above is the lower end (the fixed screens' home) and
   * cannot serve — see `regionOfPath`'s two-end notes.
   */
  toward?: SefirahId;
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
  /**
   * Floor that has given way and will close again — see `Tile.Maskit`.
   *
   * **The whole reason the trap is allowed to exist.** `route.test.ts` earns
   * the no-soft-lock guarantee over six hundred sampled paths against the
   * *painted* grid, and a tile that vanished for good would be a trap that can
   * invalidate that proof at runtime, where no test can see it. Measured before
   * this list existed: a competent probe stalled at seventy-two per cent of
   * Chochmah, because it had dropped a tile and the leap it needed no longer
   * cleared from where it now stood.
   *
   * So the stone opens, the Scribe falls, something comes out, and it closes.
   * The rung is exactly the rung the graph proved, half a second later.
   */
  mending: { x: number; y: number; at: number }[];
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
   * What a shell gives up when it breaks, multiplied — the Fifth Encounter's
   * Living Creatures hold more than the ordinary klipah.
   */
  huskLight: number;
  /**
   * And again, when the break happens in a room that has closed behind the
   * Scribe: the Second Encounter's Separation. One unless a rule says else, so
   * a sealed break is worth `huskLight * sealedLight` shells' worth of light.
   */
  sealedLight: number;
  /**
   * What a veiling takes off the light gathered. Two, unless the Seventh's
   * Shabbat says nothing is lost.
   */
  veilCost: number;
  /**
   * Whether the room the Scribe is standing in has closed behind them.
   * Recorded by `stepRooms`, which is where the decision is actually made —
   * re-deriving it where a shell breaks would be the same condition written
   * twice and free to drift.
   */
  inSealedRoom: boolean;
  /**
   * Running counts a vow is judged against at the exit (see
   * `ushpizinOffers.ts`). Cumulative for the region; the page snapshots them
   * when a vow is taken and compares at the way out.
   */
  orGathered: number;
  veilings: number;
  marksSet: number;
  /**
   * Marks the Scribe has thrown on this rung — counted in `throwMark` at the
   * moment one actually flies, so a press swallowed by the cooldown counts
   * nothing. Per-rung, like `marksSet`; never folded onto the record. It is
   * the state Gevurah's rung rule (P15-R2) reads: on gevurah-bound ground the
   * throws are rationed, and a ration needs a count.
   */
  marksThrown: number;
  /**
   * How many times each verb was actually used on this rung — the dash
   * dashed, the thorn cut, the stone set — counted by `spendVerb` at the
   * moment the world answers, never per tick a state holds. Folded onto the
   * record at every way out that keeps progress, exactly as `or` is; a rung
   * that ends in a veiling keeps nothing.
   */
  verbUses: Partial<Record<Verb, number>>;
  /** Whether the Wrapper's one mercy has been spent on this rung. */
  spared?: boolean;
  /** Whether the Lampstand's middle light has already refused to go out. */
  relit?: boolean;
  /** Whether Aaron's rod has already budded a lamp back on this rung. */
  budded?: boolean;
  /**
   * Whether the fire of the altar has been spent — **once a climb**, not once a
   * rung, which is the only reason this leaves the world at all: the page reads
   * it when the rung ends and writes `relicsSpent` on the record, so a reload
   * cannot hand it back. Nothing else in `World` outlives its own rung.
   */
  everlasting?: boolean;
  /**
   * Which kinds this rung draws its klipot from.
   *
   * Kept on the world because something can still be *stood up* after the rung
   * is built: a figured stone gives way and what was under it comes out of the
   * rung's own pool rather than out of a table the step would otherwise have to
   * go looking for by region index — which on the Tree is the capped rung and
   * not where the Scribe actually is.
   */
  klipot: readonly HuskKind[];
  /** The klipot standing in this region, and everything in flight. */
  husks: Husk[];
  marks: Mark[];
  /** How many husks have been broken here — for the record, and for doors. */
  husksBroken: number;
  /**
   * Set when the Scribe's light goes out.
   *
   * **This rung is over; the climb is not.** `GamePage` raises the plate, which
   * pauses the loop, and the Scribe wakes at the highest Sefirah he has kindled
   * — see `game/fall.ts`. For most of this game's life it said "the run is over"
   * and meant it, which is the debt that file was written to pay.
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

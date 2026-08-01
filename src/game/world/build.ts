import { cardsByHouse, housesBySefirah } from "../../data/dorot";
import type { Verb } from "../abilities";
import { abilityByLetter } from "../abilities";
import { fragmentsBefore, lettersOnEntering, regionAt } from "../regions";
import { makeRng, randomInt, shuffle } from "../rng";
import { chooseTarget, type WordGateTarget } from "../wordGate";
import {
  CHUNK_H,
  CHUNK_W,
  CHUNKS,
  END_CHUNK,
  FRAGMENT_CHUNK,
  HOUSE_CHUNK,
  LETTER_CHUNK,
  SHRINE_HIGH,
  SHRINE_LOW,
  START_CHUNK,
  TEACH_CHUNKS,
  WORD_GATE_CHUNK,
} from "./chunks";
import { MARKER_CHARS, Tile, TILE_CHARS, TILE_SIZE } from "./tiles";
import type { Chunk, Edge, Entity, Player, World } from "./types";

export const PLAYER_W = 16;
export const PLAYER_H = 30;

/** The verbs a set of held letters amounts to. */
export function verbsOf(letterIds: readonly string[]): Verb[] {
  return letterIds
    .map((id) => abilityByLetter[id]?.verb)
    .filter((v): v is Verb => Boolean(v));
}

/**
 * Lays out a region as a sequence of authored screens.
 *
 * The order is fixed — start, then the body with the letters, the shrine and
 * (below the Abyss) the House folded in, then the exit — while *which* body
 * screens are laid, and where the fixed ones fall among them, is the seed's.
 * So a region is recognisably itself every time and never the same twice.
 *
 * The one invariant worth stating plainly: body screens are drawn only from
 * those whose `requires` the Scribe already satisfies **on entering**. A
 * letter found partway through a region is never assumed by that region's own
 * terrain, so there is no order of play that can strand anyone.
 *
 * `teaching` prepends the fixed porch (`TEACH_CHUNKS`) to Malchut, so a Scribe
 * on their first climb meets flat ground, a step and a gap in that order and
 * the coaching lines have somewhere to land. It changes nothing else: the
 * seeded body, the letters, the shrine and the exit are exactly what they
 * would otherwise be.
 */
export function buildRegion(
  regionIndex: number,
  seed: number,
  lightOfTheDay = 1,
  teaching = false,
): World {
  const region = regionAt(regionIndex);
  const rng = makeRng((seed ^ (regionIndex * 0x9e3779b9)) >>> 0);
  const { laid, wordGateTarget } = layout(region, rng, teaching);

  return paint(
    laid,
    region.index,
    region.sefirah,
    region.letters,
    rng,
    region.hasHouse,
    lightOfTheDay,
    fragmentsBefore(region.index),
    wordGateTarget,
  );
}

/**
 * The screens a region is made of, in order — separated from painting them so
 * that the assembly can be inspected directly rather than inferred from tiles.
 * `build.test.ts` reads the chain and the demand curve straight off this.
 */
export function layoutOf(regionIndex: number, seed: number, teaching = false): Chunk[] {
  const region = regionAt(regionIndex);
  return layout(region, makeRng((seed ^ (regionIndex * 0x9e3779b9)) >>> 0), teaching).laid;
}

function layout(
  region: ReturnType<typeof regionAt>,
  rng: () => number,
  teaching: boolean,
): { laid: Chunk[]; wordGateTarget: WordGateTarget | undefined } {
  const regionIndex = region.index;
  const held = lettersOnEntering(regionIndex);
  const verbs = verbsOf(held);

  const passable = CHUNKS.filter((c) => c.requires.every((v) => verbs.includes(v)));
  if (passable.length === 0) {
    throw new Error(`Region ${regionIndex} has no passable chunks — the letter order is wrong`);
  }

  // Then the band. A region draws only from screens that ask what it is meant
  // to ask — and the *floor* is the part that matters, because it is what
  // keeps a flat walk out of the crown. If the band leaves too little to
  // choose from the region widens it rather than repeating itself; it never
  // starves, and it never throws.
  const banded = withinBand(passable, region.demand);

  const body = layBody(
    banded,
    region.length,
    rng,
    region.demand.bias === "hard",
    gatedQuota(region.length, region.demand),
  );

  // The gate's answer is chosen first, from roots the Scribe can already
  // spell with the letters they arrive holding. No target, no gate — which is
  // why Malchut and Yesod carry none: with two letters there is nothing to
  // spell. This is the same shape as `requires` on a chunk: the generator is
  // not permitted to express an unsolvable one.
  const wordGateTarget = chooseTarget(regionIndex, rng);

  // The fixed screens are inserted at positions within the body. Their *order*
  // here is their order on the ground, because the chosen slots are sorted
  // ascending — and that ordering carries a rule: the genizah niches always
  // come before the House. A region that strews scroll fragments is a region
  // where the Mouth can be assembled before its figure is reached, so the
  // House will speak rather than stand mute for want of a letter lying a
  // hundred tiles further on.
  const fixed: Chunk[] = [
    ...Array.from({ length: region.fragments ?? 0 }, () => FRAGMENT_CHUNK),
    ...region.letters.map(() => LETTER_CHUNK),
    ...(wordGateTarget ? [WORD_GATE_CHUNK] : []),
    // One mark per region below the Abyss, and none above it. Low at the foot
    // of the Tree where it is walked into, on a shelf higher up where taking
    // it is a choice.
    ...(region.hasShrine ? [region.index <= 3 ? SHRINE_LOW : SHRINE_HIGH] : []),
    ...(region.hasHouse ? [HOUSE_CHUNK] : []),
  ];

  // Every fixed screen is entered and left on the ground, so they may only be
  // slotted where the body is *already* on the ground. `groundSlots` is those
  // positions; `layBody` guarantees there are enough of them.
  const positions = groundSlots(body);
  const slots =
    fixed.length <= positions.length
      ? shuffle(rng, positions).slice(0, fixed.length)
      : Array.from({ length: fixed.length }, (_, i) => positions[randomInt(rng, positions.length)] ?? i);
  slots.sort((a, b) => a - b);

  const laid: Chunk[] = [START_CHUNK, ...(teaching && regionIndex === 1 ? TEACH_CHUNKS : [])];
  let nextFixed = 0;
  for (let i = 0; i <= body.length; i += 1) {
    while (nextFixed < slots.length && slots[nextFixed] === i) {
      laid.push(fixed[nextFixed]);
      nextFixed += 1;
    }
    if (i < body.length) laid.push(body[i]);
  }
  laid.push(END_CHUNK);

  return { laid, wordGateTarget };
}

/** The fewest distinct screens a region may draw on before it starts to stutter. */
const MIN_POOL = 5;
/** How many screens a high stretch may run before it must come back down. */
const MAX_HIGH_RUN = 2;

/**
 * The two verbs that are *had* rather than *reached for*.
 *
 * The Breath and the Fence live on the leap key, so a Scribe carrying them
 * uses them without ever deciding to — hold toward a wall and jump, and you
 * have climbed it. Every other verb needs a key pressed on purpose. That
 * distinction is what `asksForALetter` is about, and it is the difference
 * between a region that uses the alphabet and one that merely stands next to
 * it: a body screen gated only on the Breath asks nothing a plain jump does
 * not already ask.
 */
const HAD_NOT_REACHED_FOR: readonly Verb[] = ["double-jump", "wall-cling"];

function asksForALetter(c: Chunk): boolean {
  return c.requires.some((v) => !HAD_NOT_REACHED_FOR.includes(v));
}

/**
 * How many screens in a region must actually ask for a letter.
 *
 * Without this the seed is free to fill a region entirely with screens that
 * ask nothing but walking and jumping — and it did: measured across the upper
 * Tree, better than half of all assemblies could be crossed holding only the
 * two movement keys, because the nine letterless screens in the library were
 * enough to build a whole region out of. A region that gives you twelve verbs
 * and then never asks for one is the flat feeling this whole change is about.
 */
function gatedQuota(length: number, band: { min: number }): number {
  return Math.ceil(length * (band.min >= 2 ? 0.6 : 0.5));
}

/**
 * The screens inside a region's demand band — widening the band rather than
 * starving if there are too few.
 *
 * The floor is dropped before the ceiling is raised, because the ceiling is
 * what the band is *for*: a region is allowed to end up gentler than intended,
 * and never harder.
 */
function withinBand(pool: readonly Chunk[], band: { min: number; max: number }): Chunk[] {
  for (let min = band.min; min >= 1; min -= 1) {
    const found = pool.filter((c) => c.demand >= min && c.demand <= band.max);
    if (found.length >= MIN_POOL || min === 1) return found.length > 0 ? found : [...pool];
  }
  return [...pool];
}

/**
 * The body of a region, as a walk on the edge profiles.
 *
 * Every chunk is entered where the last one was left, so a screen can hand the
 * Scribe on four tiles above the floor instead of resetting them to it — which
 * is the whole reason the Tree stopped being a corridor. Two rules keep it
 * honest:
 *
 * - It **begins and ends on the ground**, so `START_CHUNK` and `END_CHUNK`
 *   always connect and every excursion comes home.
 * - A high stretch runs at most `MAX_HIGH_RUN` screens. There is nothing
 *   beneath a high edge, so falling costs a veiling; a long stretch of that
 *   would be a punishment rather than a demand.
 *
 * If the pool cannot honour those — no way up, or no way down — the body is
 * simply laid on the ground, which is what the game did before there were
 * profiles at all. That fallback is why this can never fail to terminate.
 */
function layBody(
  pool: readonly Chunk[],
  length: number,
  rng: () => number,
  hard: boolean,
  quota: number,
): Chunk[] {
  const ground = pool.filter((c) => c.entry === "ground" && c.exit === "ground");
  if (ground.length === 0) return [];

  const body: Chunk[] = [];
  let at: Edge = "ground";
  let highRun = 0;
  let previous = "";
  let gated = 0;

  for (let i = 0; i < length; i += 1) {
    const remaining = length - i;
    const owed = quota - gated;
    const candidates = pool.filter((c) => {
      if (c.entry !== at) return false;
      // Come down in time to finish on the floor, and never stay up too long.
      if (c.exit === "high" && (remaining <= 1 || highRun >= MAX_HIGH_RUN)) return false;
      // Once only just enough screens are left to meet the quota, every one of
      // them has to ask for something.
      if (owed >= remaining && !asksForALetter(c)) return false;
      return true;
    });
    // Prefer not to repeat the screen just laid, so a region does not stutter.
    const fresh = candidates.filter((c) => c.id !== previous);
    const from = fresh.length > 0 ? fresh : candidates;
    if (from.length === 0) {
      // Stranded up high with nothing to come down on — abandon the height and
      // finish along the floor rather than build something uncrossable.
      return layGround(ground, length, rng, hard, quota - gated);
    }
    const pick = draw(from, rng, hard);
    body.push(pick);
    at = pick.exit;
    highRun = pick.exit === "high" ? highRun + 1 : 0;
    if (asksForALetter(pick)) gated += 1;
    previous = pick.id;
  }

  return at === "ground" ? body : layGround(ground, length, rng, hard, quota);
}

/**
 * The body laid flat, when the profiles cannot be honoured.
 *
 * It keeps the quota, which the first version of it did not — and that was
 * quietly the reason Tiferet asked for a letter less often than Netzach, one
 * region below it: any assembly that fell back to this path lost its gating
 * entirely, and the fallback fires more often than you would guess.
 */
function layGround(
  ground: readonly Chunk[],
  length: number,
  rng: () => number,
  hard: boolean,
  quota: number,
): Chunk[] {
  const body: Chunk[] = [];
  let previous = "";
  let gated = 0;
  for (let i = 0; i < length; i += 1) {
    const owed = quota - gated;
    const remaining = length - i;
    const eligible = ground.filter((c) => !(owed >= remaining && !asksForALetter(c)));
    const pool = eligible.length > 0 ? eligible : ground;
    const fresh = pool.filter((c) => c.id !== previous);
    const pick = draw(fresh.length > 0 ? fresh : pool, rng, hard);
    body.push(pick);
    if (asksForALetter(pick)) gated += 1;
    previous = pick.id;
  }
  return body;
}

/**
 * One screen from the pool — and above the Abyss, the harder of two.
 *
 * Drawing twice and keeping the harder is how the supernals end up genuinely
 * asking more than Gevurah without narrowing what they can draw on: every
 * screen in the band is still reachable, the distribution simply leans.
 */
function draw(pool: readonly Chunk[], rng: () => number, hard: boolean): Chunk {
  const first = pool[randomInt(rng, pool.length)];
  if (!hard) return first;
  const second = pool[randomInt(rng, pool.length)];
  return second.demand > first.demand ? second : first;
}

/**
 * The boundaries a fixed screen may be slotted into — those where the Scribe
 * is on the ground, since every fixed screen is entered and left there.
 * Position `i` means "before body screen `i`", so 0 and `body.length` are the
 * mouth and the tail of the body, both of which are always ground.
 */
function groundSlots(body: readonly Chunk[]): number[] {
  const slots = [0];
  for (let i = 0; i < body.length; i += 1) {
    if (body[i].exit === "ground") slots.push(i + 1);
  }
  return slots;
}

/** Writes the laid chunks into a tile grid and lifts the markers into entities. */
function paint(
  laid: readonly Chunk[],
  regionIndex: number,
  sefirah: World["sefirah"],
  regionLetters: readonly string[],
  rng: () => number,
  hasHouse: boolean,
  lightOfTheDay: number,
  firstFragmentIndex: number,
  wordGateTarget: WordGateTarget | undefined,
): World {
  const width = laid.length * CHUNK_W;
  const height = CHUNK_H;
  const tiles = new Uint8Array(width * height);
  const entities: Entity[] = [];

  let spawn = { x: TILE_SIZE * 2, y: TILE_SIZE * 14 };
  let letterCursor = 0;
  let fragmentCursor = firstFragmentIndex;
  let entityId = 0;

  // The House figure, when the region has one: a card from either of the
  // Sefirah's Houses, patriarchal or matriarchal — both stand at the rung.
  let dorotCardId: string | undefined;
  if (hasHouse) {
    const pool = housesBySefirah(sefirah).flatMap((house) => cardsByHouse(house.id));
    if (pool.length > 0) dorotCardId = pool[randomInt(rng, pool.length)].id;
  }

  laid.forEach((chunk, chunkIndex) => {
    const originX = chunkIndex * CHUNK_W;
    chunk.rows.forEach((row, y) => {
      for (let x = 0; x < CHUNK_W; x += 1) {
        const ch = row[x];
        const worldX = originX + x;
        const px = worldX * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (MARKER_CHARS.has(ch)) {
          tiles[y * width + worldX] = Tile.Empty;
          switch (ch) {
            case "S":
              spawn = { x: px, y: py };
              break;
            case "E":
              entities.push({ id: `e${entityId++}`, kind: "exit", x: px, y: py });
              break;
            case "L": {
              const letterId = regionLetters[letterCursor++];
              if (letterId) entities.push({ id: `e${entityId++}`, kind: "letter", x: px, y: py, ref: letterId });
              break;
            }
            case "F":
              entities.push({
                id: `e${entityId++}`,
                kind: "fragment",
                x: px,
                y: py,
                ref: String(fragmentCursor++),
              });
              break;
            case "?":
              if (wordGateTarget) {
                entities.push({ id: `e${entityId++}`, kind: "word-gate", x: px, y: py });
              }
              break;
            case "T":
              entities.push({ id: `e${entityId++}`, kind: "mark", x: px, y: py });
              break;
            case "H":
              if (dorotCardId) entities.push({ id: `e${entityId++}`, kind: "house", x: px, y: py, ref: dorotCardId });
              break;
            default:
              break;
          }
          continue;
        }

        if (ch === "*") {
          tiles[y * width + worldX] = Tile.Empty;
          entities.push({ id: `e${entityId++}`, kind: "mote", x: px, y: py });
          continue;
        }

        tiles[y * width + worldX] = TILE_CHARS[ch] ?? Tile.Empty;
      }
    });
  });

  scatterMotes(tiles, width, height, entities, rng, () => `e${entityId++}`, lightOfTheDay);

  const player: Player = {
    x: spawn.x,
    y: spawn.y,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    coyote: 0,
    jumpBuffer: 0,
    airJump: false,
    dash: 0,
    dashCooldown: 0,
    clinging: 0,
    climbing: false,
    inWater: false,
    crouching: false,
    veiled: 0,
    grappleCooldown: 0,
  };

  return {
    regionIndex,
    sefirah,
    tiles,
    width,
    height,
    player,
    entities,
    respawn: { ...spawn },
    revealed: false,
    placed: [],
    wordGate: wordGateTarget,
    or: 0,
    orPerMote: 1,
    orGathered: 0,
    veilings: 0,
    marksSet: 0,
    tick: 0,
    finished: false,
  };
}

/**
 * Scatters gathered light through the region.
 *
 * The authored chunks place a few motes deliberately, at the top of a climb
 * or behind a crawl, where they are a small reward for a small risk. These
 * are the others: strewn a stride above walkable ground along the whole
 * region, so that moving well is itself lit, and no screen is ever bare.
 *
 * `lightOfTheDay` is Sacred Time reaching the floor — a festival strews more,
 * a fast strews less. It changes what is lying about, never the ground itself,
 * so no day makes a region harder to cross than another.
 */
function scatterMotes(
  tiles: Uint8Array,
  width: number,
  height: number,
  entities: Entity[],
  rng: () => number,
  nextId: () => string,
  lightOfTheDay: number,
): void {
  const standable: { x: number; y: number }[] = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const here = tiles[y * width + x];
      const below = tiles[(y + 1) * width + x];
      const above = tiles[(y - 1) * width + x];
      const standing = below === Tile.Stone || below === Tile.Ledge;
      if (here === Tile.Empty && above === Tile.Empty && standing) standable.push({ x, y: y - 1 });
    }
  }

  const taken = new Set(entities.map((e) => `${Math.floor(e.x / TILE_SIZE)},${Math.floor(e.y / TILE_SIZE)}`));
  const wanted = Math.max(1, Math.round((width / 9) * lightOfTheDay));
  for (const spot of shuffle(rng, standable)) {
    if (entities.filter((e) => e.kind === "mote").length >= wanted) break;
    const key = `${spot.x},${spot.y}`;
    if (taken.has(key)) continue;
    taken.add(key);
    entities.push({ id: nextId(), kind: "mote", x: spot.x * TILE_SIZE, y: spot.y * TILE_SIZE });
  }
}

export function tileAt(world: World, tx: number, ty: number): Tile {
  if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) {
    // Outside the map: stone at the sides so the Scribe cannot walk off the
    // edge of the world, open above and below so a fall reads as a fall.
    return ty >= world.height || ty < 0 ? Tile.Empty : Tile.Stone;
  }
  return world.tiles[ty * world.width + tx] as Tile;
}

export function setTile(world: World, tx: number, ty: number, tile: Tile): void {
  if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) return;
  world.tiles[ty * world.width + tx] = tile;
}

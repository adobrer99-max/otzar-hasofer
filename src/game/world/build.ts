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
  SHRINE_CHUNK,
  START_CHUNK,
  TEACH_CHUNKS,
  WORD_GATE_CHUNK,
} from "./chunks";
import { MARKER_CHARS, Tile, TILE_CHARS, TILE_SIZE } from "./tiles";
import type { Chunk, Entity, Player, World } from "./types";

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
  const held = lettersOnEntering(regionIndex);
  const verbs = verbsOf(held);

  const passable = CHUNKS.filter((c) => c.requires.every((v) => verbs.includes(v)));
  if (passable.length === 0) {
    throw new Error(`Region ${regionIndex} has no passable chunks — the letter order is wrong`);
  }

  // The body: `length` screens drawn from what the Scribe can cross, biased
  // away from repeating the one just laid so a region does not stutter.
  const body: Chunk[] = [];
  let previous = "";
  for (let i = 0; i < region.length; i += 1) {
    const pool = passable.filter((c) => c.id !== previous);
    const pick = (pool.length > 0 ? pool : passable)[randomInt(rng, pool.length > 0 ? pool.length : passable.length)];
    body.push(pick);
    previous = pick.id;
  }

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
    SHRINE_CHUNK,
    ...(region.hasHouse ? [HOUSE_CHUNK] : []),
  ];
  // Distinct slots when there is room; otherwise several fixed screens share a
  // position and simply follow one another, which the painter below handles.
  const positions = Array.from({ length: body.length + 1 }, (_, i) => i);
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

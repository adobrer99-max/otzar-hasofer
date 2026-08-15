import { cardsByHouse, housesBySefirah } from "../../data/dorot";
import type { SefirahId } from "../../types/letter";
import type { Verb } from "../abilities";
import { abilityByLetter } from "../abilities";
import {
  fragmentsBefore,
  lettersOnEntering,
  regionAt,
  regionOfSefirah,
  regions,
  TOTAL_REGIONS,
  type Region,
} from "../regions";
import { makeRng, randomInt, shuffle } from "../rng";
import { chooseTarget, type WordGateTarget } from "../wordGate";
import {
  ABYSS_GATE_CHUNK,
  ARENA_A,
  ARENA_B,
  ARENA_CANOPY_A,
  ARENA_CANOPY_B,
  ARENA_PILLAR_A,
  ARENA_PILLAR_B,
  ARENA_ROOST_A,
  ARENA_ROOST_B,
  ARENA_SEA_A,
  ARENA_SEA_B,
  ARENA_SHELF_A,
  ARENA_SHELF_B,
  ARENA_TEETH_A,
  ARENA_TEETH_B,
  ARENA_TENT_A,
  ARENA_TENT_B,
  ARENA_TIERS_A,
  ARENA_TIERS_B,
  ARENA_VAULT_A,
  ARENA_VAULT_B,
  CHUNK_H,
  CHUNK_W,
  CHUNKS,
  END_CHUNK,
  FRAGMENT_CHUNK,
  HOUSE_CHUNK,
  LANDING_CHUNK,
  LETTER_CHUNK,
  RELIC_CHUNK,
  RISE_CHUNK,
  SHRINE_HIGH,
  SHRINE_LOW,
  START_CHUNK,
  TEACH_CHUNKS,
  VESSEL_CHUNK,
  GATE_HOARD,
  GATE_HOUSE,
  GATE_ODDS,
  WORD_GATE_CHUNK,
} from "./chunks";
import { HUSK_CHARS, HUSKS, kindForRole, LAMPS, type HuskKind } from "../combat";
import { VEIL_COST } from "../encounter";
import { drawKeli, keliFor, poolFor, type Keli } from "../items";
import { guardianOf } from "../guardians";
import { relicAt } from "../relics";
import { MARKER_CHARS, Tile, TILE_CHARS, TILE_SIZE } from "./tiles";
import { doorsOf, planFloor, roomAtPoint, ROOM_H, ROOM_W } from "./rooms";
import { crossesAbyss, TREE_PATHS, type TreePath } from "../tree";
import type { Chunk, Edge, Entity, Husk, Player, World } from "./types";

export const PLAYER_W = 16;
export const PLAYER_H = 30;

/** Screens to a room. Two, because one is portrait and cannot be framed. */
export const ROW_SCREENS_PER_ROOM = 2;

/**
 * How many rows of rooms a rung is built from — **the Tree grows taller.**
 *
 * One row is a corridor, which is what every rung was before rooms existed, so
 * the foot is untouched: Malchut goes on teaching in a straight line and keeps
 * the pacing that was measured and fixed. The map deepens as it is climbed,
 * which is the whole of what the shape says.
 */
export function rowsFor(regionIndex: number): number {
  return regionIndex <= 3 ? 1 : regionIndex <= 7 ? 2 : 3;
}

/**
 * The same function under the name the tests reach for. `route.test.ts` builds
 * rungs at an explicit shape — flat, and as they ship — and naming the shape at
 * those call sites keeps the test agreeing with what it means rather than with
 * whatever the generator happens to say.
 */
export const FLOOR_ROWS = rowsFor;

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
  /**
   * How many rows of rooms to build, overriding `rowsFor`.
   *
   * There for `route.test.ts`, and it earns its place: the rows are switched
   * off in the shipping build and the whole point of the route graph is to
   * prove that the floors are sound *before* they are switched on. Without a
   * way to build one there is nothing to prove it against.
   */
  rows?: number,
  /**
   * The letters the Scribe actually carries in, rather than the ones a linear
   * climb would have given them by now.
   *
   * The climb was a line, so "what is held here" and "which rung is this" were
   * the same fact and the generator read the second to get the first. On the
   * Tree they come apart: the route decides the alphabet, so the alphabet has
   * to be passed. Defaulted to the linear answer, which is still exactly right
   * for a linear climb and keeps every existing caller and test honest.
   */
  held: readonly string[] = lettersOnEntering(regionIndex),
): World {
  const region = regionAt(regionIndex);
  const rng = makeRng((seed ^ (regionIndex * 0x9e3779b9)) >>> 0);
  // The old road keeps the old fixture: `buildRegion` has no path to seed a
  // draw from and no notion of what is carried.
  const keli = keliFor(region.index);
  const { laid, wordGateTarget } = layout(region, rng, teaching, rows, held, keli);

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
    region.klipot,
    region.maskit,
    rows,
    // The taught porch stays empty of husks. Its whole job is to land four
    // coaching lines on flat ground, a step and a gap, and a klipah wandering
    // through the middle of that teaches something else entirely.
    (laid.length > 0 ? 1 : 0) + (teaching && region.index === 1 ? TEACH_CHUNKS.length : 0),
    keli,
  );
}

/**
 * Paint an explicit run of screens, for auditing the library itself.
 *
 * The companion to `layoutOf`, which exposes the assembly: this exposes the
 * ground. `chunks.audit.test.ts` uses it to ask what each authored screen
 * actually *requires*, by building it alone between a start and an end and
 * seeing whether a body holding a given alphabet can cross it — which is the
 * only way to find a requirement the author did not write down.
 */
export function paintChunks(
  laid: readonly Chunk[],
  seed = 1,
  /**
   * The figured-stone budget — zero by default, which is what every existing
   * caller wants and is why it stays a default rather than a required
   * argument.
   *
   * It has to be reachable, though: an authored `m` over budget is written as
   * ordinary stone, so a per-screen instrument painting a trap screen through
   * this would measure the screen with its trap turned off and report it as
   * harmless. Set high enough and every authored stone on the chain stands.
   */
  maskit = 0,
): World {
  const region = regionAt(1);
  return paint(
    laid,
    1,
    region.sefirah,
    [],
    makeRng(seed >>> 0),
    false,
    1,
    0,
    undefined,
    { kinds: [], count: 0 },
    maskit,
    1,
    laid.length,
  );
}

/**
 * The screens a region is made of, in order — separated from painting them so
 * that the assembly can be inspected directly rather than inferred from tiles.
 * `build.test.ts` reads the chain and the demand curve straight off this.
 */
export function layoutOf(
  regionIndex: number,
  seed: number,
  teaching = false,
  rows?: number,
): Chunk[] {
  const region = regionAt(regionIndex);
  return layout(
    region,
    makeRng((seed ^ (regionIndex * 0x9e3779b9)) >>> 0),
    teaching,
    rows,
    lettersOnEntering(regionIndex),
  ).laid;
}

/**
 * The letters that move a body rather than open a way: the Breath, the Bridge,
 * the Fence and the House. Every one of them is a *general* answer to ground —
 * more air, more reach, a wall to climb, a step to set — as against the Hook or
 * the Eye, which answer one particular thing.
 */
const MOBILITY: readonly Verb[] = ["double-jump", "dash", "wall-cling", "block"];

function layout(
  region: Region,
  rng: () => number,
  teaching: boolean,
  rowsOverride: number | undefined,
  held: readonly string[],
  /** The vessel this rung will hold, if any — see `paint`. */
  keli?: Keli,
  /**
   * **Which of the gate's rooms this rung's gate opens onto.**
   *
   * Passed in rather than drawn here, and that is the whole of the care this
   * needs: `buildPath`'s main generator has `drawKeli` as its first consumer,
   * and `keliOnPath` recreates exactly that first draw to tell the map which
   * vessel a path holds. Anything reaching for `rng` before it moves every
   * screen on every path. So the choice is made outside, off a generator of its
   * own — see `gateRoomFor`.
   */
  gateRoom: Chunk = WORD_GATE_CHUNK,
): { laid: Chunk[]; wordGateTarget: WordGateTarget | undefined } {
  const regionIndex = region.index;
  /**
   * **A figure behind a gate is only offered where there is a figure to be
   * had.** Only the seven lower Sefirot have Houses in `dorot.ts`; above the
   * Abyss the card is undefined and an `H` would lay nothing at all, which is
   * an empty room behind a door somebody answered for. Narrowed here, where the
   * region is in hand and `gateRoomFor` cannot see it.
   *
   * **And it adds a figure rather than moving one**, which was the first
   * design and was wrong in a way worth writing down: suppressing `HOUSE_CHUNK`
   * takes an entry out of `fixed[]`, and `room = max(fixed.length, stopping + 2)`
   * feeds the body's length, the padding and the squaring — so the rung got
   * *shorter* and every seed after it reshuffled. Measured: the tour went from
   * inside its cap to 202 walks against 200, on the seed it had always passed.
   * That is P9d's finding run backwards, and it is the second time the same
   * arithmetic has caught a change nobody thought touched it.
   */
  const gate = gateRoom.id === GATE_HOUSE.id && !region.hasHouse ? GATE_HOARD : gateRoom;
  const verbs = verbsOf(held);

  /**
   * **A body that can only walk and jump gets ground it can walk and jump.**
   *
   * Filtering the library by `requires` alone is the obvious rule and it was
   * enough for as long as the climb was a line: a Scribe never held the Hook
   * without also holding the Breath, the Bridge and the Fence, because the
   * letters arrived in one order and terrain that asks for the Hook is only
   * laid where the Hook has been found.
   *
   * The Tree can hand out the Hook first. Measured against a competent body
   * holding *exactly* what a screen declares and nothing else: `anchor-gap` is
   * crossed none times in six, and is crossed five or six in six the moment any
   * one of the Bridge, the Fence or the Breath is added — none of which the
   * screen has anything to do with. The same for `set-stone`, `vine-ascent`,
   * `high-span` and the lifted screens. They are not under-declared about the
   * letter they gate on; they assume a body that can do more than step and
   * jump, which is an assumption the line made true and the Tree does not.
   *
   * So a Scribe carrying no way of moving beyond their own legs walks ground
   * that asks nothing and stays on the floor — which is exactly what Malchut
   * is, and is proved crossable empty-handed on every seed by the rung tests.
   * One mobility letter, any of them, and the whole library opens up.
   */
  const mobile = MOBILITY.some((v) => verbs.includes(v));
  const passable = CHUNKS.filter(
    (c) =>
      c.requires.every((v) => verbs.includes(v)) &&
      (mobile || (c.requires.length === 0 && c.entry === "ground" && c.exit === "ground")),
  );
  if (passable.length === 0) {
    throw new Error(`Region ${regionIndex} has no passable chunks — the letter order is wrong`);
  }

  // Then the band. A region draws only from screens that ask what it is meant
  // to ask — and the *floor* is the part that matters, because it is what
  // keeps a flat walk out of the crown. If the band leaves too little to
  // choose from the region widens it rather than repeating itself; it never
  // starves, and it never throws.
  const banded = withinBand(passable, region.demand);

  // The quota is clamped to what the pool can actually supply. Hod holds no
  // verb that is reached for — the Bridge is *given* there — so demanding that
  // half its screens ask for one filtered out every ungated screen in the
  // library, emptied the candidate list, and dropped the region into the
  // ground-only fallback. Which is why Hod could never branch.
  // The gate's answer is chosen first, from roots the Scribe can already
  // spell with the letters they arrive holding. No target, no gate — which is
  // why Malchut and Yesod carry none: with two letters there is nothing to
  // spell. This is the same shape as `requires` on a chunk: the generator is
  // not permitted to express an unsolvable one.
  const wordGateTarget = chooseTarget(held, rng);

  /**
   * **Over the gulf the gate stops being a niche and becomes the way.**
   *
   * A Word-Gate elsewhere is one room off the path, worth twelve light for the
   * exact root and free to walk past — which made the one place the game asks a
   * Scribe to actually *know* something the one place it costs nothing to
   * shrug at. Once a climb, at the Abyss, it is the door.
   *
   * Conditioned on the target rather than on the crossing alone, and that is
   * the whole soft-lock argument: no target means no root this Scribe can
   * spell, and a barrier with no answer is not a question. Then the crossing
   * simply ends the way every other rung does. The rung tests measure how often
   * that fallback is reached — it should be never, and it is.
   */
  const overTheAbyss = Boolean(region.overTheAbyss && wordGateTarget);

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
    // ...but not on a crossing, where the gate has moved to the way out and a
    // second one beside the road would let the Scribe answer the question
    // somewhere it costs nothing and walk through the door it opened.
    // `openWordGate` dissolves every barrier in the world, and that is right:
    // there is one gate per rung, and over the gulf it is the last one.
    ...(wordGateTarget && !overTheAbyss ? [gate] : []),
    // One mark per region below the Abyss, and none above it. Low at the foot
    // of the Tree where it is walked into, on a shelf higher up where taking
    // it is a choice.
    ...(region.hasShrine ? [region.index <= 3 ? SHRINE_LOW : SHRINE_HIGH] : []),
    ...(region.hasHouse ? [HOUSE_CHUNK] : []),
    // One vessel per rung above the kingdom, on a shelf off the floor. It is
    // the only fixed screen that gives something the alphabet does not.
    ...(keli ? [VESSEL_CHUNK] : []),
    // And the chamber, on every rung that has a hidden thing to hide — which
    // is every Sefirah but the crown. **Unconditional on whether the relic is
    // already held**, deliberately: `room` below is `fixed.length + 2`, so a
    // conditional fixed screen would change the rung's length and every draw
    // after it, and the Tree would become a function of the Scribe's reliquary
    // rather than of the day. A relic already found leaves the chamber empty.
    ...(relicAt(region.sefirah) ? [RELIC_CHUNK] : []),
  ];

  // Every fixed screen is entered and left on the ground, so they may only be
  // slotted where the body is *already* on the ground.
  //
  // **A rung must be long enough to carry what it holds.** `region.length` was
  // authored as a length and read as one, and the fixed screens were then
  // pushed into whatever gaps happened to exist — so Malchut, six body screens
  // carrying six plates, was half plates, and Hod and Netzach had *fewer*
  // ground boundaries than fixed screens because their bodies climb, which
  // dropped them into a fallback that repeats a slot and stacked three plates
  // in a row in half of all climbs. Measured over forty seeds, both.
  //
  // So the body grows until there is room for a screen of actual game between
  // them. `length` becomes the floor rather than the whole story, and a rung
  // is exactly as long as its own content asks — Keter, carrying two plates,
  // does not grow at all.
  //
  // **And the chamber is not one of them**, which is the whole reason it can
  // be afforded. `room` is a rule about *plates*: a screen you stop on wants a
  // screen of game on either side of it. The relic chamber is the one fixed
  // screen a Scribe walks straight through — its ground lane is clear the whole
  // width by construction, and it raises nothing unless you climb to it. Counted
  // as a plate it grew every rung by twelve per cent and Chochmah by a third
  // (eighteen screens to twenty-four), because `room` feeds the body's length
  // *and* the padding loop *and* the squaring, so one screen compounds into
  // three. Measured over sixty-six honest walks with the klipot standing, that
  // cost the fighter nine points of finish rate and **two and a half times the
  // goings-out** — a price paid by every climb for a room most of them never
  // enter. So it is slotted like a fixed screen and lengthens nothing.
  const stopping = fixed.filter((c) => c.id !== RELIC_CHUNK.id).length;
  const room = Math.max(fixed.length, stopping + 2);
  const quota = banded.some(asksForALetter)
    ? gatedQuota(Math.max(region.length, room), region.demand)
    : 0;
  const body = layBody(
    banded,
    Math.max(region.length, room),
    rng,
    region.demand.bias === "hard",
    quota,
  );
  // A body that climbs offers fewer boundaries than it has screens, so the
  // count is checked after the fact and topped up with plain ground. `layBody`
  // always ends on the floor, so appending ground screens is always valid.
  const flat = banded.filter((c) => c.entry === "ground" && c.exit === "ground");
  // Padding is still the region's terrain, not a corridor. Drawn from the
  // gentlest thing to hand it would be free ground, and it was: one seed of
  // Tiferet became crossable by a Scribe who only walks and jumps, which the
  // suite watches for precisely because that used to be the whole game.
  const demanding = flat.filter((c) => asksForALetter(c) || c.demand > 1);
  const padding = demanding.length > 0 ? demanding : flat;
  while (groundSlots(body).length < room && padding.length > 0 && body.length < room * 3) {
    body.push(draw(padding, rng, region.demand.bias === "hard"));
  }
  const positions = groundSlots(body);
  const slots = spaceOut(fixed.length, positions, rng);

  const content: Chunk[] = [START_CHUNK, ...(teaching && regionIndex === 1 ? TEACH_CHUNKS : [])];
  let nextFixed = 0;
  for (let i = 0; i <= body.length; i += 1) {
    while (nextFixed < slots.length && slots[nextFixed] === i) {
      content.push(fixed[nextFixed]);
      nextFixed += 1;
    }
    if (i < body.length) content.push(body[i]);
  }
  content.push(overTheAbyss ? ABYSS_GATE_CHUNK : END_CHUNK);

  const rows = rowsOverride ?? rowsFor(regionIndex);
  // A room is two screens and a floor is a whole number of rows, so an odd
  // count would leave half a room hanging off the end — a hole in the frame
  // rather than a hole in the level, and worse for it. Flat screens before the
  // exit square it up, drawn from the same pool as the rest, so they are the
  // region's own ground. The stairwell screens are counted here rather than
  // stamped over the content afterwards: substituting them clobbered whatever
  // they landed on, and what they landed on was sometimes a letter.
  const flatEnough = banded.filter((c) => c.entry === "ground" && c.exit === "ground");
  const filler = flatEnough.length > 0 ? flatEnough : banded;
  const hard = region.demand.bias === "hard";
  return { laid: withStairs(content, rows, filler, rng, hard), wordGateTarget };
}

/**
 * Fold a rung's screens into storeys, with a stairwell at each boundary.
 *
 * The way up is always at the end of the row you are walking, which falls
 * straight out of the serpentine — so the last screen of a storey is the
 * `RISE` and the first screen of the one above it is the `LANDING`. They are
 * structural, like the start and the end: the seed decides everything between
 * them and nothing about where they are.
 */
function withStairs(
  content: readonly Chunk[],
  rows: number,
  filler: readonly Chunk[],
  rng: () => number,
  hard: boolean,
): Chunk[] {
  // Note that a one-storey rung comes through here too, and must: it has no
  // stairwell but it still has to be squared up to whole rooms, and returning
  // early left the lower Tree half a room wide.
  //
  // **A storey may only be cut where the ground is continuous.** The stairwell
  // screens are entered and left on the floor, so cutting the chain at an
  // arbitrary index put a `RISE` that enters on the ground after a screen that
  // exits up on the high road — a seam with the floor on one side and nothing
  // on the other. So the cut is nudged to the nearest join that is ground to
  // ground, exactly the rule `groundSlots` keeps for the fixed screens.
  const ideal = Math.ceil(content.length / rows);
  const cuts: number[] = [];
  for (let storey = 1; storey < rows; storey += 1) {
    const want = Math.min(content.length - 1, Math.max(1, ideal * storey));
    let at = want;
    for (let step = 0; step <= ideal; step += 1) {
      const candidates = [want - step, want + step];
      const found = candidates.find(
        (i) =>
          i > (cuts[cuts.length - 1] ?? 0) &&
          i < content.length &&
          content[i - 1].exit === "ground" &&
          content[i].entry === "ground",
      );
      if (found !== undefined) {
        at = found;
        break;
      }
    }
    cuts.push(at);
  }

  const storeys: Chunk[][] = [];
  let from = 0;
  for (const cut of [...cuts, content.length]) {
    storeys.push(content.slice(from, cut));
    from = cut;
  }

  // Every storey is the same width, or the grid is not a grid. Short ones are
  // padded with the region's own flat ground, which is also what squares a
  // rung up to whole rooms.
  const stairsIn = (storey: number) =>
    (storey > 0 ? 1 : 0) + (storey < rows - 1 ? 1 : 0);
  // Rounded up to whole rooms here rather than afterwards. Squaring the rung
  // up *after* the storeys were assembled meant splicing screens into a laid
  // sequence and pushing the stairwell out of place — a `RISE` in the middle
  // of a row, with the way up nowhere near the end of it.
  const widest = Math.max(...storeys.map((s, i) => s.length + stairsIn(i)));
  const perRow = Math.ceil(widest / ROW_SCREENS_PER_ROOM) * ROW_SCREENS_PER_ROOM;
  const laid: Chunk[] = [];
  storeys.forEach((screens, storey) => {
    const padded = [...screens];
    while (padded.length + stairsIn(storey) < perRow) {
      // As late in the storey as the chain allows, and never after the last
      // screen, so the exit stays the exit. "As the chain allows" is the whole
      // point: a flat screen dropped between two that hand each other on at
      // the high road breaks the floor at both seams.
      let at = padded.length - 1;
      while (at > 0 && !(padded[at - 1].exit === "ground" && padded[at].entry === "ground")) {
        at -= 1;
      }
      padded.splice(Math.max(1, at), 0, draw(filler, rng, hard));
    }
    if (storey > 0) laid.push(LANDING_CHUNK);
    laid.push(...padded);
    if (storey < rows - 1) laid.push(RISE_CHUNK);
  });
  return laid;
}

/** The fewest distinct screens a region may draw on before it starts to stutter. */
const MIN_POOL = 5;
/** How many screens a high stretch may run before it must come back down. */
const MAX_HIGH_RUN = 2;
/**
 * How many screens a branch may run before the roads rejoin.
 *
 * Longer than a high stretch, because a branch is not a risk the way a high
 * stretch is — the lower road is always there and always walkable, so a Scribe
 * who wants nothing to do with the upper one simply keeps walking.
 */
const MAX_BRANCH_RUN = 3;
/**
 * How often a region that *can* branch actually does.
 *
 * Left to uniform sampling a fork is one candidate among twenty and turns up
 * in about one climb in eight — which is not a feature, it is a rumour. So the
 * region decides up front whether it divides, and then takes the first fork it
 * can. Not every region: a Tree where every rung branches is as flat as one
 * where none does.
 */
const BRANCH_CHANCE = 0.55;

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
  // A screen with two roads asks for nothing, whatever it declares. `high-road`
  // needs the Hook to take the *upper* way and is a plain walk along the
  // lower one — so counting it toward the quota let a region believe it had
  // asked for a letter when a Scribe could stroll underneath. Measured: it put
  // two of forty-two upper-Tree assemblies back within reach of walking and
  // jumping alone.
  if (c.entry === "both" || c.exit === "both") return false;
  return c.requires.some((v) => !HAD_NOT_REACHED_FOR.includes(v));
}

/**
 * A screen that opens or closes a branch.
 *
 * These are exempt from the quota. A fork and a merge ask for no letter, so a
 * region with a tight quota filtered them out and never divided at all — the
 * mid-Tree was branching in one climb in ten. The cost is that a branching
 * region may fall one screen short of its quota, which is the right trade: a
 * branch that cannot open is worth less than a letter asked for once more.
 */
function structural(c: Chunk): boolean {
  const opens = c.entry !== "both" && c.exit === "both";
  const closes = c.entry === "both" && c.exit !== "both";
  // Only the two ends. The screens *inside* a branch face the quota like any
  // other, or a region could spend its whole length on a branch that never
  // asks for anything.
  return opens || closes;
}

/**
 * How many screens in a region must actually ask for a letter.
 *
 * Without this the seed is free to fill a region entirely with screens that
 * ask nothing but walking and jumping — and it did: measured across the upper
 * Tree, better than half of all assemblies could be crossed holding only the
 * two movement keys, because the letterless screens in the library were enough
 * to build a whole region out of — nine of them when this was measured, and
 * sixteen since the library grew. A region that gives you twelve verbs
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

  // Decided before anything is laid, and only if the pool can actually open a
  // branch and close it again.
  const canBranch =
    pool.some((c) => c.entry === "ground" && c.exit === "both") &&
    pool.some((c) => c.entry === "both" && c.exit === "ground");
  let wantsBranch = canBranch && length >= 4 && rng() < BRANCH_CHANCE;

  const body: Chunk[] = [];
  let at: Edge = "ground";
  let highRun = 0;
  let branchRun = 0;
  let previous = "";
  let gated = 0;

  for (let i = 0; i < length; i += 1) {
    const remaining = length - i;
    const owed = quota - gated;
    const candidates = pool.filter((c) => {
      if (c.entry !== at) return false;
      // Come down in time to finish on the floor, and never stay up too long.
      if (c.exit === "high" && (remaining <= 1 || highRun >= MAX_HIGH_RUN)) return false;
      // The same for a branch: the roads must rejoin before the region ends.
      if (c.exit === "both" && (remaining <= 1 || branchRun >= MAX_BRANCH_RUN)) return false;
      // Once only just enough screens are left to meet the quota, every one of
      // them has to ask for something.
      if (owed >= remaining && !asksForALetter(c) && !structural(c)) return false;
      return true;
    });
    // **Prefer not to repeat the screen just laid**, so a region does not
    // stutter — and *only* the screen just laid, which is a finding.
    //
    // A path pays exactly one letter, so on the Tree the pool a rung draws from
    // is routinely three screens rather than a dozen, and a memory one deep
    // produces `wide-chasm`, something, `wide-chasm`, something, `wide-chasm`.
    // That looked like the obvious cause of the probe stalling on the Tree, and
    // a three-deep memory was written and measured: the layouts did vary, the
    // stall count did not move at all, and it cost a rung of the linear climb
    // that had been green on every seed. The repetition was real and was not
    // the problem; what was, was a handful of screens that assume more of a
    // body than they declare, which is written up on the Tree's own probe test.
    const fresh = candidates.filter((c) => c.id !== previous);
    let from = fresh.length > 0 ? fresh : candidates;

    // If this region means to divide, divide at the first screen that can —
    // leaving room to run the branch and rejoin before the exit.
    if (wantsBranch && at === "ground" && remaining > 3) {
      const forks = from.filter((c) => c.exit === "both");
      if (forks.length > 0) {
        from = forks;
        wantsBranch = false;
      }
    }
    if (from.length === 0) {
      // Stranded up high with nothing to come down on — abandon the height and
      // finish along the floor rather than build something uncrossable.
      return layGround(ground, length, rng, hard, quota - gated);
    }
    const pick = draw(from, rng, hard);
    body.push(pick);
    at = pick.exit;
    highRun = pick.exit === "high" ? highRun + 1 : 0;
    branchRun = pick.exit === "both" ? branchRun + 1 : 0;
    // Once the road has divided it must come back together, so nothing may
    // preempt the merge.
    if (pick.exit === "both") wantsBranch = false;
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
 * Where the fixed screens go — spread across the rung rather than sprinkled.
 *
 * A fixed screen is a screen you *stop* on: a letter in its alcove, a genizah
 * niche, a Word-Gate, the shrine, the House. Chosen by shuffling the ground
 * slots and taking the first N, they clump — measured over forty seeds, Hod
 * and Netzach laid three of them in a row in about half of all climbs, which
 * is three plates and no game in between. And the foot of the Tree feels
 * crowded for the same reason from the other direction: Malchut carries six
 * fixed screens and Keter two, so the rung that also has the teaching porch on
 * it is the one with the least room to breathe.
 *
 * This does not change how many there are. It divides the rung into as many
 * bands as there are screens to place and takes one slot from each, so a plate
 * is always followed by ground before the next one — the pacing is the same
 * shape whether a rung carries two or six.
 *
 * The jitter inside each band is what keeps the layout from reading as a
 * metronome; the fallback, for a rung with fewer ground slots than screens,
 * is the old behaviour, because a repeated slot is better than dropping a
 * letter on the floor.
 */
function spaceOut(count: number, positions: readonly number[], rng: () => number): number[] {
  if (count === 0) return [];
  if (count > positions.length) {
    return Array.from({ length: count }, (_, i) => positions[randomInt(rng, positions.length)] ?? i).sort(
      (a, b) => a - b,
    );
  }
  // Greedy, and greedy in that order for a reason: an evenly-banded version of
  // this was tried first and made the clumping *worse*, because a rung with
  // six screens and seven boundaries has bands one boundary wide and every
  // band-edge pick lands next to its neighbour. Taking the roomiest gap each
  // time can only do better than shuffling, whatever the ratio.
  const shuffled = shuffle(rng, [...positions]);
  const chosen: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const free = shuffled.filter((p) => !chosen.includes(p));
    const roomy = free.filter((p) => chosen.every((c) => Math.abs(c - p) > 1));
    chosen.push((roomy.length > 0 ? roomy : free)[0]);
  }
  return chosen.sort((a, b) => a - b);
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

/**
 * **The Houses remember, and open further.**
 *
 * A hundred and sixty-eight Dorot cards ship with this game and a climb meets
 * about four per cent of them, drawn uniformly at random — which meant that
 * after twenty climbs a Scribe had a flat, shallow sample of everybody and a
 * deep acquaintance with nobody. The figures were an anthology rather than a
 * relationship.
 *
 * So the pool a rung draws from is a *window*, and it widens with how often
 * that Sefirah's House has stood for the Scribe at the crown — `witnessSefirot`
 * across every sealed climb, folded by `timesStood` in `book.ts`. Standing is
 * the right counter rather than meeting: walking past a figure is not being
 * spoken for, and a Scribe who has gone mute every time has met a great many
 * of them and been stood for by nobody.
 *
 * Two at first and two more per standing, per House. A patriarchal House has
 * eight cards and opens fully at the third standing; a matriarchal one has
 * sixteen and opens at the seventh — which is the length of the Seven
 * Encounters, and is not a coincidence.
 *
 * **Applied per House rather than to the pool**, which matters: the pool is
 * both Houses' cards end to end, so a window over the concatenation would give
 * a new Scribe the patriarchal House's opening and lock the matriarchal one
 * out entirely — and `story.ts` leans on either being able to stand at a rung.
 */
export const FIRST_CARDS = 2;
export const CARDS_PER_STANDING = 2;

export function cardsOpen(total: number, timesStood: number): number {
  return Math.max(1, Math.min(total, FIRST_CARDS + Math.max(0, timesStood) * CARDS_PER_STANDING));
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
  klipot: Region["klipot"],
  /** How many figured stones to lay in this rung's floor — see `Tile.Maskit`. */
  maskit: number,
  rowsOverride: number | undefined,
  quiet: number,
  /**
   * The vessel this rung's pedestal holds, if it holds one. Passed in rather
   * than looked up, because on the Tree it is *drawn* — from the day, the path,
   * and what the Scribe is already carrying — and `paint` has none of those.
   */
  keli?: Keli,
  /**
   * How many times this Sefirah's House has stood for the Scribe at the crown,
   * across every sealed climb — see `cardsOpen`.
   */
  cardDepth = 0,
  /**
   * The hidden things this Scribe has already found, across every sealed
   * climb. The chamber is laid either way — see `RELIC_CHUNK` — so this decides
   * only whether anything stands in it, which changes no tile and therefore no
   * ground. An empty chamber is the picture of a thing already taken.
   */
  relicsFound: readonly string[] = [],
  /**
   * **Whether this ground has been gleaned already**, which the authored motes
   * have to know and `lightOfTheDay` cannot tell them.
   *
   * A re-walk pays `SPENT_LIGHT` — but that multiplier is applied to the *day's*
   * light before it arrives here, and it only ever reached `scatterMotes`'s
   * budget. Authored motes are laid unconditionally and earlier, so the moment
   * they started existing they were a farm: walk a path, take its light, walk it
   * again and every star is still standing at full value. `economy.test.ts`'s
   * re-walk band caught it on the first run, which is what that band is for.
   *
   * It cannot be inferred from the light that arrives, either, and that is why
   * this is a parameter rather than a division: a dim festival day and a path
   * already walked reach `paint` looking identical, and only one of them should
   * empty the ledges.
   */
  spent = false,
): World {
  // The screens are dealt into a floor before anything is written. One row is
  // a corridor and is exactly what every rung was before rooms existed, so
  // this changes nothing until a rung asks for a second row.
  const floor = planFloor(laid, rowsOverride ?? rowsFor(regionIndex));
  const width = floor.cols * ROOM_W;
  const height = floor.rows * ROOM_H;
  const tiles = new Uint8Array(width * height);
  const entities: Entity[] = [];

  let spawn = { x: TILE_SIZE * 2, y: TILE_SIZE * 14 };
  const husks: Husk[] = [];
  let letterCursor = 0;
  let authored = 0;
  /** Authored motes seen so far — see the `"*"` case, and `spent`. */
  let stars = 0;
  /**
   * Figured stones laid because a screen asked for one — see `TILE_CHARS`'s
   * `m`. They come out of the rung's own `maskit` budget before the scatter
   * gets any of it, so the two ways of laying one cannot double-count, and a
   * rung's floor never holds more lies than its Sefirah allows.
   */
  let figured = 0;
  let fragmentCursor = firstFragmentIndex;
  let entityId = 0;

  // The House figure, when the region has one: a card from either of the
  // Sefirah's Houses, patriarchal or matriarchal — both stand at the rung, and
  // how far into each one's episodes this Scribe has earned is `cardsOpen`.
  /**
   * **Two of them, and the second costs no draw.**
   *
   * A rung lays one House; a gate whose room holds a figure lays another, and
   * standing the same person twice would be worse than standing nobody. The
   * second is simply the *next* card in the pool rather than a second
   * `randomInt` — because every draw taken from this generator shifts the husk
   * scatter, the motes and the figured stones that come after it, and a screen
   * that is laid on one rung in four would then move the ground on that rung
   * and nowhere else.
   */
  const dorotCards: string[] = [];
  if (hasHouse) {
    const pool = housesBySefirah(sefirah).flatMap((house) => {
      const cards = cardsByHouse(house.id);
      return cards.slice(0, cardsOpen(cards.length, cardDepth));
    });
    if (pool.length > 0) {
      const at = randomInt(rng, pool.length);
      dorotCards.push(pool[at].id, pool[(at + 1) % pool.length].id);
    }
  }
  let houseCursor = 0;

  floor.placements.forEach(({ chunk, x: chunkX, y: chunkY, mirrored }) => {
    const originX = chunkX * CHUNK_W;
    const originY = chunkY * CHUNK_H;
    chunk.rows.forEach((row, y) => {
      for (let x = 0; x < CHUNK_W; x += 1) {
        // A screen laid back to front is read back to front. Everything on it
        // moves with it — tiles, markers, motes and the klipot alike.
        const ch = mirrored ? row[CHUNK_W - 1 - x] : row[x];
        const worldX = originX + x;
        const worldY = originY + y;
        const px = worldX * TILE_SIZE;
        const py = worldY * TILE_SIZE;

        if (MARKER_CHARS.has(ch)) {
          tiles[worldY * width + worldX] = Tile.Empty;
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
            /** The floor of the chamber that was never one — see `GATE_FALL`. */
            case "X":
              entities.push({ id: `e${entityId++}`, kind: "opening", x: px, y: py });
              break;
            /**
             * **A mote of light, where a screen said to put one.**
             *
             * This case did not exist, and the block that lays it — `if (ch ===
             * "*")`, a few lines below — is *unreachable*: `"*"` is a member of
             * `MARKER_CHARS`, so every star entered the switch above, matched
             * nothing, fell to `default` and was consumed by the `continue`.
             * Dead code under a live guard, which is why it read as correct.
             *
             * Seventy-eight authored motes across forty-nine of the seventy-four
             * screens, none of them ever laid. Nothing looked wrong, because
             * `scatterMotes` tops a rung up to the day's budget: the light was
             * never *missing*, it was **moved** — off the ledge somebody put it
             * on and onto whatever standable ground the shuffle picked, which is
             * mostly the walking line.
             *
             * Reported from play as the Word-Gate offering nothing, and that is
             * the sharpest case: its chamber holds two of these and is the one
             * screen in the game that asks a Scribe to *know* something.
             * Measured over 220 gates, a symmetric four-tile window: **117 held
             * anything against 187, and 0.68 motes a gate against 1.89.** About
             * half of every answered gate opened on an empty room.
             *
             * Authored motes are pushed here, before `scatterMotes` runs, so
             * they are never crowded out by the budget — the day decides how
             * much light a rung holds, and the screens decide where it is.
             */
            case "*":
              // **One in seven survives a re-walk**, which is `SPENT_LIGHT`
              // stated as a count rather than a multiplier — there is no
              // fraction of a mote. By index and not by a draw, because the
              // main generator's first consumer is `drawKeli` and `keliOnPath`
              // recreates that draw to tell the map which vessel a path holds:
              // anything that reaches for it here moves every screen after it.
              if (!spent || stars % 7 === 0) {
                entities.push({ id: `e${entityId++}`, kind: "mote", x: px, y: py });
              }
              stars += 1;
              break;
            case "Y":
              // Where the road divides. Resh returns the Scribe here.
              entities.push({ id: `e${entityId++}`, kind: "fork", x: px, y: py });
              break;
            case "H":
              {
                const card = dorotCards[houseCursor];
                if (card) {
                  houseCursor += 1;
                  entities.push({ id: `e${entityId++}`, kind: "house", x: px, y: py, ref: card });
                }
              }
              break;
            case "K": {
              if (keli) entities.push({ id: `e${entityId++}`, kind: "vessel", x: px, y: py, ref: keli.id });
              break;
            }
            case "R": {
              // Keyed off the Sefirah alone, with no draw of any kind: the
              // chamber's contents must not touch this rng, because `drawKeli`
              // is its first consumer and `keliOnPath` recreates that draw to
              // tell the map which vessel a path holds. Nothing here is random
              // anyway — a place hides one thing, always the same thing.
              const relic = relicAt(sefirah);
              if (relic && !relicsFound.includes(relic.id)) {
                entities.push({ id: `e${entityId++}`, kind: "relic", x: px, y: py, ref: relic.id });
              }
              break;
            }
            default:
              break;
          }
          continue;
        }

        // A husk stands where it is written, on empty ground. The light it
        // holds is not strewn here — it comes out when the shell breaks.
        //
        // What the screen names is a **role**, not a klipah: the library is
        // authored once and drawn on by every rung, so a screen that named
        // Athaliah would stand her in Malchut. The rung's own pool answers, and
        // `authored` walks it so a screen with three alcoves does not fill all
        // three with the same shell.
        const huskRole = HUSK_CHARS[ch];
        const huskKind = huskRole ? kindForRole(klipot.kinds, huskRole, authored++) : undefined;
        if (huskKind) {
          tiles[worldY * width + worldX] = Tile.Empty;
          const spec = HUSKS[huskKind];
          husks.push({
            id: `h${entityId++}`,
            kind: huskKind,
            x: px,
            y: py + TILE_SIZE - spec.size.h,
            w: spec.size.w,
            h: spec.size.h,
            vx: 0,
            vy: 0,
            facing: -1,
            shells: spec.shells,
            home: { x: px, y: py },
            cooldown: 0,
            charging: 0,
            struck: 0,
          });
          continue;
        }

        const tile = TILE_CHARS[ch] ?? Tile.Empty;
        if (tile === Tile.Maskit) {
          // **Over budget, it is simply stone.** Not skipped, not made a hole:
          // `isSolid` gives the same answer for both, so a screen composed
          // around a trap is crossed exactly the same way on a rung that wants
          // no traps — and no change to `region.maskit`, in either direction,
          // can move the route graph or the no-soft-lock proof taken against
          // the painted grid. What changes is only whether the floor is honest.
          tiles[worldY * width + worldX] = figured < maskit ? Tile.Maskit : Tile.Stone;
          if (figured < maskit) figured += 1;
          continue;
        }
        tiles[worldY * width + worldX] = tile;
      }
    });
  });

  scatterMotes(tiles, width, height, entities, rng, () => `e${entityId++}`, lightOfTheDay);
  scatterHusks(tiles, width, height, husks, rng, () => `h${entityId++}`, klipot, quiet);
  layMaskit(tiles, width, height, rng, maskit - figured, quiet);

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
    crawling: false,
    veiled: 0,
    grappleCooldown: 0,
    lamps: LAMPS,
    iframes: 0,
    markCooldown: 0,
  };

  // The doors are read off the finished grid, not derived — whatever is empty
  // along a boundary is a way through, whether it is on the ground, up on the
  // high road, or a hole in a floor.
  for (const room of floor.rooms) {
    room.doors = doorsOf(room, tiles, width, height);
    room.husks = husks
      .filter(
        (h) =>
          h.x >= room.x * TILE_SIZE &&
          h.x < (room.x + room.w) * TILE_SIZE &&
          h.y >= room.y * TILE_SIZE &&
          h.y < (room.y + room.h) * TILE_SIZE,
      )
      .map((h) => h.id);
  }

  return {
    regionIndex,
    sefirah,
    tiles,
    width,
    height,
    player,
    entities,
    klipot: klipot.kinds,
    rooms: floor.rooms,
    roomIndex: Math.max(0, roomAtPoint(floor.rooms, spawn.x / TILE_SIZE, spawn.y / TILE_SIZE)),
    respawn: { ...spawn },
    revealed: false,
    mending: [],
    placed: [],
    wordGate: wordGateTarget,
    or: 0,
    orPerMote: 1,
    // The Encounters' own numbers, applied by `GamePage` as the world is
    // entered — the same place `powersFrom(items)` is folded in. Defaults are
    // the game played under no rule at all, which is every climb past the
    // seventh.
    huskLight: 1,
    sealedLight: 1,
    veilCost: VEIL_COST,
    inSealedRoom: false,
    orGathered: 0,
    veilings: 0,
    marksSet: 0,
    husks,
    marks: [],
    husksBroken: 0,
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
  // By area, not by width. A rung is several storeys tall now, so counting the
  // light by how *wide* it is left the supernals — the tallest rungs, and the
  // ones whose Sefirah costs most to kindle — with a third of the light they
  // need, and made kindling unaffordable exactly where it matters most.
  const wanted = Math.max(1, Math.round(((width * height) / CHUNK_H / 9) * lightOfTheDay));
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

/**
 * Scatters the klipot through a region.
 *
 * The same shape as `scatterMotes`, and for the same reason: a region's
 * density has to be a property of the *rung*, not of which screens the seed
 * happened to lay. Authored husks alone made the upper Tree emptier than the
 * foot, because the screens they stood on were demand 1 and the high bands
 * exclude those — measured at 1.5 husks in Malchut against 0.3 in Chesed.
 *
 * Two rules, both about fairness rather than balance:
 *
 * - **Nothing in the first screen or the last.** A Scribe walking in should
 *   not be walking into something, and neither should one walking out.
 * - **What flies goes in the air; everything else needs a floor.** A klipah
 *   that walks and is set down over nothing spends the region falling.
 */
/**
 * **The figured stones** — אֶבֶן מַשְׂכִּית, the ground that is not ground.
 *
 * **A lie may open onto a drop, and until P13d it could not.** The old rule
 * demanded hewn stone directly beneath, so springing one was always a step down
 * of a single tile onto a floor, and its comment called that "the whole reason
 * this can exist at all" — that `route.test.ts` earns the no-soft-lock
 * guarantee against the *painted* grid, and a trap which could take a tile out
 * of a floor is a trap that can invalidate the proof at runtime, "which no test
 * could ever catch."
 *
 * **The fear is answerable, and the answer is `mendFloor`.** The hole is not
 * permanent: forty ticks later the tile is written back as hewn stone — solid,
 * and indistinguishable to `isSolid` from what stood there before — and
 * `mendFloor` already refuses to close on top of a body, so nobody is ever
 * sealed into stone. A body that falls through is veiled at worst, and a
 * veiling is the one price terrain has always been allowed to charge. The grid
 * the route was proved against is *restored*; the worst case is losing a
 * crossing for two thirds of a second.
 *
 * **And an argument is not a guard**, so the geometry it stood in for is
 * asserted directly instead, which is strictly stronger than the rule it
 * replaces: `route.test.ts` floods each rung with **every figured stone in it
 * removed at once** and demands the way out still be reachable. That covers any
 * subset of them springing, and therefore any single one.
 *
 * What is left here is only what is still doing work — it must be stone, it
 * must have air above it so it is walked on, it must not sit on a seam, and no
 * two may stand side by side.
 */
function layMaskit(
  tiles: Uint8Array,
  width: number,
  height: number,
  rng: () => number,
  count: number,
  quiet: number,
): void {
  if (count <= 0) return;
  const margin = Math.max(1, quiet) * CHUNK_W + 4;
  const eligible: number[] = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = margin; x < width - (CHUNK_W + 4); x += 1) {
      const at = y * width + x;
      if (tiles[at] !== Tile.Stone) continue;
      if (tiles[at - width] !== Tile.Empty) continue;
      // No clause about what lies beneath. A stone over a floor is a stumble;
      // a stone over nothing is a fall, and a fall is the thing that actually
      // takes ground from a body that will not slow down. The safety of the
      // second is `mendFloor` plus the stones-removed flood, not geometry.
      // **Never on a seam.** Two screens meet at every `CHUNK_W`, and the edge
      // contract is checked by comparing the tiles either side of the join —
      // so a figured stone laid there reads as a profile mismatch. It would
      // also be a trap at the exact moment a Scribe is crossing from one
      // authored screen to the next, which is the least fair place to put one.
      const inScreen = x % CHUNK_W;
      if (inScreen < 2 || inScreen > CHUNK_W - 3) continue;
      eligible.push(at);
    }
  }
  // Never two in a row: a pair side by side is a two-tile hole, which is a
  // pit rather than a stumble, and it is also the only way this could drop a
  // Scribe somewhere a single step down does not reach back out of.
  //
  // **Asked of the grid rather than of this loop's own record**, because the
  // screens can now author their own — see `TILE_CHARS`'s `m`. A scattered
  // stone laid beside an authored one is the same two-tile hole as a scattered
  // pair, and a set that only remembers what this pass laid cannot see it.
  const taken = new Set<number>();
  const lies = (at: number) => taken.has(at) || tiles[at] === Tile.Maskit;
  for (const at of shuffle(rng, eligible)) {
    if (taken.size >= count) break;
    if (lies(at - 1) || lies(at + 1)) continue;
    taken.add(at);
    tiles[at] = Tile.Maskit;
  }
}

function scatterHusks(
  tiles: Uint8Array,
  width: number,
  height: number,
  husks: Husk[],
  rng: () => number,
  nextId: () => string,
  klipot: Region["klipot"],
  quiet: number,
): void {
  if (klipot.count <= 0 || klipot.kinds.length === 0) return;

  // Nothing in the opening screens, nothing in the last one.
  const margin = Math.max(1, quiet) * CHUNK_W + 4;
  const standing: { x: number; y: number }[] = [];
  const floating: { x: number; y: number }[] = [];
  for (let y = 2; y < height - 1; y += 1) {
    for (let x = margin; x < width - (CHUNK_W + 4); x += 1) {
      const here = tiles[y * width + x];
      const above = tiles[(y - 1) * width + x];
      const below = tiles[(y + 1) * width + x];
      if (here !== Tile.Empty || above !== Tile.Empty) continue;
      if (below === Tile.Stone || below === Tile.Ledge) standing.push({ x, y: y - 1 });
      else if (tiles[(y - 2) * width + x] === Tile.Empty) floating.push({ x, y: y - 1 });
    }
  }
  if (standing.length === 0) return;

  /**
   * **Dealt across the rooms, not sprinkled over the grid.**
   *
   * A corridor is one room deep, so scattering into random standing places put
   * a klipah more or less on the way through whatever happened. A floor is a
   * room grid, and the Scribe walks one route across it — so the same scatter
   * left half of them in corners of rooms nobody has any reason to enter.
   * Measured, the moment the rows came on: the share of shells a Scribe who
   * fights actually breaks fell from about three quarters on the corridors to
   * one fifth on the floors, and the rest were content nobody would ever see.
   * The way through passes every room, so one to a room, in order, and the
   * remainder round again.
   */
  const byRoom = new Map<number, { x: number; y: number }[]>();
  const roomOf = (spot: { x: number; y: number }) =>
    Math.floor(spot.y / ROOM_H) * 1000 + Math.floor(spot.x / ROOM_W);
  const deal = (spots: { x: number; y: number }[]) => {
    byRoom.clear();
    for (const spot of spots) {
      const key = roomOf(spot);
      const list = byRoom.get(key);
      if (list) list.push(spot);
      else byRoom.set(key, [spot]);
    }
    const rooms = [...byRoom.keys()].sort((l, r) => l - r).map((k) => byRoom.get(k) ?? []);
    const out: { x: number; y: number }[] = [];
    for (let round = 0; out.length < spots.length; round += 1) {
      let laid = false;
      for (const room of rooms) {
        if (round >= room.length) continue;
        out.push(room[round]);
        laid = true;
      }
      if (!laid) break;
    }
    return out;
  };

  const ground = deal(shuffle(rng, standing));
  const air = deal(shuffle(rng, floating));
  const taken = new Set<string>();
  let g = 0;
  let a = 0;

  for (let i = 0; i < klipot.count; i += 1) {
    const kind = klipot.kinds[randomInt(rng, klipot.kinds.length)];
    const spec = HUSKS[kind];
    const pool = spec.flies && air.length > 0 ? air : ground;
    const cursor = pool === air ? a : g;
    if (cursor >= pool.length) continue;
    const spot = pool[cursor];
    if (pool === air) a += 1;
    else g += 1;

    // No two shells in the same column, or they read as one shape.
    const key = String(spot.x);
    if (taken.has(key)) continue;
    taken.add(key);

    husks.push({
      id: nextId(),
      kind,
      x: spot.x * TILE_SIZE,
      y: spot.y * TILE_SIZE + TILE_SIZE - spec.size.h,
      w: spec.size.w,
      h: spec.size.h,
      vx: 0,
      vy: 0,
      facing: -1,
      shells: spec.shells,
      home: { x: spot.x * TILE_SIZE, y: spot.y * TILE_SIZE },
      cooldown: randomInt(rng, 40),
      charging: 0,
      struck: 0,
    });
  }
}

// ---------------------------------------------------------------------------
// a path is a rung
// ---------------------------------------------------------------------------

/**
 * The ground a path is made of, blended from the two Sefirot it joins.
 *
 * Twenty-two paths could have meant twenty-two hand-authored rungs, and it
 * would have been a year's work for ground that already exists. A path runs
 * between two Sefirot and it is *of* both of them, so it takes its character
 * from both: the demand band spans them, the klipot are what haunt either end,
 * the length is the mean. Nothing new is authored and every rung is still
 * recognisably somewhere.
 *
 * Two rules that are not averages, because averaging them would be wrong:
 *
 * - **The band takes the wider span, and the bias from either end.** A path
 *   touching the crown is a hard path even if its other end is Yesod. Meeting
 *   in the middle would have made the whole Tree the same difficulty, which is
 *   the exact failure the demand bands were introduced to fix.
 * - **The fixed screens come from the lower end.** The shrine, the House and
 *   the vessel belong to a place rather than to a crossing, and hanging them on
 *   the upper end would have put a House above the Abyss, where there are none.
 *
 * ## And the ground rises no higher than the Scribe
 *
 * The third rule is the one the Tree could not have been built without, and it
 * is not obvious until it is measured.
 *
 * On a line, difficulty and letters advanced together and could not come apart:
 * `lettersOnEntering(n)` *was* how far up you were, so a rung sized for Tiferet
 * was only ever met by a Scribe holding what Malchut through Hod pay out. The
 * whole tuning of this game — the bands, the floors, every measured reach in
 * `chunks.ts` — rests on that coupling.
 *
 * Twenty-two paths break it. A Scribe may leave Malchut by the Fence rather
 * than the Breath, cross to Hod, and stand at the foot of a path into the crown
 * holding a single letter; and the terrain, asked only where it lies, would hand
 * them three storeys of Keter. Measured, that is exactly what happened: the
 * probe stalled on twenty-two of thirty-two paths walked, and all but two of the
 * stalls were a Scribe with no Breath on ground built for one who has it. The
 * route graph called every one of them crossable and was right — a way existed.
 * A body could not walk it.
 *
 * So the band and the number of storeys are capped by **what the Scribe is
 * carrying**, not by where they have wandered. The Tree keeps its shape: the
 * klipot, the name, the shrine and the letter are all still of the place, and a
 * Scribe who has gathered the alphabet meets the crown at full height. What
 * changes is that arriving somewhere early no longer means arriving at ground
 * built for someone else. **Rushing the crown makes the crown shallow**, which
 * is the honest consequence and reads, in play, as its own kind of judgement.
 *
 * The cap is a count of *verbs matched against the old climb*, not a count of
 * letters, and the difference is the whole of it. Counting letters was tried
 * first and it halved the stalls rather than ending them, because three letters
 * that do not include the Breath is not three letters that do: a Scribe holding
 * the Fence, the Mark and the Window met two storeys of Netzach with no way to
 * leave the ground. So the rung a Scribe has earned is **the highest one whose
 * entry kit they could pass for** — every verb `lettersOnEntering(n)` would have
 * given them, they have. That is exactly the coupling the line used to provide
 * for free, restated as a rule instead of an accident of ordering.
 */
/**
 * What is left lying on a path already walked.
 *
 * A rung is rebuilt from its seed every time it is entered, which is what makes
 * a saved game a few dozen bytes — and on a line it never mattered, because a
 * rung was walked once and left behind. The Tree can be walked back over, and
 * `buildPath` is deterministic, so without this a Scribe short of light simply
 * walks the cheapest path again, and again, and kindling all ten stops being a
 * route and becomes a farm. The map would decide nothing.
 *
 * So the **strewn** light is taken once. `scatterMotes` already scales what it
 * lays by `lightOfTheDay` — Sacred Time reaching the floor, a festival strewing
 * more and a fast strewing less — and a path already walked is simply a dim day
 * on that one rung. No new mechanism, and the one that is reused is the one
 * that already means "how much light is lying about here".
 *
 * Three things deliberately survive a re-walk:
 *
 * - **The klipot**, because they are rebuilt with the rung. Crossing back still
 *   pays, and the fight is the reason to — which is the right shape, since a
 *   Scribe who wants light out of ground they have already taken should have to
 *   earn it against something.
 * - **The motes authored into the chunks themselves** (`*` in `chunks.ts`),
 *   which are placed at the top of a climb or behind a crawl and are the small
 *   reward for the small risk rather than the strewn income.
 * - **The Word-Gate**, which pays for an answer and not for a walk.
 */
export const SPENT_LIGHT = 0.15;

/**
 * **Which room a path's gate opens onto** — the day and the path together, as
 * the vessel is, so that everyone answering the same gate on the same day finds
 * the same thing behind it and no two paths hold the same thing.
 *
 * **Off a generator of its own, and that is not fastidiousness.** `buildPath`
 * seeds one rng and `drawKeli` is its first consumer; `keliOnPath` recreates
 * precisely that first draw so the Tree map can tell a player which vessel a
 * path holds without building the path. A draw taken from that generator before
 * it — or after it, since every later draw shifts too — moves the ground under
 * every screen on every path in the game. The relic chamber has the same note
 * against it and for the same reason.
 *
 * Hashed rather than drawn, in fact: there is nothing random about it once the
 * day and the path are known, and a hash cannot be got out of order.
 */
export function gateRoomFor(pathId: string, seed: number): Chunk {
  const at = (hashOf(`${pathId}:gate:${seed}`) >>> 0) % GATE_ODDS.length;
  return GATE_ODDS[at];
}

/** Every letter the Tree carries — the default, so a bare call sizes nothing down. */
const ALL_LETTERS: readonly string[] = TREE_PATHS.map((p) => p.letter);

export function regionOfPath(
  path: TreePath,
  held: readonly string[] = ALL_LETTERS,
  /** The Fifth Encounter's Living Creatures — more of them stand on a rung. */
  klipot = 1,
): Region {
  const [lower, upper] = path.ends.map((s) => regionOfSefirah(s));
  const kinds = [...new Set([...lower.klipot.kinds, ...upper.klipot.kinds])];
  const earned = regionAt(earnedRung(held));
  /** The Scribe has wandered higher up the Tree than their letters have carried them. */
  const behind = earned.index < upper.index;
  const over = crossesAbyss(path);
  return {
    ...lower,
    // The rung's index is the *upper* end's, because that is what says how far
    // up the Tree this ground lies — `rowsFor` and the shrine's height both
    // read it, and a path into the crown should be a crown-sized floor — but
    // never a taller one than the Scribe has letters to climb.
    index: Math.min(upper.index, earned.index),
    name: `${lower.name} → ${upper.name}`,
    letters: [path.letter],
    // **The whole band, or none of it.** Capping only the ceiling left the
    // *bias* untouched, so a Scribe held back to Malchut's ground still got a
    // layout drawn from the top of Malchut's band on every screen, because one
    // end of the path happened to be Gevurah. Measured, that was the larger
    // half of what remained. A Scribe who has run ahead of their letters walks
    // the ground their letters earned, bias and all; one who is where their
    // letters put them meets the place as authored.
    demand: behind
      ? { ...earned.demand }
      : {
          min: Math.min(lower.demand.min, upper.demand.min) as 1 | 2 | 3,
          max: Math.max(lower.demand.max, upper.demand.max) as 1 | 2 | 3,
          ...(lower.demand.bias || upper.demand.bias ? { bias: "hard" as const } : {}),
        },
    klipot: {
      kinds,
      // Rounded up, so a Day that says "the klipot are many" never rounds its
      // own rule away on a rung that happened to hold an odd number.
      count: Math.ceil(((lower.klipot.count + upper.klipot.count) / 2) * klipot),
    },
    // Capped the same way, and for the same reason: a corridor fourteen screens
    // long is its own kind of demand. Measured, the last three stalls left after
    // the band was capped were all one-storey paths of twelve to fourteen
    // screens walked by a Scribe with three letters — not ground they could not
    // cross, ground there was too much of.
    length: Math.min(Math.round((lower.length + upper.length) / 2), earned.length),
    // **And the traps, capped the same way.** A path takes its figured stones
    // from its lower end, and a Scribe holding three letters walking out of a
    // high Sefirah would otherwise get the crown's floor with the kingdom's
    // body. Measured before the cap: the share of Tree paths a competent probe
    // carried to the exit fell from eighty-eight to eighty-two and a half.
    maskit: Math.min(lower.maskit, earned.maskit),
    // The fixed screens stay with the lower end, which is a place rather than a
    // crossing. Fragments likewise, so the scroll is still strewn low.
    //
    // **Except over the gulf, where nothing stays.** Chochmah–Chesed would
    // otherwise inherit Chesed's House and Chesed's shrine, and carry the
    // kingdom's furniture out over the one stretch of the Tree that has none:
    // *nothing stands here, no House, no figure, no one to ask*, which is the
    // first line of `ABYSS_WORD` and has never until now been true of the
    // ground it is said over. No shrine is not a cosmetic loss — no shrine
    // means no mark, so a veiling on a crossing costs the whole rung.
    hasHouse: over ? false : lower.hasHouse,
    hasShrine: over ? false : lower.hasShrine,
    overTheAbyss: over,
    fragments: lower.fragments,
    // Whose niches these are, and *which* pieces they hold — the two must come
    // from the same end of the path. `index` above is the upper end's and is
    // about how big the ground is; it has no business naming a fragment.
    fragmentsFrom: fragmentsBefore(lower.index),
  };
}

/**
 * The highest rung whose entry kit this Scribe could pass for — every verb it
 * would have given them, they hold. Malchut asks for nothing, so the answer is
 * never lower than one.
 */
function earnedRung(held: readonly string[]): number {
  const mine = new Set(verbsOf(held));
  let earned = 1;
  for (let n = 1; n <= TOTAL_REGIONS; n += 1) {
    if (verbsOf(lettersOnEntering(n)).every((v) => mine.has(v))) earned = n;
  }
  return earned;
}

/**
 * Build the rung for walking a path, holding exactly these letters.
 *
 * The whole of what makes the Tree a Tree rather than a line: the terrain is
 * generated from what the Scribe actually carries, not from how far along a
 * fixed order they have got. `route.test.ts` is what says this is safe.
 */
export function buildPath(
  path: TreePath,
  seed: number,
  held: readonly string[],
  lightOfTheDay = 1,
  /**
   * The taught opening, for a Scribe who has never climbed. `layout` lays it
   * only on a rung of index one, which on the Tree is any path a Scribe with
   * no letters can be standing at the foot of — so the lesson still happens
   * exactly once, on the first path out of the kingdom, whichever one it is.
   */
  teaching = false,
  /**
   * Whether this path has been walked before — see `SPENT_LIGHT`.
   */
  spent = false,
  /** The Fifth Encounter's Living Creatures — see `regionOfPath`. */
  klipot = 1,
  /**
   * The vessels already carried, so a pedestal never holds one of them. It is
   * what makes the pool narrow as a climb goes on — the last vessels a Scribe
   * finds are the ones they went out of their way for.
   */
  items: readonly string[] = [],
  /**
   * How often this rung's House has stood for the Scribe at the crown. Passed
   * in rather than looked up, because it is a fold over every sealed climb
   * (`timesStood` in `book.ts`) and the generator knows nothing about storage.
   */
  cardDepth = 0,
  /**
   * The hidden things already in the Scribe's reliquary, so a chamber whose
   * relic is one of them stands empty. It changes nothing about the ground —
   * see `RELIC_CHUNK` on why the screen is laid either way.
   */
  relicsFound: readonly string[] = [],
): World {
  const region = regionOfPath(path, held, klipot);
  // Seeded by the path rather than the region, so walking Malchut→Hod is not
  // the same ground as walking Yesod→Hod on the same run.
  const rng = makeRng((seed ^ hashOf(path.id)) >>> 0);
  // **Drawn, not fixed.** The day and the path seed this together, so the
  // vessel on a given path is the same for everyone until midnight and
  // different on every path — which makes the map a list of places to go for
  // things, and is the whole reason the pool exists.
  const keli = drawKeli(rng, items, poolFor(seed));
  const { laid, wordGateTarget } = layout(
    region,
    rng,
    teaching,
    undefined,
    held,
    keli,
    gateRoomFor(path.id, seed),
  );

  return paint(
    laid,
    region.index,
    region.sefirah,
    region.letters,
    rng,
    region.hasHouse,
    lightOfTheDay * (spent ? SPENT_LIGHT : 1),
    region.fragmentsFrom ?? fragmentsBefore(region.index),
    wordGateTarget,
    region.klipot,
    region.maskit,
    undefined,
    laid.length > 0 ? 1 : 0,
    keli,
    cardDepth,
    relicsFound,
    spent,
  );
}

/**
 * **A guardian's room.**
 *
 * Three rooms rather than one, and the middle one is the fight: a Scribe walks
 * in, the way shuts behind them, and the way on opens when the shell breaks.
 * The entrance room exists because `stepRooms` will not seal the room you began
 * in — correctly, since a door that shuts on the tick you appear is a door you
 * never saw open — and the third holds the way out.
 *
 * Painted through `paintChunks`, which lays an explicit run of screens with no
 * klipot scattered into it, because a guardian is not scattered. It is placed,
 * once, in the middle of the middle room.
 *
 * The terrain is named rather than drawn from — `ARENA_ROOMS` below — and it is
 * named per *creature* rather than per Sefirah, because what a room is for is
 * the thing standing in it. Only the middle two screens change: the approach and
 * the way out stay plain, so the fight is the only place a Scribe has to read
 * the ground.
 */
export const ARENA_ROOMS: Partial<Record<HuskKind, readonly [Chunk, Chunk]>> = {
  arbeh: [ARENA_CANOPY_A, ARENA_CANOPY_B],
  nefilim: [ARENA_TEETH_A, ARENA_TEETH_B],
  saraf: [ARENA_SHELF_A, ARENA_SHELF_B],
  reem: [ARENA_PILLAR_A, ARENA_PILLAR_B],
  rahav: [ARENA_TIERS_A, ARENA_TIERS_B],
  og: [ARENA_VAULT_A, ARENA_VAULT_B],
  tannin: [ARENA_TENT_A, ARENA_TENT_B],
  livyatan: [ARENA_SEA_A, ARENA_SEA_B],
  ziz: [ARENA_ROOST_A, ARENA_ROOST_B],
  // And Behemoth is absent on purpose: the plain room *is* its terrain, for the
  // reason written over `ARENA_A`.
};

/**
 * Hung from the ceiling rather than stood on the floor — the two creatures whose
 * own code says they are never on the ground — and how far up, counted in rows
 * from the bottom of the room. Each room is drawn with stone directly above the
 * number, so the creature reads as held there rather than floating.
 *
 * The two numbers are different because the two fights are. The Ziz's height
 * *is* its lock: nothing but the Staff reaches eleven rows, which is exactly
 * what Chochmah declares. Yesod declares nothing, so the Nefilim hangs at six —
 * inside an ordinary mark's carry, and still well over a Scribe's head.
 */
const HANGS: Partial<Record<HuskKind, number>> = { ziz: 11, nefilim: 6 };

export function buildArena(sefirah: SefirahId, seed = 1): World {
  const guardian = guardianOf(sefirah);
  const region = regions.find((r) => r.sefirah === sefirah) ?? regionAt(1);
  const [first, second] = ARENA_ROOMS[guardian.kind] ?? [ARENA_A, ARENA_B];
  const laid = [START_CHUNK, ARENA_A, first, second, ARENA_B, END_CHUNK];

  const world = paintChunks(laid, seed);
  world.arena = sefirah;
  world.regionIndex = region.index;
  world.sefirah = sefirah;
  // **Nothing in here but the way out and the thing in the way.** `paint`
  // strews light the way it does on a rung, and a floor of motes in a boss
  // room is a floor of motes: it turns the fight into a shopping trip and it
  // says, wrongly, that there is something here to look for. What light there
  // is comes out of the shell.
  world.entities = world.entities.filter((e) => e.kind === "exit");

  const spec = HUSKS[guardian.kind];
  const middle = world.rooms[1] ?? world.rooms[0];
  const x = (middle.x + middle.w / 2) * TILE_SIZE;
  // **Seven tiles above the floor**, for the Ziz, and the number is the fight:
  // a mark angled up carries about six and a third tiles of height from the
  // Staff's sixteen extra ticks take it past nine. Anything lower and it is
  // reachable by a Scribe with no Staff; anything higher and it is reachable by
  // nobody. Everything else stands on the floor of the room.
  //
  // The Nefilim hangs too, lower, and for its own reason: it holds `vy` at zero
  // until the Scribe is underneath it, so a Nefilim on the floor is a Nefilim
  // with nothing to do. Hung, the one thing it was named for can happen. Both
  // heights and the argument between them are in `HANGS`.
  const hangs = HANGS[guardian.kind];
  const y = hangs
    ? (middle.y + middle.h - hangs) * TILE_SIZE
    : (middle.y + middle.h - 2) * TILE_SIZE - spec.size.h;
  world.husks = [
    {
      id: `guardian-${sefirah}`,
      kind: guardian.kind,
      x,
      y,
      w: spec.size.w,
      h: spec.size.h,
      vx: 0,
      vy: 0,
      facing: -1,
      shells: spec.shells,
      home: { x, y },
      cooldown: 0,
      charging: 0,
      struck: 0,
    },
  ];
  middle.husks = [world.husks[0].id];
  return world;
}

/**
 * The vessel lying on a path today, without building the rung to find out.
 *
 * `buildPath` draws it from the path's own generator before it lays a single
 * screen, so recreating that generator and taking the same first draw gives the
 * same answer for a fraction of the cost — which is what lets the overworld
 * name it on every way out of a Sefirah without generating twenty-two worlds to
 * paint one menu.
 *
 * It is coupled to `buildPath` by the order of two lines and nothing else, so
 * `items.test.ts` holds the two against each other rather than trusting it.
 */
export function keliOnPath(
  path: TreePath,
  seed: number,
  items: readonly string[] = [],
): Keli | undefined {
  return drawKeli(makeRng((seed ^ hashOf(path.id)) >>> 0), items, poolFor(seed));
}

/** The screens a path is laid from, for auditing the chain. */
export function laidOfPath(path: TreePath, seed: number, held: readonly string[]): Chunk[] {
  const region = regionOfPath(path, held);
  return layout(region, makeRng((seed ^ hashOf(path.id)) >>> 0), false, undefined, held).laid;
}

/** A stable number from a path's id, so a seed and a path together decide the ground. */
function hashOf(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

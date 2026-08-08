import type { Chunk, Edge } from "./types";

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
 * 2. Its `entry` and `exit` edges hold the shape of their profile, so any
 *    chunk may follow any other whose `exit` matches its `entry`.
 * 3. `requires` lists the verbs without which the screen cannot be crossed.
 *    A chunk is only ever laid into a region once the Scribe already holds
 *    them, which is what makes a soft-lock structurally impossible rather
 *    than something to test for.
 * 4. `demand` says what it asks of the hands, and a region draws only from
 *    its own band — which is what makes the crown harder than the foot.
 *
 * Optional side-routes may ask for anything at all — a mote behind a low
 * crawl, a shelf above a vine — because nothing on the way to the exit
 * depends on reaching them.
 *
 * ## The numbers you are authoring against
 *
 * Read off the constants in `step.ts`, and the reason every letterless step
 * in this file is exactly two tiles:
 *
 * These are **measured against the simulation**, not derived on paper — the
 * paper numbers were wrong by a tile in both directions:
 *
 * | motion | crosses |
 * |---|---|
 * | plain running jump | 4 tiles, and 2 tiles of rise |
 * | double jump (Aleph)| **7 tiles** in open air, 5 under a ceiling |
 * | double jump + dash | **14 tiles**, 13 under a ceiling |
 * | wall catch (Chet)  | any sheer face, indefinitely |
 *
 * Two consequences run through everything below.
 *
 * **A body standing on a floor row has its feet on that row's top edge**, so a
 * two-tile block is a 48 px step and a three-tile block is 72 px — and 72 is
 * past a plain jump. Every letterless rise here is therefore two tiles.
 *
 * **The Breath is found in Malchut, so from the second region on, every Scribe
 * has it.** A plain gap can therefore never gate anything narrower than eight
 * tiles, which is why the Bridge's chasm is roofed rather than widened: under
 * a ceiling there is no room to jump, a body that walks off the lip falls, and
 * the dash — which holds `vy` at zero for twelve ticks — is the one motion
 * that crosses. The same reasoning is why a sheer stone face gates nothing at
 * all: anyone carrying the Fence climbs it by holding toward it.
 */

export const CHUNK_W = 16;
export const CHUNK_H = 18;

/** The rows a `ground` edge must keep clear, so an entering body fits. */
export const EDGE_CLEAR_ROWS = [12, 13, 14, 15];
/** The rows a `ground` edge must keep solid, so there is ground to land on. */
export const EDGE_FLOOR_ROWS = [16, 17];
/** The same shape, lifted: a `high` edge is a ledge four tiles up. */
export const HIGH_CLEAR_ROWS = [6, 7, 8, 9];
export const HIGH_FLOOR_ROWS = [10, 11];
/**
 * And beneath a high edge, nothing. That absence is the whole point: a high
 * stretch is only high if falling off it costs something. It costs a veiling
 * — time and ground, never a letter and never the run — which is the most a
 * charged for a mistake of the feet. The klipot are what can end a run; the
 * ground itself only ever costs you the ground.
 */
export const HIGH_VOID_ROWS = [12, 13, 14, 15, 16, 17];

/**
 * A note on gaps, learned the hard way.
 *
 * A hole in a screen must go through **both** floor rows. A hole in row 16
 * with stone under it at row 17 is not a gap at all — it is a trench, and a
 * Scribe who misses the jump simply walks along the bottom and climbs out the
 * far side. Measured: it defeated every gated screen in the library at once,
 * because the Hook and the Bridge were both optional the moment there was
 * anything to stand on down there. Falling costs a veiling — time and ground,
 * never a lamp, which is the one price terrain is allowed to charge.
 */

/**
 * A `both` edge carries the ground lane *and* the high lane at once — it is
 * how a region branches. Two roads run side by side for a screen or three and
 * then come back together, which is the shape of the Tree itself: pillars that
 * part and rejoin. The high road is the harder one and holds more; the ground
 * road is always plain enough to walk.
 */
export const BOTH_CLEAR_ROWS = [...HIGH_CLEAR_ROWS, ...EDGE_CLEAR_ROWS];
export const BOTH_FLOOR_ROWS = [...HIGH_FLOOR_ROWS, ...EDGE_FLOOR_ROWS];

/** The columns both profiles are measured at. */
export const EDGE_COLUMNS = [0, 1, CHUNK_W - 2, CHUNK_W - 1];

const E = "................";
const F = "################";

interface Spec {
  requires?: Chunk["requires"];
  demand: Chunk["demand"];
  entry?: Edge;
  exit?: Edge;
}

function chunk(id: string, spec: Spec, rows: string[]): Chunk {
  return {
    id,
    requires: spec.requires ?? [],
    demand: spec.demand,
    entry: spec.entry ?? "ground",
    exit: spec.exit ?? "ground",
    rows,
  };
}

// ---------------------------------------------------------------------------
// the fixed screens
// ---------------------------------------------------------------------------

/** The screen every region opens on. */
export const START_CHUNK: Chunk = chunk("start", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  "..S.............",
  E,
  F,
  F,
]);

// ---------------------------------------------------------------------------
// the arenas
// ---------------------------------------------------------------------------
//
// **A room a Sefirah is held in.** Not laid by `layout` and not drawn from by
// anything — `buildArena` names them directly, because an arena is not a screen
// a rung might happen to get. `ARENA_ROOMS` in `build.ts` is the table that says
// which pair holds which creature, and the plain room below is what a guardian
// gets when the plain room is the right answer.
//
// **The rule every one of these keeps, and the reason for it.** Nothing solid
// stands in rows thirteen to fifteen except where a guardian's own mechanic
// needs it, because that band is where a walking body and a thrown letter both
// live: stone there is a hurdle to a Scribe and a wall to a mark, so a careless
// block in the middle of a sealed room is a fight nobody can finish. Terrain
// therefore goes *overhead*, or it is water, or it is ledge — which stops only
// a falling body and never a klipah, a mark or a walk. The one deliberate
// exception is Netzach, and it is deliberate because the Re'em's whole line is
// about running into stone.
//
// Read `combat.ts` beside this. **None of these rooms adds a behaviour** — the
// creatures already have theirs, and terrain is the whole of what is being
// authored here. Three of them amplify one: Netzach gives the Re'em stone to
// run into, Yesod gives the Nefilim something to hang from, Binah gives
// Leviathan the water it cannot be reached in. The rest are a look and a
// place — a canopy, a shelf, steps, a vault, an arcade, a roost — and the
// measured cost of the fight in them is the same to within a tick or two, which
// `guardianFight.test.ts` records rather than rounds off. Ten rooms that are ten
// places; three of them are also three fights.

/**
 * Flat, walled, and empty — the approach and the way out of every arena, and
 * **Behemoth's whole room**, which is not an omission.
 *
 * It runs, the walls do not stop it because it turns at them rather than
 * stopping, and the one thing that halts it is a stone the Scribe set. Every
 * feature the other nine rooms have would be a second thing that stops it, and
 * a second thing that stops it is the fight given away. Emptiness is the
 * terrain that amplifies Behemoth: a long clear run and nothing in it that the
 * Scribe did not put there.
 */
export const ARENA_A: Chunk = chunk("arena", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  E,
  E,
  F,
  F,
]);
export const ARENA_B: Chunk = chunk("arena", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  E,
  E,
  F,
  F,
]);

/**
 * The same room with the middle of it flooded, and dry land at both ends.
 *
 * The dry land is the whole fight: Leviathan cannot be marked in the water, so
 * a pool with no bank is a room with nothing to do in it. The water is four
 * rows deep, so a body drawn out of it lands somewhere a mark can reach.
 *
 * **And the channel is jumpable, which it was not.** Measured with the fighting
 * probe over three seeds: a Scribe carrying Vav — the one letter the map says
 * Binah asks for — and not Mem was stuck in this room for the whole
 * twenty-four-thousand-tick budget, every time. The way out is beyond the water
 * and the water was eight columns of it, so the room quietly demanded a second
 * letter the map never declares, and a Scribe who routed here without it walked
 * into a room they could not leave.
 *
 * Swimming was also the wrong answer on its own terms. Leviathan's whole
 * premise is that **nothing touches it in the water** — being in there with it
 * is not a thing the fight wants a Scribe to do. So the pool is narrowed to six
 * columns and the water stays exactly what it was for: the place the creature
 * cannot be reached in, and has to be drawn out of.
 *
 * Six and not four, which would have been a plain running jump: this rung is
 * over the Abyss, every Scribe standing in it has crossed a Word-Gate to be
 * here, and the Breath carries seven. What the narrowing buys is that the
 * channel is answered by what a Scribe already has rather than by one letter
 * the map never names.
 *
 * **The near bank did not move**, and that is not tidiness. `guardians.test.ts`
 * stands a Scribe two tiles into the room and asks whether the Hook can draw
 * Leviathan out from there — the lock the whole rung is built on — and the
 * creature swims to the water's near edge, so that edge is the range the test
 * measures. Taking the two columns off the far side keeps the answer to "can
 * the Hook reach it" exactly what it was, and narrows only the crossing.
 */
export const ARENA_SEA_A: Chunk = chunk("arena-sea", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E,
  "............wwww",
  "............wwww",
  "............wwww",
  "############wwww",
  F,
]);
export const ARENA_SEA_B: Chunk = chunk("arena-sea", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E,
  "ww..............",
  "ww..............",
  "ww..............",
  "ww##############",
  F,
]);

/**
 * **Malchut — the Arbeh.** A canopy, and it is nothing to them.
 *
 * The eighth plague is the only one that is a number rather than a thing, and
 * the locust is the one guardian that goes *through* the world: `flies` is set
 * on it, so stone, ledge and every other honest feature of a room are simply
 * absent as far as it is concerned. So the Kingdom's arena is the shelter that
 * does not shelter — a broken canopy the Scribe can climb onto and stand under
 * and put between themselves and the room, and the cloud comes through it as if
 * it were not there. Ledges rather than stone, because a ledge stops only a
 * falling body: nothing here is in the way of a walk or a mark.
 */
export const ARENA_CANOPY_A: Chunk = chunk("arena-canopy", { demand: 1 }, [
  E, E, E, E, E, E, E, E,
  "...===....===...",
  E, E, E,
  "..===......===..",
  E, E, E,
  F,
  F,
]);
export const ARENA_CANOPY_B: Chunk = chunk("arena-canopy", { demand: 1 }, [
  E, E, E, E, E, E, E, E,
  "..===......===..",
  E, E, E,
  "...===....===...",
  E, E, E,
  F,
  F,
]);

/**
 * **Yesod — the Nefilim.** Something to hang from, which it never had.
 *
 * "It hangs where it is and does nothing until you are underneath it" — and in
 * the plain room it was laid on the floor like everything else, where hanging
 * is indistinguishable from sitting. It has speed zero and holds `vy` at zero
 * until the Scribe walks under it, so a Nefilim on the ground is not a slow
 * fight, it is *no* fight: measured at six hundred and sixteen ticks, exactly
 * the empty room's own number.
 *
 * The pendant over the seam reaches down to row twelve, which is where
 * `buildArena` hangs it, so the creature is under stone rather than floating in
 * nothing — and the fall, when it comes, is the whole of what the name means.
 *
 * **Four tiles up and not nine**, which was measured and not chosen. Hung at
 * the Ziz's height it was outside the carry of an ordinary mark, and Yesod
 * declares no letter at all: the room would have grown a silent Staff lock that
 * the map never mentions, and the honest climb found it immediately — a Scribe
 * holding five letters stood in a sealed room with nothing they could reach.
 */
export const ARENA_TEETH_A: Chunk = chunk("arena-teeth", { demand: 1 }, [
  "....###.......##",
  "....###.......##",
  "....###.......##",
  "..............##",
  "..............##",
  "..............##",
  "..............##",
  "..............##",
  "..............##",
  "..............##",
  "..............##",
  "..............##",
  E, E, E, E,
  F,
  F,
]);
export const ARENA_TEETH_B: Chunk = chunk("arena-teeth", { demand: 1 }, [
  "##.......###....",
  "##.......###....",
  "##.......###....",
  "##..............",
  "##..............",
  "##..............",
  "##..............",
  "##..............",
  "##..............",
  "##..............",
  "##..............",
  "##..............",
  E, E, E, E,
  F,
  F,
]);

/**
 * **Hod — the Saraf.** Somewhere to stand that is not the ground.
 *
 * The bite is not what kills; what kills is the ground you have to go back over,
 * because the Saraf leaves burning marks behind it — forty ticks apiece, laid
 * every ninety, so the floor it has crossed is alight in patches. In an empty
 * room the answer to a burning floor is to walk to the other end of it. A shelf two tiles up is the other answer —
 * off it entirely — and two tiles is exactly a plain running jump's rise, so
 * the shelf is offered to every Scribe and not only to one holding the Breath.
 *
 * Ledges, so the Saraf itself keeps pacing underneath: it cannot follow, and it
 * is not stopped either.
 */
export const ARENA_SHELF_A: Chunk = chunk("arena-shelf", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  "...=====........",
  E,
  F,
  F,
]);
export const ARENA_SHELF_B: Chunk = chunk("arena-shelf", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  "........=====...",
  E,
  F,
  F,
]);

/**
 * **Netzach — the Re'em.** Two stones for it to run into.
 *
 * `combat.ts` says of it: *stone takes a shell off it — step out of the way and
 * it does the work. The one klipah in the game a Scribe can break without
 * writing.* That was written and then laid in a room with nothing in it but two
 * end walls, so the sentence was true in principle and unreachable in practice.
 *
 * The Re'em's charge tests the tile at its own mid-height, which for a body
 * twenty pixels tall standing on the floor is row fifteen — hence a stub two
 * rows tall rather than a decorative one. **This is the one place stone stands
 * in the walking band**, and it stands there knowingly: it is a hurdle a Scribe
 * vaults, five and six tiles out from where the creature is set, so the room's
 * middle stays open and the two stones are exactly where a thing that will not
 * turn ends up.
 */
export const ARENA_PILLAR_A: Chunk = chunk("arena-pillar", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  "..........#.....",
  "..........#.....",
  F,
  F,
]);
export const ARENA_PILLAR_B: Chunk = chunk("arena-pillar", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  ".....#..........",
  ".....#..........",
  F,
  F,
]);

/**
 * **Tiferet — Rahav.** Tiers, because the ground stops being tenable.
 *
 * Every shell taken off Rahav makes it larger and quicker — by the last one it
 * is nearly twice the creature it started as and moves at nearly twice the
 * speed, and it charges whenever the Scribe is anywhere near. What an empty
 * room offers against that is running away along a line, which is a fight that
 * gets worse in only one direction.
 *
 * So the harmony's room is built as a set of steps to either side, ledges at
 * two, four and six tiles, and the fight has a second axis in it: Rahav cannot
 * climb — none of the pacing creatures can — so the higher a Scribe goes the
 * more the exchange becomes writing downward instead of retreating sideways.
 * Pride swells at the foot of the steps.
 */
export const ARENA_TIERS_A: Chunk = chunk("arena-tiers", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E,
  "..........====..",
  E,
  "......====......",
  E,
  "..====..........",
  E,
  F,
  F,
]);
export const ARENA_TIERS_B: Chunk = chunk("arena-tiers", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E,
  "..====..........",
  E,
  "......====......",
  E,
  "..........====..",
  E,
  F,
  F,
]);

/**
 * **Gevurah — Og.** A weight overhead, and shafts in it.
 *
 * Og's step brings the ceiling down *where the Scribe is standing*, not where
 * Og is: it drops a stone seven tiles above the Scribe's own head. In a room
 * whose ceiling is nothing at all, that is a mark appearing out of clear air.
 * Here it comes out of a vault heavy enough to look like it could give.
 *
 * The number the slab is drawn against is that seven: the stone is spawned at
 * row seven, so anything solid at or below it would kill Og's only reach on the
 * tick it was thrown. The vault therefore stops at row five, and severity keeps
 * the one thing it does.
 */
export const ARENA_VAULT_A: Chunk = chunk("arena-vault", { demand: 1 }, [
  F,
  F,
  F,
  "####.######.####",
  "####.######.####",
  "###...####...###",
  E, E, E, E, E, E, E, E, E, E,
  F,
  F,
]);
export const ARENA_VAULT_B: Chunk = chunk("arena-vault", { demand: 1 }, [
  F,
  F,
  F,
  "##.######.######",
  "##.######.######",
  "#...####...#####",
  E, E, E, E, E, E, E, E, E, E,
  F,
  F,
]);

/**
 * **Chesed — the open tent.** An arcade, and no water, which is not what this
 * room set out to be.
 *
 * The Tannin holds the water and comes out at whatever stands on the bank, and
 * it has always been laid in a dry room, where its own code falls through to
 * the branch marked *laid on a rung with no water in it at all* and it paces
 * like a Cain. Chesed is water and the day the tanninim were made; a pool was
 * the obvious gift, and it was drawn, measured three ways, and taken out again.
 *
 * **Water in this room is a letter lock the map does not declare.** Not the
 * depth of it and not the width: `touchTiles` veils any Scribe who is in water
 * at all without Mem — *the deep will not carry you yet* — so a pool anywhere
 * on the ground a Scribe has to walk is a wall they can never pass, and the way
 * out of a guardian's room is on the far side of it. Measured over seeds
 * 3/91/555, a Scribe holding nine letters and not Mem broke the Tannin in about
 * two hundred and fifty ticks and then stood in a room they could not leave for
 * the remaining twenty-three thousand seven hundred and fifty. Chesed declares
 * no letter — its guardian's own reward *is* reach — and a rung that asks for
 * one the map never names is exactly the fault this phase found in Binah.
 *
 * A shallower pool did not fix it, and neither did moving it: a body that will
 * not wade stops at the near bank, and the fighting probe reads a water tile
 * ahead as a wall, correctly, because that is what Leviathan taught it.
 *
 * So Chesed gets a **look and not a mechanic**, and this comment says so rather
 * than the commit message claiming a sea fight. The tent of Mamre was open on
 * its four sides; the arcade below is that, and the ground under it is clear
 * from wall to wall. Leviathan keeps the water, which is Binah's, and the
 * Tannin's own sea is a thing this game still owes it.
 */
export const ARENA_TENT_A: Chunk = chunk("arena-tent", { demand: 1 }, [
  F,
  F,
  "###..........###",
  "###..........###",
  "##............##",
  "##............##",
  "#..............#",
  "#..............#",
  E, E, E, E, E, E, E, E,
  F,
  F,
]);
export const ARENA_TENT_B: Chunk = chunk("arena-tent", { demand: 1 }, [
  F,
  F,
  "####........####",
  "####........####",
  "###..........###",
  "###..........###",
  "##............##",
  "##............##",
  E, E, E, E, E, E, E, E,
  F,
  F,
]);

/**
 * **Chochmah — the Ziz.** The roof it is said to hold.
 *
 * *It never comes down* — it rides at its own height and the only question in
 * the fight is how far a Scribe can throw. The line says it holds the roof, and
 * there was no roof: it hung in open air at a height chosen by arithmetic.
 *
 * The vault here is drawn at row six, one row above where `buildArena` sets the
 * creature, so it rides directly beneath it. Ledges, and above the Ziz rather
 * than below it, for the reason the whole rung exists: this fight is a letter
 * lock, and anything a Scribe could climb, or anything that could stop a mark
 * short of the creature, would answer the Staff's question for them.
 */
export const ARENA_ROOST_A: Chunk = chunk("arena-roost", { demand: 1 }, [
  E, E, E, E, E, E,
  "..====....====..",
  E, E, E, E, E, E, E, E, E,
  F,
  F,
]);
export const ARENA_ROOST_B: Chunk = chunk("arena-roost", { demand: 1 }, [
  E, E, E, E, E, E,
  "...====...====..",
  E, E, E, E, E, E, E, E, E,
  F,
  F,
]);

/** The screen every region closes on. */
export const END_CHUNK: Chunk = chunk("end", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  "..........E.....",
  E,
  F,
  F,
]);

/**
 * The Tav shrine, at the foot of the Tree: on the ground, walked into.
 *
 * There is exactly one mark per region and it is the only thing standing
 * between a veiling and the whole region walked again, so the early ones are
 * given freely.
 */
export const SHRINE_LOW: Chunk = chunk("shrine-low", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  ".......T........",
  E,
  F,
  F,
]);

/**
 * The same mark, higher up the Tree, on a shelf — so setting it is a choice
 * rather than an accident. Two tiles up, inside a plain jump and therefore
 * never gated, but you have to want it: go up for the safety, or press on and
 * risk walking the region again.
 */
export const SHRINE_HIGH: Chunk = chunk("shrine-high", { demand: 2 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E,
  "......T.........",
  "......===.......",
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
export const LETTER_CHUNK: Chunk = chunk("letter-alcove", { demand: 1 }, [
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
export const FRAGMENT_CHUNK: Chunk = chunk("genizah-niche", { demand: 1 }, [
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
export const WORD_GATE_CHUNK: Chunk = chunk("word-gate", { demand: 1 }, [
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

/**
 * The way out of a crossing: **the gate is the door.**
 *
 * Laid in place of `END_CHUNK` on the five paths that cross the Abyss, and
 * nowhere else. Everything `WORD_GATE_CHUNK` is careful not to be, this is: the
 * exit stands inside a sealed chamber, the barrier is its only mouth, and the
 * ground floor no longer runs past underneath. A Scribe who will not answer
 * does not cross.
 *
 * That inverts the traversal guarantee on purpose and in one place. The
 * guarantee is not weakened, it is moved: `layout` lays this screen only when
 * `chooseTarget` has already found a root the Scribe can spell with the letters
 * in hand, `opens()` accepts *any* true root rather than only the one asked
 * for, and a wrong inscription may be tried again forever. The gate cannot be
 * failed, only refused — which is what makes refusing it mean something.
 *
 * The chamber's roof runs to row 0 rather than stopping at a ceiling. Columns
 * 11–15 are solid the whole way up because the way out is read as a doorway the
 * full height of its storey (see `touchEntities`), so a Scribe who wall-climbed
 * over a mere lintel would leave the rung by standing above the chamber without
 * ever going into it. There is nothing over the Abyss to climb onto.
 */
export const ABYSS_GATE_CHUNK: Chunk = chunk("abyss-gate", { demand: 1 }, [
  "...........#####",
  "...........#####",
  "...........#####",
  "...........#####",
  "...........#####",
  "...........#####",
  "...........#####",
  "...........#####",
  "...........#####",
  "...........#####",
  "...........#####",
  "...........#####",
  "...........W....",
  "...........W....",
  "...........W.E..",
  ".........?.W....",
  F,
  F,
]);

// ---------------------------------------------------------------------------
// the shaft — how a floor gets a second storey
// ---------------------------------------------------------------------------

/**
 * The columns a shaft runs through, and why they are these four.
 *
 * A floor is walked as a boustrophedon — along, up, back along — so every
 * other row is laid **mirrored**, which is what keeps the edge contract true
 * when a row is read right to left. Mirroring maps column `c` to `15 - c`, so
 * the shaft has to sit on columns that mirror onto themselves or a `LANDING`
 * would come down in a different place from the `RISE` under it. `{6,7,8,9}`
 * is the widest such set that leaves the edge profiles alone.
 */
export const SHAFT_COLS = [6, 7, 8, 9];

/**
 * The way up, and the way down: the last screen of a row and the first screen
 * of the row above it.
 *
 * Together they are a two-storey stairwell rather than a hole to be threaded.
 * That is deliberate — a two-tile hole demands a jump aimed to the pixel, and
 * every letterless step in this library is a plain two-tile rise for the same
 * reason. The `RISE` climbs in two-tile steps to a ledge at its very ceiling;
 * the `LANDING` is open through both floor rows above that ledge, with a
 * **ledge** across the opening. A ledge is solid from above only, so the Scribe
 * rises through it and lands on top of it — the one-way floor the game has had
 * since the first day, finally doing the job it was built for.
 *
 * Letterless by construction, which is the no-soft-lock guarantee pointed
 * upward: there is always a way up that asks for nothing. In practice nobody
 * meets a shaft without the Breath — floors start at Netzach — but the
 * guarantee is what stops a later letter order from quietly stranding anyone.
 */
export const RISE_CHUNK: Chunk = chunk("rise", { demand: 2 }, [
  "......====......",
  E,
  ".....====.......",
  E,
  "........====....",
  E,
  ".....====.......",
  E,
  "..====..........",
  E,
  ".....====.......",
  E,
  "........====....",
  E,
  ".....====.......",
  E,
  F,
  F,
]);

/**
 * Note the **ledge** across the opening rather than a hole in both floor rows.
 * From the ledge at the rise's ceiling a plain two-tile jump puts the feet
 * exactly on it, and from there the Scribe steps sideways onto the floor at
 * the same height. Every number in that sentence is the library's standard
 * step; nothing here asks for a jump aimed to the pixel.
 */
export const LANDING_CHUNK: Chunk = chunk("landing", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  "######====######",
  "######....######",
]);

/**
 * Where a vessel waits on its pedestal — off the floor, on a shelf you have to
 * want. Nothing here is gated: the object is a reward for looking rather than
 * for holding a particular letter, and a room that asked for a letter would
 * hand its object only to whoever needed it least.
 */
export const VESSEL_CHUNK: Chunk = chunk("vessel", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E,
  ".......K........",
  "......====......",
  E,
  E,
  F,
  F,
]);

/** Where the House's figure stands, in the seven lower regions. */
export const HOUSE_CHUNK: Chunk = chunk("house", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  ".....H..........",
  E,
  F,
  F,
]);

// ---------------------------------------------------------------------------
// the taught porch — a first ascent only
// ---------------------------------------------------------------------------

/**
 * Three screens laid before the seeded body of Malchut, and only for a Scribe
 * who has never climbed.
 *
 * They exist so the teaching has somewhere to land. A coaching line that says
 * "press ▲ to leap" has to arrive where there is something to leap, and the
 * seed cannot be relied on to lay a gap early — or at all. So the first three
 * screens of a first climb are fixed: flat ground to find the walk in, a low
 * step that must be jumped, and a gap that must be cleared.
 *
 * They ask for nothing, and they are the only screens left in the library that
 * are deliberately gentle — everything else Malchut can draw now asks
 * something. Note what this costs: a first Malchut is three screens longer
 * than the one everyone else climbs that day. The daily seed still governs the
 * whole Tree past the porch; it is only the porch that is a Scribe's own.
 */
export const TEACH_WALK: Chunk = chunk("teach-walk", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E, E,
  "....*......*....",
  E,
  F,
  F,
]);

export const TEACH_STEP: Chunk = chunk("teach-step", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E,
  ".......*........",
  ".....######.....",
  ".....######.....",
  F,
  F,
]);

export const TEACH_PIT: Chunk = chunk("teach-pit", { demand: 1 }, [
  E, E, E, E, E, E, E, E, E, E, E, E, E,
  ".......*........",
  E,
  E,
  "######...#######",
  "######...#######",
]);

/** The porch, in order. Laid only on a first ascent, only in Malchut. */
export const TEACH_CHUNKS: Chunk[] = [TEACH_WALK, TEACH_STEP, TEACH_PIT];

// ---------------------------------------------------------------------------
// the body: ground, demand 1 — the gentlest ground still asks a jump
// ---------------------------------------------------------------------------

/**
 * The body of a region. Each is crossable with the verbs it names and no
 * others; several are crossable with none at all, which is what keeps the
 * first descent through Malchut walkable by a Scribe who holds nothing.
 *
 * **Two screens used to be here that asked nothing whatsoever** — `open-field`
 * was sixteen columns of flat floor with two motes on it, and `pillars` hung
 * three ledges in the air above an unbroken floor you simply walked under.
 * Between them they were a third of everything Malchut could draw. They are
 * gone; `pillars` came back as `pillar-crossing`, with the floor removed, so
 * the pillars are the road rather than the scenery.
 */
export const CHUNKS: Chunk[] = [
  chunk("stepped-rise", { demand: 1 }, [
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

  chunk("pit", { demand: 1 }, [
    E, E, E, E, E, E, E, E, E, E, E,
    ".......j........",
    E,
    ".......*........",
    E, E,
    // Three tiles. A Scribe who has not yet found the Breath must be able to
    // clear this on a plain running jump, with room to spare.
    "######...#######",
    "######...#######",
  ]),

  chunk("upper-shelf", { demand: 1 }, [
    E, E, E, E, E, E, E, E, E,
    ".......k........",
    ".....*..*.......",
    "....========....",
    E, E,
    "..==........==..",
    E,
    F,
    F,
  ]),

  chunk("crawl-nook", { demand: 1 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E, E,
    "...#######......",
    "...cc*cc........",
    F,
    F,
  ]),

  /**
   * A block in the road, two tiles high, with the light on top of it.
   *
   * The plainest thing this library did not have. Every letterless screen here
   * was a hole or a shelf over a hole; nothing was simply *in the way* at a
   * height a body steps over. Two tiles is a plain jump's whole rise, so it
   * asks for the jump and nothing beyond it, and the mote is up there because a
   * thing worth climbing should have something on it.
   */
  chunk("the-plinth", { demand: 1 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E,
    ".....*...*......",
    ".....######.....",
    ".....######.....",
    F,
    F,
  ]),

  /**
   * Two three-tile gaps with an island between them.
   *
   * **The island is four tiles and it was two.** Two is enough to stand on and
   * not enough to stop on: measured, a body that cleared the first gap arrived
   * at the second still moving and went into it, thirty-four times in one rung.
   * A screen crossable in isolation and not in a region is the worst kind here,
   * because the sweep that checks every chunk one at a time says nothing about
   * it — this one was caught by the region walk, on one seed, at ninety per cent.
   */
  chunk("two-pits", { demand: 1 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E,
    "...*......*.....",
    E,
    E,
    "###...####...###",
    "###...####...###",
  ]),

  // -------------------------------------------------------------------------
  // ground, demand 2 — Malchut's teeth. Letterless, and still demanding.
  // -------------------------------------------------------------------------

  /**
   * Four tiles of nothing — and the reason for the step before it.
   *
   * 96 px of gap against 110 px of running jump leaves fourteen pixels, and a
   * hand that commits a tile early spends all of them: measured, the jump
   * misses by two. The single raised tile at the lip is what makes it fair.
   * Taking off from a tile higher than the landing buys another twenty-four
   * pixels of carry, because the body is in the air for longer on the way
   * down. Demanding, and not a coin toss.
   */
  chunk("long-pit", { demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E, E, E,
    "............k...",
    ".......*........",
    E,
    "...###..........",
    "######....######",
    "######....######",
  ]),

  /**
   * Two ledges at the same height with four tiles between them, over a basin.
   * The jump needs the coyote grace at the lip to make it comfortably — which
   * the physics has always had and nothing has ever asked for.
   */
  chunk("broken-ledges", { demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E,
    E,
    "....==....===...",
    "...*........*...",
    "###.........####",
    "###.........####",
  ]),

  /**
   * A staircase in two-tile steps, over a basin. Nothing here is beyond a
   * plain jump; all of it is beyond walking.
   */
  chunk("ledge-stair", { demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E, E,
    "........*.......",
    "........===.....",
    E,
    "....===.........",
    E,
    "###.........####",
    "###.........####",
  ]),

  /**
   * The pillars, rebuilt. The floor between them is gone, so the three stumps
   * are the way across rather than decoration hanging over an unbroken road.
   */
  chunk("pillar-crossing", { demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E,
    E,
    "...==..==..==...",
    "....*...*...*...",
    "##...........###",
    "##...........###",
  ]),

  /**
   * Two stacks standing in the void, each two tiles wide. Nothing here is
   * beyond a plain jump and every one of them has to be aimed — you leave the
   * second stack on a jump, not by walking off it, because walking off lands
   * forty pixels short of the far side.
   */
  chunk("narrow-stacks", { demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E,
    "..*.....*.......",
    "..###...###.....",
    "..###...###.....",
    "##..........####",
    "##..........####",
  ]),

  /**
   * A stair of plinths, each two tiles above the last, over unbroken ground.
   *
   * **Nothing here is a void, and that is the design.** This screen began as a
   * chain of ledges across a basin and cost three fixes and about thirty
   * veilings on one seed of Yesod before the lesson arrived: a ledge stops a
   * body only when it is *falling* onto it, so a body still rising goes through
   * the thing it aimed at and into the hole behind it. Two rules came out of
   * that and hold everywhere in this file now — **anything that is the only way
   * over a void is stone**, and no hop is four tiles at the same height, which
   * is a plain jump's exact reach and therefore a coin toss rather than a
   * demand. (The same knife-edge is why `set-and-step` has six tiles between
   * its walls rather than four.)
   *
   * What the demand is here instead: three climbs of two with a one-tile slot
   * between each, and the floor under all of it, so a miss costs the time to
   * come back around and never the rung.
   */
  chunk("stagger-stacks", { demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E,
    "...*.....*......",
    E,
    ".......####.....",
    ".......####.....",
    "..###..####.....",
    "..###..####.....",
    F,
    F,
  ]),

  /**
   * The floor is gone and the way over it is a shelf that has to be got onto —
   * two tiles up and one across from the lip, which is a plain jump with the
   * rise spent and nothing to spare.
   */
  chunk("the-undercut", { demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E,
    "....*..*...*....",
    "....========....",
    E,
    "###..........###",
    "###..........###",
  ]),

  /**
   * A block at the very lip of the gap, so the jump is taken from two tiles up
   * and the run at it is short.
   *
   * **Four tiles, and five was tried.** Taking off higher than the landing buys
   * carry — the body is in the air longer on the way down — and `long-pit`
   * spends that on four tiles from one tile up. Doubling the lip does not buy a
   * second tile: measured, a letterless Scribe failed five on every seed. What
   * the extra height buys is the *approach*, which here is three tiles rather
   * than a run-up, and that is the demand.
   */
  chunk("the-lip", { demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E,
    "...*.......*....",
    "..#####.........",
    "..#####.........",
    "#######....#####",
    "#######....#####",
  ]),

  // -------------------------------------------------------------------------
  // ground, demand 3, and no letter — **the lane that had nothing in it.**
  //
  // Measured over three seeds and every path of the Tree: the demand-3
  // ground-to-ground lane held six screens and *not one of them was free*, so
  // the hardest ordinary ground in the game could only ever be laid for a
  // Scribe who already held two verbs, and the six were the six most-repeated
  // screens of a full tour — eight to eleven appearances each, in one climb.
  // Height and aim can be demanding without a letter, which is what these are.
  // -------------------------------------------------------------------------

  /**
   * Three stumps in a basin that runs the whole screen. Every jump is inside a
   * plain one and every one of them has to be aimed, and there is no floor
   * under any of it: a miss is a veiling rather than a stumble.
   */
  chunk("long-teeth", { demand: 3 }, [
    E, E, E, E, E, E, E, E, E, E,
    "...*..*.....*...",
    E,
    "......###.......",
    "......###.......",
    "..###......###..",
    "..###......###..",
    "##............##",
    "##............##",
  ]),

  /**
   * Seven tiles of nothing with one ledge in the middle of it, and a second
   * ledge over that with the light on it — the crossing is two aimed jumps and
   * the mote is a third that buys nothing but the mote.
   */
  chunk("the-gulf", { demand: 3 }, [
    E, E, E, E, E, E, E, E, E, E, E,
    "......*....*....",
    ".....=====......",
    E,
    "......###.......",
    E,
    "####.......#####",
    "####.......#####",
  ]),

  // -------------------------------------------------------------------------
  // ground, one verb — the library as it stood
  // -------------------------------------------------------------------------

  // Eight tiles of it. A barrier four tiles high is not a barrier: the Breath
  // is found in Malchut, and a double jump tops six.
  chunk("thorn-hedge", { requires: ["cut"], demand: 1 }, [
    E, E, E, E, E, E, E,
    "...........q....",
    ".......^........",
    ".......^........",
    ".......^........",
    ".......^....*...",
    ".......^........",
    ".......^........",
    ".......^........",
    ".......^........",
    F,
    F,
  ]),

  /**
   * A wall with a vine on it — and, honestly, `requires: []`.
   *
   * This screen claimed to gate the Ascent for as long as it existed, and it
   * never did: the Fence climbs *any* sheer stone face by holding toward it,
   * and every Scribe carries the Fence from Yesod on. So it is what it always
   * was — a wall with two answers, the vine and the catch — and it says so:
   * the Fence is what it needs, which also keeps it out of Malchut, where
   * neither letter has been found. Because the Fence is *had* rather than
   * reached for, it no longer counts toward a region's quota of screens that
   * ask for a letter. `vine-ascent` and `flooded-shaft` are the real gates on
   * Kuf: both put the vine in open air, where there is no face to catch.
   */
  chunk("vine-wall", { requires: ["wall-cling"], demand: 2 }, [
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

  chunk("deep-channel", { requires: ["swim"], demand: 1 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E,
    "###wwwwwwwwww###",
    "###wwwwwwwwww###",
  ]),

  chunk("veiled-span", { requires: ["reveal"], demand: 1 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E, E,
    "....V..V..V.....",
    E,
    "###..........###",
    "###..........###",
  ]),

  /**
   * Two rings over ten tiles of nothing — and it was uncrossable by a Scribe
   * holding the Hook and nothing else, which is all this screen declares.
   *
   * Not because the Hook is weak. The graph crosses it: a cast reaches seven
   * tiles and the rings are within that. What a body cannot do is *make the
   * distance between casts* — the throw off a ring is three hundred upward
   * against a jump's four hundred and seventy, so it hangs for about a third of
   * a second, and five tiles of drift in that third of a second is more than
   * the throw gives you. Every Scribe who ever crossed this had the Bridge as
   * well, because on a line the Hook is found at Vav and the Bridge at Gimel,
   * three rungs earlier.
   *
   * So: three rings rather than two, three tiles apart rather than five, and
   * lower — the cast from the lip is a shorter, flatter line. Measured, six of
   * six holding only the Hook, and the graph still refuses it to a Scribe
   * holding nothing, which is what the ten tiles are for.
   */
  chunk("anchor-gap", { requires: ["grapple"], demand: 1 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E,
    "...A..A..A......",
    E, E,
    "####........####",
    "####........####",
  ]),

  // One sheer face, six tiles of it. Hold toward the wall and jump: the
  // Fence is climbed by catching it again and again, not by bouncing between
  // two of them.
  chunk("sheer-wall", { requires: ["wall-cling"], demand: 1 }, [
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

  /**
   * A gap under a ceiling — and the ceiling is the whole point.
   *
   * Six tiles of open air used to be enough to call a screen dash-gated, and
   * it was not: the Breath is found in Malchut and carries a body eight tiles,
   * so every "dash" chasm in the game was being cleared by a Scribe who never
   * pressed the key. A ceiling settles it — but only a ceiling that reaches
   * the top of the screen. A slab floating a few tiles up is a *bridge*: the
   * edge columns must stay clear for chunks to connect, so a Scribe simply
   * jumped up beside it and walked across the roof. Measured, and it put two
   * upper-Tree assemblies back within reach of walking alone.
   *
   * Nor is a slab that stops at row zero enough: the Fence catches its side,
   * and a wall-jump carries a body *above* the top of the screen, where there
   * is no tile to stop it, and it drifts over and comes down the far side.
   *
   * So everything above the corridor is stone, full width — except the two
   * edge columns at rows 12 and 13, which the connection contract requires to
   * stay clear and which now open into a pocket with solid rock above it.
   * There is eighteen pixels of headroom in the corridor. A body that walks
   * off the lip falls; the dash is flat — it holds `vy` at zero for twelve
   * ticks — and it is the one motion in the game that crosses this.
   *
   * **And it does not cross it alone.** The dash is the motion that gets a body
   * across, but the Breath is what gets it *started* — it has to be in the air
   * before the dash is worth anything. That was invisible for as long as the
   * climb was a line, because the Breath is found in Malchut and the Bridge
   * much later, so no Scribe ever held one without the other. The Tree hands
   * out letters in whatever order the route takes, and the first thing it did
   * was ask this screen a question it had never been asked.
   *
   * **Which found that the screen was, on its own terms, absurd.** Measured
   * against a competent body holding exactly the two letters it asks for: a
   * corridor with no headroom and eight tiles of gap was crossed six times in
   * six by a Scribe holding only the Bridge, and **none** in six by one holding
   * the Bridge and the Breath — because with the Breath in hand a body spends
   * it on the way out over the lip, and a second jump is the one thing that
   * ruins a flat dash. A screen that punishes you for holding a letter is not
   * a gate, it is a trap.
   *
   * So the corridor gains **two rows of headroom** and the gap stays at eight.
   * That is the whole of the fix, and it is the same one row that cured
   * `sheer-face`: the Breath now has somewhere to be spent, and a body holding
   * both letters crosses six times in six instead of none. The route graph
   * still refuses the crossing to a Scribe holding either letter alone, which is
   * what the two in `requires` are for.
   *
   * Said plainly, because it is the sort of thing that should not be discovered:
   * at this shape the *probe* can also cross it with the Bridge and no Breath,
   * where the graph says it cannot. The screen is therefore declared more
   * strictly than a very good pair of hands strictly needs — which is the safe
   * direction to be wrong in, since over-declaring costs a screen its place in a
   * layout and under-declaring costs a Scribe their run. Narrowing the gap to
   * seven closes that gap in the other direction and was measured too: it gates
   * exactly, and it cost a rung of the linear climb. Eight and roomy is the
   * shape that is green everywhere.
   */
  // And it is not a walk, now that it asks for two: a screen that needs the
  // Breath to leave the ground and the Bridge to stay off it is a two.
  chunk("wide-chasm", { requires: ["dash", "double-jump"], demand: 2 }, [
    F, F, F, F, F, F, F, F, F, F, F,
    "..############..",
    E,
    E,
    E,
    E,
    "####........####",
    "####........####",
  ]),

  chunk("overgrown-pass", { requires: ["flame"], demand: 1 }, [
    E, E, E, E, E, E, E, E,
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG...*...",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    F,
    F,
  ]),

  chunk("sealed-gate", { requires: ["open"], demand: 1 }, [
    E, E, E, E, E, E, E,
    "...n............",
    ".......DD.......",
    ".......DD.......",
    ".......DD.......",
    ".......DD...*...",
    ".......DD.......",
    ".......DD.......",
    ".......DD.......",
    ".......DD.......",
    F,
    F,
  ]),

  chunk("high-vault", { requires: ["double-jump"], demand: 1 }, [
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

  /**
   * **Bet sets dry land where there was none — and it has to be a rise, not a
   * gap.** This screen was five tiles of hole and it was uncrossable by a
   * Scribe holding Bet and nothing else, at every width the hole was tried at.
   *
   * The arithmetic is unforgiving and is worth writing down, because the
   * obvious screen for the House is a gap and the obvious screen cannot work.
   * A stone goes down *beside* the Scribe at the height of their own feet, so
   * it is worth exactly one tile across and one tile up. A plain running jump
   * crosses five. So a hole that Bet is needed for must be six — and the leap
   * off the stone is then five, which is the plain jump exactly, with no tile
   * in hand. There is no width at which the gap both needs a stone and gives
   * the stone anywhere to spare, and measuring found none: the design window is
   * one tile wide and lands on the limit.
   *
   * A **step** has the room the gap does not. Three tiles of wall is a row past
   * a plain jump and out of reach; from a stone set at its foot, a Scribe
   * starts a row higher and tops it with a tile to spare. Measured, six of six
   * holding only the House, and the graph still refuses it to anything less.
   */
  chunk("set-stone", { requires: ["block"], demand: 1 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E,
    ".......##.......",
    ".......##.......",
    ".......##.......",
    F,
    F,
  ]),

  // -------------------------------------------------------------------------
  // ground, one verb, demand 2 — the same letter asked twice
  // -------------------------------------------------------------------------

  // Three of the twelve verbs were asked for by exactly two screens each —
  // reveal, block and climb — against grapple's six and the Breath's seven, so
  // finding the Eye, the House or the Ladder changed the ground less than any
  // other letter in the game. The three below are the second ask for each.

  /**
   * The stepping stones of `veiled-span`, further apart and standing over a
   * basin that runs the width of the screen. The Eye is not a key here; it is
   * the difference between three tiles of ground and nothing at all.
   */
  chunk("veiled-steps", { requires: ["reveal"], demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E, E, E,
    "....*.....*.....",
    E,
    "...VV..VV..VV...",
    E,
    "##...........###",
    "##...........###",
  ]),

  /** The step of `set-stone`, twice, with four tiles of floor to set from between. */
  chunk("set-and-step", { requires: ["block"], demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E, E, E,
    "......*..*......",
    "...##......##...",
    "...##......##...",
    "...##......##...",
    F,
    F,
  ]),

  /**
   * A face too high to top, with the Ladder growing up it. Climb the vine and
   * step off it onto the head of the wall — which is why the stone beside it is
   * two tiles wide rather than one: a one-tile crown is a landing a body misses.
   */
  chunk("vine-face", { requires: ["climb"], demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E,
    "........*.*.....",
    ".......v##......",
    ".......v##......",
    ".......v##......",
    ".......v##......",
    ".......v##......",
    F,
    F,
  ]),

  /** Bramble twice, which is what `thorn-tangle` is to the Edge. */
  chunk("bramble-twice", { requires: ["flame"], demand: 2 }, [
    E, E, E, E, E, E,
    "....G.......G...",
    "....G.......G...",
    "....G.......G...",
    "....G.......G...",
    "....G...*...G...",
    "....G..===..G...",
    "....G.......G...",
    "....G.......G...",
    "....G.......G...",
    "....G.......G...",
    F,
    F,
  ]),

  /** Two thickets with a step between them, so the Edge is drawn more than once. */
  chunk("thorn-tangle", { requires: ["cut"], demand: 2 }, [
    E, E, E, E, E, E,
    "....^.......^...",
    "....^.......^...",
    "....^.......^...",
    "....^.......^...",
    "....^...*...^...",
    "....^..===..^...",
    "....^.......^...",
    "....^.......^...",
    "....^.......^...",
    "....^.......^...",
    F,
    F,
  ]),

  /** A door at the top of a two-tile step, and another beyond it. */
  chunk("double-seal", { requires: ["open"], demand: 2 }, [
    E, E, E, E, E, E,
    "....D.......D...",
    "....D.......D...",
    "....D.......D...",
    "....D.......D...",
    "....D...*...D...",
    "....D.......D...",
    "....D.......D...",
    "....D.......D...",
    "....D.......D...",
    "....D.......D...",
    F,
    F,
  ]),

  /** Anchors over a long span, taken one after another rather than singly. */
  chunk("anchor-chain", { requires: ["grapple"], demand: 2 }, [
    E, E, E, E, E, E, E, E,
    "...A...A...A....",
    E, E, E, E, E, E, E,
    "##............##",
    "##............##",
  ]),

  /**
   * A face twice as tall as the first, caught and caught again.
   *
   * It tops out at row **two**, and the one row of difference is the whole of
   * what a floor changed. This wall is crossed by going over it, which means
   * standing on top of it — and a body is thirty pixels in a twenty-four pixel
   * tile, so standing on a surface always occupies the two rows above it. Reach
   * row one and the second of those is off the top of the screen, which is open
   * sky on the topmost storey of a rung and the *floor of the storey above* on
   * every other one. Measured: on a two-row rung this screen was a wall with no
   * way past, and the whole lower storey behind it was unreachable.
   *
   * `chunks.test.ts` holds the general form of it — anything solid in row one
   * must be roofed, so that no screen is ever crossed by a route that only
   * exists under an open sky.
   */
  chunk("sheer-face", { requires: ["wall-cling"], demand: 2 }, [
    E,
    E,
    "......###.......",
    "......###.......",
    "......###.......",
    "......###.......",
    "......###.......",
    "......###.......",
    "......###.......",
    "......###.......",
    "......###.......",
    "......###.......",
    "......###.......",
    "......###.......",
    "......###.......",
    "......###.......",
    F,
    F,
  ]),

  /** A channel with a shelf in the middle of it — surface, cross, sink again. */
  chunk("deep-crossing", { requires: ["swim"], demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E, E,
    ".......*........",
    "......===.......",
    E,
    E,
    E,
    "##wwwwwwwwwww###",
    "##wwwwwwwwwww###",
  ]),

  // -------------------------------------------------------------------------
  // ground, two verbs — the teeth of the upper Tree
  // -------------------------------------------------------------------------

  /** The step of `set-and-step` with two tiles to stand and set from, not four. */
  chunk("set-and-set", { requires: ["block"], demand: 3 }, [
    E, E, E, E, E, E, E, E, E, E, E, E,
    ".....*..*..*....",
    "......##..##....",
    "......##..##....",
    "......##..##....",
    F,
    F,
  ]),

  /** The face of `vine-face`, twice, so the Ladder is drawn more than once. */
  chunk("vine-and-vine", { requires: ["climb"], demand: 3 }, [
    E, E, E, E, E, E, E, E, E, E,
    "....*.*....*.*..",
    "...v##.....v##..",
    "...v##.....v##..",
    "...v##.....v##..",
    "...v##.....v##..",
    "...v##.....v##..",
    F,
    F,
  ]),

  /**
   * Twelve tiles of nothing with a two-tile span in the middle of it that is
   * not there until it is looked at. Revealed, it is two five-tile jumps, and
   * five is a tile past a plain one — so the Eye makes the screen exist and the
   * Breath is what crosses it. Neither is any use alone.
   */
  chunk("veiled-vault", { requires: ["reveal", "double-jump"], demand: 3 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E,
    "......*..*......",
    ".......VV.......",
    E,
    "##............##",
    "##............##",
  ]),

  /** Nine tiles. Beyond the Bridge alone, and beyond the Breath alone. */
  chunk("chasm-vault", { requires: ["dash", "double-jump"], demand: 3 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E, E,
    "......*..*......",
    E,
    "###.........####",
    "###.........####",
  ]),

  /**
   * Swim the flooded floor, then climb out of it onto the high road. The two
   * letters do not merely both appear here — neither is any use without the
   * other, because the water has no bank and the vine has no footing.
   *
   * The vine is **two tiles wide and rooted in the water**, both deliberately.
   * Climbing while holding toward the exit drifts a body sideways — that is
   * what `climbTick` does — so a one-tile vine slid a Scribe off it into the
   * void, and a vine whose foot was dry meant a slip cost the whole region.
   * Now a slip costs a swim.
   */
  chunk("flooded-shaft", { requires: ["swim", "climb"], demand: 3, exit: "high" }, [
    E, E, E, E, E, E,
    "..........vv....",
    "..........vv....",
    "..........vv....",
    "..........vv....",
    "..........vv####",
    "..........vv####",
    "..........vv....",
    "..........vv....",
    "..wwwwwwwwww....",
    "..wwwwwwwwww....",
    "##wwwwwwwwww....",
    "##wwwwwwwwww....",
  ]),

  /**
   * Hook across the gap, and meet a wall on the far side that has to be caught
   * and caught again. The ring sits low enough to be in reach from the ground —
   * the Hook carries seven tiles, and from a standing body that is measured
   * diagonally.
   */
  chunk("hooked-face", { requires: ["grapple", "wall-cling"], demand: 3 }, [
    E, E, E, E, E, E, E, E, E, E, E,
    ".....A...A......",
    E,
    "............##..",
    "............##..",
    "............##..",
    "###..........###",
    "###..........###",
  ]),

  /** Thorn standing on ledges that must be climbed as they are cleared. */
  chunk("thicket-stair", { requires: ["cut", "double-jump"], demand: 3 }, [
    E, E, E, E, E,
    "..........^.....",
    "..........^.....",
    ".........===....",
    "......^.........",
    "......^.........",
    ".....===........",
    "...^............",
    "...^............",
    "..===...........",
    E,
    E,
    F,
    F,
  ]),

  /**
   * Overgrowth across the way and no floor beyond it. Burn through, and only
   * then is there anything to see — and only then anything to stand on.
   */
  chunk("dark-vault", { requires: ["flame", "reveal"], demand: 3 }, [
    E, E, E, E, E, E,
    "..GGGG..........",
    "..GGGG..........",
    "..GGGG..........",
    "..GGGG..........",
    "..GGGG..........",
    "..GGGG..........",
    "..GGGG..........",
    "..GGGG..........",
    "..GGGG..........",
    "..GGGG..........",
    "##VVVVVVVVVV####",
    "##..........####",
  ]),

  /** A door at the bottom of the water, which will not be walked around. */
  // The doors run floor to surface, so opening them does not make a way
  // through — it makes a two-tile *hole* in the water, with the bottom of the
  // world under it. The crossing is over the top of the shaft, out of the
  // water, which is a jump; and the Breath is what a jump out of water is.
  chunk("sealed-deep", { requires: ["open", "swim", "double-jump"], demand: 3 }, [
    E, E, E, E, E, E, E, E, E, E, E, E,
    E,
    "...wwwDDwwww....",
    "...wwwDDwwww....",
    "...wwwDDwwww....",
    "###wwwDDwwww####",
    "###wwwDDwwww####",
  ]),

  /**
   * Set a stone in the middle of nothing, cross to it, and set the next.
   *
   * Only one stone stands at a time, so "the next" takes back the one underfoot
   * — which is fine in the air and fatal on the ground. The crossing is a leap
   * from each bank onto its own stone and a leap between them, and ten tiles of
   * nothing does not yield to two stones and a dash without the Breath.
   *
   * Twelve, as first authored, did not yield to a body holding all three either
   * — measured, none of six. Ten is crossable holding exactly what it asks and
   * still refused by the graph to anything less, which is the whole of what a
   * gate has to be.
   */
  chunk("stone-chain", { requires: ["block", "dash", "double-jump"], demand: 3 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E, E,
    "......*..*......",
    E,
    "###..........###",
    "###..........###",
  ]),

  // -------------------------------------------------------------------------
  // recognition — screens that are a question rather than a label
  // -------------------------------------------------------------------------

  /**
   * Thorn, and then bramble — the Edge and the Flame, one after the other.
   *
   * An earlier version of this screen tried to be a genuine fork, a low road
   * under a thorn and a high road over overgrowth, either of which would do.
   * It did not survive contact: the high road put the Scribe on a ledge with
   * the growth at head height and no way to read which of six things the act
   * key was about to do. Two barriers in a row is the honest version of "this
   * screen wants more than one letter", and `decoy-door` and `two-answers`
   * still carry the fork.
   */
  chunk("hedge-and-bramble", { requires: ["cut", "flame"], demand: 2 }, [
    E, E, E, E, E, E,
    "....^......G....",
    "....^......G....",
    "....^......G....",
    "....^......G....",
    "....^..*...G....",
    "....^......G....",
    "....^......G....",
    "....^......G....",
    "....^......G....",
    "....^......G....",
    F,
    F,
  ]),

  /**
   * A sealed door standing in plain sight, and a low crawl beneath it that
   * answers the same passage for nothing. The Door is the obvious reading and
   * the wrong one — or the lazy one, and here they come to the same thing.
   */
  chunk("decoy-door", { requires: ["open"], demand: 2 }, [
    E, E, E, E, E, E, E, E,
    ".....DD.........",
    ".....DD.........",
    ".....DD.........",
    ".....DD...*.....",
    ".....DD.........",
    ".....DD.........",
    ".....DD.........",
    ".....cc.........",
    F,
    F,
  ]),

  /**
   * A ring above a gap the Bridge would also cross. The Hook is slower and
   * lands you on the mote; the Bridge is quicker and carries you past it.
   * Both are right, and they are right about different things.
   */
  chunk("two-answers", { requires: ["grapple", "dash"], demand: 2 }, [
    E, E, E, E, E, E, E, E, E, E,
    ".....A....A.....",
    E,
    E,
    ".......*........",
    E,
    E,
    "###..........###",
    "###..........###",
  ]),

  // -------------------------------------------------------------------------
  // height — where the Tree stops being a corridor
  //
  // All demand 3, which keeps them out of Malchut and Yesod by the band
  // rather than by a special case. A high stretch has nothing beneath it: fall
  // and you are veiled and wake at your mark, which is why `build.ts` never
  // lets one run more than two screens.
  // -------------------------------------------------------------------------

  /**
   * A vine hanging in open air over nothing, rising to the high road.
   *
   * This is what gating the Ascent actually takes. There is no stone beside
   * the vine to catch, and the ledge it leads to is six tiles above the last
   * floor — so a Scribe without Kuf jumps at it, touches nothing, and falls.
   */
  chunk("vine-ascent", { requires: ["climb"], demand: 3, exit: "high" }, [
    E, E, E, E, E, E,
    "......v.........",
    "......v.........",
    "......v.....*...",
    "......v.........",
    "......v.########",
    "......v.########",
    "......v.........",
    "......v.........",
    "......v.........",
    "......v.........",
    "#####...........",
    "#####...........",
  ]),

  // -------------------------------------------------------------------------
  // branches — where the road divides, and Resh becomes worth carrying
  //
  // A `both` screen carries two independent roads. The high one asks more and
  // pays more; the low one is always walkable. Take the high road and fail it
  // and you are veiled — and a Scribe carrying the Beginning wakes at the fork
  // rather than back at the mark, which is the whole of what Resh does and the
  // first job it has ever had.
  // -------------------------------------------------------------------------

  /** The road divides: keep to the floor, or climb to the upper way. */
  chunk("the-fork", { demand: 3, exit: "both" }, [
    E, E, E, E, E, E,
    E,
    E,
    "..........*.....",
    E,
    "..........######",
    "..........######",
    "........==......",
    E,
    "....==..........",
    "..Y.............",
    F,
    F,
  ]),

  /** Two roads across one screen. The upper one is where the light is. */
  chunk("two-ways", { demand: 3, entry: "both", exit: "both" }, [
    E, E, E, E, E, E,
    E,
    "...*........*...",
    E,
    E,
    "######....######",
    "######....######",
    E, E,
    ".......j........",
    "....k...........",
    "######...#######",
    "######...#######",
  ]),

  /** The upper way asks the Hook. The lower way asks nothing at all. */
  chunk("high-road", { requires: ["grapple"], demand: 3, entry: "both", exit: "both" }, [
    E, E, E,
    E,
    E,
    ".....A....A.....",
    E, E, E, E,
    "##............##",
    "##............##",
    E, E, E,
    "......*.........",
    F,
    F,
  ]),

  /** And back together: the high road comes down, the low road walks on. */
  chunk("the-merge", { demand: 3, entry: "both", exit: "ground" }, [
    E, E, E, E, E, E,
    E,
    "....*...........",
    E,
    E,
    "######..........",
    "######..........",
    E,
    ".........==.....",
    E,
    E,
    F,
    F,
  ]),

  /**
   * Up onto the high road, two tiles at a time — the letterless way up, and
   * the reason a Scribe can never be stranded below a high stretch.
   */
  chunk("rise-to-high", { demand: 3, exit: "high" }, [
    E, E, E, E, E, E,
    E,
    E,
    "..........*.....",
    E,
    "..........######",
    "..........######",
    "........==......",
    E,
    "....==..........",
    E,
    "####............",
    "####............",
  ]),

  /** The same climb, taken in two motions by a Scribe who carries the Breath. */
  /**
   * Up onto the high road on the Breath alone — and it was one ledge and a
   * four-row vault, which nothing could do.
   *
   * The Breath rises about four tiles from a standing start and the whole climb
   * here is six, so it was authored as two steps of three and a bit and
   * measured as none of six. Two ledges, three rows apart, is two steps the
   * Breath makes with a tile in hand — and three rows is still a row more than
   * a plain jump, so a Scribe without it is stopped at the first of them, which
   * the graph confirms.
   */
  chunk("vault-to-high", { requires: ["double-jump"], demand: 3, exit: "high" }, [
    E, E, E, E, E, E,
    E,
    E,
    ".......*........",
    E,
    "..........######",
    "..........######",
    "......===.......",
    "..===...........",
    E,
    E,
    "#####...........",
    "#####...........",
  ]),

  /** A gap in the high road, with a very long way down. */
  /**
   * A gap in the high road, and it was **four tiles** — which is exactly what a
   * body with no letters at all crosses, and this screen declares none. Exactly
   * the limit is not a gap a Scribe clears, it is a gap they clear on the seeds
   * where nothing else went wrong: none of six. Three tiles is still a jump and
   * it is a jump with a tile in hand.
   */
  chunk("high-span", { demand: 3, entry: "high", exit: "high" }, [
    E, E, E, E, E, E,
    E,
    "...*........*...",
    E,
    E,
    "######...#######",
    "######...#######",
    E, E, E, E, E, E,
  ]),

  /**
   * The high road, taken ring by ring with nothing at all underneath — and
   * spaced the way `anchor-gap` had to be, for the same measured reason: the
   * throw off a ring hangs a third of a second, and rings five tiles apart are
   * further than that carries. Three tiles, and three of them.
   */
  chunk("high-anchors", { requires: ["grapple"], demand: 3, entry: "high", exit: "high" }, [
    E, E, E, E, E, E, E,
    "...A..A..A......",
    E, E,
    "####........####",
    "####........####",
    E, E, E, E, E, E,
  ]),

  /** And down again — the way back that every high stretch is guaranteed. */
  chunk("fall-to-ground", { demand: 3, entry: "high", exit: "ground" }, [
    E, E, E, E, E, E,
    E,
    "....*...........",
    E,
    E,
    "######..........",
    "######..........",
    E, E, E, E,
    "......##########",
    "......##########",
  ]),

  /** A stepped descent, taken ledge by ledge as the ground comes back up. */
  chunk("step-to-ground", { demand: 3, entry: "high", exit: "ground" }, [
    E, E, E, E, E, E,
    E,
    "...*............",
    E,
    E,
    "####............",
    "####............",
    ".....===........",
    E,
    ".........===....",
    E,
    ".............###",
    ".............###",
  ]),
];

/**
 * Every screen `layout` can deal, by id — and therefore everything the contract
 * above is asked of, since `chunks.test.ts` sweeps exactly this.
 *
 * **`VESSEL_CHUNK` was missing from it**, which meant the vessel room was
 * outside the whole contract: its dimensions, its character vocabulary, its
 * edge profiles and — the one that matters — "screens that need more than they
 * declare, which is a soft lock on the Tree" simply did not apply to it. It is
 * a fixed screen in `layout`'s own list and is laid on any path that draws a
 * vessel, so its absence here was an omission rather than a decision. The
 * guardians' rooms are the genuine exception and have a sweep of their own; the
 * stair screens are structural and never dealt.
 */
export const chunksById: Record<string, Chunk> = Object.fromEntries(
  [
    ...CHUNKS,
    ...TEACH_CHUNKS,
    START_CHUNK,
    END_CHUNK,
    SHRINE_LOW,
    SHRINE_HIGH,
    LETTER_CHUNK,
    FRAGMENT_CHUNK,
    WORD_GATE_CHUNK,
    ABYSS_GATE_CHUNK,
    HOUSE_CHUNK,
    VESSEL_CHUNK,
  ].map((c) => [c.id, c]),
);

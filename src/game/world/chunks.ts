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

  chunk("anchor-gap", { requires: ["grapple"], demand: 1 }, [
    E, E, E, E, E, E, E, E, E, E,
    "....A....A......",
    E, E, E, E, E,
    "###..........###",
    "###..........###",
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

  chunk("set-stone", { requires: ["block"], demand: 1 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E,
    "#####.....######",
    "#####.....######",
  ]),

  // -------------------------------------------------------------------------
  // ground, one verb, demand 2 — the same letter asked twice
  // -------------------------------------------------------------------------

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
   * from each bank onto its own stone and a leap between them, and twelve tiles
   * of nothing does not yield to two stones and a dash without the Breath.
   */
  chunk("stone-chain", { requires: ["block", "dash", "double-jump"], demand: 3 }, [
    E, E, E, E, E, E, E, E, E, E, E, E, E, E,
    "......*..*......",
    E,
    "##............##",
    "##............##",
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
  chunk("vault-to-high", { requires: ["double-jump"], demand: 3, exit: "high" }, [
    E, E, E, E, E, E,
    E,
    E,
    ".......*........",
    E,
    "......##########",
    "......##########",
    E,
    E,
    "..==............",
    E,
    "#####...........",
    "#####...........",
  ]),

  /** A gap in the high road, with a very long way down. */
  chunk("high-span", { demand: 3, entry: "high", exit: "high" }, [
    E, E, E, E, E, E,
    E,
    "...*........*...",
    E,
    E,
    "######....######",
    "######....######",
    E, E, E, E, E, E,
  ]),

  /** The high road, taken ring by ring with nothing at all underneath. */
  chunk("high-anchors", { requires: ["grapple"], demand: 3, entry: "high", exit: "high" }, [
    E, E, E, E, E,
    ".....A....A.....",
    E, E, E, E,
    "##............##",
    "##............##",
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
    HOUSE_CHUNK,
  ].map((c) => [c.id, c]),
);

import type { Verb } from "../abilities";
import { CHUNK_H } from "./chunks";
import { tileAt } from "./build";
import { isSolid, Tile, TILE_SIZE } from "./tiles";
import type { World } from "./types";

/**
 * Where a body can stand, and what it can reach from there.
 *
 * The traversal probe used to steer by a rule that read the level's own
 * construction — "the way out is to the right", and later "head for the end of
 * the row, because that is where the stairwell is". Both were true and both
 * lost, because knowing which end of a rung to walk to says nothing about the
 * shelf you are standing on. Every pocket that ever defeated the probe was a
 * *local* problem, and patching them one at a time went the way that always
 * goes: each fix freed one rung by trapping another.
 *
 * A flood fill over the open space was the next attempt and it was worse, for
 * a reason worth writing down: **open space is not walkable space.** Gravity
 * is not in it. A field flooded through air happily routes a body upward
 * through a shaft it cannot climb, and the shortest way to the exit is usually
 * straight through a wall of nothing.
 *
 * So this is the honest version — a graph of the places a body can actually
 * *stand*, with an edge wherever it can actually *get* from one to another:
 * walk, step, leap, fall. The envelope comes from the letters held, so a Scribe
 * carrying the Breath is granted the seven tiles it is measured at and one who
 * is not carrying it is not.
 *
 * It is deliberately **conservative**: it grants only moves it is sure of.
 * Missing an edge costs a longer route; inventing one would send a body at a
 * wall. And when the way out turns out to be unreachable *in the graph* — which
 * is what a missing edge looks like — the caller falls back to its own rule
 * rather than freezing.
 *
 * That principle has now been wrong four times, in the same way each time, and
 * the pattern is worth stating because it will happen again: **a move left out
 * of the graph does not read as a longer route, it reads as a broken level.**
 * The vine went first — without it the lower storey of a two-row rung was a
 * dead end, and a third of the Tree came out unreachable. Then water, the Hook,
 * and the Eye's own revealed stone, all found together the moment the linear
 * order stopped hiding them: twenty-two paths hand the generator letter sets it
 * had never been given before, and every screen crossed by a verb this graph
 * did not model came back "impassable". Fourteen of them, and the first
 * diagnosis was that fourteen screens under-declared what they need. They do
 * not. The graph could not swim, could not cast, and could not stand on stone
 * the Eye had revealed.
 *
 * So: being conservative is only a virtue where it costs a detour. Where a verb
 * is the *only* answer a screen has, leaving it out is not caution — it is the
 * instrument reporting a fault in the thing it is measuring.
 */

/** A node is the tile a standing body's feet rest on top of. */
export type Node = number;

export interface Route {
  /**
   * Tiles left to the way out, or `Infinity` from a place that cannot reach it
   * — which is a caller's way of asking whether it is lost.
   */
  costAt(px: number, py: number, ph: number): number;
  /** -1, 0 or 1: which way the next step lies. */
  towards(px: number, py: number, ph: number): number;

  /** The row of the next place to stand, in tiles, or `undefined` from nowhere. */
  landingRow(px: number, py: number, ph: number): number | undefined;
  /** Whether the way out is reachable at all from where the Scribe began. */
  usable: boolean;
  /** Tiles from the Scribe's starting place, or nought if there is no way. */
  cost0: number;
}

/**
 * A deliberately small surface, arrived at by subtraction.
 *
 * This once also answered how far there was still to go as a continuous
 * potential, whether the next leg rose or dropped, and where the landing was —
 * everything a driver would seem to want. Each was wired into the traversal
 * probe and measured, and each made it *worse*, in some cases by a factor of
 * three. A graph is a good map and a poor pair of hands: it can say which way,
 * and the moment it starts saying how to move it is overriding a controller
 * that was already tuned against the simulation itself. What is left here is
 * what earned its place.
 */

/** How far a long fall carries sideways, and how far down one is worth tracing. */
const FALL_ACROSS = 6;
const FALL_DEPTH = 22;

/**
 * How far the Hook is cast, in tiles. `GRAPPLE_RANGE` in `step.ts` is seven
 * tiles measured centre to centre; six is taken here so that a ring at the very
 * edge of the throw, which the hands would reach only from exactly the right
 * pixel, is not a route the graph promises.
 */
const CAST = 6;

export function routeTo(world: World, verbs: readonly Verb[]): Route {
  const w = world.width;
  const h = world.height;

  const open = (x: number, y: number) => {
    if (x < 0 || x >= w || y >= h) return false;
    // Off the top of the grid is sky, exactly as `tileAt` reports it, and a
    // body standing on the roof of a pillar has its head up there. Reading it
    // as solid is what made the three-tile pillars of Hod uncrossable in the
    // graph: the one way over them is to stand on top.
    if (y < 0) return true;
    const t = tileAt(world, x, y);
    // Cleared with a letter rather than walked through, but open to a Scribe
    // who holds it — the same generosity the hands have.
    if (t === Tile.Growth) return verbs.includes("flame");
    if (t === Tile.Door) return verbs.includes("open");
    if (t === Tile.Ledge) return true;
    return !isSolid(t, { verbs, crawling: true, revealed: verbs.includes("reveal") });
  };
  /**
   * What would stop a falling body — **which depends on the letters held**, and
   * naming the three obviously-solid tiles instead was a quiet fault that
   * survived four rounds of tuning.
   *
   * A Scribe holding the Eye stands on revealed stone; that was the whole point
   * of revealing it. Listing Stone, Ledge and Placed by hand meant `veiled-span`
   * — three floating slabs over a gap, and nothing else — had no floor in the
   * graph at all, so the one screen built entirely around Ayin read as a
   * twelve-tile leap. Growth, a shut door and a Word-Gate are the same: solid
   * until the letter that removes them, and standable until then.
   *
   * `open` already knows every one of those answers, so the honest form of this
   * question is its negation. The Ledge is the single exception in the other
   * direction: open from below, solid from above, which is what a ledge *is*.
   */
  const solid = (x: number, y: number) => {
    if (y >= h) return false;
    if (tileAt(world, x, y) === Tile.Ledge) return true;
    return !open(x, y);
  };
  /** A body fits here, and there is something under it. */
  const stands = (x: number, y: number) => open(x, y) && open(x, y - 1) && solid(x, y + 1);
  /**
   * A hanging vine, to a Scribe holding Kuf.
   *
   * Left out of the first version of this graph on the grounds of being
   * conservative, which was the wrong call and a measurable one: the lower
   * storey of a two-row rung is joined to the high road by a vine as often as
   * by a wall, and without it the whole storey came out a dead end. A vine is
   * simply somewhere a body can *be* without a floor — so it is a node like any
   * other, with a rung above and below it.
   */
  const vines = verbs.includes("climb");
  const inGrid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  const hangs = (x: number, y: number) =>
    vines && inGrid(x, y) && tileAt(world, x, y) === Tile.Vine;

  /**
   * Water, to a Scribe holding Mem — and the same argument as the vine, learned
   * the same way.
   *
   * A body in water is a body without a floor, so nothing here could ever stand
   * in it and the graph had no nodes below a waterline at all. `deep-channel`
   * is ten tiles of water between two banks and declares Mem, which is exactly
   * true; the graph read it as ten tiles of *gap* and answered that it needs
   * the Breath and the Bridge, which is a fourteen-tile leap over a channel a
   * Scribe is meant to swim.
   *
   * `swimTick` moves a body through water in any direction it likes, so the
   * edges are simple neighbourly ones rather than an envelope: no leap is
   * granted from mid-water, because there is nothing to push off. Getting out
   * is the diagonal onto the bank, which is what climbing out of water is.
   */
  const swims = verbs.includes("swim");
  const wet = (x: number, y: number) =>
    swims && inGrid(x, y) && tileAt(world, x, y) === Tile.Water;

  /**
   * And the rings, to a Scribe holding Vav — which this graph left out on
   * purpose and called caution.
   *
   * It is not caution when it is a screen's only answer. Five screens in the
   * library are built as a run of anchors over nothing: leaving the Hook out
   * did not make them expensive, it made them impassable, and the audit dutifully
   * reported that `anchor-gap` — whose whole content is two rings — requires the
   * Bridge and the Breath.
   *
   * A ring is somewhere a body arrives at rather than rests on, so it is a node
   * with a cast in and a throw out: reachable from anywhere within `CAST` with
   * a clear line to it, and left by the ordinary envelope, because `grappleTick`
   * throws the Scribe up and forward off the ring rather than leaving them
   * hanging — which is the move the chained-anchor screens are built from.
   */
  const hooks = verbs.includes("grapple");
  const ring = (x: number, y: number) =>
    hooks && inGrid(x, y) && tileAt(world, x, y) === Tile.Anchor;

  const blocks = verbs.includes("block");

  // The reach of a leap, measured rather than guessed: `chunks.ts` records a
  // plain jump crossing four tiles of gap and two of rise, the Breath seven,
  // and the Breath with the Bridge fourteen.
  //
  // **A gap of four is a displacement of five**, because those numbers count
  // the empty tiles between two floors and this counts stand tile to stand
  // tile. Being out by one there is not a rounding error — it makes the
  // authored four-tile pit uncrossable in the graph, and since most of Malchut
  // is built from those, the graph declared the teaching rung unreachable.
  const breath = verbs.includes("double-jump");
  const bridge = verbs.includes("dash");
  const fence = verbs.includes("wall-cling");
  const across = bridge && breath ? 14 : breath ? 6 : 5;
  const rise = breath ? 4 : 2;

  // And the throw off a ring, by the same arithmetic against `step.ts`: three
  // hundred up under a gravity of seventeen-fifty is twenty-six pixels, barely
  // a tile, where a jump's four-seventy is sixty-three. The carry across is the
  // throw's own two-fifty for the third of a second it hangs. What the Breath
  // and the Bridge add on top is added the same way they are anywhere else.
  const THROW_ACROSS = bridge && breath ? 10 : breath ? 5 : 3;
  const THROW_RISE = breath ? 3 : 1;

  const nodes: Node[] = [];
  const index = new Int32Array(w * h).fill(-1);
  /** Nodes by column, so an edge search looks at places to stand and not at air. */
  const byColumn: number[][] = Array.from({ length: w }, () => []);
  /** The rings, kept apart: a cast searches them, not the whole graph. */
  const rings: number[] = [];
  for (let y = 0; y < h - 1; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!stands(x, y) && !hangs(x, y) && !wet(x, y) && !ring(x, y)) continue;
      index[y * w + x] = nodes.length;
      byColumn[x].push(nodes.length);
      if (ring(x, y)) rings.push(nodes.length);
      nodes.push(y * w + x);
    }
  }

  /** Nothing solid between two stand tiles, along the straight line. */
  const clear = (x0: number, y0: number, x1: number, y1: number) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 1; i < steps; i += 1) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      if (!open(x, y)) return false;
    }
    return true;
  };
  const rowOpen = (y: number, xa: number, xb: number) => {
    for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x += 1) if (!open(x, y)) return false;
    return true;
  };
  const columnOpen = (x: number, ya: number, yb: number) => {
    for (let y = Math.min(ya, yb); y <= Math.max(ya, yb); y += 1) if (!open(x, y)) return false;
    return true;
  };

  /**
   * Whether a body can actually travel between two stand tiles.
   *
   * A straight line is the cheap test and it is wrong at exactly the moment it
   * matters: **a body does not move in straight lines.** Walking off the top of
   * a pillar and falling to the ground beside it is a line that shaves the
   * pillar's own corner, so the whole descent read as blocked. A jump onto a
   * high shelf is the mirror of it. So the elbows are allowed too — out and
   * then down for a fall, up and then over for a leap — which is the shape the
   * motion actually has.
   */
  const reaches = (x0: number, y0: number, x1: number, y1: number) => {
    if (clear(x0, y0, x1, y1)) return true;
    if (y1 < y0) return columnOpen(x0, y0, y1) && rowOpen(y1, x0, x1);
    if (y1 > y0) return rowOpen(y0, x0, x1) && columnOpen(x1, y0, y1);
    return false;
  };

  // Built forward — where can I get from here — and then walked backwards from
  // the way out, because "how far is it still" is a question about arriving.
  //
  // **Every edge carries a length, in tiles.** Counting hops instead was a
  // quiet disaster: a single leap edge spans the whole of a flat run, so every
  // tile along it has the same cost, and a probe asking "am I getting anywhere?"
  // reads six tiles of honest walking as six ticks of being stuck. Measured, it
  // hopped the entire length of Malchut on the unsticking rhythm, was almost
  // never grounded, never saw the pit it was walking into, and fell in. Lengths
  // make the field decrease about once per tile crossed, which is what a
  // progress measure has to do.
  const forward: number[][] = nodes.map(() => []);
  const lengths: number[][] = nodes.map(() => []);

  /**
   * Everywhere a body leaving `(x, y)` can come down.
   *
   * **A leap and a fall are one motion, not two.** Modelling them separately
   * was the second thing that made this graph lie: a jump that crossed a pit
   * and landed a tile *lower* than it took off from was read as a pure fall,
   * whose sideways carry is small — so the lipped four-tile pit, which is
   * authored with a raised take-off precisely because the extra height buys
   * carry, came out impassable. One motion: up to `rise` above, or down as far
   * as gravity takes it, and the further it falls the further it carries.
   */
  const spread = Math.max(across, FALL_ACROSS);
  const envelope = (n: number, x: number, y: number, base = 0, reach = across, lift = rise) => {
    for (let dx = -spread; dx <= spread; dx += 1) {
      const nx = x + dx;
      if (nx < 0 || nx >= w) continue;
      for (const m of byColumn[nx]) {
        if (m === n) continue;
        const ny = Math.floor(nodes[m] / w);
        const dy = ny - y;
        if (dy < -lift || dy > FALL_DEPTH) continue;
        // Up or level asks for the jump's reach; downward gets whichever is
        // further, the jump or the carry of the fall itself.
        const limit = dy <= 0 ? reach : Math.max(reach, Math.min(dy + 2, FALL_ACROSS));
        if (Math.abs(dx) > limit) continue;
        if (!reaches(x, y, nx, ny)) continue;
        forward[n].push(m);
        lengths[n].push(base + Math.max(Math.abs(dx), Math.abs(dy)));
      }
    }
  };

  for (let n = 0; n < nodes.length; n += 1) {
    const at = nodes[n];
    const x = at % w;
    const y = (at - x) / w;
    // Everywhere except mid-water, where there is nothing to push off. A body
    // in water that also has ground under it is both, and keeps its leap.
    //
    // **A ring is left on a throw, and a throw is not a jump.** `grappleTick`
    // lets go at three hundred upward against the jump's four hundred and
    // seventy, which is a rise of about one tile rather than two and a half,
    // and the arc is correspondingly shorter across. Granting the ordinary
    // envelope here would have invented the most seductive kind of false edge —
    // one that looks like the move the screen is built around.
    if (ring(x, y)) envelope(n, x, y, 0, THROW_ACROSS, THROW_RISE);
    else if (!wet(x, y) || stands(x, y)) envelope(n, x, y);

    // Through water, a tile at a time and in any direction — including the
    // diagonal, which is both the step off the bank and the climb back out.
    // Written from either side, so a bank tile beside a channel is joined to it
    // whichever of the two the loop reaches first.
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if ((dx === 0 && dy === 0) || (!wet(x, y) && !wet(x + dx, y + dy))) continue;
        const m = inGrid(x + dx, y + dy) ? index[(y + dy) * w + x + dx] : -1;
        if (m < 0) continue;
        forward[n].push(m);
        lengths[n].push(1);
      }
    }

    /**
     * The cast: any ring within the throw, with nothing in the way of the line.
     *
     * **Cast from the top of the jump, not from the feet.** `anchor-chain` is
     * three rings eight rows above the floor, and from a stand tile the first of
     * them is seven and a third tiles away — outside the throw. A Scribe does
     * not cast from the ground; they jump and cast at the apex, which is two
     * tiles nearer and turns the same ring into an easy five. So the line is
     * tried from each height the body can rise to, and stops at the first thing
     * over its head.
     *
     * A ring casts at a ring, too, for the reason `grappleTick` gives when it
     * throws rather than leaves you hanging: the throw hangs a third of a second
     * and the Hook is ready again after a quarter, so the second ring is caught
     * in the air off the first. That is the whole content of the chained screens
     * and there is no other way to read them.
     */
    if (hooks) {
      const highest = ring(x, y) ? 0 : rise;
      for (let lift = 0; lift <= highest; lift += 1) {
        if (lift > 0 && !open(x, y - lift - 1)) break;
        for (const m of rings) {
          if (m === n) continue;
          const rx = nodes[m] % w;
          const ry = Math.floor(nodes[m] / w);
          if (Math.hypot(rx - x, ry - (y - lift)) > CAST) continue;
          if (!clear(x, y - lift, rx, ry)) continue;
          forward[n].push(m);
          lengths[n].push(Math.max(1, Math.round(Math.hypot(rx - x, ry - y))));
        }
      }
    }

    // Up and down a vine, a rung at a time.
    if (hangs(x, y)) {
      for (const ny of [y - 1, y + 1]) {
        const m = ny >= 0 && ny < h ? index[ny * w + x] : -1;
        if (m < 0) continue;
        forward[n].push(m);
        lengths[n].push(1);
      }
    }

    // **The Fence is caught in the air, not stepped onto.**
    //
    // Requiring a wall to be *adjacent* to somewhere you can stand missed the
    // move the game is actually built around: a rise-to-high leaves a tile of
    // nothing between the last of the floor and the face you climb, so the
    // Scribe jumps at the wall, catches it, and goes up. With the adjacency
    // rule the entire lower storey of a two-row rung was a dead end.
    //
    // So: the nearest face within a leap in either direction is catchable, the
    // climb runs as far as the face does, and from the topmost hold the same
    // envelope applies again — because the point of climbing a wall is almost
    // always to get over it.
    if (fence) {
      for (const dir of [-1, 1] as const) {
        // **Within a stride, not within a leap.** Searching the whole jump
        // envelope for a face to catch granted a fourteen-tile dash across open
        // air that arrived at the same height it left — which is not a jump,
        // because a jump falls. Measured, the graph used exactly that to route
        // Chesed up the outside of a wall the Scribe could never have reached,
        // and the probe spent its whole budget under it. A face you can catch
        // is one you are practically beside; anything further is a leap to
        // somewhere you can stand, and the envelope above already knows about
        // those.
        for (let d = 1; d <= 3; d += 1) {
          const face = x + dir * d;
          if (face < 0 || face >= w) break;
          if (!solid(face, y)) continue;
          const hold = face - dir;
          if (!rowOpen(y, x, hold)) break;
          let top = y;
          while (top > 0 && open(hold, top - 1) && solid(face, top - 1)) top -= 1;
          // Reaching the top hold cost a leap across and a climb up it.
          if (top < y) envelope(n, hold, top, d + (y - top));
          // Only the first face met: everything past it is behind a wall.
          break;
        }
      }
    }

    /**
     * **The House sets a step where there was none** — the last verb this graph
     * could not see, and the one whose absence was hardest to read, because a
     * screen made entirely of a five-tile gap looks like a screen about jumping.
     * `set-stone` is a five-tile gap and declares Bet alone, and the graph
     * answered that it needs the Breath.
     *
     * `toggleStone` sets a stone *beside* the Scribe at the height of their own
     * feet, so a stone is worth one tile across and one tile up: step to the
     * lip, set, climb on. It is written here as a move out of a stand tile
     * rather than as a place in its own right, which is the same shape as the
     * wall catch above and has the same happy consequence — **stones cannot
     * chain**, and neither can they in the hands, because only one stands at a
     * time and setting the next takes back the one under your feet.
     */
    if (blocks) {
      for (const dir of [-1, 1] as const) {
        const sx = x + dir;
        // Bet refuses anything that is not plain air, and a body needs room to
        // stand on what it sets.
        if (!inGrid(sx, y) || tileAt(world, sx, y) !== Tile.Empty) continue;
        if (!open(sx, y - 1) || !open(sx, y - 2)) continue;
        envelope(n, sx, y - 1, 2);
      }
    }
  }

  const back: number[][] = nodes.map(() => []);
  const backLength: number[][] = nodes.map(() => []);
  for (let n = 0; n < forward.length; n += 1) {
    for (let e = 0; e < forward[n].length; e += 1) {
      back[forward[n][e]].push(n);
      backLength[forward[n][e]].push(lengths[n][e]);
    }
  }

  const exit = world.entities.find((e) => e.kind === "exit");
  const cost = new Float64Array(nodes.length).fill(Infinity);
  const queue: number[] = [];
  if (exit) {
    const ex = Math.floor(exit.x / TILE_SIZE);
    const ey = Math.floor(exit.y / TILE_SIZE);
    // The way out is a doorway a body walks into, so any stand tile in or
    // beside its column will do as the goal.
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -2; dy <= 3; dy += 1) {
        const gx = ex + dx;
        const gy = ey + dy;
        if (gx < 0 || gx >= w || gy < 0 || gy >= h) continue;
        const n = index[gy * w + gx];
        if (n >= 0 && cost[n] === Infinity) {
          cost[n] = 0;
          queue.push(n);
        }
      }
    }
  }
  // Dijkstra, with a small binary heap. Weighted edges rule out a plain
  // breadth-first sweep; the graph is a few thousand nodes, so nothing cleverer
  // is called for.
  const heap: number[] = queue.slice();
  const up = (i: number) => {
    let at = i;
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (cost[heap[parent]] <= cost[heap[at]]) break;
      [heap[parent], heap[at]] = [heap[at], heap[parent]];
      at = parent;
    }
  };
  const down = (i: number) => {
    let at = i;
    for (;;) {
      const l = at * 2 + 1;
      const r = l + 1;
      let least = at;
      if (l < heap.length && cost[heap[l]] < cost[heap[least]]) least = l;
      if (r < heap.length && cost[heap[r]] < cost[heap[least]]) least = r;
      if (least === at) break;
      [heap[least], heap[at]] = [heap[at], heap[least]];
      at = least;
    }
  };
  for (let i = (heap.length >> 1) - 1; i >= 0; i -= 1) down(i);
  const settled = new Uint8Array(nodes.length);
  while (heap.length > 0) {
    const n = heap[0];
    heap[0] = heap[heap.length - 1];
    heap.pop();
    if (heap.length > 0) down(0);
    if (settled[n]) continue;
    settled[n] = 1;
    for (let e = 0; e < back[n].length; e += 1) {
      const m = back[n][e];
      const through = cost[n] + backLength[n][e];
      if (through >= cost[m]) continue;
      cost[m] = through;
      heap.push(m);
      up(heap.length - 1);
    }
  }

  /** The node a body at these pixels is standing on, or the nearest below. */
  const nodeAt = (px: number, py: number, ph: number): number => {
    const tx = Math.floor((px + 8) / TILE_SIZE);
    const feet = Math.floor((py + ph - 1) / TILE_SIZE);
    // The **cheapest** node underfoot, not merely the nearest. A body straddles
    // tiles and a ledge is a tile thick, so "which one am I on" has no single
    // answer within a tile or two — and taking the nearest snaps the reading to
    // whichever tile the rounding fell on, which flips the way on back and
    // forth between neighbours. Taking the cheapest is stable, and it is the
    // right kind of wrong: it reads the body as being slightly further along
    // than it is.
    let best = -1;
    let bestCost = Infinity;
    let any = -1;
    for (let dy = -1; dy <= 4; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const ny = feet + dy;
        const nx = tx + dx;
        if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
        const n = index[ny * w + nx];
        if (n < 0) continue;
        if (any < 0) any = n;
        if (cost[n] < bestCost) {
          bestCost = cost[n];
          best = n;
        }
      }
    }
    // `Infinity < Infinity` is false, so a body standing somewhere the way out
    // cannot be reached from would otherwise find *no* node at all, and the
    // caller could not tell "off the graph" from "on it and stranded". Falling
    // back to any node underfoot reports the cost honestly as Infinity either
    // way, and keeps `towards` answering.
    return best >= 0 ? best : any;
  };

  /**
   * The neighbour that actually lies on a shortest way out.
   *
   * Note the `<=` against the node's own cost, which is not pedantry. On a
   * shortest path `cost[n] === cost[m] + length`, exactly — so a test for a
   * neighbour *strictly* cheaper than where you stand finds nothing at all, and
   * every question the caller asks of the route ("which way", "does it rise",
   * "what am I aiming at") comes back blank. It read as a probe with no map.
   */
  const next = (n: number): number => {
    let best = -1;
    let bestCost = Infinity;
    for (let e = 0; e < forward[n].length; e += 1) {
      const m = forward[n][e];
      const through = cost[m] + lengths[n][e];
      if (through < bestCost) {
        bestCost = through;
        best = m;
      }
    }
    return Number.isFinite(bestCost) && bestCost <= cost[n] ? best : -1;
  };

  const start = nodeAt(world.player.x, world.player.y, world.player.h);
  const cost0 = start >= 0 ? cost[start] : Infinity;

  /** The node to head for, and the one being left, as tile coordinates. */
  const legFrom = (px: number, py: number, ph: number) => {
    const n = nodeAt(px, py, ph);
    if (n < 0) return undefined;
    const m = next(n);
    if (m < 0) return undefined;
    return {
      fromX: nodes[n] % w,
      fromY: Math.floor(nodes[n] / w),
      toX: nodes[m] % w,
      toY: Math.floor(nodes[m] / w),
    };
  };

  return {
    usable: Number.isFinite(cost0),
    cost0: Number.isFinite(cost0) ? cost0 : 0,
    costAt(px, py, ph) {
      const n = nodeAt(px, py, ph);
      return n >= 0 ? cost[n] : Infinity;
    },
    landingRow(px, py, ph) {
      return legFrom(px, py, ph)?.toY;
    },
    towards(px, py, ph) {
      const leg = legFrom(px, py, ph);
      if (!leg || leg.toX === leg.fromX) return 0;
      return leg.toX > leg.fromX ? 1 : -1;
    },
  };
}

/** Storeys in a rung, for the fallback rule when the graph cannot see a way. */
export function storeysOf(world: World): number {
  return Math.max(1, Math.round(world.height / CHUNK_H));
}

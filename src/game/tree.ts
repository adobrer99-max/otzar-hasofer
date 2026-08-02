import { letters } from "../data/letters";
import type { SefirahId } from "../types/letter";
import { regions } from "./regions";

/**
 * The Tree itself: ten Sefirot, and the twenty-two paths between them.
 *
 * The climb used to be a line — region one, then two, then ten — and the only
 * decision it ever offered was whether to kindle. This is the map it becomes:
 * you stand on a Sefirah, and the ways out of it are paths, and **walking a
 * path is a rung**. The letter is on the path, so the order you take the
 * alphabet in is the route you chose.
 *
 * ## What is traditional here, and what is ours
 *
 * The **geometry is traditional and is not ours to move**: ten Sefirot in the
 * three pillars, joined by twenty-two paths — three horizontal, seven
 * vertical, twelve diagonal. That 3/7/12 is the Sefer Yetzirah's own division
 * of the letters into Mothers, Doubles and Simples, which `letters.ts` already
 * stores as canonical and not open to authorial discretion.
 *
 * **Which letter lies on which path is ours**, and it is worth being plain
 * about why, because the obvious move was to take the Gra arrangement whole
 * and it would have broken the game. `chunks.ts` says it outright: *"The
 * Breath is found in Malchut, so from the second region on, every Scribe has
 * it. A plain gap can therefore never gate anything narrower than eight
 * tiles."* Every measured reach in the level library depends on which letters
 * arrive early. The traditional arrangement puts Aleph on Chochmah–Binah, at
 * the crown, and with it there the first screen of the game is uncrossable.
 *
 * So the arrangement below is a **rule**, not a table of preferences: order
 * the paths by their lowest end, Malchut-ward first, and lay the letters along
 * that order in the sequence the game already gave them. The ability curve
 * that was measured over four rounds of tuning survives by construction, and
 * the one thing that absolutely must hold — that the very first path a Scribe
 * can walk asks for nothing they do not have — is asserted in `tree.test.ts`
 * rather than hoped for.
 *
 * Claiming the tradition and then bending it would have been worse than not
 * claiming it. This is the same posture `letters.ts` takes about manuscript
 * variation: say which part is received, say which part is ours, and let the
 * reader check.
 *
 * **The most visible consequence, stated so it is not discovered:** the three
 * Mother letters do *not* fall on the three horizontals here. Aleph runs down
 * from Malchut, Mem lies on a diagonal, Shin on a pillar; the horizontals take
 * Heh, Bet and Dalet. Anyone who knows the Tree will see that at once, and it
 * is the price of keeping the Breath one step from the kingdom. The 3/7/12
 * division still governs the *geometry* — three horizontals, seven verticals,
 * twelve diagonals, and `tree.test.ts` holds the counts against the letters'
 * own classification — but the letters are laid along the climb, not along
 * their class.
 *
 * A few of the results are better than the rule deserves and are worth
 * noticing rather than claiming: the Flame ends up on the pillar of severity,
 * the Eye opens the last vertical into the crown, and the Stone that Bet sets
 * lies on the horizontal that holds mercy and severity apart.
 *
 * This module is **pure**. It knows the shape of the Tree and nothing about
 * tiles, worlds or rendering.
 */

/**
 * Which pillar a Sefirah stands in: **1** the pillar of mercy, **-1** the
 * pillar of severity, **0** the middle pillar that reconciles them.
 */
export type Pillar = 1 | 0 | -1;

export interface TreeNode {
  sefirah: SefirahId;
  /** Height on the Tree — Malchut at nought, Keter at six. */
  row: number;
  pillar: Pillar;
}

/**
 * The ten, placed. This is the diagram every printed Tree uses, and the
 * overworld draws straight off it rather than inventing a layout.
 */
export const TREE_NODES: readonly TreeNode[] = [
  { sefirah: "keter", row: 6, pillar: 0 },
  { sefirah: "chochmah", row: 5, pillar: 1 },
  { sefirah: "binah", row: 5, pillar: -1 },
  { sefirah: "chesed", row: 4, pillar: 1 },
  { sefirah: "gevurah", row: 4, pillar: -1 },
  { sefirah: "tiferet", row: 3, pillar: 0 },
  { sefirah: "netzach", row: 2, pillar: 1 },
  { sefirah: "hod", row: 2, pillar: -1 },
  { sefirah: "yesod", row: 1, pillar: 0 },
  { sefirah: "malchut", row: 0, pillar: 0 },
];

export const nodeOf: Record<SefirahId, TreeNode> = Object.fromEntries(
  TREE_NODES.map((n) => [n.sefirah, n]),
) as Record<SefirahId, TreeNode>;

/** The Sefer Yetzirah division, which is also the path's direction on the diagram. */
export type PathKind = "vertical" | "horizontal" | "diagonal";

export interface TreePath {
  /** The two ends, joined by a dash, lower end first — `"malchut-yesod"`. */
  id: string;
  ends: readonly [SefirahId, SefirahId];
  /** The letter walking it gives. */
  letter: string;
  kind: PathKind;
}

/**
 * The twenty-two, as edges — the received geometry, before any letter is laid
 * on them. Three horizontals across the pillars, seven verticals down them,
 * twelve diagonals between.
 */
const EDGES: readonly (readonly [SefirahId, SefirahId])[] = [
  // The seven verticals — down a pillar.
  ["keter", "tiferet"],
  ["tiferet", "yesod"],
  ["yesod", "malchut"],
  ["chochmah", "chesed"],
  ["chesed", "netzach"],
  ["binah", "gevurah"],
  ["gevurah", "hod"],
  // The three horizontals — across, mercy to severity.
  ["chochmah", "binah"],
  ["chesed", "gevurah"],
  ["netzach", "hod"],
  // The twelve diagonals.
  ["keter", "chochmah"],
  ["keter", "binah"],
  ["chochmah", "tiferet"],
  ["binah", "tiferet"],
  ["chesed", "tiferet"],
  ["gevurah", "tiferet"],
  ["tiferet", "netzach"],
  ["tiferet", "hod"],
  ["netzach", "yesod"],
  ["hod", "yesod"],
  ["netzach", "malchut"],
  ["hod", "malchut"],
];

function kindOf([a, b]: readonly [SefirahId, SefirahId]): PathKind {
  const from = nodeOf[a];
  const to = nodeOf[b];
  if (from.row === to.row) return "horizontal";
  return from.pillar === to.pillar ? "vertical" : "diagonal";
}

/**
 * The order the paths are met in, which is the whole of the arrangement.
 *
 * By the lower end first, then the upper — so the three paths that touch
 * Malchut come first and the three that touch Keter come last. A Scribe
 * climbing sensibly meets them roughly in this order, which is why laying the
 * letters along it preserves the curve; a Scribe who bolts for the crown meets
 * them out of order, which is the entire point of the map and is what
 * `route.test.ts` has to answer for.
 */
function height(path: readonly [SefirahId, SefirahId]): [number, number] {
  const rows = [nodeOf[path[0]].row, nodeOf[path[1]].row].sort((l, r) => l - r);
  return [rows[0], rows[1]];
}

const BY_HEIGHT = [...EDGES].sort((l, r) => {
  const [ll, lh] = height(l);
  const [rl, rh] = height(r);
  return ll - rl || lh - rh;
});

/**
 * The letters, in the order the game gives them — the twenty-one that lie in
 * alcoves, read off the regions so this cannot drift from them, and then Peh.
 *
 * **Peh is last on purpose.** It is not found; it is assembled from the three
 * fragments of the torn scroll (see `scroll.ts`), so the path that carries it
 * gives it only to a Scribe who has gathered all three. Putting it anywhere
 * but the far end of the Tree would mean a path that silently gives nothing.
 */
export const LETTER_ORDER: readonly string[] = [
  ...regions.flatMap((r) => r.letters),
  "peh",
];

export const TREE_PATHS: readonly TreePath[] = BY_HEIGHT.map((ends, i) => {
  const lower = nodeOf[ends[0]].row <= nodeOf[ends[1]].row ? ends[0] : ends[1];
  const upper = lower === ends[0] ? ends[1] : ends[0];
  return {
    id: `${lower}-${upper}`,
    ends: [lower, upper] as const,
    letter: LETTER_ORDER[i],
    kind: kindOf(ends),
  };
});

export const pathById: Record<string, TreePath> = Object.fromEntries(
  TREE_PATHS.map((p) => [p.id, p]),
);

/** Every path leading out of a Sefirah. */
export function pathsFrom(sefirah: SefirahId): TreePath[] {
  return TREE_PATHS.filter((p) => p.ends.includes(sefirah));
}

/** The path joining two Sefirot, if they are joined at all. */
export function pathBetween(a: SefirahId, b: SefirahId): TreePath | undefined {
  return TREE_PATHS.find((p) => p.ends.includes(a) && p.ends.includes(b));
}

/** Where a path sets you down, given where you stepped onto it. */
export function otherEnd(path: TreePath, from: SefirahId): SefirahId {
  return path.ends[0] === from ? path.ends[1] : path.ends[0];
}

/** The letter a path gives, by its id — for the record and the plate. */
export function letterOfPath(pathId: string): string | undefined {
  return pathById[pathId]?.letter;
}

/**
 * Which Sefirot a Scribe can be standing on, having walked these paths.
 *
 * Malchut is where an angel cast down wakes, so it is where every climb
 * starts and the only node that needs no path walked to reach it.
 */
export function reachedBy(pathsWalked: readonly string[]): Set<SefirahId> {
  const at = new Set<SefirahId>(["malchut"]);
  // A walked path only carries you if you had already reached one of its ends,
  // so this is run to a fixed point rather than in one pass.
  for (let again = true; again; ) {
    again = false;
    for (const id of pathsWalked) {
      const path = pathById[id];
      if (!path) continue;
      for (const [from, to] of [path.ends, [...path.ends].reverse() as SefirahId[]]) {
        if (at.has(from) && !at.has(to)) {
          at.add(to);
          again = true;
        }
      }
    }
  }
  return at;
}

/** The letters gathered by walking these paths, in the order they were walked. */
export function lettersFrom(pathsWalked: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of pathsWalked) {
    const letter = pathById[id]?.letter;
    // A path may be walked again to cross back; it gives its letter once.
    if (letter && !seen.has(letter)) {
      seen.add(letter);
      out.push(letter);
    }
  }
  return out;
}

/** Every letter that lies on the Tree — the twenty-two, for the tests. */
export const letterIds: readonly string[] = letters.map((l) => l.id);

// ---------------------------------------------------------------------------
// the Tree, drawn
// ---------------------------------------------------------------------------

/**
 * Where each Sefirah and each path falls on a drawing of the Tree.
 *
 * Kept here rather than in the component, and in abstract units rather than
 * pixels, for the reason the rest of this module is pure: the diagram is the
 * one part of the Tree that everybody already knows by sight, and getting it
 * wrong is the kind of mistake a reader spots instantly and a test never will
 * unless the numbers are somewhere it can reach them.
 *
 * The frame is the printed one. Keter at the top, Malchut at the foot, the
 * pillar of mercy on the **left** as the diagram is drawn — which is the right
 * hand of a figure facing you, and is why it is the pillar of mercy in the
 * first place. `y` grows downward, as it does in every drawing surface there
 * is, so the arithmetic is `top - row` rather than `row`.
 */
export interface TreePoint {
  sefirah: SefirahId;
  x: number;
  y: number;
}

/** The drawing's own units: six rows tall, two columns either side of centre. */
export const TREE_VIEW = { width: 4, height: 6 } as const;

export const TREE_POINTS: readonly TreePoint[] = TREE_NODES.map((n) => ({
  sefirah: n.sefirah,
  // Mercy to the left of centre, severity to the right. A `pillar` of 1 is
  // mercy, so the sign flips.
  x: TREE_VIEW.width / 2 - n.pillar,
  y: nodeOf.keter.row - n.row,
}));

export const pointOf: Record<SefirahId, TreePoint> = Object.fromEntries(
  TREE_POINTS.map((p) => [p.sefirah, p]),
) as Record<SefirahId, TreePoint>;

/** A path as a line to draw, with the place its letter is written. */
export interface TreeLine {
  path: TreePath;
  from: TreePoint;
  to: TreePoint;
  /** Beside the middle of the line, not on it — see `LABEL_OFFSET`. */
  labelX: number;
  labelY: number;
}

/**
 * How far off its own line a letter is written, in the drawing's units.
 *
 * Writing it *on* the midpoint is the obvious thing and it is wrong twice over.
 * The small reason is that a glyph sitting on a line hides the line. The real
 * one is that **two paths on this diagram share a midpoint**: Netzach–Hod runs
 * across the middle pillar and crosses it at precisely the point halfway
 * between Tiferet and Yesod, so Bet and Vav would be written one on top of the
 * other, at the busiest junction of the Tree. A test caught it; by eye it would
 * have read as a rendering glitch for as long as anyone could stand it.
 *
 * Offsetting square to each line settles both at once, and settles them
 * *differently* — the horizontal's letter drops below the crossing, the
 * vertical's steps to the side of it — because a perpendicular is by definition
 * not shared by two lines that meet.
 *
 * A third of a unit rather than a quarter, which is a drawing decision made by
 * looking: at a quarter the Breath, on the pillar between Malchut and Yesod,
 * came down squarely on top of Yesod's own name. The middle pillar is where
 * everything on this diagram is most crowded, and it is also where the first
 * letter of the game is written.
 */
const LABEL_OFFSET = 0.34;

export const TREE_LINES: readonly TreeLine[] = TREE_PATHS.map((path) => {
  const from = pointOf[path.ends[0]];
  const to = pointOf[path.ends[1]];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const span = Math.hypot(dx, dy) || 1;
  return {
    path,
    from,
    to,
    labelX: (from.x + to.x) / 2 + (-dy / span) * LABEL_OFFSET,
    labelY: (from.y + to.y) / 2 + (dx / span) * LABEL_OFFSET,
  };
});

/**
 * How a path stands to the Scribe: the ones out of where they are, the ones
 * they have already walked, and everything else.
 *
 * A walked path may be walked again — that is what makes the Tree a map rather
 * than a list of ten things to do in order — and it gives its letter once, so
 * crossing back is a way of reaching somewhere rather than a way of gaining
 * anything. `open` is therefore "leads out of here", walked or not.
 */
export type PathState = "open" | "walked" | "far";

export function stateOfPath(
  path: TreePath,
  at: SefirahId,
  walked: readonly string[],
): PathState {
  if (path.ends.includes(at)) return "open";
  return walked.includes(path.id) ? "walked" : "far";
}

/**
 * What walking a path does to a climb's record.
 *
 * Pulled out of `GamePage` and put here because it is the one piece of the
 * overworld that is pure bookkeeping and the one piece that is hard to check by
 * hand: verifying it in the browser means playing a whole rung to its exit, and
 * the mistakes it is prone to — moving to the wrong end, losing the letters
 * already held, counting a path twice — are exactly the kind that look fine on
 * the screen you are looking at and go wrong three paths later.
 *
 * Nothing here decides what a path *pays*. The letter lies in an alcove on the
 * rung's own ground and is picked up by walking to it, as every letter in this
 * game always has been, so a Scribe who bolts for the exit arrives having
 * walked the path and not having taken what was on it.
 */
export interface Standing {
  at: SefirahId;
  pathsWalked: readonly string[];
}

export function afterWalking(standing: Standing, path: TreePath): Standing {
  // A path is only walkable from one of its own ends. Anything else is a
  // record that has been edited or a caller that has lost track of where the
  // Scribe is, and standing still is the safe answer to both.
  if (!path.ends.includes(standing.at)) return standing;
  return {
    at: otherEnd(path, standing.at),
    // Kept with its repeats: `lettersFrom` gives a letter once however often
    // its path is walked, and the repeats are the record of the route actually
    // taken, which is the only thing that distinguishes two climbs of the same
    // day's Tree.
    pathsWalked: [...standing.pathsWalked, path.id],
  };
}

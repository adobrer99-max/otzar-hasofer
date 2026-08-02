import { lettersById } from "../data/letters";
import type { SefirahId } from "../types/letter";
import { kindleCost, type AscentRecord } from "../storage/ascentRepo";
import { regions } from "./regions";
import {
  otherEnd,
  pathsFrom,
  stateOfPath,
  TREE_LINES,
  TREE_POINTS,
  TREE_VIEW,
  type TreePath,
} from "./tree";
import styles from "./GamePage.module.css";

/**
 * The overworld: the Tree, drawn, walked and kindled.
 *
 * For most of this game's life the climb was `regionIndex + 1`, ten times, and
 * the only decision it ever offered was whether to spend the light. This is
 * what stands in that place — you are on a Sefirah, the ways out of it are
 * paths, and **walking a path is a rung**. The letter is on the path, so the
 * order you take the alphabet in is the route you chose, and two Scribes
 * climbing the same day's Tree can arrive at the crown having learned to move
 * in quite different ways.
 *
 * ## Why this is an SVG and not a canvas
 *
 * Everything else in Ma'alot that draws is a canvas, because it is animating
 * sixty times a second. This is a diagram: it changes when the Scribe does
 * something, and about twenty times a climb. Drawn as elements it is a list of
 * real buttons — reachable by tab, announced by a screen reader, legible to
 * anyone who opens the inspector — and it scales to a phone without a single
 * measurement, which the canvas needs a resize observer to manage. The Tree is
 * also the one image in this game that a reader may already know by heart, and
 * text in an SVG is text: the letters on the paths can be selected and read.
 *
 * The geometry lives in `tree.ts` and is tested there, including the one thing
 * about it that surprises — Netzach–Hod and Tiferet–Yesod share a midpoint, so
 * a letter written on the middle of its path collides with another letter at
 * the busiest junction of the diagram.
 */

/** Room around the drawing, in the same units, so glyphs are not clipped. */
const PAD = 0.55;
/** Drawing units to user units. Everything below is in the latter. */
const SCALE = 100;

const vb = {
  x: -PAD * SCALE,
  y: -PAD * SCALE,
  w: (TREE_VIEW.width + PAD * 2) * SCALE,
  h: (TREE_VIEW.height + PAD * 2) * SCALE,
};

const regionOf = Object.fromEntries(regions.map((r) => [r.sefirah, r])) as Record<
  SefirahId,
  (typeof regions)[number]
>;

export function TreeMap({
  ascent,
  at,
  onWalk,
  onKindle,
  onSeal,
}: {
  ascent: AscentRecord;
  at: SefirahId;
  onWalk: (path: TreePath) => void;
  onKindle: () => void;
  /** Offered only once every Sefirah is kindled — see `GamePage`. */
  onSeal?: () => void;
}) {
  const walked = ascent.pathsWalked ?? [];
  const lit = ascent.sefirotLit ?? [];
  const here = regionOf[at];
  const cost = kindleCost(here.index);
  const alreadyLit = lit.includes(at);
  const canKindle = !alreadyLit && ascent.or >= cost;
  const out = pathsFrom(at);
  /**
   * **What is in hand, not what was walked over.**
   *
   * `lettersFrom(pathsWalked)` is the obvious source and it is wrong, in a way
   * that only shows up once you look at a climb in progress: a path's letter
   * lies in an alcove on its own ground, so walking a path and *taking* what is
   * on it are two different things, and a Scribe who ran for the exit has the
   * path behind them and nothing to show for it. Reading the route instead of
   * the satchel had the map crediting letters that had never been picked up —
   * caught by seeding a mid-climb record and reading the page, which reported
   * four letters gathered to a Scribe holding six and offered a way back for a
   * letter they did not have.
   */
  const gathered = ascent.lettersHeld;

  return (
    <section className={styles.overworld}>
      <div className={styles.overworldInner}>
        <p className={styles.overworldWhere}>
          <span className={styles.plateKicker}>You stand in</span>
          <span className={styles.overworldName}>{here.name}</span>
          <span className={`${styles.overworldHeb} hebrew`} lang="he">
            {here.hebrew}
          </span>
        </p>

        <svg
          className={styles.treeSvg}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          role="img"
          aria-label={`The Tree of Life. You stand in ${here.name}. ${lit.length} of ten Sefirot kindled, ${gathered.length} of twenty-two letters gathered.`}
        >
          {/* The paths first, so the Sefirot sit on top of them. */}
          {TREE_LINES.map(({ path, from, to, labelX, labelY }) => {
            const state = stateOfPath(path, at, walked);
            const letter = lettersById[path.letter];
            const held = gathered.includes(path.letter);
            // **Show what a way pays before it is walked.** Hiding it made the
            // map pretty and useless: every decision on the Tree is "which
            // letter do I want next", and answering it meant reading the list
            // underneath instead of looking at the diagram. A path leading out
            // of where you stand shows its letter dimly; one you have walked
            // shows it in full; the rest of the Tree stays unwritten, which is
            // what not having been there looks like.
            const shows = held || state === "open";
            return (
              <g key={path.id} className={styles[`treePath_${state}`]}>
                <line
                  x1={from.x * SCALE}
                  y1={from.y * SCALE}
                  x2={to.x * SCALE}
                  y2={to.y * SCALE}
                  className={styles.treeLine}
                />
                {/* A letter is shown once it has been gathered. Before that the
                    path is a way to somewhere and not yet a letter, which is
                    the whole of what walking one is for. */}
                {shows && (
                  <text
                    x={labelX * SCALE}
                    y={labelY * SCALE}
                    className={`${styles.treeGlyph} ${held ? "" : styles.treeGlyphUnknown} hebrew`}
                    lang="he"
                    aria-hidden="true"
                  >
                    {letter?.glyph ?? "?"}
                  </text>
                )}
              </g>
            );
          })}

          {TREE_POINTS.map((point) => {
            const region = regionOf[point.sefirah];
            const isHere = point.sefirah === at;
            const isLit = lit.includes(point.sefirah);
            return (
              <g
                key={point.sefirah}
                className={[
                  styles.treeNode,
                  isHere ? styles.treeNodeHere : "",
                  isLit ? styles.treeNodeLit : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* **The disc holds nothing, and that is a correction.** It
                    held the Sefirah's Hebrew initial, which is a fine idea until
                    you write them all out: Chochmah and Chesed both begin with
                    Chet, so two of the ten were marked identically, and the
                    reader most likely to notice is the one who knows the Tree
                    well enough to be reading the Hebrew in the first place. The
                    name below says which node this is without ambiguity, and an
                    empty disc that fills when kindled says the one thing the
                    diagram needs to say at a glance. */}
                <circle cx={point.x * SCALE} cy={point.y * SCALE} r={24} className={styles.treeDisc} />
                <text
                  x={point.x * SCALE}
                  y={point.y * SCALE + 46}
                  className={styles.treeSefirahName}
                  aria-hidden="true"
                >
                  {region.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* **The paths are buttons, not the diagram.** Making the lines
            themselves clickable was the first thing tried and it is a trap on a
            phone: a stroke is a few pixels wide, and the twelve diagonals cross
            each other. A named list underneath says where each way goes and
            what it pays, which a diagram cannot, and it is the same list a
            screen reader gets. */}
        <ul className={styles.ways}>
          {out.map((path) => {
            const to = otherEnd(path, at);
            const letter = lettersById[path.letter];
            const held = gathered.includes(path.letter);
            return (
              <li key={path.id}>
                <button type="button" className={styles.wayButton} onClick={() => onWalk(path)}>
                  <span className={styles.wayTo}>{regionOf[to].name}</span>
                  <span className={styles.wayPays}>
                    {held ? (
                      // Walked before: it pays nothing again, and saying so is
                      // the difference between a shortcut and a wasted climb.
                      <>the way back — {letter?.transliteration ?? path.letter} is already yours</>
                    ) : (
                      <>
                        pays{" "}
                        <span className={`${styles.wayGlyph} hebrew`} lang="he">
                          {letter?.glyph ?? "?"}
                        </span>{" "}
                        {letter?.transliteration ?? path.letter}
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className={styles.overworldActions}>
          <span className={styles.overworldLight} title="Light gathered, and what this Sefirah asks">
            <span aria-hidden="true">✦</span> {ascent.or}
          </span>
          {alreadyLit ? (
            <span className={styles.overworldLit}>{here.name} is kindled.</span>
          ) : (
            <button
              type="button"
              className={styles.kindleButton}
              onClick={onKindle}
              disabled={!canKindle}
            >
              Kindle {here.name} — {cost} light
            </button>
          )}
          {onSeal && (
            <button type="button" className={styles.sealButton} onClick={onSeal}>
              Seal the ascent — all ten are kindled
            </button>
          )}
        </div>

        <p className={styles.overworldTally}>
          {lit.length} of ten kindled · {gathered.length} of twenty-two letters ·{" "}
          {walked.length} {walked.length === 1 ? "path" : "paths"} walked
        </p>
      </div>
    </section>
  );
}

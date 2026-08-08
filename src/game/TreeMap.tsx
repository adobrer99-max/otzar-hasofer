import { lettersById } from "../data/letters";
import type { SefirahId } from "../types/letter";
import { kindleCost, type AscentRecord } from "../storage/ascentRepo";
import { kindlePrice, type Climbing } from "./relics";
import { regions } from "./regions";
import {
  crossesAbyss,
  DAAT,
  otherEnd,
  pathsFrom,
  stateOfPath,
  TREE_CANOPY,
  TREE_FRAME,
  TREE_LIMBS,
  TREE_POINTS,
  TREE_ROOTS,
  type TreePath,
} from "./tree";
import { keliOnPath } from "./world/build";
import { describeEffect } from "./items";
import { guardianOf } from "./guardians";
import type { SealKind } from "./sealing";
import { HUSKS } from "./combat";
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

/** Drawing units to user units. Everything below is in the latter. */
const SCALE = 100;

/** The frame comes from `tree.ts` now, because the roots decide how tall it is. */
const vb = {
  x: TREE_FRAME.left * SCALE,
  y: TREE_FRAME.top * SCALE,
  w: (TREE_FRAME.right - TREE_FRAME.left) * SCALE,
  h: (TREE_FRAME.bottom - TREE_FRAME.top) * SCALE,
};

/** A limb outline, written in drawing units, scaled up for the viewBox. */
const scaled = (d: string) =>
  d.replace(/-?\d+\.?\d*/g, (n) => (Number(n) * SCALE).toFixed(1));

const regionOf = Object.fromEntries(regions.map((r) => [r.sefirah, r])) as Record<
  SefirahId,
  (typeof regions)[number]
>;

export function TreeMap({
  ascent,
  at,
  climb,
  readOnly = false,
  onWalk,
  onKindle,
  onFace,
  onSeal,
  sealKind,
}: {
  ascent: AscentRecord;
  at: SefirahId;
  /** Shown but not acted on, while the Scribe is mid-path — see `GamePage`. */
  readOnly?: boolean;
  onWalk: (path: TreePath) => void;
  onKindle: () => void;
  /** Go into the room where what holds this Sefirah is standing. */
  onFace: () => void;
  /** Offered when an ending is within reach — see `sealing.ts`. */
  onSeal?: () => void;
  /**
   * Which ending it is. The two are not the same act and must not wear the
   * same words: one is a Tree standing lit, the other is a Scribe standing on
   * a crown nothing is holding, with a case to make and no guarantee of it.
   */
  sealKind?: SealKind;
  /** The day and what is carried, folded — see `kindlePrice`. */
  climb: Climbing;
}) {
  const walked = ascent.pathsWalked ?? [];
  const lit = ascent.sefirotLit ?? [];
  const here = regionOf[at];
  // Priced through `kindlePrice`, exactly as `kindleHere` charges through it —
  // the map naming a cheaper number than the one taken would be the worst bug
  // the Reliquary could ship.
  const cost = kindlePrice(kindleCost(here.index), lit.length, climb);
  const alreadyLit = lit.includes(at);
  /**
   * **A Sefirah is held before it is bought.** Light is the second gate; the
   * first is whatever is standing on it, and until that is broken the button
   * offers the fight rather than the price. Saying which creature it is, and
   * which letter answers it, is the difference between a locked door and a
   * door with a keyhole.
   */
  const guardian = guardianOf(at);
  const freed = (ascent.guardiansBroken ?? []).includes(at);
  const canKindle = freed && !alreadyLit && ascent.or >= cost;
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
  const left = regions.filter((r) => !lit.includes(r.sefirah));
  // What the rest of the Tree would cost from here — priced in the order it
  // would actually be lit, so the oil's three cheap kindlings are counted once
  // rather than granted to every remaining Sefirah.
  const owed = left.reduce((sum, r, i) => sum + kindlePrice(kindleCost(r.index), lit.length + i, climb), 0);

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
          {/* **Under the kingdom, and over the crown.** Neither is walkable and
              neither is decoration: the roots say the drawing rests on
              something, and the branches say it stops before the tree does.
              Drawn first, and dimmest, so nothing ever competes with a way
              out. */}
          <g className={styles.treeGround} aria-hidden="true">
            {TREE_ROOTS.map((d, i) => (
              <path key={`root${i}`} d={scaled(d)} className={styles.treeRoot} />
            ))}
            {TREE_CANOPY.map((d, i) => (
              <path key={`branch${i}`} d={scaled(d)} className={styles.treeBranch} />
            ))}
          </g>

          {/* The limbs, so the Sefirot sit on top of them. */}
          {TREE_LIMBS.map(({ path, d, leaves, labelX, labelY }) => {
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
                {/* **The limb, not a rule.** Thick where it comes out of the
                    ground and fine at the tip, and bowed, because the width is
                    read off the height of its ends — so the Breath out of the
                    kingdom is the trunk and the ways into the crown are twigs.
                    Nothing about the game changed and the shape acquired a
                    direction: down is where it grew from. */}
                <path d={scaled(d)} className={styles.treeLimb} />
                {/* A walked path puts out leaves. The route through the Tree is
                    the one thing about a climb that is wholly the Scribe's, and
                    this is the only place it can be seen whole. */}
                {state === "walked" &&
                  leaves.map((leaf, i) => (
                    <ellipse
                      key={i}
                      cx={leaf.x * SCALE}
                      cy={leaf.y * SCALE}
                      rx={9}
                      ry={4.5}
                      className={styles.treeLeaf}
                      transform={`rotate(${leaf.angle.toFixed(1)} ${(leaf.x * SCALE).toFixed(1)} ${(leaf.y * SCALE).toFixed(1)})`}
                    />
                  ))}
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

          {/* **Da'at**, and the reason it is drawn at all.
              Not a Sefirah, not a station, and nothing kindles it — a broken
              ring in the gulf on the middle pillar, where every printed Tree
              puts it and where Keter–Tiferet passes straight through. Left out,
              the five broken limbs above look like a rendering fault; drawn,
              they are obviously the same gap. */}
          <g className={styles.treeDaat} aria-hidden="true">
            <circle cx={DAAT.x * SCALE} cy={DAAT.y * SCALE} r={20} className={styles.treeDaatRing} />
            <text x={DAAT.x * SCALE} y={(DAAT.y + 0.34) * SCALE} className={styles.treeDaatName}>
              Da&rsquo;at
            </text>
          </g>

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
                {/* **A kindled Sefirah gives off light**, which on a diagram is
                    a fill and on a tree is a glow. Drawn as a second, wider
                    disc under the first rather than as a filter: a blur is one
                    more thing to get wrong on a phone, and a soft ring is what
                    a small light in a dark orchard actually looks like. */}
                <circle
                  cx={point.x * SCALE}
                  cy={point.y * SCALE}
                  r={44}
                  className={styles.treeHalo}
                />
                <circle cx={point.x * SCALE} cy={point.y * SCALE} r={24} className={styles.treeDisc} />
                {/* The catch of light on the shoulder of a round thing. It is
                    two pixels of highlight and it is the whole difference
                    between a circle and a fruit. */}
                <circle
                  cx={point.x * SCALE - 7.5}
                  cy={point.y * SCALE - 7.5}
                  r={7}
                  className={styles.treeGleam}
                />
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
        {/* **Read-only while a rung is being walked.** The Tree is shown over
            the ground the Scribe is actually on — where they are, what is lit,
            what is still held — and none of it can be acted on from the middle
            of a path. Walking one is a thing you do from a place, and mid-rung
            you are between two. */}
        {readOnly ? (
          <p className={styles.overworldReadOnly}>
            The ways out are chosen from where you stand, and you are between two places.
          </p>
        ) : (
          <>
          <ul className={styles.ways}>
            {out.map((path) => {
              const to = otherEnd(path, at);
              const letter = lettersById[path.letter];
              const held = gathered.includes(path.letter);
              const keli = keliOnPath(path, ascent.seed, ascent.items ?? []);
              const overTheAbyss = crossesAbyss(path);
              return (
                <li key={path.id}>
                  <button type="button" className={styles.wayButton} onClick={() => onWalk(path)}>
                    <span className={styles.wayTo}>
                    {regionOf[to].name}
                    {/* **Said before it is taken.** Five of the twenty-two go over
                        the gulf, and what is on the far side of it is a rung with
                        no House to bargain at and no shrine to set a mark on — so
                        a veiling there costs the whole crossing. That is a thing
                        to know standing here, not to discover halfway across. */}
                    {overTheAbyss && <span className={styles.wayAbyss}>over the Abyss</span>}
                  </span>
                    <span className={styles.wayPays}>
                      {/* **What is on the pedestal, before you walk.** The letter
                          a path pays is fixed by the arrangement; the vessel is
                          drawn from the day and the path, so it is the one thing
                          on this map that is different tomorrow — and the only
                          reason to walk somewhere for a thing rather than for a
                          letter. Naming it is what turns twenty-two ways out into
                          a list of places worth going.

                          And **what it does**, because a pedestal can be walked
                          past now: some vessels cost something, so a name alone
                          would be asking the Scribe to route across the Tree for
                          a surprise. Derived from the numbers rather than written
                          beside them — see `describeEffect`. */}
                      {keli && (
                        <span className={styles.wayKeli}>
                          ✦ {keli.name}
                          <span className={styles.wayKeliDoes}>{describeEffect(keli.effect)}</span>
                        </span>
                      )}{" "}
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
            ) : freed ? (
              <button
                type="button"
                className={styles.kindleButton}
                onClick={onKindle}
                disabled={!canKindle}
              >
                Kindle {here.name} — {cost} light
              </button>
            ) : (
              <button type="button" className={styles.kindleButton} onClick={onFace}>
                Face {HUSKS[guardian.kind].name}
              </button>
            )}
            {onSeal && (
              <button type="button" className={styles.sealButton} onClick={onSeal}>
                {sealKind === "crown"
                  ? "Present yourself at the crown"
                  : "Seal the ascent — all ten are kindled"}
              </button>
            )}
          </div>
          </>
        )}

        {!freed && (
          <p className={styles.overworldHeld}>
            {here.name} is held by {HUSKS[guardian.kind].name} — {guardian.because}
            {guardian.opens && (
              <>
                {" "}
                <span className={styles.overworldKey}>
                  {lettersById[guardian.opens.letter]?.name ?? guardian.opens.letter} answers it:{" "}
                  {guardian.opens.how}
                </span>
              </>
            )}
          </p>
        )}

        <p className={styles.overworldTally}>
          {lit.length} of ten kindled · {gathered.length} of twenty-two letters ·{" "}
          {walked.length} {walked.length === 1 ? "path" : "paths"} walked
          {/* **What is still owed, as a number.** The climb ends when all ten
              burn, and without this the last third of it is a Scribe kindling
              things and hoping. Three hundred is the whole tour; what matters
              standing here is the rest of it. */}
          {left.length > 0 && (
            <>
              {" · "}
              <span className={styles.overworldOwed}>
                {owed} light more for the {left.length === 1 ? "last" : `remaining ${left.length}`}
              </span>
            </>
          )}
        </p>
      </div>
    </section>
  );
}

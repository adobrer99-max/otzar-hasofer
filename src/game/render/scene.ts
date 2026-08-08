import { alpha, mix, type Palette } from "./palette";

/**
 * **A cut scene, as a table** — the same bargain `husks.ts` struck, made again
 * for the things this game tells rather than shows.
 *
 * Two moments in Ma'alot are pure type. The prologue is six paragraphs behind a
 * "Go on" button; arriving at a Sefirah prints that place's `teaching` line on
 * the way-out plate. Both are the game *saying* what it is best at *drawing* —
 * the fall that put a Scribe at the bottom of the Tree, and the first sight of
 * each of the ten places.
 *
 * **Authored, not imported.** Everything visual in this game is procedural
 * vector work on a canvas: the tiles, the twenty klipot, the Scribe himself,
 * the Tree. A scene made of pictures would be the one asset in the repo, would
 * not turn with the theme, would not turn with the six festival accents, and
 * could not be enumerated by a test. So a scene is a list of shapes over a
 * **normalised 0..1 box**, painted out of the resolved `Palette`, and it is a
 * table for exactly the reasons the bestiary is one.
 *
 * Three rules the table keeps, each of which is a fault this project has
 * already paid for once:
 *
 * 1. **No scene names a colour.** Every shape names an `Ink` — a *role* — and
 *    `paintScene` resolves it against the palette in hand. P8 shipped twenty
 *    creatures filled from `bgDeep`, which is near-black on charcoal and **pale
 *    cream on vellum**, and on the light theme the klipot were very nearly not
 *    there. A scene that hardcoded `#c9a24b` would be the same bug with better
 *    manners.
 * 2. **One movement primitive, and it is small.** A `Drift` is a translation, a
 *    rotation and a fade over a cycle. That covers a lamp guttering, a mark
 *    streaming upward, a body falling, a husk swaying — because all of those
 *    are the same operation with different numbers. The alternative was a
 *    keyframe list per scene, which is sixteen times the authoring and cannot
 *    be checked.
 * 3. **Nothing is on a clock the player does not own.** `t` is seconds and the
 *    caller decides what to pass; a scene has no notion of "finished" and never
 *    advances a page. This game has never taken the pace out of a player's
 *    hands and a cut scene is not the place to start — the words are still
 *    turned by a button, and `still` is the frame a reduced-motion viewer gets.
 */

/** A point in the scene's own box: x across, y down, both 0..1. */
export type Point = readonly [number, number];
export type Path = readonly Point[];

/**
 * **The palette by role rather than by name**, which is what lets one table
 * paint on charcoal, on vellum and under all six festival accents.
 *
 * Deliberately short. A scene wants a ground, a middle, an ink and a light; a
 * scene that wanted eleven distinct values would be a painting rather than a
 * picture, and would not read at the size a panel actually is.
 */
export type Ink =
  /** The air — the furthest thing back. */
  | "sky"
  /** The deepest ground, for a void or a shadow. */
  | "deep"
  /** Rock, and anything made of it. */
  | "stone"
  | "edge"
  /** The letters, the light, the lamps. `bright` is the one that burns. */
  | "gold"
  | "bright"
  | "dim"
  /** Water, and the dark of Binah. */
  | "blue"
  /**
   * **A body**, and it is a role because the game already decided what one
   * looks like. `drawScribe` fills the Scribe with `blue` at eight tenths and
   * outlines him in `gold`, and gives him a lamp — he is a *lit* figure, not a
   * silhouette. The first draft of these scenes filled every body with `ink`
   * and photographed six panels with nobody in them: on charcoal `ink` is the
   * deepest background, which is very nearly the ground it was standing on.
   * That is P8's invisible-klipot bug exactly, and the sheet caught it the same
   * way — by being looked at.
   */
  | "robe"
  /**
   * Whatever is darkest on this ground, whichever ground it is — a body, a
   * husk, a hole in the light. **Not a colour**: on charcoal it is the deep
   * background and on vellum it is the text, and it is a role precisely because
   * those are opposite variables. See `paintHusk`, which learned this the hard
   * way.
   */
  | "ink";

/**
 * **How a shape moves** — one primitive, three channels.
 *
 * `to` translates, `turn` rotates about `pivot`, `fade` swings the opacity, and
 * any of the three may be used alone. A cycle is `period` seconds; `phase`
 * offsets around it, so two lamps gutter out of step and a stream of letters
 * does not travel as a block.
 *
 * `once` is the difference between a fall and a flicker: a falling body runs
 * its cycle and **stays where it lands**, while a flame runs its cycle forever.
 * Without it every scene would be a loop, and a loop cannot show a thing that
 * happened.
 */
export interface Drift {
  /** Where it ends up, as a displacement in box units. */
  to?: Point;
  /** How far it turns over a cycle, in radians. */
  turn?: number;
  /** What it turns about, in box units. Defaults to the shape's own first point. */
  pivot?: Point;
  /** Opacity from → to, multiplied into the shape's own. */
  fade?: readonly [number, number];
  /** Seconds per cycle. */
  period?: number;
  /** Offset around the cycle, 0..1. */
  phase?: number;
  /** Run the cycle once and hold at the end, rather than looping. */
  once?: boolean;
  /**
   * Ease the cycle rather than running it linearly. `"fall"` accelerates, which
   * is what makes a dropped body read as dropped rather than as lowered.
   */
  ease?: "fall" | "rise";
}

/**
 * One drawn thing. Exactly one of `poly`, `line` and `dot` is used — a filled
 * shape, a stroked polyline, or a disc — which keeps the painter a switch of
 * three cases rather than a renderer.
 */
export interface Shape {
  /** A filled shape. */
  poly?: Path;
  /** A stroked polyline — a limb, a horizon, a thread, the edge of a thing. */
  line?: Path;
  /** A disc: a lamp, a mote, a letter, a star. */
  dot?: Point;
  /** Radius as a fraction of the box's **width**, so a disc stays round. */
  r?: number;
  fill?: Ink;
  stroke?: Ink;
  /** Stroke width as a fraction of the box's width. */
  w?: number;
  /** The shape's own opacity, before any `fade`. */
  alpha?: number;
  /** Rounded rather than cornered, for the things that are water or air. */
  smooth?: boolean;
  /** A soft radial glow behind a disc — a lamp is a light, not a circle. */
  glow?: number;
  move?: Drift;
}

export interface Scene {
  id: string;
  /**
   * **What a screen reader is told is here**, and it lives on the scene rather
   * than at the call site for the reason every other authored line in this
   * project does: a canvas is a hole in the document, and a picture whose
   * description is written where it is *used* has one description per use and
   * none of them in the file that would be edited when the picture changes.
   *
   * It must say what the picture adds, not repeat the paragraph under it — the
   * words are already there and hearing them twice is worse than not hearing
   * the picture at all.
   */
  label: string;
  /** Painted back to front, exactly as authored. */
  shapes: readonly Shape[];
  /**
   * The frame a **reduced-motion** viewer is given, in seconds.
   *
   * A still rather than an absence: someone who has asked the machine to stop
   * moving things has not asked to be shown a blank panel. Authored per scene
   * because the right still is not always the start — a fall wants the moment
   * after it, not the moment before.
   */
  still?: number;
}

// ---------------------------------------------------------------------------
// the painter
// ---------------------------------------------------------------------------

function inkOf(palette: Palette, ink: Ink): string {
  switch (ink) {
    case "sky":
      return palette.bg;
    case "deep":
      return palette.bgDeep;
    case "stone":
      return palette.stone;
    case "edge":
      return palette.stoneEdge;
    case "gold":
      return palette.gold;
    case "bright":
      return palette.goldBright;
    case "dim":
      return palette.goldDim;
    case "blue":
      return palette.blue;
    case "robe":
      // Eight tenths on charcoal and five on vellum, which is `drawScribe`'s
      // own number: a robe has to be a shape against the ground and not a hole
      // in it, and the two grounds need different amounts of it.
      return alpha(palette.blue, palette.light ? 0.55 : 0.85);
    case "ink":
      // The rule `paintHusk` states: the darkest value the palette has,
      // whichever ground it is on, described by what it *is* rather than by
      // which variable happened to be dark that day.
      return palette.light ? palette.text : palette.bgDeep;
    default:
      return palette.text;
  }
}

/** Where a cycle stands at `t`, in 0..1, with the easing and the holding. */
function phaseOf(move: Drift, t: number): number {
  const period = move.period ?? 4;
  const raw = t / period + (move.phase ?? 0);
  const p = move.once ? Math.min(1, Math.max(0, raw)) : raw - Math.floor(raw);
  if (move.ease === "fall") return p * p;
  if (move.ease === "rise") return 1 - (1 - p) * (1 - p);
  return p;
}

/**
 * **How far through its motion a looping shape is**, as a there-and-back rather
 * than a saw.
 *
 * A looping drift that ran 0→1 and snapped would make every flame in every
 * scene jump once a cycle. A `once` drift is the one that genuinely goes one
 * way, and it is the one that holds at the end.
 */
function swingOf(move: Drift, t: number): number {
  const p = phaseOf(move, t);
  return move.once ? p : (1 - Math.cos(p * Math.PI * 2)) / 2;
}

/**
 * Paint one scene into a box of `w × h` device-independent pixels at its
 * top-left origin, at `t` seconds.
 *
 * Pure but for the canvas: given the same scene, palette and `t` it draws the
 * same picture, which is what makes `scene.test.ts` able to say anything at all.
 */
export function paintScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  palette: Palette,
  t: number,
  w: number,
  h: number,
): void {
  const X = (x: number) => x * w;
  const Y = (y: number) => y * h;

  for (const shape of scene.shapes) {
    const move = shape.move;
    const swing = move ? swingOf(move, t) : 0;
    const [dx, dy] = move?.to ? [move.to[0] * swing, move.to[1] * swing] : [0, 0];
    const fade =
      move?.fade ? move.fade[0] + (move.fade[1] - move.fade[0]) * swing : 1;
    const opacity = Math.max(0, Math.min(1, (shape.alpha ?? 1) * fade));
    if (opacity <= 0) continue;

    ctx.save();
    // The turn is applied about the pivot in *pixels*, so a rotation on a wide
    // panel is the rotation that was authored rather than one skewed by the
    // aspect — which is the same reason `r` is a fraction of the width alone.
    if (move?.turn) {
      const [px, py] = move.pivot ?? shape.poly?.[0] ?? shape.line?.[0] ?? shape.dot ?? [0.5, 0.5];
      ctx.translate(X(px + dx), Y(py + dy));
      ctx.rotate(move.turn * (move.once ? swing : swing * 2 - 1));
      ctx.translate(-X(px), -Y(py));
    } else if (dx || dy) {
      ctx.translate(X(dx), Y(dy));
    }

    if (shape.dot) {
      const [cx, cy] = shape.dot;
      const r = (shape.r ?? 0.02) * w;
      if (shape.glow) {
        const glow = ctx.createRadialGradient(X(cx), Y(cy), 0, X(cx), Y(cy), r * shape.glow);
        glow.addColorStop(0, alpha(inkOf(palette, shape.fill ?? "bright"), 0.45 * opacity));
        glow.addColorStop(1, alpha(inkOf(palette, shape.fill ?? "bright"), 0));
        ctx.fillStyle = glow;
        ctx.fillRect(X(cx) - r * shape.glow, Y(cy) - r * shape.glow, r * shape.glow * 2, r * shape.glow * 2);
      }
      ctx.fillStyle = alpha(inkOf(palette, shape.fill ?? "bright"), opacity);
      ctx.beginPath();
      ctx.arc(X(cx), Y(cy), r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    const path = shape.poly ?? shape.line;
    if (!path || path.length < 2) {
      ctx.restore();
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(X(path[0][0]), Y(path[0][1]));
    if (shape.smooth && path.length > 2) {
      // The same rounding the smoothed silhouettes use: a midpoint quadratic,
      // which costs one call a point and is the difference between water and a
      // polygon pretending to be water.
      for (let i = 1; i < path.length - 1; i += 1) {
        const [ax, ay] = path[i];
        const [bx, by] = path[i + 1];
        ctx.quadraticCurveTo(X(ax), Y(ay), X((ax + bx) / 2), Y((ay + by) / 2));
      }
      const last = path[path.length - 1];
      ctx.lineTo(X(last[0]), Y(last[1]));
    } else {
      for (let i = 1; i < path.length; i += 1) ctx.lineTo(X(path[i][0]), Y(path[i][1]));
    }

    if (shape.poly) {
      ctx.closePath();
      ctx.fillStyle = alpha(inkOf(palette, shape.fill ?? "ink"), opacity);
      ctx.fill();
      if (shape.stroke) {
        ctx.strokeStyle = alpha(inkOf(palette, shape.stroke), opacity);
        ctx.lineWidth = Math.max(0.7, (shape.w ?? 0.004) * w);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = alpha(inkOf(palette, shape.stroke ?? "gold"), opacity);
      ctx.lineWidth = Math.max(0.7, (shape.w ?? 0.006) * w);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * The ground a scene is laid on — a wash rather than a flat fill, so a panel
 * has depth before anything is drawn in it.
 *
 * Separate from `paintScene` because the sixteen scenes should not each have to
 * author their own sky, and because the ten places tint theirs from `PLACES`
 * while the prologue's is the plain theme. One caller, one line.
 */
export function paintGround(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  w: number,
  h: number,
): void {
  /**
   * **Air above, haze below** — and the first version had it upside down.
   *
   * It ran from `bgDeep` at the top to a stone mix at the bottom, which is the
   * darkest value in the frame laid where the sky is. Photographed, every panel
   * was one flat near-black rectangle with the ground slab lost inside it and
   * nothing to see a body against. A picture needs a value to stand a shape in
   * front of before it needs anything else.
   *
   * So: a little blue in the air at the top, the deep ground at the bottom, and
   * both mixed out of the theme rather than named — on vellum the same two
   * mixes give a pale sky over warm ground, which is the same picture and not
   * the same colours.
   */
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, mix(palette.bg, palette.blue, 0.45));
  sky.addColorStop(0.62, palette.bg);
  sky.addColorStop(1, palette.bgDeep);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
}

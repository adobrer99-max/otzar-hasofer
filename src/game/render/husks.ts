import { HUSKS, type HuskKind } from "../combat";
import type { Husk } from "../world/types";
import { alpha, mix, type Palette } from "./palette";

/**
 * **The bestiary, drawn as creatures.**
 *
 * Three passes got here and it is worth keeping all three, because each fixed
 * something real and each left something that looked like a fix and was not.
 *
 * 1. The renderer drew twenty klipot as **four shapes chosen by `role`** — a
 *    circle, a diamond, a slab, a shouldered slab. The Locust and Leviathan
 *    were the same circle.
 * 2. P4b gave each kind **one convex polygon** of its own and a rule for
 *    authoring it: *a profile, a stance, one thing sticking out*. A table, and
 *    a test that no two rows matched. That ended four-shapes-for-twenty-names
 *    and it could not do better, because **a convex polygon has no head, no
 *    legs, no horns and no tail.** Twenty distinct rows are still twenty blobs,
 *    and a test that compares rows cannot tell you so.
 * 3. Then each got **one bright mark** — a ring for the Calf, a bolt for the
 *    Saraf, a waterline for the Tannin. That doubled down on the wrong thing:
 *    a symbol *about* the creature laid on a shape that is not the creature. A
 *    locust does not need an icon meaning swarm. It needs a hind leg.
 *
 * So a klipah is **parts**, and the parts are the anatomy:
 *
 * - **masses**, filled — a torso, a head, a wing, a coil.
 * - **limbs**, stroked with a round cap — legs, arms, horns, necks, tails,
 *   tongues, a hanging thread. This is the whole trick and it is the one
 *   eight-bit sprites used: articulation is far cheaper as a thick line than as
 *   a polygon, and a two-pixel leg with a rounded end reads as a leg.
 * - **features**, in the trapped light — an eye, and almost never more.
 *
 * **And the picture's box is not the hit box.** Every klipah is about sixteen
 * by eighteen because that is what the fight was balanced against, and the
 * silhouettes were normalised to it — so the Nachash, the Tannin and Leviathan,
 * which are long and low, were being drawn as tall as they are wide. `draw`
 * scales the picture off the hit box, anchored at the feet and centred across,
 * so a serpent can be twice as wide as the thing you actually collide with.
 * Nothing about the fight moves.
 *
 * **The roster splits the way the sources split.** The klipot that come from
 * what a person did — Cain, the Brothers, the Calf, Esau, Amalek, Korach,
 * Jezebel, Delilah, Athaliah — are drawn as **figures**, upright, with heads
 * and arms. The great ones are **beasts**. That distinction alone does more
 * work at twenty-seven pixels than any amount of detail: before you can tell
 * which klipah it is, you can tell whether it is a man or an animal.
 *
 * Still a table, still enumerated by `husks.test.ts`, and still coarse on
 * purpose — a room is framed at about 1.67, so a creature is roughly
 * twenty-seven pixels across and anything under two of them is mud.
 */
export type Point = readonly [number, number];
export type Silhouette = readonly Point[];

/**
 * **How a part moves**, as a rotation about a point of its own.
 *
 * One primitive covers a walk, a wingbeat, a sway and a lashing tail, because
 * all four are a part turning about where it is attached: a thigh about a hip,
 * a wing about a shoulder, a hanging body about the ceiling it hangs from. The
 * alternative was a keyframe per creature per state, which is twenty times the
 * authoring and cannot be enumerated by a test.
 *
 * `on` is the whole of the design decision worth writing down:
 *
 * - **`"stride"`** is driven by *where the creature is*, not by the clock —
 *   `sin(x / stride)`. A leg therefore swings as the creature covers ground and
 *   **stops when the creature stops**, which is the entire difference between a
 *   walk and a twitch, and it is stateless: nothing has to be stored on the
 *   husk, and two creatures at the same place are at the same point of a step.
 *   Scaled by `|vx|` so a klipah standing still stands still rather than
 *   holding whatever pose it happened to stop in.
 * - **`"tick"`** is the clock, and it is for the things that move while going
 *   nowhere: a wingbeat, a hanging sway, a tail in water, a head casting about.
 */
export interface Move {
  /** The joint, in the creature's own 0..1 draw box. */
  pivot: Point;
  /** How far it turns at full swing, in radians. */
  swing: number;
  on: "stride" | "tick";
  /** Offset around the cycle, 0 to 1 — a left leg is half a turn from a right. */
  phase?: number;
  /** Ticks per cycle, for `"tick"` parts. Lower is faster. */
  period?: number;
}

/** A filled part of a body — a torso, a head, a wing, a coil. */
export interface Mass {
  poly: Silhouette;
  /** Rounded rather than cornered, for the things that are water or air. */
  smooth?: boolean;
  move?: Move;
}

/**
 * A stroked part — a leg, an arm, a horn, a neck, a tail, a tongue.
 *
 * Drawn as a thick line with a round cap rather than as a shape, which is what
 * makes twenty articulated creatures affordable: a leg is two points and a
 * width. `w` is a fraction of the draw box's width.
 */
export interface Limb {
  poly: Silhouette;
  w?: number;
  move?: Move;
}

/**
 * A mark in the trapped light — nearly always an eye.
 *
 * Kept from the previous pass and cut back hard. Gold on a near-black body is
 * the highest contrast the palette can make, so it is the right channel for the
 * one thing that has to read at any size; it is the wrong channel for a
 * pictogram explaining the creature's rule, which is what it had become.
 */
export interface Feature {
  /** A filled dot — an eye. Radius as a fraction of the draw box's width. */
  dot?: Point;
  r?: number;
  /** A stroked polyline, for the two or three that need a second stroke. */
  line?: Silhouette;
}

export interface Creature {
  /**
   * The picture's size as a multiple of the hit box — anchored at the feet and
   * centred across, so a wide creature grows sideways and a tall one grows up
   * rather than sinking through the floor.
   */
  draw?: Point;
  masses: readonly Mass[];
  limbs?: readonly Limb[];
  features?: readonly Feature[];
  /**
   * How far the body drops as the legs spread, as a fraction of the draw box.
   * A walk without this is a pair of scissors: the give in the knees is most of
   * what makes a gait read as weight rather than as animation.
   */
  bob?: number;
}

/**
 * **Where a creature is in its own movement**, given only itself and the clock.
 *
 * Pure, and exported so it can be tested — the claim that matters here is not
 * about pixels but about what the gait is *keyed to*, and that is easy to get
 * wrong in a way no picture would show: a walk driven by the tick looks almost
 * right, and then a klipah standing at the edge of its ground jogs on the spot
 * forever. Note the absence of a `tick` parameter, which is the claim itself.
 */
export function gaitOf(husk: Husk, phase = 0): number {
  // One full step per stride and a half of the creature's own width, which is
  // roughly a leg's reach, so a small thing takes small quick steps.
  const stride = Math.max(1, husk.w * 1.5);
  // Faded in with speed, so a creature that has stopped stands rather than
  // holding whatever half-step it stopped on.
  const carried = Math.min(1, Math.abs(husk.vx) / 22);
  return Math.sin((husk.x / stride + phase) * Math.PI * 2) * carried;
}

/**
 * A standing figure, seen from the side, facing right. The nine klipot that
 * come from what a person did are built on this: head, torso, two legs, an arm.
 * What distinguishes them is stance and what they carry, which is how you tell
 * two people apart at a distance in life as well.
 */
export const CREATURES: Record<HuskKind, Creature> = {
  /**
   * **Cain.** נָע וָנָד — a restless wanderer upon the earth. A man walking,
   * mid-stride, and the head is bowed: *it has never once looked up*. The skull
   * sits forward of and below the shoulder line, which is the whole read.
   */
  cain: {
    draw: [1, 1.05],
    masses: [
      { poly: [[0.34, 0.72], [0.32, 0.44], [0.4, 0.34], [0.62, 0.32], [0.66, 0.46], [0.64, 0.72]] },
      { poly: [[0.56, 0.42], [0.56, 0.24], [0.72, 0.22], [0.78, 0.32], [0.72, 0.42]], smooth: true },
    ],
    limbs: [
      // A wide stride, because a figure that fills half its box reads as a
      // smaller creature than the one you actually collide with — and the two
      // legs half a cycle apart, which is the whole of a walk.
      { poly: [[0.44, 0.7], [0.22, 0.86], [0.08, 1]], w: 0.09, move: { pivot: [0.46, 0.68], swing: 0.42, on: "stride" } },
      { poly: [[0.56, 0.7], [0.76, 0.86], [0.9, 1]], w: 0.09, move: { pivot: [0.54, 0.68], swing: 0.42, on: "stride", phase: 0.5 } },
      // The arms swing against the legs, as they do.
      { poly: [[0.4, 0.42], [0.2, 0.56], [0.14, 0.7]], w: 0.07, move: { pivot: [0.42, 0.42], swing: 0.3, on: "stride", phase: 0.5 } },
      { poly: [[0.62, 0.44], [0.82, 0.58], [0.88, 0.7]], w: 0.07, move: { pivot: [0.6, 0.42], swing: 0.3, on: "stride" } },
    ],
    features: [{ dot: [0.72, 0.34], r: 0.045 }],
    bob: 0.035,
  },

  /**
   * **The Brothers.** *Not one of them would have done it by himself.* Three
   * figures, overlapping, the near one whole and the two behind it only heads
   * and shoulders — a crowd drawn the way a crowd reads, which is by repetition
   * rather than by detail.
   */
  brothers: {
    draw: [1.25, 1],
    masses: [
      { poly: [[0.06, 0.74], [0.06, 0.46], [0.24, 0.42], [0.26, 0.74]] },
      { poly: [[0.1, 0.44], [0.1, 0.3], [0.24, 0.28], [0.26, 0.44]], smooth: true },
      { poly: [[0.62, 0.74], [0.62, 0.46], [0.8, 0.42], [0.82, 0.74]] },
      { poly: [[0.66, 0.44], [0.66, 0.3], [0.8, 0.28], [0.82, 0.44]], smooth: true },
      { poly: [[0.32, 0.78], [0.3, 0.42], [0.42, 0.34], [0.58, 0.34], [0.68, 0.44], [0.66, 0.78]] },
      { poly: [[0.4, 0.36], [0.4, 0.18], [0.6, 0.16], [0.64, 0.28], [0.58, 0.36]], smooth: true },
    ],
    limbs: [
      { poly: [[0.4, 0.76], [0.38, 1]], w: 0.07, move: { pivot: [0.42, 0.74], swing: 0.4, on: "stride" } },
      { poly: [[0.58, 0.76], [0.6, 1]], w: 0.07, move: { pivot: [0.56, 0.74], swing: 0.4, on: "stride", phase: 0.5 } },
      // The two behind are a third of a cycle out, so a crowd shuffles rather
      // than marching in step.
      { poly: [[0.14, 0.72], [0.14, 0.94]], w: 0.055, move: { pivot: [0.14, 0.7], swing: 0.3, on: "stride", phase: 0.33 } },
      { poly: [[0.74, 0.72], [0.74, 0.94]], w: 0.055, move: { pivot: [0.74, 0.7], swing: 0.3, on: "stride", phase: 0.66 } },
    ],
    features: [{ dot: [0.56, 0.26], r: 0.04 }],
    bob: 0.03,
  },

  /**
   * **The Calf.** A young bull, standing four-square on the pedestal they set
   * it on — *it does nothing whatever until you strike it*. Short horns, a
   * heavy head carried low, and stubby legs that are planted rather than
   * walking.
   */
  calf: {
    draw: [1.25, 1],
    masses: [
      { poly: [[0.16, 0.68], [0.18, 0.42], [0.36, 0.34], [0.66, 0.34], [0.76, 0.44], [0.74, 0.68]] },
      { poly: [[0.7, 0.62], [0.68, 0.38], [0.86, 0.34], [0.96, 0.42], [0.94, 0.6], [0.8, 0.64]] },
      { poly: [[0.1, 0.88], [0.9, 0.88], [0.9, 1], [0.1, 1]] },
    ],
    limbs: [
      // Diagonal pairs, which is how a four-legged thing actually walks: near
      // fore with far hind. Drawn in step it reads as a pantomime horse.
      { poly: [[0.26, 0.66], [0.26, 0.88]], w: 0.08, move: { pivot: [0.26, 0.64], swing: 0.34, on: "stride" } },
      { poly: [[0.42, 0.66], [0.42, 0.88]], w: 0.08, move: { pivot: [0.42, 0.64], swing: 0.34, on: "stride", phase: 0.5 } },
      { poly: [[0.6, 0.66], [0.6, 0.88]], w: 0.08, move: { pivot: [0.6, 0.64], swing: 0.34, on: "stride", phase: 0.5 } },
      { poly: [[0.72, 0.66], [0.72, 0.88]], w: 0.08, move: { pivot: [0.72, 0.64], swing: 0.34, on: "stride" } },
      { poly: [[0.78, 0.36], [0.8, 0.24], [0.9, 0.2]], w: 0.055 },
      { poly: [[0.88, 0.36], [0.94, 0.26], [1, 0.24]], w: 0.055 },
      // The tail flicks on its own clock, because a tail does.
      { poly: [[0.18, 0.5], [0.08, 0.44], [0.04, 0.52]], w: 0.045, move: { pivot: [0.18, 0.5], swing: 0.3, on: "tick", period: 11 } },
    ],
    features: [{ dot: [0.86, 0.46], r: 0.04 }],
    bob: 0.025,
  },

  /**
   * **Esau.** *It runs you down over open ground, and gives up the moment you
   * are above it.* A man at a dead run: the whole body pitched forward over the
   * front foot, both arms back, and nothing at all above the shoulder line.
   */
  esav: {
    draw: [1.2, 1],
    masses: [
      { poly: [[0.22, 0.72], [0.3, 0.42], [0.52, 0.34], [0.68, 0.4], [0.62, 0.66], [0.42, 0.76]] },
      { poly: [[0.64, 0.42], [0.68, 0.26], [0.84, 0.24], [0.9, 0.34], [0.8, 0.44]], smooth: true },
    ],
    limbs: [
      // A dead run, so the legs swing further than anything else in the
      // table — but only just. The first pass had them at 0.6 radians each way,
      // which is nearly seventy degrees of arc: on the walk strip the middle
      // frames were a figure doing the splits, and at play speed that reads as
      // a body lying down rather than one running. A swing that is striking
      // frame by frame is already too big.
      { poly: [[0.36, 0.72], [0.22, 0.86], [0.12, 0.98]], w: 0.085, move: { pivot: [0.4, 0.7], swing: 0.36, on: "stride" } },
      { poly: [[0.5, 0.7], [0.62, 0.86], [0.74, 0.98]], w: 0.085, move: { pivot: [0.48, 0.7], swing: 0.36, on: "stride", phase: 0.5 } },
      { poly: [[0.4, 0.46], [0.22, 0.5], [0.1, 0.44]], w: 0.07, move: { pivot: [0.42, 0.46], swing: 0.24, on: "stride", phase: 0.5 } },
      { poly: [[0.44, 0.5], [0.28, 0.6], [0.16, 0.6]], w: 0.06, move: { pivot: [0.44, 0.5], swing: 0.24, on: "stride" } },
    ],
    features: [{ dot: [0.8, 0.32], r: 0.04 }],
    bob: 0.04,
  },

  /**
   * **Amalek.** *He met you on the way and cut off the stragglers behind you.*
   * A figure with a raised blade — and the blade is on the arm that trails,
   * because the thing about Amalek is what happens once you have gone past.
   */
  amalek: {
    draw: [1.15, 1.05],
    masses: [
      { poly: [[0.32, 0.72], [0.3, 0.42], [0.4, 0.32], [0.6, 0.3], [0.68, 0.42], [0.66, 0.72]] },
      { poly: [[0.52, 0.32], [0.52, 0.16], [0.7, 0.14], [0.76, 0.24], [0.68, 0.34]], smooth: true },
    ],
    limbs: [
      { poly: [[0.42, 0.7], [0.36, 0.86], [0.34, 1]], w: 0.085, move: { pivot: [0.44, 0.68], swing: 0.36, on: "stride" } },
      { poly: [[0.58, 0.7], [0.64, 0.86], [0.68, 1]], w: 0.085, move: { pivot: [0.56, 0.68], swing: 0.36, on: "stride", phase: 0.5 } },
      // The blade arm keeps its own small time whatever the legs do: what
      // Amalek is doing while it walks is waiting.
      { poly: [[0.36, 0.44], [0.2, 0.34], [0.14, 0.16]], w: 0.065, move: { pivot: [0.38, 0.44], swing: 0.14, on: "tick", period: 13 } },
      { poly: [[0.14, 0.2], [0.1, 0.04]], w: 0.04, move: { pivot: [0.38, 0.44], swing: 0.14, on: "tick", period: 13 } },
    ],
    features: [{ dot: [0.68, 0.22], r: 0.04 }],
    bob: 0.03,
  },

  /**
   * **Korach.** וַתִּפְתַּח הָאָרֶץ אֶת־פִּיהָ — the earth opened her mouth,
   * and they went down alive into the pit. Not a monster: **a man already half
   * swallowed**, sunk to the chest, with both arms still up out of the ground.
   * The two halves of what it does — inside the earth, and out of it — are the
   * same picture.
   */
  korach: {
    draw: [1.15, 1],
    masses: [
      { poly: [[0.34, 1], [0.32, 0.52], [0.42, 0.42], [0.58, 0.42], [0.68, 0.52], [0.66, 1]] },
      { poly: [[0.42, 0.44], [0.42, 0.28], [0.58, 0.26], [0.64, 0.36], [0.56, 0.44]], smooth: true },
      { poly: [[0.02, 0.82], [0.34, 0.74], [0.66, 0.74], [0.98, 0.82], [0.98, 1], [0.02, 1]] },
    ],
    limbs: [
      // Both arms clutching at the air, out of phase, on their own clock —
      // whatever the rest of it is doing, this never stops.
      { poly: [[0.38, 0.5], [0.24, 0.34], [0.2, 0.12]], w: 0.07, move: { pivot: [0.4, 0.5], swing: 0.22, on: "tick", period: 7 } },
      { poly: [[0.62, 0.5], [0.76, 0.34], [0.8, 0.12]], w: 0.07, move: { pivot: [0.6, 0.5], swing: 0.22, on: "tick", period: 7, phase: 0.5 } },
    ],
    features: [{ dot: [0.56, 0.34], r: 0.04 }],
  },

  /**
   * **Jezebel.** A queen at her window, which is where she was standing when
   * they threw her out of it — crowned, painted, and *rooted where she stands*.
   * A tall column of a robe with no legs showing at all, because she does not
   * go anywhere: what she sends goes for her.
   */
  izevel: {
    draw: [1, 1.05],
    masses: [
      { poly: [[0.04, 1], [0.3, 0.5], [0.4, 0.36], [0.6, 0.36], [0.7, 0.5], [0.96, 1]] },
      { poly: [[0.42, 0.38], [0.42, 0.22], [0.58, 0.2], [0.64, 0.3], [0.56, 0.38]], smooth: true },
      { poly: [[0.36, 0.2], [0.4, 0.1], [0.46, 0.16], [0.52, 0.06], [0.58, 0.16], [0.64, 0.1], [0.66, 0.2]] },
    ],
    limbs: [
      // Rooted, so nothing here is keyed to the ground she covers: she sways.
      { poly: [[0.64, 0.46], [0.82, 0.54], [0.9, 0.68]], w: 0.06, move: { pivot: [0.62, 0.46], swing: 0.12, on: "tick", period: 16 } },
      { poly: [[0.36, 0.46], [0.18, 0.54], [0.1, 0.68]], w: 0.06, move: { pivot: [0.38, 0.46], swing: 0.12, on: "tick", period: 16, phase: 0.5 } },
    ],
    features: [{ dot: [0.58, 0.28], r: 0.04 }],
  },

  /**
   * **Delilah.** *It costs you no lamp at all. It costs you what you had
   * gathered.* A seated figure with the shears open in one hand — the only
   * klipah in the game that takes something other than a lamp, drawn holding
   * the thing it takes it with.
   */
  delilah: {
    draw: [1.15, 1],
    masses: [
      { poly: [[0.26, 0.96], [0.3, 0.5], [0.4, 0.38], [0.58, 0.38], [0.66, 0.52], [0.7, 0.96]] },
      { poly: [[0.42, 0.4], [0.42, 0.24], [0.58, 0.22], [0.64, 0.32], [0.56, 0.4]], smooth: true },
    ],
    limbs: [
      { poly: [[0.62, 0.5], [0.78, 0.46], [0.9, 0.36]], w: 0.06 },
      // The shears, opening and closing. The only pair of parts in the table
      // that turn about the same joint in opposite directions.
      { poly: [[0.84, 0.42], [0.98, 0.28]], w: 0.035, move: { pivot: [0.84, 0.42], swing: 0.26, on: "tick", period: 10 } },
      { poly: [[0.84, 0.42], [0.94, 0.5]], w: 0.035, move: { pivot: [0.84, 0.42], swing: 0.26, on: "tick", period: 10, phase: 0.5 } },
      { poly: [[0.24, 0.96], [0.76, 0.96]], w: 0.06 },
    ],
    features: [{ dot: [0.56, 0.3], r: 0.04 }],
  },

  /**
   * **Athaliah.** She destroyed all the seed royal, and *it goes for the loose
   * light before you can, and puts it out*. A crowned figure already stooped
   * over something on the ground, one arm fully extended, hand open.
   */
  atalya: {
    draw: [1.2, 1],
    masses: [
      { poly: [[0.24, 0.78], [0.28, 0.46], [0.4, 0.36], [0.56, 0.36], [0.62, 0.5], [0.56, 0.78]] },
      { poly: [[0.5, 0.38], [0.54, 0.22], [0.7, 0.2], [0.76, 0.3], [0.66, 0.4]], smooth: true },
      { poly: [[0.52, 0.2], [0.56, 0.1], [0.62, 0.16], [0.68, 0.08], [0.72, 0.18]] },
    ],
    limbs: [
      { poly: [[0.34, 0.76], [0.28, 0.9], [0.24, 1]], w: 0.08, move: { pivot: [0.36, 0.74], swing: 0.34, on: "stride" } },
      { poly: [[0.48, 0.76], [0.54, 0.9], [0.58, 1]], w: 0.08, move: { pivot: [0.46, 0.74], swing: 0.34, on: "stride", phase: 0.5 } },
      // The arm that is already out for the light does not swing with the walk.
      { poly: [[0.58, 0.48], [0.78, 0.58], [0.94, 0.66]], w: 0.06, move: { pivot: [0.56, 0.48], swing: 0.1, on: "tick", period: 8 } },
    ],
    features: [{ dot: [0.68, 0.28], r: 0.04 }],
    bob: 0.03,
  },

  /**
   * **The Nachash.** עָרוּם מִכֹּל חַיַּת הַשָּׂדֶה — subtler than any beast of
   * the field. A serpent, seen side on and drawn long: a coil on the ground,
   * the body rising out of it, the head raised and level, and the tongue out.
   * The draw box is nearly twice the hit box, because a snake that is as tall
   * as it is wide is not a snake.
   */
  nachash: {
    draw: [1.9, 0.95],
    masses: [
      { poly: [[0.02, 0.98], [0.06, 0.72], [0.26, 0.62], [0.44, 0.7], [0.4, 0.9], [0.2, 1]], smooth: true },
      { poly: [[0.72, 0.14], [0.86, 0.04], [0.98, 0.12], [0.96, 0.28], [0.8, 0.3]], smooth: true, move: { pivot: [0.26, 0.72], swing: 0.1, on: "tick", period: 14 } },
    ],
    // The raised part of it sways from the coil, which is what a snake held up
    // like this does; the coil on the ground is what it does *not* do.
    limbs: [{ poly: [[0.26, 0.72], [0.5, 0.62], [0.56, 0.36], [0.76, 0.2]], w: 0.09, move: { pivot: [0.26, 0.72], swing: 0.1, on: "tick", period: 14 } }],
    features: [
      { dot: [0.88, 0.14], r: 0.035 },
      { line: [[0.98, 0.2], [1, 0.14]] },
    ],
  },

  /**
   * **The Tannin.** *It stays in the water, where nothing can touch it, and
   * comes out of it at you.* The sea dragon of Bereshit 1 — long snout, ridged
   * back, and a tail that is still in the water when the head is not.
   */
  tannin: {
    draw: [2, 0.9],
    masses: [
      { poly: [[0.14, 0.72], [0.3, 0.5], [0.6, 0.46], [0.8, 0.54], [0.84, 0.72], [0.5, 0.82], [0.2, 0.8]], smooth: true },
      { poly: [[0.78, 0.5], [0.92, 0.48], [1, 0.56], [0.98, 0.66], [0.82, 0.68]], smooth: true },
    ],
    limbs: [
      // The tail, still in the water when the head is not.
      { poly: [[0.16, 0.7], [0.06, 0.58], [0.02, 0.4]], w: 0.06, move: { pivot: [0.2, 0.7], swing: 0.26, on: "tick", period: 10 } },
      { poly: [[0.34, 0.48], [0.38, 0.2]], w: 0.04 },
      { poly: [[0.48, 0.46], [0.52, 0.12]], w: 0.04 },
      { poly: [[0.62, 0.46], [0.66, 0.18]], w: 0.04 },
      { poly: [[0.34, 0.8], [0.3, 1]], w: 0.05, move: { pivot: [0.34, 0.78], swing: 0.32, on: "stride" } },
      { poly: [[0.62, 0.8], [0.66, 1]], w: 0.05, move: { pivot: [0.62, 0.78], swing: 0.32, on: "stride", phase: 0.5 } },
    ],
    features: [{ dot: [0.86, 0.54], r: 0.03 }],
  },

  /**
   * **The Re'em.** *It runs one line and will not turn.* The wild ox of Iyov,
   * which cannot be bound to a furrow — a heavy four-legged body carried low
   * and two horns swept forward, which are the whole read at any size.
   */
  reem: {
    draw: [1.4, 1],
    masses: [
      { poly: [[0.1, 0.68], [0.14, 0.38], [0.36, 0.3], [0.64, 0.3], [0.76, 0.4], [0.74, 0.68]] },
      { poly: [[0.7, 0.62], [0.7, 0.36], [0.88, 0.32], [0.98, 0.42], [0.94, 0.6], [0.78, 0.64]] },
    ],
    limbs: [
      { poly: [[0.2, 0.66], [0.18, 0.86], [0.16, 1]], w: 0.075, move: { pivot: [0.2, 0.64], swing: 0.36, on: "stride" } },
      { poly: [[0.34, 0.66], [0.34, 1]], w: 0.075, move: { pivot: [0.34, 0.64], swing: 0.36, on: "stride", phase: 0.5 } },
      { poly: [[0.6, 0.66], [0.62, 1]], w: 0.075, move: { pivot: [0.6, 0.64], swing: 0.36, on: "stride", phase: 0.5 } },
      { poly: [[0.72, 0.66], [0.76, 0.86], [0.78, 1]], w: 0.075, move: { pivot: [0.72, 0.64], swing: 0.36, on: "stride" } },
      { poly: [[0.78, 0.34], [0.86, 0.16], [1, 0.08]], w: 0.055 },
      { poly: [[0.86, 0.36], [0.96, 0.22], [1, 0.2]], w: 0.05 },
      { poly: [[0.12, 0.42], [0.02, 0.34], [0, 0.2]], w: 0.045, move: { pivot: [0.12, 0.42], swing: 0.24, on: "tick", period: 9 } },
    ],
    features: [{ dot: [0.88, 0.46], r: 0.035 }],
    bob: 0.03,
  },

  /**
   * **The Saraf.** הַנְּחָשִׁים הַשְּׂרָפִים — the burning serpents. A serpent
   * reared up to strike, mouth open, with the fire coming off its back: the
   * ground it has crossed goes on burning, so the flame is behind it and the
   * head is in front.
   */
  saraf: {
    draw: [1.5, 1.15],
    masses: [
      { poly: [[0.16, 0.98], [0.2, 0.78], [0.42, 0.72], [0.5, 0.86], [0.4, 0.98]], smooth: true },
      { poly: [[0.62, 0.2], [0.78, 0.12], [0.92, 0.2], [0.88, 0.34], [0.68, 0.34]], smooth: true, move: { pivot: [0.34, 0.8], swing: 0.14, on: "tick", period: 8 } },
    ],
    limbs: [
      // Reared and weaving from the coil, which is the posture it strikes from.
      { poly: [[0.34, 0.8], [0.46, 0.6], [0.5, 0.4], [0.66, 0.26]], w: 0.085, move: { pivot: [0.34, 0.8], swing: 0.14, on: "tick", period: 8 } },
      { poly: [[0.88, 0.28], [1, 0.24]], w: 0.035, move: { pivot: [0.34, 0.8], swing: 0.14, on: "tick", period: 8 } },
      // Three tongues of fire, each on its own beat, so the flame flickers
      // rather than waving as one flag.
      { poly: [[0.28, 0.72], [0.24, 0.56], [0.34, 0.5]], w: 0.045, move: { pivot: [0.28, 0.72], swing: 0.3, on: "tick", period: 5 } },
      { poly: [[0.42, 0.58], [0.36, 0.42], [0.46, 0.36]], w: 0.045, move: { pivot: [0.42, 0.58], swing: 0.3, on: "tick", period: 5, phase: 0.33 } },
      { poly: [[0.54, 0.42], [0.5, 0.26], [0.58, 0.2]], w: 0.045, move: { pivot: [0.54, 0.42], swing: 0.3, on: "tick", period: 5, phase: 0.66 } },
    ],
    features: [{ dot: [0.8, 0.22], r: 0.035 }],
  },

  /**
   * **Rahav.** The sea monster of pride, cut in pieces and still there — *every
   * shell you take off it makes it bigger and faster*. A bloated, many-humped
   * mass low in the water with too many heads coming off it, and no legs at
   * all: the only thing it does is grow.
   */
  rahav: {
    draw: [1.6, 1],
    masses: [
      { poly: [[0.06, 0.86], [0.12, 0.58], [0.34, 0.46], [0.6, 0.44], [0.84, 0.54], [0.94, 0.78], [0.8, 0.96], [0.24, 0.98]], smooth: true },
    ],
    limbs: [
      // Three heads, three clocks. Nothing about Rahav is in step with itself.
      { poly: [[0.26, 0.54], [0.2, 0.34], [0.28, 0.22]], w: 0.075, move: { pivot: [0.26, 0.54], swing: 0.2, on: "tick", period: 7 } },
      { poly: [[0.5, 0.46], [0.5, 0.24], [0.6, 0.12]], w: 0.075, move: { pivot: [0.5, 0.46], swing: 0.2, on: "tick", period: 11, phase: 0.4 } },
      { poly: [[0.74, 0.52], [0.82, 0.34], [0.94, 0.28]], w: 0.075, move: { pivot: [0.74, 0.52], swing: 0.2, on: "tick", period: 9, phase: 0.7 } },
    ],
    features: [
      { dot: [0.28, 0.22], r: 0.035 },
      { dot: [0.6, 0.13], r: 0.035 },
      { dot: [0.93, 0.28], r: 0.035 },
    ],
  },

  /**
   * **Og.** The last of the Rephaim, whose bedstead was nine cubits of iron —
   * *slow, and enormous, and its step brings the ceiling down where you stand*.
   * A giant that fills its whole box, with the head set down between the
   * shoulders because there is no room above it.
   */
  og: {
    draw: [1.3, 1.1],
    masses: [
      { poly: [[0.14, 0.86], [0.1, 0.4], [0.28, 0.26], [0.72, 0.26], [0.9, 0.4], [0.86, 0.86]] },
      { poly: [[0.42, 0.28], [0.42, 0.12], [0.62, 0.1], [0.68, 0.22], [0.6, 0.3]], smooth: true },
    ],
    limbs: [
      // A short swing on a very large thing, which is what slow looks like.
      { poly: [[0.32, 0.84], [0.28, 1]], w: 0.13, move: { pivot: [0.32, 0.82], swing: 0.2, on: "stride" } },
      { poly: [[0.68, 0.84], [0.72, 1]], w: 0.13, move: { pivot: [0.68, 0.82], swing: 0.2, on: "stride", phase: 0.5 } },
      { poly: [[0.16, 0.44], [0.04, 0.62], [0.08, 0.82]], w: 0.1, move: { pivot: [0.18, 0.44], swing: 0.16, on: "stride", phase: 0.5 } },
      { poly: [[0.84, 0.44], [0.96, 0.62], [0.92, 0.82]], w: 0.1, move: { pivot: [0.82, 0.44], swing: 0.16, on: "stride" } },
    ],
    features: [{ dot: [0.6, 0.2], r: 0.045 }],
    bob: 0.045,
  },

  /**
   * **The Nefilim.** הַנְּפִלִים — the fallen ones, and this one has not fallen
   * yet: *it hangs where it is and does nothing until you are underneath it*.
   * A figure hanging head-down from the ceiling by its own arms, and the drop
   * is the whole of what it does.
   */
  nefilim: {
    draw: [1, 1.2],
    masses: [
      { poly: [[0.34, 0.24], [0.34, 0.66], [0.44, 0.78], [0.58, 0.78], [0.66, 0.64], [0.66, 0.24]] },
      { poly: [[0.42, 0.76], [0.42, 0.9], [0.58, 0.92], [0.62, 0.82], [0.56, 0.74]], smooth: true, move: { pivot: [0.5, 0.6], swing: 0.16, on: "tick", period: 18 } },
    ],
    limbs: [
      // It hangs by both arms, and they are thrown wide — which is what puts
      // this across its box rather than down the middle of it.
      { poly: [[0.42, 0.26], [0.2, 0.1], [0.06, 0.02]], w: 0.08 },
      { poly: [[0.58, 0.26], [0.8, 0.1], [0.94, 0.02]], w: 0.08 },
      // The legs hang and swing from the hips, slowly, the way a hanging thing
      // does. Everything above the hips is holding on and does not move.
      { poly: [[0.44, 0.6], [0.24, 0.74], [0.16, 0.9]], w: 0.06, move: { pivot: [0.5, 0.6], swing: 0.16, on: "tick", period: 18 } },
      { poly: [[0.56, 0.6], [0.76, 0.74], [0.84, 0.9]], w: 0.06, move: { pivot: [0.5, 0.6], swing: 0.16, on: "tick", period: 18 } },
    ],
    features: [{ dot: [0.52, 0.86], r: 0.04 }],
  },

  /**
   * **The Arbeh.** *One of them is nothing. There are never one of them.* The
   * eighth plague — and a locust is entirely legible from one feature, which is
   * the hind leg folded up higher than its own back. Wings longer than the
   * body, laid flat over it.
   */
  arbeh: {
    draw: [1.5, 1],
    masses: [
      { poly: [[0.24, 0.66], [0.3, 0.44], [0.62, 0.38], [0.74, 0.5], [0.66, 0.7], [0.34, 0.74]], smooth: true },
      // The wings, and they are the fastest thing in the table: a locust's beat
      // is the noise of it as much as the look.
      { poly: [[0.16, 0.38], [0.5, 0.26], [0.82, 0.34], [0.7, 0.48], [0.3, 0.5]], smooth: true, move: { pivot: [0.6, 0.44], swing: 0.3, on: "tick", period: 3 } },
      { poly: [[0.72, 0.4], [0.86, 0.34], [0.94, 0.46], [0.86, 0.6], [0.74, 0.58]], smooth: true },
    ],
    limbs: [
      // The one feature a locust is legible from: the hind leg folded up above
      // the line of its own back, and then straight down to the ground.
      { poly: [[0.42, 0.64], [0.32, 0.1], [0.16, 0.94]], w: 0.05, move: { pivot: [0.44, 0.64], swing: 0.16, on: "tick", period: 6 } },
      { poly: [[0.58, 0.68], [0.6, 0.94]], w: 0.04, move: { pivot: [0.58, 0.66], swing: 0.2, on: "tick", period: 6, phase: 0.5 } },
      { poly: [[0.7, 0.64], [0.78, 0.92]], w: 0.04, move: { pivot: [0.7, 0.62], swing: 0.2, on: "tick", period: 6 } },
      { poly: [[0.9, 0.38], [1, 0.22]], w: 0.03 },
      { poly: [[0.9, 0.42], [1, 0.32]], w: 0.03 },
    ],
    features: [{ dot: [0.86, 0.44], r: 0.035 }],
  },

  /**
   * **Leviathan.** תִּמְשֹׁךְ לִוְיָתָן בְּחַכָּה — canst thou draw out
   * leviathan with an hook? A long serpentine back breaking the surface in
   * three humps, the head lifted at one end and a fluked tail at the other. The
   * widest draw box in the table: twice the hit box, and low.
   */
  livyatan: {
    draw: [2.2, 0.9],
    masses: [
      { poly: [[0.1, 0.62], [0.26, 0.3], [0.44, 0.56], [0.6, 0.26], [0.76, 0.5], [0.86, 0.32], [0.9, 0.7], [0.5, 0.92], [0.14, 0.84]], smooth: true },
      { poly: [[0.82, 0.24], [0.94, 0.12], [1, 0.3], [0.98, 0.56], [0.84, 0.56]], smooth: true },
    ],
    limbs: [
      // The fluke, both halves of it, sweeping on one slow beat.
      { poly: [[0.12, 0.66], [0.02, 0.42]], w: 0.06, move: { pivot: [0.16, 0.68], swing: 0.3, on: "tick", period: 13 } },
      { poly: [[0.12, 0.7], [0.04, 0.96]], w: 0.06, move: { pivot: [0.16, 0.68], swing: 0.3, on: "tick", period: 13 } },
      { poly: [[0.34, 0.86], [0.3, 1]], w: 0.05, move: { pivot: [0.34, 0.84], swing: 0.24, on: "tick", period: 13, phase: 0.5 } },
      { poly: [[0.66, 0.82], [0.7, 0.98]], w: 0.05, move: { pivot: [0.66, 0.8], swing: 0.24, on: "tick", period: 13, phase: 0.5 } },
    ],
    features: [{ dot: [0.92, 0.24], r: 0.035 }],
  },

  /**
   * **Behemoth.** יֶאֱכַל כַּבָּקָר — he eateth grass as an ox; his bones are
   * as bars of iron. *Nothing stops it while it is moving, and nothing marks it
   * either.* An enormous four-legged body, all mass and no neck, with legs like
   * pillars and a head that barely clears the ground.
   */
  behemot: {
    draw: [1.5, 1.05],
    masses: [
      { poly: [[0.08, 0.72], [0.1, 0.36], [0.3, 0.24], [0.68, 0.24], [0.84, 0.36], [0.82, 0.72]] },
      { poly: [[0.8, 0.66], [0.8, 0.44], [0.94, 0.42], [1, 0.52], [0.96, 0.66]] },
    ],
    limbs: [
      // Legs like bars of iron, and they hardly swing at all — a very large
      // thing walking is mostly the ground moving past it.
      { poly: [[0.2, 0.7], [0.18, 1]], w: 0.11, move: { pivot: [0.2, 0.68], swing: 0.16, on: "stride" } },
      { poly: [[0.4, 0.7], [0.4, 1]], w: 0.11, move: { pivot: [0.4, 0.68], swing: 0.16, on: "stride", phase: 0.5 } },
      { poly: [[0.6, 0.7], [0.6, 1]], w: 0.11, move: { pivot: [0.6, 0.68], swing: 0.16, on: "stride", phase: 0.5 } },
      { poly: [[0.76, 0.7], [0.78, 1]], w: 0.11, move: { pivot: [0.76, 0.68], swing: 0.16, on: "stride" } },
      { poly: [[0.08, 0.4], [0, 0.5], [0.02, 0.64]], w: 0.05, move: { pivot: [0.08, 0.42], swing: 0.2, on: "tick", period: 12 } },
    ],
    features: [{ dot: [0.92, 0.52], r: 0.035 }],
    bob: 0.02,
  },

  /**
   * **The Ziz.** The great bird whose head reaches the sky — *it never comes
   * down*. Wings spread across the whole box and a hooked beak, which are the
   * two things that say bird before anything else can.
   */
  ziz: {
    draw: [1.8, 1.1],
    masses: [
      { poly: [[0.4, 0.44], [0.5, 0.34], [0.6, 0.44], [0.58, 0.72], [0.42, 0.72]], smooth: true },
      // Both wings on the same slow beat — a bird this size does not flap, it
      // holds and adjusts, and each turns about its own shoulder.
      { poly: [[0.4, 0.42], [0.2, 0.16], [0.02, 0.26], [0.14, 0.46], [0.34, 0.54]], move: { pivot: [0.4, 0.44], swing: 0.22, on: "tick", period: 15 } },
      { poly: [[0.6, 0.42], [0.8, 0.16], [0.98, 0.26], [0.86, 0.46], [0.66, 0.54]], move: { pivot: [0.6, 0.44], swing: -0.22, on: "tick", period: 15 } },
      { poly: [[0.46, 0.34], [0.46, 0.2], [0.6, 0.18], [0.64, 0.28], [0.56, 0.36]], smooth: true },
    ],
    limbs: [
      { poly: [[0.64, 0.24], [0.74, 0.28], [0.68, 0.34]], w: 0.03 },
      { poly: [[0.46, 0.7], [0.44, 0.9], [0.38, 1]], w: 0.04, move: { pivot: [0.48, 0.7], swing: 0.14, on: "tick", period: 15 } },
      { poly: [[0.54, 0.7], [0.56, 0.9], [0.62, 1]], w: 0.04, move: { pivot: [0.52, 0.7], swing: -0.14, on: "tick", period: 15 } },
    ],
    features: [{ dot: [0.58, 0.25], r: 0.035 }],
  },
};

/**
 * **One klipah, painted.**
 *
 * Lifted out of `draw.ts` so that a creature's picture sits beside its parts.
 * Everything here is a function of *the creature and its own state*, and the
 * only thing it takes from the world is the tick. What a husk's picture needs
 * from the world besides that — whether Korach is still inside the ground —
 * stays in `draw.ts`, because that is a question about the room.
 *
 * The payoff is that a klipah can be drawn without a world at all, which is
 * what the `bestiary` contact sheet does: twenty creatures in their states, at
 * the size they are actually played, through the shipping painter rather than a
 * second copy of it that would drift. Every fault fixed here was found on that
 * sheet and none of them was visible from the code.
 *
 * A husk is drawn as what it is: **a hole in the light with something bright
 * shut inside it.** The light shows through the cracks, and shows through more
 * as the shells come off, so how close a husk is to breaking is legible without
 * a health bar.
 */
export function paintHusk(
  ctx: CanvasRenderingContext2D,
  husk: Husk,
  palette: Palette,
  tick: number,
): void {
  const spec = HUSKS[husk.kind];
  const creature = CREATURES[husk.kind];
  const cx = husk.x + husk.w / 2;
  const cy = husk.y + husk.h / 2;
  const opened = 1 - husk.shells / spec.shells;

  /**
   * **A hole in the light, on either ground** — and until the bestiary sheet
   * was built, only on one.
   *
   * The shell was filled with `bgDeep` and rimmed with a silver-grey. On
   * charcoal that is a dark body with a pale edge and it reads. On **vellum**
   * `bgDeep` is `#e4dcc6` and the rim mixes to about `#b2ab95` — a pale shape
   * with a paler edge, laid on stone at `#cbbb90`. Photographed at play zoom
   * the klipot on the light theme were very nearly not there, and the QA pass
   * that checked "both themes paint their own ground" was telling the truth
   * about the ground and had never looked at what stands on it.
   *
   * So the rule is stated rather than inherited: the body is the darkest thing
   * the palette has, whichever ground it is on, and the rim is the pale one. A
   * klipah is the same object in both themes because it is described by what it
   * *is* and not by which variable happened to be dark that day.
   */
  const ink = palette.light ? palette.text : palette.bgDeep;
  const rim = mix(palette.stoneEdge, palette.silver, 0.5);
  /** The trapped light, which has to burn against a near-black body. */
  const lit = palette.light ? palette.gold : palette.goldBright;

  /**
   * **The draw box.** Wider or taller than the thing you collide with, anchored
   * at the feet and centred across — so Leviathan can be twice as long as its
   * hit box without the fight moving by a pixel, and a tall creature grows
   * upward rather than sinking through the floor it is standing on.
   */
  const [sw, sh] = creature?.draw ?? [1, 1];
  const dw = husk.w * sw;
  const dh = husk.h * sh;
  const ox = husk.x + (husk.w - dw) / 2;
  const oy = husk.y + husk.h - dh;
  const px = (fx: number) => ox + (husk.facing < 0 ? 1 - fx : fx) * dw;
  const py = (fy: number) => oy + fy * dh;

  /**
   * **The movement**, and it is applied in pixels rather than in the box.
   *
   * The draw box is not square — Leviathan's is more than twice as wide as it
   * is tall — so a rotation done in normalised coordinates shears the part it
   * turns. Turning after the mapping costs one extra sine and gets a limb that
   * swings rather than one that stretches.
   */
  const step = gaitOf(husk);
  /** The body drops as the legs spread, which is where a gait gets its weight. */
  const drop = (creature?.bob ?? 0) * Math.abs(step) * dh;
  const turn = (move: Move | undefined) => {
    if (!move) return 0;
    const signal =
      move.on === "tick"
        ? Math.sin(tick / (move.period ?? 9) + (move.phase ?? 0) * Math.PI * 2)
        : gaitOf(husk, move.phase ?? 0);
    // Mirrored with the body, or a creature walking left swings its legs the
    // wrong way and reads as moonwalking.
    return move.swing * signal * (husk.facing < 0 ? -1 : 1);
  };
  /** One point of a part, mapped, turned about its joint, and dropped with the body. */
  const place = (fx: number, fy: number, move: Move | undefined, sink: number): Point => {
    const x = px(fx);
    const y = py(fy) + sink;
    const angle = turn(move);
    if (!move || angle === 0) return [x, y];
    const jx = px(move.pivot[0]);
    const jy = py(move.pivot[1]) + sink;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [jx + (x - jx) * cos - (y - jy) * sin, jy + (x - jx) * sin + (y - jy) * cos];
  };

  /**
   * **About to come at you.** `charging` was drawn exactly as not-charging: on
   * the magnified sheet the two columns were the same picture, pixel for pixel,
   * for every kind that commits to a charge. A creature winding up is the one
   * moment the player has something to do about it, and it was the one moment
   * the game did not say so.
   *
   * Drawn as a ring *outside* the body rather than anything inside it, because
   * a klipah is twenty-seven pixels across at play zoom and there is no room in
   * there for a second reading. A halo is the only channel that survives being
   * small, and it cannot be mistaken for a hit: `struck` is a hard gold rim on
   * the body itself and lasts six ticks.
   */
  if (husk.charging > 0) {
    const beat = 0.55 + 0.45 * Math.sin(tick / 3);
    ctx.strokeStyle = alpha(lit, 0.25 + 0.45 * beat);
    // In world units, so the ring is the same weight on every creature rather
    // than a hairline on the Behemot and a band on the Locust.
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const halo = 0.58 + 0.09 * beat;
    ctx.ellipse(cx, cy, dw * halo, dh * halo, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * What is trapped inside, brighter as the shell gives way — and brighter
   * again while it is winding up, which is the same light saying the same thing.
   *
   * **Small, and it did not used to be.** While a klipah was one convex blob a
   * wide soft disc behind it read as a glow. Laid behind an *anatomy* it reads
   * as a smear: on the contact sheet the Behemot and Leviathan had their legs
   * and humps washed out by a gold cloud the width of the whole creature. The
   * light is now a core rather than a wash, and what carries "close to
   * breaking" is the cracks and the thinning body, which are on top of the
   * picture rather than under it.
   */
  ctx.fillStyle = alpha(lit, 0.14 + opened * 0.3 + (husk.charging > 0 ? 0.22 : 0));
  ctx.beginPath();
  ctx.arc(cx, cy, husk.w * (0.24 + (husk.charging > 0 ? 0.07 : 0)), 0, Math.PI * 2);
  ctx.fill();

  const bodyRim = husk.struck > 0 ? lit : alpha(rim, 0.95);
  const bodyInk = alpha(ink, 0.9 - opened * 0.3);

  /**
   * **The limbs go down first**, so a body laid over them hides the joint and a
   * leg reads as coming out from under rather than being glued on. Each is
   * stroked twice — the pale rim wide, the ink narrower on top — which is the
   * same two-colour treatment the masses get and is what keeps a leg from
   * looking like a wire.
   */
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const limb of creature?.limbs ?? []) {
    const width = (limb.w ?? 0.07) * dw;
    // A leg hangs off the body, so it drops with it; a wing and a hanging arm
    // are attached to the world above rather than to the torso, and their own
    // pivots hold them where they are.
    const sink = limb.move?.on === "tick" ? 0 : drop;
    for (const [style, extra] of [
      [bodyRim, 4],
      [bodyInk, 0],
    ] as const) {
      ctx.strokeStyle = style;
      ctx.lineWidth = Math.max(1, width + extra);
      ctx.beginPath();
      limb.poly.forEach(([fx, fy], i) => {
        const [x, y] = place(fx, fy, limb.move, sink);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  // Then the masses — a torso, a head, a wing, a coil.
  ctx.strokeStyle = bodyRim;
  ctx.fillStyle = bodyInk;
  ctx.lineWidth = 2;
  for (const mass of creature?.masses ?? []) {
    trace(ctx, mass.poly, (fx, fy) => place(fx, fy, mass.move, drop), mass.smooth === true);
    ctx.fill();
    ctx.stroke();
  }
  if (!creature) {
    ctx.beginPath();
    ctx.roundRect(husk.x, husk.y, husk.w, husk.h, 4);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * **The eye**, in the trapped light — and almost always only the eye.
   *
   * The pass before this one gave every creature a bright *symbol*: a ring for
   * the Calf, a bolt for the Saraf, a waterline across the Tannin. It read as
   * twenty blobs wearing twenty badges, because that is what it was — a
   * pictogram about the creature laid over a shape that was not the creature.
   * With an anatomy to stand on, one lit point is enough, and one lit point is
   * also the thing that makes a shape read as *alive*.
   */
  ctx.strokeStyle = alpha(lit, 0.8);
  ctx.fillStyle = alpha(lit, 0.9);
  ctx.lineWidth = Math.max(0.8, dw * 0.03);
  for (const feature of creature?.features ?? []) {
    // The eye rides with the head, which rides with the body.
    if (feature.dot) {
      const [x, y] = place(feature.dot[0], feature.dot[1], undefined, drop);
      ctx.beginPath();
      ctx.arc(x, y, dw * (feature.r ?? 0.04), 0, Math.PI * 2);
      ctx.fill();
    }
    if (feature.line) {
      ctx.beginPath();
      feature.line.forEach(([fx, fy], i) => {
        const [x, y] = place(fx, fy, undefined, drop);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  /**
   * **A crack for every shell already taken off** — and a crack rather than a
   * scratch, which is what it was.
   *
   * Each was one straight hairline from the exact centre to the edge, all of
   * them meeting in a point, one pixel wide at a fixed brightness. On the sheet
   * a half-broken Cain and a whole one differ by a single stray line that reads
   * as a rendering artefact rather than damage. So: it starts off-centre, it
   * bends twice, and it widens as the creature comes apart.
   */
  ctx.strokeStyle = alpha(lit, 0.55 + opened * 0.4);
  ctx.lineWidth = 1 + opened * 1.4;
  for (let i = 0; i < spec.shells - husk.shells; i += 1) {
    // Seeded from the husk's own home, so a creature's cracks are its own and
    // do not crawl about between frames.
    const a = (i / Math.max(1, spec.shells)) * Math.PI * 2 + husk.home.x;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * husk.w * 0.1, cy + Math.sin(a) * husk.h * 0.1);
    for (let step = 1; step <= 3; step += 1) {
      const wobble = ((i * 7 + step * 3) % 5) / 5 - 0.5;
      const at = a + wobble * 0.7;
      const far = (step / 3) * 0.52;
      ctx.lineTo(cx + Math.cos(at) * husk.w * far, cy + Math.sin(at) * husk.h * far);
    }
    ctx.stroke();
  }
}

/**
 * One part's outline, in the creature's own draw box.
 *
 * The table is normalised — both coordinates run 0 to 1 — so this is the only
 * place that knows about pixels, and a creature's anatomy stays rows of numbers
 * a test can enumerate. Mirrored to whichever way it is facing, by the `px`
 * the caller hands in, because a thing that leans forward has to lean the way
 * it is going or it reads as retreating.
 *
 * The rounded ones are smoothed with quadratics through their own midpoints:
 * the same polygon, no second table, and the parts that are water or air or
 * flesh stop having corners.
 */
function trace(
  ctx: CanvasRenderingContext2D,
  shape: Silhouette,
  at0: (fx: number, fy: number) => Point,
  smooth: boolean,
): void {
  ctx.beginPath();
  const at = (i: number): [number, number] => {
    const [fx, fy] = shape[(i + shape.length) % shape.length];
    const [x, y] = at0(fx, fy);
    return [x, y];
  };
  if (!smooth) {
    const [sx, sy] = at(0);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < shape.length; i += 1) ctx.lineTo(...at(i));
    ctx.closePath();
    return;
  }
  const mid = (i: number): [number, number] => {
    const [ax, ay] = at(i);
    const [bx, by] = at(i + 1);
    return [(ax + bx) / 2, (ay + by) / 2];
  };
  ctx.moveTo(...mid(shape.length - 1));
  for (let i = 0; i < shape.length; i += 1) {
    const [qx, qy] = at(i);
    ctx.quadraticCurveTo(qx, qy, ...mid(i));
  }
  ctx.closePath();
}

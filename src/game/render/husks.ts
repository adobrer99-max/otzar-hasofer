import type { HuskKind } from "../combat";

/**
 * **A silhouette for every klipah, instead of four shapes for twenty names.**
 *
 * Twenty creatures ship with this game, each with its own behaviour, its own
 * source and its own authored line about what it *is* — and the renderer drew
 * them as four shapes chosen by `role`: a circle, a diamond, a slab, a
 * shouldered slab. So the Locust and Leviathan were the same circle, and the
 * only way to know which one had just killed you was to have been watching how
 * it moved. The bestiary was invisible as a bestiary.
 *
 * **Polygons in the husk's own box**, both coordinates running 0 to 1, which
 * is what makes this a table rather than twenty drawing functions. A table can
 * be enumerated, and `husks.test.ts` enumerates it: every kind has one, no two
 * are the same, every point is inside the box. Twenty hand-written canvas
 * routines could not be checked for any of that.
 *
 * Each shape is read off the creature's own line in `combat.ts`, and the test
 * that matters is whether you could tell them apart in silhouette at the size
 * they are actually drawn — which is small. So they are *coarse* on purpose:
 * a profile, a stance, one thing sticking out. Detail at this scale is mud.
 */
export type Point = readonly [number, number];
export type Silhouette = readonly Point[];

/**
 * Round creatures get their polygon smoothed rather than a separate code
 * path — the four things in the game that read as bodies of water or air are
 * exactly the ones a hard edge is wrong for.
 */
export const SMOOTH: ReadonlySet<HuskKind> = new Set<HuskKind>([
  "nachash",
  "tannin",
  "livyatan",
  "nefilim",
  "delilah",
]);

export const SILHOUETTES: Record<HuskKind, Silhouette> = {
  // "It walks its ground and turns at the edge. It has never once looked up."
  // A slab with a bowed head — the shoulder is higher than the skull.
  cain: [
    [0.12, 1], [0.12, 0.42], [0.34, 0.3], [0.38, 0.12], [0.6, 0.14],
    [0.62, 0.34], [0.88, 0.44], [0.88, 1],
  ],
  // "Alone it hangs back. It is braver for every other one of them still
  // standing." Three shoulders of one body: it is drawn as a crowd.
  brothers: [
    [0.04, 1], [0.06, 0.5], [0.22, 0.36], [0.36, 0.5], [0.42, 0.24],
    [0.6, 0.24], [0.66, 0.5], [0.8, 0.36], [0.96, 0.5], [0.96, 1],
  ],
  // "It does nothing whatever until you strike it. Then it never stops."
  // Squat, horned, planted: a thing standing still that will not stay so.
  calf: [
    [0.1, 1], [0.1, 0.46], [0.02, 0.24], [0.26, 0.36], [0.36, 0.18],
    [0.64, 0.18], [0.74, 0.36], [0.98, 0.24], [0.9, 0.46], [0.9, 1],
  ],
  // "It runs you down over open ground, and gives up the moment you are above
  // it." All of it leans forward, and there is nothing on top.
  esav: [
    [0.06, 1], [0.16, 0.42], [0.5, 0.22], [0.92, 0.3], [1, 0.6], [0.78, 1],
  ],
  // "It comes at your back, and stands still as stone while you face it."
  // The spines are behind it, which is the side you are meant to see.
  amalek: [
    [0.08, 1], [0.04, 0.5], [0.2, 0.56], [0.16, 0.28], [0.34, 0.46],
    [0.4, 0.18], [0.56, 0.44], [0.74, 0.34], [0.9, 0.52], [0.92, 1],
  ],
  // "It travels inside the ground, and comes up under you." A spearhead,
  // pointing the way it arrives.
  korach: [
    [0.5, 0.02], [0.86, 0.5], [0.72, 0.56], [0.8, 1], [0.2, 1], [0.28, 0.56], [0.14, 0.5],
  ],
  // "Rooted where she stands. What she sends is slow, and it lingers." Narrow
  // and upright on a wide base — a figure that is not going anywhere.
  izevel: [
    [0.02, 1], [0.3, 0.72], [0.34, 0.2], [0.44, 0.06], [0.56, 0.06],
    [0.66, 0.2], [0.7, 0.72], [0.98, 1],
  ],
  // "It costs you no lamp at all. It costs you what you had gathered."
  // An open bowl: the shape of something that takes and holds.
  delilah: [
    [0.06, 0.3], [0.24, 0.16], [0.5, 0.12], [0.76, 0.16], [0.94, 0.3],
    [0.82, 0.86], [0.5, 1], [0.18, 0.86],
  ],
  // "It goes for the loose light before you can, and puts it out." Hunched,
  // with one long arm already reaching.
  atalya: [
    [0.1, 1], [0.14, 0.5], [0.3, 0.34], [0.52, 0.32], [0.66, 0.16],
    [0.98, 0.24], [0.86, 0.42], [0.7, 0.5], [0.84, 1],
  ],
  // "Slow, and it does not stop, and stone is nothing to it." A coil, seen
  // side on, with the head raised out of it.
  nachash: [
    [0.04, 0.92], [0.02, 0.6], [0.24, 0.44], [0.5, 0.5], [0.6, 0.3],
    [0.84, 0.22], [0.98, 0.36], [0.86, 0.5], [0.7, 0.62], [0.62, 0.88], [0.3, 1],
  ],
  // "It stays in the water, where nothing can touch it, and comes out of it at
  // you." Long and low, with a fin over the waterline.
  // Smoothing rounds a corner off almost entirely, so the fin is drawn far
  // taller than it should look — the first pass gave it a polite bump and it
  // came out a smooth mound, indistinguishable from Leviathan two rows down.
  tannin: [
    [0.02, 0.72], [0.16, 0.56], [0.36, 0.54], [0.46, 0.02], [0.56, 0.54],
    [0.88, 0.58], [1, 0.76], [0.84, 0.96], [0.4, 1], [0.1, 0.92],
  ],
  // "It runs one line and will not turn." Two horns, and a body all in front
  // of its own legs.
  reem: [
    [0.04, 1], [0.1, 0.5], [0.3, 0.36], [0.34, 0.12], [0.46, 0.34],
    [0.7, 0.3], [0.78, 0.08], [0.86, 0.34], [0.98, 0.52], [0.9, 1],
  ],
  // "The ground it has crossed goes on burning after it." A flame: everything
  // about it points up and none of its edges are even.
  saraf: [
    [0.2, 1], [0.24, 0.6], [0.1, 0.42], [0.34, 0.44], [0.4, 0.06],
    [0.56, 0.4], [0.74, 0.18], [0.74, 0.46], [0.92, 0.54], [0.78, 1],
  ],
  // "Every shell you take off it makes it bigger and faster." Swollen, and
  // ragged where it has already been opened.
  rahav: [
    [0.08, 0.72], [0.16, 0.36], [0.36, 0.4], [0.44, 0.08], [0.6, 0.36],
    [0.84, 0.28], [0.9, 0.6], [0.98, 0.82], [0.62, 0.96], [0.24, 0.94],
  ],
  // "Slow, and enormous, and its step brings the ceiling down where you
  // stand." Shoulders wider than the room wants.
  og: [
    [0.02, 1], [0.06, 0.42], [0.24, 0.26], [0.36, 0.06], [0.64, 0.06],
    [0.76, 0.26], [0.94, 0.42], [0.98, 1],
  ],
  // "It hangs where it is and does nothing until you are underneath it."
  // A drop, hanging: wide at the top and pointed at what is below.
  nefilim: [
    [0.16, 0.04], [0.84, 0.04], [0.92, 0.4], [0.66, 0.74], [0.5, 1],
    [0.34, 0.74], [0.08, 0.4],
  ],
  // "One of them is nothing. There are never one of them." Wings longer than
  // the body, which is the whole of what a locust looks like.
  arbeh: [
    [0.02, 0.34], [0.36, 0.44], [0.44, 0.2], [0.56, 0.44], [0.98, 0.32],
    [0.72, 0.6], [0.6, 0.96], [0.4, 0.96], [0.28, 0.6],
  ],
  // "Nothing touches it in the water." The great sea creature: a back that
  // breaks the surface and the rest of it implied.
  // Long and low against Tannin's fin, with the head lifted at one end and the
  // tail flat at the other: the difference between the two sea creatures has
  // to survive being smoothed, or Chesed's guardian and Binah's are one blob.
  livyatan: [
    [0.02, 0.86], [0.06, 0.62], [0.3, 0.56], [0.56, 0.5], [0.78, 0.3],
    [0.96, 0.1], [1, 0.44], [0.86, 0.7], [0.5, 0.86], [0.16, 0.98],
  ],
  // "Nothing stops it while it is moving, and nothing marks it either."
  // A squared mass with no purchase anywhere on it.
  behemot: [
    [0.04, 1], [0.04, 0.36], [0.2, 0.2], [0.5, 0.14], [0.8, 0.2],
    [0.96, 0.36], [0.96, 1],
  ],
  // "It never comes down." Wings out to both edges and a body that is barely
  // there between them.
  ziz: [
    [0.02, 0.28], [0.3, 0.42], [0.42, 0.14], [0.5, 0.4], [0.58, 0.14],
    [0.7, 0.42], [0.98, 0.28], [0.78, 0.66], [0.5, 0.86], [0.22, 0.66],
  ],
};

import type { SefirahId } from "../../types/letter";
import { TREE_NODES } from "../tree";
import type { Scene, Shape } from "./scene";

/**
 * **The scenes themselves** — the authored table, kept apart from the painter
 * for the reason `chunks.ts` is kept apart from `build.ts`: one of them is a
 * system with rules and the other is level design expressed as numbers, and a
 * file that is both ends up being read as neither.
 *
 * **The panel is wide** — about two and a half to one — and that is the whole of
 * what makes the coordinates below look strange at first. `x` and `y` are each
 * 0..1 across their own axis, so a shape spanning the same fraction of both is
 * drawn two and a half times wider than it is tall. A standing figure a third of
 * the panel high is therefore about four hundredths of it wide. Authoring in a
 * square box and letterboxing was the alternative and it was worse: it throws
 * away half a phone's width, which is the width this game is played at.
 *
 * **What each scene is for.** The prologue's six paragraphs are the game's only
 * account of why anyone is climbing, and they are its densest text — five long
 * paragraphs and a charge. What a picture does here is not decorate the words
 * but *hold the place* while they are read: the desk, the fall, the silence, the
 * husks, the lamps, the Tree. Six nouns, one per page, so that a reader who
 * takes nothing else away has seen the six things the game is about.
 */

// ---------------------------------------------------------------------------
// pieces used more than once
// ---------------------------------------------------------------------------

/**
 * **A body, as the game's own Scribe is drawn** — a robed wedge outlined in
 * gold, with a pale head. Returned as the two shapes it takes.
 *
 * Not imported from `drawScribe`, which paints into world pixels against a lamp
 * and a facing; but the *colours* are its, and that is the part that mattered.
 * The first sheet was six panels with nobody in them: every figure was filled
 * `ink`, which on charcoal is the deepest background — the darkest value in the
 * frame laid against the darkest ground. A Scribe in this game is a **lit
 * figure**, not a silhouette, and it took a photograph to notice.
 */
const figure = (x: number, feet: number, tall: number): Shape[] => [
  {
    poly: [
      [x, feet - tall],
      [x + tall * 0.06, feet],
      [x - tall * 0.06, feet],
    ],
    fill: "robe",
    stroke: "gold",
    w: 0.0025,
  },
  // Rimmed, exactly as `drawScribe` rims it — and this is the second thing the
  // first sheet caught. A head filled `stone` and nothing else is visible on
  // vellum, where stone is tan against a pale sky, and gone on charcoal, where
  // stone is within a few values of the sky it is drawn on. Six figures were
  // walking about headless on one theme and not the other.
  {
    dot: [x, feet - tall - tall * 0.075],
    r: tall * 0.075,
    fill: "stone",
    stroke: "bright",
    w: 0.003,
  },
];

/**
 * The ground, as a slab with a lit edge on it. The edge is not decoration: a
 * horizon with no line disappears into the sky wash, which is what the first
 * sheet showed on all four scenes that have one.
 */
const ground = (top: number): Shape[] => [
  {
    poly: [
      [-0.05, top],
      [1.05, top],
      [1.05, 1.05],
      [-0.05, 1.05],
    ],
    fill: "stone",
  },
  {
    line: [
      [-0.05, top],
      [1.05, top],
    ],
    stroke: "edge",
    w: 0.004,
  },
];

// ---------------------------------------------------------------------------
// the prologue, one scene a page
// ---------------------------------------------------------------------------

/**
 * **"You were the scribe of the crown."**
 *
 * The office, and nothing about the fall yet: a desk under a light that comes
 * from above and off the top of the frame, a bowed figure at it, a page. The
 * crown is never drawn in this game and is not drawn here either — what stands
 * for it is that the light has no source you can see.
 */
const DESK: Scene = {
  id: "desk",
  label:
    "A bowed scribe at a desk beneath shafts of light with no source, a lit page under his hand.",
  still: 1.4,
  shapes: [
    // The light off the top of the frame — three shafts, breathing out of step.
    ...[0.34, 0.5, 0.66].map(
      (x, i): Shape => ({
        line: [
          [x, -0.05],
          [x + (x - 0.5) * 0.5, 0.62],
        ],
        stroke: "gold",
        w: 0.02,
        // Faint, but not so faint it is only on one theme: at fourteen
        // hundredths the shafts read on charcoal and were not there at all on
        // vellum, where gold is a mid tan against a near-white sky.
        alpha: 0.24,
        move: { fade: [0.5, 1], period: 5, phase: i * 0.3 },
      }),
    ),
    /**
     * The horizon is high and the furniture is large, and the first draft had
     * both wrong. Photographed in its own plate the scene was two thirds empty
     * sky over a desk the size of a paperclip, with the scribe standing a
     * hand's width away from it — a composition, technically, and not a
     * picture of anybody at work.
     */
    ...ground(0.74),
    // The desk: a slab and one leg, which is as much furniture as reads.
    {
      poly: [
        [0.36, 0.5],
        [0.68, 0.5],
        [0.68, 0.56],
        [0.36, 0.56],
      ],
      fill: "edge",
    },
    {
      poly: [
        [0.55, 0.56],
        [0.6, 0.56],
        [0.6, 0.74],
        [0.55, 0.74],
      ],
      fill: "edge",
    },
    // The page on it, and the writing — a page is only a page once it has lines.
    {
      poly: [
        [0.45, 0.44],
        [0.62, 0.44],
        [0.62, 0.5],
        [0.45, 0.5],
      ],
      fill: "bright",
      alpha: 0.55,
    },
    ...[0.455, 0.47, 0.485].map(
      (y): Shape => ({
        line: [
          [0.47, y],
          [0.6, y],
        ],
        stroke: "deep",
        w: 0.0035,
        alpha: 0.55,
      }),
    ),
    // The scribe **at** the desk, close enough that the slab crosses him — the
    // one thing that makes a figure and a table into a scribe at work.
    ...figure(0.42, 0.74, 0.3),
    // And the lamp, which is the only thing in the picture that moves.
    { dot: [0.655, 0.46], r: 0.013, fill: "bright", glow: 5, move: { fade: [0.7, 1], period: 2.6 } },
  ],
};

/**
 * **"You do not remember the fall."**
 *
 * The one scene that is a *thing that happened* rather than a place, and the
 * only one authored with `once`: the body runs its cycle under `ease: "fall"`
 * and stays where it lands, so a reader who arrives late sees the aftermath
 * rather than a body bouncing. The letters go on streaming up past it forever,
 * which is exactly what the line says they did — *scattered up the way you
 * came*.
 */
const FALL: Scene = {
  id: "fall",
  label:
    "A body turning as it falls, and twenty-two small lights streaming up past it the way it came.",
  still: 3.6,
  shapes: [
    ...ground(0.94),
    // Twenty-two, because that is how many there are. Spread across the frame
    // and around the cycle so they are a scattering rather than a curtain.
    ...Array.from({ length: 22 }, (_, i): Shape => {
      const x = 0.05 + ((i * 7) % 22) / 23;
      const len = 0.05 + (i % 3) * 0.02;
      return {
        // **Streaks rather than dots**, which is the whole difference between a
        // stream and a starfield. Twenty-two points at twenty-two phases
        // photographed as night sky; a rising thing has to be longer than it is
        // wide, and then it needs no explaining.
        line: [
          [x, 1.06],
          [x, 1.06 - len],
        ],
        stroke: "bright",
        w: 0.004,
        alpha: 0.9,
        move: {
          to: [(x - 0.5) * 0.16, -1.3],
          fade: [1, 0],
          period: 6,
          phase: (i * 0.137) % 1,
          ease: "rise",
        },
      };
    }),
    // The body, head down, turning as it goes.
    {
      poly: [
        [0.5, 0.05],
        [0.518, 0.18],
        [0.482, 0.18],
      ],
      fill: "robe",
      stroke: "gold",
      w: 0.003,
      move: {
        to: [0.05, 0.68],
        turn: 2.6,
        pivot: [0.5, 0.115],
        period: 4,
        once: true,
        ease: "fall",
      },
    },
  ],
};

/**
 * **"No charge was read to you."**
 *
 * The hardest of the six, because what it has to show is an *absence*. A held
 * page, closed, high in the frame; the Scribe below with a hand up; and between
 * them nothing at all. The one thing that moves is a thin line under the page
 * that brightens and goes out without ever reaching him — the charge being not
 * read, on a loop.
 */
const SILENCE: Scene = {
  id: "silence",
  label:
    "A closed scroll high above; a small figure below with one arm raised; nothing between them.",
  still: 1.2,
  shapes: [
    ...ground(0.84),
    // The closed page, rolled at both ends.
    {
      poly: [
        [0.36, 0.16],
        [0.64, 0.16],
        [0.64, 0.26],
        [0.36, 0.26],
      ],
      fill: "edge",
      stroke: "gold",
      w: 0.003,
    },
    ...[0.36, 0.64].map((x): Shape => ({ dot: [x, 0.21], r: 0.012, fill: "stone" })),
    // What is written on it, and never read out: a line that lights and dies.
    {
      line: [
        [0.4, 0.3],
        [0.6, 0.3],
      ],
      stroke: "bright",
      w: 0.004,
      move: { fade: [0, 0.9], period: 4.5 },
    },
    // The Scribe, small, one arm raised — the asking the whole climb is.
    ...figure(0.5, 0.84, 0.2),
    {
      line: [
        [0.505, 0.73],
        [0.55, 0.6],
      ],
      stroke: "gold",
      w: 0.005,
      move: { turn: 0.16, pivot: [0.505, 0.73], period: 6 },
    },
  ],
};

/**
 * **"The way up is not empty."**
 *
 * The klipot as the game draws them — a dark body with light shut inside — on a
 * road that climbs out of frame. Three, not a crowd: the line is about what is
 * *on* the way rather than about how much of it there is, and three shapes at
 * panel size is already the most that reads.
 */
const KLIPOT: Scene = {
  id: "klipot",
  label:
    "A road climbing out of the frame with three dark husks standing on it, a point of light shut inside each.",
  still: 1.0,
  shapes: [
    // The road, climbing away to the right.
    {
      poly: [
        [-0.05, 1.05],
        [-0.05, 0.9],
        [1.05, 0.34],
        [1.05, 1.05],
      ],
      fill: "stone",
    },
    ...[
      [0.24, 0.79],
      [0.52, 0.65],
      [0.79, 0.5],
    ].map(
      ([x, y], i): Shape => ({
        poly: [
          [x - 0.026, y],
          [x, y - 0.13],
          [x + 0.026, y],
          [x + 0.014, y + 0.03],
          [x - 0.014, y + 0.03],
        ],
        fill: "ink",
        // Rimmed, and that is not decoration: `paintHusk` rims every shell for
        // exactly this reason, and without it a body filled with the darkest
        // value the palette has vanishes into the ground that value came from.
        stroke: "edge",
        w: 0.0035,
        move: { turn: 0.09, pivot: [x, y + 0.03], period: 3.2, phase: i * 0.3 },
      }),
    ),
    // The light shut inside each one, which is where every mote on these rungs
    // has come from since the fight was written.
    ...[
      [0.24, 0.74],
      [0.52, 0.6],
      [0.79, 0.45],
    ].map(
      ([x, y], i): Shape => ({
        dot: [x, y],
        r: 0.007,
        fill: "bright",
        glow: 3,
        move: { fade: [0.45, 1], period: 2.4, phase: i * 0.33 },
      }),
    ),
  ],
};

/**
 * **"You get up again."**
 *
 * The economy of the whole game in one picture, and the only scene that has to
 * carry a *rule*: three lamps in the hand with the last one guttering, and below
 * them a Sefirah already kindled, burning steadily and going nowhere. Light in
 * the hand goes out with you; light poured into the Tree stays lit. The picture
 * says it by putting the unsteady thing above and the steady thing below.
 */
const LAMPS: Scene = {
  id: "lamps",
  label:
    "A figure rising with three lamps over him, the last of them guttering, and a Sefirah burning steadily in the ground.",
  still: 0.6,
  shapes: [
    ...ground(0.88),
    // The Sefirah, kindled, in the ground itself.
    { dot: [0.3, 0.88], r: 0.03, fill: "gold", glow: 4, alpha: 0.9 },
    { dot: [0.3, 0.88], r: 0.012, fill: "bright" },
    // The Scribe getting up — the one movement that goes upward in the six.
    ...figure(0.7, 0.9, 0.22).map(
      (shape): Shape => ({ ...shape, move: { to: [0, -0.04], period: 5 } }),
    ),
    // Three lamps over him. The third gutters, which is what the line is about.
    ...[0, 1, 2].map(
      (i): Shape => ({
        dot: [0.655 + i * 0.045, 0.5],
        r: 0.011,
        fill: "bright",
        glow: 4,
        move:
          i === 2 ?
            { fade: [0.08, 1], period: 2.2 }
          : { fade: [0.75, 1], period: 3, phase: i * 0.4 },
      }),
    ),
  ],
};

/**
 * **The charge** — and the only scene that draws the map.
 *
 * The ten, in their real places: `NODES` is the same table `tree.ts` lays the
 * overworld out of, read here rather than re-typed, so a Tree that is ever
 * rearranged rearranges this too. The light climbs it — each node's fade offset
 * a little further round the cycle than the one below, which is a travelling
 * light made out of the one primitive the system has.
 */
const rowsUp = Math.max(...TREE_NODES.map((n) => n.row));
/**
 * The pillars stand wider than the printed diagram's, because the panel is two
 * and a half to one and a Tree at its true proportion is a thin ribbon up the
 * middle of a very wide frame. What has to read here is *three pillars and a
 * way up*; `TreeMap` is the diagram.
 */
const place = (row: number, pillar: number) =>
  [0.5 + pillar * 0.09, 0.88 - (row / rowsUp) * 0.74] as const;

const CHARGE: Scene = {
  id: "charge",
  label:
    "The ten Sefirot in their places on the three pillars, lighting one after another from the kingdom upward.",
  still: 2.0,
  shapes: [
    // The pillars, drawn as three faint verticals rather than as the paths —
    // twenty-two ribbons at this size is a smudge, and the map is `TreeMap`'s
    // job. What this has to say is *up*.
    // Each pillar drawn only as far as it is stood on — a line the height of
    // the frame is a stripe, not a pillar.
    ...[
      [-1, 2, 5],
      [0, 0, rowsUp],
      [1, 2, 5],
    ].map(
      ([pillar, low, high]): Shape => ({
        line: [place(low, pillar), place(high, pillar)],
        stroke: "dim",
        w: 0.005,
        alpha: 0.6,
      }),
    ),
    ...TREE_NODES.map(
      (node): Shape => ({
        dot: place(node.row, node.pillar),
        r: node.row === rowsUp ? 0.019 : 0.014,
        fill: "gold",
        glow: 3.5,
        // The light climbing: each node a little further round the same cycle
        // than the one below it, which is a travelling highlight made out of
        // the one primitive the system has.
        move: { fade: [0.35, 1], period: 4.5, phase: 1 - node.row / (rowsUp + 1) },
      }),
    ),
  ],
};

/**
 * **One scene per prologue page, in the order they are turned.**
 *
 * A list rather than a map keyed by page number, so that the *shape* of the
 * telling is a fact this module states and `scene.test.ts` can hold against
 * `PROLOGUE_PAGES` — exactly the argument `story.ts` makes for exporting
 * `PROLOGUE_PAGES` as its own array rather than mapping at the call site. A
 * seventh paragraph with no picture would be a silent gap, and this is what
 * makes it a failing test instead.
 */
export const PROLOGUE_SCENES: readonly Scene[] = [DESK, FALL, SILENCE, KLIPOT, LAMPS, CHARGE];

// ---------------------------------------------------------------------------
// the ten places, seen from outside
// ---------------------------------------------------------------------------

/**
 * **What a place's scene is for**, which is the question P11 asked itself and
 * had to answer before any of these could be authored: *what do ten pictures
 * say that P4's palettes and P4d's arenas do not already say?*
 *
 * The answer is **form, and the outside**. `PLACES` already leans each
 * Sefirah's stone and sky, and every guardian has its room — but both of those
 * are met from *inside*, at the twenty-seven screen pixels a body running past
 * is framed at. Nothing in this game has ever shown a place from outside itself.
 *
 * So the colour here is deliberately **not** authored: `SceneCanvas` is handed
 * the Sefirah and tints the whole panel through `paletteOf`, exactly as the
 * world is tinted. What each scene contributes is a *shape* — the narrow
 * channel, the ceiling coming down, the open tent, the long slope — read off
 * that place's own `middah` and `teaching`, with its guardian in it where the
 * creature is the point rather than an ornament.
 *
 * Kept coarse on purpose. A panel is three hundred pixels across in a plate and
 * the picture has to say one thing before the paragraph under it says four.
 */

/** A slab of ceiling, which several of the ten need and none of the six did. */
const ceiling = (bottom: number): Shape[] => [
  {
    poly: [
      [-0.05, -0.05],
      [1.05, -0.05],
      [1.05, bottom],
      [-0.05, bottom],
    ],
    // `ink` rather than `stone`, for Yesod's reason: a mass the same value as
    // the air behind it is not a mass, and a ceiling that does not read as one
    // is just a stripe that grows. `deep` was tried and is the wrong role — it
    // is pale on vellum, so it inverted between themes.
    fill: "ink",
    alpha: 0.82,
  },
  {
    line: [
      [-0.05, bottom],
      [1.05, bottom],
    ],
    stroke: "edge",
    w: 0.004,
  },
];

const PLACE_SCENE_LIST: readonly (Scene & { sefirah: SefirahId })[] = [
  {
    sefirah: "malchut",
    id: "place-malchut",
    label:
      "A flat horizon under an open sky, one small figure standing on it, and the whole Tree faint and very far above.",
    still: 1.2,
    shapes: [
      ...ground(0.8),
      // The Tree, far off and faint — everything that is going to be climbed,
      // seen once from the only place it can all be seen from.
      {
        line: [
          [0.62, 0.66],
          [0.62, 0.14],
        ],
        stroke: "gold",
        w: 0.004,
        alpha: 0.3,
      },
      ...TREE_NODES.map(
        (node): Shape => ({
          dot: [0.62 + node.pillar * 0.055, 0.66 - (node.row / rowsUp) * 0.5],
          r: 0.008,
          fill: "gold",
          glow: 3,
          alpha: 0.65,
        }),
      ),
      // The swarm that stands here, low and near the ground.
      ...Array.from({ length: 9 }, (_, i): Shape => ({
        dot: [0.12 + ((i * 5) % 9) / 11, 0.7 + (i % 3) * 0.03],
        r: 0.004,
        fill: "ink",
        alpha: 0.7,
        move: { to: [0.03, -0.02], period: 2.6, phase: (i * 0.11) % 1 },
      })),
      ...figure(0.32, 0.8, 0.2),
    ],
  },
  {
    sefirah: "yesod",
    id: "place-yesod",
    label: "Two great walls almost meeting, with a narrow channel of light between them and a figure at its mouth.",
    still: 1.0,
    shapes: [
      ...ground(0.86),
      // The two walls, and the whole picture is the gap.
      /**
       * **Filled `ink` rather than `stone`**, which is the third time this pass
       * has had to learn the same lesson from a photograph — and the fourth
       * time counting the correction to the correction.
       *
       * On Yesod's violet the stone mix and the sky mix land within a few
       * values of each other, so the first sheet was a flat panel with a cone
       * of light in it and no walls at all — and the picture is *entirely* the
       * walls. The obvious repair was `deep`, which is dark on charcoal and
       * **pale cream on vellum**, so it made the walls darker than the sky on
       * one theme and lighter on the other: not the same picture in a different
       * key, two different pictures. `ink` is the role that means *the darkest
       * value this palette has, whichever ground it is*, and it is the only one
       * that can be asked for a mass.
       */
      {
        poly: [
          [-0.05, -0.05],
          [0.44, -0.05],
          [0.47, 0.86],
          [-0.05, 0.86],
        ],
        fill: "ink",
        alpha: 0.82,
        stroke: "edge",
        w: 0.005,
      },
      {
        poly: [
          [0.56, -0.05],
          [1.05, -0.05],
          [1.05, 0.86],
          [0.53, 0.86],
        ],
        fill: "ink",
        alpha: 0.82,
        stroke: "edge",
        w: 0.005,
      },
      // The light coming through it — the narrow channel everything above must
      // pass through to reach the world.
      {
        poly: [
          [0.47, 0.86],
          [0.53, 0.86],
          [0.56, -0.05],
          [0.44, -0.05],
        ],
        fill: "bright",
        alpha: 0.2,
        move: { fade: [0.55, 1], period: 4 },
      },
      ...figure(0.5, 0.86, 0.17),
    ],
  },
  {
    sefirah: "hod",
    id: "place-hod",
    label: "A chasm with fire along its floor, crossed in one long arc of light from one lip to the other.",
    still: 1.4,
    shapes: [
      // Two lips and the gulf between them.
      {
        poly: [
          [-0.05, 0.72],
          [0.3, 0.72],
          [0.3, 1.05],
          [-0.05, 1.05],
        ],
        fill: "stone",
        stroke: "edge",
        w: 0.004,
      },
      {
        poly: [
          [0.7, 0.72],
          [1.05, 0.72],
          [1.05, 1.05],
          [0.7, 1.05],
        ],
        fill: "stone",
        stroke: "edge",
        w: 0.004,
      },
      // The fiery serpents along the floor of it.
      ...Array.from({ length: 5 }, (_, i): Shape => ({
        dot: [0.36 + i * 0.07, 0.99],
        r: 0.012,
        fill: "bright",
        glow: 4,
        alpha: 0.8,
        move: { fade: [0.3, 1], period: 2.1, phase: i * 0.2 },
      })),
      // What cannot be walked, crossed in one motion.
      {
        line: [
          [0.28, 0.72],
          [0.42, 0.46],
          [0.58, 0.46],
          [0.72, 0.72],
        ],
        stroke: "bright",
        w: 0.006,
        smooth: true,
        alpha: 0.85,
        move: { fade: [0.35, 1], period: 3.4 },
      },
      ...figure(0.22, 0.72, 0.19),
    ],
  },
  {
    sefirah: "netzach",
    id: "place-netzach",
    label: "A long slope receding into haze with a small figure low on it, and one point of light at the top.",
    still: 1.0,
    shapes: [
      // The long way up, and nothing else in the frame: endurance is not a
      // shape, it is a distance.
      {
        poly: [
          [-0.05, 1.05],
          [-0.05, 0.92],
          [1.05, 0.28],
          [1.05, 1.05],
        ],
        fill: "stone",
      },
      {
        line: [
          [-0.05, 0.92],
          [1.05, 0.28],
        ],
        stroke: "edge",
        w: 0.004,
      },
      { dot: [0.96, 0.24], r: 0.012, fill: "bright", glow: 5, move: { fade: [0.6, 1], period: 4.5 } },
      // The one that will not turn, standing across the way partway up.
      {
        poly: [
          [0.6, 0.6],
          [0.63, 0.52],
          [0.66, 0.6],
          [0.64, 0.63],
          [0.62, 0.63],
        ],
        fill: "ink",
        stroke: "edge",
        w: 0.0035,
      },
      ...figure(0.16, 0.9, 0.17),
    ],
  },
  {
    sefirah: "tiferet",
    id: "place-tiferet",
    label: "Two pillars, one on each side, joined across the gap by a single lit span with a figure on it.",
    still: 1.2,
    shapes: [
      ...ground(0.95),
      ...[0.22, 0.78].map(
        (x): Shape => ({
          poly: [
            [x - 0.035, 0.34],
            [x + 0.035, 0.34],
            [x + 0.035, 0.95],
            [x - 0.035, 0.95],
          ],
          fill: "stone",
          stroke: "edge",
          w: 0.003,
        }),
      ),
      // The hook: the one that joins, and holds. The whole scene is the span.
      {
        line: [
          [0.22, 0.34],
          [0.5, 0.28],
          [0.78, 0.34],
        ],
        stroke: "bright",
        w: 0.008,
        smooth: true,
        move: { fade: [0.7, 1], period: 4 },
      },
      ...figure(0.5, 0.3, 0.18),
    ],
  },
  {
    sefirah: "gevurah",
    id: "place-gevurah",
    label: "A ceiling of stone pressing down toward the floor with a figure in the narrowing space beneath it.",
    still: 2.0,
    shapes: [
      ...ground(0.86),
      // The boundary that holds, coming down. It is the only ceiling in the ten
      // and it is the only thing in the ten that moves *toward* you.
      ...ceiling(0.1).map(
        (shape): Shape => ({ ...shape, move: { to: [0, 0.4], period: 5.5 } }),
      ),
      ...figure(0.5, 0.86, 0.2),
    ],
  },
  {
    sefirah: "chesed",
    id: "place-chesed",
    label: "An open tent on a shore with water reaching to the horizon and a great shape moving under it.",
    still: 1.6,
    shapes: [
      // The deep that refused you.
      {
        poly: [
          [-0.05, 0.6],
          [1.05, 0.6],
          [1.05, 1.05],
          [-0.05, 1.05],
        ],
        fill: "blue",
        alpha: 0.55,
      },
      {
        line: [
          [-0.05, 0.6],
          [0.3, 0.62],
          [0.6, 0.59],
          [1.05, 0.61],
        ],
        stroke: "edge",
        w: 0.004,
        smooth: true,
        move: { to: [0.02, 0.006], period: 5 },
      },
      // What is in it.
      {
        poly: [
          [0.55, 0.78],
          [0.72, 0.73],
          [0.86, 0.79],
          [0.72, 0.83],
        ],
        fill: "ink",
        alpha: 0.55,
        smooth: true,
        move: { to: [-0.06, 0.02], period: 7 },
      },
      // The shore, and the open tent on it — given without condition, so it has
      // no door in it at all.
      {
        poly: [
          [-0.05, 0.72],
          [0.42, 0.66],
          [0.42, 1.05],
          [-0.05, 1.05],
        ],
        fill: "stone",
      },
      {
        line: [
          [0.08, 0.7],
          [0.2, 0.44],
          [0.32, 0.7],
        ],
        stroke: "gold",
        w: 0.007,
      },
      ...figure(0.2, 0.7, 0.16),
    ],
  },
  {
    sefirah: "binah",
    id: "place-binah",
    label: "A dark sea filling the frame with one great coiled form beneath it and a small light held inside.",
    still: 1.8,
    shapes: [
      {
        poly: [
          [-0.05, 0.24],
          [1.05, 0.24],
          [1.05, 1.05],
          [-0.05, 1.05],
        ],
        fill: "blue",
        alpha: 0.7,
      },
      {
        line: [
          [-0.05, 0.24],
          [0.35, 0.27],
          [0.7, 0.22],
          [1.05, 0.26],
        ],
        stroke: "edge",
        w: 0.004,
        smooth: true,
        move: { to: [0.03, 0.008], period: 6 },
      },
      // The coil, most of it out of frame, which is the only honest way to draw
      // a thing that is bigger than the picture.
      {
        poly: [
          [-0.1, 0.9],
          [0.24, 0.62],
          [0.58, 0.86],
          [0.9, 0.6],
          [1.1, 0.72],
          [1.1, 1.1],
          [-0.1, 1.1],
        ],
        fill: "ink",
        alpha: 0.6,
        smooth: true,
        move: { to: [0.04, 0.02], period: 9 },
      },
      // The hidden light, simply seen — which is what this rung is for.
      { dot: [0.5, 0.5], r: 0.012, fill: "bright", glow: 6, move: { fade: [0.4, 1], period: 3.6 } },
    ],
  },
  {
    sefirah: "chochmah",
    id: "place-chochmah",
    label: "A vast empty grey with one point of light very small at its centre and a wing crossing high above.",
    still: 1.0,
    shapes: [
      ...ground(0.94),
      // The first point, the flash before the form. Almost the whole picture is
      // what is not in it.
      { dot: [0.5, 0.56], r: 0.009, fill: "bright", glow: 8, move: { fade: [0.35, 1], period: 5 } },
      // The bird whose head is in the heavens, crossing above and paying no
      // attention at all.
      {
        line: [
          [0.14, 0.2],
          [0.34, 0.12],
          [0.56, 0.2],
        ],
        stroke: "ink",
        w: 0.008,
        alpha: 0.6,
        smooth: true,
        move: { to: [0.5, -0.03], period: 11 },
      },
      // Found by going low.
      ...figure(0.5, 0.94, 0.13),
    ],
  },
  {
    sefirah: "keter",
    id: "place-keter",
    label: "Almost nothing: a level horizon, a single point of light above it, and a figure standing very still.",
    still: 2.4,
    shapes: [
      ...ground(0.88),
      // Will before thought. The crown is authored as an absence, which is what
      // `PLACES` already says about it — its weight is the lowest of the ten
      // because there is nearly nothing there to lean.
      { dot: [0.5, 0.34], r: 0.016, fill: "bright", glow: 9, move: { fade: [0.55, 1], period: 6.5 } },
      ...figure(0.5, 0.88, 0.18),
    ],
  },
];

/**
 * **One scene per Sefirah, keyed by place.** A record rather than a list,
 * because unlike the prologue there is no order to a place — a Scribe meets
 * them in whatever order the Tree is walked, and a list would invite an index
 * to be used as a rung number, which is exactly the confusion `regionOfPath`
 * exists to keep straight.
 */
export const PLACE_SCENES: Record<SefirahId, Scene> = Object.fromEntries(
  PLACE_SCENE_LIST.map(({ sefirah, ...scene }) => [sefirah, scene]),
) as Record<SefirahId, Scene>;

/** Every scene there is, for the sweeps that have to hold all of them. */
export const ALL_SCENES: readonly Scene[] = [...PROLOGUE_SCENES, ...Object.values(PLACE_SCENES)];

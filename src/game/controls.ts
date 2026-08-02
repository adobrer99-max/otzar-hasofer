import { abilities, type LetterAbility, type Verb } from "./abilities";
import type { Input } from "./world/types";

/**
 * The seven ways the Scribe's body is moved, written down once.
 *
 * Before this file the bindings lived in `GameCanvas`'s `KEY_MAP`, the touch
 * pad was a separate hand-written list that had quietly fallen three buttons
 * short, and the only documentation was a single line in the HUD that never
 * mentioned Up or Down at all — so Kuf could not be climbed with a thumb and
 * nothing anywhere told a Scribe that Down existed. All three now read from
 * here, which is the point: a binding that is not in this file does not exist,
 * and one that is here is documented, bound and reachable by thumb by
 * construction rather than by diligence.
 *
 * What a control *does* is deliberately not listed here. Each letter names its
 * own key in `abilities.ts`, and `abilitiesFor` reads the list back — so the
 * reference panel is generated from the same field the acquisition plate
 * prints, and the two can never disagree.
 */

export type ControlId = keyof Input &
  ("left" | "right" | "up" | "down" | "jump" | "act" | "dash" | "strike");

export interface Control {
  id: ControlId;
  /** `KeyboardEvent.code` values, for binding. */
  codes: string[];
  /** The same keys as a Scribe would say them, for printing. */
  keys: string[];
  /** The glyph on the touch pad. Every control has one — see the invariant. */
  pad: string;
  /** Which half of the pad it belongs to. */
  cluster: "move" | "do";
  name: string;
  /** What the body does with it before any letter is found. */
  does: string;
}

export const CONTROLS: Control[] = [
  {
    id: "left",
    codes: ["ArrowLeft", "KeyA"],
    keys: ["←", "A"],
    pad: "←",
    cluster: "move",
    name: "Walk left",
    does: "Walk. Nothing is needed for this but the will to go.",
  },
  {
    id: "right",
    codes: ["ArrowRight", "KeyD"],
    keys: ["→", "D"],
    pad: "→",
    cluster: "move",
    name: "Walk right",
    does: "Walk. The way up the Tree is to the right.",
  },
  {
    id: "up",
    codes: ["ArrowUp", "KeyW"],
    keys: ["↑", "W"],
    pad: "↑",
    cluster: "move",
    name: "Rise",
    does: "Also leaps, as every platformer's players expect — and means up in earnest on a vine or in water.",
  },
  {
    id: "down",
    codes: ["ArrowDown", "KeyS"],
    keys: ["↓", "S"],
    pad: "↓",
    cluster: "move",
    name: "Lower",
    does: "Drop through a ledge you are standing on. Descend a vine, or sink in water.",
  },
  {
    id: "jump",
    codes: ["Space", "KeyZ", "KeyK"],
    keys: ["Space", "Z", "K"],
    pad: "▲",
    cluster: "do",
    name: "Leap",
    does: "Jump. Hold it and you rise higher; let go mid-rise and the leap is cut short.",
  },
  {
    id: "act",
    codes: ["KeyX", "KeyJ", "KeyE"],
    keys: ["X", "J", "E"],
    pad: "✶",
    cluster: "do",
    name: "Act",
    does: "The one contextual key: it does whatever the letters you carry can do to what is in front of you.",
  },
  {
    id: "dash",
    codes: ["KeyC", "KeyL", "ShiftLeft", "ShiftRight"],
    keys: ["C", "L", "Shift"],
    pad: "»",
    cluster: "do",
    name: "Cross",
    does: "Nothing yet — until the Bridge is found, this key is silent.",
  },
  {
    id: "strike",
    codes: ["KeyV", "KeyF"],
    keys: ["V", "F"],
    pad: "✎",
    cluster: "do",
    name: "Write",
    does: "Throw a mark, the way you are facing. Hold ↑ or ↓ to angle it.",
  },
];

export const controlById: Record<ControlId, Control> = Object.fromEntries(
  CONTROLS.map((c) => [c.id, c]),
) as Record<ControlId, Control>;

/**
 * The touch pad, in the order the thumbs meet it — a four-way cluster on the
 * left and the three doings on the right. Every control appears exactly once,
 * which is checked, because the pad used to carry five of the seven and the
 * two it omitted were Up and Down: on a phone, Kuf could not climb and Tet
 * could not crawl, and nothing said so.
 */
export const PAD_LAYOUT: { cluster: "move" | "do"; ids: ControlId[] }[] = [
  { cluster: "move", ids: ["left", "up", "down", "right"] },
  { cluster: "do", ids: ["strike", "act", "dash", "jump"] },
];

/** The binding table the canvas listens with. Derived, never hand-written. */
export const KEY_MAP: Record<string, ControlId> = Object.fromEntries(
  CONTROLS.flatMap((c) => c.codes.map((code) => [code, c.id])),
);

/**
 * The precedence `applyVerbs` in `world/step.ts` actually uses, so the panel
 * can say what happens when two of them could both answer. The Hook is tried
 * first and returns; the three that clear a barrier are tried in this order
 * and the first that finds its tile wins; the Eye only looks when nothing was
 * cleared; the House is what is left when nothing else applied.
 */
export const ACT_ORDER: Verb[] = ["grapple", "cut", "flame", "open", "reveal", "block"];

/** The abilities this key serves — for `act`, in the order they resolve. */
export function abilitiesFor(control: ControlId): LetterAbility[] {
  const found = abilities.filter((a) => a.controls?.includes(control));
  if (control !== "act") return found;
  const rank = (a: LetterAbility) => (a.verb ? ACT_ORDER.indexOf(a.verb) : ACT_ORDER.length);
  return found.sort((a, b) => rank(a) - rank(b));
}

/**
 * What each locked way is, in words — the reading side of `TILE_KEY`, which
 * until now was the one table in the game that named which letter answers
 * which barrier and had no consumer at all. The test holds the two in step:
 * every verb `TILE_KEY` names must be described here, and nothing may be
 * described that answers no tile.
 */
export const BARRIER_OF: Record<Verb | "crawl", string> = {
  cut: "a thornbrake",
  flame: "overgrowth",
  open: "a sealed door",
  reveal: "veiled stone",
  grapple: "an anchor ring",
  climb: "a hanging vine",
  crawl: "a low passage",
} as Record<Verb | "crawl", string>;

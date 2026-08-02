import { dorotCardsById, dorotHousesById } from "../data/dorot";
import type { SefirahId } from "../types/letter";

/**
 * Why the Scribe is climbing.
 *
 * Ma'alot had ten rungs, twenty-two letters and no reason. This is the reason,
 * and almost none of it is new machinery — it is a name for what the game was
 * already doing:
 *
 * - The climb runs **from Malchut to Keter**, against the direction of
 *   emanation. That is a return, and a return implies a departure.
 * - **Peh, the Mouth, is the one letter never found lying in an alcove.** It
 *   is assembled from three fragments of a torn scroll bearing *"Lord, open my
 *   lips, and my mouth shall declare Your praise"* — the verse said at the
 *   moment of asking to be able to speak at all, immediately before the
 *   standing prayer of petition. A stripped mouth, reassembled in order to
 *   plead.
 * - **Seven Houses stand on the seven lower rungs**, one figure each, and they
 *   stand in exactly the order they are climbed: David and Ruth at the foot,
 *   Abraham and Sarah last before the Abyss. Every one of them argued with
 *   heaven and was heard.
 *
 * So: an angel cast down from the crown, who was not told what for, climbing
 * back to ask. He does not know the charge. The figures do — each holds one
 * piece of it — and what the seven pieces come to is that he is accused of
 * having pleaded for someone. Which is the thing he is climbing back to do.
 *
 * **What is invention and what is not.** The seven figures, their episodes and
 * their arguments with heaven are scripture and are cited where they are drawn
 * on; the Sefirot, the Ushpizin and the order of the rungs are tradition and
 * are the Treasury's own throughout. The cast-out scribe is **the game's
 * fiction** and is not claimed as anything else. It leans on a real tradition
 * of an angelic scribe who was punished — see Chagigah 15a — which is gestured
 * at and deliberately not named, because naming it would be making a claim
 * about a text rather than telling a story alongside it.
 */

export const PROLOGUE = {
  kicker: "Before the first rung",
  lines: [
    "You were the scribe of the crown. You wrote what was said and you said nothing, and that was the whole of the office, and it was enough.",
    "You do not remember the fall. You remember the desk, and then the kingdom — the world exactly as it is, at the very bottom of the Tree, with the twenty-two letters gone out of your hands and scattered up the way you came.",
    "No charge was read to you. You are climbing back to ask what it was, and to answer it.",
  ],
  /** What the Scribe is told to do about it, in one line, on the threshold. */
  charge:
    "Gather the letters. Find the Mouth — you will need one. And speak with the figures keeping the Houses: they were all told what you were not.",
} as const;

/**
 * What the figure at each rung says the Scribe is accused of.
 *
 * One per Sefirah rather than one per figure, because either House may stand
 * at a rung — the patriarchal or the matriarchal, whichever the seed lays —
 * and both of them did the same thing at that rung. David came from outside
 * and Ruth came from outside; Isaac asked where the lamb was and Rebecca went
 * to inquire; Abraham argued for Sodom and Sarah laughed in the doorway and
 * was not destroyed for it.
 *
 * They accumulate. Malchut names the smallest and most provable piece, and
 * each rung above widens it, until Chesed — the last House before the Abyss —
 * says what it actually comes to.
 */
export interface Testimony {
  sefirah: SefirahId;
  /** The piece of the charge this rung holds. */
  charge: string;
  /** What the figure says about their own arguing, which is the answer. */
  answer: string;
}

export const TESTIMONY: Record<string, Testimony> = {
  malchut: {
    sefirah: "malchut",
    charge: "You were found where you had not been sent.",
    answer:
      "That is the smallest part of it, and the part they say first, because it is the only part that can be proved. I was not sent either. I came from outside, and I was taken in, and in all the years since nobody has asked by whose leave.",
  },
  yesod: {
    sefirah: "yesod",
    charge: "You made a claim on someone else's behalf.",
    answer:
      "I held the token up in front of everyone and said: by the one whose these are. It was not my place to say it and it was true, and being true turned out to be enough. Keep climbing.",
  },
  hod: {
    sefirah: "hod",
    charge: "Your lips moved and no voice came out of them, and it was written down as something else.",
    answer:
      "They said I was drunk. I was pouring out my soul. Whatever has been set against your name, someone wrote down what it looked like from where they stood — and what a thing looks like and what it is are two different testimonies.",
  },
  netzach: {
    sefirah: "netzach",
    charge: "You offered yourself in another's place.",
    answer:
      "Blot me out of Your book, I said, rather than them. He did not blot me out, and He did not say I had been wrong to ask. Forty years I did not enter, and not once have I thought the asking was the reason.",
  },
  tiferet: {
    sefirah: "tiferet",
    charge: "You would not let go.",
    answer:
      "Neither would I. All night, and the hip has never been right since, and I was given a new name for it. That is my whole testimony: He was not angry that I held on.",
  },
  gevurah: {
    sefirah: "gevurah",
    charge: "You asked why.",
    answer:
      "So did I. It is written of me only that I went to inquire — it does not say I was refused and it does not say I was punished. This is the rung where a boundary is either a real boundary or it is fear wearing one's coat, and you are entitled to find out which.",
  },
  chesed: {
    sefirah: "chesed",
    charge: "You supposed the Judge of all the earth could be argued with.",
    answer:
      "Shall the Judge of all the earth not do justice? I said it to His face, and I said it six times, and six times He came down. Here is what you have been climbing to hear: you are not accused of a crime. You are accused of having loved something enough to speak for it. I am the last House before the Abyss, and what I am here to tell you is — go up, and say it again.",
  },
};

/** The beat at the Abyss: Da'at, crossed with what the seven have said. */
export const ABYSS_WORD =
  "Nothing stands here. No House, no figure, no one to ask. Whatever you were told below, you carry across on your own — and whatever you were not told, you will be arriving without.";

// ---------------------------------------------------------------------------
// the witnesses
// ---------------------------------------------------------------------------

export interface Witness {
  sefirah: SefirahId;
  figure: string;
}

/**
 * Who stood for the Scribe, from the Houses met on the way up.
 *
 * `housesMet` has always been recorded on the ascent and has never been used
 * for anything but a count on the closing plate. It is the case.
 */
export function witnessesOf(housesMet: readonly string[]): Witness[] {
  const found = new Map<string, Witness>();
  for (const cardId of housesMet) {
    const house = dorotHousesById[dorotCardsById[cardId]?.houseId ?? ""];
    if (house) found.set(house.sefirah, { sefirah: house.sefirah as SefirahId, figure: house.figure });
  }
  return [...found.values()];
}

/** How many rungs hold a House — and so how full a case can possibly be. */
export const WITNESSES_POSSIBLE = Object.keys(TESTIMONY).length;

// ---------------------------------------------------------------------------
// the plea
// ---------------------------------------------------------------------------

export type PleaKind = "mute" | "alone" | "heard" | "whole";

export interface Plea {
  kind: PleaKind;
  kicker: string;
  lines: string[];
}

/**
 * What happens when the Scribe reaches the crown.
 *
 * Note what this deliberately does not do: **nothing here returns a verdict.**
 * The crown does not acquit and does not condemn, because a game has no
 * business pronouncing one and because the whole of what the seven Houses
 * testified is that the asking was permitted. The strongest ending available
 * is that he is *heard* — which is exactly what each of them got.
 *
 * The Mouth is required, and its absence is the one genuinely hard outcome in
 * a game with no failure state. The climb still completes and the ascent is
 * still sealed; he simply arrives unable to say anything, having spent ten
 * rungs on a case he cannot make. Nothing is lost but the chance, and the
 * scroll is lying in Malchut and Yesod on the next ascent.
 */
export function pleaFor(opts: { hasMouth: boolean; witnesses: readonly Witness[] }): Plea {
  const { hasMouth, witnesses } = opts;

  if (!hasMouth) {
    return {
      kind: "mute",
      kicker: "You arrive without a mouth",
      lines: [
        "The crown is reached. You stand where you stood before, and the office you kept is still there, and the desk is still there, and everything is exactly as you remember it.",
        "You open your mouth and nothing comes out of it, because the letter that opens a mouth is still lying in three pieces in the genizah niches of the lower rungs, and you walked past them.",
        "Nothing is held against you for this. The climb is counted and the ascent is sealed. But the case is not made, and no one here can make it for you.",
      ],
    };
  }

  if (witnesses.length === 0) {
    return {
      kind: "alone",
      kicker: "You plead alone",
      lines: [
        "Lord, open my lips — and they open. You have the Mouth, and you say the thing you came ten rungs to say.",
        "You say it into a silence with nobody standing beside you. You passed every House on the way up and spoke with none of them, so you are the only voice for your own case, and you still do not know what the charge was.",
        "It is heard. Being heard was always the whole of what you were asking for. But you will want to know what you were accused of, and that is written in seven places, all of them below you.",
      ],
    };
  }

  const named = witnesses.map((w) => w.figure);
  const roll = named.length === 1 ? named[0] : `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}`;

  if (witnesses.length >= WITNESSES_POSSIBLE) {
    return {
      kind: "whole",
      kicker: "The whole case is made",
      lines: [
        "Lord, open my lips — and they open, and for the first time since the fall you know exactly what you are answering.",
        `You were found where you were not sent. You made a claim for someone else. Your lips moved and it was written down as something else. You offered yourself in another's place. You would not let go. You asked why. You supposed the Judge of all the earth could be argued with — and ${roll} stand up, one after another, and say: so did we, and we were heard.`,
        "That is the answer to the charge. Not that you did not do it. That it was permitted, and that everyone here who ever climbed did the same, and that the asking was never the offence.",
      ],
    };
  }

  return {
    kind: "heard",
    kicker: "You are heard",
    lines: [
      "Lord, open my lips — and they open. You say what you climbed to say, and you say it knowing only part of what you are answering.",
      `${roll} stand for you. Each of them argued with heaven once and was not destroyed for it, and each of them says so.`,
      `That is ${witnesses.length} of the ${WITNESSES_POSSIBLE} Houses. The rest of the charge is still lying on the rungs you passed, in the mouths of the figures you did not stop for.`,
    ],
  };
}

/**
 * The torn scroll — how the Mouth is come by.
 *
 * Peh is the one letter never found lying in an alcove. It is the mouth, the
 * opening, the letter without which the figures keeping the Houses stand
 * silent — and a power over speech should not simply be picked up off a
 * shelf. So it is *assembled*: three fragments of one torn scroll, strewn
 * through the earliest regions, which come together into the letter.
 *
 * The scroll bears the verse a Jew says immediately before the Amidah, at the
 * moment of asking to be able to speak at all — Psalms 51:17, public domain,
 * and the plainest possible statement of what the letter does.
 *
 * This also answers a scheduling problem in the ascent. Peh sat in Chesed,
 * the seventh region, which put the Dorot episodes — the richest content the
 * game draws on — behind six regions of silence. Assembling it in Malchut and
 * Yesod means the Houses speak from the second region onward, and the one
 * silent figure in Malchut becomes the reason to look for the fragments.
 */

export interface ScrollFragment {
  /** 0-based position in the verse. */
  index: number;
  hebrew: string;
  transliteration: string;
  english: string;
}

export const SCROLL_FRAGMENTS: ScrollFragment[] = [
  {
    index: 0,
    hebrew: "אֲדֹנָי שְׂפָתַי תִּפְתָּח",
    transliteration: "Adonai sefatai tiftach",
    english: "Lord, open my lips",
  },
  {
    index: 1,
    hebrew: "וּפִי יַגִּיד",
    transliteration: "u-fi yagid",
    english: "and my mouth shall declare",
  },
  {
    index: 2,
    hebrew: "תְּהִלָּתֶךָ",
    transliteration: "tehilatekha",
    english: "Your praise",
  },
];

export const SCROLL_TOTAL = SCROLL_FRAGMENTS.length;

/** The whole verse, shown when the last fragment is set in place. */
export const SCROLL_VERSE = {
  hebrew: "אֲדֹנָי שְׂפָתַי תִּפְתָּח וּפִי יַגִּיד תְּהִלָּתֶךָ",
  transliteration: "Adonai sefatai tiftach, u-fi yagid tehilatekha",
  english: "Lord, open my lips, and my mouth shall declare Your praise.",
  citation: "Psalms 51:17 — said before the Amidah",
};

/** The letter the assembled scroll becomes. */
export const SCROLL_LETTER = "peh";

export function fragmentAt(index: number): ScrollFragment | undefined {
  return SCROLL_FRAGMENTS[index];
}

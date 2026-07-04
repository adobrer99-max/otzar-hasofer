import type { CommentaryRecord } from "../types/commentary";
import { subjectKeyFor } from "../types/commentary";

/**
 * The received commentaries — the doc says the Treasury's Drash tier holds
 * "the received and ongoing commentaries, beginning with the Commentary of
 * Aleph Yud." These ship in code (not IndexedDB) so they survive storage
 * clears and cannot be edited or deleted in-app; Scribe-authored
 * commentaries live in the `commentaries` store alongside them.
 *
 * The body below is transcribed from the doc's worked example, "A
 * Commentary on ה — Ot Ha'Neshema."
 */

const hehSubject = { kind: "letter", letterId: "heh" } as const;
const balaganOpeningSubject = { kind: "balagan", category: "unresolved-questions" } as const;

export const seedCommentaries: CommentaryRecord[] = [
  {
    id: "seed-balagan-opening",
    subject: balaganOpeningSubject,
    subjectKey: subjectKeyFor(balaganOpeningSubject),
    title: "On keeping a genizah at all",
    author: "The First Scribe",
    hebrewDate: { year: 5786, month: "Tammuz", day: 17 },
    createdAt: "2026-07-02T00:00:00.000Z",
    body: `A worn or damaged sacred text is not discarded but laid in the genizah, held in honor until it can be buried. The Treasury keeps this book in the same spirit: a thought that no longer serves the reading is not deleted but set here, so that the path not taken is not forgotten and a later Scribe may find in it what we could not.

What belongs here that we would otherwise be tempted to throw away?`,
  },
  {
    id: "seed-heh-ot-haneshema",
    subject: hehSubject,
    subjectKey: subjectKeyFor(hehSubject),
    title: "A Commentary on ה — Ot Ha'Neshema (אות הנשימה)",
    author: "Aleph Yud",
    hebrewDate: { year: 5786, month: "Tammuz", day: 17 },
    createdAt: "2026-07-02T00:00:00.000Z",
    body: `"Breath is the rhythm of giving and receiving. Every living creature receives life through breath and returns breath to the world. ה therefore invites the participant to contemplate not only what they create, but the manner in which they receive, sustain, and return life to others."

In Hebrew speech, the function of ה is tied to ruach, and it is different at the beginning of a spoken word than at the end. Our sages have long noted and described ה as having a "light" or "breathy" quality.

At the beginning of a root word: the breath is released into speech, embodying the act of creation. Hashem forms Adam, "and breathed into his nostrils the breath of life" — the movement of breath is literally the transition from inert creation to living being. ה when drawn first represents creative energy and animation. It is tied to Aleph, and the Sefirah of Chesed.

In the middle of a root word: it becomes a pause that softens the harshness of the letter that precedes it, and invites a pause before the completion of the word — suggestive of the breath between receiving and giving, a nod to the need for contemplation and reflection.

At the end of a root word: the breath often softens and dissipates, embodying the return to the holiness of Shabbat. Drawn at the end of the word, it takes on the quality of respiration, of relaxation, and rest. It is tied to the Sefirah of Malchut.

The Divine Name contains ה twice, further cementing it as representing different stages of Divine manifestation.

So, when ה is drawn, after offering the traditional canonical tradition according to the Sefer Yetzirah, this Scribe will offer his commentary on ה as the אות הנשימה, with meanings to do with: Revelation, Breath, Giving, Receiving, and the rhythm of life. From this emerge new avenues of questioning and interpretation.

Receiving: What am I being invited to receive that I have been resisting? Whose generosity have I not fully acknowledged? Where has life been breathing into me recently?

Giving: Where am I called to give life to another? What words have become life-giving? What gift have I been withholding?

Rhythm: Am I breathing deeply or merely surviving? Where has my life fallen out of rhythm? What needs to be released before something new can be received?

Creation: What am I bringing into the world? What creative work has been waiting patiently? Does my work leave others more alive than before?`,
  },
];

const seedIds = new Set(seedCommentaries.map((c) => c.id));

export function isSeedCommentary(id: string): boolean {
  return seedIds.has(id);
}

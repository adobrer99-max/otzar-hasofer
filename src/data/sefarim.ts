/**
 * The shelf of Sefarim — the doc's named Books, presented as a Beit Midrash
 * library. Some Sefarim are native to the library (a browsable PaRDeS reader
 * or the genizah), some are explainers, and some link out to reference-guide
 * content that already covers them; Sefer HaDikduk is named but its grammar
 * content is not yet transcribed.
 */

export type SeferKind =
  /** A browsable book whose entries open as a four-tier PaRDeS page. */
  | "pardes-browse"
  /** Balagan HaOtzar — the scribe's genizah of categorized notes. */
  | "balagan"
  /** A page that teaches the PaRDeS format itself, with a live worked example. */
  | "explainer"
  /** A spine that links out to existing reference-guide/app content. */
  | "external-link"
  /** Named in the doc but not yet built — shows a "forthcoming" panel. */
  | "forthcoming";

export interface SeferMeta {
  id: string;
  title: string;
  hebrewName: string;
  subtitle: string;
  description: string;
  /** Spine color (a palette token) for the shelf. */
  spineColor: string;
  kind: SeferKind;
  /** For `external-link`: the in-app route the spine opens. */
  target?: string;
}

export const sefarim: SeferMeta[] = [
  {
    id: "hashorashim",
    title: "Sefer HaShorashim",
    hebrewName: "ספר השורשים",
    subtitle: "The Book of Roots",
    description:
      "The canonical lexicon of Hebrew roots drawn from the public-domain BDB/Strong's. Each root opens as a four-tier page — its literal sense, its use in tradition, the Scribe's commentaries, and the participant's lived encounter.",
    spineColor: "var(--color-gold)",
    kind: "pardes-browse",
  },
  {
    id: "balagan",
    title: "Balagan HaOtzar",
    hebrewName: "גניזת האוצר",
    subtitle: "The Genizah of the Treasury",
    description:
      "The Scribe's genizah: marginal notes, unresolved questions, variant traditions, corrections, discarded hypotheses, and respectful disagreements — kept rather than discarded, so nothing of the work is lost.",
    spineColor: "var(--color-copper)",
    kind: "balagan",
  },
  {
    id: "vocabulary-treasury",
    title: "The Vocabulary Treasury",
    hebrewName: "אוצר המילים",
    subtitle: "The Four Tiers of PaRDeS",
    description:
      "The framework every reading passes through — Peshat, Remez, Drash, Sod — shown with a living worked example so the format of the shelf's books is itself explained.",
    spineColor: "var(--color-blue)",
    kind: "explainer",
  },
  {
    id: "hamoadim",
    title: "Sefer HaMo'adim",
    hebrewName: "ספר המועדים",
    subtitle: "The Book of Sacred Times",
    description:
      "The festivals, fasts, and layers of Jewish time that shape every reading — already kept in the reference guide's Sacred Time chapter.",
    spineColor: "var(--color-silver)",
    kind: "external-link",
    target: "/guide/sacred-time",
  },
  {
    id: "commentaries",
    title: "The Commentaries",
    hebrewName: "הפירושים",
    subtitle: "The Drash of the Treasury",
    description:
      "The received and ongoing commentaries on the letters, the roots, and the Ha'Dorot cards — the shelf's Drash tier, kept in its own space.",
    spineColor: "var(--color-gold-bright)",
    kind: "external-link",
    target: "/commentaries",
  },
  {
    id: "hadikduk",
    title: "Sefer HaDikduk",
    hebrewName: "ספר הדקדוק",
    subtitle: "The Book of Grammar",
    description:
      "The grammar of the roots — weak and guttural and doubled roots, defective and full spellings, irregular forms. Named in the doc; its content is not yet transcribed.",
    spineColor: "var(--color-charcoal-line)",
    kind: "forthcoming",
  },
];

export const sefarimById: Record<string, SeferMeta> = Object.fromEntries(
  sefarim.map((s) => [s.id, s]),
);

/**
 * The Treasury's information architecture, defined once and reused by the nav,
 * the mobile drawer, the Home doorways, and the Footer — so the four never
 * drift apart. Four clusters: the Guide (reference), the Practice (conducting a
 * reading), the Library (study), and the Treasury/Account.
 */
export interface SiteLink {
  to: string;
  label: string;
  /** A one-line description, shown on the Home doorways. */
  blurb?: string;
}

export const guideLinks: SiteLink[] = [
  {
    to: "/guide/foundations",
    label: "Foundations",
    blurb: "The philosophy, cosmology, and ritual principles the practice rests on.",
  },
  {
    to: "/guide/letters",
    label: "The Twenty-Two Letters",
    blurb: "Derekh Eretz — one chapter per Hebrew letter, the enduring architecture of reality.",
  },
  {
    to: "/guide/shoresh",
    label: "Shoresh",
    blurb: "How three drawn letters become the root — the Word of the Reading — through a four-tier hierarchy.",
  },
  {
    to: "/guide/dorot",
    label: "Derekh Ha'Dorot",
    blurb: "The second deck: fourteen Houses of biblical episodes, where the eternal principles are lived out in history.",
  },
  {
    to: "/guide/mizbeach",
    label: "The Mizbe'ach",
    blurb: "The ritual folio, rendered live — its rings turning with today's Hebrew date, moon, and festivals.",
  },
  {
    to: "/guide/scribe",
    label: "The Scribe",
    blurb: "The liturgy, ethics, posture, and questioning that guide a reading.",
  },
  {
    to: "/guide/sacred-time",
    label: "Sacred Time",
    blurb: "Immediate, Personal, and Covenantal time — no reading occurs outside of sacred time.",
  },
  {
    to: "/guide/encounters",
    label: "The Seven Encounters",
    blurb: "How a participant's first seven readings unfold through the days of Creation.",
  },
  {
    to: "/guide/visual-canon",
    label: "Visual Canon",
    blurb: "The typography, color, and iconography that give the Treasury its quiet reverence.",
  },
];

export const practiceLinks: SiteLink[] = [
  {
    to: "/herald",
    label: "The Herald",
    blurb: "Create a participant's living heraldic sigil at the close of a reading — with Shoresh resolution, Sacred Time, and the Heraldic Epithet earned at the seventh reading.",
  },
  {
    to: "/mizbeach",
    label: "The Reading Folio",
    blurb: "Conduct a reading on the folio itself — place the letters and the veiled anchor on the surface, turn the rings to the sacred time, and seal the Herald.",
  },
  {
    to: "/covenant",
    label: "The Covenant",
    blurb: "At marriage, a shared Herald is created — derived from both partners' Treasuries and grown through the seven blessings of the Sheva Brachot.",
  },
];

export const libraryLinks: SiteLink[] = [
  {
    to: "/sefarim",
    label: "The Sefarim",
    blurb: "The Beit Midrash — the Book of Roots, the Vocabulary Treasury, and Balagan HaOtzar (the scribe's genizah), each read and written through the four tiers of PaRDeS.",
  },
  {
    to: "/commentaries",
    label: "Commentaries",
    blurb: "The Drash tier — received and ongoing commentaries on the letters, the Ha'Dorot cards, and the roots.",
  },
];

export const homeLink: SiteLink = { to: "/", label: "The Treasury" };
export const accountLink: SiteLink = { to: "/account", label: "Account" };

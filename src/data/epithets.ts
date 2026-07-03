import type { SefirahId } from "../types/letter";

/**
 * Building blocks for the Heraldic Epithet — the honorific a participant
 * receives from the Treasury at their seventh reading. The doc specifies
 * only that the Epithet is received; its composition is this project's own
 * design: an honorific drawn from the participant's dominant middah across
 * their first seven readings, joined to an emblem drawn from their most
 * recurrent letter ("Keeper of the Open Tent, under the Sign of the
 * Sheltering House").
 *
 * Editorial note: every phrase below is first-draft editorial content
 * authored in the project's voice — meant to be rewritten by the user,
 * same posture as the letter meanings. The Scribe can also reword any
 * individual proposed Epithet before sealing it.
 */

/**
 * One honorific per lower Sefirah (the reading form's middah list). The
 * upper three Sefirot are never offered as a middah, so they have no
 * honorific; `deriveEpithet` falls back to DEFAULT_HONORIFIC if it ever
 * meets one in stored data.
 */
export const sefirahHonorifics: Partial<Record<SefirahId, string>> = {
  chesed: "Keeper of the Open Tent",
  gevurah: "Guardian of the Boundary",
  tiferet: "Weaver of Harmony",
  netzach: "Bearer of the Long Road",
  hod: "Servant of the Quiet Flame",
  yesod: "Foundation of the House",
  malchut: "Steward of the Kingdom",
};

export const DEFAULT_HONORIFIC = "Keeper of the Treasury";

/** One emblem phrase per letter, composed as "under the Sign of {emblem}". */
export const letterEmblems: Record<string, string> = {
  aleph: "the Breath Before Speech",
  bet: "the Sheltering House",
  gimel: "the Bridge Across the Divide",
  dalet: "the Open Door",
  heh: "the Divine Breath",
  vav: "the Binding Thread",
  zayin: "the Guarded Rest",
  chet: "the Living Enclosure",
  tet: "the Hidden Good",
  yod: "the Infinite Point",
  kaf: "the Open Palm",
  lamed: "the Reaching Heart",
  mem: "the Deep Waters",
  nun: "the Faithful Depths",
  samech: "the Unbroken Circle",
  ayin: "the Seeing Well",
  peh: "the Spoken Truth",
  tzadi: "the Bended Knee",
  kuf: "the Descending Light",
  resh: "the Turning Mind",
  shin: "the Transforming Flame",
  tav: "the Final Seal",
};

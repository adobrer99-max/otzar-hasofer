import type { UshpizinEntry } from "../types/letter";

/**
 * The seven lower Sefirot and their Ushpizin figures — an established
 * mystical correspondence (per the Zohar) that this project's "Hierarchy
 * of Sources" treats as primary/fixed, reused both as reference content
 * (Sukkot) and as the shared middah list for the Herald generator.
 */
export const ushpizin: UshpizinEntry[] = [
  {
    sefirah: "chesed",
    sefirahName: "Chesed",
    figure: "Abraham",
    middah: "Loving-kindness",
    description:
      "Abraham's open tent and open hand — kindness given without condition.",
    sukkotSaying:
      "Tonight the booth is mine, and no one stands outside it. Whatever you carry, bring it in — the tent has no closed side, and the meal was set before you were seen on the road.",
  },
  {
    sefirah: "gevurah",
    sefirahName: "Gevurah",
    figure: "Isaac",
    middah: "Discipline / Severity",
    description:
      "Isaac at the akeidah — restraint, discernment, the strength to hold a boundary.",
    sukkotSaying:
      "Tonight the booth is mine. Sit, and do not fill it — a boundary kept is also a welcome, and what I do not hand you tonight I am holding for you.",
  },
  {
    sefirah: "tiferet",
    sefirahName: "Tiferet",
    figure: "Jacob",
    middah: "Harmony / Truth",
    description:
      "Jacob-Israel, the wrestler who becomes whole — beauty as the balance of kindness and discipline.",
    sukkotSaying:
      "Tonight the booth is mine. You have wrestled your way here — sit between the kindness and the severity, where the truth of a thing lives, and rest the hip that limps.",
  },
  {
    sefirah: "netzach",
    sefirahName: "Netzach",
    figure: "Moses",
    middah: "Endurance / Victory",
    description:
      "Moses leading through forty years of wilderness — the long endurance that outlasts the moment.",
    sukkotSaying:
      "Tonight the booth is mine. Forty years I walked toward a land I would not enter; sit with me, and learn how far a body goes on a promise alone.",
  },
  {
    sefirah: "hod",
    sefirahName: "Hod",
    figure: "Aaron",
    middah: "Splendor / Submission",
    description:
      "Aaron the priest, whose service is rendered in humility rather than self-assertion.",
    sukkotSaying:
      "Tonight the booth is mine. I served in another's shadow all my days and called it splendor — sit low with me, and see how much of the light reaches the low places.",
  },
  {
    sefirah: "yesod",
    sefirahName: "Yesod",
    figure: "Joseph",
    middah: "Foundation / Connection",
    description:
      "Joseph the tzaddik, whose integrity under trial becomes the foundation his family stands on.",
    sukkotSaying:
      "Tonight the booth is mine. Everything I kept in the pit and the prison I kept for a table like this one — sit, for what holds firm below is what the whole house stands on.",
  },
  {
    sefirah: "malchut",
    sefirahName: "Malchut",
    figure: "David",
    middah: "Kingship / Manifestation",
    description:
      "David the king, through whom the divine presence is manifest in the practical, ruling world.",
    sukkotSaying:
      "Tonight the booth is mine, and it is small, and it is a palace. Sit — a kingdom is only a booth that everyone was welcomed into.",
  },
];

export const ushpizinBySefirah: Record<string, UshpizinEntry> =
  Object.fromEntries(ushpizin.map((entry) => [entry.sefirah, entry]));

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
  },
  {
    sefirah: "gevurah",
    sefirahName: "Gevurah",
    figure: "Isaac",
    middah: "Discipline / Severity",
    description:
      "Isaac at the akeidah — restraint, discernment, the strength to hold a boundary.",
  },
  {
    sefirah: "tiferet",
    sefirahName: "Tiferet",
    figure: "Jacob",
    middah: "Harmony / Truth",
    description:
      "Jacob-Israel, the wrestler who becomes whole — beauty as the balance of kindness and discipline.",
  },
  {
    sefirah: "netzach",
    sefirahName: "Netzach",
    figure: "Moses",
    middah: "Endurance / Victory",
    description:
      "Moses leading through forty years of wilderness — the long endurance that outlasts the moment.",
  },
  {
    sefirah: "hod",
    sefirahName: "Hod",
    figure: "Aaron",
    middah: "Splendor / Submission",
    description:
      "Aaron the priest, whose service is rendered in humility rather than self-assertion.",
  },
  {
    sefirah: "yesod",
    sefirahName: "Yesod",
    figure: "Joseph",
    middah: "Foundation / Connection",
    description:
      "Joseph the tzaddik, whose integrity under trial becomes the foundation his family stands on.",
  },
  {
    sefirah: "malchut",
    sefirahName: "Malchut",
    figure: "David",
    middah: "Kingship / Manifestation",
    description:
      "David the king, through whom the divine presence is manifest in the practical, ruling world.",
  },
];

export const ushpizinBySefirah: Record<string, UshpizinEntry> =
  Object.fromEntries(ushpizin.map((entry) => [entry.sefirah, entry]));

import type { SefirahId } from "./letter";

export interface Encounter {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** "First" ... "Seventh". */
  name: string;
  /** "Light", "Separation", "Dry Land", ... — the Day of Creation this reading corresponds to. */
  aspect: string;
  /** The doc's descriptive keywords for what this Encounter emphasizes. */
  themes: string;
  /** A contemplative question for the reading. */
  question: string;
  /**
   * The Encounter's primary Sefirotic emphasis (days of Creation ↔ the seven
   * lower Sefirot, in order) — the Derekh Ha'Dorot Houses of this Sefirah
   * open with this Encounter.
   */
  sefirah: SefirahId;
}

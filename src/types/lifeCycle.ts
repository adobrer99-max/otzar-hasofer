import type { HebrewDate } from "../data/hebrewCalendar";

/**
 * The Personal Time anniversaries the Treasury tracks. All share the
 * Yahrzeit's shape — a recurring Hebrew month/day anchor — so the same
 * recurrence machinery powers every banner. Yizkor is deliberately absent:
 * "No reading is done. Just reflection and remembrance."
 */
export type LifeCycleEventType =
  | "yahrzeit"
  | "wedding-anniversary"
  | "bar-bat-mitzvah"
  | "bris"
  | "conversion"
  | "aliyah";

export const LIFE_CYCLE_EVENT_LABELS: Record<LifeCycleEventType, string> = {
  yahrzeit: "Yahrzeit",
  "wedding-anniversary": "Wedding anniversary",
  "bar-bat-mitzvah": "Bar/Bat Mitzvah",
  bris: "Bris",
  conversion: "Conversion",
  aliyah: "Aliyah",
};

export interface LifeCycleEvent {
  id: string;
  participantId: string;
  type: LifeCycleEventType;
  /** Yahrzeit only — who the remembered person was to the participant. */
  relation?: string;
  /** Yahrzeit only — the remembered person's name. */
  personName?: string;
  /** The recurring month/day anchor used to find each year's occurrence. */
  hebrewDate: HebrewDate;
  /** ISO date of the original event, for display/age-in-years. */
  gregorianDateOfEvent: string;
  /**
   * Only meaningful when `hebrewDate.month === "Adar"` and the anchor was
   * set in a non-leap year — later leap-year observance defaults to Adar
   * II (the Ashkenazi-majority custom) unless overridden here.
   */
  adarRule?: "adarI" | "adarII";
  /** Conversion only, optional. */
  sponsoringCommunity?: string;
  /** Conversion only, optional — private to the Scribe's record. */
  beitDin?: string;
  notes?: string;
  createdAt: string;
}

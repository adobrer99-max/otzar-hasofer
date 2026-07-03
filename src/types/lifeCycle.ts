import type { HebrewDate } from "../data/hebrewCalendar";

/** Left open for future life-cycle event types (conversion, Aliyah, marriage, ...) — only "yahrzeit" is populated this round. */
export type LifeCycleEventType = "yahrzeit";

export interface LifeCycleEvent {
  id: string;
  participantId: string;
  type: LifeCycleEventType;
  relation: string;
  personName: string;
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
  notes?: string;
  createdAt: string;
}

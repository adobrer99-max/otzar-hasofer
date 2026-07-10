import type { HebrewDate } from "../data/hebrewCalendar";
import type { LetterDraw } from "./herald";
import type { SefirahId } from "./letter";

/**
 * One day of the Sheva Brachot — "one unfolding reading, with each day
 * illuminating another layer, another sefirah. Day One — Chesed, Day Two —
 * Gevurah, etc." The marriage literally grows through seven blessings.
 */
export interface ShevaBrachotDay {
  /** 1–7; day k illuminates the kth lower Sefirah, Chesed → Malchut. */
  day: number;
  sefirah: SefirahId;
  /** An optional letter drawn for the day. */
  letter?: LetterDraw;
  reflection?: string;
  recordedAt: string;
}

/**
 * A marriage between two participants. "A shared Herald is created. The
 * Covenantal Herald." The union links the partners' existing Treasuries —
 * each keeps their own Herald and history; the Covenantal Herald is derived
 * from both, never stored.
 */
export interface UnionRecord {
  id: string;
  partnerAId: string;
  partnerBId: string;
  weddingGregorianDate: string;
  weddingHebrewDate: HebrewDate;
  shevaBrachot: ShevaBrachotDay[];
  createdAt: string;
  /** Set on mutation, for cloud-sync ordering. */
  updatedAt?: string;
}

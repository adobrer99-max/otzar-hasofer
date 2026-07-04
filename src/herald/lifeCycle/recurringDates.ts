import type { HeraldLayer } from "../../types/herald";
import { hebrewDateFromGregorian, type JewishMonthName } from "../../data/hebrewCalendar";

export interface HebrewMonthDay {
  month: JewishMonthName;
  day: number;
}

/**
 * Finds past readings that fall on the same recurring Hebrew month/day —
 * powers both the Yahrzeit "N years ago you drew..." banner and the Hebrew
 * Birthday "past Annual Treasury Readings" banner. Derives each layer's
 * Hebrew date from its existing `createdAt`, so this works retroactively on
 * every already-saved reading with no backfill needed.
 */
export function findLayersOnRecurringHebrewDate(
  layers: HeraldLayer[],
  monthDay: HebrewMonthDay,
): HeraldLayer[] {
  return layers.filter((layer) => {
    const hebrewDate = hebrewDateFromGregorian(new Date(layer.createdAt));
    return hebrewDate.month === monthDay.month && hebrewDate.day === monthDay.day;
  });
}

import type { HeraldLayer, ParticipantRecord } from "../../types/herald";
import type { LifeCycleEvent } from "../../types/lifeCycle";
import type { HebrewDate } from "../../data/hebrewCalendar";
import { lettersById } from "../../data/letters";
import { findLayersOnRecurringHebrewDate } from "./recurringDates";
import styles from "./lifeCycle.module.css";

function sameMonthDay(a: HebrewDate, b: HebrewDate): boolean {
  return a.month === b.month && a.day === b.day;
}

function layerLetters(layer: HeraldLayer): string {
  return layer.input.drawnLetters.map((d) => lettersById[d.letterId]?.name ?? "?").join("–");
}

export function SacredTimeBanners({
  today,
  participant,
  layers,
  events,
  onSelectLayer,
}: {
  today: HebrewDate;
  participant: ParticipantRecord;
  layers: HeraldLayer[];
  events: LifeCycleEvent[];
  onSelectLayer: (layerId: string) => void;
}) {
  const banners: { key: string; title: string; pastLayers: HeraldLayer[] }[] = [];

  if (participant.hebrewBirthDate && sameMonthDay(today, participant.hebrewBirthDate)) {
    const age = today.year - participant.hebrewBirthDate.year;
    banners.push({
      key: "birthday",
      title: `Today is ${participant.displayName}'s Hebrew Birthday${age > 0 ? ` (age ${age})` : ""} — the Annual Treasury Reading.`,
      pastLayers: findLayersOnRecurringHebrewDate(layers, participant.hebrewBirthDate),
    });
  }

  for (const event of events.filter((e) => e.type === "yahrzeit")) {
    if (sameMonthDay(today, event.hebrewDate)) {
      const years = today.year - event.hebrewDate.year;
      banners.push({
        key: event.id,
        title: `Today is the ${years > 0 ? `${years}${ordinalSuffix(years)} ` : ""}Yahrzeit of ${event.personName} (${event.relation}).`,
        pastLayers: findLayersOnRecurringHebrewDate(layers, event.hebrewDate),
      });
    }
  }

  if (banners.length === 0) return null;

  return (
    <>
      {banners.map((banner) => (
        <div className={styles.banner} key={banner.key}>
          <h4>{banner.title}</h4>
          {banner.pastLayers.length > 0 ? (
            <ul>
              {banner.pastLayers.map((layer) => (
                <li key={layer.id}>
                  {new Date(layer.createdAt).toLocaleDateString()} — you drew {layerLetters(layer)}.{" "}
                  <button type="button" onClick={() => onSelectLayer(layer.id)}>
                    View this reading
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.note}>No past readings recorded on this date yet.</p>
          )}
        </div>
      ))}
    </>
  );
}

function ordinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

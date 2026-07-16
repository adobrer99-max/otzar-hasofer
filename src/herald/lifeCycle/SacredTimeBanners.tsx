import type { HeraldLayer, ParticipantRecord } from "../../types/herald";
import type { LifeCycleEvent } from "../../types/lifeCycle";
import type { HebrewDate } from "../../data/hebrewCalendar";
import { lettersById } from "../../data/letters";
import { findLayersOnRecurringHebrewDate } from "./recurringDates";
import { todaysObservances } from "./observances";
import styles from "./lifeCycle.module.css";

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
  const banners = todaysObservances(today, participant, events).map((o) => ({
    key: o.key,
    title: o.title,
    pastLayers: findLayersOnRecurringHebrewDate(layers, o.monthDay),
  }));

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

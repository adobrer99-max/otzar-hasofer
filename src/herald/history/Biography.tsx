import type { HeraldLayer } from "../../types/herald";
import { letters } from "../../data/letters";
import { ushpizin } from "../../data/ushpizin";
import { hebrewDateFromGregorian, formatHebrewDateEnglish } from "../../data/hebrewCalendar";
import { STATIONS } from "./SevenStations";
import styles from "./Biography.module.css";

const letterName = new Map(letters.map((l) => [l.id, l.name]));
const middahName = new Map(ushpizin.map((u) => [u.sefirah, u.sefirahName]));

/** The accent that rules each reading's card edge — the days of Creation. */
const EDGE = [
  "var(--accent)",
  "var(--color-blue)",
  "var(--color-copper)",
  "var(--color-silver)",
  "var(--accent)",
  "var(--accent)",
  "var(--accent)",
];

function describe(layer: HeraldLayer): string {
  const names = layer.input.drawnLetters
    .map((d) => letterName.get(d.letterId))
    .filter(Boolean)
    .join(", ");
  const middah = middahName.get(layer.input.middah);
  if (names && middah) return `${names} — drawn under ${middah}.`;
  if (names) return `${names} drawn.`;
  return "A reading kept in the Treasury.";
}

/**
 * The Biography — how the Herald came to be. Each reading is a station on the
 * days of Creation: its letter node, day-name, date, and what was drawn.
 * Selecting a card views that single reading's Herald.
 */
export function Biography({
  layers,
  selectedId,
  onSelect,
}: {
  layers: HeraldLayer[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const ordered = [...layers].sort((a, b) => a.layerIndex - b.layerIndex);
  const mostRecent = ordered[ordered.length - 1]?.id;

  return (
    <section className={styles.wrap} aria-label="The Biography — how the Herald came to be">
      <div className={styles.head}>
        <span className="otz-section-label">The Biography · How the Herald Came to Be</span>
        <span className={styles.rule} aria-hidden="true" />
      </div>
      <ol className={styles.list}>
        {ordered.map((layer) => {
          const station = STATIONS[layer.layerIndex];
          const isRecent = layer.id === mostRecent;
          const hebrewDate = formatHebrewDateEnglish(hebrewDateFromGregorian(new Date(layer.createdAt)));
          return (
            <li key={layer.id}>
              <button
                type="button"
                className={`${styles.card} ${layer.id === selectedId ? styles.active : ""}`}
                style={{ borderInlineStartColor: EDGE[layer.layerIndex] ?? "var(--accent)" }}
                onClick={() => onSelect(layer.id)}
                aria-pressed={layer.id === selectedId}
              >
                <span className={styles.node}>{station?.letter ?? layer.layerIndex + 1}</span>
                <span className={styles.body}>
                  <span className={styles.cardHead}>
                    <span className={styles.title}>
                      {station ? `Day ${layer.layerIndex + 1} · ${station.aspect}` : `Reading ${layer.layerIndex + 1}`}
                    </span>
                    {station && <span className={`${styles.heb} hebrew`}>{station.hebrew}</span>}
                    <span className={styles.date}>
                      {hebrewDate}
                      {isRecent && layers.length < 7 ? " · most recent" : ""}
                    </span>
                  </span>
                  <span className={styles.desc}>{describe(layer)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

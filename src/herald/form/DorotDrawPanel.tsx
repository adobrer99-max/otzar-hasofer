import { dorotHouses, cardsByHouse } from "../../data/dorot";
import { encounters } from "../../data/encounters";
import type { DorotMechanic } from "../dorot/dorotMechanics";
import styles from "./form.module.css";

/** Encounter number (1–7) whose Pillar a given sefirah belongs to. */
const encounterNumberBySefirah: Record<string, number> = Object.fromEntries(
  encounters.map((e) => [e.sefirah, e.number]),
);

const BENEATH_LABELS = ["Beneath the First drawn", "Beneath the Second drawn", "Beneath the Third drawn"];

export function firstCardOfHouse(houseId: string): string {
  return cardsByHouse(houseId)[0].id;
}

/**
 * House + card picker with the soft Encounter unfolding: the participant's
 * opened Pillars (Encounter k opens Pillar k; the current reading counts)
 * list first, the rest are labeled "not yet opened" — guidance in the
 * ritual's language, never a restriction.
 */
function HouseCardPicker({
  label,
  cardId,
  readingIndex,
  onChange,
}: {
  label: string;
  cardId: string;
  readingIndex: number;
  onChange: (cardId: string) => void;
}) {
  const openedThrough = Math.min(readingIndex + 1, 7);
  // Resolve the selected card's house from the card id.
  const selectedHouseId =
    dorotHouses.find((h) => cardsByHouse(h.id).some((c) => c.id === cardId))?.id ?? dorotHouses[0].id;

  const isOpened = (sefirah: string) => (encounterNumberBySefirah[sefirah] ?? 8) <= openedThrough;
  const ordered = [
    ...dorotHouses.filter((h) => isOpened(h.sefirah)),
    ...dorotHouses.filter((h) => !isOpened(h.sefirah)),
  ];

  return (
    <div className={styles.dorotRow}>
      <label>
        {label} — House
        <select
          value={selectedHouseId}
          onChange={(e) => onChange(firstCardOfHouse(e.target.value))}
          aria-label={`${label} — House`}
        >
          {ordered.map((h) => (
            <option key={h.id} value={h.id}>
              House of {h.figure}
              {isOpened(h.sefirah) ? "" : " — not yet opened"}
            </option>
          ))}
        </select>
      </label>
      <label>
        Card
        <select value={cardId} onChange={(e) => onChange(e.target.value)} aria-label={`${label} — Card`}>
          {cardsByHouse(selectedHouseId).map((c) => (
            <option key={c.id} value={c.id}>
              {c.index}. {c.title}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export interface DorotDrawPanelProps {
  mechanic: DorotMechanic;
  readingIndex: number;
  beneathEnabled: boolean;
  onBeneathEnabledChange: (enabled: boolean) => void;
  beneathCards: [string, string, string];
  onBeneathCardChange: (index: number, cardId: string) => void;
  councilEnabled: boolean;
  onCouncilEnabledChange: (enabled: boolean) => void;
  councilCard: string;
  onCouncilCardChange: (cardId: string) => void;
}

export function DorotDrawPanel({
  mechanic,
  readingIndex,
  beneathEnabled,
  onBeneathEnabledChange,
  beneathCards,
  onBeneathCardChange,
  councilEnabled,
  onCouncilEnabledChange,
  councilCard,
  onCouncilCardChange,
}: DorotDrawPanelProps) {
  if (mechanic.beneath === "none" && !mechanic.council) return null;

  const forced = mechanic.beneath === "forced-tishabav";
  const showBeneath = forced || (mechanic.beneath === "galut" && beneathEnabled);

  return (
    <div className={styles.dorotPanel}>
      <div className={styles.dorotTitle}>Derekh Ha'Dorot — drawn in this reading</div>

      {forced && (
        <p className={styles.lockNote}>
          The Ruined Vessel: on Tisha B'Av the 22 Letters are locked — the pure archetypes of
          the Land are inaccessible, and the Galut deck is drawn even in Jerusalem. The letters
          below remain part of the Treasury's record; the lock lives in the ritual itself.
        </p>
      )}

      {mechanic.beneath === "galut" && (
        <label className={styles.dorotToggle}>
          <input
            type="checkbox"
            checked={beneathEnabled}
            onChange={(e) => onBeneathEnabledChange(e.target.checked)}
          />{" "}
          The three Galut cards were drawn beneath the letters
        </label>
      )}

      {showBeneath &&
        BENEATH_LABELS.map((label, i) => (
          <HouseCardPicker
            key={label}
            label={label}
            cardId={beneathCards[i]}
            readingIndex={readingIndex}
            onChange={(cardId) => onBeneathCardChange(i, cardId)}
          />
        ))}

      {mechanic.council && (
        <>
          <label className={styles.dorotToggle}>
            <input
              type="checkbox"
              checked={councilEnabled}
              onChange={(e) => onCouncilEnabledChange(e.target.checked)}
            />{" "}
            The Council of Sefirot was performed (one card, in addition to the reading)
          </label>
          {councilEnabled && (
            <HouseCardPicker
              label="The Council of Sefirot"
              cardId={councilCard}
              readingIndex={readingIndex}
              onChange={onCouncilCardChange}
            />
          )}
        </>
      )}

      <p className={styles.dorotNote}>
        The second deck unfolds through the Seven Encounters — Houses beyond this
        participant's opened Pillars are marked, never barred.
      </p>
    </div>
  );
}

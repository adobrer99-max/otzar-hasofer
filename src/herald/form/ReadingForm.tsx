import { useEffect, useState } from "react";
import type {
  HeraldInputSnapshot,
  LetterDraw,
  ReadingPath,
  GeographyMode,
} from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import { middot } from "../../data/middot";
import { computeSacredTime } from "../../data/sacredTime";
import { getEncounterForReadingIndex } from "../../data/encounters";
import { PathToggle } from "./PathToggle";
import { OrientationToggle } from "./OrientationToggle";
import { LetterPicker } from "./LetterPicker";
import { FestivalSelect } from "./FestivalSelect";
import { SacredTimePanel } from "./SacredTimePanel";
import { EncounterPanel } from "./EncounterPanel";
import styles from "./form.module.css";

const drawLabels = ["First drawn", "Second drawn", "Third drawn"];

function emptyDraw(): LetterDraw {
  return { letterId: "aleph", orientation: "upright" };
}

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export interface ReadingFormProps {
  onSubmit: (input: HeraldInputSnapshot) => void;
  /** The participant's past-reading count (0 for their very first reading) — drives which Encounter this reading is. */
  readingIndex: number;
}

export function ReadingForm({ onSubmit, readingIndex }: ReadingFormProps) {
  const [path, setPath] = useState<ReadingPath>("brit");
  const [hebrewName, setHebrewName] = useState("");
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [palmNotes, setPalmNotes] = useState("");
  const [drawnLetters, setDrawnLetters] = useState<[LetterDraw, LetterDraw, LetterDraw]>([
    emptyDraw(),
    emptyDraw(),
    emptyDraw(),
  ]);
  const [veiledLetter, setVeiledLetter] = useState<LetterDraw>(emptyDraw());
  const [middah, setMiddah] = useState<SefirahId>("tiferet");
  const [geoMode, setGeoMode] = useState<GeographyMode>("land");
  const [place, setPlace] = useState("");
  const [festivalId, setFestivalId] = useState("ordinary");
  const [festivalManuallySet, setFestivalManuallySet] = useState(false);
  const [reflection, setReflection] = useState("");
  const [backdateEnabled, setBackdateEnabled] = useState(false);
  const [backdateValue, setBackdateValue] = useState(todayInputValue());

  const effectiveDate = backdateEnabled ? parseLocalDateInput(backdateValue) : new Date();
  const sacredTime = computeSacredTime(effectiveDate, geoMode);

  // Auto-detected sacred time is the primary path — it seeds the festival
  // selection whenever the effective date changes, but a manual override
  // (via FestivalSelect) always wins until the date changes again.
  useEffect(() => {
    if (!festivalManuallySet) {
      setFestivalId(sacredTime.activeFestivalIds[0] ?? "ordinary");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sacredTime.gregorianDate, geoMode]);

  function handleBackdateEnabledChange(enabled: boolean) {
    setBackdateEnabled(enabled);
    setFestivalManuallySet(false);
  }

  function handleBackdateValueChange(value: string) {
    setBackdateValue(value);
    setFestivalManuallySet(false);
  }

  function handleFestivalChange(id: string) {
    setFestivalId(id);
    setFestivalManuallySet(true);
  }

  function updateDraw(index: number, patch: Partial<LetterDraw>) {
    setDrawnLetters((prev) => {
      const next = [...prev] as [LetterDraw, LetterDraw, LetterDraw];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: HeraldInputSnapshot = {
      path,
      hebrewName: path === "brit" ? hebrewName || undefined : undefined,
      isFirstTime,
      palmNotes: palmNotes || undefined,
      drawnLetters,
      veiledLetter,
      middah,
      geography: { mode: geoMode, place: place || undefined },
      festivalId,
      reflection: reflection || undefined,
      sacredTime,
      encounterNumber: getEncounterForReadingIndex(readingIndex)?.number,
    };
    onSubmit(input);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <SacredTimePanel
        snapshot={sacredTime}
        backdateEnabled={backdateEnabled}
        backdateValue={backdateValue}
        onBackdateEnabledChange={handleBackdateEnabledChange}
        onBackdateValueChange={handleBackdateValueChange}
      />

      <EncounterPanel readingIndex={readingIndex} />

      <div className={styles.field}>
        <label>Path</label>
        <PathToggle value={path} onChange={setPath} />
      </div>

      {path === "brit" && (
        <div className={styles.field}>
          <label htmlFor="hebrew-name">Hebrew Name</label>
          <input
            id="hebrew-name"
            type="text"
            className="hebrew"
            dir="rtl"
            value={hebrewName}
            onChange={(e) => setHebrewName(e.target.value)}
          />
          {!hebrewName && (
            <p className={styles.hebrewNameNote}>
              The Treasury recognizes no Hebrew name at this time. The participant walks under
              their given name until another chapter of life suggests otherwise.
            </p>
          )}
        </div>
      )}

      {path === "noach" && (
        <p className={styles.hebrewNameNote}>
          As a Noahide, the participant may never adopt a Hebrew name — that's perfectly
          acceptable. Their Herald becomes their primary symbolic identity.
        </p>
      )}

      <div className={styles.field}>
        <label>
          <input
            type="checkbox"
            checked={isFirstTime}
            onChange={(e) => setIsFirstTime(e.target.checked)}
          />{" "}
          First reading for this participant (recite Shecheyanu — becomes the Origin Herald)
        </label>
      </div>

      <div className={styles.field}>
        <label htmlFor="palm-notes">Palm Baseline Notes (Chai · Lev · Rosh)</label>
        <textarea
          id="palm-notes"
          value={palmNotes}
          onChange={(e) => setPalmNotes(e.target.value)}
        />
      </div>

      {drawnLetters.map((draw, index) => (
        <div className={styles.drawGroup} key={index}>
          <div className={styles.drawRow}>
            <LetterPicker
              label={drawLabels[index]}
              value={draw.letterId}
              onChange={(letterId) => updateDraw(index, { letterId })}
            />
            <OrientationToggle
              value={draw.orientation}
              onChange={(orientation) => updateDraw(index, { orientation })}
            />
          </div>
        </div>
      ))}

      <div className={`${styles.drawGroup} ${styles.veiled}`}>
        <div className={styles.drawRow}>
          <LetterPicker
            label="Veiled letter (sealed — the Sod, kept from the Herald)"
            value={veiledLetter.letterId}
            onChange={(letterId) => setVeiledLetter((v) => ({ ...v, letterId }))}
          />
          <OrientationToggle
            value={veiledLetter.orientation}
            onChange={(orientation) => setVeiledLetter((v) => ({ ...v, orientation }))}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="middah">Dominant Middah</label>
        <select id="middah" value={middah} onChange={(e) => setMiddah(e.target.value as SefirahId)}>
          {middot.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label>Geography</label>
        <div className={styles.segmented} role="group" aria-label="Geography">
          <button
            type="button"
            className={geoMode === "land" ? styles.active : undefined}
            onClick={() => setGeoMode("land")}
          >
            Land
          </button>
          <button
            type="button"
            className={geoMode === "galut" ? styles.active : undefined}
            onClick={() => setGeoMode("galut")}
          >
            Galut
          </button>
        </div>
        <input
          type="text"
          placeholder="Place (optional)"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
        />
      </div>

      <FestivalSelect value={festivalId} onChange={handleFestivalChange} />

      <div className={styles.field}>
        <label htmlFor="reflection">Personal Reflection</label>
        <textarea
          id="reflection"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
        />
      </div>

      <button type="submit" className={styles.submit}>
        Create this Reading's Herald
      </button>
    </form>
  );
}

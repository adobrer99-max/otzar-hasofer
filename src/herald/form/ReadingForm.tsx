import { useState } from "react";
import type {
  HeraldInputSnapshot,
  LetterDraw,
  ReadingPath,
  GeographyMode,
} from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import { middot } from "../../data/middot";
import { PathToggle } from "./PathToggle";
import { OrientationToggle } from "./OrientationToggle";
import { LetterPicker } from "./LetterPicker";
import { FestivalSelect } from "./FestivalSelect";
import styles from "./form.module.css";

const drawLabels = ["First drawn", "Second drawn", "Third drawn"];

function emptyDraw(): LetterDraw {
  return { letterId: "aleph", orientation: "upright" };
}

export interface ReadingFormProps {
  onSubmit: (input: HeraldInputSnapshot) => void;
}

export function ReadingForm({ onSubmit }: ReadingFormProps) {
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
  const [reflection, setReflection] = useState("");

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
    };
    onSubmit(input);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
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
        </div>
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

      <FestivalSelect value={festivalId} onChange={setFestivalId} />

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

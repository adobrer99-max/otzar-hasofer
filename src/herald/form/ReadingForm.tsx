import { useEffect, useState } from "react";
import type {
  HeraldInputSnapshot,
  LetterDraw,
  ReadingPath,
  GeographyMode,
  DorotDraw,
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
import { DorotDrawPanel, firstCardOfHouse } from "./DorotDrawPanel";
import { resolveDorotMechanic } from "../dorot/dorotMechanics";
import { resolveSpread } from "../spreads/resolveSpread";
import { drawLetters, drawOne } from "../deck/deck";
import { DealReveal, type RevealCard, type RevealWord } from "../deck/DealReveal";
import { DeckStack } from "../deck/DeckStack";
import { resolveShoresh } from "../shoresh/resolveShoresh";
import styles from "./form.module.css";

const drawLabels = ["First drawn", "Second drawn", "Third drawn"];
const etzChaimLabels = [
  "The Roots — Assiyah (first drawn)",
  "The Trunk — Yetzirah (second drawn)",
  "The Branches — Briyah (third drawn)",
];

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

export interface RitualNotes {
  /** First reading after an Aliyah: "today your reading begins with the Letters Alone." */
  lettersAlone?: boolean;
  /** A Bris was recorded and this is the child's first page. */
  bris?: boolean;
  /** First reading after a Bar/Bat Mitzvah — conducted together. */
  barBatMitzvah?: boolean;
}

export interface ReadingFormProps {
  onSubmit: (input: HeraldInputSnapshot) => void;
  /** The participant's past-reading count (0 for their very first reading) — drives which Encounter this reading is. */
  readingIndex: number;
  /** Soft life-cycle framing lines — guidance, never restrictions. */
  ritualNotes?: RitualNotes;
}

export function ReadingForm({ onSubmit, readingIndex, ritualNotes }: ReadingFormProps) {
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
  const [fourthLetter, setFourthLetter] = useState<LetterDraw>(emptyDraw());
  const [middah, setMiddah] = useState<SefirahId>("tiferet");
  const [geoMode, setGeoMode] = useState<GeographyMode>("land");
  const [place, setPlace] = useState("");
  const [festivalId, setFestivalId] = useState("ordinary");
  const [festivalManuallySet, setFestivalManuallySet] = useState(false);
  const [reflection, setReflection] = useState("");
  const [backdateEnabled, setBackdateEnabled] = useState(false);
  const [backdateValue, setBackdateValue] = useState(todayInputValue());
  const defaultCard = firstCardOfHouse("house-abraham");
  const [beneathEnabled, setBeneathEnabled] = useState(true);
  const [beneathCards, setBeneathCards] = useState<[string, string, string]>([
    defaultCard,
    defaultCard,
    defaultCard,
  ]);
  const [councilEnabled, setCouncilEnabled] = useState(true);
  const [councilCard, setCouncilCard] = useState(defaultCard);
  // The ceremonial reveal for a fresh draw (presentation only).
  const [reveal, setReveal] = useState<{ cards: RevealCard[]; nonce: number; word: RevealWord | null }>({
    cards: [],
    nonce: 0,
    word: null,
  });
  // Which slots the Scribe has actually placed (drawn or edited). The empty
  // sentinel is a real letter, so filled-ness can't be read from the value.
  const [placedSlots, setPlacedSlots] = useState<Set<string>>(() => new Set());

  const effectiveDate = backdateEnabled ? parseLocalDateInput(backdateValue) : new Date();
  const sacredTime = computeSacredTime(effectiveDate, geoMode);
  const dorotMechanic = resolveDorotMechanic(festivalId, geoMode);
  const lettersLocked = dorotMechanic.beneath === "forced-tishabav";
  const spread = resolveSpread(festivalId);

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

  function markPlaced(key: string) {
    setPlacedSlots((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  function updateDraw(index: number, patch: Partial<LetterDraw>) {
    setDrawnLetters((prev) => {
      const next = [...prev] as [LetterDraw, LetterDraw, LetterDraw];
      next[index] = { ...next[index], ...patch };
      return next;
    });
    markPlaced(String(index));
  }

  function updateFourth(patch: Partial<LetterDraw>) {
    setFourthLetter((v) => ({ ...v, ...patch }));
    markPlaced("fourth");
  }

  function updateVeiled(patch: Partial<LetterDraw>) {
    setVeiledLetter((v) => ({ ...v, ...patch }));
    markPlaced("veiled");
  }

  /** The slots this spread actually draws into, in draw order. */
  function activeSlotKeys(): string[] {
    return spread === "etz-chaim" ? ["0", "1", "2", "fourth", "veiled"] : ["0", "1", "2", "veiled"];
  }

  /** Letter ids already placed (for without-replacement draws); optionally skip a slot. */
  function placedLetterIds(excludeKey?: string): string[] {
    const out: string[] = [];
    const push = (key: string, d: LetterDraw) => {
      if (placedSlots.has(key) && key !== excludeKey) out.push(d.letterId);
    };
    push("0", drawnLetters[0]);
    push("1", drawnLetters[1]);
    push("2", drawnLetters[2]);
    if (spread === "etz-chaim") push("fourth", fourthLetter);
    push("veiled", veiledLetter);
    return out;
  }

  function placeSlot(key: string, card: LetterDraw) {
    if (key === "veiled") updateVeiled(card);
    else if (key === "fourth") updateFourth(card);
    else updateDraw(Number(key), card);
  }

  /** The Word the three open letters spell — a triadic-only closing flourish. */
  function wordForOpen(ids: [string, string, string]): RevealWord | null {
    if (spread !== "triadic") return null; // Etz Chaim: PaRDeS precedence; Yichud: pairs, not a root
    const r = resolveShoresh(ids);
    if (r.tier === "root") return { text: r.word, gloss: r.gloss };
    if (r.tier === "name") return { text: r.name, gloss: r.gloss };
    return null;
  }

  // Deal the whole spread at once — a true, random draw of distinct cards (each
  // landing upright or reversed). The Scribe can still adjust any card afterward;
  // the drawn result is what the reading records.
  function handleDrawFromDeck() {
    if (lettersLocked) return;
    const openCount = spread === "etz-chaim" ? 4 : 3;
    const cards = drawLetters(openCount + 1);
    setDrawnLetters([cards[0], cards[1], cards[2]]);
    if (spread === "etz-chaim") setFourthLetter(cards[3]);
    setVeiledLetter(cards[cards.length - 1]);
    setPlacedSlots(new Set(activeSlotKeys()));
    // The last card is the veiled anchor — kept sealed in the reveal, except on
    // Tu B'Av (yichud), when the anchor is drawn openly.
    const veiledSealed = spread !== "yichud";
    const revealCards: RevealCard[] = cards.map((draw, i) => ({
      draw,
      sealed: i === cards.length - 1 && veiledSealed,
    }));
    const word = wordForOpen([cards[0].letterId, cards[1].letterId, cards[2].letterId]);
    setReveal((r) => ({ cards: revealCards, nonce: r.nonce + 1, word }));
  }

  /** Draw the next unfilled slot in order — one card at a time. */
  function handleDrawNext() {
    if (lettersLocked) return;
    const nextKey = activeSlotKeys().find((k) => !placedSlots.has(k));
    if (!nextKey) return;
    drawIntoSlot(nextKey);
  }

  /** Draw a single card into one slot (per-slot draw), respecting the deck so far. */
  function drawIntoSlot(key: string) {
    if (lettersLocked) return;
    const card = drawOne(placedLetterIds(key));
    placeSlot(key, card);
    const sealed = key === "veiled" && spread !== "yichud";
    setReveal((r) => ({ cards: [{ draw: card, sealed }], nonce: r.nonce + 1, word: null }));
  }

  const activeKeys = activeSlotKeys();
  const drawnCount = activeKeys.filter((k) => placedSlots.has(k)).length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dorotDraws: DorotDraw[] = [];
    if (
      dorotMechanic.beneath === "forced-tishabav" ||
      (dorotMechanic.beneath === "galut" && beneathEnabled)
    ) {
      dorotDraws.push(
        { cardId: beneathCards[0], role: "beneath-first" },
        { cardId: beneathCards[1], role: "beneath-second" },
        { cardId: beneathCards[2], role: "beneath-third" },
      );
    }
    if (dorotMechanic.council && councilEnabled) {
      dorotDraws.push({ cardId: councilCard, role: "council" });
    }
    const input: HeraldInputSnapshot = {
      path,
      hebrewName: path === "brit" ? hebrewName || undefined : undefined,
      isFirstTime,
      palmNotes: palmNotes || undefined,
      drawnLetters,
      veiledLetter,
      fourthLetter: spread === "etz-chaim" ? fourthLetter : undefined,
      spread: spread === "triadic" ? undefined : spread,
      middah,
      geography: { mode: geoMode, place: place || undefined },
      festivalId,
      reflection: reflection || undefined,
      sacredTime,
      encounterNumber: getEncounterForReadingIndex(readingIndex)?.number,
      dorotDraws: dorotDraws.length > 0 ? dorotDraws : undefined,
    };
    onSubmit(input);
    setPlacedSlots(new Set()); // a fresh spread for the next reading
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <fieldset className={styles.section}>
      <legend className={styles.legend}>
        <span className={styles.legendNum}>I</span> The Timing
      </legend>
      <SacredTimePanel
        snapshot={sacredTime}
        backdateEnabled={backdateEnabled}
        backdateValue={backdateValue}
        onBackdateEnabledChange={handleBackdateEnabledChange}
        onBackdateValueChange={handleBackdateValueChange}
      />

      <EncounterPanel readingIndex={readingIndex} />

      {ritualNotes?.lettersAlone && (
        <p className={styles.hebrewNameNote}>
          Today your reading begins with the Letters alone. The geography has changed; the
          Galut cards cease to matter.
        </p>
      )}
      {ritualNotes?.bris && (
        <p className={styles.hebrewNameNote}>
          The parents receive this reading. The Herald begins; the Treasury opens; the child's
          first page is created. No conclusions. Only blessing.
        </p>
      )}
      {ritualNotes?.barBatMitzvah && (
        <p className={styles.hebrewNameNote}>
          The participant conducts this reading with the Scribe. Not alone. Together.
        </p>
      )}
      </fieldset>

      <fieldset className={styles.section}>
      <legend className={styles.legend}>
        <span className={styles.legendNum}>II</span> The Participant
      </legend>
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

      <details className={styles.disclosure}>
        <summary>Palm baseline notes (optional)</summary>
        <div className={styles.field}>
          <label htmlFor="palm-notes">Chai · Lev · Rosh</label>
          <textarea
            id="palm-notes"
            value={palmNotes}
            onChange={(e) => setPalmNotes(e.target.value)}
          />
        </div>
      </details>
      </fieldset>

      <fieldset className={styles.section}>
      <legend className={styles.legend}>
        <span className={styles.legendNum}>III</span> The Draw
      </legend>
      {spread === "etz-chaim" && (
        <p className={styles.hebrewNameNote}>
          Tu Bishvat — the Etz Chaim. The standard spread gives way to the Vertical Four-Card
          Draw: roots, trunk, branches, and fruit, one for each of the Four Worlds. The PaRDeS
          framework — the Orchard itself — takes precedence over the Shoresh this day.
        </p>
      )}
      {spread === "yichud" && (
        <p className={styles.hebrewNameNote}>
          Tu B'Av — the Yichud. The veiled anchor is unveiled, for this day is about
          transparency and the lifting of veils. Four letters, two pairs; the reading looks
          only for synthesis — between each letter in the pair, and between each pair.
        </p>
      )}

      {!lettersLocked && (
        <DeckStack
          drawn={drawnCount}
          total={activeKeys.length}
          canDrawNext={drawnCount < activeKeys.length}
          onDrawNext={handleDrawNext}
          onDealAll={handleDrawFromDeck}
        />
      )}

      <DealReveal
        cards={reveal.cards}
        nonce={reveal.nonce}
        word={reveal.word}
        onDone={() => setReveal((r) => ({ ...r, cards: [] }))}
      />

      {drawnLetters.map((draw, index) => (
        <div className={`${styles.drawGroup} ${lettersLocked ? styles.lettersLocked : ""}`} key={index}>
          <div className={styles.drawRow}>
            <LetterPicker
              label={spread === "etz-chaim" ? etzChaimLabels[index] : drawLabels[index]}
              value={draw.letterId}
              onChange={(letterId) => updateDraw(index, { letterId })}
            />
            <OrientationToggle
              value={draw.orientation}
              onChange={(orientation) => updateDraw(index, { orientation })}
            />
            {!lettersLocked && (
              <button
                type="button"
                className={styles.slotDraw}
                onClick={() => drawIntoSlot(String(index))}
                aria-label={`Draw a card for ${drawLabels[index]}`}
              >
                ✦ Draw
              </button>
            )}
          </div>
        </div>
      ))}

      {spread === "etz-chaim" && (
        <div className={styles.drawGroup}>
          <div className={styles.drawRow}>
            <LetterPicker
              label="The Fruit — Atzilut (fourth drawn)"
              value={fourthLetter.letterId}
              onChange={(letterId) => updateFourth({ letterId })}
            />
            <OrientationToggle
              value={fourthLetter.orientation}
              onChange={(orientation) => updateFourth({ orientation })}
            />
            {!lettersLocked && (
              <button
                type="button"
                className={styles.slotDraw}
                onClick={() => drawIntoSlot("fourth")}
                aria-label="Draw a card for the Fruit"
              >
                ✦ Draw
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={`${styles.drawGroup} ${styles.veiled} ${lettersLocked ? styles.lettersLocked : ""}`}
      >
        <div className={styles.drawRow}>
          <LetterPicker
            label={
              spread === "etz-chaim"
                ? "The Fifth Card — Olam Ha'Ba, the world to come (sealed)"
                : spread === "yichud"
                  ? "The Unveiled Anchor — drawn openly, rendered this day"
                  : "Veiled letter (sealed — the Sod, kept from the Herald)"
            }
            value={veiledLetter.letterId}
            onChange={(letterId) => updateVeiled({ letterId })}
          />
          <OrientationToggle
            value={veiledLetter.orientation}
            onChange={(orientation) => updateVeiled({ orientation })}
          />
          {!lettersLocked && (
            <button
              type="button"
              className={styles.slotDraw}
              onClick={() => drawIntoSlot("veiled")}
              aria-label="Draw the veiled card"
            >
              ✦ Draw
            </button>
          )}
        </div>
      </div>

      <DorotDrawPanel
        mechanic={dorotMechanic}
        readingIndex={readingIndex}
        beneathEnabled={beneathEnabled}
        onBeneathEnabledChange={setBeneathEnabled}
        beneathCards={beneathCards}
        onBeneathCardChange={(index, cardId) =>
          setBeneathCards((prev) => {
            const next = [...prev] as [string, string, string];
            next[index] = cardId;
            return next;
          })
        }
        councilEnabled={councilEnabled}
        onCouncilEnabledChange={setCouncilEnabled}
        councilCard={councilCard}
        onCouncilCardChange={setCouncilCard}
      />

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
      </fieldset>

      <fieldset className={styles.section}>
      <legend className={styles.legend}>
        <span className={styles.legendNum}>IV</span> The Setting
      </legend>
      <div className={styles.field}>
        <label>Geography</label>
        <div className={styles.segmented} role="group" aria-label="Geography">
          <button
            type="button"
            className={geoMode === "land" ? styles.active : undefined}
            aria-pressed={geoMode === "land"}
            onClick={() => setGeoMode("land")}
          >
            Land
          </button>
          <button
            type="button"
            className={geoMode === "galut" ? styles.active : undefined}
            aria-pressed={geoMode === "galut"}
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
      </fieldset>

      <div className={styles.actionBar}>
        <span className={styles.drawHint} aria-live="polite">
          ✦ {drawnCount} of {activeKeys.length} letters placed
        </span>
        <button type="submit" className={styles.submit}>
          Create this Reading's Herald
        </button>
      </div>
    </form>
  );
}

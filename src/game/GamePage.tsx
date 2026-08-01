import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { dorotCardsById, dorotHousesById } from "../data/dorot";
import { lettersById } from "../data/letters";
import { Button, Callout, DecoratedRule, PageHeader } from "../components/ui";
import {
  currentAscent,
  saveAscent,
  type AscentRecord,
} from "../storage/ascentRepo";
import { abilityByLetter, type Grace, type Verb } from "./abilities";
import { GameCanvas, type HudSample } from "./GameCanvas";
import { ABYSS_AFTER_REGION, regionAt, regions, TOTAL_REGIONS } from "./regions";
import { readAscentTime } from "./sacredAscent";
import { buildRegion, verbsOf } from "./world/build";
import type { World } from "./world/types";
import styles from "./GamePage.module.css";

/**
 * Ma'alot — the Ascent of the Tree.
 *
 * The page owns the *ascent*: which region the Scribe is in, which letters
 * they carry, what the day's Sacred Time grants. `GameCanvas` owns the world
 * and the sixty-per-second simulation inside it. The two meet at exactly four
 * events — a letter found, a House met, a region finished, and a periodic
 * sample for the HUD — which is what keeps a game loop from leaking into a
 * React tree.
 */

type Plate =
  | { kind: "letter"; letterId: string }
  | { kind: "house"; cardId: string }
  | { kind: "region-done" }
  | { kind: "abyss" }
  | { kind: "sealed" };

const NEW_ID = () =>
  `ascent-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

export function GamePage() {
  const [ascent, setAscent] = useState<AscentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [world, setWorld] = useState<World | null>(null);
  const [plate, setPlate] = useState<Plate | null>(null);
  const [hud, setHud] = useState<HudSample>({ or: 0, veiled: false });
  const [showKeys, setShowKeys] = useState(false);

  // Read inside a setState updater, where reading `time` directly would make
  // the callback depend on it and re-create on every render.
  const lightRef = useRef(1);

  // The day's Sacred Time, computed once — the seed, the ascendant letter of
  // the month, and whatever the festival calendar grants.
  const time = useMemo(() => readAscentTime(new Date()), []);
  lightRef.current = time.lightOfTheDay;

  useEffect(() => {
    let cancelled = false;
    currentAscent()
      .then((found) => {
        if (cancelled) return;
        setAscent(found ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const letters = ascent?.lettersHeld ?? [];
  const verbs: Verb[] = useMemo(() => verbsOf(letters), [letters]);
  const graces: Grace[] = useMemo(
    () =>
      letters
        .map((id) => abilityByLetter[id]?.grace)
        .filter((g): g is Grace => Boolean(g)),
    [letters],
  );

  // Persisting is fire-and-forget: a dropped write costs at most one region's
  // progress, and blocking the game on IndexedDB would be far worse.
  const persist = useCallback((next: AscentRecord) => {
    setAscent(next);
    void saveAscent(next).catch(() => undefined);
  }, []);

  const enterRegion = useCallback((record: AscentRecord) => {
    setWorld(buildRegion(record.regionIndex, record.seed, time.lightOfTheDay));
    setPlate(null);
  }, [time.lightOfTheDay]);

  const beginAscent = useCallback(() => {
    const now = new Date().toISOString();
    const record: AscentRecord = {
      id: NEW_ID(),
      seed: time.seed,
      seedLabel: time.seedLabel,
      createdAt: now,
      updatedAt: now,
      regionIndex: 1,
      lettersHeld: [],
      or: 0,
      regionsCleared: [],
      housesMet: [],
      sacredNotes: time.notes,
      ascendantLetterId: time.ascendantLetterId,
    };
    persist(record);
    enterRegion(record);
  }, [time, persist, enterRegion]);

  const resumeAscent = useCallback(() => {
    if (ascent) enterRegion(ascent);
  }, [ascent, enterRegion]);

  // --- the four events the world raises ------------------------------------

  const onLetter = useCallback(
    (letterId: string) => {
      setPlate({ kind: "letter", letterId });
      setAscent((prev) =>
        prev && !prev.lettersHeld.includes(letterId)
          ? { ...prev, lettersHeld: [...prev.lettersHeld, letterId], updatedAt: new Date().toISOString() }
          : prev,
      );
    },
    [],
  );

  const onHouse = useCallback((cardId: string) => {
    setPlate({ kind: "house", cardId });
    setAscent((prev) =>
      prev && !prev.housesMet.includes(cardId)
        ? { ...prev, housesMet: [...prev.housesMet, cardId], updatedAt: new Date().toISOString() }
        : prev,
    );
  }, []);

  const onFinish = useCallback(() => {
    setAscent((prev) => {
      if (!prev) return prev;
      const cleared = prev.regionsCleared.includes(prev.regionIndex)
        ? prev.regionsCleared
        : [...prev.regionsCleared, prev.regionIndex];
      const next: AscentRecord = {
        ...prev,
        regionsCleared: cleared,
        or: prev.or + (world?.or ?? 0),
        updatedAt: new Date().toISOString(),
      };
      void saveAscent(next).catch(() => undefined);
      return next;
    });
    setPlate(
      ascent?.regionIndex === TOTAL_REGIONS
        ? { kind: "sealed" }
        : ascent?.regionIndex === ABYSS_AFTER_REGION
          ? { kind: "abyss" }
          : { kind: "region-done" },
    );
  }, [ascent?.regionIndex, world]);

  const climbOn = useCallback(() => {
    setAscent((prev) => {
      if (!prev) return prev;
      const next: AscentRecord = {
        ...prev,
        regionIndex: Math.min(TOTAL_REGIONS, prev.regionIndex + 1),
        updatedAt: new Date().toISOString(),
      };
      void saveAscent(next).catch(() => undefined);
      setWorld(buildRegion(next.regionIndex, next.seed, lightRef.current));
      return next;
    });
    setPlate(null);
  }, []);

  const sealAscent = useCallback(() => {
    setAscent((prev) => {
      if (!prev) return prev;
      const next: AscentRecord = { ...prev, sealedAt: new Date().toISOString() };
      void saveAscent(next).catch(() => undefined);
      return next;
    });
    setWorld(null);
    setPlate(null);
  }, []);

  // Dismiss a plate with the keyboard, so a run never needs the mouse.
  useEffect(() => {
    if (!plate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== "Escape" && e.code !== "Space") return;
      e.preventDefault();
      if (plate.kind === "letter" || plate.kind === "house") setPlate(null);
      else if (plate.kind === "sealed") sealAscent();
      else climbOn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plate, climbOn, sealAscent]);

  // Persist letters as they are found, without writing on every frame.
  const lastSaved = useRef("");
  useEffect(() => {
    if (!ascent) return;
    const signature = `${ascent.regionIndex}|${ascent.lettersHeld.join(",")}|${ascent.housesMet.length}`;
    if (signature === lastSaved.current) return;
    lastSaved.current = signature;
    void saveAscent(ascent).catch(() => undefined);
  }, [ascent]);

  if (loading) return <div className={styles.page} />;

  const region = ascent ? regionAt(ascent.regionIndex) : undefined;

  return (
    <div className={styles.page}>
      {/* The full illuminated header belongs to the threshold. Once a climb is
          underway it collapses to a single line, so the canvas sits at the top
          of the screen where a game belongs rather than below the fold. */}
      {world ? (
        <div className={styles.runningHeader}>
          <span className={styles.runningKicker}>The Practice</span>
          <h1 className={styles.runningTitle}>
            Ma'alot <span className={`${styles.runningHeb} hebrew`} lang="he">מַעֲלוֹת</span>
          </h1>
        </div>
      ) : (
        <PageHeader
          kicker="The Practice"
          title="Ma'alot — The Ascent of the Tree"
          hebrew="מַעֲלוֹת"
          lede="Climb from Malchut to Keter on the twenty-two letters. Each letter you find is a power drawn from its own ancient sense — Vav the hook, Mem the water, Chet the fence — and the way up opens as the alphabet does. Nothing here can kill you: a fall or a thorn only veils you, and you wake at your mark."
        />
      )}

      {!world && <Threshold ascent={ascent} time={time} onBegin={beginAscent} onResume={resumeAscent} />}

      {world && ascent && region && (
        <>
          <div className={styles.hud}>
            <div className={styles.hudRegion}>
              <span className={styles.hudStep}>
                {ascent.regionIndex} / {TOTAL_REGIONS}
              </span>
              <span className={styles.hudName}>{region.name}</span>
              <span className={`${styles.hudHeb} hebrew`} lang="he">
                {region.hebrew}
              </span>
            </div>
            <div className={styles.hudOr} title="Light gathered in this region">
              <span aria-hidden="true">✦</span> {hud.or}
            </div>
            <LetterBelt held={ascent.lettersHeld} ascendant={ascent.ascendantLetterId} />
          </div>

          <GameCanvas
            world={world}
            verbs={verbs}
            graces={graces}
            paused={plate !== null}
            onLetter={onLetter}
            onHouse={onHouse}
            onFinish={onFinish}
            onSample={setHud}
          />

          <p className={styles.caption} role="status" aria-live="polite">
            {hud.message ?? region.teaching}
          </p>

          <div className={styles.controls}>
            <Button variant="subtle" onClick={() => setShowKeys((v) => !v)} aria-expanded={showKeys}>
              {showKeys ? "Hide the keys" : "The keys"}
            </Button>
            <span className={styles.controlsHint}>
              Arrows or WASD to move · Space to leap · X to act · C to cross
            </span>
          </div>

          {showKeys && <Keys held={ascent.lettersHeld} />}
        </>
      )}

      {plate && <PlateOverlay plate={plate} ascent={ascent} onNext={climbOn} onSeal={sealAscent} onClose={() => setPlate(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// the threshold: begin, or resume
// ---------------------------------------------------------------------------

function Threshold({
  ascent,
  time,
  onBegin,
  onResume,
}: {
  ascent: AscentRecord | null;
  time: ReturnType<typeof readAscentTime>;
  onBegin: () => void;
  onResume: () => void;
}) {
  const sealed = ascent?.sealedAt;
  return (
    <section className={styles.threshold}>
      <div className={styles.thresholdInner}>
        <p className={styles.seedLine}>
          Today is <strong>{time.seedLabel}</strong>. The Tree is seeded by the Hebrew date, so every
          Scribe who begins today climbs the same one.
        </p>

        {time.notes.length > 0 && (
          <ul className={styles.notes}>
            {time.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        <DecoratedRule />

        <div className={styles.thresholdActions}>
          {ascent && !sealed ? (
            <>
              <Button variant="primary" onClick={onResume}>
                Resume the ascent — {regionAt(ascent.regionIndex).name}
              </Button>
              <Button onClick={onBegin}>Begin again from Malchut</Button>
            </>
          ) : (
            <Button variant="primary" onClick={onBegin}>
              Begin the ascent
            </Button>
          )}
        </div>

        {sealed && ascent && (
          <Callout>
            Your last ascent reached the crown with {ascent.lettersHeld.length} of the twenty-two
            letters found and {ascent.or} light gathered.
          </Callout>
        )}

        <DecoratedRule />

        <ol className={styles.ladder}>
          {[...regions].reverse().map((r) => {
            const done = ascent?.regionsCleared.includes(r.index);
            const here = ascent && !sealed && ascent.regionIndex === r.index;
            return (
              <li
                key={r.index}
                className={[styles.rung, done ? styles.rungDone : "", here ? styles.rungHere : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={`${styles.rungHeb} hebrew`} lang="he">
                  {r.hebrew}
                </span>
                <span className={styles.rungName}>{r.name}</span>
                <span className={styles.rungMiddah}>{r.middah}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// HUD pieces
// ---------------------------------------------------------------------------

function LetterBelt({ held, ascendant }: { held: readonly string[]; ascendant?: string }) {
  return (
    <ul className={styles.belt} aria-label="Letters found">
      {held.map((id) => {
        const letter = lettersById[id];
        const ability = abilityByLetter[id];
        if (!letter) return null;
        return (
          <li
            key={id}
            className={`${styles.beltLetter} ${id === ascendant ? styles.beltAscendant : ""}`}
            title={ability ? `${letter.name} — ${ability.name}: ${ability.use}` : letter.name}
          >
            <span className="hebrew" lang="he">
              {letter.glyph}
            </span>
          </li>
        );
      })}
      {held.length === 0 && <li className={styles.beltEmpty}>No letters yet</li>}
    </ul>
  );
}

/** What each letter in hand actually does, for a Scribe who has forgotten. */
function Keys({ held }: { held: readonly string[] }) {
  if (held.length === 0) {
    return (
      <Callout>
        You carry no letters yet. Walk right, and the first alcove of Malchut will give you one.
      </Callout>
    );
  }
  return (
    <ul className={styles.keys}>
      {held.map((id) => {
        const ability = abilityByLetter[id];
        const letter = lettersById[id];
        if (!ability || !letter) return null;
        return (
          <li key={id} className={styles.key}>
            <span className={`${styles.keyGlyph} hebrew`} lang="he">
              {letter.glyph}
            </span>
            <div>
              <p className={styles.keyName}>
                {ability.name} <span className={styles.keyKind}>{ability.kind === "verb" ? "verb" : "grace"}</span>
              </p>
              <p className={styles.keyUse}>{ability.use}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// plates
// ---------------------------------------------------------------------------

function PlateOverlay({
  plate,
  ascent,
  onNext,
  onSeal,
  onClose,
}: {
  plate: Plate;
  ascent: AscentRecord | null;
  onNext: () => void;
  onSeal: () => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.plateScrim} role="dialog" aria-modal="true">
      <div className={styles.plate}>
        {plate.kind === "letter" && <LetterPlate letterId={plate.letterId} onClose={onClose} />}
        {plate.kind === "house" && <HousePlate cardId={plate.cardId} onClose={onClose} />}
        {plate.kind === "region-done" && ascent && <RegionDonePlate ascent={ascent} onNext={onNext} />}
        {plate.kind === "abyss" && <AbyssPlate onNext={onNext} />}
        {plate.kind === "sealed" && ascent && <SealedPlate ascent={ascent} onSeal={onSeal} />}
      </div>
    </div>
  );
}

function LetterPlate({ letterId, onClose }: { letterId: string; onClose: () => void }) {
  const letter = lettersById[letterId];
  const ability = abilityByLetter[letterId];
  if (!letter || !ability) return null;
  return (
    <>
      <p className={styles.plateKicker}>A letter is found</p>
      <div className={`${styles.plateGlyph} hebrew`} lang="he">
        {letter.glyph}
      </div>
      <h2 className={styles.plateTitle}>
        {letter.name} — {ability.name}
      </h2>
      <p className={`${styles.plateHeb} hebrew`} lang="he">
        {ability.hebrew}
      </p>
      <p className={styles.plateUse}>{ability.use}</p>
      <p className={styles.plateDerivation}>{ability.derivation}</p>
      <p className={styles.plateSource}>
        <Link to={`/guide/letters/${letter.id}`}>Read the chapter on {letter.name} →</Link>
      </p>
      <Button variant="primary" onClick={onClose} autoFocus>
        Take it up
      </Button>
    </>
  );
}

function HousePlate({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const card = dorotCardsById[cardId];
  const house = card ? dorotHousesById[card.houseId] : undefined;
  if (!card) return null;
  return (
    <>
      <p className={styles.plateKicker}>
        {house ? `The House of ${house.figure}` : "A House of the Dorot"}
      </p>
      <h2 className={styles.plateTitle}>{card.title}</h2>
      {house?.houseName && <p className={styles.plateHeb}>{house.houseName}</p>}
      <p className={styles.plateUse}>{card.episode}</p>
      {card.humanPractice && <p className={styles.plateDerivation}>{card.humanPractice}</p>}
      {card.question && <p className={styles.plateQuestion}>{card.question}</p>}
      {house && (
        <p className={styles.plateSource}>
          <Link to={`/guide/dorot/${house.id}`}>Read the House of {house.figure} →</Link>
        </p>
      )}
      <Button variant="primary" onClick={onClose} autoFocus>
        Walk on
      </Button>
    </>
  );
}

function RegionDonePlate({ ascent, onNext }: { ascent: AscentRecord; onNext: () => void }) {
  const done = regionAt(ascent.regionIndex);
  const next = regionAt(Math.min(TOTAL_REGIONS, ascent.regionIndex + 1));
  return (
    <>
      <p className={styles.plateKicker}>{done.name} is behind you</p>
      <h2 className={styles.plateTitle}>The way opens to {next.name}</h2>
      <p className={`${styles.plateHeb} hebrew`} lang="he">
        {next.hebrew}
      </p>
      <p className={styles.plateUse}>{next.teaching}</p>
      <p className={styles.plateDerivation}>
        {ascent.lettersHeld.length} of the twenty-two letters found · {ascent.or} light gathered.
      </p>
      <Button variant="primary" onClick={onNext} autoFocus>
        Climb on
      </Button>
    </>
  );
}

function AbyssPlate({ onNext }: { onNext: () => void }) {
  return (
    <>
      <p className={styles.plateKicker}>The Abyss</p>
      <h2 className={styles.plateTitle}>Da'at — the crossing</h2>
      <p className={`${styles.plateHeb} hebrew`} lang="he">
        דעת
      </p>
      <p className={styles.plateUse}>
        Chesed is behind you and the supernal three are above. Da'at is not a Sefirah and there is
        no station here — only the gap that the lower seven do not reach across.
      </p>
      <p className={styles.plateDerivation}>
        Beyond it there are no more Houses. Binah, Chochmah and Keter are crossed on the letters
        alone.
      </p>
      <Button variant="primary" onClick={onNext} autoFocus>
        Cross
      </Button>
    </>
  );
}

function SealedPlate({ ascent, onSeal }: { ascent: AscentRecord; onSeal: () => void }) {
  const found = ascent.lettersHeld.length;
  const all = found === 22;
  return (
    <>
      <p className={styles.plateKicker}>Keter</p>
      <h2 className={styles.plateTitle}>The crown is reached</h2>
      <p className={`${styles.plateHeb} hebrew`} lang="he">
        כתר
      </p>
      <p className={styles.plateUse}>
        {all
          ? "All twenty-two letters are in your hand. The alphabet is complete, and the Tree was climbed on nothing else."
          : `You arrive carrying ${found} of the twenty-two letters. The crown is reached either way — that was never in question — but the letters left in the regions below are still there.`}
      </p>
      <ul className={styles.sealedLetters}>
        {ascent.lettersHeld.map((id) => (
          <li key={id} className="hebrew" lang="he">
            {lettersById[id]?.glyph}
          </li>
        ))}
      </ul>
      <p className={styles.plateDerivation}>
        {ascent.or} light gathered · {ascent.housesMet.length} of the Houses met · seeded by{" "}
        {ascent.seedLabel}.
      </p>
      <Button variant="primary" onClick={onSeal} autoFocus>
        Seal the ascent
      </Button>
    </>
  );
}

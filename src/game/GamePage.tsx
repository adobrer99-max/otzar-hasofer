import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { dorotCardsById, dorotHousesById } from "../data/dorot";
import { lettersById } from "../data/letters";
import type { SefirahId } from "../types/letter";
import { Button, Callout, DecoratedRule, PageHeader } from "../components/ui";
import {
  currentAscent,
  kindleCost,
  listAscents,
  saveAscent,
  type AscentRecord,
  type FormedWord,
} from "../storage/ascentRepo";
import { abilityByLetter, type Grace, type Verb } from "./abilities";
import { GameCanvas, type HudSample } from "./GameCanvas";
import { ABYSS_AFTER_REGION, regionAt, regions, TOTAL_REGIONS } from "./regions";
import { encounterFor, encounterTitle, ILLUMINED_MULTIPLIER, isIllumined, sealedCount } from "./encounter";
import { judge, lightFor, opens, type WordGateTarget, type WordGateVerdict } from "./wordGate";
import { offerFor, vowKept, type UshpizinOffer } from "./ushpizinOffers";
import { openWordGate } from "./world/step";
import { readAscentTime } from "./sacredAscent";
import { fragmentAt, SCROLL_LETTER, SCROLL_TOTAL, SCROLL_VERSE } from "./scroll";
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
  | { kind: "fragment"; index: number; held: number }
  | { kind: "scroll-whole" }
  | { kind: "house"; cardId: string }
  | { kind: "word-gate" }
  | { kind: "word-result"; verdict: WordGateVerdict }
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
  /** Graces a guest of the Houses has granted this climb. */
  const [granted, setGranted] = useState<Grace[]>([]);
  /** A vow taken at a House, and the counters it will be judged against. */
  const [vow, setVow] = useState<
    { offer: UshpizinOffer; at: { orGathered: number; veilings: number; marksSet: number } } | null
  >(null);
  /** How many climbs were sealed before this one — which Encounter this is. */
  const [sealedBefore, setSealedBefore] = useState(0);

  // Read inside a setState updater, where reading `time` directly would make
  // the callback depend on it and re-create on every render.
  const lightRef = useRef(1);
  const encounterRef = useRef<ReturnType<typeof encounterFor>>(undefined);

  // The day's Sacred Time, computed once — the seed, the ascendant letter of
  // the month, and whatever the festival calendar grants.
  const time = useMemo(() => readAscentTime(new Date()), []);
  lightRef.current = time.lightOfTheDay;

  // Which of the Seven Encounters this climb is. Past the seventh there is
  // none, and the ascent is simply beyond the unfolding order.
  const encounter = useMemo(
    () => encounterFor(ascent?.encounterNumber !== undefined ? ascent.encounterNumber - 1 : sealedBefore),
    [ascent?.encounterNumber, sealedBefore],
  );
  encounterRef.current = encounter;

  useEffect(() => {
    let cancelled = false;
    Promise.all([currentAscent(), listAscents()])
      .then(([found, all]) => {
        if (cancelled) return;
        setAscent(found ?? null);
        // A climb still in progress must not count itself.
        setSealedBefore(sealedCount(all.filter((a) => a.id !== found?.id)));
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
  // What the Scribe holds, plus whatever the day itself lends and whatever a
  // guest of the Houses has granted. All three are graces, never verbs.
  const graces: Grace[] = useMemo(() => {
    const held = letters.map((id) => abilityByLetter[id]?.grace).filter((g): g is Grace => Boolean(g));
    const lent = [...held, ...granted];
    if (time.graceOfTheDay && !lent.includes(time.graceOfTheDay)) lent.push(time.graceOfTheDay);
    return lent;
  }, [letters, granted, time.graceOfTheDay]);

  // Persisting is fire-and-forget: a dropped write costs at most one region's
  // progress, and blocking the game on IndexedDB would be far worse.
  const persist = useCallback((next: AscentRecord) => {
    setAscent(next);
    void saveAscent(next).catch(() => undefined);
  }, []);

  const enterRegion = useCallback(
    (record: AscentRecord) => {
      const next = buildRegion(record.regionIndex, record.seed, time.lightOfTheDay);
      // The Encounter lights one rung brighter than the rest.
      if (isIllumined(encounter, regionAt(record.regionIndex).sefirah)) {
        next.orPerMote = ILLUMINED_MULTIPLIER;
      }
      setWorld(next);
      setVow(null);
      setPlate(null);
    },
    [time.lightOfTheDay, encounter],
  );

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
      encounterNumber: encounterFor(sealedBefore)?.number,
    };
    setGranted([]);
    persist(record);
    enterRegion(record);
  }, [time, persist, enterRegion, sealedBefore]);

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

  /**
   * A fragment lifted from its niche. The third one is not merely the third —
   * it completes the verse, and the scroll becomes Peh, which is then held
   * exactly like a letter found in an alcove (so the grace, the HUD belt and
   * the saved run all need no special case for it).
   */
  const onFragment = useCallback((index: number) => {
    setAscent((prev) => {
      if (!prev) return prev;
      const already = prev.scrollFragments ?? [];
      if (already.includes(index)) return prev;
      const held = [...already, index].sort((a, b) => a - b);
      const whole = held.length >= SCROLL_TOTAL;
      const lettersHeld =
        whole && !prev.lettersHeld.includes(SCROLL_LETTER)
          ? [...prev.lettersHeld, SCROLL_LETTER]
          : prev.lettersHeld;
      setPlate(whole ? { kind: "scroll-whole" } : { kind: "fragment", index, held: held.length });
      return { ...prev, scrollFragments: held, lettersHeld, updatedAt: new Date().toISOString() };
    });
  }, []);

  /** The Scribe has stepped into a Word-Gate's porch. */
  const onWordGate = useCallback(() => {
    setPlate((prev) => (prev ? prev : { kind: "word-gate" }));
  }, []);

  /**
   * Three letters inscribed. The lexicon judges; the gate opens for anything
   * true, and a hidden root costs nothing at all — so this may be tried as
   * often as the Scribe likes.
   */
  const inscribe = useCallback(
    (letterIds: [string, string, string]) => {
      if (!world?.wordGate) return;
      const verdict = judge(letterIds, world.wordGate);
      const light = lightFor(verdict);
      if (light > 0) {
        world.or += light;
        world.orGathered += light;
      }
      if (opens(verdict)) {
        openWordGate(
          world,
          verdict.kind === "target"
            ? "The root is spelled. The chamber opens."
            : "Not what was asked for — but true. The chamber opens.",
        );
      }
      if (verdict.kind === "target" || verdict.kind === "other-root") {
        const word: FormedWord =
          verdict.kind === "target"
            ? {
                letterIds,
                hebrew: verdict.entry.hebrew,
                transliteration: verdict.entry.transliteration,
                gloss: verdict.entry.clue,
                wasTarget: true,
                regionIndex: world.regionIndex,
              }
            : {
                letterIds,
                hebrew: verdict.hebrew,
                transliteration: verdict.transliteration,
                gloss: verdict.gloss,
                wasTarget: false,
                regionIndex: world.regionIndex,
              };
        setAscent((prev) =>
          prev
            ? { ...prev, wordsFormed: [...(prev.wordsFormed ?? []), word], updatedAt: new Date().toISOString() }
            : prev,
        );
      }
      setPlate({ kind: "word-result", verdict });
    },
    [world],
  );

  /** A guest's bargain accepted — paid for now, or vowed and judged later. */
  const acceptOffer = useCallback(
    (offer: UshpizinOffer) => {
      if (!world) return;
      if (offer.price > 0) {
        if (world.or < offer.price) return;
        world.or -= offer.price;
      }
      if (offer.vow) {
        setVow({
          offer,
          at: { orGathered: world.orGathered, veilings: world.veilings, marksSet: world.marksSet },
        });
      } else {
        setGranted((prev) => (prev.includes(offer.grants) ? prev : [...prev, offer.grants]));
      }
      setPlate(null);
    },
    [world],
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
    // A vow taken at a House is judged here, on the way out, against how the
    // rest of the region was actually crossed.
    if (vow && world) {
      const since = {
        orGathered: world.orGathered - vow.at.orGathered,
        veilings: world.veilings - vow.at.veilings,
        marksSet: world.marksSet - vow.at.marksSet,
      };
      if (vowKept(vow.offer.vow!, since)) {
        setGranted((prev) => (prev.includes(vow.offer.grants) ? prev : [...prev, vow.offer.grants]));
      }
      setVow(null);
    }

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
  }, [ascent?.regionIndex, world, vow]);

  /**
   * Leave the region. `kindle` spends this region's light to light its
   * Sefirah for good instead of carrying the light on as score — the only
   * thing light can be spent on, and a choice offered ten times a climb.
   */
  const climbOn = useCallback((kindle = false) => {
    setAscent((prev) => {
      if (!prev) return prev;
      const sefirah = regionAt(prev.regionIndex).sefirah;
      const canKindle = kindle && prev.or >= kindleCost(prev.regionIndex);
      const next: AscentRecord = {
        ...prev,
        or: canKindle ? prev.or - kindleCost(prev.regionIndex) : prev.or,
        sefirotLit: canKindle
          ? [...new Set([...(prev.sefirotLit ?? []), sefirah])]
          : prev.sefirotLit,
        regionIndex: Math.min(TOTAL_REGIONS, prev.regionIndex + 1),
        updatedAt: new Date().toISOString(),
      };
      void saveAscent(next).catch(() => undefined);
      const world = buildRegion(next.regionIndex, next.seed, lightRef.current);
      if (isIllumined(encounterRef.current, regionAt(next.regionIndex).sefirah)) {
        world.orPerMote = ILLUMINED_MULTIPLIER;
      }
      setWorld(world);
      setVow(null);
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
      if (
        plate.kind === "letter" ||
        plate.kind === "house" ||
        plate.kind === "fragment" ||
        plate.kind === "scroll-whole" ||
        plate.kind === "word-gate" ||
        plate.kind === "word-result"
      ) {
        setPlate(null);
      }
      else if (plate.kind === "sealed") sealAscent();
      else climbOn(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plate, climbOn, sealAscent]);

  // Persist letters as they are found, without writing on every frame.
  const lastSaved = useRef("");
  useEffect(() => {
    if (!ascent) return;
    const signature = [
      ascent.regionIndex,
      ascent.lettersHeld.join(","),
      ascent.housesMet.length,
      (ascent.scrollFragments ?? []).join(","),
      (ascent.sefirotLit ?? []).join(","),
      (ascent.wordsFormed ?? []).length,
    ].join("|");
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

      {!world && (
        <Threshold
          ascent={ascent}
          time={time}
          encounter={encounter}
          onBegin={beginAscent}
          onResume={resumeAscent}
        />
      )}

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
            onFragment={onFragment}
            onWordGate={onWordGate}
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

      {plate && (
        <PlateOverlay
          plate={plate}
          ascent={ascent}
          world={world}
          encounter={encounter}
          onNext={climbOn}
          onSeal={sealAscent}
          onInscribe={inscribe}
          onAccept={acceptOffer}
          onClose={() => setPlate(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// the threshold: begin, or resume
// ---------------------------------------------------------------------------

function Threshold({
  ascent,
  time,
  encounter,
  onBegin,
  onResume,
}: {
  ascent: AscentRecord | null;
  time: ReturnType<typeof readAscentTime>;
  encounter: ReturnType<typeof encounterFor>;
  onBegin: () => void;
  onResume: () => void;
}) {
  const sealed = ascent?.sealedAt;
  return (
    <section className={styles.threshold}>
      <div className={styles.thresholdInner}>
        {encounter ? (
          <p className={styles.encounterLine}>
            <span className={styles.plateKicker}>{encounterTitle(encounter)}</span>
            <span className={styles.encounterThemes}>{encounter.themes}</span>
          </p>
        ) : (
          <p className={styles.encounterLine}>
            <span className={styles.plateKicker}>Beyond the seven</span>
            <span className={styles.encounterThemes}>
              The Seven Encounters are behind you. What is climbed now is climbed freely.
            </span>
          </p>
        )}

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
            const lit = (ascent?.sefirotLit ?? []).includes(r.sefirah);
            const illumined = encounter?.sefirah === r.sefirah;
            return (
              <li
                key={r.index}
                title={illumined ? "This Encounter lights this rung — its light counts double." : undefined}
                className={[
                  styles.rung,
                  done ? styles.rungDone : "",
                  here ? styles.rungHere : "",
                  lit ? styles.rungLit : "",
                  illumined ? styles.rungIllumined : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={`${styles.rungHeb} hebrew`} lang="he">
                  {r.hebrew}
                </span>
                <span className={styles.rungName}>{r.name}</span>
                <span className={styles.rungMiddah}>
                  {lit ? "✦ kindled" : r.middah}
                </span>
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
  world,
  encounter,
  onNext,
  onSeal,
  onInscribe,
  onAccept,
  onClose,
}: {
  plate: Plate;
  ascent: AscentRecord | null;
  world: World | null;
  encounter: ReturnType<typeof encounterFor>;
  onNext: (kindle?: boolean) => void;
  onSeal: () => void;
  onInscribe: (letterIds: [string, string, string]) => void;
  onAccept: (offer: UshpizinOffer) => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.plateScrim} role="dialog" aria-modal="true">
      <div className={styles.plate}>
        {plate.kind === "letter" && <LetterPlate letterId={plate.letterId} onClose={onClose} />}
        {plate.kind === "fragment" && (
          <FragmentPlate index={plate.index} held={plate.held} onClose={onClose} />
        )}
        {plate.kind === "scroll-whole" && <ScrollWholePlate onClose={onClose} />}
        {plate.kind === "house" && ascent && world && (
          <HousePlate
            cardId={plate.cardId}
            sefirah={regionAt(world.regionIndex).sefirah}
            or={world.or}
            onAccept={onAccept}
            onClose={onClose}
          />
        )}
        {plate.kind === "word-gate" && world?.wordGate && ascent && (
          <WordGatePlate
            target={world.wordGate}
            held={ascent.lettersHeld}
            onInscribe={onInscribe}
            onClose={onClose}
          />
        )}
        {plate.kind === "word-result" && (
          <WordResultPlate verdict={plate.verdict} onClose={onClose} />
        )}
        {plate.kind === "region-done" && ascent && <RegionDonePlate ascent={ascent} onNext={onNext} />}
        {plate.kind === "abyss" && <AbyssPlate onNext={onNext} />}
        {plate.kind === "sealed" && ascent && (
          <SealedPlate ascent={ascent} encounter={encounter} onSeal={onSeal} />
        )}
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

function FragmentPlate({ index, held, onClose }: { index: number; held: number; onClose: () => void }) {
  const fragment = fragmentAt(index);
  if (!fragment) return null;
  return (
    <>
      <p className={styles.plateKicker}>A fragment of the scroll</p>
      <div className={`${styles.plateFragment} hebrew`} lang="he">
        {fragment.hebrew}
      </div>
      <p className={styles.plateUse}>&ldquo;{fragment.english}&rdquo;</p>
      <p className={styles.plateDerivation}>
        A scrap set aside in a genizah — worn writing is never destroyed, only laid down. Torn from
        something longer, and not the whole of it.
      </p>
      <p className={styles.plateCount}>
        {held} of {SCROLL_TOTAL} gathered
      </p>
      <Button variant="primary" onClick={onClose} autoFocus>
        Fold it away
      </Button>
    </>
  );
}

function ScrollWholePlate({ onClose }: { onClose: () => void }) {
  const letter = lettersById[SCROLL_LETTER];
  const ability = abilityByLetter[SCROLL_LETTER];
  return (
    <>
      <p className={styles.plateKicker}>The scroll is whole</p>
      <div className={`${styles.plateVerse} hebrew`} lang="he">
        {SCROLL_VERSE.hebrew}
      </div>
      <p className={styles.plateUse}>&ldquo;{SCROLL_VERSE.english}&rdquo;</p>
      <p className={styles.plateCitation}>{SCROLL_VERSE.citation}</p>
      {letter && ability && (
        <>
          <DecoratedRule />
          <div className={`${styles.plateGlyph} hebrew`} lang="he">
            {letter.glyph}
          </div>
          <h2 className={styles.plateTitle}>
            {letter.name} — {ability.name}
          </h2>
          <p className={styles.plateUse}>{ability.use}</p>
          <p className={styles.plateDerivation}>{ability.derivation}</p>
          <p className={styles.plateSource}>
            <Link to={`/guide/letters/${letter.id}`}>Read the chapter on {letter.name} →</Link>
          </p>
        </>
      )}
      <Button variant="primary" onClick={onClose} autoFocus>
        Speak
      </Button>
    </>
  );
}

/**
 * The inscription panel: three sockets and the letters in hand.
 *
 * The clue is the puzzle. Everything the Scribe carries is offered as a
 * palette, and nothing is spent by being wrong — a gate may be tried until it
 * yields or until the Scribe walks away bored, which is the only pressure a
 * game with no failure state is allowed to apply.
 */
function WordGatePlate({
  target,
  held,
  onInscribe,
  onClose,
}: {
  target: WordGateTarget;
  held: readonly string[];
  onInscribe: (letterIds: [string, string, string]) => void;
  onClose: () => void;
}) {
  const [sockets, setSockets] = useState<(string | null)[]>([null, null, null]);
  const place = (letterId: string) => {
    setSockets((prev) => {
      const next = [...prev];
      const empty = next.indexOf(null);
      if (empty === -1) return prev;
      next[empty] = letterId;
      return next;
    });
  };
  const filled = sockets.filter(Boolean).length === 3;

  return (
    <>
      <p className={styles.plateKicker}>A gate that asks</p>
      <h2 className={styles.plateTitle}>&ldquo;{target.clue}&rdquo;</h2>
      <p className={styles.plateDerivation}>
        Three letters, in order. Nothing is lost by being wrong.
      </p>

      <div className={styles.sockets} aria-label="The three sockets">
        {sockets.map((letterId, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.socket} hebrew`}
            lang="he"
            aria-label={letterId ? `Socket ${i + 1}: ${lettersById[letterId]?.name}` : `Socket ${i + 1}, empty`}
            onClick={() => setSockets((prev) => prev.map((v, j) => (j === i ? null : v)))}
          >
            {letterId ? lettersById[letterId]?.glyph : ""}
          </button>
        ))}
      </div>

      <ul className={styles.palette} aria-label="Letters you carry">
        {held.map((id) => (
          <li key={id}>
            <button
              type="button"
              className={`${styles.paletteLetter} hebrew`}
              lang="he"
              title={lettersById[id]?.name}
              onClick={() => place(id)}
            >
              {lettersById[id]?.glyph}
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.plateActions}>
        <Button
          variant="primary"
          disabled={!filled}
          onClick={() => filled && onInscribe(sockets as [string, string, string])}
        >
          Inscribe
        </Button>
        <Button onClick={onClose}>Step back</Button>
      </div>
    </>
  );
}

/** What the lexicon made of an inscription. */
function WordResultPlate({ verdict, onClose }: { verdict: WordGateVerdict; onClose: () => void }) {
  if (verdict.kind === "target") {
    return (
      <>
        <p className={styles.plateKicker}>The root is spelled</p>
        <div className={`${styles.plateVerse} hebrew`} lang="he">
          {verdict.entry.hebrew}
        </div>
        <p className={styles.plateUse}>
          {verdict.entry.transliteration} — &ldquo;{verdict.entry.clue}&rdquo;
        </p>
        <p className={styles.plateCitation}>{verdict.entry.citation}</p>
        <p className={styles.plateDerivation}>The chamber opens, and the word is yours to keep.</p>
        <Button variant="primary" onClick={onClose} autoFocus>
          Enter
        </Button>
      </>
    );
  }
  if (verdict.kind === "other-root") {
    return (
      <>
        <p className={styles.plateKicker}>Not what was asked — but true</p>
        <div className={`${styles.plateVerse} hebrew`} lang="he">
          {verdict.hebrew}
        </div>
        <p className={styles.plateUse}>
          {verdict.transliteration} — &ldquo;{verdict.gloss}&rdquo;
        </p>
        <p className={styles.plateDerivation}>
          You have spelled a real word, and the gate is not too proud to open for it. It is worth
          less light than the one it named.
        </p>
        <Button variant="primary" onClick={onClose} autoFocus>
          Enter
        </Button>
      </>
    );
  }
  if (verdict.kind === "related") {
    return (
      <>
        <p className={styles.plateKicker}>A murmur, not a word</p>
        <p className={styles.plateUse}>{verdict.hint}</p>
        <p className={styles.plateDerivation}>
          These letters answer one another, but they do not stand as a root. The gate holds.
        </p>
        <Button variant="primary" onClick={onClose} autoFocus>
          Try again
        </Button>
      </>
    );
  }
  return (
    <>
      <p className={styles.plateKicker}>Shoresh Nistar</p>
      <h2 className={styles.plateTitle}>The root is hidden</h2>
      <p className={styles.plateUse}>
        Nothing answers in these three. That is not a failure — a hidden root is one of the four
        tiers, and it costs you nothing at all.
      </p>
      <Button variant="primary" onClick={onClose} autoFocus>
        Try again
      </Button>
    </>
  );
}

function HousePlate({
  cardId,
  sefirah,
  or,
  onAccept,
  onClose,
}: {
  cardId: string;
  sefirah: SefirahId;
  or: number;
  onAccept: (offer: UshpizinOffer) => void;
  onClose: () => void;
}) {
  const card = dorotCardsById[cardId];
  const house = card ? dorotHousesById[card.houseId] : undefined;
  const offer = offerFor(sefirah);
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

      {offer && (
        <div className={styles.offer}>
          <DecoratedRule />
          <p className={styles.offerGuest}>
            {offer.figure} — {offer.middah}
          </p>
          <p className={styles.offerSaying}>&ldquo;{offer.saying}&rdquo;</p>
          <p className={styles.offerGrants}>{offer.grantsLabel}</p>
          {offer.price > 0 && or < offer.price && (
            <p className={styles.offerShort}>
              You carry {or} light; {offer.price} is asked. Come back with more.
            </p>
          )}
          <div className={styles.plateActions}>
            <Button
              variant="primary"
              disabled={offer.price > 0 && or < offer.price}
              onClick={() => onAccept(offer)}
            >
              {offer.terms}
            </Button>
            <Button onClick={onClose}>Decline</Button>
          </div>
        </div>
      )}

      {!offer && (
        <Button variant="primary" onClick={onClose} autoFocus>
          Walk on
        </Button>
      )}
    </>
  );
}

function RegionDonePlate({
  ascent,
  onNext,
}: {
  ascent: AscentRecord;
  onNext: (kindle?: boolean) => void;
}) {
  const done = regionAt(ascent.regionIndex);
  const next = regionAt(Math.min(TOTAL_REGIONS, ascent.regionIndex + 1));
  const cost = kindleCost(ascent.regionIndex);
  const alreadyLit = (ascent.sefirotLit ?? []).includes(done.sefirah);
  const canKindle = !alreadyLit && ascent.or >= cost;

  return (
    <>
      <p className={styles.plateKicker}>{done.name} is behind you</p>
      <h2 className={styles.plateTitle}>The way opens to {next.name}</h2>
      <p className={`${styles.plateHeb} hebrew`} lang="he">
        {next.hebrew}
      </p>
      <p className={styles.plateUse}>{next.teaching}</p>
      <p className={styles.plateDerivation}>
        {ascent.lettersHeld.length} of the twenty-two letters found · {ascent.or} light carried.
      </p>

      {/* The only thing light can be spent on: keep it as score, or burn it
          here and leave this Sefirah lit on the Tree for good. */}
      {!alreadyLit && (
        <p className={styles.offerGrants}>
          {canKindle
            ? `Kindle ${done.name} for ${cost} light, and it stays lit on your Tree.`
            : `Kindling ${done.name} asks ${cost} light; you carry ${ascent.or}.`}
        </p>
      )}

      <div className={styles.plateActions}>
        <Button variant="primary" onClick={() => onNext(false)} autoFocus>
          Climb on, keeping the light
        </Button>
        {canKindle && <Button onClick={() => onNext(true)}>Kindle {done.name}</Button>}
      </div>
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

function SealedPlate({
  ascent,
  encounter,
  onSeal,
}: {
  ascent: AscentRecord;
  encounter: ReturnType<typeof encounterFor>;
  onSeal: () => void;
}) {
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
      {(ascent.wordsFormed ?? []).length > 0 && (
        <>
          <DecoratedRule />
          <p className={styles.plateKicker}>The words of this ascent</p>
          <ul className={styles.wordList}>
            {(ascent.wordsFormed ?? []).map((word, i) => (
              <li key={`${word.hebrew}-${i}`}>
                <span className="hebrew" lang="he">
                  {word.hebrew}
                </span>{" "}
                <span className={styles.wordGloss}>
                  {word.transliteration} — {word.gloss}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {(ascent.sefirotLit ?? []).length > 0 && (
        <p className={styles.plateDerivation}>
          Sefirot kindled: {(ascent.sefirotLit ?? []).map((id) => regions.find((r) => r.sefirah === id)?.name).filter(Boolean).join(" · ")}
        </p>
      )}

      {encounter && (
        <>
          <DecoratedRule />
          <p className={styles.plateKicker}>{encounterTitle(encounter)}</p>
          <p className={styles.plateQuestion}>{encounter.question}</p>
        </>
      )}

      <p className={styles.plateDerivation}>
        {ascent.or} light carried · {ascent.housesMet.length} of the Houses met · seeded by{" "}
        {ascent.seedLabel}.
      </p>
      <Button variant="primary" onClick={onSeal} autoFocus>
        Seal the ascent
      </Button>
    </>
  );
}

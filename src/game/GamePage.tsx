import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { dorotCardsById, dorotHousesById } from "../data/dorot";
import { lettersById } from "../data/letters";
import type { SefirahId } from "../types/letter";
import { Button, Callout, DecoratedRule, PageHeader } from "../components/ui";
import {
  currentAscent,
  kindleCost,
  standingAt,
  listAscents,
  saveAscent,
  type AscentRecord,
  type FormedWord,
} from "../storage/ascentRepo";
import { abilityByLetter, type Grace, type LetterAbility, type Verb } from "./abilities";
import {
  abilitiesFor,
  BARRIER_OF,
  controlById,
  CONTROLS,
  type Control,
  type ControlId,
} from "./controls";
import {
  allLearned,
  ALL_LESSON_KEYS,
  forgetTaught,
  nextLesson,
  readTaught,
  retire,
  writeTaught,
  type LessonKey,
} from "./tutorial";
import { GameCanvas, type HudSample } from "./GameCanvas";
import { ABYSS_AFTER_REGION, regionAt, regions, TOTAL_REGIONS } from "./regions";
import { encounterFor, encounterTitle, isIllumined, rulesFor, sealedCount } from "./encounter";
import { judge, lightFor, opens, type WordGateTarget, type WordGateVerdict } from "./wordGate";
import { offerFor, vowKept, type UshpizinOffer } from "./ushpizinOffers";
import { openWordGate } from "./world/step";
import { useGameAudio } from "./audio/useGameAudio";
import { readAscentTime } from "./sacredAscent";
import { fragmentAt, SCROLL_LETTER, SCROLL_TOTAL, SCROLL_VERSE } from "./scroll";
import { GOING_OUT, HUSKS, isBeast, LAMPS } from "./combat";
import { describeEffect, keliById, powersFrom, synergiesIn } from "./items";
import {
  ABYSS_WORD,
  pleaFor,
  PROLOGUE,
  TESTIMONY,
  witnessesOf,
  WITNESSES_POSSIBLE,
} from "./story";
import { buildArena, buildPath, buildRegion, verbsOf } from "./world/build";
import { boonsFrom, guardianOf } from "./guardians";
import { TreeMap } from "./TreeMap";
import { afterWalking, TREE_PATHS, type TreePath } from "./tree";
import { readWarp, warpParams, warpRecord, type WarpOptions } from "./dev/warp";
import { installProbe, neighbourhood, probeOf } from "./dev/probe";
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

/** A Sefirah's region, by name — the ten are a small table, so a scan is fine. */
/**
 * Whether every Sefirah has been kindled, which is what seals a climb.
 *
 * The linear climb ended by arriving: reach Keter and the crowning plate comes
 * up. On the Tree arriving is nothing — the crown is one step from Chochmah and
 * a Scribe can be standing on it inside four paths. So the ending is the
 * *spending*: three hundred light laid down across the ten, which is a climb
 * that has been almost everywhere. Both roads reach the same plate.
 */
function allKindled(ascent: AscentRecord): boolean {
  return new Set(ascent.sefirotLit ?? []).size >= TOTAL_REGIONS;
}

function regionOfSefirah(sefirah: SefirahId) {
  const found = regions.find((r) => r.sefirah === sefirah);
  if (!found) throw new Error(`No region stands at ${sefirah}`);
  return found;
}

type Plate =
  | { kind: "letter"; letterId: string }
  | { kind: "fragment"; index: number; held: number }
  | { kind: "scroll-whole" }
  | { kind: "house"; cardId: string }
  | { kind: "vessel"; keliId: string }
  | { kind: "word-gate" }
  | { kind: "word-result"; verdict: WordGateVerdict }
  | { kind: "region-done" }
  | { kind: "path-done"; path: TreePath }
  | { kind: "guardian-done"; sefirah: SefirahId }
  | { kind: "abyss" }
  | { kind: "out" }
  | { kind: "sealed" };

const NEW_ID = () =>
  `ascent-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

export function GamePage() {
  const [ascent, setAscent] = useState<AscentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [world, setWorld] = useState<World | null>(null);
  /**
   * The path whose rung is loaded, if the world came from the overworld rather
   * than from the linear climb.
   *
   * Both roads are open on purpose. A record written before the Tree could be
   * walked has no `at` and no `pathsWalked`, and resuming it must put the
   * Scribe back on the rung they left, not on a map they have never seen. So
   * `world` says whether a rung is loaded and this says *which kind* — and
   * every place that used to ask "what happens when the exit is reached" now
   * has to answer for both, which is the whole of the wiring below.
   */
  const [walking, setWalking] = useState<TreePath | null>(null);
  /** The Sefirah whose guardian is being faced, while the arena is open. */
  const [facing, setFacing] = useState<SefirahId | null>(null);
  const [plate, setPlate] = useState<Plate | null>(null);
  const [hud, setHud] = useState<HudSample>({
    or: 0,
    veiled: false,
    x: 0,
    onGround: false,
    used: [],
    lamps: LAMPS,
    out: false,
  });
  const [showKeys, setShowKeys] = useState(false);
  /** Which lessons this Scribe has already been taught — per Scribe, not per run. */
  const [taught, setTaught] = useState<LessonKey[]>(() => readTaught());
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
  /**
   * `climbOn` is created once and reads its world through refs, so the
   * Encounter's rules have to reach it the same way — a captured `layEncounter`
   * would be the one from the first render, and the rules would be whatever
   * they were before the record loaded.
   */
  const layEncounterRef = useRef<(world: World, here: readonly SefirahId[]) => void>(() => {});
  // The audio watches the world on its own frame loop — the HUD sample is far
  // too slow for a footfall — so it needs the world by reference.
  const worldRef = useRef<World | null>(null);
  worldRef.current = world;
  // Read inside callbacks that must not be re-created ten times a second.
  const taughtRef = useRef<LessonKey[]>(taught);
  taughtRef.current = taught;
  const lettersCountRef = useRef(0);

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
  lettersCountRef.current = letters.length;
  const verbs: Verb[] = useMemo(() => verbsOf(letters), [letters]);
  /** The one thing worth saying to a Scribe still finding the keys. */
  const lesson = useMemo(
    () => nextLesson({ learned: taught, lettersHeld: letters.length }),
    [taught, letters.length],
  );
  // What the Scribe holds, plus whatever the day itself lends and whatever a
  // guest of the Houses has granted. All three are graces, never verbs.
  const graces: Grace[] = useMemo(() => {
    const held = letters.map((id) => abilityByLetter[id]?.grace).filter((g): g is Grace => Boolean(g));
    const lent = [...held, ...granted];
    if (time.graceOfTheDay && !lent.includes(time.graceOfTheDay)) lent.push(time.graceOfTheDay);
    // And whatever the Encounter this climb belongs to holds open for the whole
    // of it — the Third's second stone is a grace like any other, so it arrives
    // by the same door rather than through a special case.
    for (const g of rulesFor(encounter)?.grants ?? []) if (!lent.includes(g)) lent.push(g);
    return lent;
  }, [letters, granted, time.graceOfTheDay, encounter]);

  const audio = useGameAudio(
    worldRef,
    world ? regionAt(world.regionIndex).sefirah : undefined,
    letters,
    time.snapshot.activeFestivalIds,
    Boolean(world && isIllumined(encounter, regionAt(world.regionIndex).sefirah)),
  );

  // Persisting is fire-and-forget: a dropped write costs at most one region's
  // progress, and blocking the game on IndexedDB would be far worse.
  const persist = useCallback((next: AscentRecord) => {
    setAscent(next);
    void saveAscent(next).catch(() => undefined);
  }, []);

  /**
   * A sample from the loop, ten times a second — and with it, whichever keys
   * were pressed since the last one. A lesson retires the moment its key is
   * used, so the teaching answers the hands rather than a timer.
   */
  const onSample = useCallback((sample: HudSample) => {
    setHud(sample);
    // The lamps run out inside the simulation, so the page learns of it here.
    // Raising the plate also pauses the loop, which is what stops the Scribe
    // being knocked around a region he is no longer in.
    if (sample.out) setPlate((prev) => prev ?? { kind: "out" });
    if (sample.used.length === 0) return;
    setTaught((prev) => {
      const next = retire({ learned: prev, lettersHeld: lettersCountRef.current }, sample.used);
      if (next.length === prev.length) return prev;
      writeTaught(next);
      return next;
    });
  }, []);

  // The last lesson has no key to press — finding a letter is what retires it.
  useEffect(() => {
    setTaught((prev) => {
      const next = retire({ learned: prev, lettersHeld: letters.length }, []);
      if (next.length === prev.length) return prev;
      writeTaught(next);
      return next;
    });
  }, [letters.length]);

  /**
   * **The Encounter's numbers, laid on a world as it is entered.**
   *
   * One function rather than two because there are two roads into a rung — the
   * Tree's paths and the linear climb behind it — and a rule that fired on one
   * of them would be a rule that half the game does not have. `powersFrom` for
   * the vessels is applied at the same moment for the same reason.
   *
   * `here` is the Sefirot this ground actually lies between, which on the Tree
   * is a path's two ends rather than the rung's index. That distinction is not
   * pedantry: `regionOfPath` caps a rung's index by what the Scribe carries, so
   * a path into Chesed walked by a two-letter Scribe is built as a Malchut-sized
   * rung and reads as Malchut — and the First Encounter, whose whole rule is
   * "light counts double in Chesed", silently did nothing on exactly the paths
   * it was for.
   */
  const layEncounter = useCallback(
    (world: World, here: readonly SefirahId[]) => {
      const rule = rulesFor(encounter);
      if (!rule) return;
      if (rule.motes && here.some((s) => isIllumined(encounter, s))) {
        world.orPerMote = Math.max(1, Math.round(world.orPerMote * rule.motes));
      }
      if (rule.husks) world.huskLight = rule.husks;
      if (rule.sealed) world.sealedLight = rule.sealed;
      if (rule.veilCost !== undefined) world.veilCost = rule.veilCost;
      if (rule.lamps) world.player.lamps += rule.lamps;
    },
    [encounter],
  );
  layEncounterRef.current = layEncounter;

  const enterRegion = useCallback(
    (record: AscentRecord, over?: { porch?: boolean; lamps?: number }) => {
      // The porch is laid only for a Scribe who has not finished the teaching,
      // and `buildRegion` itself limits it to Malchut.
      const next = buildRegion(
        record.regionIndex,
        record.seed,
        time.lightOfTheDay,
        over?.porch ?? !allLearned(taughtRef.current),
      );
      // What the vessels come to, applied to the region as it is built: the
      // lamps a Scribe is made of and what a mote is worth are properties of
      // the world rather than of a tick, so this is where they belong.
      const carried = powersFrom(record.items ?? []);
      next.player.lamps += carried.lamps;
      next.orPerMote = Math.max(1, Math.round(next.orPerMote * carried.light));
      layEncounter(next, [regionAt(record.regionIndex).sefirah]);
      if (over?.lamps !== undefined) next.player.lamps = over.lamps;
      setWorld(next);
      setVow(null);
      setPlate(null);
    },
    [time.lightOfTheDay, layEncounter],
  );

  /**
   * The one door into a climb. Both the threshold and the dev warp come
   * through here, so a warped run cannot exercise an entry path a player never
   * takes — which was the whole point of building the warp rather than a
   * separate harness mode.
   */
  const beginAt = useCallback(
    (record: AscentRecord, over?: { porch?: boolean; lamps?: number }) => {
      setGranted([]);
      persist(record);
      enterRegion(record, over);
    },
    [persist, enterRegion],
  );

  const newRecord = useCallback(
    (): AscentRecord => {
      const now = new Date().toISOString();
      return {
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
    },
    [time, sealedBefore],
  );

  /**
   * Begin — and **stop at the map**, rather than dropping straight into a rung.
   *
   * The linear climb had nowhere to stop: region one was the only place you
   * could be, so beginning and entering were the same act. The first thing a
   * Scribe does on the Tree is choose a way out of the kingdom, and that choice
   * is the game — so it is the first thing they are shown.
   */
  const beginAscent = useCallback(() => {
    const record = newRecord();
    setGranted([]);
    persist(record);
    setWorld(null);
    setWalking(null);
    setPlate(null);
  }, [newRecord, persist]);

  /**
   * Resume. A record that has ever walked a path belongs to the Tree and comes
   * back to the map; one written before the overworld existed goes back to the
   * rung it left, which is where its Scribe actually was.
   */
  const resumeAscent = useCallback(() => {
    if (!ascent) return;
    if (ascent.at) {
      setWorld(null);
      setWalking(null);
      setPlate(null);
    } else enterRegion(ascent);
  }, [ascent, enterRegion]);

  // --- the dev warp ---------------------------------------------------------
  //
  // Everything below is dead code in a production build: each branch is
  // guarded by `import.meta.env.DEV`, which the build replaces with `false`,
  // so the panel's chunk is never emitted and `warp.ts` shakes out. A test
  // greps `dist/` for the marker to keep that true.
  //
  // The panel is a *dynamic* import for exactly that reason — a static one
  // would drag its stylesheet into the bundle whether or not it renders.

  const [params, setParams] = useSearchParams();
  const [DevPanel, setDevPanel] = useState<ComponentType<{
    onWarp: (options: WarpOptions) => void;
  }> | null>(null);
  /**
   * The last warp actually taken, as its query string.
   *
   * Not a boolean. Changing only the hash does not reload the page, so
   * `goto("#/game?rung=2")` after `goto("#/game?rung=6")` is a route change
   * and nothing more — a one-shot flag would leave a harness quietly looking
   * at the previous rung while believing it had moved. Measured, not reasoned:
   * the second warp of a session did exactly that.
   */
  const warped = useRef<string | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    void import("./dev/DevPanel").then((m) => setDevPanel(() => m.DevPanel)).catch(() => undefined);
  }, []);

  const warpTo = useCallback(
    (options: WarpOptions) => {
      // The guard is inside the callback, not around it. A hook cannot be
      // called conditionally, so a `useCallback` whose body merely *mentions*
      // the warp keeps the whole module alive in a production bundle — which
      // is exactly what the `dist/` grep caught the moment the probe was
      // added. An early return on a constant `false` makes the rest
      // unreachable, and unreachable code is what tree-shaking removes.
      if (!import.meta.env.DEV) return;
      const written = warpParams(options);
      warped.current = written;
      setParams(written, { replace: true });
      // A Scribe warped to Gevurah holding twenty-two letters does not need to
      // be told which key walks. State only — never `writeTaught`, so using
      // the warp cannot quietly retire a real Scribe's teaching.
      if (!options.porch) setTaught(ALL_LESSON_KEYS);
      beginAt(
        warpRecord(options, {
          id: NEW_ID(),
          seed: time.seed,
          seedLabel: time.seedLabel,
          notes: time.notes,
          ascendantLetterId: time.ascendantLetterId,
          encounterNumber: encounterFor(sealedBefore)?.number,
        }),
        { porch: options.porch, lamps: options.lamps },
      );
    },
    [beginAt, setParams, time, sealedBefore],
  );

  // `#/game?rung=10&letters=all-but-peh&lamps=1` — what the harness drives,
  // because a harness cannot click. Waits for the load so the record it writes
  // is not immediately overwritten by the saved one.
  useEffect(() => {
    if (!import.meta.env.DEV || loading) return;
    const options = readWarp(params);
    if (!options || warpParams(options) === warped.current) return;
    warpTo(options);
  }, [loading, params, warpTo]);

  // A live readout for the playtest harness. Installed once and reading refs,
  // so polling it never costs the page a render — see `dev/probe.ts`.
  const ascentRef = useRef<AscentRecord | null>(ascent);
  ascentRef.current = ascent;
  const plateRef = useRef<Plate | null>(plate);
  plateRef.current = plate;
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    // Same shape of guard, same reason — see `warpTo`.
    return installProbe({
      read: () => (import.meta.env.DEV ? probeOf(worldRef.current, ascentRef.current, plateRef.current?.kind) : null),
      look: (radius) => (import.meta.env.DEV ? neighbourhood(worldRef.current, radius) : []),
    });
  }, []);

  // --- the four events the world raises ------------------------------------

  const onLetter = useCallback(
    (letterId: string) => {
      audio.onLetter(letterId);
      setPlate({ kind: "letter", letterId });
      setAscent((prev) =>
        prev && !prev.lettersHeld.includes(letterId)
          ? { ...prev, lettersHeld: [...prev.lettersHeld, letterId], updatedAt: new Date().toISOString() }
          : prev,
      );
    },
    [audio],
  );

  /**
   * A fragment lifted from its niche. The third one is not merely the third —
   * it completes the verse, and the scroll becomes Peh, which is then held
   * exactly like a letter found in an alcove (so the grace, the HUD belt and
   * the saved run all need no special case for it).
   */
  /**
   * A pedestal reached. Nothing is picked up here — the plate goes up and the
   * Scribe decides, because a vessel that costs something has to be one that
   * can be walked past.
   */
  const onVessel = useCallback((keliId: string) => {
    setPlate({ kind: "vessel", keliId });
  }, []);

  /**
   * A vessel taken. Kept on the ascent exactly as a letter is, because that is
   * what makes it survive a region change and a reload — and it needs no other
   * machinery, since everything it does is a number the step already reads out
   * of the context.
   *
   * The entity is marked taken here rather than in the step, which is what
   * leaves a *declined* vessel standing on its plinth: the pedestal is emptied
   * by the yes, and by nothing else.
   */
  const takeVessel = useCallback(
    (keliId: string) => {
      const pedestal = world?.entities.find((e) => e.kind === "vessel" && e.ref === keliId);
      if (pedestal) pedestal.taken = true;
      setAscent((prev) =>
        prev && !(prev.items ?? []).includes(keliId)
          ? { ...prev, items: [...(prev.items ?? []), keliId], updatedAt: new Date().toISOString() }
          : prev,
      );
      setPlate(null);
    },
    [world],
  );

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
      if (whole) audio.onScrollWhole();
      else audio.onFragment();
      setPlate(whole ? { kind: "scroll-whole" } : { kind: "fragment", index, held: held.length });
      return { ...prev, scrollFragments: held, lettersHeld, updatedAt: new Date().toISOString() };
    });
  }, [audio]);

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
        audio.onGateOpened();
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
    [world, audio],
  );

  /** A guest's bargain accepted — paid for now, or vowed and judged later. */
  const acceptOffer = useCallback(
    (offer: UshpizinOffer) => {
      if (!world) return;
      // The Sixth Encounter's Humanity: every guest asks no price, and what
      // they offer is given. Checked here rather than by rewriting the offer,
      // so the plate still says what the bargain *would* be — a gift you can
      // see the price of is a different thing from a free sample.
      const free = Boolean(rulesFor(encounter)?.guestsFree);
      if (offer.price > 0 && !free) {
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
    [world, encounter],
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
    audio.onArrival();

    /**
     * **A guardian's room ends differently.** The way out is shut until the
     * shell breaks, so reaching it *is* the break — nothing else has to be
     * checked, and checking it twice is how the two would drift. The Sefirah
     * stands freed, in this climb and in every one after it.
     */
    if (facing) {
      const freed = facing;
      setAscent((prev) => {
        if (!prev) return prev;
        const next: AscentRecord = {
          ...prev,
          or: prev.or + (world?.or ?? 0),
          guardiansBroken: [...new Set([...(prev.guardiansBroken ?? []), freed])],
          updatedAt: new Date().toISOString(),
        };
        void saveAscent(next).catch(() => undefined);
        return next;
      });
      setPlate({ kind: "guardian-done", sefirah: freed });
      return;
    }
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
      // **A path is finished where it lets you off.** The letter itself is not
      // granted here: it lies in an alcove on the rung and is picked up by
      // walking to it, exactly as every letter always has been. Reaching the
      // exit is what marks the path walked and moves the Scribe — so a rung
      // abandoned partway pays nothing and changes nothing, which is what a
      // Scribe cast back to the kingdom should find.
      const moved = walking
        ? afterWalking({ at: standingAt(prev), pathsWalked: prev.pathsWalked ?? [] }, walking)
        : undefined;
      const next: AscentRecord = {
        ...prev,
        regionsCleared: cleared,
        or: prev.or + (world?.or ?? 0),
        ...(moved
          ? {
              at: moved.at,
              pathsWalked: [...moved.pathsWalked],
              // Kept in step for the saved-game format, the HUD and every
              // caller that predates the Tree.
              regionIndex: regionOfSefirah(moved.at).index,
              // **Where you arrived, not where you set out from.** On a line
              // those were the same thing; on the Tree, marking the departure
              // would leave the ladder on the threshold showing a climb that
              // never got anywhere.
              regionsCleared: cleared.includes(regionOfSefirah(moved.at).index)
                ? cleared
                : [...cleared, regionOfSefirah(moved.at).index],
            }
          : {}),
        updatedAt: new Date().toISOString(),
      };
      void saveAscent(next).catch(() => undefined);
      return next;
    });
    setPlate(
      walking
        ? { kind: "path-done", path: walking }
        : ascent?.regionIndex === TOTAL_REGIONS
          ? { kind: "sealed" }
          : ascent?.regionIndex === ABYSS_AFTER_REGION
            ? { kind: "abyss" }
            : { kind: "region-done" },
    );
  }, [ascent?.regionIndex, world, vow, audio, walking, facing]);

  /**
   * Step onto a path from the overworld — which is what a rung is now.
   *
   * The world is built from **what the Scribe is actually carrying**, not from
   * an index, which is the whole architectural move of the Tree and the reason
   * `route.test.ts` had to re-earn the no-soft-lock guarantee over sampled
   * routes before any of this could be drawn.
   */
  const walkPath = useCallback(
    (path: TreePath) => {
      if (!ascent) return;
      const teaching = !allLearned(taughtRef.current);
      const next = buildPath(
        path,
        ascent.seed,
        ascent.lettersHeld,
        time.lightOfTheDay,
        teaching,
        (ascent.pathsWalked ?? []).includes(path.id),
        rulesFor(encounter)?.klipot ?? 1,
        ascent.items ?? [],
      );
      const carried = powersFrom(ascent.items ?? []);
      next.player.lamps += carried.lamps;
      next.orPerMote = Math.max(1, Math.round(next.orPerMote * carried.light));
      // The path's own two ends, not the rung's capped index — see `layEncounter`.
      layEncounter(next, path.ends);
      setGranted([]);
      setWalking(path);
      setWorld(next);
      setVow(null);
      setPlate(null);
    },
    [ascent, time.lightOfTheDay, layEncounter, encounter],
  );

  /** Back to the map, from the plate at the end of a path. */
  const backToTree = useCallback(() => {
    setWorld(null);
    setWalking(null);
    setFacing(null);
    setPlate(null);
  }, []);

  /**
   * Go and face what is holding the Sefirah you are standing on.
   *
   * A room rather than a rung: one way in, one creature, one way out that is
   * shut until the shell breaks. Nothing is gathered in there and nothing is
   * found — the light a guardian holds comes out of the shell like any other,
   * and the light is not what it was for.
   */
  const faceGuardian = useCallback(() => {
    if (!ascent) return;
    const at = standingAt(ascent);
    if ((ascent.guardiansBroken ?? []).includes(at)) return;
    const room = buildArena(at, ascent.seed);
    const carried = powersFrom(ascent.items ?? [], boonsFrom(ascent.guardiansBroken ?? []));
    room.player.lamps += carried.lamps;
    setGranted([]);
    setWalking(null);
    setFacing(at);
    setWorld(room);
    setVow(null);
    setPlate(null);
  }, [ascent]);

  /**
   * Kindle where you stand. The same spend the between-rungs plate offered on
   * the linear climb, moved to the map — because on the Tree "where you stand"
   * is a place you can come back to, so the choice is no longer once-only and
   * forced at a doorway.
   */
  const kindleHere = useCallback(() => {
    setAscent((prev) => {
      if (!prev) return prev;
      const at = standingAt(prev);
      const cost = kindleCost(regionOfSefirah(at).index);
      // **Light is the second gate, not the first.** A Sefirah still held is
      // not for sale, and the map says what holds it rather than greying a
      // button out with no reason on it.
      if (!(prev.guardiansBroken ?? []).includes(at)) return prev;
      if (prev.or < cost || (prev.sefirotLit ?? []).includes(at)) return prev;
      const next: AscentRecord = {
        ...prev,
        or: prev.or - cost,
        sefirotLit: [...new Set([...(prev.sefirotLit ?? []), at])],
        updatedAt: new Date().toISOString(),
      };
      void saveAscent(next).catch(() => undefined);
      return next;
    });
  }, []);

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
      layEncounterRef.current(world, [regionAt(next.regionIndex).sefirah]);
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
      // A pedestal is the one plate that asks a *question*, so the keyboard
      // must not answer it. Swallowed here, Enter would have dismissed the
      // plate — which now means "leave it" — while the Scribe was looking at a
      // focused "Take it up". Let the buttons have the keys: Enter and Space
      // press whichever is focused, and Escape is handled below as declining.
      if (plate.kind === "vessel") {
        if (e.key !== "Escape") return;
        e.preventDefault();
        setPlate(null);
        return;
      }
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
      // Going out ends the climb exactly as the crown does — the plate's own
      // button calls `onSeal`, and only the keyboard was wrong. Enter used to
      // fall through to `climbOn`, which carried a Scribe whose last lamp had
      // just gone out up to the next rung with three fresh ones. Caught by a
      // harness run that went out in Netzach and finished in Tiferet.
      else if (plate.kind === "sealed" || plate.kind === "out") sealAscent();
      // The end of a path goes back to the map, never on to a next rung — there
      // is no next rung on the Tree until the Scribe chooses one.
      else if (plate.kind === "path-done" || plate.kind === "guardian-done") backToTree();
      else climbOn(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plate, climbOn, sealAscent, backToTree]);

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
          lede="You were the scribe of the crown, and you were cast down to the kingdom without being told what for. Climb back on the twenty-two letters — each one a power drawn from its own ancient sense, Vav the hook, Mem the water, Chet the fence — and speak with the figures keeping the Houses on the way, because they were told what you were not. You will need a mouth to plead with, and the Mouth is in pieces. A fall or a thorn only veils you and you wake at your mark — but the klipot, the husks that hold the trapped light, take a lamp, and when the last lamp goes out you go out with it, and the kingdom comes up to meet you again."
        />
      )}

      {/* **The overworld stands where the threshold does, once a climb is
          underway.** The threshold is for beginning and for looking back at a
          sealed climb; between rungs the Scribe is not at a threshold at all,
          they are standing somewhere on the Tree deciding which way to go. */}
      {!world && ascent && !ascent.sealedAt && (
        <TreeMap
          ascent={ascent}
          at={standingAt(ascent)}
          onWalk={walkPath}
          onKindle={kindleHere}
          onFace={faceGuardian}
          onSeal={allKindled(ascent) ? () => setPlate({ kind: "sealed" }) : undefined}
        />
      )}

      {!world && (!ascent || ascent.sealedAt) && (
        <Threshold
          ascent={ascent}
          time={time}
          encounter={encounter}
          taught={allLearned(taught)}
          onBegin={beginAscent}
          onResume={resumeAscent}
        />
      )}

      {import.meta.env.DEV && !world && DevPanel && <DevPanel onWarp={warpTo} />}

      {world && ascent && region && (
        <>
          <div className={styles.hud}>
            {/* **What the Scribe is crossing, which is a path and not a rung.**
                The three slots were the rung's number, name and Hebrew, and on
                the Tree the first of those has stopped meaning anything: a
                Scribe walking out of the kingdom holding nothing is on ground
                built at Malchut's own scale, so the HUD read "1 / 10 · Malchut"
                while they were plainly on their way to Yesod. Walking a path,
                the slots say how much of the alphabet is in hand, which two
                places this ground lies between, and the letter it pays. */}
            <div className={styles.hudRegion}>
              {facing ? (
                // A guardian's room is neither a rung nor a path. What matters
                // in it is which creature is standing there and how much of it
                // is left, and the shells are on the thing itself — so the HUD
                // says where you are and what holds it, and nothing else.
                <>
                  <span className={styles.hudStep}>held by</span>
                  <span className={styles.hudName}>{HUSKS[guardianOf(facing).kind].name}</span>
                  <span className={`${styles.hudHeb} hebrew`} lang="he">
                    {HUSKS[guardianOf(facing).kind].hebrew}
                  </span>
                </>
              ) : walking ? (
                <>
                  <span className={styles.hudStep}>
                    {ascent.lettersHeld.length} / {TREE_PATHS.length}
                  </span>
                  <span className={styles.hudName}>
                    {regionOfSefirah(walking.ends[0]).name} → {regionOfSefirah(walking.ends[1]).name}
                  </span>
                  <span className={`${styles.hudHeb} hebrew`} lang="he">
                    {lettersById[walking.letter]?.glyph ?? ""}
                  </span>
                </>
              ) : (
                <>
                  <span className={styles.hudStep}>
                    {ascent.regionIndex} / {TOTAL_REGIONS}
                  </span>
                  <span className={styles.hudName}>{region.name}</span>
                  <span className={`${styles.hudHeb} hebrew`} lang="he">
                    {region.hebrew}
                  </span>
                </>
              )}
            </div>
            {/* What the Scribe is, beside what he is carrying. */}
            <div className={styles.lamps} aria-label={`${hud.lamps} of ${LAMPS} lamps still lit`}>
              {Array.from({ length: LAMPS }, (_, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={i < hud.lamps ? styles.lampLit : styles.lampOut}
                >
                  ✧
                </span>
              ))}
            </div>
            <div className={styles.hudOr} title="Light gathered in this region">
              <span aria-hidden="true">✦</span> {hud.or}
            </div>
            <LetterBelt held={ascent.lettersHeld} ascendant={ascent.ascendantLetterId} />
            <VesselBelt held={ascent.items ?? []} />
          </div>

          <GameCanvas
            world={world}
            verbs={verbs}
            graces={graces}
            markGlyph={lettersById[ascent.ascendantLetterId ?? "aleph"]?.glyph ?? "א"}
            items={ascent.items ?? []}
            paused={plate !== null}
            onLetter={onLetter}
            onFragment={onFragment}
            onWordGate={onWordGate}
            onHouse={onHouse}
            onVessel={onVessel}
            onFinish={onFinish}
            onSample={onSample}
          />

          {/* A real event always beats coaching, and the region's own teaching
              is what is left when there is nothing to say — except in a
              guardian's room, where there is no coaching and no teaching, only
              the thing standing in front of you. The lessons are about which
              key walks; a Scribe who has come here already knows. */}
          <p
            className={`${styles.caption} ${hud.message === undefined && !facing && lesson ? styles.captionLesson : ""}`}
            role="status"
            aria-live="polite"
          >
            <Press
              text={
                hud.message ??
                (facing ? HUSKS[guardianOf(facing).kind].is : (lesson?.text ?? region.teaching))
              }
            />
          </p>

          <div className={styles.controls}>
            <Button variant="subtle" onClick={() => setShowKeys((v) => !v)} aria-expanded={showKeys}>
              {showKeys ? "Hide the keys" : "The keys"}
            </Button>
            {/* Audio gets its own control, deliberately not tied to
                prefers-reduced-motion — the deal's sound is currently
                silenced by that preference with no way to ask for it back. */}
            <Button
              variant="subtle"
              onClick={audio.toggle}
              aria-pressed={audio.on}
              title={audio.on ? "Silence the ascent" : "Sound the ascent"}
            >
              {audio.on ? "🔔 Sounding" : "🔕 Silent"}
            </Button>
            {allLearned(taught) && (
              <Button
                variant="subtle"
                onClick={() => {
                  forgetTaught();
                  setTaught([]);
                }}
                title="Walk through the opening lessons again"
              >
                Teach me again
              </Button>
            )}
            {/* Seven chips rather than a sentence — the sentence that used to
                stand here named four of the seven and quietly omitted the two
                that climb, swim and crawl. */}
            <span className={styles.controlsHint}>
              {CONTROLS.map((c) => (
                <kbd key={c.id} className={styles.kbd} title={`${c.name} — ${c.does}`}>
                  {c.keys[0]}
                </kbd>
              ))}{" "}
              — all of it under <strong>The keys</strong>.
            </span>
          </div>

          {audio.on && audio.score && (
            <p className={styles.nigunLine}>
              <span className={styles.nigunMode}>
                {audio.score.mode.name}
                <span className={`${styles.nigunHeb} hebrew`} lang="he">
                  {audio.score.mode.hebrew}
                </span>
              </span>
              <span className={styles.nigunNote}>
                {audio.score.mode.character} The nigun is{" "}
                <strong>{audio.score.nigun.name}</strong> ({audio.score.nigun.attribution}).{" "}
                {audio.score.openDegrees.length === 1
                  ? "You carry no letters yet, so only the tonic sounds."
                  : `Your letters have opened ${audio.score.openDegrees.length} of the nine degrees.`}
              </span>
            </p>
          )}

          {showKeys && <Keys held={ascent.lettersHeld} regionIndex={ascent.regionIndex} />}
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
          onBack={backToTree}
          onInscribe={inscribe}
          onAccept={acceptOffer}
          onTakeVessel={takeVessel}
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
  taught,
  onBegin,
  onResume,
}: {
  ascent: AscentRecord | null;
  time: ReturnType<typeof readAscentTime>;
  encounter: ReturnType<typeof encounterFor>;
  /** Whether this Scribe has been through the opening lessons before. */
  taught: boolean;
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

        {/* Why any of this is being climbed. Open by default for a Scribe who
            has never begun, and foldable for everyone who has. */}
        <details className={styles.prologue} open={!ascent}>
          <summary className={styles.prologueSummary}>{PROLOGUE.kicker}</summary>
          {PROLOGUE.lines.map((line) => (
            <p key={line.slice(0, 24)} className={styles.prologueLine}>
              {line}
            </p>
          ))}
          <p className={styles.prologueCharge}>{PROLOGUE.charge}</p>
        </details>

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

        {/* Open by default for a Scribe who has never climbed — the one place
            the whole scheme can be read before anything is at stake. */}
        <details className={styles.waysDetails} open={!taught}>
          <summary className={styles.waysSummary}>The ways of the body — every key</summary>
          <Ways held={[]} />
        </details>

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
              {taught ? "Begin the ascent" : "Begin — the way will be shown"}
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

/**
 * The vessels, beside the letters and deliberately not among them. One belt
 * says what the Scribe *is*; the other says what he is carrying.
 */
function VesselBelt({ held }: { held: readonly string[] }) {
  if (held.length === 0) return null;
  const lit = new Set(synergiesIn(held).flatMap((s) => [s.keli.id, s.keli.synergy?.with ?? ""]));
  return (
    <ul className={styles.belt} aria-label="Vessels carried">
      {held.map((id) => {
        const keli = keliById[id];
        if (!keli) return null;
        return (
          <li
            key={id}
            className={`${styles.beltLetter} ${lit.has(id) ? styles.beltAscendant : ""}`}
            title={`${keli.name} — ${keli.found}`}
          >
            <span className="hebrew" lang="he">
              {keli.hebrew.slice(0, 1)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

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

/**
 * Fills `{jump}`, `{act}`, `{up}` and the rest in with the key itself — the
 * keyboard's name and the pad's glyph, side by side.
 *
 * Every instruction in the game goes through here, so a line written once
 * reads correctly at a desk and on a phone. Text with no tokens simply passes
 * through, which is why the region's own teaching and the world's messages can
 * share the same caption.
 */
function Press({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\{[a-z]+\})/).map((part, i) => {
        const control = /^\{[a-z]+\}$/.test(part)
          ? controlById[part.slice(1, -1) as ControlId]
          : undefined;
        if (!control) return part;
        return (
          <span key={`${part}-${i}`} className={styles.token}>
            <kbd className={styles.kbd}>{control.keys[0]}</kbd>
            {/* The arrows are already their own pad glyph — printing both
                would just read "←←". */}
            {!control.keys.includes(control.pad) && (
              <span className={styles.tokenPad} aria-hidden="true">
                {control.pad}
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}

/**
 * The ways of the body — every key, what it does, and which letters it serves.
 *
 * Generated from `controls.ts` and the `controls` field on each ability, which
 * is the whole point: the panel cannot fall out of step with the bindings the
 * canvas actually listens for, and it cannot omit a key the way the old
 * one-line hint omitted Up and Down.
 */
function Ways({ held }: { held: readonly string[] }) {
  return (
    <ul className={styles.ways}>
      {CONTROLS.map((control) => (
        <Way key={control.id} control={control} held={held} />
      ))}
    </ul>
  );
}

function Way({ control, held }: { control: Control; held: readonly string[] }) {
  const serves = abilitiesFor(control.id);
  const waiting = stillWaiting(serves, held);
  return (
    <li className={styles.way}>
      <p className={styles.wayKeys}>
        {control.keys.map((key) => (
          <kbd key={key} className={styles.kbd}>
            {key}
          </kbd>
        ))}
        {!control.keys.includes(control.pad) && (
          <span className={styles.wayPad} aria-hidden="true" title="On a touch screen">
            {control.pad}
          </span>
        )}
      </p>
      <div>
        <p className={styles.wayName}>{control.name}</p>
        <p className={styles.wayDoes}>{control.does}</p>
        {serves.length > 0 && (
          <ul className={styles.serves}>
            {serves
              .filter((ability) => held.includes(ability.letterId))
              .map((ability) => (
                <Serves key={ability.letterId} ability={ability} />
              ))}
            {/* What the key will become, named by the barriers it will answer
                rather than by the letters — a Scribe should be able to see
                that a key has more in it without being told what waits in the
                next alcove. One line, not one per unfound letter. */}
            {waiting && (
              <li className={`${styles.serve} ${styles.serveUnknown}`}>Not yet — {waiting}.</li>
            )}
          </ul>
        )}
      </div>
    </li>
  );
}

/** What a key will come to answer, once the letters for it are found. */
function stillWaiting(serves: LetterAbility[], held: readonly string[]): string {
  const unknown = serves.filter((a) => !held.includes(a.letterId));
  if (unknown.length === 0) return "";
  // `crawl` is Tet's grace rather than a verb, and it still answers a tile —
  // so both sides of the ability are looked up.
  const barriers = unknown
    .map((a) => BARRIER_OF[(a.verb ?? a.grace) as keyof typeof BARRIER_OF])
    .filter((b): b is string => Boolean(b));
  const nameless = unknown.length - barriers.length;
  const rest = nameless > 0 ? `${nameless} letter${nameless === 1 ? "" : "s"} you have not found` : "";
  return [...barriers, rest].filter(Boolean).join(", ");
}

/** One job the key does, now that its letter is in hand. */
function Serves({ ability }: { ability: LetterAbility }) {
  const letter = lettersById[ability.letterId];
  return (
    <li className={styles.serve}>
      {letter && (
        <>
          <span className="hebrew" lang="he">
            {letter.glyph}
          </span>{" "}
        </>
      )}
      <strong>{ability.name}</strong> — <Press text={ability.press} />
    </li>
  );
}

/** Every key, then what each letter in hand does with it — and what stands in the way. */
function Keys({ held, regionIndex }: { held: readonly string[]; regionIndex: number }) {
  const standing = regionAt(regionIndex).klipot.kinds.map((k) => HUSKS[k]);
  return (
    <div className={styles.keysPanel}>
      <h3 className={styles.keysHeading}>The ways of the body</h3>
      <Ways held={held} />

      <h3 className={styles.keysHeading}>The letters you carry</h3>
      {held.length === 0 ? (
        <Callout>
          You carry no letters yet. Walk right, and the first alcove of Malchut will give you one.
        </Callout>
      ) : (
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
                    {ability.name}{" "}
                    <span className={styles.keyKind}>{ability.kind === "verb" ? "verb" : "grace"}</span>
                  </p>
                  <p className={styles.keyUse}>{ability.use}</p>
                  <p className={styles.keyPress}>
                    <Press text={ability.press} />
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        The bestiary, and only this rung's — a klipah is met before it is read
        about, and a full list on the first screen would give away nine rungs of
        the climb. Each says where it is from, because the whole claim of this
        game is that almost none of it is invented, and a claim you cannot check
        is decoration.
      */}
      <h3 className={styles.keysHeading}>What stands in the way</h3>
      <ul className={styles.keys}>
        {standing.map((husk) => (
          <li key={husk.kind} className={styles.key}>
            <span className={`${styles.keyGlyph} hebrew`} lang="he">
              {husk.hebrew}
            </span>
            <div>
              <p className={styles.keyName}>
                {husk.name}{" "}
                <span className={styles.keyKind}>
                  {/* Which tier it belongs to, because the two are not the same
                      claim: the klipot are human failures Tanach names, and a
                      creature is not doing anything wrong by existing. Saying
                      so is the difference between a bestiary and a list. */}
                  {isBeast(husk.kind) ? "creature" : "klipah"} · {husk.shells} shells
                </span>
              </p>
              <p className={styles.keyUse}>{husk.is}</p>
              <p className={styles.keySource}>{husk.source}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
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
  onBack,
  onInscribe,
  onAccept,
  onTakeVessel,
  onClose,
}: {
  plate: Plate;
  ascent: AscentRecord | null;
  world: World | null;
  encounter: ReturnType<typeof encounterFor>;
  onNext: (kindle?: boolean) => void;
  onSeal: () => void;
  /** Back to the overworld, at the end of a path. */
  onBack: () => void;
  onInscribe: (letterIds: [string, string, string]) => void;
  onAccept: (offer: UshpizinOffer) => void;
  /** A vessel accepted off its pedestal. Declining is `onClose`. */
  onTakeVessel: (keliId: string) => void;
  onClose: () => void;
}) {
  // Every plate autofocuses its button so the game can be played without a
  // mouse — and on a plate taller than the screen the browser scrolls that
  // button into view, which opens the crowning at its last line and scrolls
  // the plea past before it can be read. Put it back to the top; the focus is
  // still where it was.
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [plate]);

  return (
    <div className={styles.plateScrim} role="dialog" aria-modal="true">
      <div className={styles.plate} ref={body}>
        {plate.kind === "path-done" && ascent && (
          <PathDonePlate ascent={ascent} path={plate.path} onBack={onBack} />
        )}
        {plate.kind === "guardian-done" && (
          <GuardianDonePlate sefirah={plate.sefirah} onBack={onBack} />
        )}
        {plate.kind === "letter" && <LetterPlate letterId={plate.letterId} onClose={onClose} />}
        {plate.kind === "fragment" && (
          <FragmentPlate index={plate.index} held={plate.held} onClose={onClose} />
        )}
        {plate.kind === "scroll-whole" && <ScrollWholePlate onClose={onClose} />}
        {plate.kind === "vessel" && ascent && (
          <VesselPlate
            keliId={plate.keliId}
            held={ascent.items ?? []}
            onTake={onTakeVessel}
            onClose={onClose}
          />
        )}
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
        {plate.kind === "out" && ascent && <OutPlate ascent={ascent} onSeal={onSeal} />}
        {plate.kind === "sealed" && ascent && (
          <SealedPlate ascent={ascent} encounter={encounter} onSeal={onSeal} />
        )}
      </div>
    </div>
  );
}

/**
 * A vessel found. The same shape as a letter's plate on purpose — it is the
 * other thing you can pick up — but it names what it *changes* rather than
 * what it lets you do, and it names any pair it has just completed, because a
 * synergy nobody is told about is a synergy nobody has.
 */
/**
 * A vessel offered.
 *
 * The synergies are shown for the hand the Scribe *already* holds, which is the
 * point of showing them at all now that the answer can be no: a vessel that is
 * ordinary alone and remarkable beside something in the belt should say so
 * before it is refused. What it does is named from its own numbers rather than
 * from a line written next to them, so the plate cannot promise what the vessel
 * stopped doing three retunings ago.
 */
function VesselPlate({
  keliId,
  held,
  onTake,
  onClose,
}: {
  keliId: string;
  held: readonly string[];
  onTake: (keliId: string) => void;
  onClose: () => void;
}) {
  const keli = keliById[keliId];
  if (!keli) return null;
  const lit = synergiesIn([...held, keliId]).filter(
    (s) => s.keli.id === keliId || s.keli.synergy?.with === keliId,
  );
  const does = describeEffect(keli.effect);
  return (
    <>
      <p className={styles.plateKicker}>A vessel is offered</p>
      <h2 className={styles.plateTitle}>{keli.name}</h2>
      <p className={`${styles.plateHeb} hebrew`} lang="he">
        {keli.hebrew}
      </p>
      <p className={styles.plateUse}>{keli.found}</p>
      {does && <p className={styles.vesselDoes}>{does}</p>}
      {lit.map((s) => (
        <p key={s.keli.id} className={styles.offerGrants}>
          {s.line}
        </p>
      ))}
      <div className={styles.plateActions}>
        <Button variant="primary" onClick={() => onTake(keliId)} autoFocus>
          Take it up
        </Button>
        <Button onClick={onClose}>Leave it</Button>
      </div>
      <p className={styles.vesselLeft}>
        Left on its pedestal it stays there, and the map goes on naming it.
      </p>
    </>
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
      {/* The key, named at the one moment it can be learned. Without this the
          plate says what the power is and never how to use it. */}
      <p className={styles.platePress}>
        <Press text={ability.press} />
      </p>
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
 * a bargain declined is allowed to cost.
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
  // The piece of the charge this rung holds. Keyed by Sefirah rather than by
  // figure, because either House may stand here and both of them did the same
  // thing at this rung — see `story.ts`.
  const testimony = TESTIMONY[sefirah];
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

      {testimony && (
        <div className={styles.testimony}>
          <DecoratedRule />
          <p className={styles.plateKicker}>What you are accused of</p>
          <p className={styles.charge}>&ldquo;{testimony.charge}&rdquo;</p>
          <p className={styles.offerSaying}>&ldquo;{testimony.answer}&rdquo;</p>
        </div>
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

/**
 * The end of a path — and it is deliberately not the end of anything else.
 *
 * A region-done plate had to carry the whole of what happened between rungs,
 * because there was nowhere else for it to happen: the next rung, its teaching,
 * and the one spend light has. On the Tree all of that belongs to the map,
 * which the Scribe is about to be standing on and can take their time over. So
 * this says where they came out and gets out of the way.
 */
function PathDonePlate({
  ascent,
  path,
  onBack,
}: {
  ascent: AscentRecord;
  path: TreePath;
  onBack: () => void;
}) {
  const arrived = regionOfSefirah(standingAt(ascent));
  const letter = lettersById[path.letter];
  const gained = ascent.lettersHeld.includes(path.letter);
  return (
    <>
      <p className={styles.plateKicker}>The path is walked</p>
      <h2 className={styles.plateTitle}>You come out in {arrived.name}</h2>
      <p className={`${styles.plateHeb} hebrew`} lang="he">
        {arrived.hebrew}
      </p>
      <p className={styles.plateUse}>{arrived.teaching}</p>
      <p className={styles.plateDerivation}>
        {/* A path pays its letter into an alcove on its own ground, so walking
            one and *taking* what it holds are two different things — and a
            Scribe who ran for the exit should be told which they did. */}
        {gained
          ? `${letter?.transliteration ?? path.letter} is yours.`
          : `${letter?.transliteration ?? path.letter} lies on this path still — it was not lifted.`}{" "}
        {ascent.lettersHeld.length} of the twenty-two · {ascent.or} light carried.
      </p>
      <div className={styles.plateActions}>
        <Button variant="primary" onClick={onBack} autoFocus>
          Stand on the Tree
        </Button>
      </div>
    </>
  );
}

/**
 * A Sefirah freed.
 *
 * The boon is named here and nowhere else, because this is the only moment it
 * means anything: it is not a thing the Scribe chose or bought, it is what is
 * left over from having done something once, and it will be true in every
 * climb after this one whether or not they ever read this plate again.
 */
function GuardianDonePlate({
  sefirah,
  onBack,
}: {
  sefirah: SefirahId;
  onBack: () => void;
}) {
  const guardian = guardianOf(sefirah);
  const spec = HUSKS[guardian.kind];
  const place = regionOfSefirah(sefirah);
  return (
    <>
      <p className={styles.plateKicker}>The Sefirah is freed</p>
      <h2 className={styles.plateTitle}>{spec.name} is broken</h2>
      <p className={`${styles.plateHeb} hebrew`} lang="he">
        {spec.hebrew}
      </p>
      <p className={styles.plateUse}>{spec.reading}</p>
      <p className={styles.plateDerivation}>{spec.source}</p>
      <p className={styles.offerGrants}>{guardian.boonLine}</p>
      <p className={styles.plateDerivation}>
        {place.name} can be kindled now, and this holds in every climb after this one.
      </p>
      <div className={styles.plateActions}>
        <Button variant="primary" onClick={onBack} autoFocus>
          Stand on the Tree
        </Button>
      </div>
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

/**
 * The light goes out, and the run ends the way it began.
 *
 * Not a death screen. An angel made of light whose light goes out is cast back
 * down to the kingdom — which is exactly what happened to him once already,
 * before the first rung. So the fall is the failure state, and it is also the
 * premise, and the record keeps every letter he found on the way.
 */
function OutPlate({ ascent, onSeal }: { ascent: AscentRecord; onSeal: () => void }) {
  return (
    <>
      <p className={styles.plateKicker}>The lamps are spent</p>
      <h2 className={styles.plateTitle}>You go out</h2>
      <p className={`${styles.plateHeb} hebrew`} lang="he">
        כִּבָּה
      </p>
      <p className={styles.plateUse}>{GOING_OUT}</p>
      <p className={styles.plateDerivation}>
        It has happened to you once before, and you did not remember that either. What you found is
        kept — {ascent.lettersHeld.length} of the twenty-two, and{" "}
        {regionAt(ascent.regionIndex).name} is as far as you came. The kingdom is where you wake,
        and the way up is where it was.
      </p>
      <Button variant="primary" onClick={onSeal} autoFocus>
        Fall, and begin again
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
      <p className={styles.plateQuestion}>{ABYSS_WORD}</p>
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
  // The case, from the Houses spoken with on the way up. `housesMet` has
  // always been recorded and until now was only ever counted.
  const witnesses = witnessesOf(ascent.housesMet);
  const plea = pleaFor({ hasMouth: ascent.lettersHeld.includes(SCROLL_LETTER), witnesses });
  /**
   * Two roads to the same plate, and they end for different reasons.
   *
   * The line ended by **arriving**: ten rungs in order, and Keter at the top of
   * them. The Tree ends by **spending** — the crown is one step from Chochmah
   * and a Scribe can be standing on it inside four paths, so arriving there
   * proves nothing. What proves something is three hundred light laid down
   * across all ten Sefirot, which is a climb that has been almost everywhere.
   */
  const byKindling = new Set(ascent.sefirotLit ?? []).size >= TOTAL_REGIONS;
  return (
    <>
      <p className={styles.plateKicker}>{byKindling ? "The Tree stands lit" : "Keter"}</p>
      <h2 className={styles.plateTitle}>
        {byKindling ? "All ten are kindled" : "The crown is reached"}
      </h2>
      <p className={`${styles.plateHeb} hebrew`} lang="he">
        {byKindling ? "עֵץ הַחַיִּים" : "כתר"}
      </p>
      <p className={styles.plateUse}>
        {byKindling
          ? `Every Sefirah on the Tree is burning, and you paid for all of it out of what you gathered walking ${(ascent.pathsWalked ?? []).length} paths. ${
              all
                ? "All twenty-two letters are in your hand as well."
                : `You did it carrying ${found} of the twenty-two letters — the rest are still lying on the paths you did not take.`
            }`
          : all
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

      <DecoratedRule />
      {/* What the whole climb was for. The Mouth is required and its absence is
          the one thing a climb that arrived can still get wrong — the ascent
          seals either way, the case simply is not made. */}
      <p className={styles.plateKicker}>{plea.kicker}</p>
      {plea.lines.map((line) => (
        <p key={line.slice(0, 24)} className={plea.kind === "mute" ? styles.pleaMute : styles.plea}>
          {line}
        </p>
      ))}

      {/* "Stood for you" is a claim about testimony, and a Scribe who arrives
          without a mouth got none — the Houses were met and then could not be
          called on. Saying they stood for him directly contradicts the plea
          three lines above it. */}
      <p className={styles.plateDerivation}>
        {ascent.or} light carried · {witnesses.length} of {WITNESSES_POSSIBLE} Houses{" "}
        {plea.kind === "mute" ? "met on the way" : "stood for you"} · seeded by {ascent.seedLabel}.
      </p>
      <Button variant="primary" onClick={onSeal} autoFocus>
        Seal the ascent
      </Button>
    </>
  );
}

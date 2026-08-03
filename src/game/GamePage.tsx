import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { dorotCardsById, dorotHousesById } from "../data/dorot";
import { lettersById } from "../data/letters";
import type { SefirahId } from "../types/letter";
import { Button, Callout, DecoratedRule } from "../components/ui";
import {
  currentAscent,
  kindleCost,
  standingAt,
  listAscents,
  saveAscent,
  type AscentRecord,
  type FormedWord,
} from "../storage/ascentRepo";
import { abilityByLetter, abilityForVerb, type Grace, type LetterAbility, type Verb } from "./abilities";
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
  nextLesson,
  readTaught,
  readTaughtTree,
  readTold,
  retire,
  retireTree,
  treeLesson,
  writeTaught,
  writeTaughtTree,
  writeTold,
  type LessonKey,
  type TreeDeed,
  type TreeLessonKey,
} from "./tutorial";
import { GameCanvas, type HudSample } from "./GameCanvas";
import { regionAt, regionOfSefirah, regions, TOTAL_REGIONS } from "./regions";
import { encounterFor, encounterTitle, isIllumined, rulesFor, sealedCount } from "./encounter";
import {
  hintsFor,
  HINT_COST,
  judge,
  lightFor,
  opens,
  type WordGateTarget,
  type WordGateVerdict,
} from "./wordGate";
import { dormantFor, offerFor, vowKept, type UshpizinOffer } from "./ushpizinOffers";
import { openWordGate, say } from "./world/step";
import { useGameAudio } from "./audio/useGameAudio";
import { readAscentTime } from "./sacredAscent";
import { fragmentAt, gather, SCROLL_LETTER, SCROLL_TOTAL, SCROLL_VERSE } from "./scroll";
import { GOING_OUT, HUSKS, isBeast, LAMPS } from "./combat";
import { afterFalling, wakeAt } from "./fall";
import { describeEffect, keliById, powersFrom, synergiesIn } from "./items";
import {
  ABYSS_WORD,
  endingOf,
  pleaFor,
  PROLOGUE,
  PROLOGUE_PAGES,
  sefirahOfCard,
  TESTIMONY,
  witnessesOf,
  WITNESSES_POSSIBLE,
} from "./story";
import { buildArena, buildPath, verbsOf } from "./world/build";
import { boonsFrom, guardianOf } from "./guardians";
import { guardiansFreed } from "../storage/ascentRepo";
import { TreeMap } from "./TreeMap";
import { afterWalking, crossesAbyss, nodeOf, TREE_PATHS, type TreePath } from "./tree";
import { readWarp, warpParams, warpRecord, type WarpOptions } from "./dev/warp";
import { frameStats, installProbe, neighbourhood, probeOf } from "./dev/probe";
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

type Plate =
  /**
   * **Why you are climbing, said once, before anything else.** Paged rather
   * than dumped: `page` indexes `PROLOGUE_PAGES`, and the last page is the
   * charge. Raised only on a Scribe's first Begin — see `readTold`.
   */
  | { kind: "prologue"; page: number }
  | { kind: "letter"; letterId: string }
  | { kind: "fragment"; index: number; held: number }
  | { kind: "scroll-whole" }
  | { kind: "house"; cardId: string }
  | { kind: "vessel"; keliId: string }
  | { kind: "word-gate" }
  | { kind: "word-result"; verdict: WordGateVerdict }
  | {
      kind: "path-done";
      path: TreePath;
      /**
       * How a vow taken at this rung's House turned out. Reported here because
       * the exit is where it is judged, and a caption raised at the exit is
       * hidden behind this plate a frame later.
       */
      vow?: { kept: boolean; figure: string; grantsLabel: string; terms: string };
    }
  | { kind: "guardian-done"; sefirah: SefirahId }
  /**
   * Raised *before* a crossing is walked, not after one is finished — which is
   * the whole reason it now fires. See `crossesAbyss`.
   */
  | { kind: "abyss"; path: TreePath }
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
  /** Every Sefirah freed across every climb — what the boons are drawn from. */
  const [freedEver, setFreedEver] = useState<SefirahId[]>([]);
  const [plate, setPlate] = useState<Plate | null>(null);
  /**
   * **The Tree, on Tab.** It used to be a whole screen you were returned to
   * between rungs; it is one overlay now, over whatever is behind it. Mid-rung
   * it is read-only — where you are, what is lit — and standing on a Sefirah it
   * is where the next path is chosen, which is the only place that choice has
   * ever been made.
   */
  const [mapOpen, setMapOpen] = useState(false);
  /** Everything that used to be stacked above the game, on Esc. */
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<HudSample>({
    or: 0,
    veiled: false,
    x: 0,
    onGround: false,
    used: [],
    lamps: LAMPS,
    out: false,
    orGathered: 0,
    veilings: 0,
    marksSet: 0,
  });
  /** Which lessons this Scribe has already been taught — per Scribe, not per run. */
  const [taught, setTaught] = useState<LessonKey[]>(() => readTaught());
  /** And the map's own three, which no keypress can retire — only the deed. */
  const [taughtTree, setTaughtTree] = useState<TreeLessonKey[]>(() => readTaughtTree());
  const learnTree = useCallback((deed: TreeDeed) => {
    setTaughtTree((prev) => {
      const next = retireTree(prev, deed);
      if (next.length !== prev.length) writeTaughtTree(next);
      return next;
    });
  }, []);
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
   * `onFinish` is created once and reads its world through refs, so the
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

  /**
   * The day's Sacred Time — the seed, the ascendant letter of the month, and
   * whatever the festival calendar grants.
   *
   * **State, not a once-memo.** It was `useMemo(…, [])`, so a session left
   * open across nightfall kept yesterday's seed, light and grace: the start
   * screen named the wrong day, and a Begin after midnight climbed yesterday's
   * Tree. It refreshes when the tab is looked at and once a minute, and only
   * re-renders when the Hebrew day has actually turned — the comparison is the
   * seed label, because the day turns at nightfall and no civil-date check
   * knows when that is.
   */
  const [time, setTime] = useState(() => readAscentTime(new Date()));
  useEffect(() => {
    const refresh = () => {
      const now = readAscentTime(new Date());
      setTime((prev) => (prev.seedLabel === now.seedLabel ? prev : now));
    };
    const every = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(every);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
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
        // **What a Scribe has become**, as against what this climb holds: every
        // Sefirah they have ever freed, including in climbs long since sealed.
        // Read once, here, so nothing downstream has to know about storage.
        setFreedEver(guardiansFreed(all));
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
  /**
   * What the Tree should be saying, for a Scribe who has just arrived on it.
   * Answers the question the map is putting in front of them right now rather
   * than working through a queue — see `treeLesson`.
   */
  const lessonOfTree = useMemo(() => {
    if (!ascent) return undefined;
    const at = standingAt(ascent);
    return treeLesson({
      learned: taughtTree,
      walked: (ascent.pathsWalked ?? []).length,
      freed: (ascent.guardiansBroken ?? []).includes(at),
      lit: (ascent.sefirotLit ?? []).includes(at),
    });
  }, [ascent, taughtTree]);

  const lesson = useMemo(
    () => nextLesson({ learned: taught, lettersHeld: letters.length }),
    [taught, letters.length],
  );
  // What the Scribe holds, plus whatever the day itself lends and whatever a
  // guest of the Houses has granted. All three are graces, never verbs.
  const graces: Grace[] = useMemo(() => {
    const held = letters.map((id) => abilityByLetter[id]?.grace).filter((g): g is Grace => Boolean(g));
    const lent = [...held, ...(ascent?.boons ?? [])];
    if (time.graceOfTheDay && !lent.includes(time.graceOfTheDay)) lent.push(time.graceOfTheDay);
    // And whatever the Encounter this climb belongs to holds open for the whole
    // of it — the Third's second stone is a grace like any other, so it arrives
    // by the same door rather than through a special case.
    for (const g of rulesFor(encounter)?.grants ?? []) if (!lent.includes(g)) lent.push(g);
    return lent;
  }, [letters, ascent?.boons, time.graceOfTheDay, encounter]);

  /**
   * The boons a Scribe carries into everything, from every guardian they have
   * ever broken — including the ones broken an hour ago in this same climb,
   * which is why the mounted list and the current record are folded together
   * rather than one being trusted.
   */
  const boons = useMemo(
    () => boonsFrom([...new Set([...freedEver, ...(ascent?.guardiansBroken ?? [])])]),
    [freedEver, ascent?.guardiansBroken],
  );

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

  /**
   * **The linear road is gone.** `enterRegion`, `beginAt` and `climbOn` built
   * `buildRegion(regionIndex)` and walked rungs one to ten in order — the game
   * as it was before the Tree, kept alive after it only because the dev warp
   * and seven harness scripts came in that way. The warp is Tree-native now
   * (`dev/warp.ts` writes `at` and `pathsWalked`), so the road had no callers
   * left but its own plate, and a road nobody drives is a second game to keep
   * correct: it is where the Abyss keystroke bug went to seal a climb without
   * kindling, and where `fight.test.ts` was measuring ground that no longer
   * ships. `buildRegion` itself stays — the rung tests build with it, and it
   * is still the honest generator for one Sefirah's ground.
   */
  const newRecord = useCallback(
    (variant = 0): AscentRecord => {
      const now = new Date().toISOString();
      // The variant re-reads the calendar rather than reusing the memoed
      // `time`, because the seed is `hash(label#variant)` and only this call
      // knows the variant. Everything else about the day is variant-blind.
      const day = variant === 0 ? time : readAscentTime(new Date(), "galut", variant);
      return {
        id: NEW_ID(),
        seed: day.seed,
        seedLabel: day.seedLabel,
        variant,
        // The day's light, frozen with the seed: a climb begun on Hanukkah is
        // a Hanukkah climb on every rung, however long it takes. The grace of
        // the day is deliberately *not* frozen — `sacredAscent` promises it is
        // "safe to give and safe to take away at midnight", and it is the one
        // piece of the day that is lent rather than kept.
        lightOfTheDay: day.lightOfTheDay,
        createdAt: now,
        updatedAt: now,
        regionIndex: 1,
        lettersHeld: [],
        or: 0,
        regionsCleared: [],
        housesMet: [],
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
    void (async () => {
      // **The first climb of a day is the day's own — every one after it is a
      // fresh shuffle.** Variant 0 is the shared daily Tree; counting today's
      // records gives each further Begin a different seed, which closes the
      // abandon-and-restart exploit (a re-begun climb used to get the same map
      // with the light restored) and makes replaying a day worth doing.
      const all = await listAscents().catch(() => []);
      // The climb being walked away from is put down, explicitly. Left merely
      // unsealed it only *seemed* gone: `currentAscent` takes the freshest
      // unsealed record, so the moment the new climb sealed, the abandoned one
      // — mid-Tree, on a stale seed — became current again.
      const open = ascent && !ascent.sealedAt && !ascent.abandonedAt ? ascent : undefined;
      if (open) {
        const closed = { ...open, abandonedAt: new Date().toISOString() };
        await saveAscent(closed).catch(() => undefined);
      }
      const todays = all.filter((a) => a.seedLabel === time.seedLabel);
      const record = newRecord(todays.length);
      persist(record);
      setWorld(null);
      setWalking(null);
      // **The prologue, on a first Begin only.** The threshold's own comment
      // has promised since the UI was cut back that the premise is "the first
      // thing the game says once they press the button" — it never was. It is
      // now, once per Scribe, and the map holds back behind it (see the effect
      // that raises the Tree) so the first thing a stranger sees is why they
      // are here rather than a diagram of ten circles.
      setPlate(readTold() ? null : { kind: "prologue", page: 0 });
    })();
  }, [ascent, newRecord, persist, time.seedLabel]);

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
      // **On the Tree, not on a rung.** This handed the record to `beginAt`,
      // which builds `buildRegion(regionIndex)` — the pre-Tree linear road. So
      // every warped check verified a road no player has walked since the
      // overworld shipped, and seven of nine harness scripts entered that way.
      // The record carries `at` and `pathsWalked` now (see `warpRecord`), so
      // persisting it puts the Scribe on the map with the ways out in front of
      // them, which is the door a player actually comes through.
      persist(
        warpRecord(options, {
          id: NEW_ID(),
          seed: time.seed,
          seedLabel: time.seedLabel,
          notes: time.notes,
          ascendantLetterId: time.ascendantLetterId,
          encounterNumber: encounterFor(sealedBefore)?.number,
        }),
      );
      setWorld(null);
      setWalking(null);
      setFacing(null);
      setPlate(null);
    },
    [persist, setParams, time, sealedBefore],
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
      frames: () => frameStats(),
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
      // `gather` is the rule, and it refuses an index that names no piece of
      // the verse as well as one already held — the second lock on the door the
      // builder's `fragmentsFrom` fixed, because what it guards is the one
      // letter in this game that has to be walked to.
      const held = gather(prev.scrollFragments ?? [], index);
      if (!held) return prev;
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
    (letterIds: [string, string, string], hintsTaken = 0) => {
      if (!world?.wordGate) return;
      const verdict = judge(letterIds, world.wordGate);
      const light = lightFor(verdict, hintsTaken);
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

  /**
   * A guest's grace, written onto the climb.
   *
   * On the record rather than in React state, because it has to outlive the
   * rung it was given on — see `AscentRecord.boons`. Three of the seven guests
   * grant at the exit, and the exit used to be the last moment the old state
   * existed.
   */
  const giveBoon = useCallback((grace: Grace) => {
    setAscent((prev) => {
      if (!prev || (prev.boons ?? []).includes(grace)) return prev;
      const next: AscentRecord = {
        ...prev,
        boons: [...(prev.boons ?? []), grace],
        updatedAt: new Date().toISOString(),
      };
      void saveAscent(next).catch(() => undefined);
      return next;
    });
  }, []);

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
        // Said into the world, because a vow binds from here and the plate is
        // about to close over it. Judged at the exit — see `PathDonePlate`.
        say(world, `You give ${offer.figure} your word: ${offer.terms.toLowerCase()}.`);
      } else {
        giveBoon(offer.grants);
      }
      setPlate(null);
    },
    [world, encounter, giveBoon],
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
    let vowOutcome: { kept: boolean; figure: string; grantsLabel: string; terms: string } | undefined;
    if (vow && world) {
      const since = {
        orGathered: world.orGathered - vow.at.orGathered,
        veilings: world.veilings - vow.at.veilings,
        marksSet: world.marksSet - vow.at.marksSet,
      };
      const kept = vowKept(vow.offer.vow!, since);
      if (kept) giveBoon(vow.offer.grants);
      // **Said out loud, either way.** A vow was the one bargain in this game
      // with a delayed outcome and the only one that reported nothing: the
      // Scribe was never told it was taken, never told it was kept, and never
      // told it was broken. With the reward inert as well, the three vow guests
      // were indistinguishable from Decline.
      vowOutcome = {
        kept,
        figure: vow.offer.figure,
        grantsLabel: vow.offer.grantsLabel,
        terms: vow.offer.terms,
      };
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
        ? { kind: "path-done", path: walking, vow: vowOutcome }
        : ascent?.regionIndex === TOTAL_REGIONS
          ? { kind: "sealed" }
          : // The Abyss plate used to be raised here, on the linear road's
            // seventh index, and on the Tree `walking` is always set, so it
            // never once fired. It is raised on stepping *onto* a crossing
            // now — see `chooseWay` — which is where it belonged: the plate
            // says what is on the far side, and saying it afterwards is a
            // travel guide handed out at the destination.
            // Reached only by a world with no `walking` — which, since the
            // linear road came out, nothing builds. Kept as the honest
            // fallback for a world the page did not start.
            { kind: "path-done", path: TREE_PATHS[0] },
    );
  }, [ascent?.regionIndex, world, vow, audio, walking, facing, giveBoon]);

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
        ascent.lightOfTheDay ?? time.lightOfTheDay,
        teaching,
        (ascent.pathsWalked ?? []).includes(path.id),
        rulesFor(encounter)?.klipot ?? 1,
        ascent.items ?? [],
      );
      const carried = powersFrom(ascent.items ?? [], boons);
      next.player.lamps += carried.lamps;
      next.orPerMote = Math.max(1, Math.round(next.orPerMote * carried.light));
      // The path's own two ends, not the rung's capped index — see `layEncounter`.
      layEncounter(next, path.ends);
      setWalking(path);
      setWorld(next);
      setVow(null);
      setPlate(null);
    },
    [ascent, time.lightOfTheDay, layEncounter, encounter],
  );

  /**
   * Choosing a way out of where you stand — and the one place the Tree stops
   * and says something first.
   *
   * A crossing is told about before it is walked, because what the plate says
   * is what is on the *far* side: no House, no figure, no mark, and a gate on
   * the way out that has to be answered. All of that is a decision to make at
   * the near edge of the gulf, so it is put there. Every other path is stepped
   * onto without ceremony, which is what keeps this one meaning anything.
   */
  const chooseWay = useCallback(
    (path: TreePath) => {
      // Choosing is the deed, not arriving: the lesson was "choose one", and a
      // Scribe standing at the near edge of a crossing has plainly done it.
      learnTree("way");
      if (crossesAbyss(path)) setPlate({ kind: "abyss", path });
      else walkPath(path);
    },
    [walkPath, learnTree],
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
    learnTree("guardian");
    const room = buildArena(at, ascent.seed);
    const carried = powersFrom(ascent.items ?? [], boons);
    room.player.lamps += carried.lamps;
    setWalking(null);
    setFacing(at);
    setWorld(room);
    setVow(null);
    setPlate(null);
  }, [ascent, learnTree]);

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
      learnTree("kindle");
      return next;
    });
  }, [learnTree]);

  const sealAscent = useCallback(() => {
    setAscent((prev) => {
      if (!prev) return prev;
      // The ending is frozen here, at the moment it is true — see
      // `AscentRecord.endingPlea`. The plate computed it to *show* it; this is
      // the record keeping what was shown.
      const next: AscentRecord = {
        ...prev,
        ...endingOf(prev.lettersHeld, prev.housesMet),
        sealedAt: new Date().toISOString(),
      };
      void saveAscent(next).catch(() => undefined);
      return next;
    });
    setWorld(null);
    setPlate(null);
  }, []);

  /**
   * **The last lamp goes out, and the Scribe wakes.**
   *
   * Not `sealAscent`, which is what this used to be and is the debt this pays:
   * the plate said "the kingdom is where you wake, and the way up is where it
   * was" and its button closed the record. The rules are in `fall.ts`, pure and
   * tested there; all this does is write them down and put the Scribe back on
   * the map.
   *
   * `walking` is cleared along with the world, because the path was not walked
   * — it is not in `pathsWalked`, so it is not spent, and its letter was not
   * paid. Whatever light it had gathered was in `world.or` and is folded into
   * the record only by `onNext`, so it goes out with the rest.
   */
  const fall = useCallback(() => {
    setAscent((prev) => {
      if (!prev) return prev;
      const next: AscentRecord = {
        ...prev,
        ...afterFalling(prev),
        updatedAt: new Date().toISOString(),
      };
      void saveAscent(next).catch(() => undefined);
      return next;
    });
    setWorld(null);
    setWalking(null);
    setFacing(null);
    setPlate(null);
  }, []);

  /**
   * **Arriving on the Tree opens the Tree.** Standing between rungs *is* the
   * map — there is nothing else to be doing there — so it raises itself rather
   * than asking for a keypress the Scribe has not learned yet. Tab closes it
   * again, and Tab brings it back.
   */
  useEffect(() => {
    // The one thing that outranks it is the telling: a stranger's first sight
    // of this game should not be ten circles behind a paragraph.
    if (plate?.kind === "prologue") return;
    if (!world && ascent && !ascent.sealedAt) setMapOpen(true);
    if (world) setMapOpen(false);
  }, [world, ascent, plate]);

  /**
   * Tab is the map and Esc is the menu — the two keys this page has, beyond the
   * ones the body uses.
   *
   * **A plate outranks both.** It has its own handler (below) and its own
   * Escape, and a Scribe reading what a guest just offered should not have the
   * Tree thrown over the top of it by a mistyped Tab.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (plate) return;
      if (e.key === "Tab") {
        // Or focus leaves for the browser's own furniture, which on a full
        // window is nothing the Scribe wants.
        e.preventDefault();
        if (!paused && ascent) setMapOpen((open) => !open);
        return;
      }
      if (e.key !== "Escape") return;
      e.preventDefault();
      // Innermost first: the map closes before the menu opens, so Escape always
      // means "back one" rather than "somewhere else".
      if (paused) setPaused(false);
      else if (mapOpen && world) setMapOpen(false);
      else setPaused(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plate, paused, mapOpen, world, ascent]);

  /**
   * Turn the prologue's page — or, on Escape, put the rest of it down.
   *
   * Either way the Scribe is marked told. A telling you can be made to sit
   * through a second time because you skipped it the first is a worse thing
   * than a telling that was skipped; it is available whole behind Esc for as
   * long as the game exists, which is where a person who wants it will look.
   */
  const turnPrologue = useCallback((skip = false) => {
    setPlate((prev) => {
      if (prev?.kind !== "prologue") return prev;
      const next = prev.page + 1;
      if (skip || next >= PROLOGUE_PAGES.length) {
        writeTold();
        return null;
      }
      return { kind: "prologue", page: next };
    });
  }, []);

  // Dismiss a plate with the keyboard, so a run never needs the mouse.
  useEffect(() => {
    if (!plate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== "Escape" && e.code !== "Space") return;
      // The prologue is the one plate where Enter means *more*, not *away*:
      // it turns the page, and only Escape puts it down.
      if (plate.kind === "prologue") {
        e.preventDefault();
        turnPrologue(e.key === "Escape");
        return;
      }
      // A pedestal is the one plate that asks a *question*, so the keyboard
      // must not answer it. Swallowed here, Enter would have dismissed the
      // plate — which now means "leave it" — while the Scribe was looking at a
      // focused "Take it up". Let the buttons have the keys: Enter and Space
      // press whichever is focused, and Escape is handled below as declining.
      //
      // **The Abyss plate asks a question too**, and it was not in this list —
      // so Enter fell through the enumeration below to the linear road, which
      // at region ten raised the sealed plate: a climb sealed without kindling
      // anything, and the Seven Encounters advanced by a keystroke. The road is
      // gone now, but the shape of the mistake is not: any plate whose buttons
      // are an *answer* belongs in this branch, not the one below.
      if (plate.kind === "vessel" || plate.kind === "abyss") {
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
      // **This must never become a way of getting on for free.** Enter once
      // fell through to the linear road, which carried a Scribe whose last lamp
      // had just gone out up to the next rung with three fresh ones — caught by
      // a harness run that went out in Netzach and finished in Tiferet. Both
      // the road and that bug are gone; the rule they taught is not.
      else if (plate.kind === "sealed") sealAscent();
      else if (plate.kind === "out") fall();
      // The end of a path goes back to the map, never on to a next rung — there
      // is no next rung on the Tree until the Scribe chooses one.
      else if (plate.kind === "path-done" || plate.kind === "guardian-done") backToTree();
      // The linear road's own plate, and **only** that one. This used to be the
      // `else`, which is how the Abyss bug happened: a catch-all that climbs is
      // a trap for every plate added after it. The road is gone; a plate this
      // handler does not name is dismissed, which is the worst it can suffer.
      else setPlate(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plate, sealAscent, fall, backToTree, turnPrologue]);

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
      {/* **No header.** The page used to open with a page title, a Hebrew
          subtitle and a nine-line lede before anything playable — see
          `GameShell.tsx`. What is left is the corner bar at the foot of this
          component, which names the two keys and the way out. */}

      {/* Standing on the Tree between rungs. The map raises itself over this
          (see the effect above), so this is what is behind it when the Scribe
          closes it — quiet on purpose, and never empty. */}
      {!world && ascent && !ascent.sealedAt && <Standing ascent={ascent} />}

      {!world && (!ascent || ascent.sealedAt) && (
        <Threshold
          ascent={ascent}
          time={time}
          encounter={encounter}
          taught={allLearned(taught)}
          onBegin={beginAscent}
        />
      )}

      {world && ascent && region && (
        <div className={styles.playing}>
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
            {/* A word given, and whether it is still good. */}
            {vow && <VowMark offer={vow.offer} at={vow.at} now={hud} />}
          </div>

          <GameCanvas
            world={world}
            verbs={verbs}
            graces={graces}
            markGlyph={lettersById[ascent.ascendantLetterId ?? "aleph"]?.glyph ?? "א"}
            items={ascent.items ?? []}
            boons={boons}
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

          {/* **The toolbar is gone.** A row of buttons under the canvas —
              the keys panel, the sound toggle, a legend of every key, and the
              nigun's provenance — was the last of the documentation sitting on
              top of the game. All of it is behind Esc now, which is where a
              game keeps it. */}
        </div>
      )}

      {plate && (
        <PlateOverlay
          plate={plate}
          ascent={ascent}
          world={world}
          verbs={verbs}
          encounter={encounter}
          onWalk={walkPath}
          onSeal={sealAscent}
          onFall={fall}
          onTurn={turnPrologue}
          onBack={backToTree}
          onInscribe={inscribe}
          onAccept={acceptOffer}
          onTakeVessel={takeVessel}
          onClose={() => setPlate(null)}
        />
      )}

      {/* **The Tree, over whatever is behind it.** One surface for both jobs:
          read-only while a rung is being walked, and live where the Scribe is
          actually standing. It used to be a screen you were sent back to. */}
      {mapOpen && ascent && !ascent.sealedAt && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="The Tree">
          <div className={styles.overlayBody}>
            <TreeMap
              ascent={ascent}
              at={standingAt(ascent)}
              readOnly={Boolean(world)}
              onWalk={chooseWay}
              onKindle={kindleHere}
              onFace={faceGuardian}
              onSeal={allKindled(ascent) ? () => setPlate({ kind: "sealed" }) : undefined}
            />
          </div>
          {/* **The map teaches itself.** The porch taught the body and then
              the Tree rose with nothing said about it: the one line here read
              "Choose a way out", which is the first of the three things a
              Scribe has to learn on this surface and never the other two.
              Shown only where the map is live — mid-rung the Tree is a
              picture, and a picture should not give instructions. */}
          {!world && lessonOfTree && <p className={styles.overlayLesson}>{lessonOfTree.text}</p>}
          {/* The Tree is where a climb is planned, so it is where the rule this
              climb is played under belongs — a fourth lamp is worth knowing
              about before choosing which way to spend it. */}
          <TheRule encounter={encounter} className={styles.overlayRule} />
          {/* No button. The key that opened it closes it, and saying so once
              here is how that gets learned. */}
          <p className={styles.overlayFoot}>
            {world ? "You are on the way — the Tree is only shown." : "Choose a way out."} Tab or Esc
            to close.
          </p>
        </div>
      )}

      {paused && (
        <PauseMenu
          ascent={ascent}
          time={time}
          audio={audio}
          onClose={() => setPaused(false)}
          onBeginAgain={
            ascent && !ascent.sealedAt
              ? () => {
                  setPaused(false);
                  beginAscent();
                }
              : undefined
          }
        >
          {/* The warp is a tool, and tools belong in the drawer with the rest
              of them rather than under the title of the game. */}
          {import.meta.env.DEV && !world && DevPanel && <DevPanel onWarp={warpTo} />}
        </PauseMenu>
      )}

      {/* The whole of the furniture: the two keys, and the way back. */}
      <div className={styles.cornerBar}>
        <Link to="/" className={styles.cornerLink}>
          ← The Treasury
        </Link>
        {/* **Tappable, not just named.** A phone has no Tab and no Esc, and
            the map used to be a page you could scroll to. Buttons, so the two
            surfaces are reachable by thumb — the key names stay because that is
            how anyone at a keyboard should be reaching them. */}
        <span className={styles.cornerKeys}>
          {ascent && !ascent.sealedAt && (
            <>
              <button type="button" className={styles.cornerButton} onClick={() => setMapOpen((o) => !o)}>
                <kbd>Tab</kbd> the Tree
              </button>
              <span aria-hidden="true"> · </span>
            </>
          )}
          <button type="button" className={styles.cornerButton} onClick={() => setPaused((p) => !p)}>
            <kbd>Esc</kbd> the ways of the body
          </button>
        </span>
      </div>
    </div>
  );
}

/**
 * Standing on the Tree between rungs, behind the map.
 *
 * Deliberately almost nothing: the Scribe is here for a moment, on their way to
 * choosing a path, and the map is already up in front of it. It exists so that
 * closing the map does not reveal an empty page.
 */
function Standing({ ascent }: { ascent: AscentRecord }) {
  const here = regionOfSefirah(standingAt(ascent));
  const lit = (ascent.sefirotLit ?? []).length;
  return (
    <div className={styles.standing}>
      <p className={styles.standingKicker}>You stand in</p>
      <h1 className={styles.standingName}>{here.name}</h1>
      <p className={`${styles.standingHeb} hebrew`} lang="he">
        {here.hebrew}
      </p>
      <p className={styles.standingLine}>
        {lit} of ten kindled · {ascent.lettersHeld.length} of twenty-two · {ascent.or} light
      </p>
      <p className={styles.standingHint}>
        <kbd>Tab</kbd> for the Tree
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// the start screen, and the menu behind Esc
// ---------------------------------------------------------------------------

/**
 * **The start screen.**
 *
 * What stood here was three and a half thousand pixels: a page header, a
 * nine-line lede, the Encounter, the prologue open by default, the day's notes,
 * a complete eight-key reference, the Begin button somewhere in the middle of
 * it, a ten-row ladder of the Sefirot and the dev warp — inside the site's nav
 * and footer. A Scribe arriving to play had to read a manual to find the door.
 *
 * All of it still exists. It is behind Esc (`PauseMenu`), which is where a game
 * keeps its manual. What is left here is the title, one line of why, and the
 * way in.
 */
function Threshold({
  ascent,
  time,
  encounter,
  taught,
  onBegin,
}: {
  ascent: AscentRecord | null;
  time: ReturnType<typeof readAscentTime>;
  encounter: ReturnType<typeof encounterFor>;
  /** Whether this Scribe has been through the opening lessons before. */
  taught: boolean;
  onBegin: () => void;
}) {
  const sealed = ascent?.sealedAt;
  return (
    <section className={styles.start}>
      <div className={styles.startInner}>
        <p className={styles.startKicker}>The Practice</p>
        <h1 className={styles.startTitle}>Ma&apos;alot</h1>
        <p className={`${styles.startHeb} hebrew`} lang="he">
          מַעֲלוֹת
        </p>
        {/* One line, not nine. The rest of the premise is the prologue, and the
            prologue is behind Esc — or, for a Scribe who has never begun, it is
            the first thing the game says once they press the button. */}
        <p className={styles.startLede}>
          You were the scribe of the crown, and you were cast down to the kingdom without being told
          what for. Climb back on the twenty-two letters, and ask.
        </p>

        <div className={styles.startActions}>
          {/* No Resume here, and none is needed: this screen renders only when
              there is no open climb (an open one lands on the Tree directly),
              so the branch that offered to resume was unreachable — deleted
              rather than kept as a promise the render condition breaks. */}
          <Button variant="primary" onClick={onBegin} autoFocus>
            {taught ? "Begin the ascent" : "Begin — the way will be shown"}
          </Button>
        </div>

        {sealed && ascent && (
          <p className={styles.startLast}>
            Your last ascent reached the crown with {ascent.lettersHeld.length} of the twenty-two
            letters and {ascent.or} light.
          </p>
        )}

        <p className={styles.startDay}>
          {time.seedLabel} · {encounter ? encounterTitle(encounter) : "Beyond the seven"}
        </p>
        <TheRule encounter={encounter} />
      </div>
    </section>
  );
}

/**
 * **What this Encounter changes, in its own words.**
 *
 * Seven rules were authored, each one moving a real number — a fourth lamp, a
 * doubled shell, guests who ask no price — and `encounter.test.ts` proves no
 * two of them are the same rule wearing different names. Not one of them had
 * ever been printed anywhere. The game's only across-run system was invisible:
 * a Scribe on their fourth climb was carrying a fourth lamp and had no way to
 * know why, or that it was the Encounter that gave it.
 *
 * It goes in the three places a climb is *thought about* — the threshold before
 * one begins, the Tree while one is being planned, and the plate that seals it
 * — and nowhere else, because a rule repeated on every rung stops being read.
 */
function TheRule({
  encounter,
  className,
}: {
  encounter: ReturnType<typeof encounterFor>;
  className?: string;
}) {
  const rule = rulesFor(encounter);
  if (!rule) return null;
  // "This climb" rather than "today": the Encounter is the *count of sealed
  // ascents*, not the calendar. Two climbs on one day can sit under different
  // rules, and a climb left open across a week keeps the one it began under.
  return <p className={className ?? styles.startRule}>This climb: {rule.rule}</p>;
}

/**
 * **Esc — everything the threshold used to stack on top of the game.**
 *
 * The ways of the body, the day's notes, the prologue and the ten Sefirot. None
 * of it was wrong; all of it was in front of the door. A pause menu is where a
 * game keeps this, and it is the one place all four belong together: they are
 * the things a Scribe wants *while* climbing and never wants twice.
 */
function PauseMenu({
  ascent,
  time,
  audio,
  onClose,
  onBeginAgain,
  children,
}: {
  ascent: AscentRecord | null;
  time: ReturnType<typeof readAscentTime>;
  audio: ReturnType<typeof useGameAudio>;
  onClose: () => void;
  /**
   * Put this climb down and begin a fresh one — offered only while a climb is
   * open. **This is the only door to abandoning**: the start screen never
   * renders while a climb is open, so without this a stuck climb could never
   * be walked away from. The abandoned record is closed (`abandonedAt`), not
   * shadowed, and the fresh climb draws the day's next variant — a different
   * Tree, so beginning again is a fresh start rather than a reset.
   */
  onBeginAgain?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="The ways of the body">
      <div className={styles.overlayBody}>
        <div className={styles.pauseHead}>
          <h2 className={styles.pauseTitle}>The ways of the body</h2>
          <Button onClick={onClose} autoFocus>
            Back to the climb
          </Button>
        </div>

        {/* What this Scribe can actually do, then every key there is. The
            first is the useful one mid-climb; the second is the reference the
            threshold used to open with. */}
        {ascent && <Keys held={ascent.lettersHeld} regionIndex={ascent.regionIndex} />}

        <details className={styles.waysDetails} open={!ascent}>
          <summary className={styles.waysSummary}>Every key</summary>
          <Ways held={[]} />
        </details>

        <DecoratedRule />

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

        <p className={styles.pauseToggles}>
          <label>
            <input type="checkbox" checked={audio.on} onChange={() => audio.toggle()} /> Sound
          </label>
        </p>

        {onBeginAgain && (
          <p className={styles.pauseToggles}>
            <Button onClick={onBeginAgain}>Begin again from Malchut — this climb is put down</Button>
          </p>
        )}

        <DecoratedRule />

        {/* The whole of it, always — this is the promise the skip button on the
            played prologue makes, and it has to be kept somewhere. */}
        <details className={styles.prologue}>
          <summary className={styles.prologueSummary}>{PROLOGUE.kicker}</summary>
          {PROLOGUE.lines.map((line) => (
            <p key={line.slice(0, 24)} className={styles.prologueLine}>
              {line}
            </p>
          ))}
          <p className={styles.prologueCharge}>{PROLOGUE.charge}</p>
        </details>

        <details className={styles.prologue}>
          <summary className={styles.prologueSummary}>The ten Sefirot</summary>
          <ol className={styles.ladder}>
            {[...regions].reverse().map((r) => {
              const lit = (ascent?.sefirotLit ?? []).includes(r.sefirah);
              return (
                <li key={r.index} className={[styles.rung, lit ? styles.rungLit : ""].filter(Boolean).join(" ")}>
                  <span className={`${styles.rungHeb} hebrew`} lang="he">
                    {r.hebrew}
                  </span>
                  <span className={styles.rungName}>{r.name}</span>
                  <span className={styles.rungGloss}>{r.middah}</span>
                </li>
              );
            })}
          </ol>
        </details>

        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HUD pieces
// ---------------------------------------------------------------------------

/**
 * The vessels, beside the letters and deliberately not among them. One belt
 * says what the Scribe *is*; the other says what he is carrying.
 */
/**
 * **A vow, while it is still being kept.**
 *
 * The three vow guests were the only bargain in this game with nothing to
 * watch: a Scribe swore at the House, the plate closed over it, and for the
 * length of a whole rung the game said nothing — then announced a verdict at
 * the exit about a promise they had no running account of. Two of the three
 * are especially cruel that way, because a veiling and a mark are things that
 * happen *to* you in the middle of a fight, and by the time the exit says the
 * word was broken there was never a moment where it could have been saved.
 *
 * The reading is honest because these vows are **monotone**: light taken,
 * veilings and marks only ever go up, so a vow that is broken can never come
 * back — see `ushpizin.test.ts`. What is shown here is therefore the verdict
 * itself, arrived at early, not a guess at one. And it is the same call the
 * exit makes: `vowKept` over the difference since the swearing.
 */
function VowMark({
  offer,
  at,
  now,
}: {
  offer: UshpizinOffer;
  at: { orGathered: number; veilings: number; marksSet: number };
  now: HudSample;
}) {
  const kept = vowKept(offer.vow!, {
    orGathered: now.orGathered - at.orGathered,
    veilings: now.veilings - at.veilings,
    marksSet: now.marksSet - at.marksSet,
  });
  return (
    <p className={kept ? styles.vowMark : styles.vowMarkBroken}>
      <span aria-hidden="true">{kept ? "❧" : "✕"}</span> Your word to {offer.figure}:{" "}
      {offer.terms.replace(/^Vow:\s*/, "")}
      {!kept && " — broken"}
    </p>
  );
}

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
  verbs,
  encounter,
  onWalk,
  onSeal,
  onFall,
  onTurn,
  onBack,
  onInscribe,
  onAccept,
  onTakeVessel,
  onClose,
}: {
  plate: Plate;
  ascent: AscentRecord | null;
  world: World | null;
  /** What this body can do — the House plate says when a boon would sleep. */
  verbs: readonly Verb[];
  encounter: ReturnType<typeof encounterFor>;
  /** Step onto the path the Abyss plate is standing at the near edge of. */
  onWalk: (path: TreePath) => void;
  onSeal: () => void;
  /** The last lamp is out: wake, and go on climbing. Never the same as `onSeal`. */
  onFall: () => void;
  /** The prologue's next page, or — given `true` — the rest of it put down. */
  onTurn: (skip?: boolean) => void;
  /** Back to the overworld, at the end of a path. */
  onBack: () => void;
  onInscribe: (letterIds: [string, string, string], hintsTaken: number) => void;
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
        {plate.kind === "prologue" && <ProloguePlate page={plate.page} onTurn={onTurn} />}
        {plate.kind === "path-done" && ascent && (
          <PathDonePlate ascent={ascent} path={plate.path} vow={plate.vow} onBack={onBack} />
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
            or={world.or}
            verbs={verbs}
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
        {plate.kind === "abyss" && (
          <AbyssPlate path={plate.path} onCross={() => onWalk(plate.path)} onBack={onClose} />
        )}
        {plate.kind === "out" && ascent && (
          <OutPlate ascent={ascent} gathered={world?.or ?? 0} onWake={onFall} />
        )}
        {plate.kind === "sealed" && ascent && (
          <SealedPlate ascent={ascent} encounter={encounter} onSeal={onSeal} />
        )}
      </div>
    </div>
  );
}

/**
 * **The prologue, played.**
 *
 * One page at a time, the charge last, and the button says which it is — a
 * stranger who has just pressed Begin should be able to tell at a glance
 * whether they are three paragraphs from the game or one. The pages are dots
 * rather than "4 of 6" because this is a telling, not a form.
 *
 * Skipping is offered on every page and is honoured permanently. It is the
 * only honest way to put a story in front of a person who did not ask for one:
 * the whole of it stays behind Esc for as long as the game exists.
 */
function ProloguePlate({ page, onTurn }: { page: number; onTurn: (skip?: boolean) => void }) {
  const last = page >= PROLOGUE_PAGES.length - 1;
  return (
    <>
      <p className={styles.plateKicker}>{PROLOGUE.kicker}</p>
      <p className={styles.prologuePage}>{PROLOGUE_PAGES[page]}</p>
      <ul className={styles.prologueDots} aria-label={`Page ${page + 1} of ${PROLOGUE_PAGES.length}`}>
        {PROLOGUE_PAGES.map((text, i) => (
          <li
            key={text.slice(0, 16)}
            aria-hidden="true"
            className={i <= page ? styles.prologueDotOn : styles.prologueDot}
          />
        ))}
      </ul>
      <div className={styles.plateActions}>
        <Button variant="primary" onClick={() => onTurn()} autoFocus>
          {last ? "Begin the ascent" : "Go on"}
        </Button>
      </div>
      {!last && (
        <p className={styles.prologueSkip}>
          <button type="button" className={styles.linkButton} onClick={() => onTurn(true)}>
            Skip — I know why I am here
          </button>
          {" · it is kept under "}
          <kbd>Esc</kbd>
        </p>
      )}
    </>
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
  // **A plate that cannot describe itself still has to close.** This returned
  // `null` — which does not cancel the plate, it empties it: the frame renders
  // with no text and no button while `paused={plate !== null}` has stopped the
  // simulation behind it. Escape and Enter still cleared it, so it was a dead
  // screen rather than a lock, which is worse in the way that matters: nothing
  // told the Scribe what had happened.
  //
  // Unreachable now — `onFragment` refuses an index that names no piece of the
  // verse, and `regions.fragmentsFrom` stops one being dealt. Kept because the
  // cost is four lines and the failure was invisible.
  if (!fragment) {
    return (
      <>
        <p className={styles.plateKicker}>A fragment of the scroll</p>
        <p className={styles.plateDerivation}>
          A scrap too worn to read. It is set aside with the rest.
        </p>
        <Button variant="primary" onClick={onClose} autoFocus>
          Fold it away
        </Button>
      </>
    );
  }
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
  onInscribe: (letterIds: [string, string, string], hintsTaken: number) => void;
  onClose: () => void;
}) {
  const [sockets, setSockets] = useState<(string | null)[]>([null, null, null]);
  /** How many rungs of the ladder have been asked for. */
  const [asked, setAsked] = useState(0);
  const ladder = useMemo(
    () => hintsFor(target, (id) => lettersById[id]?.name ?? id),
    [target],
  );
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
  const next = ladder[asked];

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
            className={letterId ? styles.socket : `${styles.socket} ${styles.socketEmpty}`}
            aria-label={letterId ? `Socket ${i + 1}: ${lettersById[letterId]?.name}` : `Socket ${i + 1}, empty`}
            onClick={() => setSockets((prev) => prev.map((v, j) => (j === i ? null : v)))}
          >
            <span className="hebrew" lang="he">
              {letterId ? lettersById[letterId]?.glyph : ""}
            </span>
            {/* **The sound, under the shape.** Without it the sockets read back
                as three drawings, and a person who does not read Hebrew cannot
                even check their own work — they placed a shape, and the plate
                shows them the shape again. */}
            <span className={styles.socketSound}>
              {letterId ? lettersById[letterId]?.transliteration : ""}
            </span>
          </button>
        ))}
      </div>

      <ul className={styles.palette} aria-label="Letters you carry">
        {held.map((id) => (
          <li key={id}>
            <button
              type="button"
              className={styles.paletteLetter}
              title={lettersById[id]?.name}
              // Named as well as drawn. A glyph is the whole label otherwise,
              // which leaves a screen reader saying "פ" and the harness with
              // nothing to click by — and the gate is the one screen the game
              // asks a Scribe to *know* something on.
              aria-label={lettersById[id]?.name}
              data-letter={id}
              onClick={() => place(id)}
            >
              <span className="hebrew" lang="he">
                {lettersById[id]?.glyph}
              </span>
              <span className={styles.paletteSound}>{lettersById[id]?.transliteration}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* **The ladder.** Everything already asked for stays on the plate — a
          hint that scrolls away has to be remembered, and remembering is the
          thing this is for. */}
      {asked > 0 && (
        <ul className={styles.hints}>
          {ladder.slice(0, asked).map((hint) => (
            <li key={hint.rung}>
              <span className={styles.hintKicker}>{hint.kicker}</span> {hint.text}
            </li>
          ))}
        </ul>
      )}

      <div className={styles.plateActions}>
        <Button
          variant="primary"
          disabled={!filled}
          onClick={() => filled && onInscribe(sockets as [string, string, string], asked)}
        >
          Inscribe
        </Button>
        <Button onClick={onClose}>Step back</Button>
      </div>

      {next && (
        <p className={styles.hintAsk}>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => {
              setAsked((n) => n + 1);
              // The last rung is the answer, so it sets the sockets rather than
              // asking a person to copy three shapes by eye — which is the same
              // wall one rung further down.
              if (next.answer) setSockets([...next.answer]);
            }}
          >
            {next.answer ? "Tell me the word" : "Ask for a hint"}
          </button>{" "}
          · costs {HINT_COST} of the light this root pays, and nothing else
        </p>
      )}
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
  or,
  verbs,
  onAccept,
  onClose,
}: {
  cardId: string;
  or: number;
  /** What this body can do — so a boon it could not use yet says so. */
  verbs: readonly Verb[];
  onAccept: (offer: UshpizinOffer) => void;
  onClose: () => void;
}) {
  const card = dorotCardsById[cardId];
  const house = card ? dorotHousesById[card.houseId] : undefined;
  // **The card says which rung this is**, and it is the only thing here that
  // can. The figure was placed from the path's lower end; `world.regionIndex`
  // is the upper end capped by the Scribe's letters, and this used to be
  // passed that — so the face, the accusation and the bargain could come from
  // three different Sefirot. See `sefirahOfCard`.
  const sefirah = sefirahOfCard(cardId);
  const offer = sefirah ? offerFor(sefirah) : undefined;
  // The piece of the charge this rung holds. Keyed by Sefirah rather than by
  // figure, because either House may stand here and both of them did the same
  // thing at this rung — see `story.ts`.
  const testimony = sefirah ? TESTIMONY[sefirah] : undefined;
  const dormant = offer ? dormantFor(offer, verbs) : undefined;
  const dormantLetter = dormant
    ? lettersById[abilityForVerb(dormant)?.letterId ?? ""]?.transliteration
    : undefined;
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
          {/* **What a vow is**, said where it is taken. The three vow guests
              ask for something that will not be judged for another whole rung,
              and until now nothing told the Scribe that — not when it is
              settled, not that the game will keep the account for them, and
              not that breaking it costs nothing but the boon. A person who
              does not know the last of those reads "vow" as a trap and
              declines, which is the opposite of the choice this is meant to
              be. */}
          {offer.vow && (
            <p className={styles.offerVow}>
              A vow is judged at the way out of this rung, and you will see it standing in the
              corner until then. Keep it and the grace is given there. Break it and you simply do
              not get it — nothing is taken from you for having tried.
            </p>
          )}
          {/* **A bargain for a body that cannot yet use it.** `GRACE_NEEDS`
              wrote this dependency down and `exposure.test.ts` enforces it
              against the *linear* letter order — which was the whole truth
              until the Tree let a route decide the alphabet. Said rather than
              hidden: the offer is still theirs to take, and whether to take it
              now or come back holding the letter is the Scribe's call. */}
          {dormant && (
            <p className={styles.offerShort}>
              {dormantLetter
                ? `This needs ${dormantLetter}, which you do not carry — take it now and it sleeps until you do.`
                : "You cannot use this yet — take it now and it sleeps until you can."}
            </p>
          )}
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
  vow,
  onBack,
}: {
  ascent: AscentRecord;
  path: TreePath;
  /** How a vow taken at this rung's House was judged, if one was taken. */
  vow?: { kept: boolean; figure: string; grantsLabel: string; terms: string };
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
      {/* **The vow, judged.** The only bargain in this game whose outcome comes
          later than its acceptance, and until now the only one that reported
          nothing at all — not when taken, not when kept, not when broken. */}
      {vow && (
        <p className={styles.plateQuestion}>
          {vow.kept
            ? `You said you would ${vow.terms.toLowerCase()}, and you did. ${vow.figure} keeps the bargain: ${vow.grantsLabel.toLowerCase()}.`
            : `You said you would ${vow.terms.toLowerCase()}, and you did not. ${vow.figure} says nothing about it, and the blessing stays where it was.`}
        </p>
      )}
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

/**
 * The light goes out, and the Scribe wakes.
 *
 * Not a death screen, and — since `fall.ts` — no longer a delete button wearing
 * one's clothes. An angel made of light whose light goes out is cast back down,
 * which is exactly what happened to him once already, before the first rung. So
 * the fall is the failure state and it is also the premise, and the only thing
 * it takes is the light he was carrying.
 *
 * The plate says what it took and where he is, in that order, because those are
 * the two things a Scribe wants to know and the second is the one this plate
 * spent months promising and not delivering.
 */
function OutPlate({
  ascent,
  gathered,
  onWake,
}: {
  ascent: AscentRecord;
  /**
   * What *this rung* had gathered, which is not in the record and never will
   * be: `world.or` is folded into the ascent only by `onNext`, at the exit. The
   * plate has to say it out loud or it would name a smaller loss than the one
   * the Scribe actually just took.
   */
  gathered: number;
  onWake: () => void;
}) {
  const woke = regionOfSefirah(wakeAt(ascent));
  const kindled = woke.sefirah !== "malchut";
  const lost = ascent.or + gathered;
  return (
    <>
      <p className={styles.plateKicker}>The lamps are spent</p>
      <h2 className={styles.plateTitle}>You go out</h2>
      <p className={`${styles.plateHeb} hebrew`} lang="he">
        כִּבָּה
      </p>
      <p className={styles.plateUse}>{GOING_OUT}</p>
      <p className={styles.plateDerivation}>
        It has happened to you once before, and you did not remember that either. The letters are
        still yours — {ascent.lettersHeld.length} of the twenty-two — and so is every Sefirah you
        lit.{" "}
        {lost > 0
          ? `The ${lost} light in your hand is not${
              gathered > 0 && ascent.or > 0
                ? ` — ${ascent.or} carried here and ${gathered} gathered on this rung`
                : ""
            }: you were made of it, and it went out with you.`
          : "You were carrying no light, so the fall took nothing but the ground."}
      </p>
      <p className={styles.plateQuestion}>
        {kindled
          ? `You wake at ${woke.name}, because you paid for it and it is still burning. The way up is where it was.`
          : "You wake in the kingdom, because there is no lamp of yours burning higher up. The way up is where it was."}
      </p>
      <Button variant="primary" onClick={onWake} autoFocus>
        Fall, and wake
      </Button>
    </>
  );
}

function AbyssPlate({
  path,
  onCross,
  onBack,
}: {
  path: TreePath;
  onCross: () => void;
  onBack: () => void;
}) {
  // Which end is which. A crossing is walked in either direction — Keter down
  // to Tiferet is the same gulf as Tiferet up to Keter — so the plate names the
  // near shore and the far one rather than assuming a climb.
  const [low, high] = [...path.ends].sort((a, b) => nodeOf[a].row - nodeOf[b].row);
  return (
    <>
      <p className={styles.plateKicker}>The Abyss</p>
      <h2 className={styles.plateTitle}>Da'at — the crossing</h2>
      <p className={`${styles.plateHeb} hebrew`} lang="he">
        דעת
      </p>
      <p className={styles.plateUse}>
        {regionOfSefirah(low).name} is on this side and {regionOfSefirah(high).name} on the other.
        Da'at is not a Sefirah and there is no station in between — only the gap the lower seven do
        not reach across, which is why this is the one way on the Tree you are told about before you
        take it.
      </p>
      <p className={styles.plateDerivation}>
        No House stands over the gulf and there is no mark to set, so a veiling here costs the whole
        crossing. And the way out is a Word-Gate: you will be asked for a root, and until you write
        one that is true there is no door.
      </p>
      <p className={styles.plateQuestion}>{ABYSS_WORD}</p>
      <Button variant="primary" onClick={onCross} autoFocus>
        Cross
      </Button>
      <Button onClick={onBack}>Not this way</Button>
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
                  {/* `wasTarget` was written on every word and read by nothing,
                      which meant the game never once acknowledged the harder
                      thing: a gate asks for a *particular* root, any true root
                      opens it, and only this mark says you found the one it
                      named. It is the whole difference between answering and
                      answering the question. */}
                  {word.wasTarget && " · the root the gate named"}
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

      {/* **The falls, named.** A climb that went out four times and lit the Tree
          anyway is a different climb from one that never went out, and until the
          fall stopped ending a climb there was no such thing as the first kind.
          Counted rather than dwelt on: one line, and no scolding. */}
      {(ascent.falls ?? 0) > 0 && (
        <p className={styles.plateDerivation}>
          {ascent.falls === 1
            ? "Your light went out once on the way, and you got up."
            : `Your light went out ${ascent.falls} times on the way, and you got up every time.`}
        </p>
      )}

      {encounter && (
        <>
          <DecoratedRule />
          <p className={styles.plateKicker}>{encounterTitle(encounter)}</p>
          {/* What it did to the climb that just ended, beside what it asks. */}
          <TheRule encounter={encounter} className={styles.plateDerivation} />
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

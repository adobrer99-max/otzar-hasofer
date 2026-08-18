import { useMemo } from "react";
import { dorotCardsById } from "../data/dorot";
import { timesFreed, type AscentRecord } from "../storage/ascentRepo";
import { DecoratedRule } from "../components/ui";
import { encounterTitle } from "./encounter";
import { getEncounterForReadingIndex } from "../data/encounters";
import { regionOfSefirah, regions } from "./regions";
import { guardianOf, TIERS, tierOf } from "./guardians";
import { HUSKS } from "./combat";
import { PLEA_NAMED } from "./story";
import { pathById, pointOf, TREE_LINES, TREE_VIEW } from "./tree";
import { CARDS_IN_ALL, housesMet, lexicon, marks, pagesOf, relicsKept, tally, versedIn, type BookPage } from "./book";
import { LETTER_ECHOES, MASTERY_AT } from "./tutorial";
import { guestsRemembered } from "./story";
import { abilityForVerb, type Verb } from "./abilities";
import { lettersById } from "../data/letters";
import { RELICS } from "./relics";
import styles from "./Book.module.css";

/** "1 path", not "1 paths" — a record of a life should read like prose. */
const many = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;


/**
 * **The Book of Ascents.**
 *
 * Every climb this game has ever saved has gone into IndexedDB and been read
 * back by nothing. The plea was computed on the crown plate and thrown away;
 * the roots formed at the gates were listed once, at the moment of sealing,
 * and never again; a climb meets about four per cent of the hundred and sixty
 * eight Dorot cards and there was no way to know which four, or that there
 * were others. A game whose whole subject is a record kept no record.
 *
 * Three things, and all of them are folds over `listAscents()` — see
 * `book.ts`. Nothing here is stored, so nothing here can drift from what it
 * describes, and every climb sealed before any of this existed still has a
 * page: `pagesOf` derives an old record's ending from the same function
 * `sealAscent` freezes from.
 */
export function Book({ ascents, onClose }: { ascents: readonly AscentRecord[]; onClose: () => void }) {
  const pages = useMemo(() => pagesOf(ascents), [ascents]);
  const houses = useMemo(() => housesMet(ascents), [ascents]);
  const roots = useMemo(() => lexicon(ascents), [ascents]);
  const relics = useMemo(() => relicsKept(ascents), [ascents]);
  const totals = useMemo(() => tally(ascents), [ascents]);
  const freed = useMemo(() => timesFreed(ascents), [ascents]);
  const versed = useMemo(() => versedIn(ascents), [ascents]);
  const allMarks = useMemo(() => marks(ascents), [ascents]);
  const won = allMarks.filter((m) => m.earned);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="The Book of Ascents">
      <div className={styles.body}>
        <div className={styles.head}>
          <h2 className={styles.title}>The Book of Ascents</h2>
          <button type="button" className={styles.close} onClick={onClose} autoFocus>
            Close
          </button>
        </div>

        {pages.length === 0 && totals.abandoned === 0 ? (
          <p className={styles.empty}>
            Nothing is written here yet. Carry a climb to its ending — the crown, or all ten
            kindled — and it will be.
          </p>
        ) : (
          <p className={styles.tally}>
            {totals.sealed === 1 ? "One ascent sealed" : `${totals.sealed} ascents sealed`}
            {totals.kindled > 0 && `, ${totals.kindled} with the whole Tree lit`} ·{" "}
            {many(totals.pathsWalked, "path")} walked · {totals.lettersEver} of 22 letters ever
            held · {totals.cardsEver} of {CARDS_IN_ALL} cards met ·{" "}
            {many(totals.rootsEver, "root")} formed
            {totals.falls > 0 &&
              ` · your light went out ${totals.falls === 1 ? "once" : `${totals.falls} times`}`}
            {totals.abandoned > 0 &&
              ` · ${totals.abandoned === 1 ? "one climb was" : `${totals.abandoned} climbs were`} put down`}
          </p>
        )}

        {pages.length > 0 && (
          <section>
            <DecoratedRule />
            <h3 className={styles.section}>The ascents</h3>
            <ol className={styles.pages}>
              {pages.map((page) => (
                <Page key={page.id} page={page} />
              ))}
            </ol>
          </section>
        )}

        {houses.length > 0 && (
          <section>
            <DecoratedRule />
            <h3 className={styles.section}>
              The figures you have spoken with — {totals.cardsEver} of {CARDS_IN_ALL}
            </h3>
            <ul className={styles.houses}>
              {houses.map((house) => (
                <li key={house.houseId} className={styles.house}>
                  <span className={styles.houseFigure}>{house.figure}</span>
                  <span className={styles.houseWhere}>{regionOfSefirah(house.sefirah).name}</span>
                  <span className={styles.houseCount}>
                    {house.cardIds.length} of {house.total}
                  </span>
                  <ul className={styles.cards}>
                    {house.cardIds.map((id) => (
                      <li key={id}>{dorotCardsById[id]?.title ?? id}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <DecoratedRule />
          {/* Few on purpose, and not a checklist: the arc past the seven is the
              rules and the tiers, and these are the marks along it. Every one
              is a fold over records that already exist, so a Scribe who did the
              thing years ago has the mark the moment it ships. */}
          <h3 className={styles.section}>
            What you have proved — {won.length} of {allMarks.length}
          </h3>
          <ul className={styles.houses}>
            {allMarks.map((mark) => (
              <li key={mark.id} className={styles.house}>
                <span className={mark.earned ? styles.houseFigure : styles.houseWhere}>
                  {mark.title}
                </span>
                <span />
                <span className={styles.houseCount}>{mark.earned ? "won" : "not yet"}</span>
                <ul className={styles.cards}>
                  <li>{mark.earned ? mark.won : mark.how}</li>
                </ul>
              </li>
            ))}
          </ul>
        </section>

        {Object.keys(freed).length > 0 && (
          <section>
            <DecoratedRule />
            {/* **What a Scribe has become**, as against what any one climb did.
                The tiers are the only thing in this game that grows across
                climbs and can still be added to, so the Book is where a person
                looks to find out which way is worth walking again. */}
            <h3 className={styles.section}>What you have broken</h3>
            <ul className={styles.houses}>
              {regions
                .filter((r) => freed[r.sefirah])
                .sort((a, b) => (freed[b.sefirah] ?? 0) - (freed[a.sefirah] ?? 0))
                .map((region) => {
                  const times = freed[region.sefirah] ?? 0;
                  const tier = tierOf(times);
                  const guardian = guardianOf(region.sefirah);
                  return (
                    <li key={region.sefirah} className={styles.house}>
                      <span className={styles.houseFigure}>{HUSKS[guardian.kind].name}</span>
                      <span className={styles.houseWhere}>{region.name}</span>
                      <span className={styles.houseCount}>
                        {tier >= TIERS ? "whole" : `tier ${tier} of ${TIERS}`}
                      </span>
                      <ul className={styles.cards}>
                        <li>
                          {tier >= TIERS
                            ? "It has nothing left to give."
                            : `Broken in ${many(times, "climb")} — walk that way again and it deepens.`}
                        </li>
                      </ul>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}

        {Object.entries(versed).some(([, n]) => (n ?? 0) >= MASTERY_AT) && (
          <section>
            <DecoratedRule />
            {/* **Beat three: mastery.** LETTER_ECHOES' mastered line unlocks
                here at MASTERY_AT uses across sealed climbs — the Book is
                where a scribe's learning is kept, and the fold (`versedIn`)
                is the Book's own idiom. The sparse verbs ripen over several
                climbs and the body verbs in one, which is practice's natural
                shape and needs no per-verb threshold to fake it. */}
            <h3 className={styles.section}>The letters practiced</h3>
            <ul className={styles.houses}>
              {(Object.entries(versed) as [Verb, number][])
                .filter(([, n]) => n >= MASTERY_AT)
                .sort((a, b) => b[1] - a[1])
                .map(([verb, n]) => {
                  const ability = abilityForVerb(verb);
                  const letter = ability ? lettersById[ability.letterId] : undefined;
                  return (
                    <li key={verb} className={styles.house}>
                      <span className={styles.houseFigure}>
                        {letter ? `${letter.name} — ${ability?.name}` : verb}
                      </span>
                      <span className={styles.houseCount}>{many(n, "use")}</span>
                      <ul className={styles.cards}>
                        <li>{LETTER_ECHOES[verb].mastered}</li>
                      </ul>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}

        {relics.length > 0 && (
          <section>
            <DecoratedRule />
            {/* **The only things in this game that survive a seal.** Everything
                else on this page is a record of what was done; this is a shelf
                of what is still held. Both halves of every bargain are shown,
                because a relic is chosen at the threshold and a price found out
                afterwards is a trap rather than a choice. */}
            <h3 className={styles.section}>
              The Reliquary — {relics.length} of {RELICS.length} found
            </h3>
            <ul className={styles.houses}>
              {relics.map((relic) => (
                <li key={relic.id} className={styles.house}>
                  <span className={styles.houseName}>
                    {relic.name}{" "}
                    <span className="hebrew" lang="he" aria-hidden="true">
                      {relic.hebrew}
                    </span>
                  </span>
                  <span className={styles.houseCount}>{relic.source}</span>
                  <ul className={styles.cards}>
                    <li>{relic.hidden}</li>
                    <li>
                      {relic.gives} {relic.takes}
                    </li>
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        )}

        {roots.length > 0 && (
          <section>
            <DecoratedRule />
            {/* The deepest axis in the game and its longest collection, at no
                authoring cost: three thousand roots ship already, and a climb
                forms a handful. */}
            <h3 className={styles.section}>The Lexicon — {many(roots.length, "root")}</h3>
            <ul className={styles.roots}>
              {roots.map((root) => (
                <li key={root.hebrew} className={styles.root}>
                  <span className="hebrew" lang="he" aria-hidden="true">
                    {root.hebrew}
                  </span>
                  <span className={styles.rootGloss}>
                    {root.transliteration} — {root.gloss}
                    {root.wasTarget && <span className={styles.rootNamed}> · named by a gate</span>}
                    {root.times > 1 && <span className={styles.rootTimes}> · {root.times}×</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

/** One sealed climb: how it ended, what it was carrying, and the way it went. */
function Page({ page }: { page: BookPage }) {
  const plea = PLEA_NAMED[page.plea];
  const encounter = page.encounterNumber
    ? getEncounterForReadingIndex(page.encounterNumber - 1)
    : undefined;
  return (
    <li className={styles.page}>
      <Route walked={page.route} lit={page.sefirotLit} />
      <div className={styles.pageBody}>
        <p className={styles.pageWhen}>
          {page.seedLabel}
          {/* The day's own name, when it had one — "14 Nisan" already says
              Pesach to a reader who counts, but the Book should not make a
              reader count. */}
          {page.festivals.length > 0 && ` · ${page.festivals.join(" · ")}`}
          {encounter && ` · ${encounterTitle(encounter)}`}
        </p>
        <p className={styles.pageEnding}>
          {page.ending === "kindled" ? "All ten kindled" : "The crown reached"} — {plea.title}
        </p>
        <p className={styles.pageShort}>{plea.short}</p>
        <p className={styles.pageFacts}>
          {page.lettersHeld.length} of 22 letters · {many(page.route.length, "path")} ·{" "}
          {page.sefirotLit.length} kindled · {many(page.guardiansBroken.length, "guardian")} broken
          {page.words.length > 0 && ` · ${many(page.words.length, "root")}`}
          {page.falls > 0 && ` · went out ${page.falls === 1 ? "once" : `${page.falls} times`}`}
        </p>
        {page.witnesses.length > 0 && (
          <p className={styles.pageWitnesses}>
            Stood for you: {page.witnesses.map((s) => regionOfSefirah(s).name).join(" · ")}
          </p>
        )}
        {/* **The Leaf's rules, on the page** — the same facts the seal plate
            gathers, in the same voice: the bargains through guestsRemembered
            (one function, two surfaces, no drift), the hidden things by
            name, the chosen rule when one was chosen, the lamps of the last
            rung. Every line degrades by absence — a page from before a field
            existed simply says less. */}
        {page.bargains.length > 0 && (
          <p className={styles.pageWitnesses}>{guestsRemembered(page.bargains).join(" ")}</p>
        )}
        {page.relicsFound.length > 0 && (
          <p className={styles.pageWitnesses}>
            Brought out of hiding: {page.relicsFound.join(" · ")}
          </p>
        )}
        {(page.ruleNumber !== undefined || page.lampsAtSeal !== undefined) && (
          <p className={styles.pageWitnesses}>
            {page.ruleNumber !== undefined && `Climbed under the ${nth(page.ruleNumber)} rule. `}
            {page.lampsAtSeal !== undefined &&
              (page.lampsAtSeal === 0
                ? "Out of the last rung with no lamp still burning."
                : `Out of the last rung with ${many(page.lampsAtSeal, "lamp")} still burning.`)}
          </p>
        )}
      </div>
    </li>
  );
}

/** "1st" through "7th", for the chosen rule past the seven. */
function nth(n: number): string {
  const names = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh"];
  return names[n] ?? `${n}th`;
}

/**
 * The route, drawn.
 *
 * `pathsWalked` has always been stored and has never been shown as anything
 * but a count — and it is the shape of the climb: which way out of the kingdom,
 * whether the Abyss was crossed on the mercy side or the severity side,
 * whether the Scribe doubled back. The geometry is `tree.ts`'s own, the same
 * data `TreeMap` draws from, so this cannot disagree with the map.
 */
function Route({ walked, lit }: { walked: readonly string[]; lit: readonly string[] }) {
  const took = new Set(walked);
  const stood = new Set(walked.flatMap((id) => pathById[id]?.ends ?? []));
  const S = 20;
  return (
    <svg
      className={styles.route}
      viewBox={`-${S} -${S} ${(TREE_VIEW.width + 1) * S} ${(TREE_VIEW.height + 1) * S}`}
      role="img"
      aria-label={`A route of ${walked.length} paths`}
    >
      {TREE_LINES.map((line) => (
        <line
          key={line.path.id}
          x1={line.from.x * S}
          y1={line.from.y * S}
          x2={line.to.x * S}
          y2={line.to.y * S}
          className={took.has(line.path.id) ? styles.routeWalked : styles.routeUnwalked}
        />
      ))}
      {Object.values(pointOf).map((point) => (
        <circle
          key={point.sefirah}
          cx={point.x * S}
          cy={point.y * S}
          r={lit.includes(point.sefirah) ? 5 : 3.5}
          className={
            lit.includes(point.sefirah)
              ? styles.routeLit
              : stood.has(point.sefirah)
                ? styles.routeStood
                : styles.routeDark
          }
        />
      ))}
    </svg>
  );
}

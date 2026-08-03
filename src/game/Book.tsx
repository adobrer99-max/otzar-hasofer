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
import { CARDS_IN_ALL, housesMet, lexicon, pagesOf, tally, type BookPage } from "./book";
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
  const totals = useMemo(() => tally(ascents), [ascents]);
  const freed = useMemo(() => timesFreed(ascents), [ascents]);

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
      </div>
    </li>
  );
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

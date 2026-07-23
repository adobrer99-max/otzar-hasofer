import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { GeographyMode } from "../../types/herald";
import type { LunarPhase } from "../../types/sacredTime";
import { computeSacredTime } from "../../data/sacredTime";
import { formatHebrewDateHebrew, formatHebrewDateEnglish } from "../../data/hebrewCalendar";
import { festivalsById } from "../../data/festivals";
import { Card, Callout, SegmentedControl, RichText } from "../../components/ui";
import { listParticipants } from "../../storage/participantsRepo";
import { listLifeCycleEvents } from "../../storage/lifeCycleRepo";
import { todaysObservances } from "../../herald/lifeCycle/observances";
import styles from "./today.module.css";

/** Thematic 8-phase moon glyphs — a tiny local map so Home never pulls in the
 *  Mizbe'ach mandala chunk just to show the phase. */
const MOON: Record<LunarPhase, { glyph: string; label: string }> = {
  new: { glyph: "🌑", label: "New Moon" },
  waxingCrescent: { glyph: "🌒", label: "Waxing Crescent" },
  firstQuarter: { glyph: "🌓", label: "First Quarter" },
  waxingGibbous: { glyph: "🌔", label: "Waxing Gibbous" },
  full: { glyph: "🌕", label: "Full Moon" },
  waningGibbous: { glyph: "🌖", label: "Waning Gibbous" },
  lastQuarter: { glyph: "🌗", label: "Last Quarter" },
  waningCrescent: { glyph: "🌘", label: "Waning Crescent" },
};

/**
 * The live "Today" panel at the head of Home. Sacred Time (date, moon, Omer,
 * festival, parsha) renders synchronously from the pure `computeSacredTime`
 * engine — no IndexedDB, no lexicon — so Home's first paint stays instant and
 * offline-capable. Today's personal observances (birthdays, Yahrzeits) load
 * asynchronously and only appear when the Scribe has a match.
 */
export function TodayPanel() {
  const [geo, setGeo] = useState<GeographyMode>("land");
  const todayKey = new Date().toDateString();
  const snapshot = useMemo(() => computeSacredTime(new Date(), geo), [geo, todayKey]);

  const [observances, setObservances] = useState<
    { key: string; title: string; participantId: string }[]
  >([]);
  const { year, month, day } = snapshot.hebrewDate;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const participants = await listParticipants();
      const matches: { key: string; title: string; participantId: string }[] = [];
      for (const p of participants) {
        const events = await listLifeCycleEvents(p.id);
        for (const o of todaysObservances(snapshot.hebrewDate, p, events)) {
          matches.push({ key: `${p.id}:${o.key}`, title: o.title, participantId: p.id });
        }
      }
      if (!cancelled) setObservances(matches);
    })().catch(() => {
      /* offline or no store — Sacred Time still renders */
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, day]);

  const moon = MOON[snapshot.lunarPhase];
  const festivalId = snapshot.activeFestivalIds[0];
  const festival = festivalId && festivalId !== "ordinary" ? festivalsById[festivalId] : undefined;
  const weekday = snapshot.dayOfWeek.charAt(0).toUpperCase() + snapshot.dayOfWeek.slice(1);

  return (
    <section className={styles.today} aria-label="Today in sacred time">
      <div className={styles.head}>
        <div className={styles.kicker}>Today in Sacred Time</div>
        <SegmentedControl
          value={geo}
          onChange={setGeo}
          ariaLabel="Land or diaspora"
          options={[
            { value: "land", label: "The Land" },
            { value: "galut", label: "Galut" },
          ]}
        />
      </div>

      <h2 className={styles.date}>
        <span className="hebrew" dir="rtl" lang="he">
          {formatHebrewDateHebrew(snapshot.hebrewDate)}
        </span>
        <span className={styles.dateEnglish}>
          {formatHebrewDateEnglish(snapshot.hebrewDate)} · {weekday}
        </span>
      </h2>

      <ul className={styles.facets}>
        <li>
          <span className={styles.facetGlyph} aria-hidden="true">
            {moon.glyph}
          </span>{" "}
          {moon.label}
        </li>
        {snapshot.omer && <li>Omer · day {snapshot.omer.day}</li>}
        {snapshot.roshChodesh && <li>Rosh Chodesh</li>}
        {snapshot.parsha && (
          <li>
            <Link to="/guide/sacred-time">
              {snapshot.parsha.festival ? snapshot.parsha.label : `Parashat ${snapshot.parsha.label}`}
            </Link>
          </li>
        )}
        {festival && <li className={styles.facetFestival}>{festival.name}</li>}
      </ul>

      {festival && (festival.gesture || festival.contemplativeQuestion) && (
        <Callout>
          {festival.gesture && <p className={styles.gesture}>{festival.gesture}</p>}
          {festival.contemplativeQuestion && (
            <RichText className={styles.question} html={festival.contemplativeQuestion} />
          )}
        </Callout>
      )}

      {observances.length > 0 && (
        <div className={styles.observances}>
          {observances.map((o) => (
            <Card key={o.key}>
              <p className={styles.observanceTitle}>{o.title}</p>
              <Link to={`/herald?participant=${o.participantId}`} className={styles.observanceLink}>
                Open their Herald →
              </Link>
            </Card>
          ))}
        </div>
      )}

      <div className={styles.links}>
        <Link to="/guide/sacred-time">Today's Sacred Time in full →</Link>
        <Link to="/guide/mizbeach">See the folio →</Link>
      </div>
    </section>
  );
}

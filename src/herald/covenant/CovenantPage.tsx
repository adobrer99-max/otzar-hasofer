import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui";
import type { ParticipantRecord, HeraldLayer, Orientation } from "../../types/herald";
import type { UnionRecord } from "../../types/union";
import { listParticipants, getLayers } from "../../storage/participantsRepo";
import {
  listUnions,
  createUnion,
  recordShevaBrachotDay,
  deleteUnion,
  SHEVA_BRACHOT_SEFIROT,
} from "../../storage/unionsRepo";
import { letters } from "../../data/letters";
import { middot } from "../../data/middot";
import { formatHebrewDateEnglish } from "../../data/hebrewCalendar";
import { deriveCovenantalForm } from "./deriveCovenantalForm";
import { VIEWBOX_WIDTH, VIEWBOX_HEIGHT, FIGURE_OFFSET } from "../render/heraldGeometry";
import { HeraldCovenantContent, HeraldSvgDefs } from "../render/buildHeraldSvg";
import { exportHeraldSvg } from "../export/exportSvg";
import { exportHeraldPng } from "../export/exportPng";
import styles from "./covenant.module.css";

function middahLabel(sefirah: string): string {
  return middot.find((m) => m.id === sefirah)?.label ?? sefirah;
}

export function CovenantPage() {
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [unions, setUnions] = useState<UnionRecord[]>([]);
  const [selectedUnionId, setSelectedUnionId] = useState<string>();
  const [partnerAId, setPartnerAId] = useState("");
  const [partnerBId, setPartnerBId] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [layersA, setLayersA] = useState<HeraldLayer[]>([]);
  const [layersB, setLayersB] = useState<HeraldLayer[]>([]);
  const [dayLetter, setDayLetter] = useState("");
  const [dayOrientation, setDayOrientation] = useState<Orientation>("upright");
  const [dayReflection, setDayReflection] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    listParticipants().then(setParticipants);
    listUnions().then((us) => {
      setUnions(us);
      setSelectedUnionId((current) => current ?? us[0]?.id);
    });
  }, []);

  const union = unions.find((u) => u.id === selectedUnionId);
  const partnerA = participants.find((p) => p.id === union?.partnerAId);
  const partnerB = participants.find((p) => p.id === union?.partnerBId);

  useEffect(() => {
    if (!union) {
      setLayersA([]);
      setLayersB([]);
      return;
    }
    getLayers(union.partnerAId).then(setLayersA);
    getLayers(union.partnerBId).then(setLayersB);
  }, [union?.id, union?.partnerAId, union?.partnerBId]);

  async function handleCreateUnion() {
    if (!partnerAId || !partnerBId || partnerAId === partnerBId || !weddingDate) return;
    const record = await createUnion(partnerAId, partnerBId, weddingDate);
    const refreshed = await listUnions();
    setUnions(refreshed);
    setSelectedUnionId(record.id);
    setPartnerAId("");
    setPartnerBId("");
    setWeddingDate("");
  }

  async function handleRecordDay(day: number) {
    if (!union) return;
    const updated = await recordShevaBrachotDay(union.id, day, {
      letter: dayLetter ? { letterId: dayLetter, orientation: dayOrientation } : undefined,
      reflection: dayReflection || undefined,
    });
    setUnions((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setDayLetter("");
    setDayOrientation("upright");
    setDayReflection("");
  }

  async function handleDeleteUnion(id: string) {
    await deleteUnion(id);
    const refreshed = await listUnions();
    setUnions(refreshed);
    setSelectedUnionId(refreshed[0]?.id);
  }

  const bothHaveReadings = layersA.length > 0 && layersB.length > 0;
  const form = union && bothHaveReadings ? deriveCovenantalForm(layersA, layersB, union) : undefined;
  const nextDay = union ? (union.shevaBrachot.map((d) => d.day).reduce((a, b) => Math.max(a, b), 0) + 1) : 1;
  const captionNames = partnerA && partnerB ? `${partnerA.displayName} · ${partnerB.displayName}` : "";

  return (
    <div className="page page--wide">
      <PageHeader kicker="Covenantal Time" title="The Covenantal Herald" />
      <p>
        At marriage, a shared Herald is created. Each partner keeps their own{" "}
        <Link to="/herald">Herald</Link> and history; the Covenantal Herald is derived from
        both — impaled in the old heraldic manner, one dominant letter to each side — and it
        grows through the seven blessings of the Sheva Brachot, one Sefirah per day, Chesed
        through Malchut.
      </p>

      <div className={styles.panel}>
        <h3>Record a Union</h3>
        <div className={styles.row}>
          <select value={partnerAId} onChange={(e) => setPartnerAId(e.target.value)} aria-label="First partner">
            <option value="">First partner…</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
          <select value={partnerBId} onChange={(e) => setPartnerBId(e.target.value)} aria-label="Second partner">
            <option value="">Second partner…</option>
            {participants
              .filter((p) => p.id !== partnerAId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
          </select>
          <input
            type="date"
            value={weddingDate}
            onChange={(e) => setWeddingDate(e.target.value)}
            aria-label="Wedding date"
          />
          <button type="button" onClick={handleCreateUnion} disabled={!partnerAId || !partnerBId || !weddingDate}>
            Create the Covenant
          </button>
        </div>
        {unions.length > 0 && (
          <ul className={styles.unionList}>
            {unions.map((u) => {
              const a = participants.find((p) => p.id === u.partnerAId);
              const b = participants.find((p) => p.id === u.partnerBId);
              return (
                <li key={u.id}>
                  <button type="button" onClick={() => setSelectedUnionId(u.id)}>
                    {u.id === selectedUnionId ? "◆ " : ""}
                    {a?.displayName ?? "?"} · {b?.displayName ?? "?"} —{" "}
                    {formatHebrewDateEnglish(u.weddingHebrewDate)}
                  </button>
                  <button type="button" onClick={() => handleDeleteUnion(u.id)}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {union && (
        <div className={styles.layout}>
          <div>
            <h3>The Sheva Brachot</h3>
            <p className={styles.note}>
              Seven days; one unfolding reading. Each day illuminates another Sefirah, and each
              recorded day adds a mark to the Covenantal Herald's base.
            </p>
            <ul className={styles.dayList}>
              {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => {
                const recorded = union.shevaBrachot.find((d) => d.day === day);
                const letterName = recorded?.letter
                  ? letters.find((l) => l.id === recorded.letter!.letterId)?.name
                  : undefined;
                return (
                  <li key={day}>
                    <div className={styles.dayTitle}>
                      Day {day} — {middahLabel(SHEVA_BRACHOT_SEFIROT[day - 1])}
                    </div>
                    {recorded ? (
                      <div className={styles.recorded}>
                        Recorded {new Date(recorded.recordedAt).toLocaleDateString()}
                        {letterName && ` · drew ${letterName}${recorded.letter?.orientation === "reversed" ? " (turned inward)" : ""}`}
                        {recorded.reflection && ` — "${recorded.reflection}"`}
                      </div>
                    ) : day === nextDay ? (
                      <>
                        <div className={styles.row}>
                          <select
                            value={dayLetter}
                            onChange={(e) => setDayLetter(e.target.value)}
                            aria-label={`Letter drawn on day ${day}`}
                          >
                            <option value="">No letter drawn</option>
                            {letters.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.glyph} {l.name}
                              </option>
                            ))}
                          </select>
                          {dayLetter && (
                            <select
                              value={dayOrientation}
                              onChange={(e) => setDayOrientation(e.target.value as Orientation)}
                              aria-label="Orientation"
                            >
                              <option value="upright">Upright</option>
                              <option value="reversed">Reversed — turned inward</option>
                            </select>
                          )}
                        </div>
                        <div className={styles.row}>
                          <input
                            type="text"
                            placeholder="Reflection (optional)"
                            value={dayReflection}
                            onChange={(e) => setDayReflection(e.target.value)}
                          />
                          <button type="button" onClick={() => handleRecordDay(day)}>
                            Record Day {day}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className={styles.note}>Awaiting its day.</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            {form ? (
              <>
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                  xmlns="http://www.w3.org/2000/svg"
                  role="img"
                  aria-label={`Covenantal Herald of ${captionNames}`}
                  style={{ width: "100%", height: "auto", background: "var(--color-charcoal)" }}
                >
                  <title>{`Covenantal Herald of ${captionNames}`}</title>
                  <HeraldSvgDefs />
                  <rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="var(--color-charcoal)" />
                  <g transform={`translate(${FIGURE_OFFSET.x}, ${FIGURE_OFFSET.y})`}>
                    <HeraldCovenantContent form={form} />
                  </g>
                  <text
                    x={VIEWBOX_WIDTH / 2}
                    y={VIEWBOX_HEIGHT - 40}
                    textAnchor="middle"
                    fontFamily="var(--font-latin)"
                    fontSize={22}
                    fill="var(--color-silver)"
                  >
                    {captionNames}
                  </text>
                  <text
                    x={VIEWBOX_WIDTH / 2}
                    y={VIEWBOX_HEIGHT - 18}
                    textAnchor="middle"
                    fontFamily="var(--font-latin)"
                    fontSize={12}
                    fill="var(--text-muted)"
                  >
                    {`United ${formatHebrewDateEnglish(union.weddingHebrewDate)} · ${union.shevaBrachot.length} of 7 blessings recorded`}
                  </text>
                </svg>
                <div className={styles.exportRow}>
                  <button
                    type="button"
                    onClick={() => svgRef.current && exportHeraldSvg(svgRef.current, "covenantal-herald.svg")}
                  >
                    Download SVG
                  </button>
                  <button
                    type="button"
                    onClick={() => svgRef.current && exportHeraldPng(svgRef.current, "covenantal-herald.png")}
                  >
                    Download PNG
                  </button>
                </div>
              </>
            ) : (
              <p className={styles.note}>
                The Covenantal Herald forms once each partner has at least one reading of their
                own — it is derived from both Treasuries, never invented.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

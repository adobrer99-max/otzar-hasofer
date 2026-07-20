import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { ParticipantRecord, HeraldLayer, ReadingPath } from "../types/herald";
import { listParticipants, createParticipant, getLayers, addLayer } from "../storage/participantsRepo";
import { ParticipantPicker } from "../herald/history/ParticipantPicker";
import { EncounterPanel } from "../herald/form/EncounterPanel";
import { HeraldCanvas } from "../herald/render/HeraldCanvas";
import { Button, PageHeader, SegmentedControl, Callout, EmptyState } from "../components/ui";
import { InteractiveMizbeach } from "./interactive/InteractiveMizbeach";
import { ReadingStations } from "./interactive/ReadingStations";
import { emptyReadingState, toSnapshot, type MizbeachReadingState } from "./interactive/reading";
import { stepDay, stepMonth } from "./interactive/ringDate";
import { MizrachFinder } from "./MizrachFinder";
import styles from "./MizbeachToolPage.module.css";

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MizbeachToolPage() {
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [layers, setLayers] = useState<HeraldLayer[]>([]);
  const [state, setState] = useState<MizbeachReadingState>(() => emptyReadingState());
  const [sealed, setSealed] = useState<HeraldLayer>();
  const [errors, setErrors] = useState<string[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    listParticipants().then(setParticipants);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setLayers([]);
      return;
    }
    getLayers(selectedId).then(setLayers);
    setSealed(undefined);
    setErrors([]);
    setState(emptyReadingState());
  }, [selectedId]);

  const participant = participants.find((p) => p.id === selectedId);

  function patch(p: Partial<MizbeachReadingState>) {
    setState((s) => ({ ...s, ...p }));
    setErrors([]);
  }

  async function handleCreate(displayName: string, path: ReadingPath) {
    const record = await createParticipant(displayName, path);
    setParticipants((prev) => [...prev, record].sort((a, b) => a.displayName.localeCompare(b.displayName)));
    setSelectedId(record.id);
  }

  async function handleSeal() {
    if (!selectedId) return;
    const result = toSnapshot(state, layers.length);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const layer = await addLayer(selectedId, result.snapshot);
    setLayers(await getLayers(selectedId));
    setSealed(layer);
    setErrors([]);
  }

  return (
    <div className="page page--wide">
      <PageHeader
        kicker="The Living Practice"
        title="The Mizbe'ach"
        lede="Conduct a reading on the folio itself — read the Hand Anchor, draw the letters onto the surface, set the veiled anchor, turn the rings to the sacred time, and seal the reading into the participant's Herald."
      />

      <p className={styles.reference}>
        New here? <Link to="/guide/mizbeach">Learn what each part of the Mizbe'ach means →</Link>
      </p>

      <ParticipantPicker
        participants={participants}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={handleCreate}
      />

      {!selectedId ? (
        <EmptyState
          title="Begin with a participant"
          description="Select or create a participant to conduct a reading on the folio."
        />
      ) : (
        <>
          <EncounterPanel readingIndex={layers.length} />

          <div className={styles.ringControls}>
            <SegmentedControl
              ariaLabel="Geography — Land or Galut"
              value={state.geoMode}
              onChange={(mode) => patch({ geoMode: mode })}
              options={[
                { value: "land", label: "Land" },
                { value: "galut", label: "Galut" },
              ]}
            />
            <div className={styles.stepGroup} role="group" aria-label="Turn the rings">
              <Button variant="subtle" onClick={() => patch({ effectiveDate: stepMonth(state.effectiveDate, -1) })}>
                ‹ Month
              </Button>
              <Button variant="subtle" onClick={() => patch({ effectiveDate: stepMonth(state.effectiveDate, 1) })}>
                Month ›
              </Button>
              <Button variant="subtle" onClick={() => patch({ effectiveDate: stepDay(state.effectiveDate, -1) })}>
                ‹ Day
              </Button>
              <Button variant="subtle" onClick={() => patch({ effectiveDate: stepDay(state.effectiveDate, 1) })}>
                Day ›
              </Button>
              <Button variant="subtle" onClick={() => patch({ effectiveDate: new Date() })}>
                Today
              </Button>
            </div>
            <label className={styles.dateField}>
              Set date
              <input
                type="date"
                value={toDateInput(state.effectiveDate)}
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split("-").map(Number);
                  if (y && m && d) patch({ effectiveDate: new Date(y, m - 1, d) });
                }}
              />
            </label>
            <MizrachFinder />
          </div>

          <ReadingStations state={state} />

          <InteractiveMizbeach state={state} onChange={patch} readingIndex={layers.length} />

          {errors.length > 0 && (
            <Callout className={styles.errors}>
              <strong>Before sealing:</strong>
              <ul>
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </Callout>
          )}

          <div className={styles.sealRow}>
            <Button variant="primary" onClick={handleSeal}>
              Seal the Reading
            </Button>
          </div>

          {sealed && participant && (
            <div className={styles.result}>
              <h3>The Herald, sealed</h3>
              <div className={styles.resultCanvas}>
                <HeraldCanvas
                  ref={svgRef}
                  input={sealed.input}
                  layerCount={sealed.layerIndex}
                  displayName={participant.displayName}
                  createdAt={sealed.createdAt}
                />
              </div>
              <p>
                Reading {sealed.layerIndex + 1} is recorded.{" "}
                <Link to="/herald">View it in the Herald's history and synthesis →</Link>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

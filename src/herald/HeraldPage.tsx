import { useEffect, useRef, useState } from "react";
import type { ParticipantRecord, HeraldLayer, ReadingPath } from "../types/herald";
import type { LifeCycleEvent } from "../types/lifeCycle";
import {
  listParticipants,
  createParticipant,
  getLayers,
  addLayer,
} from "../storage/participantsRepo";
import { listLifeCycleEvents } from "../storage/lifeCycleRepo";
import { listAllCommentaries } from "../storage/commentariesRepo";
import type { CommentaryRecord } from "../types/commentary";
import { computeSacredTime } from "../data/sacredTime";
import { ReadingForm } from "./form/ReadingForm";
import { HeraldCanvas } from "./render/HeraldCanvas";
import { deriveHeraldForm } from "./synthesis/deriveHeraldForm";
import { ParticipantPicker } from "./history/ParticipantPicker";
import { HistoryScrubber } from "./history/HistoryScrubber";
import { LayerCaption } from "./history/LayerCaption";
import { LifeCycleEventsPanel } from "./lifeCycle/LifeCycleEventsPanel";
import { EpithetPanel } from "./epithet/EpithetPanel";
import { SacredTimeBanners } from "./lifeCycle/SacredTimeBanners";
import { exportHeraldSvg } from "./export/exportSvg";
import { exportHeraldPng } from "./export/exportPng";
import styles from "./HeraldPage.module.css";

export function HeraldPage() {
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>();
  const [layers, setLayers] = useState<HeraldLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>();
  const [lifeCycleEvents, setLifeCycleEvents] = useState<LifeCycleEvent[]>([]);
  const [commentaries, setCommentaries] = useState<CommentaryRecord[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    listParticipants().then(setParticipants);
    listAllCommentaries().then(setCommentaries);
  }, []);

  useEffect(() => {
    if (!selectedParticipantId) {
      setLayers([]);
      setSelectedLayerId(undefined);
      setLifeCycleEvents([]);
      return;
    }
    getLayers(selectedParticipantId).then((ls) => {
      setLayers(ls);
      setSelectedLayerId(undefined); // default to the synthesized Herald headline
    });
    listLifeCycleEvents(selectedParticipantId).then(setLifeCycleEvents);
  }, [selectedParticipantId]);

  async function handleCreateParticipant(displayName: string, path: ReadingPath) {
    const record = await createParticipant(displayName, path);
    setParticipants((prev) => [...prev, record].sort((a, b) => a.displayName.localeCompare(b.displayName)));
    setSelectedParticipantId(record.id);
  }

  function handleParticipantChange(updated: ParticipantRecord) {
    setParticipants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleSubmitReading(input: Parameters<typeof addLayer>[1]) {
    if (!selectedParticipantId) return;
    await addLayer(selectedParticipantId, input);
    const refreshed = await getLayers(selectedParticipantId);
    setLayers(refreshed);
    setSelectedLayerId(undefined); // show the updated synthesis forming
  }

  const selectedIndex = layers.findIndex((l) => l.id === selectedLayerId);
  const selectedLayer = selectedIndex >= 0 ? layers[selectedIndex] : undefined;
  const previousInput = selectedIndex > 0 ? layers[selectedIndex - 1].input : undefined;
  const selectedParticipant = participants.find((p) => p.id === selectedParticipantId);
  const todayHebrewDate = computeSacredTime(new Date(), "land").hebrewDate;
  const sealedEpithet = selectedParticipant?.heraldicEpithet;
  /** The Epithet belongs to the seventh reading onward — earlier layers show the pre-revelation Herald. */
  const epithetForSelectedLayer =
    sealedEpithet && selectedLayer && selectedLayer.layerIndex >= 6 ? sealedEpithet.text : undefined;

  // The headline Herald is the synthesis of the first seven readings; a
  // selected layer (via the scrubber/banner) shows that one reading instead.
  const heraldForm = layers.length ? deriveHeraldForm(layers) : undefined;
  const viewingSynthesis = !selectedLayer && !!heraldForm;
  const synthesisStatus = heraldForm
    ? heraldForm.revealed
      ? "The Herald, revealed"
      : `The Herald, forming — ${heraldForm.readingCount} of 7`
    : "";
  const synthesisEpithet = heraldForm?.revealed ? sealedEpithet?.text : undefined;

  return (
    <div className="page">
      <div className="page-header">
        <div className="kicker">The Herald</div>
        <h1>The Living Herald</h1>
      </div>
      <p>
        The Herald forms across a participant's first seven readings — the
        unfolding order of Creation — and is revealed at the seventh. It is
        never overwritten: each reading is also kept on its own below, the
        biography of how the Herald came to be.
      </p>

      <ParticipantPicker
        participants={participants}
        selectedId={selectedParticipantId}
        onSelect={setSelectedParticipantId}
        onCreate={handleCreateParticipant}
      />

      {selectedParticipantId && selectedParticipant && (
        <LifeCycleEventsPanel
          participant={selectedParticipant}
          onParticipantChange={handleParticipantChange}
          events={lifeCycleEvents}
          onEventsChange={setLifeCycleEvents}
        />
      )}

      {selectedParticipantId && selectedParticipant && (
        <SacredTimeBanners
          today={todayHebrewDate}
          participant={selectedParticipant}
          layers={layers}
          events={lifeCycleEvents}
          onSelectLayer={setSelectedLayerId}
        />
      )}

      {selectedParticipantId ? (
        <div className={styles.layout}>
          <div>
            <ReadingForm onSubmit={handleSubmitReading} readingIndex={layers.length} />
          </div>
          <div className={styles.canvasCol}>
            {selectedParticipant && layers.length >= 7 && !sealedEpithet && (
              <EpithetPanel
                participant={selectedParticipant}
                layers={layers}
                onParticipantChange={handleParticipantChange}
              />
            )}
            {heraldForm ? (
              <>
                {viewingSynthesis ? (
                  <HeraldCanvas
                    ref={svgRef}
                    form={heraldForm}
                    displayName={selectedParticipant?.displayName}
                    hebrewName={selectedParticipant?.hebrewName}
                    path={selectedParticipant?.path}
                    status={synthesisStatus}
                    epithet={synthesisEpithet}
                  />
                ) : (
                  <HeraldCanvas
                    ref={svgRef}
                    input={selectedLayer!.input}
                    previous={previousInput}
                    layerCount={selectedLayer!.layerIndex}
                    displayName={selectedParticipant?.displayName}
                    createdAt={selectedLayer!.createdAt}
                    epithet={epithetForSelectedLayer}
                  />
                )}
                {viewingSynthesis ? (
                  <p className={styles.synthesisCaption}>
                    <strong>{synthesisStatus}.</strong>{" "}
                    {heraldForm.revealed
                      ? "Formed from the participant's first seven readings — the unfolding order of Creation. It is now fixed; later readings are kept as history but do not change it."
                      : "The Herald forms across the first seven readings; each new reading resolves it further. Select a reading below to view it on its own."}
                  </p>
                ) : (
                  <LayerCaption
                    layer={selectedLayer!}
                    epithet={epithetForSelectedLayer}
                    commentaries={commentaries}
                  />
                )}
                <div className={styles.exportRow}>
                  <button
                    type="button"
                    onClick={() =>
                      svgRef.current &&
                      exportHeraldSvg(svgRef.current, `${selectedParticipant?.displayName ?? "herald"}.svg`)
                    }
                  >
                    Download SVG
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      svgRef.current &&
                      exportHeraldPng(svgRef.current, `${selectedParticipant?.displayName ?? "herald"}.png`)
                    }
                  >
                    Download PNG
                  </button>
                </div>
                <h3>History</h3>
                <HistoryScrubber
                  layers={layers}
                  form={heraldForm}
                  selectedId={selectedLayerId}
                  synthesisSelected={viewingSynthesis}
                  onSelect={setSelectedLayerId}
                  onSelectSynthesis={() => setSelectedLayerId(undefined)}
                />
              </>
            ) : (
              <p className={styles.empty}>
                No Herald yet for this participant. Fill out the reading form
                to begin — the Herald forms across the first seven readings.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className={styles.empty}>Select or create a participant to begin.</p>
      )}
    </div>
  );
}

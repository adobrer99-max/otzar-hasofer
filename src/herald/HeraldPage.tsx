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
import { computeSacredTime } from "../data/sacredTime";
import { ReadingForm } from "./form/ReadingForm";
import { HeraldCanvas } from "./render/HeraldCanvas";
import { ParticipantPicker } from "./history/ParticipantPicker";
import { HistoryScrubber } from "./history/HistoryScrubber";
import { LayerCaption } from "./history/LayerCaption";
import { LifeCycleEventsPanel } from "./lifeCycle/LifeCycleEventsPanel";
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
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    listParticipants().then(setParticipants);
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
      setSelectedLayerId(ls.length > 0 ? ls[ls.length - 1].id : undefined);
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
    const layer = await addLayer(selectedParticipantId, input);
    const refreshed = await getLayers(selectedParticipantId);
    setLayers(refreshed);
    setSelectedLayerId(layer.id);
  }

  const selectedIndex = layers.findIndex((l) => l.id === selectedLayerId);
  const selectedLayer = selectedIndex >= 0 ? layers[selectedIndex] : undefined;
  const previousInput = selectedIndex > 0 ? layers[selectedIndex - 1].input : undefined;
  const selectedParticipant = participants.find((p) => p.id === selectedParticipantId);
  const todayHebrewDate = computeSacredTime(new Date(), "land").hebrewDate;

  return (
    <div className="page">
      <div className="page-header">
        <div className="kicker">The Herald</div>
        <h1>The Living Herald</h1>
      </div>
      <p>
        The Herald is created from the three openly drawn letters at the
        close of a reading. It is never overwritten — each new reading adds
        a layer, accumulating like marginalia across a manuscript.
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
            <ReadingForm onSubmit={handleSubmitReading} />
          </div>
          <div className={styles.canvasCol}>
            {selectedLayer ? (
              <>
                <HeraldCanvas
                  ref={svgRef}
                  input={selectedLayer.input}
                  previous={previousInput}
                  layerCount={selectedLayer.layerIndex}
                  displayName={selectedParticipant?.displayName}
                  createdAt={selectedLayer.createdAt}
                />
                <LayerCaption layer={selectedLayer} />
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
                  selectedId={selectedLayerId}
                  onSelect={setSelectedLayerId}
                />
              </>
            ) : (
              <p className={styles.empty}>
                No Herald yet for this participant. Fill out the reading form
                to create their Origin Herald.
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

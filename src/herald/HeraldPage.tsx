import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui";
import type { ParticipantRecord, HeraldLayer, ReadingPath, HeraldStyle } from "../types/herald";
import type { LifeCycleEvent } from "../types/lifeCycle";
import {
  listParticipants,
  createParticipant,
  getLayers,
  addLayer,
  setHeraldStyle,
} from "../storage/participantsRepo";
import { listLifeCycleEvents } from "../storage/lifeCycleRepo";
import { listAllCommentaries } from "../storage/commentariesRepo";
import type { CommentaryRecord } from "../types/commentary";
import { computeSacredTime } from "../data/sacredTime";
import { ReadingForm } from "./form/ReadingForm";
import { HeraldCanvas } from "./render/HeraldCanvas";
import { deriveHeraldForm } from "./synthesis/deriveHeraldForm";
import { resolveShoresh } from "./shoresh/resolveShoresh";
import { ParticipantPicker } from "./history/ParticipantPicker";
import { HistoryScrubber } from "./history/HistoryScrubber";
import { LayerCaption } from "./history/LayerCaption";
import { LifeCycleEventsPanel } from "./lifeCycle/LifeCycleEventsPanel";
import { EpithetPanel } from "./epithet/EpithetPanel";
import { HeraldStylePanel } from "./style/HeraldStylePanel";
import { SacredTimeBanners } from "./lifeCycle/SacredTimeBanners";
import { exportHeraldSvg } from "./export/exportSvg";
import { exportHeraldPng } from "./export/exportPng";
import {
  blazonForSnapshot,
  blazonForForm,
  downloadBlazon,
  blazonToImagePrompt,
  copyText,
  downloadText,
} from "./export/blazon";
import styles from "./HeraldPage.module.css";

export function HeraldPage() {
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>();
  const [layers, setLayers] = useState<HeraldLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>();
  const [lifeCycleEvents, setLifeCycleEvents] = useState<LifeCycleEvent[]>([]);
  const [commentaries, setCommentaries] = useState<CommentaryRecord[]>([]);
  const [justRevealed, setJustRevealed] = useState(false);
  const [styleDraft, setStyleDraft] = useState<HeraldStyle>({});
  const [promptCopied, setPromptCopied] = useState(false);
  const wasRevealed = useRef(false);
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
      wasRevealed.current = ls.length >= 7; // already revealed: shown at rest
      setJustRevealed(false);
    });
    listLifeCycleEvents(selectedParticipantId).then(setLifeCycleEvents);
  }, [selectedParticipantId]);

  // Keep the curation draft in step with the selected participant's sealed style.
  useEffect(() => {
    const p = participants.find((x) => x.id === selectedParticipantId);
    setStyleDraft(p?.heraldStyle ?? {});
  }, [selectedParticipantId, participants]);

  async function handleCreateParticipant(displayName: string, path: ReadingPath) {
    const record = await createParticipant(displayName, path);
    setParticipants((prev) => [...prev, record].sort((a, b) => a.displayName.localeCompare(b.displayName)));
    setSelectedParticipantId(record.id);
  }

  function handleParticipantChange(updated: ParticipantRecord) {
    setParticipants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleSealStyle() {
    if (!selectedParticipantId) return;
    const updated = await setHeraldStyle(selectedParticipantId, styleDraft);
    handleParticipantChange(updated);
  }

  async function handleSubmitReading(input: Parameters<typeof addLayer>[1]) {
    if (!selectedParticipantId) return;
    await addLayer(selectedParticipantId, input);
    const refreshed = await getLayers(selectedParticipantId);
    // The reveal at the seventh: a one-time animation when this submission
    // crosses the threshold (session-only — reloading shows it at rest).
    if (!wasRevealed.current && refreshed.length >= 7) setJustRevealed(true);
    wasRevealed.current = refreshed.length >= 7;
    setLayers(refreshed);
    setSelectedLayerId(undefined); // show the updated synthesis forming
  }

  const selectedIndex = layers.findIndex((l) => l.id === selectedLayerId);
  const selectedLayer = selectedIndex >= 0 ? layers[selectedIndex] : undefined;
  const previousInput = selectedIndex > 0 ? layers[selectedIndex - 1].input : undefined;
  const selectedParticipant = participants.find((p) => p.id === selectedParticipantId);
  const styleDirty = JSON.stringify(styleDraft) !== JSON.stringify(selectedParticipant?.heraldStyle ?? {});
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
  // The blazon of whatever Herald is currently shown — the synthesis, or a
  // scrubbed single reading. Shared by the "Download blazon" and "Copy image
  // prompt" export controls.
  const currentBlazon = () =>
    viewingSynthesis && heraldForm
      ? blazonForForm(heraldForm, styleDraft, synthesisEpithet)
      : selectedLayer
        ? blazonForSnapshot(selectedLayer.input, styleDraft, epithetForSelectedLayer)
        : undefined;
  // The Word of the Life — when the dominant letters themselves spell a
  // root or name, the seven readings together speak a word.
  const lifeShoresh = heraldForm
    ? resolveShoresh(heraldForm.charges.map((c) => c.letterId) as [string, string, string])
    : undefined;

  // Soft life-cycle framing for the next reading: shown from when the event
  // is recorded until a reading is made after it (Bris frames the child's
  // very first page instead). Guidance, never a restriction.
  const firstReadingSince = (type: LifeCycleEvent["type"]) => {
    const event = lifeCycleEvents.find((e) => e.type === type);
    if (!event) return false;
    return !layers.some((l) => l.createdAt > event.createdAt);
  };
  const ritualNotes = {
    lettersAlone: firstReadingSince("aliyah"),
    bris: layers.length === 0 && lifeCycleEvents.some((e) => e.type === "bris"),
    barBatMitzvah: firstReadingSince("bar-bat-mitzvah"),
  };

  return (
    <div className="page page--wide">
      <PageHeader kicker="The Herald" title="The Living Herald" />
      <p>
        The Herald forms across a participant's first seven readings — the
        unfolding order of Creation — and is revealed at the seventh. It is
        never overwritten: each reading is also kept on its own below, the
        biography of how the Herald came to be. At marriage, two Heralds
        join in a shared <Link to="/covenant">Covenantal Herald</Link>.
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
            <ReadingForm
              onSubmit={handleSubmitReading}
              readingIndex={layers.length}
              ritualNotes={ritualNotes}
            />
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
                  <div
                    className={`${styles.heraldFrame} herald-living ${justRevealed ? `${styles.revealed} herald-revealing` : ""}`}
                    onAnimationEnd={() => setJustRevealed(false)}
                  >
                    <HeraldCanvas
                      ref={svgRef}
                      form={heraldForm}
                      displayName={selectedParticipant?.displayName}
                      hebrewName={selectedParticipant?.hebrewName}
                      path={selectedParticipant?.path}
                      status={synthesisStatus}
                      epithet={synthesisEpithet}
                      style={styleDraft}
                    />
                  </div>
                ) : (
                  <div className={`${styles.heraldFrame} herald-living`}>
                    <HeraldCanvas
                      ref={svgRef}
                      input={selectedLayer!.input}
                      previous={previousInput}
                      layerCount={selectedLayer!.layerIndex}
                      displayName={selectedParticipant?.displayName}
                      createdAt={selectedLayer!.createdAt}
                      epithet={epithetForSelectedLayer}
                      style={styleDraft}
                    />
                  </div>
                )}
                {viewingSynthesis ? (
                  <p className={styles.synthesisCaption}>
                    <strong>{synthesisStatus}.</strong>{" "}
                    {heraldForm.revealed
                      ? "Formed from the participant's first seven readings — the unfolding order of Creation. It is now fixed; later readings are kept as history but do not change it."
                      : "The Herald forms across the first seven readings; each new reading resolves it further. Select a reading below to view it on its own."}
                    {lifeShoresh?.tier === "root" && (
                      <>
                        {" "}
                        <strong>The Word of the Life:</strong> {lifeShoresh.word} —{" "}
                        {lifeShoresh.gloss}
                      </>
                    )}
                    {lifeShoresh?.tier === "name" && (
                      <>
                        {" "}
                        <strong>The Word of the Life:</strong> {lifeShoresh.name} —{" "}
                        {lifeShoresh.gloss}
                      </>
                    )}
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
                  <button
                    type="button"
                    onClick={() => {
                      const name = selectedParticipant?.displayName ?? "Herald";
                      const blazon = currentBlazon();
                      if (blazon) downloadBlazon(blazon, name, `${name}-blazon.txt`);
                    }}
                    title="A written description of the arms — the brief for an illustrator or foil die"
                  >
                    Download blazon
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const name = selectedParticipant?.displayName ?? "Herald";
                      const blazon = currentBlazon();
                      if (!blazon) return;
                      const prompt = blazonToImagePrompt(blazon, name);
                      const ok = await copyText(prompt);
                      if (ok) {
                        setPromptCopied(true);
                        window.setTimeout(() => setPromptCopied(false), 2000);
                      } else {
                        downloadText(prompt, `${name}-image-prompt.txt`);
                      }
                    }}
                    title="A rich image-generation prompt — paste into ChatGPT or DALL·E to render an illuminated plate"
                  >
                    {promptCopied ? "Copied!" : "Copy image prompt"}
                  </button>
                </div>
                <HeraldStylePanel
                  draft={styleDraft}
                  onChange={setStyleDraft}
                  onSeal={handleSealStyle}
                  dirty={styleDirty}
                  sealed={!!selectedParticipant?.heraldStyle}
                />
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

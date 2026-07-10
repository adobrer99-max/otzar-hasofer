import { useState } from "react";
import type { LetterDraw, Orientation } from "../../types/herald";
import type { SefirahId } from "../../types/letter";
import { letters } from "../../data/letters";
import { middot } from "../../data/middot";
import { dorotHouses, cardsByHouse } from "../../data/dorot";
import { Button } from "../../components/ui";
import styles from "./interactive.module.css";

export type PopoverTarget =
  | { kind: "letter" | "fourth" | "veiled"; label: string; value: LetterDraw | null }
  | { kind: "tree"; label: string; value: SefirahId | null }
  | { kind: "hand"; label: string; value: string }
  | { kind: "beneath" | "council"; label: string; value: string | null; readingIndex: number };

export interface PlacementPopoverProps {
  target: PopoverTarget;
  onCommit: (value: LetterDraw | SefirahId | string) => void;
  onClear: () => void;
  onClose: () => void;
}

/** The click-to-pick panel a zone opens. Keyboard- and touch-first. */
export function PlacementPopover({ target, onCommit, onClear, onClose }: PlacementPopoverProps) {
  return (
    <div className={styles.popoverBackdrop} onClick={onClose}>
      <div
        className={styles.popover}
        role="dialog"
        aria-label={target.label}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.popoverTitle}>{target.label}</div>
        <PopoverBody target={target} onCommit={onCommit} onClear={onClear} onClose={onClose} />
        <button type="button" className={styles.popoverClose} aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}

function PopoverBody({ target, onCommit, onClear, onClose }: PlacementPopoverProps) {
  switch (target.kind) {
    case "letter":
    case "fourth":
    case "veiled":
      return <LetterEditor value={target.value} onCommit={onCommit} onClear={onClear} onClose={onClose} />;
    case "tree":
      return <MiddahEditor value={target.value} onCommit={onCommit} onClose={onClose} />;
    case "hand":
      return <HandEditor value={target.value} onCommit={onCommit} onClose={onClose} />;
    case "beneath":
    case "council":
      return (
        <CardEditor value={target.value} readingIndex={target.readingIndex} onCommit={onCommit} onClose={onClose} />
      );
  }
}

function LetterEditor({
  value,
  onCommit,
  onClear,
  onClose,
}: {
  value: LetterDraw | null;
  onCommit: (v: LetterDraw) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [letterId, setLetterId] = useState(value?.letterId ?? "aleph");
  const [orientation, setOrientation] = useState<Orientation>(value?.orientation ?? "upright");
  return (
    <>
      <label className={styles.field}>
        Letter
        <select value={letterId} onChange={(e) => setLetterId(e.target.value)}>
          {letters.map((l) => (
            <option key={l.id} value={l.id}>
              {l.glyph} — {l.name}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Orientation
        <select value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)}>
          <option value="upright">Upright</option>
          <option value="reversed">Reversed — turned inward</option>
        </select>
      </label>
      <div className={styles.popoverActions}>
        <Button variant="primary" onClick={() => { onCommit({ letterId, orientation }); onClose(); }}>
          Place
        </Button>
        {value && (
          <Button variant="ghost" onClick={() => { onClear(); onClose(); }}>
            Clear
          </Button>
        )}
      </div>
    </>
  );
}

function MiddahEditor({
  value,
  onCommit,
  onClose,
}: {
  value: SefirahId | null;
  onCommit: (v: SefirahId) => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.middahList}>
      {middot.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`${styles.middahOption} ${value === m.id ? styles.middahActive : ""}`}
          onClick={() => { onCommit(m.id); onClose(); }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function HandEditor({
  value,
  onCommit,
  onClose,
}: {
  value: string;
  onCommit: (v: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(value);
  return (
    <>
      <label className={styles.field}>
        Palm baseline (Chai · Lev · Rosh)
        <textarea value={text} rows={4} onChange={(e) => setText(e.target.value)} autoFocus />
      </label>
      <div className={styles.popoverActions}>
        <Button variant="primary" onClick={() => { onCommit(text); onClose(); }}>
          Record
        </Button>
      </div>
    </>
  );
}

function CardEditor({
  value,
  readingIndex,
  onCommit,
  onClose,
}: {
  value: string | null;
  readingIndex: number;
  onCommit: (v: string) => void;
  onClose: () => void;
}) {
  const openedThrough = Math.min(readingIndex + 1, 7);
  const encounterOfHouse = (sefirah: string) =>
    ({ chesed: 1, gevurah: 2, tiferet: 3, netzach: 4, hod: 5, yesod: 6, malchut: 7 })[sefirah] ?? 8;
  const ordered = [
    ...dorotHouses.filter((h) => encounterOfHouse(h.sefirah) <= openedThrough),
    ...dorotHouses.filter((h) => encounterOfHouse(h.sefirah) > openedThrough),
  ];
  const initialHouse =
    dorotHouses.find((h) => cardsByHouse(h.id).some((c) => c.id === value))?.id ?? ordered[0].id;
  const [houseId, setHouseId] = useState(initialHouse);
  const [cardId, setCardId] = useState(value ?? cardsByHouse(initialHouse)[0].id);
  return (
    <>
      <label className={styles.field}>
        House
        <select
          value={houseId}
          onChange={(e) => {
            setHouseId(e.target.value);
            setCardId(cardsByHouse(e.target.value)[0].id);
          }}
        >
          {ordered.map((h) => (
            <option key={h.id} value={h.id}>
              House of {h.figure}
              {encounterOfHouse(h.sefirah) <= openedThrough ? "" : " — not yet opened"}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Card
        <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
          {cardsByHouse(houseId).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.popoverActions}>
        <Button variant="primary" onClick={() => { onCommit(cardId); onClose(); }}>
          Lay the card
        </Button>
      </div>
    </>
  );
}

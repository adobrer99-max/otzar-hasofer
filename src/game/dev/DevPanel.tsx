import { useState } from "react";
import { Button } from "../../components/ui";
import { regionAt, TOTAL_REGIONS } from "../regions";
import { LAMPS } from "../combat";
import { WITNESSES_POSSIBLE } from "../story";
import {
  DEV_MARKER,
  warpParams,
  WARP_DEFAULTS,
  type WarpLetters,
  type WarpOptions,
} from "./warp";
import styles from "./DevPanel.module.css";

/**
 * The form a person uses. The harness uses the query params directly.
 *
 * This file is reached only through a dynamic import guarded by
 * `import.meta.env.DEV`, so a production build never pulls it — nor its
 * stylesheet — into a chunk. `warp.test.ts` grubs through `dist/` for
 * `DEV_MARKER` to keep that honest, which is why the marker is rendered here
 * rather than merely declared.
 *
 * Remember: **`import.meta.env.DEV` is false under `vite preview`.** If the
 * panel is missing, that is why. Use `npm run dev`.
 */

const LETTER_MODES: { value: WarpLetters; label: string }[] = [
  { value: "as-of-rung", label: "as of the rung" },
  { value: "none", label: "none — bare hands" },
  { value: "all", label: "all twenty-two" },
  { value: "all-but-peh", label: "all but Peh — the mute plea" },
];

export function DevPanel({ onWarp }: { onWarp: (options: WarpOptions) => void }) {
  const [options, setOptions] = useState<WarpOptions>(WARP_DEFAULTS);
  const set = <K extends keyof WarpOptions>(key: K, value: WarpOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  return (
    <section className={styles.panel} data-dev={DEV_MARKER} aria-label="Dev warp">
      <div className={styles.head}>
        <h2 className={styles.title}>Warp</h2>
        <p className={styles.note}>dev only</p>
      </div>
      <p className={styles.note}>
        Start a climb part-way up, holding whatever you say. A full climb is fifty-two
        thousand pixels; most of what is worth looking at is above the fourth rung.
      </p>

      <div className={styles.rows}>
        <label htmlFor="warp-rung">Rung</label>
        <select
          id="warp-rung"
          value={options.rung}
          onChange={(e) => set("rung", Number(e.target.value))}
        >
          {Array.from({ length: TOTAL_REGIONS }, (_, i) => i + 1).map((rung) => (
            <option key={rung} value={rung}>
              {rung} — {regionAt(rung).name}
            </option>
          ))}
        </select>

        <label htmlFor="warp-letters">Letters</label>
        <select
          id="warp-letters"
          value={options.letters}
          onChange={(e) => set("letters", e.target.value as WarpLetters)}
        >
          {LETTER_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>

        <label htmlFor="warp-lamps">Lamps</label>
        <input
          id="warp-lamps"
          type="number"
          min={1}
          max={LAMPS}
          value={options.lamps}
          onChange={(e) => set("lamps", Number(e.target.value))}
        />

        <label htmlFor="warp-witnesses">Houses met</label>
        <input
          id="warp-witnesses"
          type="number"
          min={0}
          max={WITNESSES_POSSIBLE}
          value={options.witnesses}
          onChange={(e) => set("witnesses", Number(e.target.value))}
        />

        <label htmlFor="warp-seed">Seed</label>
        <input
          id="warp-seed"
          type="text"
          inputMode="numeric"
          placeholder="the day's own"
          value={options.seed ?? ""}
          onChange={(e) =>
            set("seed", e.target.value.trim() === "" ? undefined : Number(e.target.value))
          }
        />

        <span />
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={options.porch}
            onChange={(e) => set("porch", e.target.checked)}
          />
          Lay the taught porch
        </label>
      </div>

      <div className={styles.actions}>
        <Button onClick={() => onWarp(options)}>Warp</Button>
        <span className={styles.link}>#/game?{warpParams(options)}</span>
      </div>
    </section>
  );
}

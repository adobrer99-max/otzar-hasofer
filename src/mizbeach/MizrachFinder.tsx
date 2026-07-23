import { useState } from "react";
import { Button } from "../components/ui";
import { bearingToJerusalem, compassPoint } from "./mizrach";
import styles from "./MizrachFinder.module.css";

type FinderState =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "found"; bearing: number }
  | { kind: "unavailable"; reason: string };

/**
 * The live Mizrach finder — one-shot geolocation → great-circle bearing to
 * Jerusalem, read out in degrees and compass winds. The folio's engraved
 * Mizrach vector stays a fixed symbol; this small panel computes the real
 * direction from wherever the Scribe stands. Denials and failures resolve to
 * a calm inline note, never an error state.
 */
export function MizrachFinder() {
  const [state, setState] = useState<FinderState>({ kind: "idle" });

  function locate() {
    if (!("geolocation" in navigator)) {
      setState({ kind: "unavailable", reason: "This device offers no location service." });
      return;
    }
    setState({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({ kind: "found", bearing: bearingToJerusalem(pos.coords.latitude, pos.coords.longitude) });
      },
      () => {
        setState({
          kind: "unavailable",
          reason: "Location was not shared — the engraved vector remains your fixed symbol.",
        });
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <div className={styles.finder}>
      {state.kind === "found" ? (
        <p className={styles.reading} role="status">
          <svg
            className={styles.needle}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            aria-hidden="true"
            style={{ transform: `rotate(${state.bearing}deg)` }}
          >
            <path d="M8 1 L11 11 L8 8.6 L5 11 Z" fill="currentColor" />
          </svg>
          Mizrach from here: <strong>{Math.round(state.bearing)}°</strong> — {compassPoint(state.bearing)}
        </p>
      ) : state.kind === "unavailable" ? (
        <p className={styles.note}>{state.reason}</p>
      ) : (
        <Button variant="subtle" onClick={locate} disabled={state.kind === "locating"}>
          {state.kind === "locating" ? "Finding the Mizrach…" : "✦ Find the Mizrach from here"}
        </Button>
      )}
    </div>
  );
}

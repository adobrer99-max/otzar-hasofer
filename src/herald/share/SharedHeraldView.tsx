import type { Ref } from "react";
import { HeraldCanvas } from "../render/HeraldCanvas";
import type { SharedHeraldPayload } from "./sharePayload";
import styles from "./share.module.css";

/**
 * A participant-facing Herald: the canvas and its caption (name, Hebrew
 * name, status, the epithet once revealed, and a date). Renders only a
 * SharedHeraldPayload — the veil-free snapshot buildSharePayload makes —
 * so it never holds readings, reflections or the Sod. Shared by the public
 * share-link page and the printed keepsake.
 */
export function SharedHeraldView({
  payload,
  dateLabel = "Published",
  svgRef,
}: {
  payload: SharedHeraldPayload;
  /** The word before the date ("Published" on a share link, "Given" on a keepsake). */
  dateLabel?: string;
  svgRef?: Ref<SVGSVGElement>;
}) {
  return (
    <>
      <div className={styles.sharedCanvas}>
        <HeraldCanvas
          ref={svgRef}
          form={payload.heraldForm}
          displayName={payload.displayName}
          hebrewName={payload.hebrewName}
          path={payload.path}
          status={payload.status}
          epithet={payload.epithet}
          style={payload.style}
        />
      </div>
      <div className={styles.sharedCaption}>
        <p>
          <strong>{payload.displayName}</strong>
          {payload.hebrewName && (
            <>
              {" · "}
              <span lang="he">{payload.hebrewName}</span>
            </>
          )}
        </p>
        <p>{payload.status}</p>
        {payload.epithet && <p className={styles.sharedEpithet}>“{payload.epithet}”</p>}
        <p>
          {dateLabel}{" "}
          {new Date(payload.publishedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </>
  );
}

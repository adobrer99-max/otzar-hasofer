import { useEffect, useState } from "react";
import { Button } from "../../components/ui";
import { qrPath, qrSvgDocument } from "./qr";
import styles from "./share.module.css";

/**
 * A scannable code for the share link, for handing it across a table. The
 * encoder loads only when the code is first shown. Always dark-on-light with
 * a full quiet zone, whatever the page theme, so phones read it reliably.
 */
export function ShareQr({ url, fileStem }: { url: string; fileStem: string }) {
  const [matrix, setMatrix] = useState<boolean[][] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMatrix(null);
    setFailed(false);
    import("uqr")
      .then(({ encode }) => {
        if (!cancelled) setMatrix(encode(url, { ecc: "M", border: 4 }).data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  function download() {
    if (!matrix) return;
    const blob = new Blob([qrSvgDocument(matrix)], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${fileStem}-share-qr.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 0);
  }

  if (failed) return <p className={styles.note}>The code couldn't be drawn — copy the link instead.</p>;
  if (!matrix) return <p className={styles.note}>Drawing the code…</p>;

  const size = matrix.length;
  return (
    <div className={styles.qr}>
      <svg
        className={styles.qrCode}
        viewBox={`0 0 ${size} ${size}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label="QR code for the share link"
      >
        <rect width={size} height={size} fill="#ffffff" />
        <path d={qrPath(matrix)} fill="#000000" />
      </svg>
      <Button variant="subtle" onClick={download}>
        Download the code (SVG)
      </Button>
    </div>
  );
}

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui";
import type { GeographyMode } from "../../types/herald";
import { computeSacredTime } from "../../data/sacredTime";
import { MizbeachCanvas } from "../../mizbeach/MizbeachCanvas";
import { MizbeachCentralPanel } from "../../mizbeach/render/centralPanel";
import { SacredTimePanel } from "../../herald/form/SacredTimePanel";
import { exportHeraldSvg } from "../../herald/export/exportSvg";
import { exportHeraldPng } from "../../herald/export/exportPng";
import { VIEWBOX_SIZE } from "../../mizbeach/render/mizbeachGeometry";
import styles from "./Mizbeach.module.css";

export function Mizbeach() {
  const [geography, setGeography] = useState<GeographyMode>("land");
  const [revealHidden, setRevealHidden] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const sacredTime = computeSacredTime(new Date(), geography);

  return (
    <div className="page page--wide">
      <PageHeader kicker="Guidebook 04" title="The Mizbe'ach" />
      <p>
        <em>"The cards are the words. The Mizbe'ach is the sentence."</em>
      </p>
      <p>
        This page explains the folio. To <strong>conduct a reading on it</strong> — placing
        the letters and the veiled anchor on the surface and turning the rings — open{" "}
        <Link to="/mizbeach">the interactive Mizbe'ach →</Link>
      </p>
      <p>
        The Mizbe'ach is a dual-sided charcoal leather ritual folio — the
        physical geometry a reading unfolds across. The renderings below are
        a live digital reference: the ring mandala reflects today's actual
        Hebrew date, moon phase, and any active festival, using the same
        Sacred Time engine that drives the Herald's reading form.
      </p>

      <h2>The Central Panel</h2>
      <p>
        Hand Anchor, Three Gates, Three Wells, Veiled Anchor, and Tree of
        Life, in the order a reading moves through them.
      </p>
      <div className={styles.controls}>
        <button
          type="button"
          aria-pressed={revealHidden}
          onClick={() => setRevealHidden((r) => !r)}
        >
          {revealHidden ? "Conceal the Hidden Layer" : "Reveal the Hidden Layer (Or HaGanuz)"}
        </button>
      </div>
      <div className={styles.canvasWrap}>
        <MizbeachCentralPanel revealTree={revealHidden} />
      </div>

      <h2>The Ring Mandala</h2>
      <p>
        The Mazalot, Moon, Solar Month/Holiday, and Parsha rings, the
        Sabbath Core, the PaRDeS corners, the Shivat HaMinim border, and the
        Mizrach vector — described in full below the diagram.
      </p>
      <div className={styles.controls}>
        <div className={styles.segmented} role="group" aria-label="Geography — Land or Galut">
          <button
            type="button"
            className={geography === "land" ? styles.active : undefined}
            aria-pressed={geography === "land"}
            onClick={() => setGeography("land")}
          >
            Land
          </button>
          <button
            type="button"
            className={geography === "galut" ? styles.active : undefined}
            aria-pressed={geography === "galut"}
            onClick={() => setGeography("galut")}
          >
            Galut
          </button>
        </div>
      </div>

      <div className={styles.canvasWrap}>
        <MizbeachCanvas ref={svgRef} sacredTime={sacredTime} />
      </div>

      <div className={styles.exportRow}>
        <button
          type="button"
          onClick={() => svgRef.current && exportHeraldSvg(svgRef.current, "mizbeach.svg")}
        >
          Download SVG
        </button>
        <button
          type="button"
          onClick={() =>
            svgRef.current &&
            exportHeraldPng(svgRef.current, "mizbeach.png", "print", {
              width: VIEWBOX_SIZE,
              height: VIEWBOX_SIZE,
            })
          }
        >
          Download PNG
        </button>
      </div>

      <SacredTimePanel
        snapshot={sacredTime}
        backdateEnabled={false}
        backdateValue=""
        onBackdateEnabledChange={() => {}}
        onBackdateValueChange={() => {}}
        showBackdate={false}
      />

      <h2>Hand Anchor</h2>
      <p>
        The keystone of the hand. The neshama's point of embodiment. The
        reading begins here, with the Scribe reading the participant's Chai,
        Lev, and Rosh lines.
      </p>

      <h2>The Corners — PaRDeS</h2>
      <p>
        Peshat · Remez · Drash · Sod — the Simple, the Hinted, the Sought,
        the Lived. Each corner of the folio marks one interpretive layer
        through which a drawn letter can be read: the letter as it is, the
        witness of tradition, the Scribe's faithful commentary, and finally
        the participant's own lived experience — the same four tiers the
        Treasury's <Link to="/commentaries">Commentaries</Link> space is built
        around.
      </p>

      <h2>Three Wells</h2>
      <p>
        Torah · Nevi'im · Ketuvim — Teaching, Prophets, Writings. The sources
        from which the reading's living meaning is drawn.
      </p>

      <h2>Veiled Anchor</h2>
      <p>
        The hidden card. The Sod (secret) of the reading, revealed in time —
        drawn privately by the Scribe to guide their private read of the
        participant's trajectory, and deliberately excluded from the
        participant-facing Herald.
      </p>

      <h2>The Hidden Layer — Or HaGanuz</h2>
      <p>
        The spine of existence, etched in UV ink on the physical folio and
        invisible until revealed. The digital folio above hides it the same
        way — use "Reveal the Hidden Layer" to see the ten Sefirot. The
        dominant middah drawn in a reading is reflected on this same tree in
        the participant's Herald.
      </p>

      <h2>The Rings</h2>
      <p>
        Reading outward to inward: the <strong>Ring of the Mazalot</strong>{" "}
        (the cosmic climate — the zodiac sign of the current Hebrew month),
        the <strong>Ring of the Moon</strong> (the lunar pulse — the
        traditional eight-phase cycle, new through waning crescent), the{" "}
        <strong>Ring of the Solar Month/Holiday</strong>{" "}
        (the temporal season — the current Hebrew month, or an active
        festival's gesture when one is underway), and the{" "}
        <strong>Ring of the Parsha</strong> (the narrative context — the
        weekly Torah portion, computed live by the Treasury's own engine;
        see the <Link to="/guide/sacred-time">Sacred Time</Link> page's
        note on cross-checking a published luach). At the center, the{" "}
        <strong>Sabbath Core</strong> marks whether today is Shabbat — the
        point of stillness all the rings turn around.
      </p>

      <h2>Border and Vector</h2>
      <p>
        The border traces the <strong>Shivat HaMinim</strong> — the seven
        species of Deuteronomy 8:8, the fruits of the covenant. A small
        arrow at the top marks <strong>Mizrach</strong>, facing Jerusalem —
        a fixed reference symbol here, not a computed compass bearing.
      </p>

      <h2>Heraldry</h2>
      <p>
        The Mizbe'ach's most sacred responsibility, digitally, is the
        creation and stewardship of each participant's Living Herald — see{" "}
        <Link to="/guide/visual-canon">Visual Canon</Link> and use{" "}
        <Link to="/herald">the Herald generator</Link> to create one.
      </p>
    </div>
  );
}

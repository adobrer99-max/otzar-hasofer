import { Link } from "react-router-dom";
import styles from "./VisualCanon.module.css";

const swatches = [
  { name: "Charcoal", color: "var(--color-charcoal)" },
  { name: "Gold", color: "var(--color-gold)" },
  { name: "Blue", color: "var(--color-blue)" },
  { name: "Silver", color: "var(--color-silver)" },
  { name: "Copper", color: "var(--color-copper)" },
];

export function VisualCanon() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="kicker">Guidebook 08</div>
        <h1>Visual Canon</h1>
      </div>
      <p>
        The visual identity draws from illuminated manuscripts, ketubbot,
        medieval Jewish books, Geniza fragments, and ceremonial objects.
        Everything communicates quiet reverence rather than spectacle.
      </p>

      <h2>Palette</h2>
      <div className={styles.swatches}>
        {swatches.map((s) => (
          <div className={styles.swatch} key={s.name}>
            <div className={styles.chip} style={{ background: s.color }} />
            {s.name}
          </div>
        ))}
      </div>

      <h2>Two Grounds — Charcoal & Vellum</h2>
      <p>
        The Treasury is read on either of two grounds, chosen with the
        sun/moon seal in the header. The <strong>charcoal field</strong> is
        the default — gold linework on deep slate, the manuscript by
        candlelight. The <strong>vellum ground</strong> is its daylight
        counterpart — ink-brown letters on warm parchment, gold kept as the
        accent. The five brand colours never change between them; only the
        page around them does. Crucially, the Herald and the Mizbe'ach always
        keep their charcoal field in either mode — an illuminated plate set
        upon the page, never re-tinted, because "gold linework upon a charcoal
        field" is intrinsic to what they are.
      </p>

      <h2>Ornament</h2>
      <p>
        A small, restrained vocabulary carries the illuminated feeling without
        spectacle: the <strong>illuminated initial</strong> (a letter set
        large in gold to open a passage), the <strong>decorated rule</strong>{" "}
        (a hairline centred on a single gold lozenge), the hairline gold
        frame, and the escutcheon sigil drawn from the Herald's own geometry.
        Every one is quiet, and every one is structural — never applied for
        decoration's sake alone.
      </p>

      <h2>Typography</h2>
      <p>
        Latin text is set in <span style={{ fontFamily: "var(--font-latin)" }}>Frank Ruhl Libre</span>,
        a serif with roots in Hebrew typesetting; Hebrew text is set in{" "}
        <span style={{ fontFamily: "var(--font-hebrew)" }}>David Libre (דוד ליברה)</span>, chosen for
        its manuscript warmth over a geometric sans face.
      </p>

      <h2>The Herald's Visual Language</h2>
      <p>Every Herald is rendered according to this canon. It may include:</p>
      <ul>
        <li>Hebrew letters, drawn as gold-leaf letterforms (calligraphic outlines, not a live font)</li>
        <li>Heraldic shield divisions</li>
        <li>Traditional ornament</li>
        <li>Symbolic flora and fauna</li>
        <li>Sacred geometry</li>
        <li>Calligraphic flourishes</li>
        <li>Seasonal motifs</li>
        <li>Gold linework upon a charcoal field</li>
      </ul>
      <p>
        No decorative element is arbitrary; every mark reflects a lived
        relationship within the Treasury.
      </p>

      <h2>The Illuminated Herald</h2>
      <p>
        The Herald is rendered as an <strong>illuminated plate</strong>, not
        flat linework: a beaten <strong>gold-leaf</strong> sheen on the letters
        and emblems, a soft depth beneath the shield, and a whisper of{" "}
        <strong>vellum tooth</strong> across the field. Around the escutcheon it
        grows into a full coat of arms — a <strong>crest</strong> (a gold flame
        upon a torse), foliate <strong>mantling</strong>, a{" "}
        <strong>compartment</strong> (rooted earth in the Land, water in Galut),
        and a <strong>motto scroll</strong> bearing the sealed Heraldic Epithet.
      </p>
      <p>
        Because the Herald "is recognized, never assigned," its look is{" "}
        <em>derived</em> first. The Scribe may then <strong>curate</strong>{" "}
        within the canon — the metal of the frame (gold, antique, or silvered)
        and which elements of the coat of arms are shown — but only within these
        curated choices, never as free invention. On the headline Herald the
        gold breathes with a quiet, motion-respecting shimmer; hovering a letter
        names it.
      </p>

      <hr className="hairline-rule" />
      <p>
        This canon governs the look of both{" "}
        <Link to="/herald">the Herald</Link> and the live{" "}
        <Link to="/guide/mizbeach">Mizbe'ach</Link> — gold linework upon a
        charcoal field.
      </p>
    </div>
  );
}

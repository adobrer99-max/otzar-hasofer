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
        <li>Hebrew letters</li>
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
    </div>
  );
}

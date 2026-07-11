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
        page around them does. Crucially, the Herald and the Mizbe'ach keep
        their deep field in either mode — an illuminated plate set upon the
        page, never re-tinted by the theme. The Mizbe'ach holds gold linework
        on charcoal; the Herald keeps a dark ground too, but coloured from the
        letters drawn (see below) — the one place individual colour is intended.
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
        <li>Hebrew letters, drawn as calligraphic letterforms (outlines, not a live font)</li>
        <li>Heraldic shield divisions</li>
        <li>Traditional ornament</li>
        <li>Symbolic flora and fauna</li>
        <li>Calligraphic flourishes</li>
        <li>Seasonal motifs</li>
        <li>A field and charges coloured from the letters actually drawn</li>
      </ul>
      <p>
        No decorative element is arbitrary; every mark reflects a lived
        relationship within the Treasury.
      </p>

      <h2>The Illuminated Herald</h2>
      <p>
        The Herald is the <em>one</em> surface that steps outside the five brand
        colours above — deliberately. Each letter carries its own association —
        an element, a planet, or a sign of the zodiac — and the Herald is{" "}
        <strong>coloured from the letters actually drawn</strong>: each charge
        is enamelled in its letter's colour, and the field takes their blend. So
        a reading of fire-letters burns red, one of water-letters runs deep
        blue, and no two Heralds share a palette — each is unique to the person,
        not one of a fixed set. It is rendered as an{" "}
        <strong>illuminated plate</strong> — depth beneath the shield, a whisper
        of <strong>vellum tooth</strong>, and a full coat of arms around the
        escutcheon: a <strong>crest</strong>, foliate <strong>mantling</strong>,
        a <strong>compartment</strong> (rooted earth in the Land, water in
        Galut), and a <strong>motto scroll</strong> bearing the sealed Heraldic
        Epithet. Nothing is ever laid over a letter.
      </p>
      <p>
        As a Herald forms across the seven readings it fills out the way real
        arms do — the centre stays a fixed heart of the three dominant letters,
        while everything else accretes at the edges. The <strong>field</strong>{" "}
        divides heraldically by how many letters dominate (a plain field, then{" "}
        <em>per pale</em>, then <em>tierced</em>), and the secondary letters
        gather as small charges around the <strong>bordure</strong> — a ring
        that carries the whole reading-history without ever crowding the
        centre.
      </p>
      <p>
        Each letter also has a <strong>heraldic charge</strong> — a growing
        symbol language of the aleph-bet, drawn from each letter's own ancient
        pictographic origin: aleph the ox, bet the house, dalet the door, mem
        the water (a fountain), zayin the sword, ayin the eye, shin the flame,
        tav the cross, and so on through all twenty-two. The Scribe may set a
        Herald to wear these charges instead of the letterforms, so a reading
        becomes a true coat of arms assembled from the symbols of the letters
        drawn.
      </p>
      <p>
        Because the Herald "is recognized, never assigned," its colour is{" "}
        <em>derived</em> from the reading first. The Scribe may then{" "}
        <strong>curate</strong> — the metal of the frame (natural, gold, antique,
        or silvered) and which elements of the coat of arms are shown — but only
        within these curated choices, never as free invention. On the headline
        Herald the frame breathes with a quiet, motion-respecting shimmer;
        hovering a letter names it.
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

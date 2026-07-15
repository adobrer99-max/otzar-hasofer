import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui";
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
      <PageHeader kicker="Guidebook 08" title="Visual Canon" hebrew="חזון" />
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
        <li>Gold charges on a field tinctured from the letters actually drawn</li>
      </ul>
      <p>
        No decorative element is arbitrary; every mark reflects a lived
        relationship within the Treasury.
      </p>

      <h2>The Foil-Stamped Herald</h2>
      <p>
        The Herald is struck to be <strong>foil-stamped on the back of the
        recipient's own card deck</strong>, so it is drawn as a real engraving,
        never a screen graphic: <strong>flat metallic gold</strong> and{" "}
        <strong>flat heraldic tinctures</strong>, crisp linework, a deep flat
        ground — no gradients, glows, shadows, or texture. Each letter carries
        its own association — an element, a planet, or a sign of the zodiac —
        and the Herald is <strong>coloured from the letters actually drawn</strong>:
        the charges are struck in gold, and each field is tinctured in its
        letter's own colour, taken to a deep jewel tone (gold on colour, the
        heraldic rule of tincture). And when a Mother letter is drawn, its{" "}
        <strong>element casts the whole field</strong> toward its hue — a fire
        reading burns on deep red, a water reading cools to deep blue — so the
        ground itself declares the reading's nature. No two Heralds share a
        field. Around the escutcheon stands a full coat of arms: a{" "}
        <strong>crest</strong> (a gold torse), a <strong>mantling</strong> of the{" "}
        <strong>Shivat HaMinim</strong> (the seven species — wheat, barley,
        grape, fig, pomegranate, olive, or date — set by whichever of the seven
        lower Sefirot wins out across the Seven Encounters, or curated), a{" "}
        <strong>compartment</strong> (rooted earth in the Land, water in Galut),
        an engraved <strong>orle</strong> studded with gold lozenges, and
        a <strong>motto scroll</strong> bearing the sealed Heraldic Epithet.
        Nothing is ever laid over a letter.
      </p>
      <p>
        The crest bears the reading's <strong>zodiac signs</strong>: above the
        torse rises the <strong>constellation</strong> of each drawn letter that
        carries one (a single gold flame when none do), while the planet{" "}
        <strong>sigils</strong> stand at the shield's base beneath the gematria.
        Two further marks, both derived from the letters, make each Herald
        singular: a <strong>semé</strong> of faint gold
        estoiles powdering the field, and the reading's{" "}
        <strong>gematria</strong>, struck in small Hebrew numerals beneath the
        charges. Every one is a consequence of the reading, never decoration for
        its own sake.
      </p>
      <p>
        As a Herald forms across the seven readings it fills out the way real
        arms do — a fixed heart, elaboration around it. The{" "}
        <strong>field</strong> divides heraldically by how many letters dominate
        (a plain field, then <em>per pale</em>, then <em>tierced</em>), in the
        letters' own colours. And when the three dominant letters spell a
        Hebrew root, that <strong>Word of the Life</strong> is borne on a{" "}
        <strong>fess</strong> — a band across the shield beneath the charges,
        inscribed with the word they together speak.
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
        Because the Herald "is recognized, never assigned," its tinctures are{" "}
        <em>derived</em> from the reading first. The Scribe may then{" "}
        <strong>curate</strong> — the metal of the achievement (gold, antique,
        or silvered) and which elements of the coat of arms are shown — but only
        within these curated choices, never as free invention. On the headline
        Herald the crest flame breathes with a quiet, motion-respecting flicker;
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

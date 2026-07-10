import { Link } from "react-router-dom";
import { Card, DecoratedRule } from "../../components/ui";
import { HeroSigil } from "./HeroSigil";
import styles from "./Home.module.css";

interface Door {
  to: string;
  label: string;
  blurb: string;
}

const guideDoors: Door[] = [
  {
    to: "/guide/foundations",
    label: "Foundations",
    blurb: "The philosophy, cosmology, and ritual principles the practice rests on.",
  },
  {
    to: "/guide/letters",
    label: "The Twenty-Two Letters",
    blurb: "Derekh Eretz — one chapter per Hebrew letter, the enduring architecture of reality.",
  },
  {
    to: "/guide/shoresh",
    label: "Shoresh",
    blurb: "How three drawn letters become the root — the Word of the Reading — through a four-tier hierarchy.",
  },
  {
    to: "/guide/dorot",
    label: "Derekh Ha'Dorot",
    blurb: "The second deck: fourteen Houses of biblical episodes, where the eternal principles are lived out in history.",
  },
  {
    to: "/guide/mizbeach",
    label: "The Mizbe'ach",
    blurb: "The ritual folio, rendered live — its rings turning with today's Hebrew date, moon, and festivals.",
  },
  {
    to: "/guide/scribe",
    label: "The Scribe",
    blurb: "The liturgy, ethics, posture, and questioning that guide a reading.",
  },
  {
    to: "/guide/sacred-time",
    label: "Sacred Time",
    blurb: "Immediate, Personal, and Covenantal time — no reading occurs outside of sacred time.",
  },
  {
    to: "/guide/encounters",
    label: "The Seven Encounters",
    blurb: "How a participant's first seven readings unfold through the days of Creation.",
  },
  {
    to: "/guide/visual-canon",
    label: "Visual Canon",
    blurb: "The typography, color, and iconography that give the Treasury its quiet reverence.",
  },
];

const practiceDoors: Door[] = [
  {
    to: "/herald",
    label: "The Herald",
    blurb: "Create a participant's living heraldic sigil at the close of a reading — with Shoresh resolution, Sacred Time, and the Heraldic Epithet earned at the seventh reading.",
  },
  {
    to: "/mizbeach",
    label: "The Mizbe'ach",
    blurb: "Conduct a reading on the folio itself — place the letters and the veiled anchor on the surface, turn the rings to the sacred time, and seal the Herald.",
  },
  {
    to: "/covenant",
    label: "The Covenantal Herald",
    blurb: "At marriage, a shared Herald is created — derived from both partners' Treasuries and grown through the seven blessings of the Sheva Brachot.",
  },
  {
    to: "/sefarim",
    label: "The Shelf of Sefarim",
    blurb: "The Beit Midrash — the Book of Roots, the Vocabulary Treasury, and Balagan HaOtzar (the scribe's genizah), each read and written through the four tiers of PaRDeS.",
  },
  {
    to: "/commentaries",
    label: "Commentaries",
    blurb: "The Drash tier — received and ongoing commentaries on the letters, the Ha'Dorot cards, and the roots.",
  },
];

function DoorGrid({ doors }: { doors: Door[] }) {
  return (
    <div className={styles.doorGrid}>
      {doors.map((door) => (
        <Link key={door.to} to={door.to} className={styles.doorLink}>
          <Card interactive>
            <span className={styles.doorLabel}>{door.label}</span>
            <p className={styles.doorBlurb}>{door.blurb}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function Home() {
  return (
    <div className={`page page--wide ${styles.home}`}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.kicker}>The Treasury of the Scribe</div>
          <h1 className={styles.heroTitle}>Otzar Ha'Sofer</h1>
          <p className={styles.epigraph}>
            "The Scribe does not reveal destiny. The Scribe guides the neshama of the person
            seeking it."
          </p>
          <p className={styles.lede}>
            A reference and a working companion for the Otzar Ha'Sofer practice — never a
            fortune-telling tool. Read the guide to learn the system; use the living tools to
            conduct a reading and tend each participant's Herald over time.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/guide/foundations" className={styles.ctaPrimary}>
              Enter the Guide
            </Link>
            <Link to="/herald" className={styles.ctaGhost}>
              Begin a Reading
            </Link>
          </div>
        </div>
        <div className={styles.heroSigil}>
          <HeroSigil />
        </div>
      </section>

      <DecoratedRule />

      <section className={styles.section}>
        <div className={styles.sectionTitle}>The Reference Guide</div>
        <DoorGrid doors={guideDoors} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>The Living Practice</div>
        <DoorGrid doors={practiceDoors} />
      </section>
    </div>
  );
}

import { Link } from "react-router-dom";
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

function DoorList({ doors }: { doors: Door[] }) {
  return (
    <ul className={styles.doorList}>
      {doors.map((door) => (
        <li key={door.to}>
          <Link to={door.to}>{door.label}</Link>
          <p>{door.blurb}</p>
        </li>
      ))}
    </ul>
  );
}

export function Home() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="kicker">The Treasury</div>
        <h1>Otzar Ha'Sofer</h1>
      </div>
      <p>
        <em>
          "The Scribe does not reveal destiny. The Scribe guides the neshama
          of the person seeking it."
        </em>
      </p>
      <p>
        This companion is a reference and a working tool for the Otzar
        Ha'Sofer practice — not a fortune-telling tool. Use it alongside the
        physical Mizbe'ach and Derekh Eretz deck: read the guide to learn the
        system, and use the living tools to conduct a reading and tend each
        participant's Herald over time.
      </p>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>The Reference Guide</div>
        <DoorList doors={guideDoors} />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>The Living Practice</div>
        <DoorList doors={practiceDoors} />
      </div>

      <hr className="hairline-rule" />
      <p>
        <Link to="/guide/foundations">Begin with the Foundations →</Link>
      </p>
    </div>
  );
}

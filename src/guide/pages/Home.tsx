import { Link } from "react-router-dom";
import { Card, DecoratedRule } from "../../components/ui";
import { guideLinks, practiceLinks, libraryLinks, type SiteLink } from "../../components/siteMap";
import { TodayPanel } from "./TodayPanel";
import styles from "./Home.module.css";

function DoorGrid({ doors }: { doors: SiteLink[] }) {
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
          <img
            className={styles.seal}
            src="scribe-seal.png"
            alt="The Scribe's Seal"
            width={640}
            height={640}
          />
        </div>
      </section>

      <TodayPanel />

      <DecoratedRule />

      <section className={styles.section}>
        <div className={styles.sectionTitle}>The Reference Guide</div>
        <DoorGrid doors={guideLinks} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>The Living Practice</div>
        <DoorGrid doors={practiceLinks} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>The Library</div>
        <DoorGrid doors={libraryLinks} />
      </section>
    </div>
  );
}

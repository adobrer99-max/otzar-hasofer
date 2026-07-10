import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

const columns = [
  {
    title: "The Guide",
    links: [
      { to: "/guide/foundations", label: "Foundations" },
      { to: "/guide/letters", label: "The Twenty-Two Letters" },
      { to: "/guide/sacred-time", label: "Sacred Time" },
      { to: "/guide/visual-canon", label: "Visual Canon" },
    ],
  },
  {
    title: "The Living Practice",
    links: [
      { to: "/herald", label: "The Herald" },
      { to: "/covenant", label: "The Covenant" },
      { to: "/sefarim", label: "The Sefarim" },
      { to: "/commentaries", label: "Commentaries" },
    ],
  },
  {
    title: "The Treasury",
    links: [
      { to: "/", label: "Home" },
      { to: "/account", label: "The Scribe's Seal" },
    ],
  },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.mast}>
          <div className={styles.wordmark}>אוצר הסופר</div>
          <p className={styles.epigraph}>
            The Scribe does not reveal destiny. The Scribe guides the neshama of the person
            seeking it — a companion to the physical Otzar Ha'Sofer, never a fortune-telling
            tool.
          </p>
        </div>
        <nav className={styles.columns} aria-label="Footer">
          {columns.map((col) => (
            <div key={col.title} className={styles.column}>
              <div className={styles.columnTitle}>{col.title}</div>
              {col.links.map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div className={styles.baseline}>Otzar Ha'Sofer — the Treasury of the Scribe.</div>
    </footer>
  );
}

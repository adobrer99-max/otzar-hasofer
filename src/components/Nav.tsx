import { NavLink } from "react-router-dom";
import styles from "./Nav.module.css";

const guideLinks = [
  { to: "/guide/foundations", label: "Foundations" },
  { to: "/guide/letters", label: "The Twenty-Two Letters" },
  { to: "/guide/mizbeach", label: "The Mizbe'ach" },
  { to: "/guide/scribe", label: "The Scribe" },
  { to: "/guide/sacred-time", label: "Sacred Time" },
  { to: "/guide/visual-canon", label: "Visual Canon" },
];

function linkClass({ isActive }: { isActive: boolean }) {
  return isActive ? styles.active : undefined;
}

export function Nav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brand}>
          אוצר הסופר
        </NavLink>
        <ul className={styles.links}>
          {guideLinks.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className={styles.heraldLink}>
          <NavLink to="/herald" className={linkClass}>
            The Herald
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

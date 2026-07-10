import { useEffect, useId, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ui/ThemeToggle";
import styles from "./Nav.module.css";

const guideLinks = [
  { to: "/guide/foundations", label: "Foundations" },
  { to: "/guide/letters", label: "The Twenty-Two Letters" },
  { to: "/guide/shoresh", label: "Shoresh" },
  { to: "/guide/dorot", label: "Derekh Ha'Dorot" },
  { to: "/guide/mizbeach", label: "The Mizbe'ach" },
  { to: "/guide/scribe", label: "The Scribe" },
  { to: "/guide/sacred-time", label: "Sacred Time" },
  { to: "/guide/encounters", label: "Seven Encounters" },
  { to: "/guide/visual-canon", label: "Visual Canon" },
];

const practiceLinks = [
  { to: "/herald", label: "The Herald" },
  { to: "/covenant", label: "The Covenant" },
  { to: "/sefarim", label: "The Sefarim" },
  { to: "/commentaries", label: "Commentaries" },
];

/** The top-level product surfaces shown directly in the desktop bar. */
const primaryLinks = practiceLinks.filter((l) => l.to !== "/covenant");

function linkClass({ isActive }: { isActive: boolean }) {
  return isActive ? styles.active : undefined;
}

/** The gold aleph-shield brand mark (the favicon motif, inline). */
function BrandMark() {
  return (
    <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true" className={styles.mark}>
      <path
        d="M2 3 L24 3 L24 17 C24 24 18 27 13 29 C8 27 2 24 2 17 Z"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
      <text
        x="13"
        y="20"
        textAnchor="middle"
        fontFamily="var(--font-hebrew)"
        fontSize="15"
        fill="var(--accent)"
      >
        א
      </text>
    </svg>
  );
}

function GuideDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const guideActive = location.pathname.startsWith("/guide");

  return (
    <div className={styles.dropdown} ref={ref}>
      <button
        type="button"
        className={`${styles.dropdownTrigger} ${guideActive ? styles.active : ""}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        The Guide
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className={styles.dropdownMenu} id={menuId} role="menu">
          {guideLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass} role="menuitem">
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();

  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <nav
        className={styles.drawer}
        aria-label="Primary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.drawerGroup}>
          <div className={styles.drawerGroupTitle}>The Guide</div>
          {guideLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className={styles.drawerGroup}>
          <div className={styles.drawerGroupTitle}>The Living Practice</div>
          {practiceLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className={styles.drawerGroup}>
          <NavLink to="/account" className={linkClass}>
            Account
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

export function Nav() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brand} end>
          <BrandMark />
          <span className={styles.wordmark}>אוצר הסופר</span>
        </NavLink>

        <nav className={styles.desktopNav} aria-label="Primary">
          <NavLink to="/" end className={linkClass}>
            The Treasury
          </NavLink>
          <GuideDropdown />
          {primaryLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <NavLink to="/account" className={`${styles.accountLink} ${styles.desktopOnly}`}>
            Account
          </NavLink>
          <ThemeToggle />
          <button
            type="button"
            className={styles.hamburger}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              {drawerOpen ? (
                <>
                  <line x1="5" y1="5" x2="19" y2="19" strokeLinecap="round" />
                  <line x1="19" y1="5" x2="5" y2="19" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" strokeLinecap="round" />
                  <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
                  <line x1="4" y1="17" x2="20" y2="17" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}

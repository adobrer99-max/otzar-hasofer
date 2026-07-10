import { useState } from "react";
import { getTheme, toggleTheme, type Theme } from "../../theme";
import styles from "./ui.module.css";

/** Flips between the charcoal (dark) field and the vellum (light) ground. */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document !== "undefined" ? getTheme() : "dark",
  );

  function handleToggle() {
    setThemeState(toggleTheme());
  }

  const goingTo = theme === "dark" ? "the vellum ground" : "the charcoal field";
  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={handleToggle}
      aria-label={`Switch to ${goingTo}`}
      title={`Switch to ${goingTo}`}
    >
      {theme === "dark" ? (
        // A sun — inviting the light ground.
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const r = (deg * Math.PI) / 180;
            const x1 = 12 + Math.cos(r) * 7;
            const y1 = 12 + Math.sin(r) * 7;
            const x2 = 12 + Math.cos(r) * 9.4;
            const y2 = 12 + Math.sin(r) * 9.4;
            return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} strokeLinecap="round" />;
          })}
        </svg>
      ) : (
        // A crescent moon — inviting the charcoal field.
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15.5 2.5a9.5 9.5 0 1 0 6 12 7.5 7.5 0 0 1-6-12z" />
        </svg>
      )}
    </button>
  );
}

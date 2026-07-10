/**
 * Theme runtime — the counterpart to the pre-paint bootstrap in index.html.
 * The bootstrap sets `data-theme` before first paint (from localStorage, else
 * the OS preference); this module reads and flips it at runtime and keeps the
 * `theme-color` meta in sync. Two themes: the charcoal "dark" field (default)
 * and the vellum "light" ground — both live inside the Visual Canon.
 */

export type Theme = "dark" | "light";

const STORAGE_KEY = "otzar-theme";
const THEME_COLORS: Record<Theme, string> = { dark: "#14171c", light: "#f4efe2" };

export function getTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private-mode / storage-disabled: the theme still applies for the session.
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[theme]);
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

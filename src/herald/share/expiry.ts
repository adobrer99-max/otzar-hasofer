/**
 * Share-link expiry presets and the plain-language lines the share panel
 * shows about a link's life: when it stops opening, and who has opened it.
 */

export type ExpiryPreset = "never" | "1d" | "7d" | "30d";

export const EXPIRY_PRESETS: { value: ExpiryPreset; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "1d", label: "In 1 day" },
  { value: "7d", label: "In 7 days" },
  { value: "30d", label: "In 30 days" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const PRESET_DAYS: Record<Exclude<ExpiryPreset, "never">, number> = { "1d": 1, "7d": 7, "30d": 30 };

/** The expiry instant a preset sets, counted from `now` (null = never). */
export function expiryFromPreset(preset: ExpiryPreset, now: Date = new Date()): string | null {
  if (preset === "never") return null;
  return new Date(now.getTime() + PRESET_DAYS[preset] * DAY_MS).toISOString();
}

export function isExpired(expiresAt: string | null, now: Date = new Date()): boolean {
  return expiresAt !== null && new Date(expiresAt).getTime() <= now.getTime();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function expiryLabel(expiresAt: string | null, now: Date = new Date()): string {
  if (expiresAt === null) return "Never expires";
  return isExpired(expiresAt, now) ? `Expired ${formatDate(expiresAt)}` : `Expires ${formatDate(expiresAt)}`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * DAY_MS],
  ["month", 30 * DAY_MS],
  ["week", 7 * DAY_MS],
  ["day", DAY_MS],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/** "5 minutes ago", "yesterday", "just now". */
export function formatAgo(iso: string, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of UNITS) {
    if (elapsed >= ms) return rtf.format(-Math.floor(elapsed / ms), unit);
  }
  return "just now";
}

export function viewsLabel(viewCount: number, lastViewedAt: string | null, now: Date = new Date()): string {
  if (viewCount === 0 || lastViewedAt === null) return "Not opened yet";
  const times = viewCount === 1 ? "Opened once" : `Opened ${viewCount} times`;
  return `${times} · last ${formatAgo(lastViewedAt, now)}`;
}

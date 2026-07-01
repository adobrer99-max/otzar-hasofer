import { ushpizin } from "./ushpizin";
import type { SefirahId } from "../types/letter";

/** The dominant-middah options for the Herald form, reusing the Ushpizin/Sefirah table. */
export const middot: { id: SefirahId; label: string }[] = ushpizin.map((entry) => ({
  id: entry.sefirah,
  label: `${entry.sefirahName} — ${entry.middah}`,
}));

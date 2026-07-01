export interface HeraldAccent {
  accentColor?: string;
  lockLetters?: boolean;
  forceMode?: "sefirot" | "standard";
  motif?: string;
}

export interface FestivalOverride {
  id: string;
  name: string;
  hebrewName?: string;
  description: string;
  ritualMechanic: string;
  heraldAccent?: HeraldAccent;
}

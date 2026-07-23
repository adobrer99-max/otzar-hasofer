/**
 * Mizrach — the direction of prayer, computed. A pure great-circle initial
 * bearing from any point on Earth toward Jerusalem, plus a 16-wind compass
 * name for reading it aloud. No dependencies; the folio's SVG Mizrach vector
 * stays a fixed symbol (the renderers are deterministic and export-frozen) —
 * this feeds the small live finder panel beside it.
 */

export const JERUSALEM = { lat: 31.7783, lon: 35.2354 };

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Initial great-circle bearing (degrees clockwise from true north, [0, 360))
 * from the given coordinates toward Jerusalem.
 */
export function bearingToJerusalem(lat: number, lon: number): number {
  const φ1 = toRad(lat);
  const φ2 = toRad(JERUSALEM.lat);
  const Δλ = toRad(JERUSALEM.lon - lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

const WINDS = [
  "north",
  "north-northeast",
  "northeast",
  "east-northeast",
  "east",
  "east-southeast",
  "southeast",
  "south-southeast",
  "south",
  "south-southwest",
  "southwest",
  "west-southwest",
  "west",
  "west-northwest",
  "northwest",
  "north-northwest",
];

/** The 16-wind compass name for a bearing in degrees. */
export function compassPoint(bearing: number): string {
  const normalized = ((bearing % 360) + 360) % 360;
  return WINDS[Math.round(normalized / 22.5) % 16];
}

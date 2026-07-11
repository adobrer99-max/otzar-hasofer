/**
 * The heraldic charge for each letter — a symbol language of the aleph-bet,
 * built from each letter's own ancient pictographic origin (proto-Sinaitic):
 * aleph the ox, bet the house, dalet the door, mem the water, ayin the eye,
 * shin the flame, tav the mark/cross, and so on. A Herald becomes a true coat
 * of arms assembled from the charges of the letters drawn.
 *
 * This is built up letter by letter. A letter with no charge yet renders its
 * enamelled letterform instead (see hasCharge / the renderer's fallback), so
 * the language can grow without ever leaving a blank on the shield.
 *
 * Each drawer paints in a local box centred on the origin, roughly ±45 units,
 * filled with the letter's own enamel and outlined in its shadow — the same
 * colour system as the glyphs. LetterCharge scales/positions it.
 */

type Drawer = (fill: string, stroke: string) => React.ReactNode;

const SW = 2.5; // local stroke width

const CHARGES: Record<string, Drawer> = {
  // aleph — the ox (ox-head caboshed): muzzle with two horns.
  aleph: (fill, stroke) => (
    <>
      <path
        d="M -20 -6 C -20 26, 20 26, 20 -6 C 20 -14, 12 -18, 0 -18 C -12 -18, -20 -14, -20 -6 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={SW}
      />
      <path d="M -18 -12 C -34 -22, -40 -40, -30 -44" fill="none" stroke={stroke} strokeWidth={SW * 1.6} strokeLinecap="round" />
      <path d="M 18 -12 C 34 -22, 40 -40, 30 -44" fill="none" stroke={stroke} strokeWidth={SW * 1.6} strokeLinecap="round" />
      <circle cx={-8} cy={2} r={2.5} fill={stroke} />
      <circle cx={8} cy={2} r={2.5} fill={stroke} />
    </>
  ),
  // bet — the house / tent.
  bet: (fill, stroke) => (
    <>
      <path d="M 0 -38 L 30 24 L -30 24 Z" fill={fill} stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M -9 24 L -9 2 Q 0 -8 9 2 L 9 24" fill="none" stroke={stroke} strokeWidth={SW} />
    </>
  ),
  // gimel — the foot / camel (pictograph "gimel" = foot, to walk): a foot.
  gimel: (fill, stroke) => (
    <>
      <path d="M -14 -34 H 2 V -6 H -14 Z" fill={fill} stroke={stroke} strokeWidth={SW} />
      <path
        d="M -22 22 L -22 -8 C -22 -14 -14 -14 -6 -14 L 12 -14 C 26 -14 36 -8 36 6 L 36 16 C 36 22 30 22 24 22 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
    </>
  ),
  // heh — "behold!" — a figure with arms raised (revelation, breath).
  heh: (fill) => (
    <>
      <circle cx={0} cy={-30} r={8} fill={fill} />
      <path
        d="M 0 -22 L 0 8 M 0 -14 L -18 -32 M 0 -14 L 18 -32 M 0 8 L -14 30 M 0 8 L 14 30"
        fill="none"
        stroke={fill}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  // dalet — the door (an arched opening).
  dalet: (fill, stroke) => (
    <>
      <path d="M -22 38 V -6 Q -22 -34 0 -34 Q 22 -34 22 -6 V 38 Z" fill={fill} stroke={stroke} strokeWidth={SW} />
      <path d="M -11 38 V -4 Q -11 -22 0 -22 Q 11 -22 11 -4 V 38" fill="none" stroke={stroke} strokeWidth={SW} opacity={0.7} />
    </>
  ),
  // vav — the nail / tent-peg.
  vav: (fill, stroke) => (
    <path
      d="M -11 -34 H 11 V -22 H 5 L 2 34 H -2 L -5 -22 H -11 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={SW}
      strokeLinejoin="round"
    />
  ),
  // zayin — the weapon / sword (point up).
  zayin: (fill, stroke) => (
    <>
      <path d="M 0 -44 L 5 6 L -5 6 Z" fill={fill} stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M -17 6 H 17 V 13 H -17 Z" fill={fill} stroke={stroke} strokeWidth={SW} />
      <path d="M -3 13 H 3 V 30 H -3 Z" fill={fill} stroke={stroke} strokeWidth={SW} />
      <circle cx={0} cy={35} r={5} fill={fill} stroke={stroke} strokeWidth={SW} />
    </>
  ),
  // chet — the wall / fence (embattled).
  chet: (fill, stroke) => (
    <path
      d="M -40 8 V -8 H -24 V 8 H -8 V -8 H 8 V 8 H 24 V -8 H 40 V 30 H -40 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={SW}
      strokeLinejoin="round"
    />
  ),
  // tet — the serpent (coiled) / basket: a snake nowed.
  tet: (fill, stroke) => (
    <>
      <path
        d="M 30 -6 C 30 -22 2 -26 -12 -14 C -24 -4 -18 14 -2 14 C 10 14 12 2 3 1 C -3 0 -3 8 1 8"
        fill="none"
        stroke={fill}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <path d="M 30 -6 L 40 -12 M 30 -6 L 40 0" fill="none" stroke={fill} strokeWidth={4} strokeLinecap="round" />
      <circle cx={30} cy={-6} r={2.4} fill={stroke} />
    </>
  ),
  // yod — the hand / arm (a small closed hand).
  yod: (fill, stroke) => (
    <path
      d="M -14 34 L -16 -2 C -18 -12, -6 -14, -6 -4 L -6 -20 C -6 -30, 6 -30, 6 -20 L 6 -6 C 6 -16, 18 -14, 16 -2 L 14 34 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={SW}
      strokeLinejoin="round"
    />
  ),
  // kaf — the open palm (appaumé): palm with fingers.
  kaf: (fill, stroke) => (
    <path
      d="M -18 36 L -18 -4 L -14 -4 L -14 -22 L -9 -22 L -9 -4 L -5 -4 L -5 -30 L 0 -30 L 0 -4 L 4 -4 L 4 -28 L 9 -28 L 9 -4 L 13 -4 L 13 -16 L 18 -16 L 18 36 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={SW}
      strokeLinejoin="round"
    />
  ),
  // lamed — the staff / shepherd's crook.
  lamed: (fill) => (
    <path
      d="M 2 40 L 2 -18 C 2 -36, 30 -36, 30 -14 C 30 -2, 14 -2, 16 -14"
      fill="none"
      stroke={fill}
      strokeWidth={9}
      strokeLinecap="round"
    />
  ),
  // mem — the water (a heraldic fountain: roundel barry-wavy).
  mem: (fill, stroke) => (
    <>
      <circle cx={0} cy={0} r={38} fill={fill} stroke={stroke} strokeWidth={SW} />
      {[-18, -6, 6, 18].map((y) => (
        <path
          key={y}
          d={`M -32 ${y} Q -16 ${y - 6} 0 ${y} T 32 ${y}`}
          fill="none"
          stroke={stroke}
          strokeWidth={SW}
          opacity={0.75}
        />
      ))}
    </>
  ),
  // nun — the fish (naiant).
  nun: (fill, stroke) => (
    <>
      <path d="M -32 0 Q -8 -18 20 0 Q -8 18 -32 0 Z" fill={fill} stroke={stroke} strokeWidth={SW} />
      <path d="M 18 0 L 38 -13 L 33 0 L 38 13 Z" fill={fill} stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
      <circle cx={-18} cy={-3} r={2.6} fill={stroke} />
    </>
  ),
  // samech — the prop / pillar (a column).
  samech: (fill, stroke) => (
    <>
      <path d="M -24 -38 H 24 V -28 H -24 Z" fill={fill} stroke={stroke} strokeWidth={SW} />
      <path d="M -15 -28 H 15 V 28 H -15 Z" fill={fill} stroke={stroke} strokeWidth={SW} />
      <path d="M -24 28 H 24 V 40 H -24 Z" fill={fill} stroke={stroke} strokeWidth={SW} />
    </>
  ),
  // ayin — the eye.
  ayin: (fill, stroke) => (
    <>
      <path d="M -40 0 Q 0 -24 40 0 Q 0 24 -40 0 Z" fill={fill} stroke={stroke} strokeWidth={SW} />
      <circle cx={0} cy={0} r={11} fill="none" stroke={stroke} strokeWidth={SW} />
      <circle cx={0} cy={0} r={4} fill={stroke} />
    </>
  ),
  // peh — the mouth (lips).
  peh: (fill, stroke) => (
    <>
      <path
        d="M -30 0 Q -16 -13 -3 -7 Q 0 -10 3 -7 Q 16 -13 30 0 Q 16 13 3 7 Q 0 9 -3 7 Q -16 13 -30 0 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <path d="M -26 0 Q 0 5 26 0" fill="none" stroke={stroke} strokeWidth={SW} />
    </>
  ),
  // tzadi — the fish-hook.
  tzadi: (fill) => (
    <>
      <path
        d="M 6 -40 L 6 8 C 6 28, -18 28, -18 8 C -18 -2, -8 -2, -8 6"
        fill="none"
        stroke={fill}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <path d="M 6 -40 L -2 -32 M 6 -40 L 14 -32" fill="none" stroke={fill} strokeWidth={5} strokeLinecap="round" />
    </>
  ),
  // kuf — the horizon / sun rising behind the hill.
  kuf: (fill, stroke) => (
    <>
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (-90 + (i * 180) / 6) * (Math.PI / 180);
        return (
          <line
            key={i}
            x1={Math.cos(a) * 26}
            y1={16 + Math.sin(a) * 26}
            x2={Math.cos(a) * 38}
            y2={16 + Math.sin(a) * 38}
            stroke={fill}
            strokeWidth={SW * 1.4}
            strokeLinecap="round"
          />
        );
      })}
      <path d="M -22 16 A 22 22 0 0 1 22 16 Z" fill={fill} stroke={stroke} strokeWidth={SW} />
      <line x1={-42} y1={16} x2={42} y2={16} stroke={fill} strokeWidth={SW * 1.6} strokeLinecap="round" />
    </>
  ),
  // resh — the head (a profile).
  resh: (fill, stroke) => (
    <path
      d="M -6 -36 C 16 -36, 24 -18, 22 -2 C 21 8, 26 8, 24 16 C 22 22, 14 20, 14 26 L 14 36 L -18 36 L -18 6 C -30 2, -30 -20, -14 -30 C -12 -34, -9 -36, -6 -36 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={SW}
      strokeLinejoin="round"
    />
  ),
  // shin — the teeth / flame (three flames of fire).
  shin: (fill, stroke) => (
    <>
      {[
        { cx: -20, h: 30 },
        { cx: 0, h: 44 },
        { cx: 20, h: 30 },
      ].map(({ cx, h }) => (
        <path
          key={cx}
          d={`M ${cx} 26 C ${cx - 12} 6, ${cx - 6} ${-h + 12} ${cx - 2} ${-h}
              C ${cx} ${-h + 8}, ${cx + 2} ${-h + 8}, ${cx + 4} ${-h + 14}
              C ${cx + 9} ${-h + 6}, ${cx + 12} 6, ${cx} 26 Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth={SW}
          strokeLinejoin="round"
        />
      ))}
    </>
  ),
  // tav — the mark / cross.
  tav: (fill, stroke) => (
    <path
      d="M -9 -40 H 9 V -9 H 40 V 9 H 9 V 40 H -9 V 9 H -40 V -9 H -9 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={SW}
      strokeLinejoin="round"
    />
  ),
};

export function hasCharge(letterId: string): boolean {
  return letterId in CHARGES;
}

/**
 * Renders a letter's heraldic charge centred at (x, y), scaled to `size`,
 * enamelled in the letter's own colour. Returns null when the letter has no
 * charge yet — callers fall back to the letterform.
 */
export function LetterCharge({
  letterId,
  size,
  x,
  y,
  fill,
  stroke,
  flip = false,
}: {
  letterId: string;
  size: number;
  x: number;
  y: number;
  fill: string;
  stroke: string;
  flip?: boolean;
}) {
  const draw = CHARGES[letterId];
  if (!draw) return null;
  const s = size / 96;
  return (
    <g
      data-charge={letterId}
      data-device="charge"
      transform={`translate(${x} ${y}) scale(${s})${flip ? " scale(1 -1)" : ""}`}
    >
      {draw(fill, stroke)}
    </g>
  );
}

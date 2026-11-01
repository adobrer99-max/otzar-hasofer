/**
 * Drawing a QR matrix as one SVG path. Dark modules on a light ground, always
 * — a code must stay scannable in the dark theme too — with each row's runs of
 * dark modules merged into a single rectangle so the path stays small.
 */

/** The path for every dark module, in module units. */
export function qrPath(matrix: boolean[][]): string {
  const parts: string[] = [];
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x += 1;
      const run = x - start;
      parts.push(`M${start} ${y}h${run}v1h-${run}z`);
    }
  });
  return parts.join("");
}

/** A standalone SVG document of the code, for download. */
export function qrSvgDocument(matrix: boolean[][], pixelsPerModule = 8): string {
  const size = matrix.length;
  const px = size * pixelsPerModule;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path d="${qrPath(matrix)}" fill="#000000"/>` +
    `</svg>`
  );
}

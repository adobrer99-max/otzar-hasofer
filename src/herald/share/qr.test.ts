import { describe, expect, it } from "vitest";
import { encode } from "uqr";
import { qrPath, qrSvgDocument } from "./qr";

describe("qrPath", () => {
  it("merges each row's dark runs into one rectangle", () => {
    const matrix = [
      [true, true, false, true],
      [false, false, false, false],
      [false, true, true, true],
    ];
    expect(qrPath(matrix)).toBe("M0 0h2v1h-2zM3 0h1v1h-1zM1 2h3v1h-3z");
  });

  it("draws nothing for an all-light matrix", () => {
    expect(qrPath([[false, false], [false, false]])).toBe("");
  });
});

describe("a share link's code", () => {
  const url = "https://otzar.example/#/shared/6f1c2a9e-3b4d-4e5f-8a7b-0c1d2e3f4a5b";
  const qr = encode(url, { ecc: "M", border: 4 });

  it("is a square of 4·version + 17 modules plus a four-module quiet zone", () => {
    expect(qr.size).toBe(4 * qr.version + 17 + 8);
    expect(qr.data).toHaveLength(qr.size);
    // The quiet zone is light on every side.
    expect(qr.data[0].every((m) => !m)).toBe(true);
    expect(qr.data[qr.size - 1].every((m) => !m)).toBe(true);
  });

  it("renders deterministically to a light-ground SVG document", () => {
    const doc = qrSvgDocument(qr.data);
    expect(doc).toBe(qrSvgDocument(encode(url, { ecc: "M", border: 4 }).data));
    expect(doc).toContain('fill="#ffffff"');
    expect(doc).toContain(`viewBox="0 0 ${qr.size} ${qr.size}"`);
  });
});

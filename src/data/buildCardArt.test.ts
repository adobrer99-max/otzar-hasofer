import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error — a plain .mjs build script, imported for its pure parts
import { collectArt, renderModule, SIZE_WARNING_BYTES } from "../../scripts/build-card-art.mjs";

let dir: string;
afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

function art(files: Record<string, string | Buffer>) {
  dir = mkdtempSync(join(tmpdir(), "card-art-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  return collectArt(dir);
}

describe("build-card-art", () => {
  it("registers images by folder and name, with a content hash", () => {
    const r = art({ "letters/aleph.jpg": "A", "dorot/abraham-1.webp": "B", "letters/notes.txt": "x" });
    expect(r.errors).toEqual([]);
    expect(r.entries.map((e: { id: string }) => e.id)).toEqual(["letter:aleph", "dorot:abraham-1"]);
    expect(r.entries[0].src).toMatch(/^\/art\/letters\/aleph\.jpg\?v=[0-9a-f]{8}$/);
  });

  it("changes the URL when the image changes", () => {
    const first = art({ "letters/aleph.jpg": "one" }).entries[0].src;
    rmSync(dir, { recursive: true, force: true });
    const second = art({ "letters/aleph.jpg": "two" }).entries[0].src;
    expect(first).not.toBe(second);
  });

  it("takes alt text and credits from art.json", () => {
    const r = art({
      "letters/bet.png": "B",
      "art.json": JSON.stringify({ "letter:bet": { alt: "Bet, the house", credit: "Illustrated by R." }, "letter:gimel": { alt: "x" } }),
    });
    expect(r.entries[0]).toMatchObject({ alt: "Bet, the house", credit: "Illustrated by R." });
    expect(r.warnings.join(" ")).toContain("letter:gimel");
  });

  it("refuses two images for one card, and skips badly named files", () => {
    const r = art({ "letters/aleph.jpg": "A", "letters/aleph.png": "B", "letters/Aleph Final.jpg": "C" });
    expect(r.errors.join(" ")).toContain("letter:aleph has two images");
    expect(r.warnings.join(" ")).toContain("Aleph Final.jpg");
  });

  it("warns about heavy images", () => {
    const r = art({ "letters/aleph.jpg": Buffer.alloc(SIZE_WARNING_BYTES + 1) });
    expect(r.warnings.join(" ")).toContain("KB");
  });

  it("copes with no art folder at all", () => {
    dir = mkdtempSync(join(tmpdir(), "card-art-"));
    expect(collectArt(join(dir, "missing"))).toEqual({ entries: [], errors: [], warnings: [] });
    expect(renderModule([])).toContain("export const shippedCardArt: ShippedArtEntry[] = [];");
  });
});

import { describe, it, expect } from "vitest";
import { guideLinks, practiceLinks, libraryLinks, homeLink, accountLink } from "./siteMap";

const all = [...guideLinks, ...practiceLinks, ...libraryLinks, homeLink, accountLink];

describe("siteMap", () => {
  it("has unique paths and labels across every cluster", () => {
    const paths = all.map((l) => l.to);
    const labels = all.map((l) => l.label);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("uses absolute in-app paths", () => {
    for (const l of all) {
      expect(l.to.startsWith("/")).toBe(true);
    }
  });

  it("keeps the guide cluster whole (all nine reference pages)", () => {
    expect(guideLinks).toHaveLength(9);
    expect(guideLinks.every((l) => l.to.startsWith("/guide/"))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { resolveSpread } from "./resolveSpread";

describe("resolveSpread", () => {
  it("replaces the triadic spread with the Etz Chaim draw on Tu Bishvat", () => {
    expect(resolveSpread("tubishvat")).toBe("etz-chaim");
  });

  it("unveils the anchor into the Yichud reading on Tu B'Av", () => {
    expect(resolveSpread("tubav")).toBe("yichud");
  });

  it("keeps the standard triadic spread on ordinary days and other festivals", () => {
    expect(resolveSpread("ordinary")).toBe("triadic");
    expect(resolveSpread("shabbat")).toBe("triadic");
    expect(resolveSpread("pesach")).toBe("triadic");
    expect(resolveSpread("tishabav")).toBe("triadic");
  });

  it("treats unknown festival ids as triadic", () => {
    expect(resolveSpread("some-future-festival")).toBe("triadic");
  });
});

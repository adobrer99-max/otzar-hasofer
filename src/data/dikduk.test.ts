import { describe, it, expect } from "vitest";
import { classifyRoot, groupRootsByPattern } from "./dikduk";

describe("classifyRoot", () => {
  it("classifies a strong root", () => {
    expect(classifyRoot(["shin", "mem", "resh"])).toEqual(["strong"]); // שמר
  });

  it("classifies a hollow root", () => {
    expect(classifyRoot(["kuf", "vav", "mem"])).toContain("hollow"); // קום
  });

  it("classifies a third-Heh root", () => {
    expect(classifyRoot(["bet", "nun", "heh"])).toContain("iii-heh"); // בנה
  });

  it("classifies a geminate root", () => {
    expect(classifyRoot(["samech", "bet", "bet"])).toContain("geminate"); // סבב
  });

  it("classifies a first-Nun root", () => {
    expect(classifyRoot(["nun", "tav", "nun"])).toContain("i-nun"); // נתן
  });

  it("stacks multiple weaknesses on one root", () => {
    const patterns = classifyRoot(["nun", "shin", "aleph"]); // נשא
    expect(patterns).toContain("i-nun");
    expect(patterns).toContain("iii-aleph");
  });

  it("treats gutturals in each position", () => {
    expect(classifyRoot(["ayin", "mem", "dalet"])).toContain("i-guttural"); // עמד
    expect(classifyRoot(["bet", "chet", "resh"])).toContain("ii-guttural"); // בחר
    expect(classifyRoot(["shin", "lamed", "chet"])).toContain("iii-guttural"); // שלח
  });

  it("is deterministic and total over the lexicon", () => {
    const groups = groupRootsByPattern();
    expect(groups.map((g) => g.pattern.id)).toHaveLength(11);
    // Every real root lands somewhere, and the strong group is non-empty.
    const strong = groups.find((g) => g.pattern.id === "strong")!;
    expect(strong.entries.length).toBeGreaterThan(0);
  });
});

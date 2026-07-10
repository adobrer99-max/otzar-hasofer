import { describe, it, expect } from "vitest";
import { sefarim, sefarimById } from "./sefarim";
import { subjectKeyFor } from "../types/commentary";
import { balaganSections } from "./balagan";

describe("the shelf of Sefarim", () => {
  it("has unique ids that all resolve", () => {
    const ids = new Set(sefarim.map((s) => s.id));
    expect(ids.size).toBe(sefarim.length);
    for (const s of sefarim) {
      expect(sefarimById[s.id]).toBe(s);
    }
  });

  it("gives every external-link spine a target and no other kind a target", () => {
    for (const s of sefarim) {
      if (s.kind === "external-link") {
        expect(s.target, s.id).toBeTruthy();
      } else {
        expect(s.target, s.id).toBeUndefined();
      }
    }
  });

  it("uses only known kinds and includes the five rich books + two link spines", () => {
    const known = new Set([
      "pardes-browse",
      "balagan",
      "explainer",
      "liturgy",
      "dikduk",
      "external-link",
      "forthcoming",
    ]);
    for (const s of sefarim) expect(known.has(s.kind), s.kind).toBe(true);
    expect(sefarim).toHaveLength(7);
    expect(sefarimById["hashorashim"].kind).toBe("pardes-browse");
    expect(sefarimById["balagan"].kind).toBe("balagan");
    expect(sefarimById["vocabulary-treasury"].kind).toBe("explainer");
    expect(sefarimById["hatefillot"].kind).toBe("liturgy");
    expect(sefarimById["hadikduk"].kind).toBe("dikduk");
  });
});

describe("subjectKeyFor — balagan", () => {
  it("keys each Balagan category distinctly under the balagan namespace", () => {
    const keys = balaganSections.map((s) => subjectKeyFor({ kind: "balagan", category: s.category }));
    expect(new Set(keys).size).toBe(balaganSections.length);
    expect(keys.every((k) => k.startsWith("balagan:"))).toBe(true);
    expect(subjectKeyFor({ kind: "balagan", category: "corrections" })).toBe("balagan:corrections");
  });
});

describe("subjectKeyFor — liturgy", () => {
  it("keys liturgies under the liturgy namespace by stable id", () => {
    expect(subjectKeyFor({ kind: "liturgy", liturgyId: "havdalah" })).toBe("liturgy:havdalah");
  });
});

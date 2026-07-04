import { describe, it, expect } from "vitest";
import { resolveDorotMechanic } from "./dorotMechanics";

describe("resolveDorotMechanic", () => {
  it("forces the beneath draws on Tisha B'Av regardless of geography", () => {
    expect(resolveDorotMechanic("tishabav", "land")).toEqual({
      beneath: "forced-tishabav",
      council: false,
    });
    expect(resolveDorotMechanic("tishabav", "galut")).toEqual({
      beneath: "forced-tishabav",
      council: false,
    });
  });

  it("invites the beneath draws in Galut on an ordinary day", () => {
    expect(resolveDorotMechanic("ordinary", "galut")).toEqual({ beneath: "galut", council: false });
  });

  it("applies no mechanic on an ordinary day in the Land", () => {
    expect(resolveDorotMechanic("ordinary", "land")).toEqual({ beneath: "none", council: false });
  });

  it("adds the Council of Sefirot on Sukkot, combining with Galut", () => {
    expect(resolveDorotMechanic("sukkot", "land")).toEqual({ beneath: "none", council: true });
    expect(resolveDorotMechanic("sukkot", "galut")).toEqual({ beneath: "galut", council: true });
  });
});

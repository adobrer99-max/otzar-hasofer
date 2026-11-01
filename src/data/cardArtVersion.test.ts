import { describe, expect, it, vi } from "vitest";
import { bumpCardArt, getCardArtVersion, subscribeCardArt } from "./cardArtVersion";

describe("cardArtVersion", () => {
  it("advances the version and notifies subscribers on each bump", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCardArt(listener);
    const before = getCardArtVersion();
    bumpCardArt();
    bumpCardArt();
    expect(getCardArtVersion()).toBe(before + 2);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    bumpCardArt();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

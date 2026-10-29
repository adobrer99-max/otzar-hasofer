import { describe, expect, it } from "vitest";
import { expiryFromPreset, expiryLabel, formatAgo, isExpired, viewsLabel } from "./expiry";

const NOW = new Date("2026-10-29T12:00:00Z");

describe("share expiry", () => {
  it("counts presets forward from now, and 'never' is null", () => {
    expect(expiryFromPreset("never", NOW)).toBeNull();
    expect(expiryFromPreset("1d", NOW)).toBe("2026-10-30T12:00:00.000Z");
    expect(expiryFromPreset("7d", NOW)).toBe("2026-11-05T12:00:00.000Z");
    expect(expiryFromPreset("30d", NOW)).toBe("2026-11-28T12:00:00.000Z");
  });

  it("knows when a link has expired", () => {
    expect(isExpired(null, NOW)).toBe(false);
    expect(isExpired("2026-10-30T00:00:00Z", NOW)).toBe(false);
    expect(isExpired("2026-10-29T12:00:00Z", NOW)).toBe(true);
    expect(isExpired("2026-10-01T00:00:00Z", NOW)).toBe(true);
  });

  it("labels the link's life in plain words", () => {
    expect(expiryLabel(null, NOW)).toBe("Never expires");
    expect(expiryLabel("2026-11-05T12:00:00Z", NOW)).toMatch(/^Expires .*2026/);
    expect(expiryLabel("2026-10-01T00:00:00Z", NOW)).toMatch(/^Expired .*2026/);
  });
});

describe("share views", () => {
  it("says when nobody has opened the link", () => {
    expect(viewsLabel(0, null, NOW)).toBe("Not opened yet");
  });

  it("counts opens and says how long ago the last was", () => {
    expect(viewsLabel(1, "2026-10-29T11:55:00Z", NOW)).toBe("Opened once · last 5 minutes ago");
    expect(viewsLabel(3, "2026-10-27T12:00:00Z", NOW)).toBe("Opened 3 times · last 2 days ago");
  });

  it("formats elapsed time from just now to years", () => {
    expect(formatAgo("2026-10-29T11:59:40Z", NOW)).toBe("just now");
    expect(formatAgo("2026-10-29T09:00:00Z", NOW)).toBe("3 hours ago");
    expect(formatAgo("2026-10-28T12:00:00Z", NOW)).toBe("yesterday");
    expect(formatAgo("2025-10-01T00:00:00Z", NOW)).toBe("last year");
  });
});

import { describe, expect, it } from "vitest";
import { classifySharedFetch, isShareToken, toShareInfo } from "./shares";

describe("classifySharedFetch", () => {
  const payload = { displayName: "Miriam" };

  it("returns the payload when the RPC finds a live share", () => {
    expect(classifySharedFetch({ data: payload, error: null, status: 200 })).toEqual({
      kind: "found",
      payload,
    });
  });

  it("reads an empty result (revoked, expired, unknown) as missing", () => {
    expect(classifySharedFetch({ data: null, error: null, status: 200 })).toEqual({ kind: "missing" });
  });

  it("reads a client-side rejection (malformed token) as missing", () => {
    expect(
      classifySharedFetch({ data: null, error: { message: "invalid input syntax for type uuid" }, status: 400 }),
    ).toEqual({ kind: "missing" });
  });

  it("reads a fetch that never completed, or a server fault, as an error", () => {
    expect(
      classifySharedFetch({ data: null, error: { message: "TypeError: Failed to fetch" }, status: 0 }),
    ).toEqual({ kind: "error" });
    expect(classifySharedFetch({ data: null, error: { message: "upstream" }, status: 503 })).toEqual({
      kind: "error",
    });
  });
});

describe("isShareToken", () => {
  it("accepts a uuid and rejects anything else", () => {
    expect(isShareToken("6f1c2a9e-3b4d-4e5f-8a7b-0c1d2e3f4a5b")).toBe(true);
    expect(isShareToken("not-a-token")).toBe(false);
    expect(isShareToken("")).toBe(false);
  });
});

describe("toShareInfo", () => {
  it("maps a full row", () => {
    expect(
      toShareInfo({
        token: "t",
        updated_at: "2026-10-01T00:00:00Z",
        created_at: "2026-09-01T00:00:00Z",
        expires_at: "2026-11-01T00:00:00Z",
        last_viewed_at: "2026-10-20T00:00:00Z",
        view_count: 4,
      }),
    ).toEqual({
      token: "t",
      updatedAt: "2026-10-01T00:00:00Z",
      createdAt: "2026-09-01T00:00:00Z",
      expiresAt: "2026-11-01T00:00:00Z",
      lastViewedAt: "2026-10-20T00:00:00Z",
      viewCount: 4,
      legacy: false,
    });
  });

  it("defaults the expiry and view fields for a database without them", () => {
    expect(toShareInfo({ token: "t", updated_at: "2026-10-01T00:00:00Z" }, true)).toEqual({
      token: "t",
      updatedAt: "2026-10-01T00:00:00Z",
      createdAt: undefined,
      expiresAt: null,
      lastViewedAt: null,
      viewCount: 0,
      legacy: true,
    });
  });
});

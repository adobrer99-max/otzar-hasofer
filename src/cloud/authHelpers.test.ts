import { describe, it, expect } from "vitest";
import {
  validateNewPassword,
  mapAuthError,
  isAlreadyRegistered,
  MIN_PASSWORD_LENGTH,
} from "./authHelpers";

describe("validateNewPassword", () => {
  it("rejects passwords shorter than the minimum", () => {
    expect(validateNewPassword("short", "short")).toMatch(String(MIN_PASSWORD_LENGTH));
  });
  it("rejects mismatched confirmation", () => {
    expect(validateNewPassword("longenough1", "longenough2")).toMatch(/match/);
  });
  it("accepts a valid matching pair", () => {
    expect(validateNewPassword("longenough1", "longenough1")).toBeNull();
  });
});

describe("mapAuthError", () => {
  it("maps invalid credentials", () => {
    expect(mapAuthError("Invalid login credentials")).toMatch(/don't match a Scribe/);
  });
  it("maps unconfirmed email", () => {
    expect(mapAuthError("Email not confirmed")).toMatch(/verified/);
  });
  it("maps already-registered", () => {
    expect(mapAuthError("User already registered")).toMatch(/already exists/);
  });
  it("maps rate limiting", () => {
    expect(mapAuthError("Request rate limit reached")).toMatch(/wait a little/);
  });
  it("maps the short-password server error", () => {
    expect(mapAuthError("Password should be at least 6 characters")).toMatch(
      String(MIN_PASSWORD_LENGTH),
    );
  });
  it("passes unknown messages through and covers the empty case", () => {
    expect(mapAuthError("Strange new failure")).toBe("Strange new failure");
    expect(mapAuthError("")).toMatch(/usable locally/);
    expect(mapAuthError(undefined)).toMatch(/usable locally/);
  });
});

describe("isAlreadyRegistered", () => {
  it("detects the empty-identities signUp quirk", () => {
    expect(isAlreadyRegistered({ identities: [] })).toBe(true);
    expect(isAlreadyRegistered({ identities: [{}] })).toBe(false);
    expect(isAlreadyRegistered(null)).toBe(false);
    expect(isAlreadyRegistered({ identities: null })).toBe(true);
  });
});

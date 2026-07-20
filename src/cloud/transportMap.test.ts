import { describe, it, expect } from "vitest";
import { REMOTE_TABLES, SYNC_STORES, OWNER_COMPOSITE_STORES } from "./transport";

describe("transport store map", () => {
  it("maps contentDrafts to its composite-key table", () => {
    expect(REMOTE_TABLES.contentDrafts).toBe("content_drafts");
    expect(SYNC_STORES).toContain("contentDrafts");
  });
  it("every composite store is a real sync store", () => {
    for (const store of OWNER_COMPOSITE_STORES) {
      expect(SYNC_STORES).toContain(store);
    }
  });
});

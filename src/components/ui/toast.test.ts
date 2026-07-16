import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toast, subscribeToasts, dismissToast, type ToastItem } from "./toast";

describe("toast store", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("notifies subscribers when a toast is raised, then removes it after the duration", () => {
    let seen: ToastItem[] = [];
    const unsub = subscribeToasts((items) => (seen = items));
    expect(seen).toEqual([]);

    toast("Saved", { duration: 1000 });
    expect(seen).toHaveLength(1);
    expect(seen[0].message).toBe("Saved");
    expect(seen[0].tone).toBe("info");

    vi.advanceTimersByTime(1000);
    expect(seen).toHaveLength(0);
    unsub();
  });

  it("carries the given tone and supports manual dismissal", () => {
    let seen: ToastItem[] = [];
    const unsub = subscribeToasts((items) => (seen = items));
    const id = toast("Boom", { tone: "error", duration: 0 }); // duration 0 → no auto-dismiss
    expect(seen[0].tone).toBe("error");
    dismissToast(id);
    expect(seen).toHaveLength(0);
    unsub();
  });

  it("stacks multiple toasts and dismisses each on its own timer", () => {
    let seen: ToastItem[] = [];
    const unsub = subscribeToasts((items) => (seen = items));
    toast("first", { duration: 500 });
    toast("second", { duration: 1500 });
    expect(seen.map((t) => t.message)).toEqual(["first", "second"]);
    vi.advanceTimersByTime(500);
    expect(seen.map((t) => t.message)).toEqual(["second"]);
    vi.advanceTimersByTime(1000);
    expect(seen).toHaveLength(0);
    unsub();
  });

  it("stops notifying after unsubscribe", () => {
    let count = 0;
    const unsub = subscribeToasts(() => count++);
    const after = count;
    unsub();
    toast("ignored", { duration: 0 });
    expect(count).toBe(after);
  });
});

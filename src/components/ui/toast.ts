/**
 * A tiny, framework-agnostic toast store. Call `toast(...)` from any event
 * handler; the single <Toaster/> mounted in App subscribes and renders. No
 * context threading — the store is a module singleton, so lazy-loaded pages
 * can raise a toast without a provider above them.
 */

export type ToastTone = "info" | "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const DEFAULT_DURATION = 2600;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
  for (const listener of listeners) listener(items);
}

/** Subscribe to the toast list; returns an unsubscribe function. */
export function subscribeToasts(listener: (items: ToastItem[]) => void): () => void {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

/** Remove a toast by id (also called on click-to-dismiss). */
export function dismissToast(id: number) {
  const next = items.filter((t) => t.id !== id);
  if (next.length !== items.length) {
    items = next;
    emit();
  }
}

/** Raise a toast. Auto-dismisses after `duration` ms (default ~2.6s). */
export function toast(
  message: string,
  opts?: { tone?: ToastTone; duration?: number },
): number {
  const id = nextId++;
  items = [...items, { id, message, tone: opts?.tone ?? "info" }];
  emit();
  const duration = opts?.duration ?? DEFAULT_DURATION;
  if (duration > 0 && typeof setTimeout === "function") {
    setTimeout(() => dismissToast(id), duration);
  }
  return id;
}

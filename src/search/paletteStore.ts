/**
 * The command-palette open/closed state, held in a tiny module singleton
 * (mirroring components/ui/toast.ts) so both the global ⌘K/Ctrl-K hotkey and
 * the nav search button drive the same palette without prop-drilling or a
 * context provider above them.
 */

let open = false;
const listeners = new Set<(open: boolean) => void>();

function emit() {
  for (const listener of listeners) listener(open);
}

/** Subscribe to open-state changes; returns an unsubscribe function. */
export function subscribePalette(listener: (open: boolean) => void): () => void {
  listeners.add(listener);
  listener(open);
  return () => {
    listeners.delete(listener);
  };
}

export function openPalette() {
  if (!open) {
    open = true;
    emit();
  }
}

export function closePalette() {
  if (open) {
    open = false;
    emit();
  }
}

export function togglePalette() {
  open = !open;
  emit();
}

export function isPaletteOpen(): boolean {
  return open;
}

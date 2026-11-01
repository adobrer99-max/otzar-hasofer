import { useSyncExternalStore } from "react";

/**
 * The browser's network status as a hook — the one shared reading of
 * `navigator.onLine` for every cloud surface, so "offline" is told apart from
 * "signed out" or "nothing published". `onLine === false` is reliable;
 * `true` only means a network interface is up, so a cloud call can still fail
 * and callers keep their own error handling.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

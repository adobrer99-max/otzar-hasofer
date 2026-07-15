import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import { router } from "./router";
import { initCloudSync } from "./cloud/orchestrator";
import { listDrafts } from "./storage/contentDraftsRepo";
import { applyContentOverrides } from "./scriptorium/applyOverrides";

// Inert when the deployment has no cloud configured.
initCloudSync();

// A code-split route chunk failed to load — almost always because a new deploy
// renamed the hashed chunks while this page was still open on the old build, so
// the old chunk name now 404s ("Failed to fetch dynamically imported module").
// Reload once to fetch the fresh index.html + current chunk names. Guarded by a
// short sessionStorage cooldown so a genuinely-missing asset can't loop.
window.addEventListener("vite:preloadError", (event) => {
  const KEY = "otz-chunk-reload-at";
  const last = Number(sessionStorage.getItem(KEY) ?? "0");
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    event.preventDefault(); // stop Vite from re-throwing before we reload
    window.location.reload();
  }
});

function renderApp() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

// Apply any Scriptorium content edits (saved locally) onto the in-memory
// datasets before first render, so an author's edits are live across the whole
// app — not only in the studio's preview. A read failure still renders the
// shipped defaults; the theme pre-paint in index.html is unaffected.
listDrafts().then(applyContentOverrides).catch(() => {}).finally(renderApp);

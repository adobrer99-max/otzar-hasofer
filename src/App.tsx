import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { RouteFallback, Toaster } from "./components/ui";
import { CommandPalette } from "./search/CommandPalette";

function App() {
  // Keyed on pathname (not search/hash) so each real navigation replays the
  // gentle enter transition; query-only changes (e.g. the Herald scrubber)
  // don't re-animate. Neutralized under prefers-reduced-motion.
  const { pathname } = useLocation();
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main" className="otz-page" style={{ flex: 1 }}>
        {/* The illuminated plate — every routed surface is framed as one lit,
            gold-filletted document on the softly lit ground. */}
        <div className="otz-panel">
          <Suspense fallback={<RouteFallback />}>
            <div key={pathname} className="route-enter">
              <Outlet />
            </div>
          </Suspense>
        </div>
      </main>
      <Footer />
      <Toaster />
      <CommandPalette />
    </>
  );
}

export default App;

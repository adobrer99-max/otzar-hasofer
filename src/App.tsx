import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";

function App() {
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
          <Suspense fallback={<div className="route-fallback" aria-live="polite">Loading…</div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default App;

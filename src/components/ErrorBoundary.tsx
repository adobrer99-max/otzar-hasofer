import { Component, type ErrorInfo, type ReactNode } from "react";
import { useRouteError } from "react-router-dom";
import { Button, EmptyState } from "./ui";
import { classifyRouteError } from "./routeErrors";

/**
 * What a reader sees when a page fails to render: a failed chunk (offline, or
 * a deploy renamed the files under an open tab) asks for a reload; any other
 * fault offers a reload or the way home. The rest of the app stays standing.
 */
export function RouteErrorPanel({ error }: { error: unknown }) {
  const chunk = classifyRouteError(error) === "chunk";
  return (
    <div role="alert">
      <EmptyState
        title={chunk ? "This page couldn't load" : "Something went wrong on this page"}
        description={
          chunk
            ? "Part of the app didn't arrive — you may be offline, or a new version was just published. Reloading usually fixes it."
            : "Your saved work is safe on this device. Reload to try again, or return home."
        }
        action={
          <span style={{ display: "inline-flex", gap: "var(--space-2)", flexWrap: "wrap", justifyContent: "center" }}>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                window.location.hash = "#/";
              }}
            >
              Return home
            </Button>
          </span>
        }
      />
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  /** Changing this (the route's pathname) clears a caught error. */
  resetKey: string;
}

interface BoundaryState {
  error: unknown;
  failedKey: string | null;
}

/** Catches a render fault inside the routed page so the nav and footer survive. */
export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, failedKey: null };

  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    // Navigating away from the broken page clears the fault.
    if (state.failedKey !== null && props.resetKey !== state.failedKey) {
      return { error: null, failedKey: null };
    }
    return null;
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.setState({ failedKey: this.props.resetKey });
    console.error("Page render failed", error, info.componentStack);
  }

  render() {
    if (this.state.error !== null) return <RouteErrorPanel error={this.state.error} />;
    return this.props.children;
  }
}

/** The router's last-resort `errorElement`, for faults above the page (the frame itself). */
export function RouteErrorElement() {
  const error = useRouteError();
  return (
    <main id="main" className="otz-page">
      <div className="otz-panel">
        <RouteErrorPanel error={error} />
      </div>
    </main>
  );
}

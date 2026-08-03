import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { RouteFallback } from "../components/ui";
import styles from "./GameShell.module.css";

/**
 * **The window belongs to the game.**
 *
 * Every other route in the Treasury is a lit document on a soft ground: `App`
 * frames it with the nav, the gold-filletted `otz-panel` and the footer, and
 * that is right for a page you *read*. Ma'alot is not read. It was sitting
 * inside that frame with a page header, a lede, a collapsed prologue, a
 * complete keyboard reference and a ten-row Sefirot table stacked above it —
 * about three and a half thousand pixels of documentation before anything
 * playable, and the Begin button somewhere in the middle of it.
 *
 * So this route steps outside the frame. `fixed` rather than tall: the page
 * itself never scrolls, because a game that scrolls out from under you is not
 * one surface but two. Anything that needs room — a plate, the map, the pause
 * menu — scrolls inside itself.
 *
 * The way back to the Treasury is a corner link, and the nav is one click away
 * through it. That is the whole cost of leaving the frame, and it buys a game
 * that opens on itself.
 */
export function GameShell() {
  return (
    <div className={styles.shell}>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

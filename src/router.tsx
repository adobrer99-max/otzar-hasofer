import { createHashRouter } from "react-router-dom";
import App from "./App";
import { Home } from "./guide/pages/Home";
import { Foundations } from "./guide/pages/Foundations";
import { LettersIndex } from "./guide/pages/LettersIndex";
import { LetterChapter } from "./guide/pages/LetterChapter";
import { Shoresh } from "./guide/pages/Shoresh";
import { Mizbeach } from "./guide/pages/Mizbeach";
import { Scribe } from "./guide/pages/Scribe";
import { SacredTime } from "./guide/pages/SacredTime";
import { Encounters } from "./guide/pages/Encounters";
import { VisualCanon } from "./guide/pages/VisualCanon";
import { HeraldPage } from "./herald/HeraldPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "guide/foundations", element: <Foundations /> },
      { path: "guide/letters", element: <LettersIndex /> },
      { path: "guide/letters/:id", element: <LetterChapter /> },
      { path: "guide/shoresh", element: <Shoresh /> },
      { path: "guide/mizbeach", element: <Mizbeach /> },
      { path: "guide/scribe", element: <Scribe /> },
      { path: "guide/sacred-time", element: <SacredTime /> },
      { path: "guide/encounters", element: <Encounters /> },
      { path: "guide/visual-canon", element: <VisualCanon /> },
      { path: "herald", element: <HeraldPage /> },
    ],
  },
]);

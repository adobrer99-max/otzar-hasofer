import { createHashRouter } from "react-router-dom";
import App from "./App";
import { Home } from "./guide/pages/Home";
import { Foundations } from "./guide/pages/Foundations";
import { LettersIndex } from "./guide/pages/LettersIndex";
import { LetterChapter } from "./guide/pages/LetterChapter";
import { Shoresh } from "./guide/pages/Shoresh";
import { Dorot } from "./guide/pages/Dorot";
import { DorotHouse } from "./guide/pages/DorotHouse";
import { Mizbeach } from "./guide/pages/Mizbeach";
import { Scribe } from "./guide/pages/Scribe";
import { SacredTime } from "./guide/pages/SacredTime";
import { Encounters } from "./guide/pages/Encounters";
import { VisualCanon } from "./guide/pages/VisualCanon";
import { HeraldPage } from "./herald/HeraldPage";
import { CovenantPage } from "./herald/covenant/CovenantPage";
import { MizbeachToolPage } from "./mizbeach/MizbeachToolPage";
import { CommentariesPage } from "./commentaries/CommentariesPage";
import { LibraryPage } from "./library/LibraryPage";
import { SeferPage } from "./library/SeferPage";
import { AccountPage } from "./cloud/AccountPage";
import { NotFound } from "./guide/pages/NotFound";

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
      { path: "guide/dorot", element: <Dorot /> },
      { path: "guide/dorot/:houseId", element: <DorotHouse /> },
      { path: "guide/mizbeach", element: <Mizbeach /> },
      { path: "guide/scribe", element: <Scribe /> },
      { path: "guide/sacred-time", element: <SacredTime /> },
      { path: "guide/encounters", element: <Encounters /> },
      { path: "guide/visual-canon", element: <VisualCanon /> },
      { path: "herald", element: <HeraldPage /> },
      { path: "mizbeach", element: <MizbeachToolPage /> },
      { path: "covenant", element: <CovenantPage /> },
      { path: "commentaries", element: <CommentariesPage /> },
      { path: "sefarim", element: <LibraryPage /> },
      { path: "sefarim/:id/:entryId?", element: <SeferPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

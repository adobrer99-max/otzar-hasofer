import { lazy, type ComponentType } from "react";
import { createHashRouter } from "react-router-dom";
import App from "./App";
import { Home } from "./guide/pages/Home";
import { NotFound } from "./guide/pages/NotFound";

// The Home landing and the 404 stay eager so the first paint and unknown paths
// are instant. Every other route is code-split, so heavy modules — above all the
// ~1.1 MB Shoresh lexicon pulled in by the Herald/Mizbe'ach/Library routes —
// load on demand instead of in the initial bundle. (Named exports are mapped to
// the default the lazy loader expects.)
const lazyPage = <M extends Record<string, ComponentType>>(
  loader: () => Promise<M>,
  name: keyof M,
) => lazy(() => loader().then((m) => ({ default: m[name] })));

const Foundations = lazyPage(() => import("./guide/pages/Foundations"), "Foundations");
const LettersIndex = lazyPage(() => import("./guide/pages/LettersIndex"), "LettersIndex");
const LetterChapter = lazyPage(() => import("./guide/pages/LetterChapter"), "LetterChapter");
const Shoresh = lazyPage(() => import("./guide/pages/Shoresh"), "Shoresh");
const Dorot = lazyPage(() => import("./guide/pages/Dorot"), "Dorot");
const DorotHouse = lazyPage(() => import("./guide/pages/DorotHouse"), "DorotHouse");
const Mizbeach = lazyPage(() => import("./guide/pages/Mizbeach"), "Mizbeach");
const Scribe = lazyPage(() => import("./guide/pages/Scribe"), "Scribe");
const SacredTime = lazyPage(() => import("./guide/pages/SacredTime"), "SacredTime");
const Encounters = lazyPage(() => import("./guide/pages/Encounters"), "Encounters");
const VisualCanon = lazyPage(() => import("./guide/pages/VisualCanon"), "VisualCanon");
const StylesheetPreview = lazyPage(() => import("./guide/pages/StylesheetPreview"), "StylesheetPreview");
const HeraldPage = lazyPage(() => import("./herald/HeraldPage"), "HeraldPage");
const CovenantPage = lazyPage(() => import("./herald/covenant/CovenantPage"), "CovenantPage");
const MizbeachToolPage = lazyPage(() => import("./mizbeach/MizbeachToolPage"), "MizbeachToolPage");
const CommentariesPage = lazyPage(() => import("./commentaries/CommentariesPage"), "CommentariesPage");
const LibraryPage = lazyPage(() => import("./library/LibraryPage"), "LibraryPage");
const SeferPage = lazyPage(() => import("./library/SeferPage"), "SeferPage");
const AccountPage = lazyPage(() => import("./cloud/AccountPage"), "AccountPage");
// Unlinked drafting studio — reachable by URL only, deliberately absent from the nav.
const ScriptoriumPage = lazyPage(() => import("./scriptorium/ScriptoriumPage"), "ScriptoriumPage");
// Public, read-only shared Herald — reached only by its tokenized URL.
const SharedHeraldPage = lazyPage(() => import("./herald/share/SharedHeraldPage"), "SharedHeraldPage");

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
      { path: "guide/stylesheet-preview", element: <StylesheetPreview /> },
      { path: "herald", element: <HeraldPage /> },
      { path: "mizbeach", element: <MizbeachToolPage /> },
      { path: "covenant", element: <CovenantPage /> },
      { path: "commentaries", element: <CommentariesPage /> },
      { path: "sefarim", element: <LibraryPage /> },
      { path: "sefarim/:id/:entryId?", element: <SeferPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "scriptorium", element: <ScriptoriumPage /> },
      { path: "shared/:token", element: <SharedHeraldPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

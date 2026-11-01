// Set the theme before first paint so there is no flash. Saved choice wins;
// otherwise follow the OS preference. Default is the charcoal dark.
// Loaded as a classic blocking script from index.html — kept out of line
// because the site's Content-Security-Policy (script-src 'self') forbids
// inline scripts.
(function () {
  try {
    var saved = localStorage.getItem("otzar-theme");
    var prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    var theme = saved || (prefersLight ? "light" : "dark");
    document.documentElement.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4efe2" : "#14171c");
  } catch {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();

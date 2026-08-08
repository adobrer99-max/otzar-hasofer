import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * **Every custom property this project uses is one it defines.**
 *
 * A `var(--name)` that names nothing is not an error anywhere in the toolchain.
 * The browser drops the whole declaration and paints what it would have painted
 * without it; `tsc -b` never sees CSS; Vite's modules pipeline passes it
 * through; `oxlint` does not parse stylesheets. So four tokens went undefined
 * and **twenty-six declarations across three files did nothing at all** —
 * borders that were not drawn, a form field with no fill, and twenty colours
 * that quietly inherited body text, which flattened the game's whole gold /
 * ink / muted hierarchy into one weight. It was found by adding a border to a
 * new control and watching the border not appear.
 *
 * The check itself is four lines. What is worth writing down is the two ways a
 * naive version of it is wrong, because the hand audit that found the bug got
 * both wrong and reported three false positives — including a claim that the
 * Tree of Life map's own colours were broken, which they never were:
 *
 * 1. **A fallback is legitimate.** `var(--font-display, var(--font-latin))`
 *    names a token that does not exist *on purpose* — it is how you say "this
 *    face if the theme ever defines one, otherwise the Latin face". A hundred
 *    and twelve usages in this repo depend on it. Only a bare `var(--x)` can be
 *    dead.
 * 2. **A token may be defined anywhere, not only at `:root`.** The Tree map
 *    mixes `--bark`, `--bark-lit` and `--leaf` from the theme's accent on
 *    `.overworldInner`, so that the wood follows the palette instead of being a
 *    hardcoded brown that would fight four of the six festival accents. Read
 *    from outside that element they look undefined, and they are perfectly
 *    defined where they are used.
 *
 * Two things are deliberately *not* asserted. `design/otzar.css` is a handoff
 * copy that nothing imports, so it is out of scope. And a token defined and not
 * yet used — there is one, `--font-size-xxl` — is a spare rather than a fault:
 * a design system is allowed a vocabulary wider than today's callers.
 */

const ROOT = new URL("../..", import.meta.url).pathname;

function stylesheets(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...stylesheets(path));
    else if (entry.name.endsWith(".css")) found.push(path);
  }
  return found;
}

/** Every `--name:` declaration, wherever it stands — `:root`, or any selector. */
const DEFINES = /(?:^|[{;\s])(--[a-z0-9-]+)\s*:/gi;
/**
 * A bare `var(--name)` — no fallback. The closing paren immediately after the
 * name is the whole of what makes this the *dead* case rather than the
 * deliberate one.
 */
const USES = /var\(\s*(--[a-z0-9-]+)\s*\)/gi;

const SHEETS = stylesheets(join(ROOT, "src")).sort();

describe("the design tokens", () => {
  it("finds the stylesheets to check at all", () => {
    // A sweep that silently reads nothing passes forever. This is the guard on
    // the guard.
    expect(SHEETS.length, "no stylesheets found — the sweep is looking in the wrong place").toBeGreaterThan(
      20,
    );
  });

  it("defines every custom property it asks for", () => {
    const defined = new Set<string>();
    for (const sheet of SHEETS) {
      const css = readFileSync(sheet, "utf8");
      for (const [, name] of css.matchAll(DEFINES)) defined.add(name);
    }

    const dead: string[] = [];
    for (const sheet of SHEETS) {
      const css = readFileSync(sheet, "utf8");
      const lines = css.split("\n");
      lines.forEach((line, i) => {
        for (const [, name] of line.matchAll(USES)) {
          if (!defined.has(name)) {
            dead.push(`${sheet.slice(ROOT.length)}:${i + 1}  ${name}  —  ${line.trim()}`);
          }
        }
      });
    }

    expect(
      dead,
      `${dead.length} declaration(s) name a custom property that is defined nowhere. Each one is ` +
        `dropped whole by the browser — a colour falls back to whatever is inherited, and a border ` +
        `or a background is simply not drawn:\n${dead.join("\n")}`,
    ).toEqual([]);
  });
});

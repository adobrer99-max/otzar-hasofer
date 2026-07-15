/**
 * Sanitizing + flattening for the Scriptorium's rich-text fields.
 *
 * Authored prose is stored as HTML (the editor uses execCommand). To render it
 * safely — and to stay correct in the app, in unit tests, and in SSR alike —
 * both helpers are **DOM-free**: they tokenize the string directly rather than
 * lean on `DOMParser`/`document`, which the Node test environment lacks.
 *
 * `sanitizeRichHtml` reconstructs only an allowlist of tags (and a short list
 * of inline style props), escaping every other `<`/`>`/`&` so the output can
 * only ever contain the tags we chose — no scripts, event handlers, urls, or
 * unknown elements survive. It runs both on save and again at render.
 */

const ALLOWED_TAGS = new Set(["p", "br", "b", "strong", "i", "em", "u", "h1", "h2", "h3", "h4", "span", "div"]);
const VOID_TAGS = new Set(["br"]);
const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "font-size",
  "text-align",
  "font-weight",
  "font-style",
  "text-decoration",
]);

function escapeText(s: string): string {
  return s
    // Escape a bare `&` but leave existing entities (&amp; &#39; &#x2f;) intact.
    .replace(/&(?!(#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Keep only safe declarations of allowlisted inline style properties. */
function sanitizeStyle(style: string): string {
  const decls: string[] = [];
  for (const part of style.split(";")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    if (/url\(|expression|javascript:|[<>]/i.test(value)) continue;
    if (!/^[a-z0-9#.,%()\-\s'"]+$/i.test(value)) continue;
    decls.push(`${prop}: ${value}`);
  }
  return decls.join("; ");
}

/**
 * Return HTML containing only allowlisted tags with allowlisted inline styles.
 * Any disallowed tag is dropped (its text is kept, escaped); all stray markup
 * in text runs is entity-escaped, so the result is inert apart from the tags
 * we rebuild.
 */
export function sanitizeRichHtml(html: string): string {
  if (!html) return "";
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    out += escapeText(html.slice(last, m.index));
    last = tagRe.lastIndex;
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue; // drop the tag, keep surrounding text
    if (closing) {
      if (!VOID_TAGS.has(tag)) out += `</${tag}>`;
      continue;
    }
    if (VOID_TAGS.has(tag)) {
      out += `<${tag}>`;
      continue;
    }
    const attrs = m[3] || "";
    const styleMatch = attrs.match(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/i);
    const style = styleMatch ? sanitizeStyle(styleMatch[2] ?? styleMatch[3] ?? "") : "";
    out += style ? `<${tag} style="${style}">` : `<${tag}>`;
  }
  out += escapeText(html.slice(last));
  return out;
}

/**
 * Flatten rich HTML to plain text — for the places a field is composed into a
 * larger string rather than block-rendered (the reversed-framing sentence, the
 * blazon/image-prompt exports), so raw markup never leaks into them.
 */
export function richToPlain(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-4])>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whether a stored value carries any markup (vs. plain shipped text). */
export function isRich(value: string): boolean {
  return /<[a-zA-Z][^>]*>/.test(value);
}

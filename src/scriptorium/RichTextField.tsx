import { useEffect, useRef, useState } from "react";
import { sanitizeRichHtml } from "./richText";
import styles from "./scriptorium.module.css";

/**
 * A small rich-text field for the Scriptorium's prose. A contentEditable
 * surface plus a composition toolbar — bold / italic / underline / strike,
 * heading level and blockquote, bulleted and numbered lists, links, text
 * alignment, an RTL/LTR direction toggle, font size, colour, undo/redo, and
 * clear formatting. Formatting is applied with `document.execCommand` (with
 * styleWithCSS, so it emits inline CSS, not legacy <font>): deprecated but
 * universally supported in the target browsers and dependency-free under the
 * app's CSP. The stored value is always sanitized HTML; paste is coerced to
 * plain text so no foreign markup enters.
 */

const FONT_SIZES: { label: string; value: string }[] = [
  { label: "Small", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Large", value: "5" },
  { label: "X-Large", value: "6" },
];
const HEADINGS: { label: string; value: string }[] = [
  { label: "Paragraph", value: "p" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
  { label: "Heading 4", value: "h4" },
  { label: "Quote", value: "blockquote" },
];

export function RichTextField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>("");
  const savedRange = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");

  // Write the value into the DOM only when it changed outside this editor
  // (switching entries, Revert) — never on our own keystrokes, so the caret
  // never jumps.
  useEffect(() => {
    const el = ref.current;
    if (el && value !== lastEmitted.current) {
      el.innerHTML = value;
      lastEmitted.current = value;
    }
  }, [value]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    const html = sanitizeRichHtml(el.innerHTML);
    lastEmitted.current = html;
    onChange(html);
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }
  function restoreSelection() {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }

  function exec(command: string, val?: string) {
    ref.current?.focus();
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, val);
    saveSelection();
    emit();
  }

  // Keep the toolbar from stealing the selection when a control is pressed.
  const keepSelection = (e: React.MouseEvent) => e.preventDefault();

  /**
   * Toggle the current block between LTR and RTL. execCommand has no direction
   * command, so this walks from the selection anchor up to the block-level
   * child of the surface and toggles inline direction + alignment (both are
   * allowlisted style props, so they survive sanitization).
   */
  function toggleDirection() {
    const el = ref.current;
    if (!el) return;
    el.focus();
    restoreSelection();
    const findBlock = (): HTMLElement | null => {
      let node: Node | null = window.getSelection()?.anchorNode ?? null;
      while (node && node.parentNode !== el) node = node.parentNode;
      return node instanceof HTMLElement ? node : null;
    };
    let block = findBlock();
    if (!block) {
      // Bare text at the root — wrap it in a paragraph first.
      document.execCommand("formatBlock", false, "p");
      block = findBlock();
    }
    if (!block) return;
    const toRtl = block.style.direction !== "rtl";
    block.style.direction = toRtl ? "rtl" : "ltr";
    block.style.textAlign = toRtl ? "right" : "left";
    saveSelection();
    emit();
  }

  function applyLink() {
    const url = linkUrl.trim();
    setLinkOpen(false);
    if (!url || url === "https://") return;
    exec("createLink", url);
    setLinkUrl("https://");
  }

  function clearFormatting() {
    ref.current?.focus();
    restoreSelection();
    document.execCommand("removeFormat");
    document.execCommand("unlink");
    document.execCommand("formatBlock", false, "p");
    saveSelection();
    emit();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emit();
  }

  return (
    <div className={styles.richEditor}>
      <div className={styles.richToolbar} role="toolbar" aria-label="Text formatting" onMouseDown={keepSelection}>
        <button type="button" aria-label="Bold" title="Bold" onClick={() => exec("bold")}><b>B</b></button>
        <button type="button" aria-label="Italic" title="Italic" onClick={() => exec("italic")}><i>I</i></button>
        <button type="button" aria-label="Underline" title="Underline" onClick={() => exec("underline")}><u>U</u></button>
        <button type="button" aria-label="Strikethrough" title="Strikethrough" onClick={() => exec("strikeThrough")}><s>S</s></button>
        <select
          aria-label="Heading level"
          title="Heading level"
          defaultValue="p"
          onChange={(e) => {
            exec("formatBlock", e.target.value);
            e.currentTarget.selectedIndex = 0;
          }}
        >
          {HEADINGS.map((h) => (
            <option key={h.value} value={h.value}>{h.label}</option>
          ))}
        </select>
        <span className={styles.toolGroup}>
          <button type="button" aria-label="Bulleted list" title="Bulleted list" onClick={() => exec("insertUnorderedList")}>•≡</button>
          <button type="button" aria-label="Numbered list" title="Numbered list" onClick={() => exec("insertOrderedList")}>1.</button>
        </span>
        <span className={styles.toolGroup}>
          <button
            type="button"
            aria-label="Insert link"
            title="Insert link"
            aria-expanded={linkOpen}
            onClick={() => {
              saveSelection();
              setLinkOpen((v) => !v);
            }}
          >
            🔗
          </button>
          <button type="button" aria-label="Remove link" title="Remove link" onClick={() => exec("unlink")}>⛓︎✕</button>
        </span>
        <span className={styles.toolGroup}>
          <button type="button" aria-label="Align left" title="Align left" onClick={() => exec("justifyLeft")}>⇤</button>
          <button type="button" aria-label="Align center" title="Align center" onClick={() => exec("justifyCenter")}>↔</button>
          <button type="button" aria-label="Align right" title="Align right" onClick={() => exec("justifyRight")}>⇥</button>
          <button type="button" aria-label="Justify" title="Justify" onClick={() => exec("justifyFull")}>≡</button>
          <button type="button" aria-label="Toggle text direction (RTL/LTR)" title="Toggle text direction (RTL/LTR)" onClick={toggleDirection}>⇄א</button>
        </span>
        <select
          aria-label="Font size"
          title="Font size"
          defaultValue="3"
          onChange={(e) => {
            exec("fontSize", e.target.value);
            e.currentTarget.value = "3";
          }}
        >
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <label className={styles.colorControl} title="Text colour">
          <span aria-hidden="true">A</span>
          <input
            type="color"
            aria-label="Text colour"
            defaultValue="#c9a24b"
            onMouseDown={saveSelection}
            onInput={(e) => exec("foreColor", (e.target as HTMLInputElement).value)}
          />
        </label>
        <span className={styles.toolGroup}>
          <button type="button" aria-label="Undo" title="Undo" onClick={() => exec("undo")}>↶</button>
          <button type="button" aria-label="Redo" title="Redo" onClick={() => exec("redo")}>↷</button>
          <button type="button" aria-label="Clear formatting" title="Clear formatting" onClick={clearFormatting}>⌫A</button>
        </span>
      </div>
      {linkOpen && (
        <div className={styles.linkRow}>
          <input
            type="url"
            className={styles.linkInput}
            aria-label="Link URL"
            placeholder="https://…"
            value={linkUrl}
            autoFocus
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                setLinkOpen(false);
              }
            }}
          />
          <button type="button" onClick={applyLink}>Apply</button>
          <button type="button" onClick={() => setLinkOpen(false)}>Cancel</button>
        </div>
      )}
      <div
        id={id}
        ref={ref}
        className={styles.richSurface}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        onInput={emit}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onBlur={saveSelection}
        onPaste={handlePaste}
      />
    </div>
  );
}

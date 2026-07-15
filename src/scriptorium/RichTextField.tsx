import { useEffect, useRef } from "react";
import { sanitizeRichHtml } from "./richText";
import styles from "./scriptorium.module.css";

/**
 * A small rich-text field for the Scriptorium's prose. A contentEditable
 * surface plus a composition toolbar — bold / italic / underline, heading
 * level, text alignment, font size, and colour. Formatting is applied with
 * `document.execCommand` (with styleWithCSS, so it emits inline CSS, not legacy
 * <font>): deprecated but universally supported in the target browsers and
 * dependency-free under the app's CSP. The stored value is always sanitized
 * HTML; paste is coerced to plain text so no foreign markup enters.
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
          <button type="button" aria-label="Align left" title="Align left" onClick={() => exec("justifyLeft")}>⇤</button>
          <button type="button" aria-label="Align center" title="Align center" onClick={() => exec("justifyCenter")}>↔</button>
          <button type="button" aria-label="Align right" title="Align right" onClick={() => exec("justifyRight")}>⇥</button>
          <button type="button" aria-label="Justify" title="Justify" onClick={() => exec("justifyFull")}>≡</button>
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
      </div>
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

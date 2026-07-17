import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchEntries, CATEGORY_ORDER, type SearchEntry, type SearchCategory } from "./searchIndex";
import { subscribePalette, openPalette, closePalette, togglePalette } from "./paletteStore";
import styles from "./CommandPalette.module.css";

const RESULT_LIMIT = 24;

/**
 * The ⌘K / Ctrl-K command palette — a jump-to-anything modal over the whole
 * catalogue (pages, letters, Houses, Sefarim). Mounted once in App beside the
 * Toaster. Hosts the global hotkey itself (it stays mounted, rendering null
 * when closed), so the shortcut works everywhere without a provider.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();

  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<Element | null>(null);

  const listboxId = useId();
  const optionId = useCallback((i: number) => `${listboxId}-opt-${i}`, [listboxId]);

  useEffect(() => subscribePalette(setOpen), []);

  // Global toggle hotkey — lives here (always-mounted) so ⌘K works on any page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        // Remember what had focus so we can restore it on close.
        if (!open) openerRef.current = document.activeElement;
        togglePalette();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // On open: focus the input and reset. On close: restore focus to the opener.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Focus after paint so the freshly-mounted input exists.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      document.body.style.overflow = "hidden";
      // A document-level Escape closes the palette regardless of where focus
      // currently sits (the input focus lands a frame after open).
      function onEsc(e: KeyboardEvent) {
        if (e.key === "Escape") {
          e.preventDefault();
          closePalette();
        }
      }
      document.addEventListener("keydown", onEsc);
      return () => {
        cancelAnimationFrame(id);
        document.body.style.overflow = "";
        document.removeEventListener("keydown", onEsc);
      };
    }
    // Closing — return focus where it came from.
    const opener = openerRef.current;
    if (opener instanceof HTMLElement) opener.focus();
    return undefined;
  }, [open]);

  const results = useMemo(() => searchEntries(query, RESULT_LIMIT), [query]);

  // Group into fixed category order; flatten for keyboard indexing.
  const groups = useMemo(() => {
    const byCategory = new Map<SearchCategory, SearchEntry[]>();
    for (const entry of results) {
      const list = byCategory.get(entry.category) ?? [];
      list.push(entry);
      byCategory.set(entry.category, list);
    }
    const ordered: { category: SearchCategory; entries: SearchEntry[] }[] = [];
    for (const category of CATEGORY_ORDER) {
      const entries = byCategory.get(category);
      if (entries && entries.length) ordered.push({ category, entries });
    }
    return ordered;
  }, [results]);

  const flat = useMemo(() => groups.flatMap((g) => g.entries), [groups]);

  // Keep the active row in range as results change.
  useEffect(() => setActiveIndex(0), [query]);

  const go = useCallback(
    (entry: SearchEntry | undefined) => {
      if (!entry) return;
      closePalette();
      navigate(entry.to);
    },
    [navigate],
  );

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      closePalette();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flat.length) setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flat.length) setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(flat[activeIndex]);
    }
  }

  if (!open) return null;

  let renderIndex = -1;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closePalette();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Search the Treasury"
      >
        <div className={styles.inputRow}>
          <svg
            className={styles.searchIcon}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Search letters, Houses, books, pages…"
            aria-label="Search the Treasury"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={flat.length ? optionId(activeIndex) : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
          />
          <kbd className={styles.escHint}>Esc</kbd>
        </div>

        <div className={styles.results} id={listboxId} role="listbox" aria-label="Search results">
          {flat.length === 0 ? (
            <p className={styles.noResults}>No matches. Try a letter, a name, or a page.</p>
          ) : (
            groups.map((group) => (
              <div key={group.category} className={styles.group} role="presentation">
                <div className={styles.groupHeader} role="presentation">
                  {group.category}
                </div>
                {group.entries.map((entry) => {
                  renderIndex += 1;
                  const i = renderIndex;
                  const active = i === activeIndex;
                  return (
                    <div
                      key={entry.id}
                      id={optionId(i)}
                      role="option"
                      aria-selected={active}
                      className={`${styles.option} ${active ? styles.optionActive : ""}`}
                      onMouseMove={() => setActiveIndex(i)}
                      onClick={() => go(entry)}
                    >
                      {entry.hebrew && (
                        <span className={styles.optionHebrew} lang="he" aria-hidden="true">
                          {entry.hebrew}
                        </span>
                      )}
                      <span className={styles.optionText}>
                        <span className={styles.optionLabel}>{entry.label}</span>
                        {entry.sublabel && (
                          <span className={styles.optionSublabel}>{entry.sublabel}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <p className={styles.srOnly} role="status" aria-live="polite">
          {flat.length} {flat.length === 1 ? "result" : "results"}
        </p>
      </div>
    </div>
  );
}

/** Programmatic openers, re-exported for the nav button. */
export { openPalette };

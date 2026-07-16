import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { sanitizeRichHtml } from "../../scriptorium/richText";
import { subscribeToasts, dismissToast, type ToastItem } from "./toast";
import styles from "./ui.module.css";

/** The eyebrow + title (+ optional Hebrew subtitle + lede) block that opens
 *  nearly every page — the illuminated header treatment from the design canon. */
export function PageHeader({
  kicker,
  title,
  hebrew,
  lede,
}: {
  kicker: ReactNode;
  title: ReactNode;
  /** A Hebrew subtitle set beside/under the title (e.g. כ״ב אותיות). */
  hebrew?: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.kicker}>{kicker}</div>
      <h1 className={styles.title}>{title}</h1>
      {hebrew && <div className={`${styles.headerHeb} hebrew`}>{hebrew}</div>}
      {lede && <p className={styles.lede}>{lede}</p>}
    </header>
  );
}

/** The bordered, softly-elevated surface. `interactive` adds hover-lift (for link/button cards). */
export function Card({
  children,
  className,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={[styles.card, interactive ? styles.cardInteractive : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "ghost" | "subtle" | "default";

export function Button({
  variant = "default",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variantClass = {
    primary: styles.btnPrimary,
    ghost: styles.btnGhost,
    subtle: styles.btnSubtle,
    default: "",
  }[variant];
  return (
    <button className={[styles.btn, variantClass, className ?? ""].filter(Boolean).join(" ")} {...rest}>
      {children}
    </button>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

/** A unified segmented toggle. Renders a labelled radiogroup of buttons. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? styles.segmentActive : undefined}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** An accent-ruled margin note. */
export function Callout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[styles.callout, className ?? ""].filter(Boolean).join(" ")}>{children}</div>;
}

/** A gold hairline centered on a small lozenge — the illuminated section divider. */
export function DecoratedRule() {
  return (
    <div className={styles.rule} role="separator">
      <span className={styles.ruleLine} />
      <span className={styles.ruleMark} />
      <span className={styles.ruleLine} />
    </div>
  );
}

/** Wraps a paragraph so its opening letter is set as an illuminated initial. */
export function DropCap({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={[styles.dropCap, className ?? ""].filter(Boolean).join(" ")}>{children}</p>;
}

/**
 * Renders authored rich text (Scriptorium prose) as sanitized HTML. Shipped
 * content is plain text and renders identically; once an author formats a
 * field the bold/heading/colour/alignment show here. Sanitized again at render
 * (defense in depth), and scoped so an authored heading can't blow out the
 * reading column. `as` picks the wrapper element (default a block div).
 */
export function RichText({
  html,
  className,
  as: Tag = "div",
}: {
  html: string;
  className?: string;
  as?: "div" | "span" | "p";
}) {
  return (
    <Tag
      className={[styles.richText, className ?? ""].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
    />
  );
}

/** The gold aleph-shield brand mark (the favicon motif), inline so it inherits
 *  the accent colour in both themes. Decorative by default. */
export function AlephMark({ className, size = 26 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size * (30 / 26)}
      viewBox="0 0 26 30"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M2 3 L24 3 L24 17 C24 24 18 27 13 29 C8 27 2 24 2 17 Z"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
      <text
        x="13"
        y="20"
        textAnchor="middle"
        fontFamily="var(--font-hebrew)"
        fontSize="15"
        fill="var(--accent)"
      >
        א
      </text>
    </svg>
  );
}

/** The calm, on-brand placeholder shown while a lazy route loads — the aleph
 *  mark with a gentle pulse (still under prefers-reduced-motion). */
export function RouteFallback() {
  return (
    <div className={styles.routeFallback} role="status" aria-live="polite">
      <AlephMark className={styles.loadingMark} size={40} />
      <span className={styles.loadingLabel}>Loading…</span>
    </div>
  );
}

/** A quiet, centered empty-state placeholder: the aleph mark, a title, optional
 *  guidance, and an optional call to action. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.emptyState} role="note">
      <AlephMark className={styles.emptyMark} size={44} />
      <p className={styles.emptyTitle}>{title}</p>
      {description && <div className={styles.emptyDescription}>{description}</div>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

/** The single toast region — mounted once in App. Subscribes to the toast
 *  store and renders transient, click-dismissible notices. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);
  if (items.length === 0) return null;
  return (
    <div className={styles.toaster} role="status" aria-live="polite">
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          className={[styles.toast, styles[`toast_${t.tone}`] ?? ""].filter(Boolean).join(" ")}
          onClick={() => dismissToast(t.id)}
          aria-label={`${t.message} (dismiss)`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}

/**
 * A destructive action guarded by an inline two-step confirm — the single
 * confirm pattern app-wide (no blocking window.confirm). First click arms an
 * inline Confirm/Cancel; it disarms on Escape or blur.
 */
export function ConfirmButton({
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  ariaLabel,
  className,
}: {
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  ariaLabel?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!armed) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setArmed(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [armed]);

  if (!armed) {
    return (
      <button
        type="button"
        className={[styles.confirmTrigger, className ?? ""].filter(Boolean).join(" ")}
        onClick={() => setArmed(true)}
      >
        {children}
      </button>
    );
  }

  return (
    <span
      ref={ref}
      className={styles.confirmGroup}
      role="group"
      aria-label={ariaLabel ?? "Confirm this action"}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setArmed(false);
      }}
    >
      <button
        type="button"
        className={styles.confirmYes}
        autoFocus
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className={styles.confirmNo} onClick={() => setArmed(false)}>
        {cancelLabel}
      </button>
    </span>
  );
}

export { styles as uiStyles };

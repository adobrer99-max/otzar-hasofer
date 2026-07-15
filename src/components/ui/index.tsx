import type { ButtonHTMLAttributes, ReactNode } from "react";
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

export { styles as uiStyles };

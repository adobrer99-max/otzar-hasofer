import { useState } from "react";
import { balaganSections } from "../data/balagan";
import type { BalaganCategory } from "../types/commentary";
import { DrashTier } from "./DrashTier";
import styles from "./library.module.css";

export function BalaganBook() {
  const [open, setOpen] = useState<BalaganCategory>(balaganSections[0].category);

  return (
    <div>
      <p>
        The genizah of the Treasury — a worn book is never thrown away, and neither is a
        worn thought. Each Scribe keeps their marginal notes, open questions, variant
        traditions, corrections, discarded hypotheses, and respectful disagreements here,
        so that nothing of the work is lost. Choose a section and add to it.
      </p>

      <div className={styles.cards}>
        {balaganSections.map((section) => {
          const isOpen = section.category === open;
          return (
            <div key={section.category} className={styles.card}>
              <button
                type="button"
                onClick={() => setOpen(section.category)}
                aria-expanded={isOpen}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "start",
                  fontSize: "1.05rem",
                  color: "var(--accent-bright)",
                }}
              >
                {section.label}
                <span className={styles.cardMeta}>{section.hebrew}</span>
              </button>
              <p>{section.blurb}</p>
              {isOpen && (
                <div style={{ marginTop: "var(--space-3)" }}>
                  <DrashTier
                    subject={{ kind: "balagan", category: section.category }}
                    addLabel={`Add to ${section.label}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { lettersById } from "../data/letters";
import { PardesEntry } from "./PardesEntry";

/**
 * The explainer book: it teaches the four-tier format the whole shelf uses,
 * then demonstrates it with a live worked example — the letter Heh, whose
 * received "Commentary of Aleph Yud" already lives in the Drash tier as a
 * seed. Reuses existing letter data; introduces no new content.
 */
const tiers: { tier: string; voice: string; description: string }[] = [
  { tier: "Literal (Peshat)", voice: "The Letter", description: "The dictionary sense and grammatical form of the root or letter." },
  { tier: "Biblical (Remez)", voice: "The Tradition", description: "How the root or letter is employed throughout the Tanakh and Jewish tradition." },
  { tier: "Treasury (Drash)", voice: "The Scribe", description: "The received and ongoing commentaries, beginning with the Commentary of Aleph Yud." },
  { tier: "Lived (Sod)", voice: "The Participant", description: "The mystery, disclosed only through the participant's life after the reading." },
];

export function VocabularyTreasuryBook() {
  const heh = lettersById["heh"];

  return (
    <div>
      <p>
        Every reading proceeds through four tiers. The Letter is first encountered in its
        literal form, then situated within the witness of Jewish tradition, then illuminated
        through the faithful commentary of the Scribe, and finally entrusted to the
        participant, in whom its deepest mystery is disclosed through lived experience. Not
        every Scribe is fluent in Hebrew — this framework keeps language from being a barrier
        to the art.
      </p>

      <table>
        <thead>
          <tr>
            <th>Tier</th>
            <th>Voice</th>
            <th>What it holds</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => (
            <tr key={t.tier}>
              <td>{t.tier}</td>
              <td>{t.voice}</td>
              <td>{t.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>A Worked Example — the Letter {heh?.name}</h2>
      <p style={{ color: "var(--text-muted)" }}>
        The same four tiers, shown with real content. The Drash tier below is live: it holds
        the received Commentary of Aleph Yud, and you may add your own.
      </p>
      {heh && (
        <PardesEntry
          primaryHebrew={heh.glyph}
          drashSubject={{ kind: "letter", letterId: "heh" }}
          drashAddLabel="Add a commentary on Heh"
          peshat={
            <>
              <p>
                <strong>{heh.name}</strong> — {heh.translationRoot}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Gematria {heh.gematria} · {heh.classification} letter · {heh.astrological}
              </p>
            </>
          }
          remez={
            <>
              <p>{heh.eternalPrinciple}</p>
              {heh.hebrewRoot && (
                <p style={{ fontFamily: "var(--font-hebrew)" }}>{heh.hebrewRoot}</p>
              )}
            </>
          }
          sod={
            heh.question ? (
              <p>{heh.question}</p>
            ) : (
              <p>Disclosed through the participant's own life after the reading.</p>
            )
          }
        />
      )}
    </div>
  );
}

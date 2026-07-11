import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui";

export function Shoresh() {
  return (
    <div className="page">
      <PageHeader kicker="The Nikkudot" title="Shoresh — The Root of the Reading" />
      <p>
        Within Derekh Eretz, the Hebrew letters form the symbolic grammar of
        each reading. Individually, each letter is contemplated for its own
        meaning and relationship to the participant's life.
      </p>
      <p>
        When three letters are drawn, they are understood as the potential{" "}
        <em>shoresh</em> (root) of a Hebrew word. The role of the nikkudot
        (vowel points) is not to alter the meaning of the letters, but to give
        voice to the root. Through vocalization, the consonantal structure
        becomes a living Hebrew word that encapsulates the central theme of
        the reading — the Word of the Reading.
      </p>

      <h2>The Hierarchy of Interpretation</h2>
      <p>The Scribe follows a disciplined order of interpretation:</p>
      <p>
        <em>
          One exception: on Tu Bishvat, when the reading becomes the Etz
          Chaim's vertical draw through the Four Worlds, the PaRDeS framework
          — the Orchard itself — takes absolute precedence, and no Shoresh is
          resolved.
        </em>
      </p>

      <h3>I. Canonical Root</h3>
      <p>
        If the three letters, in the order drawn, form an attested Hebrew
        root, the corresponding word becomes the Word of the Reading.
      </p>

      <h3>II. Canonical Name</h3>
      <p>
        If no root exists, but the letters form a recognized biblical name or
        established sacred term, the participant reflects upon that figure or
        concept instead.
      </p>

      <h3>III. Related Correspondence</h3>
      <p>
        If neither a root nor a name exists, the Scribe may explore related
        linguistic correspondences: two-letter roots, roots the same letters
        would form in a different order, gematria (numeric coincidences), and
        established symbolic associations already recorded for each letter.
        These are offered as avenues of contemplation rather than definitive
        interpretations.
      </p>

      <h3>IV. Shoresh Nistar — The Hidden Root</h3>
      <blockquote>
        Not every combination of three Hebrew letters forms an attested
        Hebrew root. When no authentic root can be identified, the reading
        does not fail. Instead, the participant enters the contemplative
        state known as Shoresh Nistar (שורש נסתר) — The Hidden Root. The
        Scribe does not invent a word or force an interpretation. Instead, the
        Treasury faithfully records the letters exactly as they were
        received. The participant is invited to live with the unresolved
        letters, trusting that understanding may emerge through future
        readings, sacred time, personal experience, or continued study. The
        Hidden Root becomes an intentional part of the liturgy rather than an
        exception to it.
      </blockquote>

      <p>
        The veiled fourth letter, drawn privately by the Scribe, is never
        included in this process — it holds the Sod (secret) layer of the
        reading and stays hidden even from the Herald.
      </p>

      <hr className="hairline-rule" />
      <p>
        See the <Link to="/guide/letters">Twenty-Two Letters</Link> this root
        is built from, and use <Link to="/herald">the Herald</Link>, where the
        Shoresh hierarchy is resolved automatically for each reading.
      </p>
    </div>
  );
}

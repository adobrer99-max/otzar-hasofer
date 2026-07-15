import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui";

export function Scribe() {
  return (
    <div className="page">
      <PageHeader kicker="Guidebook 05" title="The Scribe" hebrew="הסופר" />
      <p>
        The Scribe guides the reading; the Scribe does not predict it. This
        page collects the ritual's steps and posture as reference during a
        reading — it does not run the reading for you.
      </p>

      <h2>The Reading</h2>
      <ol>
        <li>
          Welcome &amp; Opening Liturgy — recite Shecheyanu for a
          participant's first opening.
        </li>
        <li>Reading of the hand anchor.</li>
        <li>Drawing of the three letters.</li>
        <li>Revelation of the Nikkudot, based on how the letters relate to the Sefirot.</li>
        <li>Drawing of the veiled card, privately, from the letter deck.</li>
        <li>Pardes Interpretation — reading through Peshat, Remez, Drash, and Sod.</li>
        <li>Shared conversation.</li>
        <li>Creation of the reading's unique Herald.</li>
        <li>Closing blessing and journaling.</li>
      </ol>

      <h2>Posture</h2>
      <p>
        The final interpretation belongs to neither Scribe nor participant
        alone, but to both together — the "71st Face." Hold questions more
        than answers; the letters illuminate paths the soul has already
        walked, they do not predict new ones.
      </p>

      <hr className="hairline-rule" />
      <p>
        See also <Link to="/guide/sacred-time">Sacred Time</Link>, which
        locates every reading in the Jewish calendar, and{" "}
        <Link to="/herald">the Herald</Link>, where the reading's ritual flow
        is carried out and its sigil created.
      </p>
    </div>
  );
}

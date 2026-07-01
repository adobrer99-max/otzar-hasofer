import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="kicker">The Treasury</div>
        <h1>Otzar Ha'Sofer</h1>
      </div>
      <p>
        <em>
          "The Scribe does not reveal destiny. The Scribe guides the neshama
          of the person seeking it."
        </em>
      </p>
      <p>
        This companion is a reference guide to the Otzar Ha'Sofer practice —
        not a fortune-telling tool. Use it alongside the physical Mizbe'ach
        and Derekh Eretz deck during a reading, and use{" "}
        <Link to="/herald">the Herald</Link> to create the participant's
        living heraldic sigil at the close of the reading.
      </p>
      <hr className="hairline-rule" />
      <p>
        <Link to="/guide/foundations">Begin with the Foundations →</Link>
      </p>
    </div>
  );
}

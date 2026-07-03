import { encounters } from "../../data/encounters";

export function Encounters() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="kicker">The Onboarding</div>
        <h1>The Seven Encounters of Bereshit</h1>
      </div>
      <p>
        The Herald is not formed by accumulating information. It is formed
        through the participant's gradual participation in the unfolding
        order of Creation. Each of a participant's first seven readings
        corresponds to one Day of Creation, shaping both the question that is
        asked and the symbols that receive emphasis.
      </p>

      {encounters.map((encounter) => (
        <div key={encounter.number}>
          <h2>
            {encounter.name} Encounter — {encounter.aspect}
          </h2>
          <p>{encounter.themes}</p>
          <p>
            <em>{encounter.question}</em>
          </p>
        </div>
      ))}

      <h2>The Seventy Days of Silence</h2>
      <blockquote>
        If the participant receives six readings, they must take some time
        away from the process so that they can rest, and internalize what is
        being offered. If they return for a seventh reading, the Herald is
        revealed.
      </blockquote>
      <p>
        This app treats the rest period as guidance rather than a rule — it
        will encourage this pause once a participant reaches their sixth
        reading, but it will never block a seventh reading from being
        created.
      </p>

      <p>
        Beyond the seventh reading, the Encounters do not repeat or continue
        — later readings are not labeled with an Encounter. What each
        participant receives at their seventh reading (a "Heraldic Epithet,"
        per the doc) is not yet built; for now, reaching the Seventh Encounter
        is simply marked in the Herald's history.
      </p>
    </div>
  );
}

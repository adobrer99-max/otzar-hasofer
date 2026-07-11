import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui";
import { encounters } from "../../data/encounters";
import { housesBySefirah } from "../../data/dorot";
import { ushpizinBySefirah } from "../../data/ushpizin";

export function Encounters() {
  return (
    <div className="page">
      <PageHeader kicker="The Onboarding" title="The Seven Encounters of Bereshit" />
      <p>
        The Herald is not formed by accumulating information. It is formed
        through the participant's gradual participation in the unfolding
        order of Creation. Each of a participant's first seven readings
        corresponds to one Day of Creation, shaping both the question that is
        asked and the symbols that receive emphasis. Each Encounter also
        carries a primary Sefirotic emphasis, through which the{" "}
        <Link to="/guide/dorot">Derekh Ha'Dorot</Link> Houses of that Sefirah
        open — the symbolic universe expands as the participant matures
        within the ritual.
      </p>

      {encounters.map((encounter) => {
        const houses = housesBySefirah(encounter.sefirah);
        return (
          <div key={encounter.number}>
            <h2>
              {encounter.name} Encounter — {encounter.aspect}
            </h2>
            <p>{encounter.themes}</p>
            <p>
              <em>{encounter.question}</em>
            </p>
            <p>
              Opens the Pillar of{" "}
              {ushpizinBySefirah[encounter.sefirah].sefirahName}:{" "}
              {houses.map((house, i) => (
                <span key={house.id}>
                  {i > 0 && " and "}
                  <Link to={`/guide/dorot/${house.id}`}>
                    the House of {house.figure}
                  </Link>
                </span>
              ))}
              .
            </p>
          </div>
        );
      })}

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
        — later readings are not labeled with an Encounter. At the seventh
        reading the participant receives their Heraldic Epithet: the
        Treasury proposes one from the seven readings' accumulated history,
        and the Scribe may reword it before it is sealed.
      </p>
    </div>
  );
}

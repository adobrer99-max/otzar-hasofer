import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui";

export function Foundations() {
  return (
    <div className="page">
      <PageHeader kicker="Guidebook 00–01" title="Foundations" hebrew="יסודות" />

      <h2>Vision</h2>
      <p>
        Otzar Ha'Sofer ("The Scribe's Treasury") is a contemplative ritual
        inspired by Jewish textual traditions, sacred time, Hebrew letters,
        and the ongoing dialogue between people, memory, place, and Torah. It
        is not a system of fortune telling or prediction.
      </p>
      <p>
        Instead it is a shared space in which the Scribe guides participants
        through contemplative self-reflection through the use of cards,
        ritual, conversation, and performance.
      </p>
      <p>
        <em>
          The Scribe does not reveal destiny. The Scribe guides the neshama
          of the person seeking it.
        </em>
      </p>

      <h2>Core Philosophy</h2>
      <p>
        The Hebrew alphabet is the spine and symbolic syntax. In keeping with
        Jewish tradition, every reading is an act of dialogue, and not a
        promise of certainty. There are, after all, 70 faces of the Torah.
      </p>
      <p>
        <em>
          "The letters do not predict the future. They illuminate the paths
          by which the soul has always walked."
        </em>
      </p>
      <p>
        The final interpretation is the shared work between Scribe and
        participant — the "71st Face."
      </p>

      <h2>Derekh HaBrit &amp; Derekh Noach</h2>
      <p>
        In keeping with tradition, and to account for the role of Haschaga
        Pratis, the ritual practice of Otzar Ha'Sofer preserves the
        difference and separation between Jew and Gentile. The Jewish
        reading is more intimate, covenantal, and rooted in the tradition —
        and carries forth the additional elements revealed by the
        participant's Hebrew name — while the Gentile reading is more
        universal, reflecting Noahide principles.
      </p>

      <h2>The Artifacts</h2>
      <h3>Palms</h3>
      <p>
        The first artifact is metaphysical: the lines on the palm. The
        Scribe first reads the Chai, Lev, and Rosh lines of the participant
        to establish a baseline for the neshama.
      </p>
      <h3>Cards</h3>
      <p>
        The ritual begins with an embodied and personalized interaction,
        sensitive to the cyclicality of the Jewish calendar, to geography,
        and to the covenantal and universal aspects of Judaism.
      </p>
      <p>
        <strong>Derekh Eretz</strong> — vertical, archetypal, covenantal:
        twenty-two cards, each corresponding to a Hebrew letter.
      </p>
      <p>
        <strong>Derekh Galut</strong> — horizontal, practical, communal: a
        fifty-six card deck still under development, whose symbolic content
        must emerge from Jewish tradition rather than arbitrary invention.
      </p>
      <p>
        When three Derekh Eretz letters are drawn together, they are read as
        a potential Hebrew root — see{" "}
        <Link to="/guide/shoresh">Shoresh — The Root of the Reading</Link>.
      </p>

      <h2>Discovery Rather than Invention</h2>
      <p>
        Whenever possible, Otzar Ha'Sofer adopts symbolic correspondences
        already present within Jewish tradition. New correspondences are
        introduced only where the tradition is genuinely silent, so the
        Treasury feels like the continuation of an existing symbolic
        language rather than the creation of an entirely new one.
      </p>
    </div>
  );
}

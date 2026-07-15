import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui";
import { festivals } from "../../data/festivals";
import { FestivalCard } from "../components/FestivalCard";

export function SacredTime() {
  return (
    <div className="page">
      <PageHeader kicker="Guidebook 06" title="Sacred Time" hebrew="מועדים" />
      <p>
        The Jewish calendar is not a backdrop to a reading — it changes how
        the reading itself is conducted. No reading occurs outside of sacred
        time: every reading begins with the Scribe locating the participant
        within multiple layers of Jewish time.
      </p>

      <h2>Immediate Time</h2>
      <p>
        Day of the week, Hebrew date, lunar phase, the Omer count (when
        applicable), Rosh Chodesh, and the week's Torah portion (parsha —
        including doubled portions and the Land/Galut schedule differences)
        are computed automatically for every reading. Each festival below
        overrides part of the standard practice, and the same override
        lightly tints the Herald generated on that day. See today's
        immediate time rendered on the{" "}
        <Link to="/guide/mizbeach">Mizbe'ach's living rings</Link>. As with
        the rest of Sacred Time, cross-check the computed parsha against a
        published luach before relying on it for real ritual use.
      </p>
      {festivals.map((festival) => (
        <FestivalCard key={festival.id} festival={festival} />
      ))}

      <h2>Personal Time</h2>
      <p>
        <strong>Hebrew Birthday</strong>, <strong>Yahrzeit</strong>,{" "}
        <strong>wedding anniversary</strong>, <strong>Bar/Bat Mitzvah</strong>,{" "}
        <strong>Bris</strong>, <strong>conversion</strong>, and{" "}
        <strong>Aliyah</strong> are tracked per participant on the Herald
        page. When a reading falls on one of these recurring Hebrew dates,
        the Treasury surfaces past readings from the same date in previous
        years. Each carries its own framing: a Bris opens the child's first
        page ("no conclusions, only blessing"); a conversion is a grafting —
        like Ruth, nothing erased; after an Aliyah the reading begins with
        the Letters alone, and the Galut cards cease to matter.
      </p>

      <h2>Covenantal Time</h2>
      <p>
        Marriage creates a shared Herald — the{" "}
        <Link to="/covenant">Covenantal Herald</Link> — and the seven days of
        Sheva Brachot that follow are one unfolding reading, each day
        illuminating another Sefirah, Chesed through Malchut.
      </p>
      <p>
        <strong>Yizkor</strong>: no reading is done. Just reflection and
        remembrance. The thirty days of mourning (Shloshim), the first year
        of mourning, and the pilgrimage festivals as a distinct covenantal
        layer remain reference practice, held by the Scribe rather than
        computed by the Treasury.
      </p>
    </div>
  );
}

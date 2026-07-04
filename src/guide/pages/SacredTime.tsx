import { festivals } from "../../data/festivals";
import { FestivalCard } from "../components/FestivalCard";

export function SacredTime() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="kicker">Guidebook 06</div>
        <h1>Sacred Time</h1>
      </div>
      <p>
        The Jewish calendar is not a backdrop to a reading — it changes how
        the reading itself is conducted. No reading occurs outside of sacred
        time: every reading begins with the Scribe locating the participant
        within multiple layers of Jewish time.
      </p>

      <h2>Immediate Time</h2>
      <p>
        Day of the week, Hebrew date, lunar phase, the Omer count (when
        applicable), and Rosh Chodesh are computed automatically for every
        reading. (Weekly Torah portion is not yet tracked in this build.)
        Each festival below overrides part of the standard practice, and the
        same override lightly tints the Herald generated on that day.
      </p>
      {festivals.map((festival) => (
        <FestivalCard key={festival.id} festival={festival} />
      ))}

      <h2>Personal Time</h2>
      <p>
        <strong>Hebrew Birthday</strong> and <strong>Yahrzeit</strong> are
        tracked per participant — set a Hebrew Birthday and record Yahrzeits
        (for parents, grandparents, a spouse, children) on the Herald page.
        When a reading falls on one of these recurring dates, the Treasury
        surfaces past readings from the same date in previous years.
      </p>
      <p>
        Not yet tracked in this build: wedding anniversary (Hebrew), Bar/Bat
        Mitzvah anniversary, Bris anniversary, conversion anniversary, and
        Aliyah anniversary.
      </p>

      <h2>Covenantal Time</h2>
      <p>
        Not yet tracked in this build: the seven days following marriage
        (Sheva Brachot), the thirty days of mourning (Shloshim), the first
        year of mourning, Yizkor seasons, and the pilgrimage festivals as a
        distinct covenantal layer.
      </p>
    </div>
  );
}

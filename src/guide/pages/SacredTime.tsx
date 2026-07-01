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
        the reading itself is conducted. Each festival below overrides part
        of the standard practice, and the same override lightly tints the
        Herald generated on that day.
      </p>
      {festivals.map((festival) => (
        <FestivalCard key={festival.id} festival={festival} />
      ))}
    </div>
  );
}

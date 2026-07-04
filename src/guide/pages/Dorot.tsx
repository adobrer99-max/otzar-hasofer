import { Link } from "react-router-dom";
import { dorotHouses, cardsByHouse } from "../../data/dorot";
import { ushpizinBySefirah } from "../../data/ushpizin";
import { encounters } from "../../data/encounters";
import styles from "./Dorot.module.css";

const pillarOrder = ["chesed", "gevurah", "tiferet", "netzach", "hod", "yesod", "malchut"];

export function Dorot() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="kicker">The Second Deck</div>
        <h1>Derekh Ha'Dorot</h1>
      </div>
      <p>
        Where Derekh Eretz reveals the eternal symbolic grammar of Creation,
        Derekh Ha'Dorot reveals how those eternal principles have been lived
        throughout the history of Israel. The second deck does not function
        as a parallel "Minor Arcana" — such a structure would borrow its
        symbolic architecture from external traditions rather than emerging
        organically from Jewish thought. Its purpose is to embody{" "}
        <strong>history</strong>. The relationship between the two decks is
        complementary rather than parallel.
      </p>
      <blockquote>They ask: Where has this truth already been lived?</blockquote>

      <h2>The Yeriah</h2>
      <p>
        Every card within the second deck emerges from an established chain
        of correspondence: Sefirah ↓ Biblical Archetype ↓ Biblical Episode ↓
        Human Practice. For example: Chesed ↓ Abraham ↓ Hospitality at Mamre
        ↓ Welcoming the Stranger. The participant is not invited to imitate
        Abraham as an abstract hero, but to recognize where the same current
        of Chesed may be unfolding within their own life.
      </p>

      <h2>Episodes Rather Than Personalities</h2>
      <p>
        The unit of interpretation is the biblical episode rather than the
        biblical figure. Each episode reveals a different spiritual
        relationship and therefore remains an independent card. The
        participant encounters not historical personalities, but moments
        through which Divine qualities become visible — and every card
        concludes with a contemplative question rather than a definitive
        interpretation.
      </p>

      <h2>The Two Sides of Each Pillar</h2>
      <p>
        Each of the seven Pillars holds two Houses: a patriarchal House and
        a matriarchal House. Together the matriarchal Houses form a
        distinctly feminine journey through covenant — not a parallel to the
        patriarchs, but an indispensable complement, revealing dimensions of
        faithfulness that are often quieter, more relational, and deeply
        transformative.
      </p>

      <h2>Unfolding Through the Seven Encounters</h2>
      <p>
        The second deck should unfold gradually. Because each of a
        participant's first{" "}
        <Link to="/guide/encounters">Seven Encounters</Link> corresponds to
        one movement within Creation, each Encounter also carries a primary
        Sefirotic emphasis — and the Houses of that Sefirah open with it.
        Rather than exposing every House immediately, the participant
        encounters additional symbolic dimensions as they progress,
        preserving the liturgical movement from Creation toward
        participation. The symbolic universe expands as the participant
        matures within the ritual. (This guide remains the Scribe's full
        reference — nothing here is hidden.)
      </p>

      <div className={styles.pillars}>
        {pillarOrder.map((sefirah, i) => {
          const houses = dorotHouses.filter((h) => h.sefirah === sefirah);
          const patriarchal = houses.find((h) => h.kind === "patriarchal");
          const matriarchal = houses.find((h) => h.kind === "matriarchal");
          const encounter = encounters[i];
          return (
            <div key={sefirah} className={styles.pillar}>
              <div className={styles.pillarName}>
                Pillar of {ushpizinBySefirah[sefirah].sefirahName} — opens with
                Encounter {encounter.number}: {encounter.aspect}
              </div>
              <div className={styles.houseLinks}>
                {patriarchal && (
                  <Link to={`/guide/dorot/${patriarchal.id}`}>
                    House of {patriarchal.figure}
                    <span className={styles.houseKind}>
                      {cardsByHouse(patriarchal.id).length} cards
                    </span>
                  </Link>
                )}
                {matriarchal && (
                  <Link to={`/guide/dorot/${matriarchal.id}`}>
                    House of {matriarchal.figure}
                    {matriarchal.houseName && ` — ${matriarchal.houseName}`}
                    <span className={styles.houseKind}>
                      {cardsByHouse(matriarchal.id).length} episodes
                    </span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

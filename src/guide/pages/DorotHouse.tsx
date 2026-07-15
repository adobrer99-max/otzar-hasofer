import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../components/ui";
import { dorotHouses, dorotHousesById, cardsByHouse } from "../../data/dorot";
import { ushpizinBySefirah } from "../../data/ushpizin";
import type { CommentaryRecord } from "../../types/commentary";
import { listAllCommentaries } from "../../storage/commentariesRepo";
import { CommentaryList } from "../../commentaries/CommentaryList";
import { DorotCardView } from "../components/DorotCardView";
import styles from "./Dorot.module.css";

export function DorotHouse() {
  const { houseId } = useParams<{ houseId: string }>();
  const house = houseId ? dorotHousesById[houseId] : undefined;
  // One load for the whole house rather than one query per card.
  const [commentaries, setCommentaries] = useState<CommentaryRecord[]>([]);
  useEffect(() => {
    listAllCommentaries().then(setCommentaries);
  }, []);

  if (!house) {
    return (
      <div className="page">
        <p>House not found.</p>
        <Link to="/guide/dorot">← Back to Derekh Ha'Dorot</Link>
      </div>
    );
  }

  const cards = cardsByHouse(house.id);
  const index = dorotHouses.findIndex((h) => h.id === house.id);
  const prev = dorotHouses[(index - 1 + dorotHouses.length) % dorotHouses.length];
  const next = dorotHouses[(index + 1) % dorotHouses.length];
  const sefirahName = ushpizinBySefirah[house.sefirah].sefirahName;

  return (
    <div className="page">
      <PageHeader
        kicker={`Derekh Ha'Dorot — Pillar of ${sefirahName} (${house.kind} House)`}
        title={
          <>
            House of {house.figure}
            {house.houseName && ` — ${house.houseName}`}
          </>
        }
      />
      {house.spiritualEnergy && (
        <p className={styles.cardMeta}>Spiritual Energy: {house.spiritualEnergy}</p>
      )}
      {house.teaching && <blockquote>{house.teaching}</blockquote>}

      {house.kind === "matriarchal" && (
        <p className={styles.firstDraftNote}>
          The matriarchal Houses are drafted in the source doc as episode
          tables only (episode + core energy). Their practices, questions,
          and card titles await the same enrichment the patriarchal Houses
          already carry — first-draft content, not a finished chapter.
        </p>
      )}

      {cards.map((card) => {
        const cardCommentaries = commentaries.filter(
          (c) => c.subject.kind === "dorot-card" && c.subject.cardId === card.id,
        );
        return (
          <DorotCardView key={card.id} card={card}>
            <CommentaryList commentaries={cardCommentaries} showSubject={false} />
          </DorotCardView>
        );
      })}

      <p>
        <Link to="/commentaries">Add a commentary on a card of this House →</Link>
      </p>

      <div className={styles.nav}>
        <Link to={`/guide/dorot/${prev.id}`}>← House of {prev.figure}</Link>
        <Link to="/guide/dorot">All Houses</Link>
        <Link to={`/guide/dorot/${next.id}`}>House of {next.figure} →</Link>
      </div>
    </div>
  );
}

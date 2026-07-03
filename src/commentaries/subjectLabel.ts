import type { CommentarySubject } from "../types/commentary";
import { lettersById } from "../data/letters";
import { dorotCardsById, dorotHousesById } from "../data/dorot";

/** Human-readable label + in-app link target for a commentary's subject. */
export function subjectLabel(subject: CommentarySubject): { label: string; to?: string } {
  switch (subject.kind) {
    case "letter": {
      const letter = lettersById[subject.letterId];
      return letter
        ? { label: `Letter — ${letter.glyph} ${letter.name}`, to: `/guide/letters/${letter.id}` }
        : { label: `Letter — ${subject.letterId}` };
    }
    case "dorot-card": {
      const card = dorotCardsById[subject.cardId];
      if (!card) return { label: `Derekh Ha'Dorot — ${subject.cardId}` };
      const house = dorotHousesById[card.houseId];
      return {
        label: `Derekh Ha'Dorot — ${card.title} (House of ${house?.figure ?? "?"})`,
        to: `/guide/dorot/${card.houseId}`,
      };
    }
    case "root": {
      const names = subject.rootKey
        .split("-")
        .map((id) => lettersById[id]?.name ?? id)
        .join("–");
      return { label: `Root — ${names}`, to: "/guide/shoresh" };
    }
  }
}

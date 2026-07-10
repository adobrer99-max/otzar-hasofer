import type { CommentarySubject } from "../types/commentary";
import { lettersById } from "../data/letters";
import { dorotCardsById, dorotHousesById } from "../data/dorot";
import { balaganSectionByCategory } from "../data/balagan";
import { liturgiesById } from "../data/liturgies";

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
    case "balagan": {
      const section = balaganSectionByCategory[subject.category];
      return {
        label: `Balagan HaOtzar — ${section?.label ?? subject.category}`,
        to: "/sefarim/balagan",
      };
    }
    case "liturgy": {
      const liturgy = liturgiesById[subject.liturgyId];
      return {
        label: `Liturgy — ${liturgy?.title ?? subject.liturgyId}`,
        to: `/sefarim/hatefillot/${subject.liturgyId}`,
      };
    }
  }
}

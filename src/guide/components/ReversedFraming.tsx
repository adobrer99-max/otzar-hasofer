import type { LetterCard } from "../../types/letter";
import { REVERSED_FRAMING_LABEL, reversedFramingText } from "../../data/reversedFraming";

export function ReversedFraming({ letter }: { letter: LetterCard }) {
  return (
    <div>
      <p>{reversedFramingText(letter)}</p>
    </div>
  );
}

export { REVERSED_FRAMING_LABEL };

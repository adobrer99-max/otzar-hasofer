import { Link } from "react-router-dom";
import type { HeraldLayer, DorotDrawRole } from "../../types/herald";
import type { CommentaryRecord } from "../../types/commentary";
import { rootKeyFor } from "../../types/commentary";
import { festivalsById } from "../../data/festivals";
import { lettersById } from "../../data/letters";
import { dorotCardsById, dorotHousesById } from "../../data/dorot";
import { formatHebrewDateEnglish } from "../../data/hebrewCalendar";
import { encountersByNumber } from "../../data/encounters";
import { findTwoLetterRoot } from "../../data/twoLetterRoots";
import { resolveShoresh } from "../shoresh/resolveShoresh";
import { richToPlain } from "../../scriptorium/richText";
import styles from "./history.module.css";

const FOUR_WORLDS = [
  { world: "Assiyah — Action", station: "the Roots" },
  { world: "Yetzirah — Formation", station: "the Trunk" },
  { world: "Briyah — Creation", station: "the Branches" },
  { world: "Atzilut — Emanation", station: "the Fruit" },
];

const DOROT_ROLE_LABELS: Record<DorotDrawRole, string> = {
  "beneath-first": "Beneath the First drawn",
  "beneath-second": "Beneath the Second drawn",
  "beneath-third": "Beneath the Third drawn",
  council: "The Council of Sefirot",
};

export function LayerCaption({
  layer,
  epithet,
  commentaries,
}: {
  layer: HeraldLayer;
  epithet?: string;
  /** All known commentaries — this caption surfaces the ones on this reading's root. */
  commentaries?: CommentaryRecord[];
}) {
  const festival = festivalsById[layer.input.festivalId] ?? festivalsById.ordinary;
  const spread = layer.input.spread ?? "triadic";
  const drawnLetters = layer.input.drawnLetters.map((d) => lettersById[d.letterId]);
  const drawnIds = layer.input.drawnLetters.map((d) => d.letterId) as [string, string, string];
  // PaRDeS takes absolute precedence on Tu Bishvat — no Shoresh resolution.
  const shoresh = spread === "etz-chaim" ? undefined : resolveShoresh(drawnIds);
  const etzChaimDraws =
    spread === "etz-chaim"
      ? [
          ...layer.input.drawnLetters,
          ...(layer.input.fourthLetter ? [layer.input.fourthLetter] : []),
        ]
      : [];
  const yichudPairs =
    spread === "yichud"
      ? [
          [layer.input.drawnLetters[0], layer.input.drawnLetters[1]] as const,
          [layer.input.drawnLetters[2], layer.input.veiledLetter] as const,
        ]
      : [];
  const sacredTime = layer.input.sacredTime;
  const encounter = layer.input.encounterNumber ? encountersByNumber[layer.input.encounterNumber] : undefined;
  const readingRootKey = rootKeyFor(drawnIds);
  const rootCommentaries = (commentaries ?? []).filter(
    (c) => c.subject.kind === "root" && c.subject.rootKey === readingRootKey,
  );
  const dorotDraws = layer.input.dorotDraws ?? [];
  const drawnCardIds = new Set(dorotDraws.map((d) => d.cardId));
  const dorotCommentaries = (commentaries ?? []).filter(
    (c) => c.subject.kind === "dorot-card" && drawnCardIds.has(c.subject.cardId),
  );

  return (
    <div className={styles.caption}>
      <div>
        {layer.isOrigin ? "Origin Herald" : `Layer ${layer.layerIndex + 1}`} —{" "}
        {new Date(layer.createdAt).toLocaleDateString()}
        {sacredTime && ` (${formatHebrewDateEnglish(sacredTime.hebrewDate)})`}
        {festival.id !== "ordinary" && ` · ${festival.name}`}
        {sacredTime?.omer && ` · Omer day ${sacredTime.omer.day}`}
        {sacredTime?.parsha && ` · Parashat ${sacredTime.parsha.label}`}
        {encounter && ` · Encounter ${encounter.number}: ${encounter.aspect}`}
      </div>
      {encounter?.number === 7 && (
        <div className={styles.citation}>
          Creation is complete; nothing new is made, only lived. Your Herald is revealed.
        </div>
      )}
      {epithet && (
        <div>
          <strong>Heraldic Epithet:</strong> <em>{epithet}</em>
        </div>
      )}
      <div>
        Drawn: {drawnLetters.map((l) => l?.name).join(", ")}
        {spread === "etz-chaim" &&
          layer.input.fourthLetter &&
          `, ${lettersById[layer.input.fourthLetter.letterId]?.name}`}
        {spread === "yichud" &&
          ` — and the anchor unveiled: ${lettersById[layer.input.veiledLetter.letterId]?.name}`}
      </div>

      {spread === "etz-chaim" && (
        <div>
          <strong>The Etz Chaim — the Four Worlds:</strong>
          <ul>
            {etzChaimDraws.map((draw, i) => {
              const world = FOUR_WORLDS[i];
              const letter = lettersById[draw.letterId];
              if (!world || !letter) return null;
              return (
                <li key={`${world.world}-${draw.letterId}`}>
                  {world.station}, {world.world}: {letter.name}
                  {draw.orientation === "reversed" && " (turned inward)"}
                </li>
              );
            })}
          </ul>
          <div className={styles.citation}>
            The fifth card — Olam Ha'Ba, the world to come — was drawn and sealed. The PaRDeS
            framework, the Orchard itself, takes precedence over the Shoresh this day.
          </div>
        </div>
      )}

      {spread === "yichud" && (
        <div>
          <strong>The Yichud — synthesis of the pairs:</strong>
          <ul>
            {yichudPairs.map(([a, b], i) => {
              const la = lettersById[a.letterId];
              const lb = lettersById[b.letterId];
              const root = findTwoLetterRoot(a.letterId, b.letterId);
              return (
                <li key={i}>
                  {i === 0 ? "First pair" : "Second pair"}: {la?.name} · {lb?.name}
                  {root && (
                    <span className={styles.citation}>
                      {" "}
                      — together they speak {root.rootWord}: {root.meaning}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className={styles.citation}>
            The veiled anchor was unveiled — Tu B'Av is transparency, the lifting of veils. The
            reading sought no tension, only synthesis, between each letter and between the pairs.
          </div>
        </div>
      )}

      {shoresh?.tier === "root" && (
        <div>
          <strong>Word of the Reading:</strong> {shoresh.word} — {shoresh.gloss}{" "}
          <span className={styles.citation}>({shoresh.citation})</span>
        </div>
      )}
      {shoresh?.tier === "name" && (
        <div>
          <strong>Recognized as:</strong> {shoresh.name} — {shoresh.gloss}{" "}
          <span className={styles.citation}>({shoresh.citation})</span>
        </div>
      )}
      {shoresh?.tier === "related" && (
        <div>
          <strong>Avenues of contemplation:</strong>
          <ul>
            {shoresh.correspondences.map((c, i) => (
              <li key={i}>
                {c.label} — {c.meaning}
                {c.source && <span className={styles.citation}> ({c.source})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {shoresh?.tier === "hidden" && (
        <div>
          <strong>Shoresh Nistar (שורש נסתר) — The Hidden Root.</strong> No attested root, name,
          or correspondence was found for these letters. This is not a failed reading: the
          Scribe does not invent a word or force an interpretation. The letters are recorded
          exactly as received, and the participant is invited to live with them, trusting that
          understanding may emerge through future readings, sacred time, personal experience, or
          continued study.
        </div>
      )}

      {rootCommentaries.length > 0 && (
        <div>
          <strong>Received commentaries on this root:</strong>
          <ul>
            {rootCommentaries.map((c) => (
              <li key={c.id}>
                {c.title ?? `Commentary of ${c.author}`}{" "}
                <span className={styles.citation}>
                  ({c.author}, {formatHebrewDateEnglish(c.hebrewDate)})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dorotDraws.length > 0 && (
        <div>
          <strong>From Derekh Ha'Dorot:</strong>
          <ul>
            {dorotDraws.map((draw) => {
              const card = dorotCardsById[draw.cardId];
              const house = card ? dorotHousesById[card.houseId] : undefined;
              if (!card || !house) {
                return <li key={`${draw.role}-${draw.cardId}`}>{draw.cardId}</li>;
              }
              return (
                <li key={`${draw.role}-${draw.cardId}`}>
                  {DOROT_ROLE_LABELS[draw.role]}:{" "}
                  <Link to={`/guide/dorot/${house.id}`}>
                    {card.title} (House of {house.figure})
                  </Link>
                  {(card.humanPractice ?? card.coreEnergy) && (
                    <span className={styles.citation}> — {richToPlain(card.humanPractice ?? card.coreEnergy ?? "")}</span>
                  )}
                  {card.question && (
                    <div>
                      <em>{richToPlain(card.question)}</em>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {dorotCommentaries.length > 0 && (
        <div>
          <strong>Received commentaries on the drawn cards:</strong>
          <ul>
            {dorotCommentaries.map((c) => (
              <li key={c.id}>
                {c.title ?? `Commentary of ${c.author}`}{" "}
                <span className={styles.citation}>
                  ({c.author}, {formatHebrewDateEnglish(c.hebrewDate)})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {drawnLetters.some((l) => l?.hebrewRoot) && (
        <div className={styles.citation}>
          Established symbolic associations:{" "}
          {drawnLetters
            .filter((l) => l?.hebrewRoot)
            .map((l) => `${l!.name}: ${l!.hebrewRoot}`)
            .join(" · ")}
        </div>
      )}

      {layer.input.reflection && <div>"{layer.input.reflection}"</div>}
    </div>
  );
}

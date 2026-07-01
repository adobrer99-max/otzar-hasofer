import type { LetterCard } from "../types/letter";

/**
 * The 22 letters of the Derekh Eretz deck.
 *
 * Editorial note (per the project's "Hierarchy of Sources"):
 * - `gematria` and `classification` (Mother/Double/Simple) are fixed,
 *   canonical values from Sefer Yetzirah — not open to authorial discretion.
 * - `element` / `astrological` follow the standard Sefer Yetzirah scheme
 *   (3 Mothers -> elements, 7 Doubles -> classical planets, 12 Simples ->
 *   zodiac signs / months), but manuscript traditions vary on some details
 *   (e.g. which Double maps to which planet). Review against the project's
 *   own source hierarchy before treating these as final.
 * - `keyword`, `uprightMeaning`, `reversedMeaning`, `hebrewRoot`, and
 *   `scribeNotes` are first-draft editorial/interpretive content written in
 *   the Scribe's voice. Treat these as a starting draft to rewrite, not
 *   finished copy — they are the one place authorial choice fully applies.
 */
export const letters: LetterCard[] = [
  {
    id: "aleph",
    order: 1,
    glyph: "א",
    name: "Aleph",
    transliteration: "Alef",
    gematria: 1,
    classification: "Mother",
    element: "Air",
    sefirahOrPath: "Keter / the silent breath beneath speech",
    keyword: "Breath, Unity, the Silent Beginning",
    uprightMeaning:
      "Aleph is the mute letter that carries no sound of its own, yet stands first. It names the breath before a word is spoken — the unity behind multiplicity, the still point from which a reading begins. Upright, Aleph asks the participant to notice what precedes their story: the quiet, undivided self beneath the roles they carry.",
    reversedMeaning:
      "Reversed, Aleph can signal a silence that has become avoidance — a person so identified with stillness that they have stopped speaking their truth at all, or a beginning perpetually deferred.",
    hebrewRoot: "אלף (alef) — to learn, to be tamed/yoked; also 'thousand'.",
    traditionalSources: ["Sefer Yetzirah 3:1–2", "Talmud, Shabbat 104a"],
  },
  {
    id: "bet",
    order: 2,
    glyph: "ב",
    name: "Bet",
    transliteration: "Bet",
    gematria: 2,
    classification: "Double",
    astrological: "Saturn (Shabtai)",
    sefirahOrPath: "Chochmah / the house that holds",
    keyword: "Dwelling, Blessing / Wisdom and Folly",
    uprightMeaning:
      "Bet means 'house' — the first act of creation, in which Torah itself begins (Bereshit). Upright, Bet speaks of a dwelling being built: a household, a body of learning, a stable container in which a life can be lived and blessed.",
    reversedMeaning:
      "As one of the seven doubles, Bet carries the pair wisdom/folly. Reversed, it can mark a house divided — instability at home, or wisdom curdled into cleverness without depth.",
    hebrewRoot: "בית (bayit) — house; בְּרָכָה (berakhah) — blessing.",
    traditionalSources: ["Sefer Yetzirah 4:1–3", "Genesis 1:1 (Bereshit)"],
  },
  {
    id: "gimel",
    order: 3,
    glyph: "ג",
    name: "Gimel",
    transliteration: "Gimel",
    gematria: 3,
    classification: "Double",
    astrological: "Jupiter (Tzedek)",
    sefirahOrPath: "Chesed / the giver who runs toward",
    keyword: "Giving, Wealth and Poverty",
    uprightMeaning:
      "Gimel is read as gomel — one who bestows kindness, running (as its shape suggests a leg in motion) toward the one in need. Upright, it speaks of generosity, abundance shared rather than hoarded.",
    reversedMeaning:
      "Gimel's classical pair is wealth/poverty. Reversed, it can mark a scarcity mindset, withheld generosity, or wealth accumulated without any outward motion of the hand.",
    hebrewRoot: "גמל (gamal) — to give fully, to wean/repay.",
    traditionalSources: ["Sefer Yetzirah 4:1–3", "Talmud, Shabbat 104a"],
  },
  {
    id: "dalet",
    order: 4,
    glyph: "ד",
    name: "Dalet",
    transliteration: "Dalet",
    gematria: 4,
    classification: "Double",
    astrological: "Mars (Ma'adim)",
    sefirahOrPath: "Gevurah / the door and the poor",
    keyword: "The Door, Life and Death",
    uprightMeaning:
      "Dalet means 'door' — and also echoes dal, the poor one who stands at it. Upright, Dalet marks a threshold: a door opening, a request made, an entrance into a new stage of a story.",
    reversedMeaning:
      "Dalet's pair is life/death. Reversed, the door may be shut rather than opened — a refusal to receive, or a threshold the participant cannot yet cross.",
    hebrewRoot: "דל (dal) — poor, low; דלת (delet) — door.",
    traditionalSources: ["Sefer Yetzirah 4:1–3"],
  },
  {
    id: "heh",
    order: 5,
    glyph: "ה",
    name: "Heh",
    transliteration: "Heh",
    gematria: 5,
    classification: "Simple",
    astrological: "Aries (Tleh) / Nisan",
    sefirahOrPath: "Chochmah's outward breath",
    keyword: "Revelation, Speech, Sight",
    uprightMeaning:
      "Heh is breath made audible — the sound of revelation, the letter added to Avram and Sarai's names at their covenant. Upright, Heh speaks of something hidden becoming seen: insight breaking into speech.",
    reversedMeaning:
      "Reversed, Heh can mark revelation withheld or premature — words spoken before their season, or a truth the participant still cannot bring themselves to say aloud.",
    hebrewRoot: "הנה (hineh) — behold, here.",
    traditionalSources: ["Sefer Yetzirah 5:1", "Genesis 17:5,15"],
  },
  {
    id: "vav",
    order: 6,
    glyph: "ו",
    name: "Vav",
    transliteration: "Vav",
    gematria: 6,
    classification: "Simple",
    astrological: "Taurus (Shor) / Iyar",
    sefirahOrPath: "Tiferet's connecting beam",
    keyword: "The Hook, Connection",
    uprightMeaning:
      "Vav means 'hook' or 'nail' — the letter that joins one clause to the next, one soul to another. Upright, it speaks of connection formed: a covenant, a relationship, a link between past and present.",
    reversedMeaning:
      "Reversed, Vav can mark a broken link — estrangement, a connection strained or severed, or a person caught between two things without joining either.",
    hebrewRoot: "וו (vav) — hook, peg (Exodus 27:10).",
    traditionalSources: ["Sefer Yetzirah 5:1", "Exodus 26:32"],
  },
  {
    id: "zayin",
    order: 7,
    glyph: "ז",
    name: "Zayin",
    transliteration: "Zayin",
    gematria: 7,
    classification: "Simple",
    astrological: "Gemini (Teomim) / Sivan",
    sefirahOrPath: "Netzach's edge",
    keyword: "The Weapon, Sustenance, Sabbath",
    uprightMeaning:
      "Zayin resembles a sword or a crowned letter, and shares a root with mazon, sustenance. Upright, it speaks of provision won through struggle, and of the rest (Shabbat, the seventh) that struggle is for.",
    reversedMeaning:
      "Reversed, Zayin can mark conflict without rest — striving that has become combative, or provision hoarded as a weapon rather than shared as sustenance.",
    hebrewRoot: "מזון (mazon) — sustenance; זין (zayin) — weapon.",
    traditionalSources: ["Sefer Yetzirah 5:1"],
  },
  {
    id: "chet",
    order: 8,
    glyph: "ח",
    name: "Chet",
    transliteration: "Het",
    gematria: 8,
    classification: "Simple",
    astrological: "Cancer (Sartan) / Tammuz",
    sefirahOrPath: "Netzach-Hod's enclosure",
    keyword: "The Fence, Grace, Enclosure",
    uprightMeaning:
      "Chet forms an enclosure, a fenced-in space — chesed's grace held within a boundary, life (chai) protected. Upright, it speaks of a household or self held safely within healthy limits.",
    reversedMeaning:
      "Reversed, Chet's fence can become a wall — grace withheld behind rigid boundaries, or a protection that has curdled into isolation.",
    hebrewRoot: "חי (chai) — life; חן (chen) — grace.",
    traditionalSources: ["Sefer Yetzirah 5:1"],
  },
  {
    id: "tet",
    order: 9,
    glyph: "ט",
    name: "Tet",
    transliteration: "Tet",
    gematria: 9,
    classification: "Simple",
    astrological: "Leo (Aryeh) / Av",
    sefirahOrPath: "Hod's hidden good",
    keyword: "The Hidden Good",
    uprightMeaning:
      "Tet's curved, enclosing shape is said to hide the good (tov) within it — the Midrash notes tov is spelled with tet though the word appears before the letter exists, hinting at a goodness present before it is visible. Upright, Tet speaks of a good quality still forming beneath the surface.",
    reversedMeaning:
      "Reversed, Tet can mark a goodness so hidden it has become inaccessible even to the participant themselves — potential unrecognized, kept turned inward.",
    hebrewRoot: "טוב (tov) — good.",
    traditionalSources: ["Sefer Yetzirah 5:1", "Midrash Rabbah, Genesis 1:10"],
  },
  {
    id: "yod",
    order: 10,
    glyph: "י",
    name: "Yod",
    transliteration: "Yod",
    gematria: 10,
    classification: "Simple",
    astrological: "Virgo (Betulah) / Elul",
    sefirahOrPath: "Chochmah's point",
    keyword: "The Point, the Hand, the Seed",
    uprightMeaning:
      "Yod is the smallest letter — a single point, said to contain all the others folded within it, and the letter of the Divine Name most associated with the hand (yad). Upright, it speaks of a small beginning that carries the whole of what will unfold.",
    reversedMeaning:
      "Reversed, Yod can mark a beginning made too small to notice, or a seed the participant is reluctant to plant — potential deferred rather than begun.",
    hebrewRoot: "יד (yad) — hand.",
    traditionalSources: ["Sefer Yetzirah 5:1", "Talmud, Menachot 29a"],
  },
  {
    id: "kaf",
    order: 11,
    glyph: "כ",
    name: "Kaf",
    transliteration: "Kaf",
    gematria: 20,
    classification: "Double",
    astrological: "Sun (Chamah)",
    sefirahOrPath: "Netzach / the open palm",
    keyword: "The Palm, Crown and Servitude",
    uprightMeaning:
      "Kaf is the open palm — kaf yad — that both holds and releases. Upright, it speaks of capacity: the hand cupped to receive blessing, or extended in service to another.",
    reversedMeaning:
      "Kaf's classical pair is crown/servitude. Reversed, the open hand can close into a fist of control, or a person may find themselves serving without dignity rather than by choice.",
    hebrewRoot: "כף (kaf) — palm, sole; also a measuring spoon.",
    traditionalSources: ["Sefer Yetzirah 4:1–3"],
  },
  {
    id: "lamed",
    order: 12,
    glyph: "ל",
    name: "Lamed",
    transliteration: "Lamed",
    gematria: 30,
    classification: "Simple",
    astrological: "Libra (Moznayim) / Tishrei",
    sefirahOrPath: "Tiferet's ascent",
    keyword: "The Teaching, the Ascent",
    uprightMeaning:
      "Lamed rises above the other letters in its written form, and shares a root with limud, study. Upright, it speaks of learning that lifts a person upward — a teaching taken in and embodied.",
    reversedMeaning:
      "Reversed, Lamed can mark knowledge that has stayed abstract — study disconnected from practice, or an ascent attempted without the ground of real learning beneath it.",
    hebrewRoot: "למד (lamad) — to learn/teach.",
    traditionalSources: ["Sefer Yetzirah 5:1", "Talmud, Shabbat 104a"],
  },
  {
    id: "mem",
    order: 13,
    glyph: "מ",
    name: "Mem",
    transliteration: "Mem",
    gematria: 40,
    classification: "Mother",
    element: "Water",
    sefirahOrPath: "Binah / the deep",
    keyword: "Water, the Deep, Concealment",
    uprightMeaning:
      "Mem is water, mayim — the element of what flows and what conceals (the closed final-mem holds a hidden pool of meaning within it). Upright, it speaks of depth: feeling, memory, and the quiet interior life beneath a person's surface.",
    reversedMeaning:
      "Reversed, Mem's waters can become stagnant or overwhelming — feeling that has turned to flood, or depths the participant has sealed off entirely from view.",
    hebrewRoot: "מים (mayim) — water.",
    traditionalSources: ["Sefer Yetzirah 3:1–2"],
  },
  {
    id: "nun",
    order: 14,
    glyph: "נ",
    name: "Nun",
    transliteration: "Nun",
    gematria: 50,
    classification: "Simple",
    astrological: "Scorpio (Akrav) / Cheshvan",
    sefirahOrPath: "Malchut's faithfulness",
    keyword: "The Fish, Faithfulness, Falling and Rising",
    uprightMeaning:
      "Nun shares a root with faithfulness (ne'eman) and with the fish (nun) that moves unseen through deep water. Upright, it speaks of quiet endurance — a faithfulness that persists beneath the surface of visible events.",
    reversedMeaning:
      "Reversed, Nun marks a fall not yet followed by a rising — the Psalmist's 'falling' verse missing from the alphabetic acrostic of Ashrei, tradition says, precisely where Nun's line would be. It can mark a person caught mid-fall, still awaiting support.",
    hebrewRoot: "נאמן (ne'eman) — faithful; נפילה (nefilah) — falling.",
    traditionalSources: ["Sefer Yetzirah 5:1", "Talmud, Berakhot 4b"],
  },
  {
    id: "samech",
    order: 15,
    glyph: "ס",
    name: "Samech",
    transliteration: "Samekh",
    gematria: 60,
    classification: "Simple",
    astrological: "Sagittarius (Keshet) / Kislev",
    sefirahOrPath: "Yesod's support",
    keyword: "The Support, the Closed Circle",
    uprightMeaning:
      "Samech is a closed circle — the letter of support (someich), holding up what would otherwise fall, per the Psalm 'the Lord supports all who fall.' Upright, it speaks of steady, often invisible support underneath a person's life.",
    reversedMeaning:
      "Reversed, Samech's circle can become confinement rather than support — a closed loop with no opening, or support so total it prevents a person's own growth.",
    hebrewRoot: "סומך (someich) — one who supports.",
    traditionalSources: ["Sefer Yetzirah 5:1", "Psalm 145:14"],
  },
  {
    id: "ayin",
    order: 16,
    glyph: "ע",
    name: "Ayin",
    transliteration: "Ayin",
    gematria: 70,
    classification: "Simple",
    astrological: "Capricorn (Gedi) / Tevet",
    sefirahOrPath: "Binah's sight",
    keyword: "The Eye, Perception",
    uprightMeaning:
      "Ayin means 'eye' — the letter of sight and of the 70 faces of Torah, echoed in the number of nations and of the elders who saw Sinai. Upright, it speaks of clear perception: seeing a situation as it truly is, from more than one face.",
    reversedMeaning:
      "Reversed, Ayin can mark distorted or narrowed sight — a single perspective mistaken for the whole, or an evil eye of envy clouding what could otherwise be seen plainly.",
    hebrewRoot: "עין (ayin) — eye, also 'spring/source'.",
    traditionalSources: ["Sefer Yetzirah 5:1", "Midrash Rabbah, Numbers 13:15"],
  },
  {
    id: "peh",
    order: 17,
    glyph: "פ",
    name: "Peh",
    transliteration: "Peh",
    gematria: 80,
    classification: "Double",
    astrological: "Venus (Nogah)",
    sefirahOrPath: "Hod's mouth",
    keyword: "The Mouth, Grace and Ugliness",
    uprightMeaning:
      "Peh means 'mouth' — the organ of speech that, per the doc's core philosophy, does not predict but illuminates. Upright, it speaks of honest, well-formed speech: words that open a path rather than close one.",
    reversedMeaning:
      "Peh's classical pair is beauty/ugliness. Reversed, it can mark speech turned harsh or silence where words are needed — a mouth closed against its own truth.",
    hebrewRoot: "פה (peh) — mouth.",
    traditionalSources: ["Sefer Yetzirah 4:1–3"],
  },
  {
    id: "tzadi",
    order: 18,
    glyph: "צ",
    name: "Tzadi",
    transliteration: "Tzadi",
    gematria: 90,
    classification: "Simple",
    astrological: "Aquarius (D'li) / Shevat",
    sefirahOrPath: "Yesod-Malchut's uprightness",
    keyword: "The Righteous One, Uprightness",
    uprightMeaning:
      "Tzadi shares its root with tzaddik, the righteous one whose bent form (like a person stooping to lift another) is said to describe humility in service of others. Upright, it speaks of integrity quietly practiced rather than proclaimed.",
    reversedMeaning:
      "Reversed, Tzadi can mark righteousness performed rather than lived — rigid self-righteousness, or a person unable to bend toward another's need.",
    hebrewRoot: "צדיק (tzaddik) — righteous one; צדק (tzedek) — justice.",
    traditionalSources: ["Sefer Yetzirah 5:1"],
  },
  {
    id: "kuf",
    order: 19,
    glyph: "ק",
    name: "Kuf",
    transliteration: "Qof",
    gematria: 100,
    classification: "Simple",
    astrological: "Pisces (Dagim) / Adar",
    sefirahOrPath: "Malchut's holiness or its shadow",
    keyword: "Holiness or its Shadow",
    uprightMeaning:
      "Kuf's descending leg is said to reach toward kedushah (holiness) on one side and kelipah (the husk/shadow) on the other — the letter of a choice between two similar-sounding paths. Upright, it speaks of a person choosing the sacred reading of their own story.",
    reversedMeaning:
      "Reversed, Kuf marks the shadow side of that same choice — a pattern repeated compulsively (kof, 'ape', mimicking rather than originating), or holiness mistaken for its counterfeit.",
    hebrewRoot: "קדוש (kadosh) — holy; קוף (kof) — monkey/imitator.",
    traditionalSources: ["Sefer Yetzirah 5:1"],
  },
  {
    id: "resh",
    order: 20,
    glyph: "ר",
    name: "Resh",
    transliteration: "Resh",
    gematria: 200,
    classification: "Double",
    astrological: "Mercury (Kokhav)",
    sefirahOrPath: "Chochmah's head",
    keyword: "The Head, Peace and War",
    uprightMeaning:
      "Resh means 'head' — the letter of rosh, the beginning and the leading part, as in Rosh Hashanah. Upright, it speaks of clear-headed leadership: a person stepping into responsibility for their own direction.",
    reversedMeaning:
      "Resh's classical pair is peace/war. Reversed, it can mark a mind at war with itself, or leadership exercised without the peace (shalom) that should crown it — also echoed in rasha, the wicked one, a head turned from its own good.",
    hebrewRoot: "ראש (rosh) — head; רש (rash) — poor/wicked.",
    traditionalSources: ["Sefer Yetzirah 4:1–3"],
  },
  {
    id: "shin",
    order: 21,
    glyph: "ש",
    name: "Shin",
    transliteration: "Shin",
    gematria: 300,
    classification: "Mother",
    element: "Fire",
    sefirahOrPath: "Ruach HaKodesh / the consuming and purifying flame",
    keyword: "Fire, Transformation",
    uprightMeaning:
      "Shin is fire, esh — the element of transformation, and the letter inscribed on the tefillin and mezuzah as a name of the Divine. Upright, it speaks of purifying, energizing change: a reading catalyzing real movement in a person's life.",
    reversedMeaning:
      "Reversed, Shin's fire can consume rather than refine — burnout, destructive anger, or change forced faster than a person can integrate it.",
    hebrewRoot: "אש (esh) — fire; שלום (shalom) shares its first letter.",
    traditionalSources: ["Sefer Yetzirah 3:1–2"],
  },
  {
    id: "tav",
    order: 22,
    glyph: "ת",
    name: "Tav",
    transliteration: "Tav",
    gematria: 400,
    classification: "Double",
    astrological: "Moon (Levanah)",
    sefirahOrPath: "Malchut's seal",
    keyword: "The Mark, Dominion and Servitude",
    uprightMeaning:
      "Tav is the last letter — the mark or seal (as in Ezekiel's tav placed on the foreheads of the righteous), the completion of the alphabet's journey from Aleph's silent breath. Upright, it speaks of a covenant sealed, a truth marked as complete and carried forward.",
    reversedMeaning:
      "Tav's classical pair is dominion/servitude. Reversed, it can mark an ending forced or premature — a seal placed before the truth it marks has actually been integrated.",
    hebrewRoot: "תו (tav) — mark, sign; אמת (emet) ends with tav.",
    traditionalSources: ["Sefer Yetzirah 4:1–3", "Ezekiel 9:4"],
  },
];

export const lettersById: Record<string, LetterCard> = Object.fromEntries(
  letters.map((letter) => [letter.id, letter]),
);

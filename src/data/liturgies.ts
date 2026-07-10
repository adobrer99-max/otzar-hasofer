/**
 * Sefer HaTefillot — the Book of Liturgies, organized by occasion.
 *
 * Content posture: the Hebrew/Aramaic texts are short, canonical,
 * traditional formulas in the public domain, given here unvowelized (to
 * avoid niqqud transcription drift) — verify against your own siddur
 * before ritual use. The English renderings and the contemplative Sod
 * prompts are FIRST-DRAFT editorial content in the project's voice, meant
 * to be reworked by the user (the same posture as the letter meanings).
 * No copyrighted modern translations or siddur typesetting are used.
 */

export type LiturgySection = "shabbat" | "holidays" | "fasts" | "festivals" | "life-events";

export const LITURGY_SECTIONS: { id: LiturgySection; title: string; hebrewName: string }[] = [
  { id: "shabbat", title: "Shabbat", hebrewName: "שבת" },
  { id: "holidays", title: "Holidays", hebrewName: "ימים טובים" },
  { id: "fasts", title: "Fasts", hebrewName: "תעניות" },
  { id: "festivals", title: "Festivals & Seasons", hebrewName: "מועדים" },
  { id: "life-events", title: "Life Events", hebrewName: "מעגל החיים" },
];

export interface Liturgy {
  /** Stable id — commentaries reference it (`liturgy:<id>`); never rename. */
  id: string;
  section: LiturgySection;
  title: string;
  hebrewName: string;
  /** The canonical Hebrew/Aramaic text, unvowelized. */
  hebrew: string;
  /** First-draft English rendering in the project's voice. */
  english: string;
  /** When and why this is said — the Remez tier. */
  occasionNote: string;
  /** A contemplative prompt — the Sod tier. First-draft. */
  sodPrompt: string;
}

export const liturgies: Liturgy[] = [
  // ——— Shabbat ———
  {
    id: "shabbat-candles",
    section: "shabbat",
    title: "Kindling the Shabbat Lights",
    hebrewName: "הדלקת נרות",
    hebrew: "ברוך אתה ה' אלהינו מלך העולם, אשר קדשנו במצותיו וצונו להדליק נר של שבת.",
    english:
      "Blessed are You, LORD our God, Sovereign of the world, who has made us holy with commandments and commanded us to kindle the light of Shabbat.",
    occasionNote:
      "Said as the Shabbat candles are lit, before sunset on Friday. The lights are kindled first and the blessing said over them — the one act of the week where the blessing follows the deed.",
    sodPrompt: "What in your week is asking to be set down before the light is lit?",
  },
  {
    id: "kiddush-friday",
    section: "shabbat",
    title: "Friday Night Kiddush (closing blessing)",
    hebrewName: "קידוש ליל שבת",
    hebrew:
      "ברוך אתה ה' אלהינו מלך העולם, בורא פרי הגפן. ברוך אתה ה' אלהינו מלך העולם, אשר קדשנו במצותיו ורצה בנו... כי הוא יום תחלה למקראי קדש, זכר ליציאת מצרים... ברוך אתה ה', מקדש השבת.",
    english:
      "Blessed are You... who creates the fruit of the vine. Blessed are You... who made us holy with commandments and delighted in us... for it is the first of the holy convocations, a remembrance of the going-out from Egypt... Blessed are You, LORD, who makes the Shabbat holy.",
    occasionNote:
      "Sanctification over wine at the Friday night table, preceded by the verses of Vayechulu (Genesis 2:1-3). The middle of the long blessing is abridged here — read it whole from your own siddur.",
    sodPrompt: "Where did creation finish its work in you this week?",
  },
  {
    id: "havdalah",
    section: "shabbat",
    title: "Havdalah (closing blessing)",
    hebrewName: "הבדלה",
    hebrew:
      "ברוך אתה ה' אלהינו מלך העולם, המבדיל בין קדש לחל, בין אור לחשך, בין ישראל לעמים, בין יום השביעי לששת ימי המעשה. ברוך אתה ה', המבדיל בין קדש לחל.",
    english:
      "Blessed are You, LORD our God, Sovereign of the world, who distinguishes between holy and ordinary, between light and darkness, between Israel and the peoples, between the seventh day and the six days of making. Blessed are You, LORD, who distinguishes between holy and ordinary.",
    occasionNote:
      "The close of Shabbat, over wine, spices, and a braided flame — each with its own short blessing before this final one. Distinction itself is blessed: the Second Encounter's separation, spoken weekly.",
    sodPrompt: "What two things in your life must you now let be distinct?",
  },
  // ——— Holidays ———
  {
    id: "yomtov-candles",
    section: "holidays",
    title: "Kindling the Festival Lights",
    hebrewName: "הדלקת נרות ליום טוב",
    hebrew: "ברוך אתה ה' אלהינו מלך העולם, אשר קדשנו במצותיו וצונו להדליק נר של יום טוב.",
    english:
      "Blessed are You, LORD our God, Sovereign of the world, who has made us holy with commandments and commanded us to kindle the festival light.",
    occasionNote: "Said when lighting candles as a Yom Tov begins (with Shehecheyanu added on the first night).",
    sodPrompt: "What does this festival ask you to illuminate that an ordinary evening does not?",
  },
  {
    id: "shehecheyanu",
    section: "holidays",
    title: "Shehecheyanu",
    hebrewName: "שהחיינו",
    hebrew: "ברוך אתה ה' אלהינו מלך העולם, שהחינו וקימנו והגיענו לזמן הזה.",
    english:
      "Blessed are You, LORD our God, Sovereign of the world, who has kept us alive, sustained us, and brought us to this season.",
    occasionNote:
      "Said at firsts: the first night of a festival, a first fruit, a new garment — and in this practice, at a participant's first reading (the Origin Herald).",
    sodPrompt: "Name what you have been carried through to reach this moment.",
  },
  {
    id: "hanukkah-candles",
    section: "holidays",
    title: "Kindling the Hanukkah Lights",
    hebrewName: "הדלקת נרות חנוכה",
    hebrew:
      "ברוך אתה ה' אלהינו מלך העולם, אשר קדשנו במצותיו וצונו להדליק נר של חנכה. ברוך אתה ה' אלהינו מלך העולם, שעשה נסים לאבותינו בימים ההם בזמן הזה.",
    english:
      "Blessed are You... who commanded us to kindle the Hanukkah light. Blessed are You... who worked wonders for our ancestors in those days, at this season.",
    occasionNote: "The two blessings said each of the eight nights (Shehecheyanu added on the first).",
    sodPrompt: "What small light of yours is meant to be placed in the window, not hidden?",
  },
  // ——— Fasts ———
  {
    id: "aneinu",
    section: "fasts",
    title: "Aneinu (opening line)",
    hebrewName: "עננו",
    hebrew: "עננו ה' עננו ביום צום תעניתנו, כי בצרה גדולה אנחנו.",
    english: "Answer us, LORD, answer us on the day of our fast, for we are in great distress.",
    occasionNote:
      "The fast-day insertion in the standing prayer. On Tisha B'Av the Treasury's own practice mirrors the day's severity: the 22 Letters are locked and the Galut deck is drawn.",
    sodPrompt: "What are you finally hungry enough to say plainly?",
  },
  // ——— Festivals & seasons ———
  {
    id: "leishev-basukkah",
    section: "festivals",
    title: "Dwelling in the Sukkah",
    hebrewName: "לישב בסוכה",
    hebrew: "ברוך אתה ה' אלהינו מלך העולם, אשר קדשנו במצותיו וצונו לישב בסכה.",
    english:
      "Blessed are You, LORD our God, Sovereign of the world, who has made us holy with commandments and commanded us to dwell in the sukkah.",
    occasionNote:
      "Said on entering the sukkah to eat during Sukkot — the festival of vulnerability and hospitality, when the Council of Sefirot is drawn.",
    sodPrompt: "Under whose roof — how fragile, how open — are you willing to sit this year?",
  },
  {
    id: "netilat-lulav",
    section: "festivals",
    title: "Taking the Lulav",
    hebrewName: "נטילת לולב",
    hebrew: "ברוך אתה ה' אלהינו מלך העולם, אשר קדשנו במצותיו וצונו על נטילת לולב.",
    english:
      "Blessed are You, LORD our God, Sovereign of the world, who has made us holy with commandments and commanded us concerning the taking of the lulav.",
    occasionNote: "Said before waving the four species on Sukkot.",
    sodPrompt: "Which of the four — spine, heart, eye, mouth — are you holding least tightly?",
  },
  {
    id: "sefirat-haomer",
    section: "festivals",
    title: "Counting the Omer",
    hebrewName: "ספירת העומר",
    hebrew:
      "ברוך אתה ה' אלהינו מלך העולם, אשר קדשנו במצותיו וצונו על ספירת העמר. היום יום אחד לעמר.",
    english:
      "Blessed are You... who commanded us concerning the counting of the Omer. Today is one day of the Omer.",
    occasionNote:
      "Counted nightly for the forty-nine days between Pesach and Shavuot — the count the Sacred Time panel tracks for every reading in season.",
    sodPrompt: "What is being counted toward, one honest day at a time?",
  },
  // ——— Life events ———
  {
    id: "sheva-brachot-seventh",
    section: "life-events",
    title: "The Seventh Wedding Blessing",
    hebrewName: "ברכת חתנים",
    hebrew:
      "ברוך אתה ה' אלהינו מלך העולם, אשר ברא ששון ושמחה, חתן וכלה, גילה רנה דיצה וחדוה, אהבה ואחוה ושלום ורעות... ברוך אתה ה', משמח חתן עם הכלה.",
    english:
      "Blessed are You... who created joy and gladness, groom and bride, mirth and song, delight and rejoicing, love and kinship and peace and companionship... Blessed are You, LORD, who gladdens the groom with the bride.",
    occasionNote:
      "The last of the seven blessings said under the chuppah and through the seven days of Sheva Brachot — the same seven days the Covenantal Herald grows through, Chesed to Malchut.",
    sodPrompt: "Which of the paired joys — love, kinship, peace, companionship — does this union most need tended?",
  },
  {
    id: "mourners-kaddish",
    section: "life-events",
    title: "Mourner's Kaddish (opening)",
    hebrewName: "קדיש יתום",
    hebrew:
      "יתגדל ויתקדש שמה רבא. בעלמא די ברא כרעותה, וימליך מלכותה בחייכון וביומיכון ובחיי דכל בית ישראל, בעגלא ובזמן קריב, ואמרו אמן.",
    english:
      "Magnified and sanctified be the great Name, in the world created according to divine will; may sovereignty be established in your lifetime and your days and the lifetime of all the house of Israel, swiftly and soon — and say: Amen.",
    occasionNote:
      "Aramaic, said by mourners with a minyan through the year of mourning and at every Yahrzeit. It speaks no word of death — only of magnifying the Name. At Yizkor, no reading is done; just this remembrance.",
    sodPrompt: "What do you go on building in the name of the one you remember?",
  },
  {
    id: "birkat-habanim",
    section: "life-events",
    title: "Blessing of the Children",
    hebrewName: "ברכת הבנים",
    hebrew:
      "ישמך אלהים כאפרים וכמנשה. ישמך אלהים כשרה רבקה רחל ולאה. יברכך ה' וישמרך. יאר ה' פניו אליך ויחנך. ישא ה' פניו אליך וישם לך שלום.",
    english:
      "May God make you like Ephraim and Menashe; may God make you like Sarah, Rebecca, Rachel, and Leah. May the LORD bless you and keep you; may the LORD's face shine toward you with grace; may the LORD's face be lifted toward you and set peace upon you.",
    occasionNote:
      "Spoken over children on Friday night, and at a Bris — the child's first page, no conclusions, only blessing. Closes with the priestly blessing of Numbers 6:24-26.",
    sodPrompt: "Whose hands were once laid on your head — and whose head now waits under yours?",
  },
  {
    id: "tefilat-haderech",
    section: "life-events",
    title: "The Traveler's Prayer (closing)",
    hebrewName: "תפלת הדרך",
    hebrew:
      "יהי רצון מלפניך ה' אלהינו ואלהי אבותינו, שתוליכנו לשלום ותצעידנו לשלום ותדריכנו לשלום, ותגיענו למחוז חפצנו לחיים ולשמחה ולשלום... ברוך אתה ה', שומע תפלה.",
    english:
      "May it be Your will, LORD our God and God of our ancestors, to lead us toward peace, to guide our steps toward peace, to bring us to our desired haven — to life, to joy, to peace... Blessed are You, LORD, who hears prayer.",
    occasionNote:
      "Said setting out on a journey — including the threshold journey of Aliyah, after which the reading begins with the Letters alone.",
    sodPrompt: "Toward what haven are your steps actually pointed?",
  },
];

export const liturgiesById: Record<string, Liturgy> = Object.fromEntries(
  liturgies.map((l) => [l.id, l]),
);

export function liturgiesBySection(section: LiturgySection): Liturgy[] {
  return liturgies.filter((l) => l.section === section);
}

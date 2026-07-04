import type { DorotHouse, DorotCard } from "../types/dorot";

/**
 * Derekh Ha'Dorot — the second deck. Where Derekh Eretz reveals the eternal
 * symbolic grammar of Creation, Derekh Ha'Dorot reveals how those eternal
 * principles have been lived throughout the history of Israel. It embodies
 * history: the unit of interpretation is the biblical episode, not the
 * biblical figure, and every card points toward a lived practice and a
 * contemplative question rather than a prediction.
 *
 * Structure, as drafted in the planning doc: seven Pillars (the lower
 * Sefirot), each with a patriarchal House (8 fully-drafted cards: title,
 * episode, human practice, question) and a matriarchal House (16 episodes,
 * each with only an episode name and a "core energy" — much thinner
 * first-draft content awaiting the same enrichment the patriarchal cards
 * already have). 56 + 112 = 168 entries total.
 *
 * Doc discrepancies, and how they were resolved here:
 * - The doc's summary table lists the Hod matriarch as Deborah, but the
 *   fully-drafted matriarchal House is Hannah's ("House of Hannah (Hod) —
 *   The House of Thanksgiving"). The drafted content wins: Hannah.
 * - The doc's "Seven Houses" list says "House of Tiferet = Jacob │ Rebecca
 *   & Leah" — a typo. The detailed Houses are unambiguous: Rebecca is
 *   Gevurah, Rachel & Leah are Tiferet.
 * - The summary table says 8 matriarchal episodes per pillar; the detailed
 *   tables each have 16. The detailed tables win: 16.
 *
 * Per-card "Visual Motif (For the Illustrator)" text exists in the doc but
 * is physical-card art direction with no in-app consumer — deliberately
 * excluded here, the same posture taken with the 22 letters in Round 2.
 */

export const dorotHouses: DorotHouse[] = [
  // ——— Patriarchal Houses ———
  { id: "house-abraham", sefirah: "chesed", kind: "patriarchal", figure: "Abraham" },
  { id: "house-isaac", sefirah: "gevurah", kind: "patriarchal", figure: "Isaac" },
  { id: "house-jacob", sefirah: "tiferet", kind: "patriarchal", figure: "Jacob" },
  { id: "house-moses", sefirah: "netzach", kind: "patriarchal", figure: "Moses" },
  { id: "house-aaron", sefirah: "hod", kind: "patriarchal", figure: "Aaron" },
  { id: "house-joseph", sefirah: "yesod", kind: "patriarchal", figure: "Joseph" },
  { id: "house-david", sefirah: "malchut", kind: "patriarchal", figure: "David" },
  // ——— Matriarchal Houses ———
  {
    id: "house-sarah",
    sefirah: "chesed",
    kind: "matriarchal",
    figure: "Sarah",
    houseName: "The House of Welcome",
    spiritualEnergy: "Hospitality, Promise, Covenant, Faith",
    teaching: "Sarah teaches us to welcome God's promises.",
  },
  {
    id: "house-rebecca",
    sefirah: "gevurah",
    kind: "matriarchal",
    figure: "Rebecca",
    houseName: "The House of Discernment",
    spiritualEnergy: "Wisdom, Courage, Decision",
    teaching: "Rebecca teaches us to discern God's path.",
  },
  {
    id: "house-rachel-leah",
    sefirah: "tiferet",
    kind: "matriarchal",
    figure: "Rachel & Leah",
    houseName: "The House of Becoming",
    spiritualEnergy: "Love, Longing, Fruitfulness, Reconciliation",
    teaching: "Rachel & Leah teach us to become through love and struggle.",
  },
  {
    id: "house-miriam",
    sefirah: "netzach",
    kind: "matriarchal",
    figure: "Miriam",
    houseName: "The House of Song",
    spiritualEnergy: "Joy, Endurance, Prophecy",
    teaching: "Miriam teaches us to sing in liberation and endurance.",
  },
  {
    id: "house-hannah",
    sefirah: "hod",
    kind: "matriarchal",
    figure: "Hannah",
    houseName: "The House of Thanksgiving",
    spiritualEnergy: "Prayer, Gratitude, Consecration",
    teaching: "Hannah teaches us to pray until gratitude overflows.",
  },
  {
    id: "house-tamar",
    sefirah: "yesod",
    kind: "matriarchal",
    figure: "Tamar",
    houseName: "The House of Restoration",
    spiritualEnergy: "Fidelity, Justice, Restoration",
    teaching: "Tamar teaches us to restore what covenant requires.",
  },
  {
    id: "house-ruth",
    sefirah: "malchut",
    kind: "matriarchal",
    figure: "Ruth",
    houseName: "The House of Belonging",
    spiritualEnergy: "Loyalty, Humility, Kingship",
    teaching: "Ruth teaches us to belong through steadfast love.",
  },
];

/** Compact constructor for a patriarchal card. */
function p(
  houseId: string,
  index: number,
  title: string,
  episode: string,
  humanPractice: string,
  question: string,
): DorotCard {
  const figure = houseId.replace("house-", "");
  return { id: `${figure}-${index}`, houseId, index, title, episode, humanPractice, question };
}

/** Compact constructor for a matriarchal episode card (title = episode name). */
function m(houseId: string, index: number, episode: string, coreEnergy: string): DorotCard {
  const figure = houseId.replace("house-", "");
  return { id: `${figure}-${index}`, houseId, index, title: episode, episode, coreEnergy };
}

export const dorotCards: DorotCard[] = [
  // ——— House of Chesed (Abraham) ———
  p(
    "house-abraham",
    1,
    "The Tent",
    "Hospitality at Mamre",
    "Welcoming the Stranger",
    "Where am I being invited to make room for another? What blessing has arrived disguised as interruption? How might generosity become visible in ordinary life today?",
  ),
  p(
    "house-abraham",
    2,
    "The Threshold",
    "Lech Lecha (The Departure from Haran)",
    "Stepping into the Unknown",
    "What familiar comfort or inherited structure must you leave behind to pursue your true calling?",
  ),
  p(
    "house-abraham",
    3,
    "The Diverging Path",
    "The Separation from Lot",
    "Releasing Control / Pursuing Peace",
    "Where are you being asked to yield your preferred outcome or release control for the sake of peace?",
  ),
  p(
    "house-abraham",
    4,
    "The Broken Shackles",
    "The War of the Kings / Rescue of the Captives",
    "Redeeming the Captive (Pidyon Shvuyim)",
    "Who in your sphere of influence is currently trapped, and how are you being called to actively intervene?",
  ),
  p(
    "house-abraham",
    5,
    "The Fire Pot",
    "Brit Bein HaBetarim (The Covenant Between the Parts)",
    "Trusting the Promise in the Dark",
    "Can you remain faithful to the covenant even when you are surrounded by darkness, delay, and uncertainty?",
  ),
  p(
    "house-abraham",
    6,
    "The Raised Hands",
    "Pleading for Sodom",
    "Advocating for the Unworthy / Radical Empathy",
    "Who are you tempted to write off as beyond saving, and how are you being called to intercede for them?",
  ),
  p(
    "house-abraham",
    7,
    "The Ram's Horn",
    "The Akedah (The Binding of Isaac)",
    "Ultimate Surrender / Relinquishing the Beloved",
    "What is the most precious thing you are holding tightly to, and are you willing to place it on the altar to prove it does not possess you?",
  ),
  p(
    "house-abraham",
    8,
    "The Silver Coin",
    "The Purchase of Machpelah",
    "True Kindness (Chesed Shel Emet) / Honoring the Past",
    "How are you honoring those who came before you, and what permanent, unshakeable roots are you planting for the future?",
  ),

  // ——— House of Gevurah (Isaac) ———
  p(
    "house-isaac",
    1,
    "The Bound Cords",
    "The Akedah (From Isaac's perspective)",
    "Willful Restraint / Active Surrender",
    "Where is true strength found in holding back rather than striking out?",
  ),
  p(
    "house-isaac",
    2,
    "The Evening Field",
    "Meditating in the Field (Lasuach basadeh)",
    "Inner Contemplation / Guarding Silence",
    "How are you cultivating your inner life and fiercely guarding your necessary silence?",
  ),
  p(
    "house-isaac",
    3,
    "The Unstopped Well",
    "Re-digging the Wells of Abraham",
    "The Discipline of Maintenance / Reclaiming the Past",
    "What ancestral or foundational truth in your life requires the hard, disciplined work of re-digging?",
  ),
  p(
    "house-isaac",
    4,
    "The Blocked Spring",
    "The Stolen Wells (Esek and Sitnah)",
    "Enduring Opposition / Knowing When to Walk Away",
    "Where must you refuse to engage in a fruitless fight and instead strictly channel your energy elsewhere?",
  ),
  p(
    "house-isaac",
    5,
    "The Wide Expanse",
    "Finding Rehoboth (The Undisputed Well)",
    "Establishing Firm Boundaries / Rootedness",
    "How have your strict boundaries finally created the safe, wide space you need to flourish?",
  ),
  p(
    "house-isaac",
    6,
    "The Hundredfold Harvest",
    "Sowing in the Famine",
    "Faithfulness Under Constraint / Discipline in Scarcity",
    "How can you maintain discipline and continue to plant even when the current season feels like a famine?",
  ),
  p(
    "house-isaac",
    7,
    "The Trembling Hands",
    "The Blessing of Jacob and Esau",
    "The Weight of Judgment / Accepting Consequence",
    "What irreversible truth or consequence must you finally accept, even if it causes you to tremble?",
  ),
  p(
    "house-isaac",
    8,
    "The Shared Tomb",
    "Burying Abraham with Ishmael",
    "Honoring the Boundary of Death / Putting Down Arms",
    "What ancient conflict must be temporarily laid down to honor a shared grief or a higher duty?",
  ),

  // ——— House of Tiferet (Jacob) ———
  p(
    "house-jacob",
    1,
    "The Red Stew",
    "Purchasing the Birthright",
    "Discerning the Eternal from the Appetitive",
    "Where are you tempted to trade a permanent truth or long-term inheritance for the relief of an immediate appetite?",
  ),
  p(
    "house-jacob",
    2,
    "The Stone Pillow",
    "The Dream at Bethel",
    "Connecting the Mundane to the Divine",
    "How can you recognize the presence of the Divine in a place you previously thought was ordinary or desolate?",
  ),
  p(
    "house-jacob",
    3,
    "The Rolled Stone",
    "Uncovering the Well for Rachel",
    "Strength Born of Devotion / Restoring Flow",
    "What impossible weight are you suddenly able to move because your action is motivated by true love or harmony?",
  ),
  p(
    "house-jacob",
    4,
    "The Peeled Branches",
    "Tending Laban's Flocks",
    "Finding Equity in Unfair Systems / Creative Synthesis",
    "How are you being called to use creativity and subtle wisdom to find equity in a system that is stacked against you?",
  ),
  p(
    "house-jacob",
    5,
    "The River Ford",
    "Wrestling at Peniel",
    "Earning the Name / The Blessing of the Wound",
    "What exhausting, all-night struggle must you refuse to let go of until it finally yields its blessing?",
  ),
  p(
    "house-jacob",
    6,
    "The Seven Arcs",
    "The Reconciliation with Esau",
    "Humility to Restore Harmony / Seeing the Divine in the Other",
    "What pride must you bow down—again and again—in order to restore a shattered harmony?",
  ),
  p(
    "house-jacob",
    7,
    "The Woven Tapestry",
    "The Ketonet Passim (The Coat of Many Colors)",
    "The Burden of Favor / Holding Complex Truth",
    "Where is a specialized gift or sign of favor in your life inadvertently creating division or jealousy?",
  ),
  p(
    "house-jacob",
    8,
    "The Crossed Hands",
    "The Blessing of Ephraim and Manasseh",
    "Acknowledging Non-Linear Truth / Paradoxical Blessings",
    "How must you deliberately cross your hands and break with traditional expectations to bless what is actually in front of you?",
  ),

  // ——— House of Netzach (Moses) ———
  p(
    "house-moses",
    1,
    "The Unconsumed Wood",
    "The Burning Bush",
    "Sustaining the Calling / Burning Without Burning Out",
    "How can you sustain your current passion or calling without allowing it to consume your underlying life force?",
  ),
  p(
    "house-moses",
    2,
    "The Raised Staff",
    "The Parting of the Sea",
    "Forging a Path Through the Impossible / Courage Before the Miracle",
    "Where are you being asked to raise your hand and step forward before the path actually opens?",
  ),
  p(
    "house-moses",
    3,
    "The Supported Arms",
    "The Battle with Amalek",
    "Communal Endurance / Relying on Support",
    "What vital task can you no longer endure alone, and whose support must you finally accept to sustain the victory?",
  ),
  p(
    "house-moses",
    4,
    "The Shattered Stone",
    "Breaking the First Tablets",
    "Enduring Disappointment / Breaking the Flawed Vessel",
    "What perfect ideal must be shattered so that you can deal with the flawed reality of the people in front of you?",
  ),
  p(
    "house-moses",
    5,
    "The Cleft of the Rock",
    "The Revelation of God's Back",
    "Enduring Partial Understanding / The Limits of Vision",
    "Can you endure the reality of only seeing the aftermath of the truth, rather than grasping the whole picture?",
  ),
  p(
    "house-moses",
    6,
    "The Veiled Glow",
    "Wearing the Veil (Masveh)",
    "Shielding Others / The Burden of Transformation",
    "How must you modulate or veil your own transformation or intensity so that you do not overwhelm those you are trying to lead?",
  ),
  p(
    "house-moses",
    7,
    "The Coiled Bronze",
    "The Bronze Serpent (Nehushtan)",
    "Facing the Source of Pain / Transforming Poison into Cure",
    "What source of pain or toxicity must you look directly at in order to finally begin your healing?",
  ),
  p(
    "house-moses",
    8,
    "The Uncrossed River",
    "The View from Mount Nebo",
    "Enduring the Unfinished Work / Passing the Baton",
    "Can you find peace in the endurance of doing the hard work, even knowing you will not be the one to cross the finish line?",
  ),

  // ——— House of Hod (Aaron) ———
  p(
    "house-aaron",
    1,
    "The Speaker's Mouth",
    "Becoming the Mouthpiece for Moses",
    "Humility in Service / Amplifying Another",
    "Where are you being called to set aside your own ego to act as the voice or amplifier for someone else's vision?",
  ),
  p(
    "house-aaron",
    2,
    "The Molten Gold",
    "The Forging of the Golden Calf",
    "Misplaced Submission / The Danger of Pleasing the Crowd",
    "Where has your empathy or desire to keep the peace caused you to yield to a destructive demand?",
  ),
  p(
    "house-aaron",
    3,
    "The Silent Censer",
    "The Death of Nadab and Abihu",
    "Radical Silence (Vayidom Aharon) / Accepting the Incomprehensible",
    "What devastating reality must you simply absorb in total silence, resisting the urge to explain, justify, or argue?",
  ),
  p(
    "house-aaron",
    4,
    "The Twelve Stones",
    "Wearing the Choshen (Breastplate of Judgment)",
    "Bearing the Burden of the Community / Holding Space",
    "Whose names are you currently carrying over your heart, and how are you bearing the weight of their judgment and care?",
  ),
  p(
    "house-aaron",
    5,
    "The Tended Flame",
    "Lighting the Menorah",
    "Quiet Faithfulness / The Daily Liturgy",
    "What sacred, daily routine requires your quiet, meticulous maintenance, even when no one is watching?",
  ),
  p(
    "house-aaron",
    6,
    "The Cloud of Incense",
    "Stopping the Plague",
    "Standing in the Gap / Courageous Empathy",
    "Where are you being asked to courageously stand between the living and the dead to halt the spread of destruction in your community?",
  ),
  p(
    "house-aaron",
    7,
    "The Almond Blossoms",
    "The Budding Staff",
    "Organic Authority / Vindicated by Fruitfulness",
    "Are you trying to force your authority, or are you allowing your true calling to be vindicated naturally by its own fruitfulness?",
  ),
  p(
    "house-aaron",
    8,
    "The Transferred Robes",
    "Death at Mount Hor",
    "Relinquishing Identity / The Final Submission",
    "What title, role, or identity must you graciously strip away and hand to the next generation?",
  ),

  // ——— House of Yesod (Joseph) ———
  p(
    "house-joseph",
    1,
    "The Bowing Sheaves",
    "The Childhood Dreams",
    "Holding the Vision / The Danger of Premature Revelation",
    "What vision of the future must you hold onto, even if sharing it right now will only provoke hostility?",
  ),
  p(
    "house-joseph",
    2,
    "The Dry Cistern",
    "Sold by His Brothers",
    "Enduring Betrayal / The Descent into the Pit",
    "How do you maintain your foundation when those closest to you have thrown you into the dark?",
  ),
  p(
    "house-joseph",
    3,
    "The Discarded Garment",
    "Fleeing Potiphar's Wife",
    "Fleeing Temptation / Protecting the Core",
    "What temporary comfort, position, or outer garment must you leave behind to protect your spiritual integrity?",
  ),
  p(
    "house-joseph",
    4,
    "The Squeezed Vine",
    "Imprisoned in Egypt",
    "Helping Others While in the Pit / Using Your Gifts in Exile",
    "How can you continue to use your gifts to interpret and bless the lives of others, even while you are still trapped in your own waiting period?",
  ),
  p(
    "house-joseph",
    5,
    "The Blighted Grain",
    "Interpreting Pharaoh's Dreams",
    "Discerning the Cycle / Speaking Truth to Power",
    "Can you clearly read the signs of the coming cycle, and do you have the courage to tell the authorities what they need to hear?",
  ),
  p(
    "house-joseph",
    6,
    "The Overflowing Storehouse",
    "Gathering the Bread",
    "Preparation for the Famine / The Discipline of Saving",
    "What must you aggressively gather and store right now during a season of plenty so that you will survive the inevitable season of lack?",
  ),
  p(
    "house-joseph",
    7,
    "The Silver Cup",
    "The Divination Cup in Benjamin's Sack",
    "Testing True Repentance / The Pressure of the Past",
    "What hidden test must be orchestrated to reveal whether someone has truly changed from their past behavior?",
  ),
  p(
    "house-joseph",
    8,
    "The Cast-Off Crown",
    "Revealing Himself to His Brothers",
    "Stripping the Mask / Radical Forgiveness",
    "What carefully constructed mask of authority or success must you finally take off to allow for true reconciliation?",
  ),

  // ——— House of Malchut (David) ———
  p(
    "house-david",
    1,
    "The Shepherd's Sling",
    "The Battle with Goliath",
    "Facing the Overwhelming / Using the Tools at Hand",
    "What giant stands before you, and are you willing to trust the simple tools you already possess?",
  ),
  p(
    "house-david",
    2,
    "The Anointing Horn",
    "Samuel Anointing David",
    "Accepting the Hidden Call / Trusting the Unseen Election",
    "Have you received a call that feels impossible, and how are you preparing for a future that no one else yet sees?",
  ),
  p(
    "house-david",
    3,
    "The Empty Harp",
    "Playing Before Saul",
    "The Healing Power of Expression / Navigating High-Stakes Environments",
    "How can you use your voice or craft to bring sanity and harmony to a situation that is spiraling out of control?",
  ),
  p(
    "house-david",
    4,
    "The Cave of Adullam",
    "Gathering the Disaffected",
    "Building Community in the Margins / Leadership Without a Throne",
    "How can you build a sanctuary for those who have been marginalized or cast aside, even when you have no formal authority?",
  ),
  p(
    "house-david",
    5,
    "The Unbuilt Temple",
    "The Desire to Build the Temple",
    "Loving the Vision Without Possessing the Outcome",
    "Can you dedicate your life to a sacred goal even if you know you will never live to see it completed?",
  ),
  p(
    "house-david",
    6,
    "The Rent Garment",
    "The Sin with Bathsheba and the Rebuke of Nathan",
    "Total Accountability / Hearing the Truth",
    "When you are confronted with the undeniable truth of your own failure, do you cover it up or allow your defenses to be torn apart?",
  ),
  p(
    "house-david",
    7,
    "The Barefoot Ascent",
    "Fleeing Absalom",
    "Humility in Loss / Accepting the Cycle of Power",
    "What status or power must you be willing to lose in order to preserve your own soul?",
  ),
  p(
    "house-david",
    8,
    "The Altar of Araunah",
    "Purchasing the Threshing Floor",
    "Establishing the Place of Atonement / Investing in the Future",
    "How are you dedicating the mundane work of your daily life to be the place where the Divine presence is eventually recognized?",
  ),

  // ——— House of Sarah (Chesed) — The House of Welcome ———
  m("house-sarah", 1, "The Call to Leave Haran", "Trusting the unknown"),
  m("house-sarah", 2, "Journey into Canaan", "Pilgrimage"),
  m("house-sarah", 3, "Sarah in Egypt", "Vulnerability"),
  m("house-sarah", 4, "The Promise Renewed", "Hope"),
  m("house-sarah", 5, "Hospitality at Mamre", "Radical welcome"),
  m("house-sarah", 6, "The Three Visitors", "Receiving the Divine"),
  m("house-sarah", 7, "Sarah Laughs", "Wonder"),
  m("house-sarah", 8, "Birth of Isaac", "Fulfillment"),
  m("house-sarah", 9, "Hagar and Ishmael", "Difficult discernment"),
  m("house-sarah", 10, "Weaning Feast", "Celebration"),
  m("house-sarah", 11, "Sarah's Protection of the Covenant", "Responsibility"),
  m("house-sarah", 12, "The Akedah's Shadow", "Silent faith"),
  m("house-sarah", 13, "Sarah's Death", "Legacy"),
  m("house-sarah", 14, "Cave of Machpelah", "Sacred inheritance"),
  m("house-sarah", 15, "Mother of Israel", "Enduring covenant"),
  m("house-sarah", 16, "Remembering Sarah", "Hospitality as vocation"),

  // ——— House of Rebecca (Gevurah) — The House of Discernment ———
  m("house-rebecca", 1, "Rebecca at the Well", "Generosity"),
  m("house-rebecca", 2, "Leaving Her Family", "Courage"),
  m("house-rebecca", 3, "Marriage to Isaac", "Covenant"),
  m("house-rebecca", 4, "Barrenness", "Waiting"),
  m("house-rebecca", 5, "Inquiry of the Lord", "Seeking wisdom"),
  m("house-rebecca", 6, "\"Two Nations Within You\"", "Discernment"),
  m("house-rebecca", 7, "Jacob and Esau", "Complexity"),
  m("house-rebecca", 8, "Preparing Jacob", "Initiative"),
  m("house-rebecca", 9, "Receiving Isaac's Blessing", "Risk"),
  m("house-rebecca", 10, "Jacob Sent Away", "Protection"),
  m("house-rebecca", 11, "Mourning Separation", "Sacrifice"),
  m("house-rebecca", 12, "Rebecca's Silence", "Hidden grief"),
  m("house-rebecca", 13, "Mother of Two Nations", "Legacy"),
  m("house-rebecca", 14, "Covenant Preserved", "Faithfulness"),
  m("house-rebecca", 15, "Discernment Remembered", "Wisdom"),
  m("house-rebecca", 16, "Blessing Through Courage", "Moral resolve"),

  // ——— House of Rachel & Leah (Tiferet) — The House of Becoming ———
  m("house-rachel-leah", 1, "Jacob Meets Rachel", "Love"),
  m("house-rachel-leah", 2, "The Seven Years", "Patience"),
  m("house-rachel-leah", 3, "Leah's Marriage", "Unexpectedness"),
  m("house-rachel-leah", 4, "Rachel's Longing", "Desire"),
  m("house-rachel-leah", 5, "Leah Names Reuben", "Hope"),
  m("house-rachel-leah", 6, "Judah is Born", "Praise"),
  m("house-rachel-leah", 7, "Bilhah and Zilpah", "Complexity"),
  m("house-rachel-leah", 8, "Mandrakes", "Desire and negotiation"),
  m("house-rachel-leah", 9, "Joseph is Born", "Renewal"),
  m("house-rachel-leah", 10, "Journey Home", "Faith"),
  m("house-rachel-leah", 11, "Rachel's Theft of the Teraphim", "Ambiguity"),
  m("house-rachel-leah", 12, "Benjamin's Birth", "Costly love"),
  m("house-rachel-leah", 13, "Rachel's Death", "Grief"),
  m("house-rachel-leah", 14, "Leah's Quiet Legacy", "Hidden fruitfulness"),
  m("house-rachel-leah", 15, "Mothers of Israel", "Covenant fulfilled"),
  m("house-rachel-leah", 16, "Beauty Through Brokenness", "Integration"),

  // ——— House of Miriam (Netzach) — The House of Song ———
  m("house-miriam", 1, "Watching the Basket", "Vigilance"),
  m("house-miriam", 2, "Speaking to Pharaoh's Daughter", "Courage"),
  m("house-miriam", 3, "Nursing Moses", "Wisdom"),
  m("house-miriam", 4, "Sister of the Deliverer", "Faithfulness"),
  m("house-miriam", 5, "The Exodus", "Liberation"),
  m("house-miriam", 6, "Song at the Sea", "Celebration"),
  m("house-miriam", 7, "Timbrel and Dance", "Joy"),
  m("house-miriam", 8, "Prophetess of Israel", "Inspiration"),
  m("house-miriam", 9, "Speaking Against Moses", "Human frailty"),
  m("house-miriam", 10, "Miriam's Affliction", "Humility"),
  m("house-miriam", 11, "Waiting Seven Days", "Communal compassion"),
  m("house-miriam", 12, "Miriam's Well", "Sustenance"),
  m("house-miriam", 13, "Death of Miriam", "Loss"),
  m("house-miriam", 14, "Waters Cease", "Absence"),
  m("house-miriam", 15, "Remembering Miriam", "Endurance"),
  m("house-miriam", 16, "The Song Continues", "Hope"),

  // ——— House of Hannah (Hod) — The House of Thanksgiving ———
  m("house-hannah", 1, "Pilgrimage to Shiloh", "Faithfulness"),
  m("house-hannah", 2, "Hannah's Sorrow", "Honest lament"),
  m("house-hannah", 3, "Silent Prayer", "Interior devotion"),
  m("house-hannah", 4, "Eli's Misunderstanding", "Being unseen"),
  m("house-hannah", 5, "\"I Am a Woman of Sorrowful Spirit\"", "Integrity"),
  m("house-hannah", 6, "The Vow", "Consecration"),
  m("house-hannah", 7, "Samuel Conceived", "Hope fulfilled"),
  m("house-hannah", 8, "Nursing Samuel", "Nurture"),
  m("house-hannah", 9, "Returning to Shiloh", "Letting go"),
  m("house-hannah", 10, "Presenting Samuel", "Offering"),
  m("house-hannah", 11, "Hannah's Song", "Thanksgiving"),
  m("house-hannah", 12, "God Remembers Hannah", "Grace"),
  m("house-hannah", 13, "Additional Children", "Abundance"),
  m("house-hannah", 14, "Mother of a Prophet", "Legacy"),
  m("house-hannah", 15, "Prayer Remembered", "Faithfulness"),
  m("house-hannah", 16, "Thanksgiving Without End", "Praise"),

  // ——— House of Tamar (Yesod) — The House of Restoration ———
  m("house-tamar", 1, "Marriage to Er", "Covenant"),
  m("house-tamar", 2, "Widowhood", "Loss"),
  m("house-tamar", 3, "Waiting for Shelah", "Patience"),
  m("house-tamar", 4, "Judah's Failure", "Broken responsibility"),
  m("house-tamar", 5, "Tamar's Decision", "Courage"),
  m("house-tamar", 6, "The Veil", "Hiddenness"),
  m("house-tamar", 7, "The Encounter", "Risk"),
  m("house-tamar", 8, "The Signet, Cord and Staff", "Evidence"),
  m("house-tamar", 9, "Accusation", "Vulnerability"),
  m("house-tamar", 10, "\"She Is More Righteous Than I\"", "Vindication"),
  m("house-tamar", 11, "Perez and Zerah", "New beginnings"),
  m("house-tamar", 12, "Restoring the Line", "Continuity"),
  m("house-tamar", 13, "Ancestor of Kings", "Legacy"),
  m("house-tamar", 14, "Quiet Righteousness", "Hidden virtue"),
  m("house-tamar", 15, "Covenant Preserved", "Faithfulness"),
  m("house-tamar", 16, "Restoration Accomplished", "Hope"),

  // ——— House of Ruth (Malchut) — The House of Belonging ———
  m("house-ruth", 1, "Famine in Bethlehem", "Exile"),
  m("house-ruth", 2, "Widowhood", "Loss"),
  m("house-ruth", 3, "\"Where You Go, I Will Go\"", "Covenant loyalty"),
  m("house-ruth", 4, "Return to Bethlehem", "Homecoming"),
  m("house-ruth", 5, "Gleaning the Fields", "Humility"),
  m("house-ruth", 6, "Meeting Boaz", "Providence"),
  m("house-ruth", 7, "Kindness Recognized", "Grace"),
  m("house-ruth", 8, "The Threshing Floor", "Trust"),
  m("house-ruth", 9, "The Redeemer's Gate", "Justice"),
  m("house-ruth", 10, "Marriage to Boaz", "Restoration"),
  m("house-ruth", 11, "Birth of Obed", "Renewal"),
  m("house-ruth", 12, "Naomi Restored", "Healing"),
  m("house-ruth", 13, "Great-Grandmother of David", "Legacy"),
  m("house-ruth", 14, "The Moabite Welcomed", "Inclusion"),
  m("house-ruth", 15, "House of David", "Kingship"),
  m("house-ruth", 16, "Belonging Remembered", "Covenant fulfilled"),
];

export const dorotHousesById: Record<string, DorotHouse> = Object.fromEntries(
  dorotHouses.map((h) => [h.id, h]),
);

export const dorotCardsById: Record<string, DorotCard> = Object.fromEntries(
  dorotCards.map((c) => [c.id, c]),
);

export function cardsByHouse(houseId: string): DorotCard[] {
  return dorotCards.filter((c) => c.houseId === houseId);
}

/** Both Houses (patriarchal + matriarchal) of one pillar, in that order. */
export function housesBySefirah(sefirah: string): DorotHouse[] {
  return dorotHouses.filter((h) => h.sefirah === sefirah);
}

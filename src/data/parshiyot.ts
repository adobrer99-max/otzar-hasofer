/**
 * The 54 weekly Torah portions (parshiyot) of the annual cycle, in reading
 * order, with the seven pairs that may be combined ("doubled") in years
 * with fewer available Shabbatot. Vezot Haberachah (54) is read on Simchat
 * Torah itself, never on an ordinary Shabbat.
 *
 * Names and pairs are canonical/fixed public knowledge. The scheduling
 * logic that uses them lives in `parsha.ts`.
 */

export interface Parsha {
  /** 1-based position in the cycle. */
  order: number;
  id: string;
  name: string;
  hebrewName: string;
}

export const PARSHIYOT: Parsha[] = [
  { order: 1, id: "bereshit", name: "Bereshit", hebrewName: "בראשית" },
  { order: 2, id: "noach", name: "Noach", hebrewName: "נח" },
  { order: 3, id: "lech-lecha", name: "Lech-Lecha", hebrewName: "לך לך" },
  { order: 4, id: "vayera", name: "Vayera", hebrewName: "וירא" },
  { order: 5, id: "chayei-sarah", name: "Chayei Sarah", hebrewName: "חיי שרה" },
  { order: 6, id: "toldot", name: "Toldot", hebrewName: "תולדות" },
  { order: 7, id: "vayetzei", name: "Vayetzei", hebrewName: "ויצא" },
  { order: 8, id: "vayishlach", name: "Vayishlach", hebrewName: "וישלח" },
  { order: 9, id: "vayeshev", name: "Vayeshev", hebrewName: "וישב" },
  { order: 10, id: "miketz", name: "Miketz", hebrewName: "מקץ" },
  { order: 11, id: "vayigash", name: "Vayigash", hebrewName: "ויגש" },
  { order: 12, id: "vayechi", name: "Vayechi", hebrewName: "ויחי" },
  { order: 13, id: "shemot", name: "Shemot", hebrewName: "שמות" },
  { order: 14, id: "vaera", name: "Va'era", hebrewName: "וארא" },
  { order: 15, id: "bo", name: "Bo", hebrewName: "בא" },
  { order: 16, id: "beshalach", name: "Beshalach", hebrewName: "בשלח" },
  { order: 17, id: "yitro", name: "Yitro", hebrewName: "יתרו" },
  { order: 18, id: "mishpatim", name: "Mishpatim", hebrewName: "משפטים" },
  { order: 19, id: "terumah", name: "Terumah", hebrewName: "תרומה" },
  { order: 20, id: "tetzaveh", name: "Tetzaveh", hebrewName: "תצוה" },
  { order: 21, id: "ki-tisa", name: "Ki Tisa", hebrewName: "כי תשא" },
  { order: 22, id: "vayakhel", name: "Vayakhel", hebrewName: "ויקהל" },
  { order: 23, id: "pekudei", name: "Pekudei", hebrewName: "פקודי" },
  { order: 24, id: "vayikra", name: "Vayikra", hebrewName: "ויקרא" },
  { order: 25, id: "tzav", name: "Tzav", hebrewName: "צו" },
  { order: 26, id: "shemini", name: "Shemini", hebrewName: "שמיני" },
  { order: 27, id: "tazria", name: "Tazria", hebrewName: "תזריע" },
  { order: 28, id: "metzora", name: "Metzora", hebrewName: "מצורע" },
  { order: 29, id: "acharei-mot", name: "Acharei Mot", hebrewName: "אחרי מות" },
  { order: 30, id: "kedoshim", name: "Kedoshim", hebrewName: "קדושים" },
  { order: 31, id: "emor", name: "Emor", hebrewName: "אמור" },
  { order: 32, id: "behar", name: "Behar", hebrewName: "בהר" },
  { order: 33, id: "bechukotai", name: "Bechukotai", hebrewName: "בחוקותי" },
  { order: 34, id: "bemidbar", name: "Bemidbar", hebrewName: "במדבר" },
  { order: 35, id: "naso", name: "Naso", hebrewName: "נשא" },
  { order: 36, id: "behaalotcha", name: "Beha'alotcha", hebrewName: "בהעלותך" },
  { order: 37, id: "shlach", name: "Shlach", hebrewName: "שלח לך" },
  { order: 38, id: "korach", name: "Korach", hebrewName: "קרח" },
  { order: 39, id: "chukat", name: "Chukat", hebrewName: "חוקת" },
  { order: 40, id: "balak", name: "Balak", hebrewName: "בלק" },
  { order: 41, id: "pinchas", name: "Pinchas", hebrewName: "פינחס" },
  { order: 42, id: "matot", name: "Matot", hebrewName: "מטות" },
  { order: 43, id: "masei", name: "Masei", hebrewName: "מסעי" },
  { order: 44, id: "devarim", name: "Devarim", hebrewName: "דברים" },
  { order: 45, id: "vaetchanan", name: "Va'etchanan", hebrewName: "ואתחנן" },
  { order: 46, id: "eikev", name: "Eikev", hebrewName: "עקב" },
  { order: 47, id: "reeh", name: "Re'eh", hebrewName: "ראה" },
  { order: 48, id: "shoftim", name: "Shoftim", hebrewName: "שופטים" },
  { order: 49, id: "ki-teitzei", name: "Ki Teitzei", hebrewName: "כי תצא" },
  { order: 50, id: "ki-tavo", name: "Ki Tavo", hebrewName: "כי תבוא" },
  { order: 51, id: "nitzavim", name: "Nitzavim", hebrewName: "נצבים" },
  { order: 52, id: "vayelech", name: "Vayelech", hebrewName: "וילך" },
  { order: 53, id: "haazinu", name: "Ha'azinu", hebrewName: "האזינו" },
  { order: 54, id: "vezot-haberachah", name: "Vezot Haberachah", hebrewName: "וזאת הברכה" },
];

export const parshiyotByOrder: Record<number, Parsha> = Object.fromEntries(
  PARSHIYOT.map((p) => [p.order, p]),
);

/**
 * The seven pairs that may be read together, identified by the first
 * portion's order. Early pairs (before Bemidbar): Vayakhel–Pekudei,
 * Tazria–Metzora, Acharei–Kedoshim, Behar–Bechukotai. Late pairs (in the
 * summer): Chukat–Balak, Matot–Masei. Nitzavim–Vayeilech combines at the
 * year's end when only one Shabbat remains after Rosh Hashanah.
 */
export const DOUBLING_PAIRS = {
  vayakhelPekudei: 22,
  tazriaMetzora: 27,
  achareiKedoshim: 29,
  beharBechukotai: 32,
  chukatBalak: 39,
  matotMasei: 42,
  nitzavimVayelech: 51,
} as const;

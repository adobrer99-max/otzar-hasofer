import { describe, expect, it } from "vitest";
import { anniversaryGregorian, anniversaryInYear, isAnniversary } from "./hebrewAnniversary";

describe("anniversaryInYear", () => {
  it("keeps an ordinary date as written", () => {
    expect(anniversaryInYear({ year: 5750, month: "Nisan", day: 15 }, 5786)).toEqual({
      year: 5786,
      month: "Nisan",
      day: 15,
    });
  });

  it("keeps a common-year Adar birthday in Adar II in a leap year", () => {
    expect(anniversaryInYear({ year: 5751, month: "Adar", day: 14 }, 5787).month).toBe("AdarII");
  });

  it("keeps Adar I and Adar II birthdays in their own month in a leap year", () => {
    expect(anniversaryInYear({ year: 5784, month: "AdarI", day: 10 }, 5787).month).toBe("AdarI");
    expect(anniversaryInYear({ year: 5784, month: "AdarII", day: 10 }, 5787).month).toBe("AdarII");
  });

  it("folds either Adar into the one Adar in a common year", () => {
    expect(anniversaryInYear({ year: 5784, month: "AdarI", day: 10 }, 5786).month).toBe("Adar");
    expect(anniversaryInYear({ year: 5784, month: "AdarII", day: 10 }, 5786).month).toBe("Adar");
  });

  it("moves a missing 30th to the 1st of the next month (5786 has a 29-day Cheshvan)", () => {
    expect(anniversaryInYear({ year: 5780, month: "Cheshvan", day: 30 }, 5786)).toEqual({
      year: 5786,
      month: "Kislev",
      day: 1,
    });
    expect(anniversaryInYear({ year: 5780, month: "Cheshvan", day: 30 }, 5787).day).toBe(30);
    expect(anniversaryInYear({ year: 5780, month: "Kislev", day: 30 }, 5784)).toEqual({
      year: 5784,
      month: "Tevet",
      day: 1,
    });
  });

  it("puts 30 Adar I on 1 Adar in a common year", () => {
    expect(anniversaryInYear({ year: 5784, month: "AdarI", day: 30 }, 5786)).toEqual({
      year: 5786,
      month: "Adar",
      day: 1,
    });
  });
});

describe("anniversaryGregorian", () => {
  it("lands on the civil date of that Hebrew day", () => {
    const d = anniversaryGregorian({ year: 5750, month: "Nisan", day: 15 }, 5786);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 4, 2]);
  });
});

describe("isAnniversary", () => {
  it("recognises an Adar I birthday in a common year's Adar", () => {
    expect(isAnniversary({ year: 5784, month: "AdarI", day: 10 }, { year: 5786, month: "Adar", day: 10 })).toBe(true);
  });

  it("recognises a 30 Cheshvan birthday on 1 Kislev when Cheshvan is short", () => {
    expect(isAnniversary({ year: 5780, month: "Cheshvan", day: 30 }, { year: 5786, month: "Kislev", day: 1 })).toBe(true);
    expect(isAnniversary({ year: 5780, month: "Cheshvan", day: 30 }, { year: 5787, month: "Kislev", day: 1 })).toBe(false);
  });
});

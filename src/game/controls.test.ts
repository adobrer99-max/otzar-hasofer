import { describe, expect, it } from "vitest";
import { abilities } from "./abilities";
import {
  ACT_ORDER,
  abilitiesFor,
  BARRIER_OF,
  CONTROLS,
  KEY_MAP,
  PAD_LAYOUT,
  type ControlId,
} from "./controls";
import { TILE_KEY } from "./world/tiles";
import { NO_INPUT } from "./world/types";

/**
 * The bindings, the touch pad and the reference panel are all generated from
 * `CONTROLS`, which only helps if `CONTROLS` is itself complete. These are the
 * checks that make it so — in particular the second one, which is the failure
 * this whole change exists to make impossible: the pad shipped for months with
 * five of the seven controls, and the two it left out were the ones Kuf and
 * Tet need.
 */
describe("the control scheme", () => {
  it("covers every input the simulation reads, exactly once", () => {
    const inputs = Object.keys(NO_INPUT).filter((k) => k !== "jumpHeld");
    const ids = CONTROLS.map((c) => c.id);
    expect([...ids].sort()).toEqual([...inputs].sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every control a touch button, so nothing is keyboard-only", () => {
    const onPad = PAD_LAYOUT.flatMap((cluster) => cluster.ids);
    expect([...onPad].sort()).toEqual(CONTROLS.map((c) => c.id).sort());
    for (const control of CONTROLS) {
      expect(control.pad, `${control.id} needs a pad glyph`).toBeTruthy();
    }
  });

  it("binds every key code to exactly one control", () => {
    const codes = CONTROLS.flatMap((c) => c.codes);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(KEY_MAP[code]).toBeTypeOf("string");
    }
    expect(Object.keys(KEY_MAP)).toHaveLength(codes.length);
  });

  it("prints a key for every code it binds", () => {
    for (const control of CONTROLS) {
      expect(control.keys.length, `${control.id} prints no keys`).toBeGreaterThan(0);
      // Shift is one key with two codes, so keys may be fewer than codes —
      // never more, which would mean printing a binding that does not exist.
      expect(control.keys.length).toBeLessThanOrEqual(control.codes.length);
    }
  });
});

describe("what the letters say about their keys", () => {
  it("gives every ability a line naming its key, or saying there is none", () => {
    for (const ability of abilities) {
      expect(ability.press, `${ability.letterId} has no press line`).toBeTruthy();
      expect(ability.press.length, `${ability.letterId}'s press line is too terse`).toBeGreaterThan(12);
    }
  });

  it("names only real controls", () => {
    const ids = new Set<string>(CONTROLS.map((c) => c.id));
    for (const ability of abilities) {
      for (const control of ability.controls ?? []) {
        expect(ids.has(control), `${ability.letterId} names unknown control "${control}"`).toBe(true);
      }
    }
  });

  it("binds every verb that the act key resolves", () => {
    const onAct = abilitiesFor("act")
      .map((a) => a.verb)
      .filter(Boolean);
    expect([...onAct].sort()).toEqual([...ACT_ORDER].sort());
  });

  it("lists the act key's jobs in the order the simulation resolves them", () => {
    // Kaf carries no verb of its own — it only widens what Bet's stone can do —
    // so it sorts to the end rather than into the precedence.
    const order = abilitiesFor("act")
      .map((a) => a.verb)
      .filter(Boolean);
    expect(order).toEqual(ACT_ORDER);
  });

  it("names in the sentence exactly the controls it declares", () => {
    // The press line is rendered by substituting `{jump}` and friends, so a
    // token that is not in `controls` would print a key the panel never lists,
    // and a control with no token would list a letter under a key its own
    // instruction never mentions.
    for (const ability of abilities) {
      const tokens = [...ability.press.matchAll(/\{([a-z]+)\}/g)].map((m) => m[1]);
      expect(
        new Set(tokens),
        `${ability.letterId}: press tokens and controls disagree`,
      ).toEqual(new Set(ability.controls ?? []));
    }
  });

  it("leaves a control unnamed only when nothing is pressed for it", () => {
    // Every ability that says "No key" must have no control, and every one
    // that names a control must not say there is no key.
    for (const ability of abilities) {
      const saysNone = /^No key/i.test(ability.press);
      const hasControl = (ability.controls?.length ?? 0) > 0;
      expect(saysNone, `${ability.letterId}: press line and controls disagree`).toBe(!hasControl);
    }
  });
});

describe("the barriers and the letters that answer them", () => {
  it("describes every verb the tile table names, and nothing else", () => {
    const fromTiles = new Set<string>(Object.values(TILE_KEY).filter(Boolean) as string[]);
    expect(new Set(Object.keys(BARRIER_OF))).toEqual(fromTiles);
  });

  it("does not describe a barrier for a verb with no letter", () => {
    const verbs = new Set(abilities.map((a) => a.verb).filter(Boolean));
    for (const key of Object.keys(BARRIER_OF)) {
      // `crawl` is a grace rather than a verb; everything else must be one.
      if (key === "crawl") continue;
      expect(verbs.has(key as never), `no letter carries "${key}"`).toBe(true);
    }
  });
});

describe("what a key will come to serve", () => {
  it("puts every ability that names a control under that control", () => {
    for (const ability of abilities) {
      for (const control of ability.controls ?? []) {
        const listed = abilitiesFor(control as ControlId).map((a) => a.letterId);
        expect(listed).toContain(ability.letterId);
      }
    }
  });
});

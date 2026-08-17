/**
 * **A recording canvas** — the only way anything in this repo can assert what
 * was *drawn*.
 *
 * The renderer's helpers run under node and there is no canvas in the suite, so
 * the interesting claims about a painter — that four states are four pictures,
 * that two creatures are not the same creature, that a scene moves — cannot be
 * made by looking at pixels. This writes down every call and every style set in
 * order, which is enough to say whether two pictures are the *same* picture
 * without being able to see either.
 *
 * It lives here rather than inside a test file because two painters need it now:
 * `husks.test.ts`, which found `charging` drawn identically to not-charging, and
 * `scene.test.ts`, which has the same question to ask about sixteen scenes and
 * would otherwise have a second copy of it to drift from.
 *
 * **Not shipped**, and nothing has to enforce that: no module the app imports
 * imports this one, so it is absent from the bundle by construction rather than
 * by a flag — the same argument `world/probes.ts` makes for itself.
 *
 * Note what it is *not*: a claim about a particular picture. Every test built on
 * it asserts a **difference**, because a test that pinned a halo would have to
 * be rewritten whenever the halo changed and would then be pinning whatever it
 * was last rewritten to.
 */
export function recorder(): { ctx: CanvasRenderingContext2D; log: () => string } {
  const calls: string[] = [];
  // Rounded, or a picture differs from itself on the last bit of a float and
  // every comparison below becomes noise.
  const round = (v: unknown) => (typeof v === "number" ? Math.round(v * 100) / 100 : v);
  const target = {} as Record<string, unknown>;

  /**
   * **A gradient records too**, and it has to.
   *
   * Every call on the naive proxy returns `undefined`, so
   * `createRadialGradient(...).addColorStop(...)` threw — and the temptation is
   * to guard the *painter*, which would be the instrument dictating terms to
   * the thing it measures. A gradient is a lamp's whole glow and its stops are
   * as much the picture as the arc under them; a harness that could not see one
   * would call a lamp that changed colour the same lamp.
   */
  let gradients = 0;
  const gradient = () => {
    const id = gradients++;
    calls.push(`gradient#${id}`);
    return {
      addColorStop: (at: number, colour: string) => calls.push(`  stop#${id}(${round(at)},${colour})`),
    } as unknown as CanvasGradient;
  };

  const ctx = new Proxy(target, {
    get(_, prop: string) {
      if (prop in target) return target[prop];
      // **The transform answers too**, for the same reason a gradient does:
      // `drawWorld` reads `getTransform().a` to learn the scale it will stamp
      // tile faces at, and a proxy that answers `undefined` throws before the
      // first tile. Identity is the honest answer for an instrument that has
      // no real surface — under it the face path falls back to painting in
      // place, which is also what happens under node with no canvas at all.
      if (prop === "getTransform") {
        return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      }
      if (prop === "createRadialGradient" || prop === "createLinearGradient") {
        return (...args: unknown[]) => {
          calls.push(`${prop}(${args.map(round).join(",")})`);
          return gradient();
        };
      }
      return (...args: unknown[]) => {
        calls.push(`${prop}(${args.map(round).join(",")})`);
      };
    },
    set(_, prop: string, value) {
      target[prop] = value;
      calls.push(`${prop}=${String(value)}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, log: () => calls.join("\n") };
}

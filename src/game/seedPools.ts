/**
 * **The seed pool a band is measured over — and the alternates it has to clear.**
 *
 * Every balance number in this repo is a statistic over a fixed list of seeds,
 * and the standing rule about those numbers is written out at length in
 * `world/fight.test.ts`: *a band that has only ever been checked against the
 * pool it was drawn from is not a band.* It was learned the hard way. Migrating
 * the fight to path ground left ten of eleven bands green on the committed
 * seeds; the eleventh was green there, green on a second pool, and failed on a
 * third at 1.40 against a bar of 1.5.
 *
 * The rule was policy and the *doing* of it was hand work — open four files,
 * retype four seed lists, run, retype them again, run, then put them all back
 * without a slip. So it was skipped, twice, by phases that had every intention
 * of performing it, and bands were re-committed off a single draw.
 *
 * This makes it a flag:
 *
 *     npx vitest run …                    # the committed pool
 *     OTZAR_POOL=1 npx vitest run …       # a second, independent pool
 *     OTZAR_POOL=2 npx vitest run …       # and a third
 *
 * **Fresh seeds and not a reshuffle**, which is the whole point and is easy to
 * get wrong: every band here is an aggregate — a rate, a mean, a worst-of — and
 * an aggregate cannot tell the order of its own sample. Permuting a pool
 * measures the identical worlds and returns the identical number, then reports
 * it as independent confirmation. So each seed is mixed with the pool's own
 * number to land somewhere else entirely in the generator's space, by the same
 * hash `speed.test.ts` already derives its bodies from.
 *
 * Test-only, and nothing has to enforce that: no module the app imports imports
 * this one, so it is absent from the bundle by construction rather than by a
 * flag — the argument `world/probes.ts` and `render/testCanvas.ts` both make for
 * themselves.
 */
export function pool(seeds: readonly number[]): number[] {
  const which = Number(process.env.OTZAR_POOL ?? "0");
  if (!Number.isFinite(which) || which <= 0) return [...seeds];
  return seeds.map((seed) => ((seed * 7919) ^ (which * 0x9e3779b9)) >>> 0);
}

/** Which pool is in hand, for a test that wants to say so in its own output. */
export function poolName(): string {
  const which = Number(process.env.OTZAR_POOL ?? "0");
  return which > 0 ? `pool ${which}` : "the committed pool";
}

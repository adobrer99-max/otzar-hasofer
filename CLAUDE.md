# Working in this repository

Otzar HaSofer is a Vite + React + TypeScript app. `src/game/` is *Ma'alot*, a
side-scroller whose levels are generated per seed and whose difficulty is held
by measured tests, so a few habits matter more here than in most codebases.

## Before every commit

```sh
npm run check        # tsc -b, oxlint, the full vitest suite (about three minutes)
npm run build        # then:
grep -r "otzar-dev-warp" dist/ | wc -l    # must print 0 — no dev warp in a build
```

Commit only when all of it is green.

## When the world step or the generator is touched

Four test files measure the game rather than assert it: `src/game/world/fight.test.ts`,
`src/game/world/curve.test.ts`, `src/game/world/climb.test.ts` and
`src/game/economy.test.ts`. A fifth, `src/game/world/descent.test.ts`, measures
Chapter II's descent the same way and runs over the same pools. They draw their seeds from a pool chosen by
`OTZAR_POOL` (unset, `1` or `2`). After a change to `src/game/world/step.ts`,
the chunk library or anything the generator reads, run them over all three:

```sh
OTZAR_POOL=1 npx vitest run src/game/world/fight.test.ts src/game/world/curve.test.ts src/game/economy.test.ts src/game/world/climb.test.ts
OTZAR_POOL=2 npx vitest run ...the same four files
```

Each pool takes about five minutes; run them as separate commands. A
"Timeout calling onTaskUpdate" line at the end is Vitest's reporter falling
behind a long synchronous test, not a failure.

## Laws the tests assume

- **A seed must keep laying the same ground.** Do not add, remove or gate a
  chunk, or change anything the generator draws from, as a side effect of
  another change. A rule may change what the ground *does*, never a tile.
- **Rung rules live in one table**, `src/game/rungRules.ts`, and reach the game
  through `ruleOf(world)` / `ruleOfWay(path, from)`. The rule is the
  destination's, by the direction the road is walked.
- **What a key does to a plate lives in one table**, `src/game/plateKeys.ts`.
  A plate whose buttons are a decision is an `answer`, never a `dismiss`.

## Playing it

```sh
npm run dev                          # port 5173 — not `vite preview`, the warp is dev-only
npm run playtest -- <script-name>    # drives a real browser; output in playtest/
npm run playtest -- --list
```

The playtest driver runs on a wall clock, so a script can fail once by bad
luck; run it again before believing a single failure. Scripts whose ground
depends on the calendar pin a `day` in their warp.

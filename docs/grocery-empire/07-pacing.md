# Pacing contract

**File:** [`sim/pacing.test.ts`](../../src/games/grocery-empire/sim/pacing.test.ts)  
**Bot:** [`sim/bots.ts`](../../src/games/grocery-empire/sim/bots.ts) · `runPacing(seed, seconds)`  
**Also mirrored in:** [`docs/2.0-plan.md`](../2.0-plan.md)

The campaign bot is a steady, unhurried player. Real players who solve puzzles beat it. **Never lower CI floors to hide a regression** — stretch loops or fix the bot.

## CI windows (authoritative)

| Door | Assert | Suite |
| --- | --- | --- |
| Era 1 | `> 35 min` and `≤ 55 min` | Default `npm test` (seeds 1, 42) |
| Era 2 | `> 3.5 h` and `≤ 5 h` | Default |
| Era 3 | `> 8 h` and `≤ 11 h` | `LONG=1` |
| Era 4 | `> 13 h` and `≤ 16 h` | `LONG=1` |
| Era 5 | `> 17 h` and `≤ 21 h` | `LONG=1` |
| Era 6 | `> 22 h` and `≤ 27 h` (≤28 h sim) | `LONG=1` |
| Era 12 | `> 40 h` and `≤ 50 h` | `LONG_HORIZON=1` (50 h budget) |

## Measured bot (seed 1, SAVE_VERSION **26**)

| Era | Measured |
| --- | --- |
| 1 | ~40.5 min (layaway slips) |
| 2 | ~3.50 h (open days + dock check-ins; band lock / hot-trait) |
| 3 | ~8.57 h |
| 4 | ~13.21 h |
| 5 | ~17.88 h (exam holds + dispatch cycle) |
| 6 | ~23.54 h (pocket trip ETA + berth turnaround) |
| 7 | ~24.7 h |
| 8 | ~28.6 h |
| 9 | ~32.1 h |
| 10 | ~35.1 h |
| 11 | ~39.3 h |
| 12 | ~40.4 h |

**Note (2026-11-14 Phase 3–5):** Raised LONG windows to plan targets after exam hold, berth turnaround, ration ledger, climate neighbor, stop settlement, yield haul, habit watch, clause seating, accept rehearsal. `SAVE_VERSION` **26**.

## History (why we stretched)

| Stage | Era 1 | Era 2 | Era 6 |
| --- | --- | --- | --- |
| Pre–depth (2.0) | ~9 min | ~85 min | ~8 h |
| After era-depth content | ~9–15 min | ~75–80 min | still short of 18–22 |
| After pacing stretch | ~26 min | ~2.65 h | ~19 h |
| After 2.0 expansion (SAVE 26) | ~40.5 min | ~3.50 h | ~23.5 h |
| Target | 35–55 min | 3.5–5 h | 22–27 h |

Lesson: **one-shot checkboxes do not create length.** Counts + cooldowns + travel ETAs + practice gaps do.

## How to remeasure

```bash
# Default Era 1–2
npx vitest run src/games/grocery-empire/sim/pacing.test.ts --reporter=verbose

# Full early–mid (slow)
LONG=1 npx vitest run src/games/grocery-empire/sim/pacing.test.ts --reporter=verbose

# Worlds (very slow)
LONG_HORIZON=1 npx vitest run src/games/grocery-empire/sim/pacing.test.ts --reporter=verbose
```

Optional: keep/restore a small `pace-measure` / `_pace_debug` test that prints `{ seed, eraAt }` JSON — useful while tuning. Delete or skip in CI if noisy.

After measuring: update **this file**, `pacing.test.ts` header comment, and `docs/2.0-plan.md` measured column together.

## Tuning levers (by era)

| Symptom | Prefer |
| --- | --- |
| Era 1 too fast | earlyDemandMul, regular need/gap, bell need, basket gates |
| Era 2 too fast | regular need, Open days, invoice on-time need, write-off CD, lot lifetime |
| Era 3 too fast | flyer cooldown/weeks, matched stores, Attention, hot-trait gap |
| Era 4–5 too fast | exam hold need, dispatch cycle, trip/dispatch counts |
| Era 6 too fast | `pocketTripSec`, berth turnaround, ledger stamps, concurrent trips |
| Worlds too fast | climate/settlement/haul/watch/seating/rehearsal ETAs, practice, hearing |
| Bot stuck / CI upper bound fail | teach bot the new verb; slightly shorten cooldown — **do not** delete the gate |

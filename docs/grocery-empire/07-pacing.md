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

## Measured bot (seed 1 · SAVE **36** / 40.0 prove 2026-11-16)

Landings held through Phases 5–7 decisions (bot still takes the slow legal branch: mid flyer, exam-ready then clean, standard charter, default clauses).

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
| 11 | ~39.1 h (SAVE 35) |
| 12 | ~40.1 h (clause seating pad; still ≤50 h) |

**Note (2026-11-14 Phase 3–5):** Raised LONG windows to plan targets after exam hold, berth turnaround, ration ledger, climate neighbor, stop settlement, yield haul, habit watch, clause seating, accept rehearsal. `SAVE_VERSION` **26**.

**Note (2026-11-15 · 4.0 real):** Remeasured seed 1 Eras 1–6 after Fix0 + Waves A–D — landings **unchanged** vs SAVE-26 table (bot still picks safe facings; Read pads did not move doors). Default CI seeds 1/42 green. `LONG=1` Era 3–6 green. Era 12 first landed ~39.96 h (145s under floor) — padded `HORIZON.clauseSeatingSec` 720→800 and `clauseSeatingGapSec` 600→640 (accept rehearsal is post-door; never lowered the 40h floor).

**Note (2026-11-15 · 40.0 Phase 5, SAVE 33):** Manifest stance split cleans and exams into separate credits (13 credits needed instead of 8), but each stance ticks its own 70-min clock and the bot files exam-ready then clean inside one cycle window — remeasured seed 1: Era 3 8.57 h · Era 4 13.21 h · Era 5 **17.89 h** · Era 6 **23.55 h** (vs 17.88 / 23.54 before). Default CI seeds 1/42 and `LONG=1` Era 3–6 green; no target moved.

**Note (2026-11-15 · 40.0 Phase 6, SAVE 34):** Worlds trade-offs (climate facing ban, settled stop taxes, season bed lock) change what the 7–9 waits cost, not their ETAs. Delay-settled circuits can stretch later settlement ETAs (≤ +24%); tariff trims freight trickle (floor 0.76). Default CI seeds 1/42 green; `LONG_HORIZON=1` spot-check **passed** (seed 1 reaches Era 12 inside 40–50 h; ~7 min wall). No target moved.

**Note (2026-11-15 · 40.0 Phase 7, SAVE 35):** posted habit, seated-clause hearings, charter forks and rehearsal misses add decisions to the 10–12 waits without moving their ETAs. Hearings now open on each seating (3 sessions ride seatings 1–3), so the door is still the fourth seating + Standard. Rehearsal misses are post-door only (the 900s desk gap and 120s retry were **not** used to pad Era 12). Measured seed 1 (`runPacing(1, 50h)`): Era 6 23.55 h · 7 24.70 h · 8 28.71 h · 9 32.24 h · 10 35.24 h · 11 **39.11 h** · 12 **40.10 h** (≈6 min over the floor, same landing as Phase 6). Bot path: 6 watches, four default clauses seated, three heard, Standard signed. `LONG_HORIZON=1` green; default CI green. No target or constant moved. The Era 12 margin is thin — if a later change pulls it under 40 h, lengthen the seating decision (`clauseSeatingSec` / `clauseSeatingGapSec`, or a hearing gap between sessions) with a reason, not the rehearsal.

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

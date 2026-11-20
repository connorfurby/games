# Pacing

Driver: `sim/bots.ts` → `runPacing`. Asserts: `sim/pacing.test.ts`.

| Era | CI window | Measured seed 1 (1.0) |
| --- | --- | --- |
| 1 | > 35 min ≤ 55 min (default) | ~37 min |
| 2 | > 3.5 h ≤ 5 h (default) | ~4.0 h |
| 3 | > 8 h ≤ 11 h (`SD_LONG=1`) | ~8.5 h |
| 4 | > 13 h ≤ 16 h | ~14.0 h |
| 5 | > 17 h ≤ 21 h | ~17.5 h |
| 6 | > 22 h ≤ 27 h | ~22.1 h |
| 7 | — (door via Quiet Stay) | ~25.5 h |
| 8 | — | ~29.7 h |
| 9 | — | ~33.4 h |
| 10 | — | ~36.7 h |
| 11 | — | ~40.0 h |
| 12 | > 40 h ≤ 50 h (`SD_HORIZON=1`) | ~40.7 h |

The Choir wakes at era ≥ 7 (`seedChoir` in `sim/commands.ts`, on `setEra` and Quiet Stay) and nibbles audience via `rivalCut` like any rival. Era 12 moved ~+0.13 h versus the pre-Choir 40.58 h; Eras 1–6 are unaffected.

Remeasure:

```bash
npx vitest run src/games/signal-decay/sim/pacing.test.ts
SD_LONG=1 npx vitest run src/games/signal-decay/sim/pacing.test.ts
SD_HORIZON=1 npx vitest run src/games/signal-decay/sim/pacing.test.ts
```

Bot never Retunes and never Signs off. Quiet door: Stay.

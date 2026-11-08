# Grocery Empire — progress

The 2.0 rebuild is tracked in [`docs/2.0-plan.md`](docs/2.0-plan.md) (phases, pacing, stat engine,
decision log). The original audit lives at https://claude.ai/artifact/DgAJbqsxSb6RBq8FTd7uGW.

## Gates

| Gate | How |
| --- | --- |
| Type-check + build | `npm run build` |
| Unit, balance, pacing | `npm test` (`LONG=1 npm test` adds the full-campaign run) |
| Lint | `npm run lint` |
| Browser | `CHROME_PATH=/path/to/chrome npx playwright test` |
| DevMode snapshots | `SNAPSHOTS=1 npx vitest run src/games/grocery-empire/sim/devSnapshots` after balance changes |

## Still open

- Named rival chains with portraits and buyouts
- Empire Map (a zoomable map of everything you own)
- Rewriting the remaining department panels in the 2.0 style (they are re-skinned today)
- A human multi-hour balance pass

# Grocery Empire — working rules

Source of truth for the 2.0 rebuild: `docs/2.0-plan.md`.

## Commands

- `npm run dev` — play locally (`/play/grocery-empire`, DevMode at `/play/grocery-empire/dev`)
- `npm run build` — type-check + build. Must stay green.
- `npm test` — unit, balance and **pacing** tests (headless bots). Must stay green.
- `npm run lint` — oxlint.

## Sim rules

- The sim (`src/games/grocery-empire/sim`) is deterministic and command-driven. React only paints snapshots; never mutate state from UI code except via `dispatch(command)`.
- Read upgrade strength through `upgradeEffect(s, id)` (or `upgradeMagnitude`) — never `s.upgrades[id] * constant` for curve nodes. `content/upgrades/wired.test.ts` fails if an upgrade is read nowhere.
- Every economy constant lives in `sim/balance.ts`.
- Any balance change must keep `sim/pacing.test.ts` passing. If a target genuinely moves, change the target in the same commit and say why.
- New state fields need a default in `createInitialState` and a path in `sim/migrate.ts` (bump `SAVE_VERSION`).

## UI rules

- Read game state through `useGame()` / selectors; heavy derived data is memoized on the engine tick.
- Respect `reducedMotion`.
- One sentence of copy per panel header; help goes in tooltips.
- Must be playable at 390 px wide.

# Games shelf — working rules

## Grocery Empire

Source of truth for the 2.0 rebuild: `docs/2.0-plan.md`.

**Living agent briefing (structure, pacing, depth systems, changelog, backlog):** `docs/grocery-empire/` — start at `docs/grocery-empire/README.md`. After meaningful changes, update that pack (see `docs/grocery-empire/00-agent-protocol.md`).

Play: `/play/grocery-empire` · DevMode `/play/grocery-empire/dev`

## Signal Decay

**Living agent briefing:** `docs/signal-decay/` — start at `docs/signal-decay/README.md`.

Play: `/play/signal-decay` · DevMode `/play/signal-decay/dev`

Pacing flags (independent of Grocery): default Era 1–2 · `SD_LONG=1` Eras 3–6 · `SD_HORIZON=1` Eras 7–12.

## Commands

- `npm run dev` — play locally
- `npm run build` — type-check + build. Must stay green.
- `npm test` — unit, balance and **pacing** tests (headless bots). Must stay green.
- `npm run lint` — oxlint.

## Sim rules (both games)

- The sim is deterministic and command-driven. React only paints snapshots; never mutate state from UI code except via `dispatch(command)`.
- Read upgrade strength through `upgradeEffect(s, id)` (or `upgradeMagnitude`) — never `s.upgrades[id] * constant` for curve nodes. Wired tests fail if an upgrade is read nowhere.
- Every economy constant lives in that game's `sim/balance.ts`.
- Any balance change must keep that game's `sim/pacing.test.ts` passing. If a target genuinely moves, change the target in the same commit and say why.
- New state fields need a default in `createInitialState` and a path in `sim/migrate.ts` (bump `SAVE_VERSION`).
- Do not reuse Grocery's `LONG` / `LONG_HORIZON` flags for Signal Decay.

## UI rules

- Read game state through `useGame()` / selectors; heavy derived data is memoized on the engine tick.
- Respect `reducedMotion`.
- One sentence of copy per panel header; help goes in tooltips.
- Must be playable at 390 px wide.

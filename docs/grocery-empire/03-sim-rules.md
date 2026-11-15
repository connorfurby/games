# Sim rules — state, commands, saves

## Determinism

- Tick rate: **10 Hz** (`TICK_HZ` / `DT` in `balance.ts`).
- RNG is seeded on the save (`GameState.seed` / `rng`).
- Offline catch-up caps at 8 hours (`OFFLINE_CAP_SEC`).
- React only **paints** snapshots. Mutation path: `can(cmd)` → `run(cmd)` via `dispatch`.

## Commands

Handlers live in:

- `sim/commands.ts` — core + switchboard
- `sim/commandsDepth.ts` — stretch / depth verbs
- `sim/commandsEra2.ts`, `commandsEraLate.ts`, `commandsHorizon.ts`

**Exception:** Rebrand is `Engine.rebrand()`, not a `Command`.

When adding a verb: extend the `Command` union, implement `can`/`run`, wire UI + bot `action`, add a goal if it is on the spine, and hard-gate the era door if it is required.

## State shape (high level)

`GameState` in `sim/state.ts` includes:

- Economy: `cash`, `price`, `shelf`/`backroom` batches, `orders`, `wholesale`, `ads`, `hours`
- People: `staff`, `morale`, compute (Attention / Ideas / Reputation)
- Meta: `memos`, `upgrades`, `builds`, `ventures`, `empire`, `projects`, `rivals`
- Chain+: `stores`, `invest`, `doctrines`, `cold`, `politics`, `fleet`, `fuel`/`control`/`brand`
- Worlds: `horizon`, `offworld`, `bonded`, `seedVault`, `late`
- **Depth:** `depth: DepthState` (facings, departments, regulars, shifts, invoices, flyer, cooler, dispatch, practice, hearing, stars, …)

## `SAVE_VERSION`

Current: **29** (`sim/balance.ts`). Display version for players is `GAME_VERSION` in `content/news.ts` (separate) — currently **3.0**.

Tests that pin it: `horizon.test.ts`, `ge2.smoke.test.ts`, others that `expect(SAVE_VERSION).toBe(…)`.

### Adding a field

1. Type on `GameState` / `DepthState` / nested slice.
2. Default in `createInitialState` / `emptyDepth` / `empty*`.
3. **Explicit read/copy in `migrate.ts`** — a default alone is wiped on load.
4. Bump `SAVE_VERSION`.
5. Use `if (version < N)` only when old values need a transform.
6. Update this pack + any `toBe(N)` asserts.

## Upgrade effect path

```ts
upgradeEffect(s, id) // only legal magnitude read for verb/curve nodes
```

Stat nodes feed `foldStats` → soft-cap `(1 + raw)^0.7`. Ranks 10 and 25 double a node; every 50 ranks in a tree → +10% mastery.

`content/upgrades/wired.test.ts` fails if a node or stat is never read by the sim.

## Invariants

`sim/invariants.ts` clamps NaNs, repairs missing depth slices, keeps currencies finite. Do not rely on UI to sanitize.

## Seats (three pools)

1. **Floor** — `STAFF_SEATS` by storefront + side yard / parking / stores + Shift Lead bonus.
2. **Department** — `staffDept.ts` / `DEPT_ROLE_IDS` (Fresh, Chain, Cold, Logistics, Orbit…).
3. **Horizon annex** — `staffAnnex.ts` / `HORIZON_ROLE_IDS` (surveyor, stevedore, …).

Dept and annex roles must **not** consume floor chairs.

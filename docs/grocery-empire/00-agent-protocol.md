# Agent protocol — always update this pack

## Before you change the game

1. Read [`CLAUDE.md`](../../CLAUDE.md).
2. Skim this folder’s [README](README.md) + the files that touch your task (eras / economy / pacing / depth).
3. Confirm `SAVE_VERSION` in [`sim/balance.ts`](../../src/games/grocery-empire/sim/balance.ts) matches what this pack claims.

## Hard sim rules (never violate)

- UI never mutates sim state except `dispatch(command)`.
- Upgrade strength only via `upgradeEffect` / `upgradeMagnitude` (see `content/upgrades/wired.test.ts`).
- Economy numbers live in `sim/balance.ts` (and `DEPTH` / `HORIZON` / `NETWORK` / `VALUE` / `COLD` / `FLEET` therein).
- New `GameState` fields: default in `createInitialState` **and** explicit copy in `sim/migrate.ts`, then **bump `SAVE_VERSION`**.
- Balance changes must keep `sim/pacing.test.ts` green. If a pacing target genuinely moves, change the assert **and** this pack’s [07-pacing.md](07-pacing.md) + [docs/2.0-plan.md](../2.0-plan.md) in the same change, and say why.
- No new hubs. Worlds threads into existing hubs. Playable at 390 px. One sentence per panel header.

## After every meaningful change

Update the relevant markdown in **this folder**. Treat the pack as part of the deliverable, not optional docs.

| If you changed… | Update… |
| --- | --- |
| Era gates, goals, bots | [05-eras.md](05-eras.md), [07-pacing.md](07-pacing.md), [10-changelog-chat.md](10-changelog-chat.md) |
| `DEPTH` / balance constants / formulas | [04-economy-math.md](04-economy-math.md), [07-pacing.md](07-pacing.md) |
| New systems / commands / state | [06-depth-systems.md](06-depth-systems.md), [02-file-map.md](02-file-map.md), [03-sim-rules.md](03-sim-rules.md) |
| Roles, aisles, memos, upgrades | [08-content-catalog.md](08-content-catalog.md) |
| UI panels / hubs | [09-ui.md](09-ui.md) |
| Finished work vs leftover | [10-changelog-chat.md](10-changelog-chat.md), [11-backlog.md](11-backlog.md) |
| `SAVE_VERSION` | README snapshot, [03-sim-rules.md](03-sim-rules.md), [07-pacing.md](07-pacing.md) |
| **Player-visible change** | Prepend an article in [`content/news.ts`](../../src/games/grocery-empire/content/news.ts), bump `GAME_VERSION` (not `SAVE_VERSION`) when the ship warrants it. Versions count from **1.0** (launch); pre-1.0 bulletins were deliberately erased |

Also bump the **Last pack review** date on [README.md](README.md).

## Commands you will run

```bash
npm run dev          # /play/grocery-empire  · DevMode /play/grocery-empire/dev
npm run build        # must stay green
npm test             # unit + default pacing (Era 1–2)
npm run lint         # oxlint
LONG=1 npm test      # Eras 3–6 (~24h sim) — slow
LONG_HORIZON=1 npx vitest run src/games/grocery-empire/sim/pacing.test.ts  # Eras 7–12 — very slow
```

## Design laws (pacing stretch)

1. A goal that is not a **hard gate** is flavor — bots will skip it.
2. Length comes from **sustained loops** (counts), not sticker-price inflation.
3. Practice filings before Worlds gate credit; practice never opens an era door.
4. Staffed or neglect (`NETWORK.neglectFloor` and dept / shift coverage).
5. Teach the campaign bot in the same PR as every new gate.

## Do not

- Edit Cursor plan files under `.cursor/plans` unless the user asks.
- Lower pacing CI floors to make a red test green — stretch the loop or retune the bot.
- Multiply all costs by a constant as a substitute for gameplay.
- Add `break_eternity` to sim math; doubles stay `number` (display-only elsewhere).
- Create a seventh top-level hub.

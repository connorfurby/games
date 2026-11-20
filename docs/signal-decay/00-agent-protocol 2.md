# Agent protocol

## Before you change the game

1. Read [`CLAUDE.md`](../../CLAUDE.md).
2. Skim this pack’s [README](README.md) + the files that touch your task.
3. Confirm `SAVE_VERSION` in [`sim/balance.ts`](../../src/games/signal-decay/sim/balance.ts).

## Hard sim rules

- UI never mutates sim state except `dispatch(command)`.
- Upgrade strength only via `upgradeEffect` / `upgradeMagnitude`.
- Economy numbers live in `sim/balance.ts`.
- New `GameState` fields: default in `createInitialState` **and** merge in `migrate.ts`, then bump `SAVE_VERSION`.
- Balance changes must keep `sim/pacing.test.ts` green. Use `SD_LONG` / `SD_HORIZON` — never Grocery’s `LONG` flags.
- Do not lower pacing floors to go green.

## After every meaningful change

Update this pack. Bump the README snapshot date.

## Commands

```bash
npm run dev          # /play/signal-decay · /play/signal-decay/dev
npm run build
npm test
SD_LONG=1 npx vitest run src/games/signal-decay/sim/pacing.test.ts
SD_HORIZON=1 npx vitest run src/games/signal-decay/sim/pacing.test.ts
```

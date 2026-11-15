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

- A human multi-hour balance pass
- Illustrated RoomScene coverage for any remaining legacy bands / StoreScene per-element pause quirks

## Done recently

- Illustrated-room standard across Empire / Worlds / Museum hubs: `RoomScene` 960×300 + RoomHud chips + Hits; Rank hall; Land street always filled eras 2–6; denser FleetHarbor / BlockMap legend; Worlds chrome diet (slim GoalStrip, scene currency chips, no bust stack); Museum gallery strip; Hud `useTween`/`useFlash`; NextGoal `celebrate`
- UI refresh phases 1–8: tokens + `@layer`, `ui/kit/`, shell (HUD, OverlayManager, HubNav More sheet, command palette, URL `?m=`), `ui/fx/`, panel template across hubs, EmpireBoard merge, SkillTree phone Sheet / min zoom / `data-upgrade-id`, Museum `useConfirm`, scene perf light touch, `e2e/visual.spec.ts` baselines

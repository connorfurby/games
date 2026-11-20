# File map

Root: `src/games/signal-decay/`.

## Sim

| Path | Role |
| --- | --- |
| `sim/balance.ts` | All constants; `SAVE_VERSION` / `GAME_VERSION` |
| `sim/state.ts` | `GameState`, empties, `createInitialState` |
| `sim/migrate.ts` | Save migrations |
| `sim/engine.ts` | Engine + 5s undo buffer |
| `sim/tick.ts` | Tick + offline |
| `sim/commands.ts` | Command union + handlers |
| `sim/formulas.ts` | Demand, band, relay, decay |
| `sim/bots.ts` | Campaign bot + `runPacing` |
| `sim/pacing.test.ts` | Pacing CI |
| `sim/systems/*` | decay, callers, rivals, dial |

## Content

| Path | Role |
| --- | --- |
| `content/programs.ts` | Safe/bold shows per daypart |
| `content/doctrines.ts` | Permanent perk ladder |
| `content/goals.ts` | Campaign spine |
| `content/callers.ts` | Named callers |
| `content/upgrades/` | Trees + wired test |
| `content/dial/grammar.ts` | Phrase grammar |
| `content/tutorials.ts` | Opening coach, era tours, tips |
| `content/story.ts` | Era chapter cards (mission, beats) |
| `content/upgradeTree.ts` | Tree layout: tiers, path links, hidden ranks |
| `content/checklist.ts` | Era 0–6 checklist |
| `content/news.ts` | Shelf bulletins |
| `content/memos.ts` · `dialogue.ts` | Radio memos + whispers |
| `content/staff.ts` · `rivals.ts` | Staff roles + rival/voice faces |

## UI

| Path | Role |
| --- | --- |
| `ui/design/` | tokens + layers |
| `ui/kit/` | Button, Meter, Sheet, chips |
| `ui/play/` | PlayFrame, VerbTray, PanelHelp |
| `ui/shell/` | Hud, NextGoal, MoreSheet |
| `ui/coach/` | Opening coach spotlight |
| `ui/tree/` | SkillTree + UpgradeBoard |
| `ui/story/` | Chapter card |
| `ui/rivals/` | Rival cards |
| `ui/wiki/` · `ui/museum/` | WikiBrowser + Museum wings |
| `ui/scenes/` | DepartmentPlate, Portrait, room hits |
| `ui/panels/*` | Air, Plant, Crew, Books, Network + Dial boards |
| `ui/shack/ShackScene.tsx` | Dense room + Hits |
| `ui/signal.css` | `@layer shell` styles |

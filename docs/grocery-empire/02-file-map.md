# File map

Root of the game: `src/games/grocery-empire/`.

## Sim (engine)

| Path | Role |
| --- | --- |
| `sim/balance.ts` | **All** economy / DEPTH / HORIZON / NETWORK / VALUE / COLD / FLEET constants; `SAVE_VERSION` |
| `sim/state.ts` | `GameState`, `createInitialState`, empty helpers |
| `sim/migrate.ts` | Save migrations — must copy every new field |
| `sim/engine.ts` | Engine wrapper; `rebrand()` is not a command |
| `sim/tick.ts` | 10 Hz tick orchestration |
| `sim/commands.ts` | Core `Command` union + handlers; merges era/depth |
| `sim/commandsDepth.ts` | Depth / stretch commands (facing, shifts, invoices, flyers, logs, haulers…) |
| `sim/commandsEra2.ts` | Era 2+ |
| `sim/commandsEraLate.ts` | Era 3–6 late |
| `sim/commandsHorizon.ts` | Era 7–12 |
| `sim/formulas.ts` | Demand, wages, seats, hire cost, bottlenecks |
| `sim/unlocks.ts` | Menus, Era 0→1 `tickEra`, tutorials hooks |
| `sim/bots.ts` | Campaign / pacing bot composer + `runPacing` |
| `sim/botsShared.ts` | Shared bot types, attentive/recovery/fuzz |
| `sim/botsEarly.ts` / `botsChain.ts` / `botsFleet.ts` / `botsWorlds.ts` | Era-band campaign pushes |
| `sim/pacing.test.ts` | **Pacing CI** — do not weaken casually |
| `sim/invariants.ts` | Clamp / repair state each tick |
| `sim/staffDept.ts` | Department seat pools (not floor seats) |
| `sim/staffAnnex.ts` | Horizon annex seats |
| `sim/systems/market.ts` | Sales, wholesale index, weather |
| `sim/systems/network.ts` | Network multiplier, old-layer caps, valueMul |
| `sim/systems/chain.ts` | Stores, Attention, flyer desk hooks |
| `sim/systems/cold.ts` | Plants (typed), yield, Momentum, cooler log hooks |
| `sim/systems/politics.ts` | Bills, leave region |
| `sim/systems/fleet.ts` | Lanes, franchises, barges, Pocket Ops trips, Era 5–6 |
| `sim/systems/horizon.ts` | Worlds puzzles, `maybeOpenEras`, practice credit (coordinator) |
| `sim/systems/horizonCore.ts` | ensureHorizon / practice / hearing shared |
| `sim/systems/horizonVerbs.ts` | Climate/settle/haul/seat/rehearse + tickHorizonVerbs |
| `sim/systems/horizonTick.ts` | Agents, seasons, phrases, keel, headlines, trickles, wages |
| `sim/systems/regulars.ts` | Regulars spawn / serve / miss, shift day rollover |
| `sim/systems/rivals.ts` | Named chains, locks, wars |
| `sim/systems/late.ts` / `lateHubs.ts` | Post–Era 6 hub threading |
| `sim/systems/prestige.ts` | Rebrand |
| `sim/systems/stats.ts` | Stat engine fold / soft-cap |
| `sim/depth.smoke.test.ts` | Depth / stretch gate smokes |
| `sim/payroll.test.ts` | Wage soft-cap |
| `sim/horizon.test.ts` | Horizon + `SAVE_VERSION` pin |
| `sim/phase8.loadout.test.ts` | SAVE 36: endless ban, carry, wing sockets |

## Content (data)

| Path | Role |
| --- | --- |
| `content/goals.ts` | Campaign spine + bot `action`s |
| `content/memos.ts` | Desk memos (gates many verbs) |
| `content/categories.ts` | Aisles (`CATEGORY_IDS`) |
| `content/staff.ts` | Roles: floor, dept, horizon |
| `content/builds.ts` | Storefront / cold / civic ladders |
| `content/lore.ts` | `ERA_STORY`, milestones |
| `content/checklist.ts` | Checklist through Worlds |
| `content/guide.ts` | Spoiler-gated wiki |
| `content/rivals.ts` | Named rival chains |
| `content/ventures.ts` | Side tills |
| `content/upgrades/` | Trees; **only** `upgradeEffect` path via `index.ts` |
| `content/upgrades/wired.test.ts` | Fails if a node is unread |
| `content/horizon/` | Planets, cultivars, signal, charter, lists |
| `content/depth/` | Depth + stretch catalogs (see below) |

### `content/depth/`

| File | Role |
| --- | --- |
| `index.ts` | `DepthState`, `emptyDepth()`, bills |
| `facings.ts` | Named facings per aisle |
| `departments.ts` | Dept defs / policies |
| `contracts.ts` | Greengrocer, commissary, port broker… |
| `placeTraits.ts` | Store traits (commuter/night/family/tourist) |
| `lanes.ts` | Named routes, pocket rations, barge classes |
| `regulars.ts` | Named neighborhood shoppers |
| `flagshipPlanogram.ts` | Pre-Worlds 6-slot shelf puzzle |

## UI

| Path | Role |
| --- | --- |
| `ui/GroceryEmpireApp.tsx` | Shell |
| `ui/GameContext.tsx` | `useGame()` / dispatch |
| `ui/shell/hubs.ts` | Hub definitions |
| `ui/shell/NextGoal.tsx` | Next-goal + stars chip |
| `ui/panels/*` | Floor, Staff, Suppliers, Cold, Logistics, Fleet, Marketing, Land, Politics… |
| `ui/puzzles/*` | Planogram / convoy / etc. |
| `ui/scenes/room/*` | RoomScene standard (960×300, RoomHud, Hit) |
| `ui/kit/` | Button, Card, Meter, Sheet… |

## Site shell (`src/shell/`)

| Path | Role |
| --- | --- |
| `ShellFrame.tsx` | Shared chrome: brand + Play/News/Guide/Shop + version + waffle |
| `Shelf.tsx` | Home — wood stage + game cards; overlay ShellFrame |
| `NewsPage.tsx` + `news.css` | The Block Bulletin front page (`/news`, `/news/:id`) |
| `Shelf.tsx` + `home.css` | Home: game marquee, run card, desk cards |
| `ShopPage.tsx` + `shop.css` | Shop: wallet, pack preview, tag prices |
| `ds.css` | Site design-system bridge (`html.shell-ds` tokens, `sd-*` primitives) |
| `GuidePage.tsx` | Hosts `WikiBrowser` on `/guide/:gameId/*` |
| `AchievementsPage.tsx` | Awards wall |
| `AppMenu.tsx` | Waffle secondary (Awards / Settings / Keys / Dev) |

## Docs

| Path | Role |
| --- | --- |
| `docs/2.0-plan.md` | 2.0 thesis + pacing table + decision log |
| `docs/grocery-empire/` | **This pack** — living agent briefing |
| `CLAUDE.md` | Short working rules at repo root |

## Ops Wiki

| Path | Role |
| --- | --- |
| `content/wiki/blocks.ts` | Block model, `parseGuideBody` (plain guide text → blocks) |
| `content/wiki/articles.ts` | `WIKI_ARTICLES`, topics, rich rewrites, inserts, search |
| `content/wiki/atlas.ts` | Era atlas data (door out, departments, pressure) |
| `content/wiki/glossary.ts` | Glossary terms |
| `content/wiki/lessons.ts` | Coach lessons by era, `nextLesson`, `lessonMenu` |
| `ui/wiki/WikiBrowser.tsx` | Every wiki view; shared by `/guide` and Menu → Wiki |
| `ui/wiki/WikiBlocks.tsx` / `figures.tsx` | Block renderer and diagrams |
| `ui/wiki/InGameWiki.tsx` | Drawer wrapper inside play |
| `ui/wiki/nav.ts` | View ⇄ URL, `playHref` deep links |
| `ui/kit/LinkButton.tsx` | Router link styled as a kit Button |

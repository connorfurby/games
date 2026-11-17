# Changelog — this chat arc (2026-11)

Two stacked overhauls on Grocery Empire 2.0, then the **2.0 expansion megaplan**, then the **feel overhaul**, then **4.0**, then **40.0**. `SAVE_VERSION` moved **12 → 36** (40.0 Phase 8 is SAVE 36).

## W. Fluid opening lesson (2026-11-16) · SAVE unchanged · GAME_VERSION **40.1**

- One continuous Era 0 `opening` tour after the intro (Unpack → Baskets look-note → Price → Restock). Legacy unpack/baskets/price/wholesale stay in the Coach catalog; rent and meta-shelf leave the auto-queue.
- Opening strip dialogue no longer auto-queues; finishIntro marks openers seen and starts the tour immediately. Whisper tips and SuggestTip stay muted while any coach is active; first-action tips/lines are silenced as each step completes.
- Coach spotlight: measure once then track (no per-tick scroll jump); card docks above VerbTray holes; follows `floor-price-step` / `floor-wholesale-buy` into sheets; z-index above sheet scrim; look steps and missing targets do not full-block the screen. Soft-pause only on `act` steps.
- Tests: `openingLesson.test.ts`, `coachPlacement.test.ts`; docs 09-ui + news 40.1.

## V. 40.1 — front door, Ops Wiki, Bulletin, one button system (2026-11-16) · SAVE **36** (unchanged) · GAME_VERSION **40.1**

Presentation and shell only. No sim, balance or save changes; pacing untouched.

- **Ops Wiki** (`/guide/grocery-empire/*`): `content/wiki/` — `blocks.ts` (block model + `parseGuideBody`, which turns the plain-text `guide.ts` bodies into headings / steps / checklists / term rows / flows / see-also), `articles.ts` (`WIKI_ARTICLES`, rich rewrites of start-what + start-controls, figure inserts, menus + lesson per article, search), `atlas.ts` (13 eras: focus, door out, departments, pressure), `glossary.ts` (~30 terms), `lessons.ts` (Coach tours grouped by era). UI in `ui/wiki/`: `WikiBrowser` (home, article, topic, search, lessons, atlas, glossary, hubs), `WikiBlocks` (glossary words auto-link on first mention; checklists persist per device), `figures.tsx` (core loop, bottleneck, hub map, era ribbon, Worlds filing), `nav.ts` (URL ⇄ view, `playHref`), `wiki.css` (`@layer panels`). Spoilers still follow `settings.showSpoilers` and the save era.
- **Wiki in play:** Menu drawer tab **Wiki** (`InGameWiki`) renders the same browser; Open buttons call `setActiveMenu`, Play this lesson dispatches `startTutorial`.
- **Deep links:** `/play/grocery-empire?tour=<id>&m=<menu>` starts a Coach lesson once (effect declared *after* the boot reload, or the reload drops it) and the `m` sync strips `tour` from the URL.
- **News:** `NewsPage` is "The Block Bulletin" (`src/shell/news.css`): masthead, band sections, lead story with plate art + byline portrait, *In this edition* highlight cards, bold lead-ins, wiki links, older/newer pager, editions rail + version history. `NewsArticle` gained optional `kicker`, `highlights`, `wiki`, `art`, `by`; `newsArt()` picks a default.
- **Home** (`Shelf.tsx` + `home.css`): storefront stage with the selected game's marquee, Continue/Start (tomato), Today's corner, New game, a run card (era, baskets, rate, played), spines on a board, and a desk of four cards (Bulletin, next lesson, Awards, Shop). Ornament + pack-chrome selectors in `index.css` now also target the new hosts (`.hm-shelf`, `.hm-marquee`, `.hm-shelf__row`, `.hm-title`, `.hm-stage`).
- **Shop** (`ShopPage.tsx` + `shop.css`): wallet, tabs with owned counts, live pack preview (HUD, room, tray in the pack's colours), cards with shelf-tag prices, plain-word moods instead of unlock codes, "N short" buy state.
- **Awards / Settings / Saves:** kit buttons, shared header and tabs.
- **One button system:** `html.shell-ds` carries the same tokens as `.ge-root` (`design/tokens.css` + `src/shell/ds.css`), `main.tsx` imports `layers.css` first, so the kit `Button` and new `LinkButton` render identically on every site page. Legacy `Btn` now renders kit `Button` (`primary` → tomato free verb, `spend` → tag yellow, `paper` → secondary). The global `a { color }` moved into `@layer reset`.
- **Tests:** e2e `guide.spec.ts` (wiki views + lesson deep link), `shelf.spec.ts`, `shop-tabs.spec.ts` updated. `npm test` 374 passed. Seven e2e specs in `live` / `shell-2` / `visual` were already failing on `main` before this work (see 11-backlog).

## U. Grocery Empire 40.0 Phase 12 — prove (2026-11-16) · SAVE **36** · GAME_VERSION **40.0**

- `npm test` 374 passed / 4 skipped; `npm run build` + `npm run lint` green (warnings only).
- `LONG=1` Era 3–6 green. `LONG_HORIZON=1` Era 12 green (~40.10 h seed 1).
- Pack: README snapshot, 11-backlog rewritten for post-40.0, 07-pacing note, 12-expansion marked shipped.
- Browser smoke: Shelf → Play Floor → Hubs/Charter path at 390 + 1280 when dev server available.

## T. Grocery Empire 40.0 Phase 11 — app shell (2026-11-15) · SAVE unchanged

- **Shelf:** `Shelf.tsx` — one primary (Continue with a save, Start without). A glance line under it reads `Era N · rate · age` (rate = `rates.soldPerSec` from the save, same format as the HUD). Today's corner carries a note that it parks the current run in slot 3 (also in its tooltip). Coming-soon spines lose hover lift and tap scale. The Guide/Awards/Shop link row is gone from the shelf (the shell bar already has them); only DevMode remains in dev.
- **News:** `NewsArticle.bands` (`NewsBand`: `e01 | e23 | e46 | e712 | meta`, `NEWS_BANDS`). `/news` opens the newest receipt (40.0) above the list; `/news/:id` opens that one. Band filter tabs (All + five bands) narrow the list only. The list stays the dense two-row grid; the "All bulletins" back link is gone because the list is always on the page.
- **Guide:** new topic **Decisions** (`choices`) with Safe/Bold facing, two regulars + invoice fork, flyer stance, manifest stance, charter fork, endless mutations. Era-gated like everything else (spoilers off hides E12 entries). `sys-depth-eight` and `late-worlds-endless` point to it. Search already indexes title, blurb, body and topic.
- **Awards:** `ShellFrame` primary nav is now Play · News · Guide · Awards · Shop; Awards is removed from the waffle menu (one place, not two). Three decision achievements in `achievements/registry.ts`: `first-bold-facing` (bronze), `first-charter-fork` (gold; Boutique or Co-op), `first-endless-mutation` (gold; `horizon.listMutations ≥ 1`). Tier filter and share card unchanged; test in `registry.test.ts`.
- **Settings / Tools:** both already render `SaveSlots` (Settings modal, and Tools → Saves via `MoreSections`). Export, import and hard reset stay.
- **Tools → Go:** News, Guide, Awards and Shop no longer get full cards; Go keeps Home, Keys and Campaign/Dev, with one quiet `Also:` text row for the four site routes (play has no shell bar, so they must stay reachable). Version chip stays off the HUD; it lives on News (shell bar), More/Go footer and Settings.
- **Tests:** `npm test` and `npm run build` green; e2e `shelf.spec.ts` updated (Start label, Awards in the bar, `/news` opens 40.0, Meta filter).

## S. Grocery Empire 40.0 Phase 9 — content: guests, pads, projects, Ration Board, news (2026-11-15) · SAVE unchanged (content-only)

- **Climate guests:** `content/horizon/guests.ts` — six named guests (Pilar Quenby, Ansel Voss, Orla Finch, Tamsin Rook, Bram Hollis, Ismay Crane) covering all eight climates, eras 7–9, each with an aisle want and a served line. `currentClimateGuest` (horizonVerbs) picks from the visiting climate + `climateServed`; `serveClimateNeighbor` logs the served line and names the guest in the ban warning. PlanetsPanel shows "At the door · name · want". No new aisle, no new state.
- **Verb upgrades (five new nodes, `upgradeEffect`):** `guest-patience` (Pantry E7; `climateBanPullMul` in `formulas.ts`, used by `facingPullMul`, FloorPanel and PlanetsPanel), `bed-lock-pad` (Cultivar E9; `bedLockOpenFrac` / `bedLockOpensIn`, `canPlantCross`, CultivarPanel), `clause-amend-pad` (Signal E11; `amendsPerDocket`), `endless-edit-pad` (Signal E12, after Accept; `endlessMutateEvery`), `mutation-clear-pad` (Signal E12, after Accept; `clearHorizonRival('ration')` strips the `|mut` mark and restores line score). The climate-serve, yield-haul, clause-seat and rehearsal pads already existed. Constants in `DEPTH` / `HORIZON` (`guestPatienceCap`, `bedLockOpenCap`, `mutationClearCap`, `endlessEditMaxExtra`…).
- **Projects:** `pj-guest-awning` (E7), `pj-bed-glass` (E9), `pj-embassy-chair` (E11) — timed builds whose reward is read in sim (`s.projects.done`) as the matching pad's flat bonus; `startProject` unchanged.
- **Ration-week pressure:** `rationBoardBehind` / `rationBoardDemandMul` in `systems/rivals.ts` (folded into `rivalDemandMul`). During ration week, once `DEPTH.rationBoardGraceFrac` of the ledger day passes with no stamp, demand × `DEPTH.rationBoardDemandMul` (0.93) until `stampLedger`; one warn log per day. Stateless (no SAVE). `ledgerDayLength` moved from `fleet.ts` to `rivals.ts`. FleetPanel warn chip. The bot stamps as soon as it can, so pacing is unchanged.
- **Copy:** checklist items (climate guest, season chore, optional amend, endless mutation); era-locked guide sections; News **40.0** article ("What's new in 40.0", Phases 1–9) and `GAME_VERSION` **40.0**.
- **Tests:** `phase9.content.test.ts` (guest cast, patience/awning, bed lock tail, amend cap, mutate cadence, projects start, Board skim). `wired.test.ts` green. Pacing: see 07 (unchanged).

## S′. Grocery Empire 40.0 Phase 8 — loadout: endless bans, carry, wing sockets (2026-11-15) · SAVE **36**

- **Endless mutation bans a loadout piece:** `horizon.endlessBan { kind: 'clause' | 'ventureFork', id } | null`. `mutateEndlessList` (extracted from `launchProbe`, still gated by `endlessMutateEvery(s)`) now also picks one kept clause or one set venture fork (`pickEndlessBan`, deterministic) and `enforceEndlessBan` releases / unsets it (and re-checks every tick for loaded saves). `canToggleClause` / `canSetVenturePolicy` refuse the banned id; toggling another clause / setting another venture's fork lifts it. Probes stay climate copies, harmonic thinning unchanged. `EndlessBanNote` on LastAisle / Planets / Ventures + disabled fork buttons with the reason.
- **Rebrand carry:** `RebrandCarry` (doctrine | facing | null) in `systems/prestige.ts`, `canCarry`, `carryOptions`; `freshRunKeepingMeta` / `rebrand` / `acceptEnding` / `Engine.rebrand` / `acceptEnding { carry? }` take it. Exactly one of doctrine or facing; a doubled or unowned carry is refused or dropped whole. Goodwill is still the cube-root curve; the bot never rebrands.
- **Shared prestige sheet:** `PrestigeKeepSheet` (keep-list, Hungry laws, carry picker) shown through `ConfirmModal`'s new `sheet` slot by EmpireBoard (Rebrand) and FleetPanel (Era 6 Accept, replacing the old copy-only confirm).
- **Museum wing sockets:** `MuseumSave.litWings` / `state.relics.litWings` (null = first `cap` finished wings). A finished wing pays only while lit; at full sockets, lighting one needs another left dark (`lightWing(..., swapOut)`, `setWingSocket` command). Cap is 3, or 5 with `pj-fifth-socket`. `stats.ts` reads `litWingIds`; the stat cache signature includes it. MuseumPanel "Wing sockets" section. Wing sizes untouched (25; Oddities 26). No new relics/feats — deferred.
- **Migrate/tests:** `horizon.endlessBan` and `relics.litWings` explicit copies + junk drops (`migrate.ts`), defaults in `emptyHorizon` / `createInitialState` / `invariants.ts`, `normalizeMuseum` handles `litWings`. `phase8.loadout.test.ts`: mutation bans a clause / a fork and the lift rules, carry is exactly doctrine | facing (Rebrand and Accept), Goodwill curve, bot never rebrands, socket mutual exclusion (museum + command + stats), SAVE 36 pins. Older SAVE pins → 36 / "current". Pacing: unchanged (see 07).

## R. Grocery Empire 40.0 Phase 7 — Signal / Charter / Last Aisle decisions (2026-11-15) · SAVE **35**

- **Posted habit:** credited `fileStandardPhrase` (and a clever `commitPhrase` ≥0.85 with no live watch) calls `startHabitWatch` → `postHabitWatch`, writing `horizon.postedHabit { habit, until, agentId }`. The posted agent is locked (`canSetAgentHabit` / `canFireAgent` refuse), skipped by `tickAgents`, and the watch credits only if they still hold the habit. Unheld posts are claimed by `setAgentHabit` to the posted habit. Fixes the pre-35 bug where the watch read the (already cleared) phrase and always matched. SignalPanel: "Posted" pocket + locked agent row. Bot matches the phrase habit before filing and claims unheld posts.
- **Seated-clause hearing:** `seatingClause` / `seatedClauses` / `heardClauses` / `amendedClauses`. `seatClause` opens Concord's session on the clause it seats (`nextHearingClause`, `openHearingSession` in `horizonCore.ts`); the Concord rival tick no longer picks from a random pool. Minutes Clerk amends one session per docket (grudge struck via `activeGrudges(kept, amended)`, seat kept) instead of deleting the clause. CharterPanel hearing sheet is a session (Clause · Grudge · Minutes Clerk) with one primary.
- **Charter on Next Goal:** `GoalDef.choices` + `GoalChoice`; `charter-signed` offers Standard / Boutique / Co-op with `CHARTERS[id].fork` one-liners (`CHARTER_IDS`). NextGoal renders a three-up fork row (`.g2-goal__forks`). Bot action still signs Standard. Co-op confirm copy fixed (was showing Boutique's).
- **Rehearsal can miss:** `rehearseAccept` tries below 0.85 (always misses) or at it (`HORIZON.rehearsalMissChance` 0.2 − pad, cap 0.08); a miss scratches the weakest filled line (`rehearsalScratch`) and waits `rehearsalRetrySec`. Accept still needs 0.85. LastAislePanel: "Scratch risk N%". Bot and the goal one-click only rehearse at 0.85.
- **Goals 10–12:** "Post the habit", "Seat this clause", "Sign the charter" (forks), "Rehearse the list"; `GoalDef.counts` puts filing counts under the hint (`.g2-goal__counts`).
- **Migrate/tests:** explicit copies + junk drops for all new fields; `phase7.charter.test.ts` (posted habit blocks setAgentHabit/fire, claim, fail; hearing uses the seated clause; amend; charter forks; rehearsal scratch; SAVE 35 pins). SAVE pins → 35 (Phase 6 pin now checks "current"). Pacing: see 07.

## Q. Grocery Empire 40.0 Phase 6 — Worlds trade-offs (2026-11-15) · SAVE **34**

- **Climate guest vs facing:** `serveClimateNeighbor` writes `depth.climateFacingBan { tag, cat, until }` for the strongest featured facing until the next shift-day boundary; `facingPullMul` cuts that category ×0.85 (`DEPTH.climateFacingBanPullMul`) while the facing stays featured. PlanetsPanel (goal room) and the Floor Facing sheet show a warn StatusChip; the serve tooltip names what the guest will ban.
- **Stop personality:** credited standard convoys arm `horizon.pendingStop`; `settleStop` locks it as `circuit.settledKind`. Spoil cuts that circuit's route weight, tariff cuts the freight trickle, delay stretches the next settlement ETA (`HORIZON.stopSpoilCut / stopTariffCut / stopTariffFloor / stopDelayPerCircuit / stopDelayCap`). ExchangePanel: "Settle {kind} stop" + "You live with: …" before Settle, tax on circuit rows.
- **Season bed lock:** `horizon.bedLockedChore` set by `doSeasonChore`, cleared at the season turn; blocks other chores and clever `plantCross` (standard cross still files). CultivarPanel: locked chip + named-chase line.
- **Trays:** Planets secondary "Clever shelf" (reopens the shelf with File the standard), Exchange always offers "File the standard · 0.72" when Settle/Keel owns the primary, Cultivars always lists "File standard cross · 0.72" plus "Clever cross".
- **Goals:** `climate-guest-facing` (Era 7), `settle-stop-tax` (Era 8), `season-chore` → "Lock a season bed" (Era 9); removed hire-only `hire-planogram-clerk` / `hire-stevedore`. Bot reads the chore from Next Goal.
- **Migrate/tests:** explicit copies + junk drops for all new fields; `phase6.worlds.test.ts` (SAVE 34 pins, ban/dodge/expiry, settle taxes, bed lock, goals); SAVE pins → 34. Pacing: see 07.

## P. Grocery Empire 40.0 Phase 5 — stance, two pockets, facings, Accept (2026-11-15) · SAVE **33**

- **Manifest stance:** one filing = ONE of `clean | exam | fast` (`setManifestStance { laneId, stance }`; `setManifest` gains optional `stance`, default `exam`). Clean credits `cleanManifests` at once (own `lastCleanAt` clock); exam opens the exam hold and `swearExam` now credits `examsHeld` **only**; fast pays a cash burst, burns fuel, credits nothing and leaves the lane open so existing MegaMart pressure snipes it. `dispatch` gains `lastCleanAt`, `laneStances`, `fastFiled` (migrate/invariants/emptyDispatch). LogisticsPanel shows three ActionRows per lane with a FailReason under each blocked stance. Goals (`exam-holds`, `clean-manifests`, `launch`) use the stance command. Bot: exam-ready while exams short, else clean; cleans and exams tick separate 70-min clocks so pacing is unchanged (documented in `botsFleet.ts`).
- **Two pockets, one hauler:** `pocketConcurrency` / `openPocketRations` / `pocketsOutrunHauler` in `systems/fleet.ts`; `pocket-concurrent` (Second Berth) is the choice to feed both. FleetPanel lists both open pockets, adds a StatusChip when 2+ rations are open and concurrency is 1, and the dispatch FailReason names Second Berth. Wrong ration still wastes.
- **Era 5–6 facings:** `storefront:7`, `cold:5`, `transit:6` — safe/bold pairs, soft cap 1.35, Civic untouched; `normalizeBuildVariants` re-keys to the def's slot.
- **Accept = Rebrand:** `freshRunKeepingMeta` (shared with `rebrand`) + `replaceStateInPlace`; Accept now wipes store/staff/upgrades/fleet/depth, keeps Empire, museum, Goodwill (banks pending), tutorials/tips and appetite/tipSharpness, then opens the Hungry laws board as before. Engine clears undo on Accept. FleetPanel: Continue / Accept / Reject ActionRows, Accept lists the law options.
- **Tests:** `phase5.stance.test.ts` (SAVE 33 pins, stance mutual exclusion, two pockets, facings, Accept wipe); SAVE pins → 33. Pacing: see 07.

## O. Grocery Empire 40.0 Phase 4 — rival stance & plant cost (2026-11-15) · SAVE **32**

- **Flyer vs rivals:** live flyer band (read from `depth.flyer`, `sim/systems/flyerStance.ts`) — Deep raises Penny lock chance/shortens gap; Soft raises FreshWay spoil mul (even with tunnel + log); Mid neutral (bot). Cold permit still reads completed `flyerWeeks`. Marketing Flyer Desk sheet shows the one-line consequence.
- **Plant power cost:** `depth.blastSuppressesTunnelUntilLog` — set when blast is powered (`setPlantPower` / blast buy), cleared on `signCoolerLog`; suppresses `tunnelFreshAgeMul` meanwhile. ColdPanel FailReason explains it. Bot unchanged (powers blast + tunnel, signs logs); pacing green.
- **Staff policies:** StaffPanel lists every unlocked department's policies with blurbs (not just Fresh).
- **Land hot trait:** callout/line/chip show the live trait and the matching store policies.
- **Migrate/tests:** new flag copied explicitly in `migrate.ts`; `emptyDepth` default; SAVE pins → 32; `phase4.stance.test.ts`.

## M. Grocery Empire 40.0 Phase 3 — concurrency (2026-11-15) · SAVE **31**

- **Two regulars:** `DepthRegulars` gains `waitingId`, `waitingPatienceUntil`, `waitingLayaway`. Second shopper spawns after the visit gap while the primary is unserved; both patiences tick; waiting expiry = star nick (`settleVisit`). Serve targets `activeId`; promotion keeps remaining patience. New command `focusRegular { which: 'active' | 'waiting' }` swaps them. Migrate copies fields explicitly and drops orphan waiting; invariants sanitize.
- **Bot:** `pushRegularsAndDock` switches focus only when the primary is unservable and the waiting shopper is servable. Pacing floors unchanged (Era 1 still >35m ≤55m; pacing suite green).
- **Float vs hire:** Invoice Book shows "Early pay saves X · next clerk costs Y" (`hireCost(s,'clerk')`). Bot invoice logic untouched.
- **Facing sheet:** "{Name} wants {facing} on {cats}" for the primary; "Also waiting: Name · Ns" + "Switch to Name" (tray secondary too below Era 7). `data-coach-id`: `floor-switch-regular`, `floor-regular-want`, `suppliers-float-vs-hire`.
- **Tests:** `regulars.two.test.ts`; SAVE pins → 31.

## N. Grocery Empire 40.0 Phase 2 — QoL (2026-11-15) · SAVE **31** (no bump; Phase 3 bumped)

- Command palette: Coach + query search over upgrades/memos/roles (cap 40).
- Human undo labels + seconds left + “Undid …” toast (`undoAction.ts`).
- Suppliers ×min / ×5 / Fill quantity; unified `SaveSlots` in Settings + Tools; slot 3 labeled for Today’s corner.
- Hidden-tab notifications reuse HUD alert (`hudAlert.ts`); FailReason actions (Suppliers→Build, Cold→log, Floor→Suppliers/Staff).
- Upgrade Best / Buy Best show effect-per-cost clause under the primary.

## L. Grocery Empire 40.0 Phase 1 — one frame + phone (2026-11-15) · SAVE **30**

- LateHubShell / HubStage / ScreenPanel accept `tray`; Money + Worlds + Land/Ventures/Museum/Map on VerbTray.
- Hub head drops purpose paragraph (PlayFrame owns the sentence); Floor/Suppliers/Cold/Logistics use `MENUS.*.purpose`.
- Phone Hubs badges: Empire doctrine-ready, Worlds filing-ready, Museum chests; sheet lists each menu with purpose.
- Worlds icon → `planets`. Subtab overflow fade. Single phone `.g2-dialogue` bottom above hub bar.
- Staff tray owns Shifts/Hire (duplicate ActionRows removed). EmptyStates on Marketing/Rivals/Fleet/Politics/Land.
- FailReason on disabled tray primaries across converted panels.

## K. Grocery Empire 40.0 Phase 0 — foundation (2026-11-15) · SAVE **30**

Refactor-only. Bot landings unchanged (seeds 1/42 identical over 40k sim-sec compare).

- **Bots split:** `botsShared` / `botsEarly` / `botsChain` / `botsFleet` / `botsWorlds`; `bots.ts` composes `campaignCommands` + `runPacing`. Shared early helpers kill attentive/campaign facing/regular/dock/shift duplication.
- **Horizon split:** `horizonCore` (ensure/practice/hearing), `horizonVerbs` (climate/settle/haul/seat/rehearse), `horizonTick` (agents/seasons/phrases/keel/headlines/trickles/wages). `horizon.ts` stays the puzzle + `maybeOpenEras` coordinator and re-exports public APIs.
- **tipSharpness** now reads: checkout ×(1+min(3,tip)×0.05); star regen ×(1+min(3,tip)×0.1).
- **LATE_MEMOS** dead import/`void` removed from `memos.ts` (`lateEras.ts` still exports ENDING_BEATS / CHARTER).
- **migrateSlice** helper in `migrate.ts`; prestigeCarry uses it.
- Pace debug already `describe.runIf(PACE_DEBUG)`.

## J. Grocery Empire 4.0 real (2026-11-15) — GAME_VERSION **4.0** · SAVE **30**

First 4.0 pass was sim tokens + skins; rebuild shipped as:

- **Fix0 Next Goal HUD:** free goals use tomato CTA (no `.g2-tag` punch-hole); paid keep yellow tag; stars off title flex on phone; compact alert on its own HUD row.
- **Wave A Strategy:** full doctrine ladder as ActionRows; RankHall-quality `StrategyHallScene`; FailReasons navigate Att→Memos / Read bank.
- **Wave B Build:** facings across eras 1–4 (slot keys); soft-cap **1.35**; living track room + first-class facing beat; Books upkeep chip; museum FEAT `facing`.
- **Wave C panels:** Fleet harbor, Empire rank ring, Planets sticky wants, Memos desk (filters simplified), Upgrades PlayFrame + Upgrade Best; Marketing Celebrity in sheet; Staff hire primary + annex rows; `buyMemoSweep` **effect/cost then cheapest**.
- **Wave D shell:** denser News; calm Settings column; version chip only News/More/Settings; cross-links Strategy↔Memos, Build→Suppliers, Fleet→Strategy, Cold brownout FailReason; dead `.fl-dock` / `.ge-floor` cut.
- **Sim knobs kept:** tournament cooldown 600s, doctrineGrowth 1.65, depot 12 / Autonomous 48 Read, `bank-read`, SAVE 30 migrate.

## I. Feel overhaul (2026-11-14) — GAME_VERSION **3.0** · SAVE **29**

- Cascade unlock: `grocery.css` + `g2.css` imported `@layer legacy` (lowest). Titles/purpose visible again.
- `ui/play/PlayFrame` + VerbTray / ActionRow / StatusChip / FailReason / SheetStagger / EraSign. Button default `ghost`. HubStage → PlayFrame wrapper.
- Floor / Backroom / Build / Suppliers / Cold / Logistics / Staff / Marketing on real trays. ScreenPanel + LateHubShell + HubStage wrap PlayFrame for remaining hubs.
- Phone bar keeps Money; Empire/Worlds/Museum behind **Hubs**. HUD drops duplicate alert; SuggestTip hides when it matches Next Goal.
- Sim decisions: HH/PL facings; Close/Mid shifts; Chain Patrol/Push; dock aisle/short; climate shelf pull; habit watch fail; **setPlantPower** (2 of 3); flyer soft/mid/deep (+ deep spoil); logistics/survey policy readers; ~40 regulars; bot prints mid flyers + powers blast+tunnel.
- Motion: ShelfFill / CrateHop / Pressable; scene tokens; map spin removed; brownout respects `html.ge-reduced-motion`. News receipt for 3.0.

## H. Shell chrome + News receipt (2026-11-14)

- Shared `ShellFrame`: brand + Play/News/Guide/Shop + version chip + waffle; overlays wood Shelf; wraps News/Guide/Shop/Awards. Orphan `shell-subpage__nav` strips removed.
- News redesigned as warm paper bulletin (not dashboard cards). Shelf detail: title → CTAs → single What’s new receipt → quiet stats/links. Wood cards kept.

## G. Customer-ready sweep (2026-11-14)

- Tutorial calm: mute SuggestTip/toasts during coach; queue cap 3; 10s calm; Era 2 / Worlds one opener; coachId audit test; short Era 0–1 copy; missing-target escape.
- Shelf homepage wood + game cards restored; DevMode gated to `import.meta.env.DEV`.
- Living news desk: `GAME_VERSION` **2.0**, `/news`, More + Hud chip. `SAVE_VERSION` **27** (`tutorials.calmUntil`).
- Staff hire sheet; Staff/Cold/Dock night punch.

## F. Density / After Hours lock-in (2026-11-14)

User rejected progression-only work as not the overhaul. Shipped:

- Floor = room + one tomato primary (Serve/Unpack) + Facing/Price/Restock/Bay sheets; meter stacks gone.
- `ButtonTone` **`free`** (tomato) vs **`primary`** (tag yellow spends).
- Night case tokens (`--ge-bg` `#0e1218`, tomato accent); FloorRoom unload bay tomato-lit.
- HelpCards stripped from remaining panels; Books alerts + “the tape” killed.
- Free verbs promoted: Swear / Settle / Seat / Stamp / Sign log / Dock check-in / Dispatch.
- Marketing / Suppliers / Cold / Build cut off Card stacks; one primary line each.
- Still open: Staff role-card grid + SVG room art punch beyond Floor (see backlog).

## E. 2.0 expansion megaplan (2026-11-14)

**Plan:** lengthen Last Aisle to 40–50 h via one hard-gated verb per era + After Hours UI usefulness (no new hub).

| Phase | Verbs / work | SAVE | CI |
| --- | --- | --- | --- |
| 0 | Remeasure, Empire/Worlds 390px, invoice sheet, kill competing HelpCards, delete DepartmentBands | 21 | no raise |
| 1 | Layaway slip + dock check-in | 22 | Era1 35–55m |
| 2 | Band lock + hot-trait walks | 23 | Era2 3.5–5h; Era3 8–11h |
| 3 | Exam hold + berth turnaround + ration ledger | 24→26 | Era4–6 plan windows |
| 4 | Climate neighbor + stop settlement + yield haul | 26 | LONG_HORIZON spot-check |
| 5 | Habit watch + clause seating + accept rehearsal | 26 | Era12 >40≤50h |
| 6 | Remeasure table, pack + 2.0-plan decision log, 390 audit | 26 | docs |

Measured seed 1 after Phase 3 stretch: Era3 ~8.57h · Era4 ~13.21h · Era5 ~17.88h · Era6 ~23.54h.

## A. Era depth overhaul

**Plan:** era depth / balance expansion across all eras.  
**Outcome:** departments, facings, contracts, place traits, typed plants, named bills, barge classes / pockets (v1), puzzle bars 0.72/0.85, many new roles, aisles (deli/bakery/frozen/import/ration), late hub polish, payroll past Era 3, old-layer caps, checklist through 12.

**Problem left:** bot still cleared doors as **checkboxes** → Era 1 ~9–15 min, Era 2 ~75–80 min, Era 3 ~2.3 h. CI floors were set to *measured* landings, not plan targets.

Phases (depth): framework → chain/cold → globe/barges → worlds → pass. See also `docs/2.0-plan.md` decision log 2026-11-11/12.

## B. Pacing stretch megaplan

**Plan:** hit real CI windows by adding sustained loops + eight systems; do not lower asserts.

| Phase | What shipped | SAVE | Measured milestone |
| --- | --- | --- | --- |
| 1 Early spine | Regulars, Shift Board v1, invoices, flagship planogram, 3× bells, early demand, hard side-yard | 17 | Era1 ~26m, Era2 ~2.65h |
| 2 Chain craft | Flyer Desk, star gates, matched-store cold permit, block events, Penny counter-flyer | 18 | Era3 ~6.30h |
| 3 Cold/Globe | Cooler Log, Dispatch Board, leave/barge hard gates | 19 | Era4 ~10.94h, Era5 ~14.64h |
| 4 Fleet/Ration | Pocket Ops ETAs, Orbit Mid, ration week star freeze | 20 | Era6 ~19.11h |
| 5 Worlds | Practice filings, desk gap, season chores, hearing docket | 21 | Era12 ~32.21h |
| 6 Polish | Checklist/lore/guide, HUD stars, 390px sheets, fix practice/trip bypasses | 21 | Docs synced |

### Post-polish hotfix

- Seed 1 Era 2 at **8992 s** (8 s under 2.5 h).  
- Fix: `DEPTH.openDaysNeedSideYard` **3 → 4**. Default pacing green again.

## C. What “done” means right now

- Plan pacing windows are **CI**, not aspirational.
- Depth content + stretch loops are in the sim and bot.
- Docs pack (`docs/grocery-empire/`) exists for agent handoff.

## D. UI density overhaul (2026-11-14)

No `SAVE_VERSION` bump — layout and teaching only.

- **Shell:** hub-aware `ScreenHeader` (stats only inside a hub), one-line Suggested next that defers to Next Goal, clause-level Next Goal hint, 390px speed/Undo, Sheet focus trap, reduced-motion scroll on Hits.
- **Store:** Floor phone Unpack dock only; facing/regulars/planogram in one sheet; Backroom hides empty Incoming; Build drops status band.
- **Supply / Team:** one supplier order and one hire row; cooler/routes/dispatch/franchises/shifts/flyers/rivals/venture bulk in Sheets; no empty truck/loyalty/curb cards; department bands removed.
- **Money / Empire / Worlds / Museum:** bands removed; Books four stats + Cashflow/History tabs; Charter progress `n/4`; Worlds `primary` is goal strip only; Museum gallery height capped.
- **Teaching:** stretch coach tours for regulars, shifts, invoices, planogram, flyers, cooler, dispatch, pockets, hearing; stuck-doctor prefers the current Next Goal verb.

## E. Phase 0 shell UI (started 2026-11-14)

No `SAVE_VERSION` bump. Baseline remeasure (seeds 1 and 42) was not run.

- Worlds panels and Upgrades use `ScreenHeader hub`. Museum keeps the gallery and drops the competing hero title.
- Charter goal **Open fork** scrolls to Standard / Boutique / Co-op. It does not sign Standard.
- Invoice book is a one-line status plus a Sheet. HelpCards that restated Next Goal are gone from Floor, Staff, Suppliers, Charter, Cold, Logistics, and Marketing.
- Empire rank line no longer repeats the header Stat. Doctrine board collapses once two doctrines are owned. Autonomous stays one line until release can succeed.
- Deleted unused `DepartmentBands` and `StatusBand`.

## G. 40.0 Phase 10 visual system (2026-11-15)

No `SAVE_VERSION` bump. Presentation only.

- **Shell layer:** HUD, stats, Next Goal bar, hubs, hub head, menu drawer / inbox and command palette moved from `g2.css` into `shell.css` under `@layer shell` (about 1,000 lines). Overlapping legacy and old shell rules were merged (the old shell overrides won in practice, so the dead legacy duplicates and the 1180px HUD block were dropped). Phone inbox label is now visually hidden instead of `display: none`.
- **Rooms:** `UpgradesHallScene`, `EarlyLandStreet`, map sky/ground on `--sc-night-*` (Rank and Strategy Hall share them).
- **Beats:** `useBeat` + `Beat` (fx), second regular arrival (Floor), manifest stance tick (Logistics), bed lock thunk + `ShelfFill` meter (Cultivar), `Seated n/3` meter + `CrateHop` (Charter).
- **Shop:** ledger skin on the Books room, unpack FX on the Floor room, ornaments on the Fleet harbor; `useMetaOptional` so scenes render without a provider.
- Verified: `npm test`, `npm run build`, `npm run lint` (no new warnings). Not browser-checked at 390px or in DevTools from this run.

## F. Related plans (Cursor)

Do not treat as live truth — this pack + code win:

- Era depth overhaul plan (prior)
- Pacing stretch megaplan (prior)

Update **this file** when you finish a phase or change SAVE_VERSION / measured times.

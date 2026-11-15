# Changelog — this chat arc (2026-11)

Two stacked overhauls on Grocery Empire 2.0, then the **2.0 expansion megaplan**, then the **feel overhaul**. `SAVE_VERSION` moved **12 → 29**.

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

## F. Related plans (Cursor)

Do not treat as live truth — this pack + code win:

- Era depth overhaul plan (prior)
- Pacing stretch megaplan (prior)

Update **this file** when you finish a phase or change SAVE_VERSION / measured times.

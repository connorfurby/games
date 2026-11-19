# Content catalog (high level)

Counts drift — treat this as a map, then open the cited file.

## Aisles — `content/categories.ts`

`cans`, `household`, `produce`, `dairy`, `meat`, `deli`, `bakery`, `frozen`, `privateLabel`, `import`, `ration`.

Unlocked mostly by memos. Facings in `content/depth/facings.ts`. Planet SKUs (Worlds) are a separate tagged list in `content/horizon/planets.ts` (~24 after stretch).

## Roles — `content/staff.ts`

- **Floor:** clerk, receiver, stocker, cashier, security, night, shiftLead  
- **Dept:** produceLead, dairyClerk, butcher, storeManager, plantOperator, coldDriver, lobbyistPerson, dispatcher, franchiseLiaison, purser, pilot, steward, hullTech  
- **Horizon annex:** surveyor, planogramClerk, broker, stevedore, grower, seasonHand, taster, translator, nightOperator, handler, diplomat, minutesClerk, whip  

Traits: quick / dreamy / frugal / picky (±5%).

## Upgrades — `content/upgrades/`

~470 nodes across trees (Floor, Supply, Brand, People, Automation, Capital, Orbital/space, Lab, Fresh, Logistics, Pantry, Exchange, Cultivar, Signal…). Bands Counter → Institution gated by Empire. Verbs must be read via `upgradeEffect`. `wired.test.ts` enforces wiring.

**40.0 Phase 9 verb nodes (all `upgradeEffect`, content-only, no SAVE bump):** `guest-patience` (Pantry, Era 7 — softens the climate guest's facing-ban cut via `climateBanPullMul`), `bed-lock-pad` (Cultivar, Era 9 — lifts the bed lock for the season's tail, `bedLockOpensIn`), `clause-amend-pad` (Signal, Era 11 — +1 Minutes Clerk amend per docket, `amendsPerDocket`), `endless-edit-pad` and `mutation-clear-pad` (Signal, Era 12, visible after Accept — slower list mutation / restores a mutated line when Ration pressure is cleared). Existing pads (`climate-serve-pad`, `yield-haul-pad`, `clause-seat-pad`, `accept-rehearsal-pad`) cover the climate-serve, season-chore and seating timers.

## Memos / goals / checklist

- Memos: `content/memos.ts` (+ era2 / horizon / flavor merges) — often hard-gates verbs.
- Goals: `content/goals.ts` — Next-goal + bot actions; every **required** verb needs an `action`.
- Checklist: `content/checklist.ts` — through Era 12 after stretch polish; Phase 9 adds climate guest (7), season chore (9), optional amend (11), endless mutation (12). Guide: `late-worlds-guests` / `-bed` / `-table` / `-endless` are era-locked (7 / 9 / 11 / 12).

## Builds / land / ventures / rivals

- Builds: `content/builds.ts` — storefront, storage, cold, production, transit, civic ladders. Facing variants (`BUILD_VARIANTS`) across eras 1–4 (slot keys `track:minTier`) **plus one binary safe/bold slot at the Era 5–6 tier of storefront (`storefront:7` Autonomous Hub — Beacon facade / Autonomous stacks), cold (`cold:5` Cryo Hub — Cryo showcase / Deep-cold bays) and transit (`transit:6` Barge Berth — Berth flags / Berth reefer rack) (SAVE 33)**; Civic stays a pure ladder; soft-cap 1.35; optional hibernate (SAVE 30). Migrate re-keys facings to their def's slot.
- Land expansions: `content/era2.ts` + repeatable stores (max 12).
- Ventures: `content/ventures.ts` — side tills with level-10 forks.
- Rivals: `content/rivals.ts` — one named chain per era from 2 (skip 6), price war / buyout + loop pressure. **Phase 9:** Era 6 has no chain, but the Ration Board (chain opens Era 12) skims `DEPTH.rationBoardDemandMul` of demand during ration week when the day's `stampLedger` is missed past `rationBoardGraceFrac` (`rationBoardBehind` in `systems/rivals.ts`, stateless — no SAVE).

## Empire / projects / perks / doctrines

- Empire rewards every 5 levels (`empireRewards.ts`), max level in `EMPIRE`.
- Projects: timed builds (`projects.ts`). **Phase 9 verb pads:** `pj-guest-awning` (E7, +`guestAwningPatience`), `pj-bed-glass` (E9, +`bedGlassOpen` of the season tail), `pj-embassy-chair` (E11, +1 amend per docket) — read as `s.projects.done[id]` in `formulas.ts` / `horizon.ts`.
- Perks: trait-point branches (`perks.ts`).
- Doctrines: Read chain (`era2.ts` + late).

## Horizon content

`content/horizon/` — planets, cultivars (traits incl. rich/quiet + named recipes), signal grammar, charter clauses (keep 4, Co-op fork), last-aisle list bank, headlines, dialogue. **Phase 9:** `guests.ts` — six named climate guests (Pilar, Ansel, Orla, Tamsin, Bram, Ismay; eras 7–9) that `serveClimateNeighbor` names in the log and PlanetsPanel shows at the door (`currentClimateGuest`, deterministic from `climateServed`, no state).

## Museum

Relics ~25/wing, survives rebrand. Do not casually change wing size (tests pin it): **25 per wing, Oddities 26**.

**Wing sockets (SAVE 36):** the museum's sockets (3, or 5 once `pj-fifth-socket` is done / `socketsUnlocked ≥ 5`) also light *finished wings*. A finished wing's bonus counts only while it is lit, so lighting wing A at full sockets means leaving another wing dark. `MuseumSave.litWings: WingId[] | null` (mirrored to `state.relics.litWings` by `syncRelics`); `null` = the first `cap` finished wings in wing order, so nobody has to touch it. Pure helpers `effectiveLitWings` / `wingLightBlock` in `content/relicPerks.ts` back `museum.ts` (`litWingsOf`, `canLightWing`, `lightWing(m, wing, cap, swapOut?)`, `darkenWing`), the `setWingSocket { wing, on, swapOut? }` command and `litWingIds(s)` (read by `stats.ts` instead of every finished wing). Relic sockets (×1.35 / ×1.45) are a separate pool and unchanged. MuseumPanel "Wing sockets" section: Light / Leave dark per finished wing, Light disabled at full with the reason in its title. **No new relics or feats this phase** — the Horizon wing is already 25 and a feat for the Phase 8 verbs (ban, carry) would resize it; revisit in a later content phase.


## Build tracks (2026-11-19)

Storefront, Storage, Cold, Production, Transit, Civic, **Signage**. Every tier's card states its real effect (`BUILD_TIERS` in `balance.ts`). Civic has no style choice (by design).

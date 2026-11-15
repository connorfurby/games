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

## Memos / goals / checklist

- Memos: `content/memos.ts` (+ era2 / horizon / flavor merges) — often hard-gates verbs.
- Goals: `content/goals.ts` — Next-goal + bot actions; every **required** verb needs an `action`.
- Checklist: `content/checklist.ts` — through Era 12 after stretch polish.

## Builds / land / ventures / rivals

- Builds: `content/builds.ts` — storefront, storage, cold, production, transit, civic ladders.
- Land expansions: `content/era2.ts` + repeatable stores (max 12).
- Ventures: `content/ventures.ts` — side tills with level-10 forks.
- Rivals: `content/rivals.ts` — one named chain per era from 2 (skip 6), price war / buyout + loop pressure.

## Empire / projects / perks / doctrines

- Empire rewards every 5 levels (`empireRewards.ts`), max level in `EMPIRE`.
- Projects: timed builds (`projects.ts`).
- Perks: trait-point branches (`perks.ts`).
- Doctrines: Read chain (`era2.ts` + late).

## Horizon content

`content/horizon/` — planets, cultivars (traits incl. rich/quiet + named recipes), signal grammar, charter clauses (keep 4, Co-op fork), last-aisle list bank, headlines, dialogue.

## Museum

Relics ~25/wing, survives rebrand. Do not casually change wing size (tests pin it).

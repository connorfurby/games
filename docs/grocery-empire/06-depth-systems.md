# Depth and pacing-stretch systems

State root: `GameState.depth` (`content/depth/index.ts` → `DepthState` / `emptyDepth()`). Commands: mostly `sim/commandsDepth.ts`. Tick helpers: `sim/systems/regulars.ts`, plus hooks in cold/chain/fleet/horizon.

## A. Facings

Each aisle has named facings (`content/depth/facings.ts`). Player features one per cat (`setFacing`). Affects pull / margin / spoil / cold load; shows on shelf.

## B. Departments

Defs in `content/depth/departments.ts`. Runtime: lead + specialists + policy. Seats via `staffDept.ts`.

| Dept | Era | Lead / notes |
| --- | --- | --- |
| Fresh | 1 | Produce Lead; dairyClerk / butcher |
| Chain | 2 | Store Manager |
| Cold | 3 | Plant Operator, coldDriver… |
| Logistics | 4 | Dispatcher, liaison, purser |
| Orbit | 5 | Pilot, steward, hullTech |
| Survey | 7 | Uses annex surveyor + planogramClerk |

Unstaffed → neglect floor / worse spoil / weaker layer pay.

## C. Contracts

`content/depth/contracts.ts` — greengrocer (produce aging cheap), commissary (chain), port broker (import). Terms interact with Invoice Book.

## D. Place traits & lanes

- Stores roll traits (commuter / night / family / tourist); policy match matters; mismatch drifts faster.
- Named lane routes prefer a cargo cat; manifests score clean when matched.

## E. Typed plants & bills

- Plants: compressor | tunnel | **blast** (only blast drains regional yield).
- **Plant power** (`setPlantPower`, SAVE 29): own up to three kinds, power two (`DEPTH.plantPowerSlots`). Dark plants stay owned but do not supply, earn, or drain yield. Bot powers blast + tunnel.
- Flyer bands soft / mid / deep: demand + (deep) spoil on featured perishables. Bot prints mid.
- Dept policies that now read in formulas/fleet/horizon: Chain Patrol/Push, Logistics Schedule/Push Freight, Survey Volume/Margin/Fresh.
- Politics: named bills hours/waste/labor/tax — leave needs N passed + empty yield.

## F2. Expansion verbs (SAVE 22–26)

One hard gate per era (counts + cooldowns + ETAs). Constants in `DEPTH` / `HORIZON`; commands in depth/fleet/horizon; bot pushes every sim second while `can` is true.

| Era | Verb | Gate |
| --- | --- | --- |
| 0–1 | Layaway slips / dock check-in (aisle + optional short) | Era 1 / side yard |
| 2–3 | Flyer band lock / hot-trait walks · Chain Patrol slows drift | Cold permit |
| 4–6 | Exam holds / berth turnarounds / ration ledger stamps | Berth / Era 6 / Continue |
| 7–9 | Climate neighbors (matching climate + shelf pull) / stop settlements / yield hauls | Era 8–10 |
| 10–12 | Habit watches (fail if agent mismatches) / clause seatings / accept rehearsal | Era 11–12 / Accept |

**Feel-overhaul decisions (SAVE 28):** Close shift cuts night shrink; Mid eases lunch checkout; household + privateLabel facings; `lastDockAisle` + `climateGuest` fields.

## F. Eight stretch systems (the length)

### 1. Regulars
Named shoppers with wants + patience (`content/depth/regulars.ts`, `systems/regulars.ts`). Serve → stars; miss → star hit + demand cut. Gate fuel for Era 1 / side yard / trust.

### 2. Shift Board
Slots `open` / `mid` / `close`. Assign staff; day rollover covers Open days. Side yard / cold / barge / Orbit Mid / Survey gates read coverage. Unstaffed Open hurts spoil/demand.

### 3. Flagship planogram
6-slot pre-Worlds puzzle (`flagshipPlanogram.ts`). Practice filings then credit. Refiles after deli/bakery (chain) and import (globe).

### 4. Invoice Book
Wholesale creates invoices; `payInvoice` early discount / late fee. On-time counts gate lot survey / side yard / leave / barge paths. Unpaid cap prevents infinite float.

### 5. Star Board
Public 1–5 rating. Soft-caps demand; blocks memos below floor; cold permit needs higher floor. HUD chip on Next-goal. Freezes during Era 6 ration week.

### 6. Flyer Desk
`printFlyerWeek` (compat `setCircular`). Run + long cooldown. Cold permit needs N completed weeks. Penny can force counter-flyer.

### 7. Cooler Log + Dispatch Board
- Cooler: timed `signCoolerLog`; plant op on shift auto-signs; misses raise brownout / FreshWay spoil; leave needs N logs.
- Dispatch: clean manifests on named lanes; MegaMart snipes unassigned; barge needs N clean manifests.

### 8. Pocket Ops + Hearing Docket
- Hauler trips with ETA (`dispatchHauler`); matching ration clears pocket progress; wrong ration wastes. Era 6 needs **done** trips, not idle drain.
- Era 11: Concord hearing sessions; Minutes Clerk amends; charter blocked until docket clear.

## G. Worlds practice

`depth.practice` (or equivalent) tracks per-layer practice left / credited. `fileStandard*` first N are practice — **must not** feed `maybeOpenEras`. After practice, unique planet/circuit credit + desk gap.

## H. Rivals vs loops

| Rival | Pressures |
| --- | --- |
| Penny | Aisle lock / counter-flyer |
| FreshWay | Spoil without tunnel + log |
| MegaMart | Franchise / unassigned lanes |
| Halo | Pocket / charter axis |
| Drift / Keel / Verdant / Static / Concord / Ration | World SKU lock, bay theft, trait undercut, symbol jam, hearings, list line |

Keep price war / buyout; add loop pressure, don’t only clone stores.

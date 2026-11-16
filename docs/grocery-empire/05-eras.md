# Eras 0–12 — doors and gates

`GameState.era` is an integer 0–12. `setEra` only moves forward. Titles live in `content/lore.ts` → `ERA_STORY`. Campaign spine: `content/goals.ts` (`opensEra` marks the goal that flips the era when done — the **code** gate is authoritative).

## Quick table

| Era | Title | Hard door (summary) | Opens |
| --- | --- | --- | --- |
| 0 | The Counter | Start · **layaway slips** (manual serve) | Flagship loop |
| 1 | Corner Store | Facing + bells + regulars + **dock check-ins** + stars + baskets/Open | Build, upgrades, Fresh |
| 2 | Chain | Side yard + invoices + planogram + Open days · **flyer band lock** | Stores, Attention, Penny |
| 3 | Cold Chain | Cold permit after flyers + matched stores + **hot-trait walks** + stars | Cold, politics, FreshWay |
| 4 | Autonomous Globe | Leave region + cooler logs · **exam holds** on Dispatch | Lanes, franchises, MegaMart |
| 5 | Seed Barges | Launch after cleans + exams + logistics · **berth turnarounds** gate Era 6 | Fleet, Halo |
| 6 | Hungry Universe | Pockets + Orbit Mid + Hold + stars · **ration ledger stamps** before Continue | Ending door |
| 7 | Pantry of Worlds | Continue / unseal · **climate neighbors** for Era 8 | Planets, survey |
| 8 | The Exchange | Credited worlds + Survey · **stop settlements** for Era 9 | Convoys, Keel |
| 9 | Cultivars | Credited circuits · **yield hauls** for Era 10 | Greenhouse |
| 10 | The Signal | Named / weak years · **habit watches** (posted habit) for Era 11 | Signal, agents |
| 11 | Charter | Phrases + relay · **clause seatings** + hearing on each seated clause for Era 12 | Clauses, embassies |
| 12 | The Last Aisle | Charter + keep-N + hearing · **accept rehearsal** (can scratch a line) before Accept | Ivo’s list / endless |

There is **no Era 13**.

## Early gates (code pointers)

- **0→1:** `sim/unlocks.ts` → `tickEra` — featured cans, `marketBellDips`, regulars, stars, basket/hire rules from `DEPTH`.
- **1→2:** `expandLot` side-yard/lot in `commands.ts` — write-offs, Produce Lead, Corner Store, dairy, regulars, on-time invoices, flagship planogram credit, Open days (`openDaysNeedSideYard`), stars.
- **2→3:** `cold-plant-permit` memo — flyer weeks, matched stores, stars, depot/commissary, chain planogram credit.
- **3→4:** `leaveRegion` — yield empty (blast-only), bills passed, cooler logs, plants, shift coverage, stars.
- **4→5:** barge berth / `launchBarge` — clean manifests **and** sworn exams (SAVE 33: separate credits — a filing is clean OR exam-ready OR fast, never two), logistics staffed, franchise stable/defection, Import + port broker, globe planogram, stars.
- **5→6:** `fleet.ts` tick — pockets cleared via Pocket Ops **done** trips (two open pockets can want different rations while one hauler sails; `pocket-concurrent` decides whether both get fed), ration facing, Orbit Mid, drift Hold, stars.
- **7→12:** `horizon.ts` → `maybeOpenEras` — fast score 0.85 / slow 0.72 counts; **only `gateCredited` filings** (practice never counts); hearing docket blocks charter.
- **7–9 trade-offs (SAVE 34, gates unchanged):** each climate serve bans your strongest facing until the shift turns; each settlement locks the stop's spoil / tariff / delay onto that circuit; each season chore locks the bed (no other chore, no clever cross) until the season turns. Decision goals: `climate-guest-facing` (7), `settle-stop-tax` (8), `season-chore` "Lock a season bed" (9) replace the Planogram Clerk / Stevedore hire goals; filing goals stay underneath.

- **10–12 decisions (SAVE 35, gates unchanged):** filing a credited phrase **posts its habit** (`horizon.postedHabit { habit, until, agentId }`) — the matching agent is locked (`setAgentHabit` / `fireAgent` refuse) and skips their own habit job until the watch resolves; an unheld post is claimed by setting an agent to it; a mismatch still fails the watch. `seatClause` records the clause (`seatingClause` → `seatedClauses`) and Concord's hearing asks about **the clause you seat** (`nextHearingClause`; Minutes Clerk amends one grudge per docket, the seat stays). `rehearseAccept` can **miss** — always below the 0.85 mean, else `HORIZON.rehearsalMissChance` — and scratches the weakest filled line; Accept still wants 0.85. Goals: "Post the habit" (10), "Seat this clause" + "Sign the charter" with Standard / Boutique / Co-op forks on Next Goal (11), "Rehearse the list" (12); filing counts show underneath via `GoalDef.counts`.

## Puzzle bars (Worlds)

| Constant | Typical | Meaning |
| --- | --- | --- |
| slow / standard | 0.72 | `fileStandard*` landing; slow era path |
| fast | 0.85 | Clever play shortens the era |
| practice per layer | 2 | Must complete before credit |
| desk gap | ~22 min | Between standard filings |
| slow worlds / circuits / phrases | 8 / 6 / 5 | Slow path counts |
| clause keep | 4 | Charter |
| list accept | 0.85 | Last Aisle Accept |

## Prestige / endings

- **Rebrand** (Era 3+): fresh store, keep Empire/Goodwill/museum/doctrines.
- **Era 6 (SAVE 33):** Continue → 7 (no wipe); **Accept rebuilds like Rebrand** (`freshRunKeepingMeta` in `systems/prestige.ts`: Empire, museum, Goodwill (+ banks this run's pending), tutorials/tips, prestigeCarry appetite/tipSharpness/universe kept; store, staff, depth board, upgrades, fleet, cash reset) then opens the Hungry laws board (0–2 of Faster spoil / Richer yield / Weird elasticity / Expensive ads; laws are re-picked, not carried); Reject → pause. FleetPanel shows Continue / Accept / Reject as three ActionRows, Accept listing the law options. Bot still Continues.
- **Era 12:** Accept → endless thins; Reject → refuse-twice → pause.

## Bot path

Campaign bot in `sim/bots.ts` takes the **slow legal path**: serve regulars, pay invoices, assign shifts, print flyer weeks, sign cooler logs, dispatch manifests, haul pockets with ETAs, practice then credit Worlds filings, match the phrase habit before filing and claim an unheld post, seat the default four clauses, answer hearings, sign Standard, rehearse only at a 0.85 mean. It does **not** rebrand. Manifest stance: files **exam-ready** while `examHoldNeed` is unmet and the exam clock is ready, else **clean** while cleans are short and the clean clock is ready; never fast.

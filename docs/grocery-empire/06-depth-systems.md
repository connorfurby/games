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

**Policies UI (SAVE 32):** `StaffPanel` renders one `Disclosure` per unlocked department (`DEPARTMENTS` filtered by `era >= d.era`), each policy as a button + one-line `blurb` via `setDeptPolicy`. A lead is still required (the reason shows when missing). Bot keeps default (null) policies.

## C. Contracts

`content/depth/contracts.ts` — greengrocer (produce aging cheap), commissary (chain), port broker (import). Terms interact with Invoice Book.

## D. Place traits & lanes

- Stores roll traits (commuter / night / family / tourist); policy match matters; mismatch drifts faster.
- **Hot trait UI (SAVE 32):** `hotTraitInfo(s)` (`systems/chain.ts`) exposes the live `blockEvent.traitBias`, matching store policies and matched-door count; LandPanel shows it in the block callout, the hot-trait line and a StatusChip. Era < 2 keeps the Land EmptyState.
- Named lane routes prefer a cargo cat; manifests score clean when matched.

## E. Typed plants & bills

- Plants: compressor | tunnel | **blast** (only blast drains regional yield).
- **Plant power** (`setPlantPower`, SAVE 29): own up to three kinds, power two (`DEPTH.plantPowerSlots`). Dark plants stay owned but do not supply, earn, or drain yield. Bot powers blast + tunnel.
- **Blast suppresses tunnel (SAVE 32):** `depth.blastSuppressesTunnelUntilLog` is set when `setPlantPower` includes blast (and when `buyPlant('blast')` auto-powers it); cleared by every `signCoolerLog` (manual or Plant Operator auto-sign). `blastSuppressesTunnel(s)` is true only while blast is still powered; then `tunnelFreshAgeMul` returns 1 (no `DEPTH.tunnelFreshAgeMul` cut). Leave-region still needs blast powered; bot still signs logs. ColdPanel shows a FailReason: “Blast is draining yield — tunnel spoil cut returns after Cooler log.”
- Flyer bands soft / mid / deep: demand + (deep) spoil on featured perishables. Bot prints mid.
- Dept policies that now read in formulas/fleet/horizon: Chain Patrol/Push, Logistics Schedule/Push Freight, Survey Volume/Margin/Fresh.
- Politics: named bills hours/waste/labor/tax — leave needs N passed + empty yield.

## E2. Read / Strategy (4.0)

- Tournaments spend 120 Att → bank Read, then cool for `CAPITAL.tournamentCooldownSec` (600s). Auto-tourney respects the same cooldown.
- Doctrine ladder costs scale with `doctrineGrowth` **1.65** (multi-hour sink).
- Hard gates: depot needs `depotReadNeed` (12); Autonomous needs `autonomousReadNeed` (48) + repSpent; first barge still needs Fleet Read.
- Companion goal `bank-read` (bank `DEPTH.bankReadNeed` = 24).

## E3. Build facings (4.0 · SAVE 30)

- Slot keys `buildVariants["track:minTier"]` (legacy track-only keys normalize on migrate). Choices across eras 1–4 on storefront / storage / cold / production / transit (2–3 gates per track where defined). Soft-cap product ≤ **1.35**. Bot always picks `safe`. Museum FEAT `facing` / Oddity **Facing Choice** on first pick.
- **Era 5–6 facings (SAVE 33):** one binary safe/bold slot each on storefront (`storefront:7`, Autonomous Hub — no storefront tier opens in Era 5–6, so the last tier before Probe Plaza), cold (`cold:5`, Cryo Hub) and transit (`transit:6`, Barge Berth). Same shape (safe = shelf/spoilCut ~×1.10, bold = demand ×1.08), same 1.35 soft cap; **Civic stays a pure ladder**. `normalizeBuildVariants` re-keys every entry to its def's own slot and drops unknown ids.
- Bot picks `safe: true` variants; never hibernates. `hibernateBuild` parks a tier with partial refund.

## F2. Expansion verbs (SAVE 22–26)

One hard gate per era (counts + cooldowns + ETAs). Constants in `DEPTH` / `HORIZON`; commands in depth/fleet/horizon; bot pushes every sim second while `can` is true.

| Era | Verb | Gate |
| --- | --- | --- |
| 0–1 | Layaway slips (8 at a 90s gap — finishes before baskets; after that matching visits auto-serve) / dock check-in (first 3 choose aisle, then receiver + Autopilot finish 28; the desk and the free crates stop once the count is in) | Era 1 / side yard |
| 2–3 | Flyer band lock / hot-trait walks · Chain Patrol slows drift | Cold permit |
| 4–6 | Exam holds / berth turnarounds / ration ledger stamps | Berth / Era 6 / Continue |
| 7–9 | Climate neighbors (matching climate + shelf pull) / stop settlements / yield hauls | Era 8–10 |
| 10–12 | Habit watches (posted agent locked; fail if mismatched) / clause seatings (hearing on each seat) / accept rehearsal (miss scratches a line) | Era 11–12 / Accept |

**Worlds trade-offs (SAVE 34):** the 7–9 ETAs are unchanged; what the wait *costs* changed.

- **Climate guest vs facing (Era 7):** a successful `serveClimateNeighbor` bans the flagship's strongest-pull featured facing (`guestBanTarget`: highest `pullMul` across unlocked categories, first category wins a tie). `depth.climateFacingBan = { tag: facingId, cat, until }`, `until` = next `DEPTH.shiftDaySec` boundary. `facingPullMul` multiplies that category by `DEPTH.climateFacingBanPullMul` (0.85) while the ban is live **and** that facing is still featured — swapping the facing dodges it. `activeFacingBan(s)` is the UI read. No facing set → no ban. Six serves still open Era 8; bot serves and eats the cut.
- **Stop personality (Era 8):** a credited `fileStandardConvoy` arms `horizon.pendingStop = { index, kind: stopKind }` alongside `settlementUntil`. `settleStop` writes `circuit.settledKind` (`pendingSettlement` falls back to the first credited unsettled circuit for pre-34 saves / cleared rows; `clearCircuit` re-indexes the pending row). Tax applies while the circuit stands (refiles keep it): **spoil** — that circuit's route weight ×(1 − `HORIZON.stopSpoilCut` 0.12) in `routeNetworkMul`; **tariff** — freight trickle ×`stopTariffMul` (−0.06 each, floor 0.76) in `tickTrickles`; **delay** — next settlement ETA ×`stopDelayMul` (+0.08 each, cap +0.24). ExchangePanel names the stop's personality and "You live with: …" before Settle; circuit rows show the tax. Bot settles whatever is pending.
- **Season bed lock (Era 9):** `doSeasonChore` sets `horizon.bedLockedChore`; while set, other chores fail `can()` ("The bed is locked to X…") and clever `plantCross` fails — `fileStandardCross` still files. `tickSeasons` clears it at the turn. Skipping the chore keeps clever crosses open for a named-cultivar chase at the cost of a weak year. CultivarPanel shows a locked StatusChip and a chase line when the picked parents make a named cultivar or a named bed sits under 0.85. Bot does the chore Next Goal names.

**Signal / Charter / Last Aisle decisions (SAVE 35):** the 10–12 ETAs are unchanged; each wait now asks for a choice.

- **Posted habit (Era 10):** a credited `fileStandardPhrase` (or a clever `commitPhrase` at ≥0.85 while the desk is free) starts the watch through `startHabitWatch` → `postHabitWatch`, which writes `horizon.postedHabit = { habit, until, agentId }` and locks the first agent already on that habit. While the watch runs, `canSetAgentHabit` / `canFireAgent` refuse the posted agent and `tickAgents` skips them (off their own job for the travel ETA). `agentId: null` = unheld; `setAgentHabit` to the posted habit claims it. `tickHorizonVerbs` credits only if the holder still has the habit (unheld: any agent on it); otherwise the watch fails as before. Pre-35 watches read the live phrase (cleared on filing), so they always matched — the post fixes that. SignalPanel: "Posted" pocket (warn tone when unheld) + locked agent row.
- **Seated-clause hearing (Era 11):** `toggleClause` sets `horizon.seatingClause`; `seatClause` seats it (`pendingSeatClause`), pushes `seatedClauses`, and opens a Concord session on `nextHearingClause` (first seated, not yet in `heardClauses`). The Concord rival tick only files for seated clauses (no random pool). Releasing a pending clause tears up its seal; releasing a seated one vacates the seat (`seatingsDone − 1`). Minutes Clerk `canAmendHearing`: one per docket (`HORIZON.hearingAmendsPerDocket`), adds to `amendedClauses` so `activeGrudges(kept, amended)` drops that grudge — the clause stays kept and seated. CharterPanel hearing sheet: session N/M with Clause · Grudge (struck when amending) · Minutes Clerk rows and one primary ("Answer" or "Amend & answer").
- **Charter fork on Next Goal (Era 11):** `GoalDef.choices` — `charter-signed` offers Standard / Boutique / Co-op once seatings + keep-4 + docket are done, each with `CHARTERS[id].fork` ("Network ×1.25 · standard-only puzzles." / "Puzzles can score 1." / "Ventures ×1.12 · network ×0.92."). `action` still returns Standard for the bot.
- **Rehearsal can miss (Era 12):** `rehearseAccept` no longer needs the 0.85 mean to try. Below it, it always misses; at it, `rehearsalMissChance` = `HORIZON.rehearsalMissChance` (0.2) − Accept Rehearsal Pad (cap 0.08). A miss blanks the weakest filled line (`rehearsalScratch`), recomputes the mean and starts a `rehearsalRetrySec` wait; a hit starts the 900s desk gap. Accept still needs 0.85 + a finished rehearsal. LastAislePanel shows "Scratch risk N%" and the scratched line. Post-door only.

**Loadout decisions (SAVE 36):** endless mutation, Rebrand and the museum each ask for one choice.

- **Endless mutation bans a loadout piece (Era 12, post-door):** every `endlessMutateEvery(s)` worlds `mutateEndlessList` scratches one line (as before) and `pickEndlessBan` picks — deterministically from seed, `listMutations` and `endlessPlanets` — one **kept clause** or one **set venture fork** (`level ≥ 10`, `policy` a/b; `activeForkVentures`). It writes `horizon.endlessBan { kind: 'clause' | 'ventureFork', id }` (null when nothing is kept or set). `enforceEndlessBan` (on mutation and every `tickHorizon`) releases a banned clause (no seal toll, no toggle count, seat vacated) or unsets a banned fork. `canToggleClause` / `canSetVenturePolicy` refuse the banned id (`endlessBanReason`). Toggling **another clause** (for a clause ban) or setting **another venture's fork** (for a fork ban) lifts the ban; toggling the banned one never does; the next mutation replaces it. New probes stay climate copies and `endlessDivisor`'s harmonic thinning is untouched (JS number safety). UI: `EndlessBanNote` (`endlessBanLine`) on LastAisle, Planets and Ventures, and a per-venture line + disabled fork buttons with the reason in VenturesPanel. Post-door only; no CI/pacing change.
- **Rebrand carry: one doctrine OR one facing:** `RebrandCarry = { type: 'doctrine', id } | { type: 'facing', track, variantId } | null` (`systems/prestige.ts`). `canCarry` allows only an owned doctrine or a chosen facing and rejects a doubled object ("not both"); an invalid carry is dropped, never half-applied. `freshRunKeepingMeta(s, now, carry)` puts the doctrine in `fresh.doctrines` or the facing in its `track:minTier` slot (it sleeps until that tier is rebuilt — `buildVariantMul` already ignores facings below their tier). Goodwill is still `floor(cbrt(lifetimeRevenue / 1e6))` whatever is carried. `Engine.rebrand(carry?)` and `acceptEnding { carry? }` take the same value, so Era 6 Accept and Rebrand carry identically. **The bot never rebrands or accepts** (`phase8.loadout.test.ts` scans `bots*.ts`).
- **Shared "what you keep" sheet:** `ui/components/PrestigeKeepSheet.tsx`, rendered by `ConfirmModal` (`spec.sheet`) from EmpireBoard (Rebrand) and FleetPanel (Accept). Standing keep-list (Empire, trait points, museum, Goodwill with the pending gain), Hungry laws (Rebrand: the laws on now; Accept: the board that reopens), and the carry picker (toggle one doctrine or one facing; choosing one replaces the other).
- **Museum wing sockets:** see 08 (Museum).

**Feel-overhaul decisions (SAVE 28):** Close shift cuts night shrink; Mid eases lunch checkout; household + privateLabel facings; `lastDockAisle` + `climateGuest` fields.

## F. Eight stretch systems (the length)

### 1. Regulars
Named shoppers with wants + patience (`content/depth/regulars.ts`, `systems/regulars.ts`). Serve → stars; miss → star hit + demand cut. Gate fuel for Era 1 / side yard / trust.

**Two at once (SAVE 31):** `depth.regulars` keeps `activeId` (Serve target) and adds `waitingId` + `waitingPatienceUntil` + `waitingLayaway` (second shopper). A second named shopper walks in once `arrivesAt` (spawn + `regularVisitGapSec`) passes while the primary is still unserved; the waiting shopper never auto-serves. Both patiences tick; a waiting miss uses the same star nick as an active miss. `serveRegular` only serves `activeId`; on resolve the waiting shopper promotes with their *remaining* patience. `focusRegular { which: 'waiting' }` swaps the two (Serve targets the other). The Facing sheet shows "Maya wants tomatoes on cans" for the primary, plus "Also waiting" + "Switch to {name}". Bot serves `activeId`, and switches focus only when the primary cannot be served but the waiting one can. No new cast.

### 2. Shift Board
Slots `open` / `mid` / `close`. Assign staff; day rollover covers Open days. Side yard / cold / barge / Orbit Mid / Survey gates read coverage. Unstaffed Open hurts spoil/demand.

### 3. Flagship planogram
6-slot pre-Worlds puzzle (`flagshipPlanogram.ts`). Practice filings then credit. Refiles after deli/bakery (chain) and import (globe).

### 4. Invoice Book
Wholesale creates invoices; `payInvoice` early discount / late fee. On-time counts gate lot survey / side yard / leave / barge paths. Unpaid cap prevents infinite float.

### 5. Star Board
Public 1–5 rating. Soft-caps demand; blocks memos below floor; cold permit needs higher floor. HUD chip on Next-goal. Freezes during Era 6 ration week.

### 6. Flyer Desk
`printFlyerWeek` (compat `setCircular`). Run + long cooldown. Cold permit needs N completed weeks (reads `flyerWeeks`, unchanged). Penny can force counter-flyer.

**Rival stance (SAVE 32):** the *live* flyer's band (`flyerLiveBand`, `sim/systems/flyerStance.ts`; no new state, read from `depth.flyer` while `until > time`) shapes rival pressure for that week only:
- **Deep** → Penny: aisle-lock chance ×`DEPTH.flyerDeepPennyLockChanceMul` and quiet gap ×`flyerDeepPennyLockGapMul`.
- **Soft** → FreshWay: spoil mul ×`DEPTH.flyerSoftFreshWaySpoilMul`, applied even with tunnel + recent log.
- **Mid** → neutral (bot path). MarketingPanel's Flyer Desk sheet shows “Deep pulls Penny · Soft feeds FreshWay spoil · Mid is calm.”

### 7. Cooler Log + Dispatch Board
- Cooler: timed `signCoolerLog`; plant op on shift auto-signs; misses raise brownout / FreshWay spoil; leave needs N logs.
- Dispatch: barge needs N clean manifests **and** N sworn exams.
- **Manifest stance (SAVE 33):** each filing is ONE of `clean | exam | fast` (`ManifestStance`, `setManifestStance { laneId, stance }`, or `setManifest { …, stance? }` defaulting to `exam`). They never stack on the same filing:
  - **clean** — credits `cleanManifests` immediately, no exam window; ticks `dispatch.lastCleanAt` on its own `dispatchCycleSec` clock. FailReason: "Clean credit cooling — N min…".
  - **exam** — opens the exam hold (`examLaneId/examUntil`); `swearExam` credits `examsHeld` only (NOT a clean); ticks `lastCycleAt`.
  - **fast** — cash burst (`LOGISTICS.matchedLaneCashPerSec × DEPTH.fastManifestSec`), burns `DEPTH.fastManifestFuel`, no credit, no hold, next filing waits only `fastManifestCooldownFrac`; the lane is **left open** (`laneLeftOpen`) so existing MegaMart snipe pressure targets it and the snipe drains its fuel. Refiled clean/exam it closes again.
  - `depth.dispatch.laneStances` records each lane's current stance. Clean/fast require the lane's matched cargo (FailReason names it); fast needs fuel. Re-filing a lane clean/fast drops its own open exam hold.
  - LogisticsPanel Dispatch Board: per lane, three ActionRows (Clean / Exam-ready / Fast) with a FailReason under each blocked one.
  - **Bot** (`botsFleet.ts`): files exam-ready while exams < need and the exam clock is ready (and no live hold), else clean while cleans < need and the clean clock is ready; re-matches an unmatched lane with an exam hold otherwise. Two clocks keep the old ~70 min/cycle pacing even though the gates now need 13 credits instead of 8 (documented in the file header).

### 8. Pocket Ops + Hearing Docket
- Hauler trips with ETA (`dispatchHauler`); matching ration clears pocket progress; wrong ration wastes. Era 6 needs **done** trips, not idle drain.
- **Two pockets, one hauler (SAVE 33):** pockets already spawn with six different rations. `pocketConcurrency(s)` = `DEPTH.pocketTripConcurrent` (1) + `upgradeEffect('pocket-concurrent')` (Second Berth); `pocketsOutrunHauler(s)` is true when ≥2 open pockets want different rations and concurrency is 1. FleetPanel shows both open pockets, a waiting StatusChip ("N rations open · 1 hauler"), and the dispatch FailReason says one hauler feeds one ration until Second Berth. With concurrency 2 each hauler must carry its own pocket's ration — a wrong load still wastes the trip. Bot still sails one trip at a time.
- Era 11: Concord hearing sessions; Minutes Clerk amends; charter blocked until docket clear.

## G. Worlds practice

`depth.practice` (or equivalent) tracks per-layer practice left / credited. `fileStandard*` first N are practice — **must not** feed `maybeOpenEras`. After practice, unique planet/circuit credit + desk gap.

## H. Rivals vs loops

| Rival | Pressures |
| --- | --- |
| Penny | Aisle lock / counter-flyer (deep flyer week pulls harder) |
| FreshWay | Spoil without tunnel + log (soft flyer week feeds it) |
| MegaMart | Franchise / unassigned lanes |
| Halo | Pocket / charter axis |
| Drift / Keel / Verdant / Static / Concord / Ration | World SKU lock, bay theft, trait undercut, symbol jam, hearings, list line |

Keep price war / buyout; add loop pressure, don’t only clone stores.

## Company crises

Public-eye corner cards (`content/corp/crises/`, `sim/corp/more.ts`). ~240 unique events across eras 1–12 with `era` / `lastEra` windows. Eight kinds share outcome presets in `CRISIS.kinds` (shoppers, cash, stock, wages, side tills, Heat, spectacle spikes, share walk). `corp.more.seen` drives least-seen picks; ticker kinds need a listed company. Ignore uses `CRISIS.ignore` (mild) so pacing bots stay green.

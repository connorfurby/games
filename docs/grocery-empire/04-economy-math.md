# Economy and math

Source of truth: [`sim/balance.ts`](../../src/games/grocery-empire/sim/balance.ts). Formulas: [`sim/formulas.ts`](../../src/games/grocery-empire/sim/formulas.ts), network: [`sim/systems/network.ts`](../../src/games/grocery-empire/sim/systems/network.ts).

## Core identity

```
flagshipRevenue ≈ unitsSold × shelfPrice × categoryPriceRatio × revenueMuls
networkCash     ≈ (networkMul − 1) × flagshipRevenue × NETWORK.margin
```

`VALUE` scales **both** shelf economics and wholesale cost, so `bestPrice ≈ cost × elasticity/(elasticity−1)` stays put while profit scales.

### `VALUE` (current)

- **Storefront** indices 0–10: `[1, 1, 2, 3.5, 6, 10, 16, 24, 32, 40, 52]`  
  (Empty…Hub, then Probe Plaza / Atrium / Last Aisle)
- **Era** 0–12: `[1, 1.5, 2.5, 5, 10, 20, 40, 70, 120, 200, 340, 560, 900]`  
  Eras 7–12 step modestly; network layers carry the jump.

### `NETWORK` (selected)

| Knob | Value | Meaning |
| --- | --- | --- |
| margin | 0.55 | Profit share of a copied sale |
| storeBase / perLevel | 0.7 / 0.08 | Chain store weight |
| neglectFloor | 0.55 | Unattended / unstaffed floor |
| storesBeforeDepot | 4 | Then `noDepotMul` 0.6 |
| perDistrict / perLane / perBarge | 0.3 / 0.25 / 0.15 | Layer adds |
| oldLayer | costSteepen 1.12, weightSoft 0.4 | Prior layer soft-caps once next layer online |

## Demand (flagship)

Roughly:

```
shoppers/s = DEMAND.baseShoppersPerSec
           × (refPrice / price)^elasticity
           × demandMultipliers
```

Base shoppers **0.25**/s, elasticity **1.35**, ads **×1.08** per level (cost doubles).

Multipliers include: Empire, reputation, variety, word of mouth `1 + 0.45·log10(1+baskets/60)`, marketing posture, rivals, stars, early-demand ramp, Open/Close, circular/flyer, ration week, Build facing (`buildVariantMul`, soft-cap **1.35**), mutators, etc.

### Read / Strategy (`CAPITAL`, 4.0)

| Knob | Value | Meaning |
| --- | --- | --- |
| tournamentAttention | 120 | Att spent per Read tournament |
| tournamentCooldownSec | 600 | Sim seconds between tournaments |
| tournamentBaseRead / readPerDoctrine | 4 / 1.5 | Payout base + per owned era2 doctrine |
| doctrineBaseRead / doctrineGrowth | 6 / 1.65 | Rising Read cost for the ladder |
| depotReadNeed | 12 | First depot hard gate |
| autonomousReadNeed | 48 | Autonomous release (with repSpent) |

**Bottlenecks** (`salesBottleneck`): `shelf` | `unpack` | `checkout` | `demand`.

## Early / stretch economy (`DEPTH`)

These are the knobs that made Era 1–2 hit plan windows. Re-read live file — values drift.

| Area | Intent |
| --- | --- |
| `earlyDemandMulStart` → `End` | Soft foot traffic until facing + regulars |
| `ERA1_BASKETS_GATE` / `ERA1_HIRE_BASKETS` | Volume still required with hire path |
| `marketBellNeed` | Count of dips (not one checkbox) |
| `era1RegularNeed` / `era2RegularNeed` | Satisfied regular visits |
| `layawaySlipNeed` / `layawayVisitGapSec` | 8 slips, 90s gap. Opening click, done before the basket gate |
| Invoice float | Wholesale → invoice; `payInvoice` early disc / late fee |
| `payroll.softCapFrac` | ~0.30 of recent revenue max wages |
| Stars | Soft-cap demand; memo floors (~3.0); cold permit ~3.7 |

Wholesale index: sine + drift (`WHOLESALE`); Market Bell counts orders at/below `tipIndex * marketBellIndex`.

## Cold / fleet / horizon money

- **Cold plants:** typed compressor (income drip) / tunnel (spoil cut) / **blast** (only yield drain). Yield sized so staffed blast clears in tens of minutes after log/bill work — all-compressor yards never leave.
- **Lanes / franchises:** minutes-of-revenue first buy, then geometric; matched wet cargo → `perLane`, mismatch ≈ `perDryLane`.
- **Barges:** priced by **launches** (not barge count); growth steep (~2.4). Pocket Ops trips replace idle biomass drain.
- **Horizon:** cash buys floor at `HORIZON.cashGateSec` (300s of revenue). Puzzle verbs spend survey / freight / seed / signal / seal.

## Prestige

**Rebrand** from Era 3: Goodwill `floor(cbrt(lifetimeRevenue/1e6))` → value/demand + start cash. Bot does **not** rebrand; first-run pacing is the floor.

Era 6 Continue → Era 7 on same save. Accept → soft NG+ with Hungry mutators. Reject → pause (unseal later).

## Safety

Sim uses JS `number`. Keep income well under `~1e300`. Era 6 should still top out near `~1e15/s` before Continue. Cap endless / lead bonuses (`HORIZON.leadBonusCap`).

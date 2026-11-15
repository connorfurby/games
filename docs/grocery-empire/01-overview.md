# Overview

## Thesis (2.0)

Each era multiplies income on the order of ~1,000×, and **the store you started with stays the engine**.

```
income ≈ flagship sales × VALUE(storefront, era) × networkMul × NETWORK.margin
```

- **Flagship** — the only store you stock, price, unpack, and check out.
- **Value ladder** — premium stock: shelf price *and* wholesale cost scale together so best price stays put while profit scales.
- **Network** — chain stores, districts, cold Momentum, lanes, barges, then Worlds layers copy flagship sales at `NETWORK.margin` (0.55).

Every purchase should visibly change the store. Upgrades/perks are worth ≥ ×1.25 on something, or a new **verb**. Stat-only nodes are weak after soft-cap `(1 + bonus)^0.7`.

## Product identity

Grocery Empire is a deterministic, command-driven tycoon: start at a counter, grow through chain → cold → globe → barges → a ration door → optional Worlds (planets, exchange, cultivars, signal, charter, last aisle). Prestige is **Rebrand** (from Era 3): keeps Empire / doctrines / museum / Goodwill.

## Top-level layout

```
src/games/grocery-empire/
  content/     # data: goals, memos, upgrades, depth, horizon, staff…
  sim/         # pure deterministic engine
  ui/          # React paint layer (dispatch only)
  art/         # (if present) assets
  definition.ts
```

Hubs (no seventh hub): **Store · Supply · Team · Money · Empire · Worlds · Museum**. Worlds content also grows rows inside the first five hubs via late systems.

## Player loop (all eras)

1. Keep the flagship ringing (shelf / unpack / checkout / demand bottleneck).
2. Spend cash (and later Attention / Read / horizon currencies) on the era’s verbs.
3. Follow the **Next-goal** bar (`content/goals.ts`) — the campaign bot is the unhurried path.
4. Hit the era door (hard `can()` / `setEra` checks, not flavor goals alone).

## Two overhauls on top of 2.0

1. **Era depth overhaul** — departments, facings, typed plants, pockets, puzzle 0.72/0.85 bars, more roles. Lengthened content but bot still raced (~9 min Era 1).
2. **Pacing stretch megaplan** — replaced one-shot checkboxes with sustained loops (regulars, shifts, invoices, flyer weeks, cooler logs, dispatch, pocket trips, practice filings, hearing docket). CI floors moved to the real plan windows. Bot Last Aisle ~32 h.

See [10-changelog-chat.md](10-changelog-chat.md).

# Overview

## Thesis

Each era multiplies intelligible signal ~1,000×, and **the receiver you started with stays the engine**.

```
clarity  = carrier / (carrier + noise)
revenue  ≈ airedCopies × rate × BAND(antenna, era) × netMul × RELAY.margin
noise    grows every tick unless Hold, Heat, and staff push back
```

## Product identity

Signal Decay is a deterministic, command-driven radio idle: start at a basement dial, grow through towers → night skip → birds → a Quiet door → optional Dial (subcarrier, packets, seasons, grammar, charter, last carrier). Prestige is **Retune** (from Era 3).

## Layout

```
src/games/signal-decay/
  content/   # goals, callers, upgrades, dial grammar, news
  sim/       # pure deterministic engine
  ui/        # React paint layer
  definition.ts
```

Hubs: **Air · Plant · Crew · Books · Network**. Dial rows grow inside Network (and late Plant/Crew). Archive is More, not a sixth hub.

## Player loop

1. Tune → Hold → Log → Air on the flagship.
2. Spend cash (and later Calls / Ear / Dial currencies) on the era’s verbs.
3. Follow Next Goal.
4. Hit the era door (hard `can()` / `setEra`).

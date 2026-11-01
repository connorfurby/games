# Grocery Empire — honest plan audit

**Plan (never edit):** chat master plan.  
**Rule:** systems scaffold ≠ product-finished. Do not claim 100%.

Updated: 2026-10-28.

## Gates

| Gate | Status |
| --- | --- |
| Vitest (~61) | ✅ |
| tsc + vite build | ✅ |
| Playwright e2e | ⚠️ env (Chrome SIGABRT / arch) — not treated as sim regressions |
| Live UI ticks | ✅ fixed 2026-10-28 — snapshot identity for useSyncExternalStore |

---

## Verdict

**~80% of plan systems exist in code.** Enough to play Era 0 deeply and poke later eras. Not Paperclips-level craft or multi-day balance.

### DONE
- Library shell: routes, shelf, shop, achievements, tokens, packs, ornaments, pity, share, daily stamp  
- Kernel: BN, 10Hz, commands, migrate, recovery rails, watchdog, fuzz softlock assert  
- **Critical:** engine `getSnapshot()` returns a new `{v,state}` each bump so React re-renders (in-place GameState was freezing the UI)  
- Eras 0–6 sim + panels + memos + endings  
- Coach + tip whispers + Scanner Array  
- Depth: 7 upgrade trees, builds, ventures subset, empire XP, weather  
- QoL: hold Esc, Esc stack, photo mode, museum, memo compare, coupon wars, celebrity endcap, receipt poetry, Hungry laws modal after Accept  
- Seeded daily challenge: `games.v1.daily-challenge`, Shelf/More “Today’s corner”, MetaSave best baskets  

### PARTIAL
- Texture/SFX depth, guide essay, ventures/expansions catalogs, beautiful shop, coach “every unlock” proof  
- Lore/visual pass (2026-10-28): intro + chapter epigraphs, `content/lore.ts`, story banner, panel lore, memo voice→ledger, HUD labels, shelf/shop/guide blurbs, sale/memo SFX, Open Sign ornament — texture/balance still partial  
- **DevMode** (2026-10-28): `/play/grocery-empire/dev` → isolated `games.v1.grocery-empire-dev` save + slots; stage jumps Era 0–6 / cash / recovery; no meta/achievements/tokens bleed; shelf “DevMode” link  

### MISSING
- Second playable game, combat canvas, human balance pass  

See chat for line-level DONE/PARTIAL/MISSING if needed. Live source of truth for “what shipped” is this file + tests.

# Economy math

Source: `sim/balance.ts`, `sim/formulas.ts`.

```
clarity = carrier / (carrier + noise)
listeners/s = DEMAND.base × formatFit × earlyMul × stars × WoM × rivalCut × choirHum × clarityAudience
formatFit   = 0.85 if no format or a guest ban; else 1.08 × programPull (bold 1.12, safe/unset 1)
clarityAudience = 1 + clarity × slope, slope 0.35, or 0.12 and a band damp when Weird elasticity is on
choirHum    = 1 until the Choir has stores and the hush has expired (cap 30% cut)
flagship pay while airing = listeners/s × air rate × nightPay
nightPay    = 1.18 when Richer night is on and night is featured or staffed
network add = (relayMul − 1) × flagship × RELAY.margin (0.55)
relayMul    includes tower policy: match +0.08 per hot match, push +0.04, quiet ×0.96 (floors/caps in DEPTH)
noise += DECAY.rate × heatMul × eraMul × fasterDecay(1.25) − holdPush − cooling
```

`BAND.antenna` and `BAND.era` match the Grocery storefront/era ladder shape so each era is ~×1.5–×2 on the band alone; network layers carry the rest.

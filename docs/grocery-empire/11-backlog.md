# Backlog and known gaps

Use this as the “what’s left” list for the next agent. Check items off here when done, and move finished work into [10-changelog-chat.md](10-changelog-chat.md).

**Next:** the 1.0 release plan in [13-release-1.0-plan.md](13-release-1.0-plan.md) supersedes ad-hoc polish items below.

## After 40.0 (still open)

- [ ] Human multi-hour playtest pass — bot ≠ feel. Especially charter Boutique/Co-op, Accept rebuild, two regulars, flyer deep/soft.
- [ ] Watch seed flakiness near CI floors (Era 12 landed ~40.10 h — only ~6 min over the floor). Prefer seating/gap pads over softens.
- [ ] Museum relic drip for 40.0 verbs (keep 25/wing; Oddities may stay 26).
- [ ] Full legacy CSS deletion pass (continued cut of unused `ge-*` / `g2-*` in grocery.css / leftover g2.css after shell move).
- [ ] Bundle size warning on build (>500 kB) — pre-existing; code-split only if asked.
- [ ] Confirm `VALUE.storefront` indices still match `builds.storefront` tiers after era 5–6 facing slots.
- [ ] Shift Board: float slot from Shift Lead; Mid/Close gates beyond Open days where design intended.
- [ ] Flagship planogram UI polish vs Worlds puzzle chrome parity.
- [ ] Regulars: three-at-once only if two-at-once feels thin in playtest.

- [ ] Seven e2e specs fail on `main` independent of 40.1: `live.spec` (till reload), `shell-2.spec` (next goal boot, phone sub-tabs, museum chest) and `visual.spec` (floor baselines, map pins). Update selectors / baselines to the 40.0 shell.
- [ ] Wiki: link panel `HelpCard`s to their wiki article (`requestWiki(id)` on the ui bus → Menu drawer Wiki tab).
- [ ] Wiki: more hand-written rich articles (walkthroughs for eras 2–12 still come from the plain-text parser).
- [ ] Awards cards: tier colour and art pass to match Shop cards.

## Done in 40.0 (do not re-open without cause)

- [x] Bots/horizon module split, tipSharpness, migrateSlice, LATE_MEMOS cleanup (Phase 0).
- [x] Verb tray on every department; phone Hubs badges; FailReason; empty states (Phase 1).
- [x] Palette, human undo, wholesale qty, SaveSlots, alert notifications, cross-links, sweep clause (Phase 2).
- [x] Two regulars, float vs hire, facing want (SAVE 31).
- [x] Flyer vs Penny/FreshWay, blast/tunnel suppress, all dept policies (SAVE 32).
- [x] Manifest stance, two pockets chip, era 5–6 facings, Accept≈Rebrand (SAVE 33).
- [x] Climate guest ban, stop personality, season bed lock (SAVE 34) + LONG_HORIZON green.
- [x] Posted habit, charter fork on goal, clause hearing, rehearsal can miss (SAVE 35) · Era 12 ~40.10 h.
- [x] Endless ban, Rebrand carry, museum sockets, PrestigeKeepSheet (SAVE 36).
- [x] Guests, verb pads, projects, ration-week skim, News 40.0 (Phase 9).
- [x] `@layer shell` chrome, scene punch, motion beats, cosmetics wired (Phase 10).
- [x] Shelf glance, news bands, Awards on bar, Tools demoted duplicates (Phase 11).
- [x] Pace debug already `describe.runIf(PACE_DEBUG)`.
- [x] Guide Decisions topic + spoiler lock.

## Explicitly out of scope (unless user asks)

- New top-level hub
- Prestige rewrite / Relocate
- Replacing sim `number` with `break_eternity`
- Multiplying all costs by a constant “to add length”
- Lowering pacing CI floors to pass red tests
- Editing Cursor `.cursor/plans/*` as living docs (update **this pack** instead)
- Era 13 / twelfth aisle / resizing museum wings

## If the user says “keep expanding”

**Live generation:** Grocery Empire **40.0** (Phases 0–12). The old [12-expansion-megaplan.md](12-expansion-megaplan.md) is **done** (SAVE 26 era gates) and is not the next work.

Preferred order for a follow-up:

1. Human playtest the new decisions; note which still feel like waits.
2. Remeasure after any DEPTH/HORIZON tweak (`LONG=1` / `LONG_HORIZON=1`).
3. Add one decision that replaces a wait — never a bare cooldown pad — with goal + bot + pack update.
4. Only then raise CI windows, with rationale in 07 + 2.0-plan decision log. Never lower floors.

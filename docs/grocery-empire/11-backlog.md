# Backlog and known gaps

Use this as the “what’s left” list for the next agent. Check items off here when done, and move finished work into [10-changelog-chat.md](10-changelog-chat.md).

## Pacing / balance hygiene

- [ ] Re-measure Era 2 after `openDaysNeedSideYard: 4` on seeds 1 **and** 42; refresh [07-pacing.md](07-pacing.md) if ~2.65 h moved.
- [ ] Spot-check `LONG=1` and `LONG_HORIZON=1` still green after any DEPTH/HORIZON tweak (they are slow — run before merging big balance PRs).
- [ ] Human multi-hour playtest pass (called out historically in progress notes) — bot ≠ feel.
- [ ] Watch seed flakiness near CI floors (8 s misses are real); prefer small loop pads over `>=` softens.

## Systems depth (shipped but can go richer)

- [ ] Regulars: expand cast toward ~40 by Era 3; world-climate regulars (Era 7) if thin.
- [ ] Shift Board: float slot from Shift Lead; Mid/Close gates beyond Open days where design intended.
- [ ] Flagship planogram UI polish vs Worlds puzzle chrome parity.
- [ ] Invoice Book: stronger early-pay vs float decisions if players ignore Suppliers.
- [ ] Flyer Desk: discount bands / promises more than aisle picks if it still feels like one button.
- [ ] Block events: ensure Land UI + bot reactions stay legible.
- [ ] Hearing Docket: session UX + Minutes Clerk amend clarity.
- [ ] Pocket Ops: concurrent trip upgrades as verb nodes (upgradeEffect), not silent buffs.

## Content / UX

- [ ] Ensure every new gate has a Next-goal with a bot `action` (audit `goals.ts` after edits).
- [ ] Delete or quarantine debug tests (`_pace_debug`, `pace-measure`) if they pollute `npm test`.
- [ ] Museum relic drip for new systems (keep 25/wing).
- [x] Guide spoilers for stretch systems — keep short. (coach stretch tours + density pass; guide stays a recap)
- [x] 390 px pass on stretch sheets (facing, shifts, flyers, cooler, dispatch, pockets, hearing). Re-check any sheet added later.
- [x] Phase 0 shell UI: hub headers, invoice Sheet, HelpCard trim, dead bands, Empire rank/doctrine. Remeasure still open above.
- [x] Density lock-in: Floor HubStage + tomato free verbs; HelpCards gone; night case tokens (2026-11-14).
- [x] Marketing / Suppliers / Build / Cold card stacks cut (2026-11-14 density lock-in).
- [x] Staff hire board → sheet (2026-11-14 customer-ready).
- [x] Staff / Cold / Dock night punch (2026-11-14). Fleet harbor still open if graphics stay thin.
- [x] Player news desk + GAME_VERSION (always update `content/news.ts` on visible ships).
- [x] Feel overhaul Waves 0–7 day pass: cascade, PlayFrame trays, phone Money, decisions + plant power, motion, docs (SAVE 29).
- [ ] Full legacy CSS deletion pass (continued cut of unused `ge-*` / `g2-*` rules).
- [ ] Remeasure default pacing after SAVE 28 decisions (seeds 1 and 42).

## Tech debt

- [ ] `commands.ts` / `DepthState` size — split carefully if navigate cost hurts; keep one upgrade-effect path.
- [ ] Migrate.ts growth — when adding fields, prefer helpers; never skip copy.
- [ ] Bundle size warning on build (>500 kB) — pre-existing; code-split only if asked.
- [ ] Confirm `VALUE.storefront` indices still match `builds.storefront` tiers after any build-track edit.

## Explicitly out of scope (unless user asks)

- New top-level hub
- Prestige rewrite / Relocate
- Replacing sim `number` with `break_eternity`
- Multiplying all costs by a constant “to add length”
- Lowering pacing CI floors to pass red tests
- Editing Cursor `.cursor/plans/*` as living docs (update **this pack** instead)

## If the user says “keep expanding”

**Authoritative megaplan:** [12-expansion-megaplan.md](12-expansion-megaplan.md) (lengthen toward 40–50h, one new hard gate per era, UI in every phase).

Preferred order inside each phase:

1. Validate pacing still inside windows after your last change.
2. Deepen the **thinnest loop** that the bot still checkbox-skimms (measure with a debug print of gate progress).
3. Add one new verb + hard gate + bot action + goal + pack update.
4. Remeasure; only then raise CI numbers (with rationale in 07 + 2.0-plan decision log). Never lower floors.

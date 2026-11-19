import { goalCash, goalNeeds, nextGoal as nextGoalHud, nextGoalInOrder } from '../content/goals'
import { STORE_TRAIT_BY_ID, policyMatchesTrait, type PlaceTraitId } from '../content/depth'
import { RIVALS } from '../content/rivals'
import { MEMOS } from '../content/memos'
import { PERK_BY_ID } from '../content/perks'
import { PROJECTS } from '../content/projects'
import type { RoleId } from '../content/staff'
import { UPGRADE_BY_ID } from '../content/upgrades'
import { BUILD_FILTERS, pendingVariantChoice, safePendingVariantId } from '../content/builds'
import { can, run, type Command } from './commands'
import { CAPITAL, HORIZON } from './balance'
import { attentionCap } from './formulas'
import { repair } from './invariants'
import { createInitialState, type GameState } from './state'
import { applyTick } from './tick'
import {
  LATE_VERBS,
  attentiveCommands,
  canWithin,
  recoveryCommands,
  type EraTimes,
  type PacingResult,
} from './botsShared'
import { pushEarlyCampaign } from './botsEarly'
import { pushChainCampaign } from './botsChain'
import { pushFleetCampaign } from './botsFleet'
import { pushWorldsCampaign } from './botsWorlds'

/**
 * Headless bots for balance gates + softlock fuzz (Part H4 / Q3), split by era band:
 * botsShared (Era 0–1 bots, fuzz, loops), botsEarly / botsChain / botsFleet / botsWorlds (campaign pushes).
 * This file composes the campaign bot and keeps the public import surface (`./bots`).
 */

export {
  attentiveBot,
  attentiveCommands,
  badPriceBot,
  badPriceCommands,
  fuzzBot,
  hasProgressOrRecovery,
  legalCommands,
  progressCommands,
  recoveryCommands,
  runAttentiveLoop,
  runBotStub,
} from './botsShared'
export type { BotFn, BotResult, EraTimes, FuzzResult, PacingResult } from './botsShared'

/**
 * Plays like a steady casual player: keeps the floor stocked, saves for the next
 * campaign goal, and spends the surplus on whatever is affordable.
 */
/** Which goal list the bot follows: the HUD's ('hud') or the old in-order spine. */
export const botSpine: { mode: 'hud' | 'inOrder' } = { mode: 'hud' }

export function nextGoal(s: GameState) {
  return botSpine.mode === 'hud' ? nextGoalHud(s) : nextGoalInOrder(s)
}

export function campaignCommands(s: GameState, step: number): Command[] {
  const goal = nextGoal(s)
  const holdAtt = goalNeeds(s, goal).attention > 0
  const cmds: Command[] = [...recoveryCommands(s), ...attentiveCommands(s)].filter(
    (c) => !holdAtt || !(c.type === 'buyMemo' || c.type === 'pulseScanner' || c.type === 'runTournament'),
  )
  // Incorporate early so Era 6 Continue can resolve a board agenda.
  if (!s.incorporated && s.era >= 2 && can(s, { type: 'incorporate' }).ok) {
    cmds.push({ type: 'incorporate' })
  }
  pushEarlyCampaign(s, cmds)
  pushChainCampaign(s, cmds)
  pushFleetCampaign(s, cmds)
  // Bank for land even while an early depth goal has no cash() — otherwise wages eat the lot-survey reserve.
  if (s.compute.unlocked && s.stats.attentionFilled >= 1 && !s.memos['lot-survey'] && !s.expansions['side-yard']) {
    if (can(s, { type: 'buyMemo', id: 'lot-survey' }).ok) cmds.push({ type: 'buyMemo', id: 'lot-survey' })
  }
  if (step % 5 !== 0) return cmds
  cmds.push({ type: 'acceptChapter' })
  const act = goal?.action?.(s) ?? null
  if (act && can(s, act).ok) {
    run(s, act)
  }
  // Match store policies to traits (cold-permit hard gate + matched-stores goal).
  if (s.era >= 2) {
    for (const st of s.stores) {
      const trait = s.depth?.placeTraits?.[st.id]
      if (!trait) continue
      const def = STORE_TRAIT_BY_ID[trait as PlaceTraitId]
      if (!def || policyMatchesTrait(st.policy, trait)) continue
      const c: Command = { type: 'setPolicy', storeId: st.id, policy: def.matchPolicies[0]! }
      if (can(s, c).ok) run(s, c)
    }
  }
  // Grow Attention capacity / Ideas when the goal needs more than we can hold.
  const needs = goalNeeds(s, goal)
  const bankRepForInc =
    !s.incorporated && s.era >= 2 && s.compute.reputation < CAPITAL.incorporateRep
  if (needs.attention > attentionCap(s) && !bankRepForInc) {
    cmds.push({ type: 'spendRep', on: 'archive' })
  }
  if (needs.ideas > s.compute.ideas && s.compute.ideasUnlocked && !s.compute.ideasOn) {
    cmds.push({ type: 'toggleIdeas' })
  }
  // Keep a reserve for the goal; buy small things freely.
  const reserve = goalCash(s, goal)
  if (s.fuel < 20 && s.fleet.lanes > 0) cmds.push({ type: 'buyFuel' })
  const saveCapital = goal?.id === 'leave-region'
  const pocketsLeft = (s.fleet.pockets ?? []).filter((p) => p.left > 0).length
  const haulers = (s.fleet.bargeList ?? []).filter((b) => b.class === 'hauler').length
  for (const v of LATE_VERBS) {
    if (saveCapital && (v.type === 'acquireRegion' || v.type === 'hireLobby')) {
      if (v.type === 'hireLobby' && canWithin(s, v, reserve)) run(s, v)
      continue
    }
    // Pocket Ops stretch: one Hauler at a time until four pockets clear (parallel is the human path).
    if (
      v.type === 'launchBarge' &&
      (v.class === 'hauler' || !v.class) &&
      haulers >= 1 &&
      pocketsLeft > 2
    ) {
      continue
    }
    if (canWithin(s, v, reserve)) run(s, v)
  }
  const holdAttention = needs.attention > 0
  if (!holdAttention) cmds.push({ type: 'runTournament' })
  if (!holdAttention) {
    for (const st of s.stores) {
      if (st.drift > 0.4) cmds.push({ type: 'walkStore', storeId: st.id })
      else cmds.push({ type: 'trainStore', storeId: st.id })
    }
  }
  if (s.board.pendingAgenda !== null || (s.board.nextMeetingAt > 0 && s.time >= s.board.nextMeetingAt)) {
    cmds.push({ type: 'resolveBoard', agenda: 'expand' })
  }
  for (const tr of BUILD_FILTERS) {
    const c: Command = { type: 'buyBuild', track: tr }
    if (canWithin(s, c, reserve)) run(s, c)
    // Slow/safe facing when a tier opens a choice — never hibernate.
    const pending = pendingVariantChoice(s, tr)
    if (pending) {
      const id = safePendingVariantId(s, tr)
      if (id) {
        const v: Command = { type: 'setBuildVariant', track: tr, variantId: id }
        if (can(s, v).ok) run(s, v)
      }
    }
  }
  for (const m of MEMOS) {
    // Resets and replacements are a choice, not progress.
    if (m.again) continue
    // The ending memos close the run; the campaign bot continues into Worlds instead.
    if (m.id === 'accept-exile' || m.id === 'reject-silence') continue
    const c: Command = { type: 'buyMemo', id: m.id }
    if (holdAttention) {
      try {
        if ((m.cost(s).attention ?? 0) > 0) continue
      } catch {
        continue
      }
    }
    if (canWithin(s, c, reserve)) run(s, c)
  }
  for (const d of ['throughput', 'edlp', 'hi-lo', 'loss-leader', 'premium-bodega', 'route-density', 'float-discipline', 'read-bank']) {
    cmds.push({ type: 'buyDoctrine', id: d })
  }
  // Two cheapest affordable upgrade ranks.
  for (let k = 0; k < 2; k++) {
    let best: { id: string; cost: number } | null = null
    for (const id of Object.keys(UPGRADE_BY_ID)) {
      const c: Command = { type: 'buyUpgrade', id }
      if (!canWithin(s, c, reserve)) continue
      const def = UPGRADE_BY_ID[id]!
      const cost = Math.ceil(def.base * Math.pow(def.growth, s.upgrades[id] ?? 0))
      if (!best || cost < best.cost) best = { id, cost }
    }
    if (best) run(s, { type: 'buyUpgrade', id: best.id })
  }
  for (const role of ['clerk', 'cashier', 'stocker'] as RoleId[]) {
    const c: Command = { type: 'hire', role }
    if (canWithin(s, c, reserve + 200)) cmds.push(c)
  }
  for (const p of Object.keys(PERK_BY_ID)) cmds.push({ type: 'buyPerk', id: p })
  for (const pj of PROJECTS) {
    const c: Command = { type: 'startProject', id: pj.id }
    if (canWithin(s, c, reserve)) run(s, c)
  }
  for (const r of RIVALS) {
    // Keep Concord alive until the hearing docket is cleared (2–3 sessions).
    if (
      r.id === 'concord' &&
      ((s.depth?.hearing && s.depth.hearing.answered < s.depth.hearing.needed) ||
        (s.horizon?.seatingsDone ?? 0) < HORIZON.clauseSeatingNeed)
    ) {
      continue
    }
    const buy: Command = { type: 'buyoutRival', id: r.id }
    if (canWithin(s, buy, reserve)) {
      run(s, buy)
      continue
    }
    const st = s.rivals?.[r.id]
    const war: Command = { type: 'priceWar', id: r.id }
    if (st && st.stores >= r.maxStores / 2 && canWithin(s, war, reserve)) run(s, war)
  }
  if (s.fleet.launched) {
    cmds.push({ type: 'buyCharter' })
    // Prefer shell/survey while pockets remain — replication floods Haulers and does not speed the trip clock.
    const axes =
      (s.fleet.pockets ?? []).filter((p) => p.left > 0).length > 2
        ? (['shell', 'survey', 'transit'] as const)
        : (['replication', 'survey', 'transit', 'shell'] as const)
    for (const axis of axes) cmds.push({ type: 'setCharterAxis', axis, delta: 1 })
  }
  pushWorldsCampaign(s, reserve)
  return cmds
}

export function runPacing(seed: number, seconds: number, sampleEvery = 600): PacingResult {
  const s = createInitialState(seed, 0)
  s.introSeen = true
  const eraAt: EraTimes = { 0: 0 }
  const samples: PacingResult['samples'] = []
  for (let t = 1; t <= seconds; t++) {
    for (const cmd of campaignCommands(s, t)) {
      if (can(s, cmd).ok) run(s, cmd)
    }
    applyTick(s, 1)
    repair(s)
    if (eraAt[s.era] === undefined) eraAt[s.era] = t
    if (t % sampleEvery === 0) {
      samples.push({
        t,
        era: s.era,
        empire: s.empire.level,
        cash: s.cash,
        revPerSec: s.rates.revenuePerSec,
        goal: nextGoal(s)?.id ?? 'done',
      })
    }
  }
  return { eraAt, final: s, samples }
}

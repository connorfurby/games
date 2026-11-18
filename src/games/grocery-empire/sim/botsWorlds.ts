import { nextGoalInOrder as nextGoal } from '../content/goals'
import { can, run, type Command } from './commands'
import { HORIZON } from './balance'
import type { GameState } from './state'
import { canWithin } from './botsShared'

/**
 * Era 6+ Worlds horizon: gate memos, practice filings, clauses, season chores, late hubs.
 * Acts immediately via run() (like the original bot), so call order vs. the spend loop matters.
 */
export function pushWorldsCampaign(s: GameState, reserve: number): void {
  if (s.era >= 6) {
    // Gate memos before the verbs they unlock — cheapest path through the desk.
    const gateMemos = [
      'probe-yard',
      'local-chalk',
      'cluster-name',
      'exchange-floor',
      'first-manifest',
      'greenhouse-permit',
      'trait-book',
      'taster-hire',
      'relay-mast',
      'phrase-desk',
      'first-agent-papers',
      'embassy-keys',
      'clause-board',
      'open-hours-draft',
      'local-shelf-draft',
      'one-price-draft',
      'ivos-list',
      'standing-order-last',
      'refuse-twice',
      'new-counter-form',
    ] as const
    for (const id of gateMemos) {
      const c: Command = { type: 'buyMemo', id }
      if (canWithin(s, c, reserve)) run(s, c)
    }
    const horizon: Command[] = [{ type: 'continueHorizon' }, { type: 'launchProbe' }]
    // Practice then credited fileStandard* path for Worlds gates.
    const prac = s.depth?.practice
    const needPlanogram =
      !!prac &&
      (prac.planogram.left > 0 ||
        prac.planogram.credited < HORIZON.slowWorlds ||
        s.era < 8)
    if (needPlanogram) {
      const planets = s.horizon?.planets ?? []
      // Prefer unstocked / uncredited — gap allows one filing per tick window.
      const ordered = [...planets].sort((a, b) => {
        const ac = a.stocked ? (a.gateCredited ? 2 : 1) : 0
        const bc = b.stocked ? (b.gateCredited ? 2 : 1) : 0
        return ac - bc
      })
      const target = ordered.find((p) => p.revealed)
      if (target) horizon.push({ type: 'fileStandardPlanogram', planetId: target.id })
    }
    const needConvoy =
      !!prac &&
      (prac.convoy.left > 0 || prac.convoy.credited < HORIZON.slowCircuits || s.era < 9)
    if (needConvoy) {
      horizon.push({ type: 'fileStandardConvoy' })
    }
    const needCross =
      !!prac && (prac.cross.left > 0 || prac.cross.credited < 2 || s.era < 10)
    if (needCross) horizon.push({ type: 'fileStandardCross' })
    {
      // Slow path: match the phrase habit before filing, then claim the post if nobody held it.
      const hz = s.horizon
      const post = hz && hz.watchUntil > 0 ? hz.postedHabit : null
      const needHabit = (post?.habit ?? hz?.phrase?.habit ?? 'price') as 'price' | 'stock' | 'route' | 'taste'
      if ((hz?.agents.length ?? 0) < 1) horizon.push({ type: 'hireAgent', habit: needHabit })
      const holder = post?.agentId != null ? hz?.agents.find((a) => a.id === post.agentId) : null
      const agent = holder ?? hz?.agents[0]
      if (agent && agent.habit !== needHabit) {
        horizon.push({ type: 'setAgentHabit', id: agent.id, habit: needHabit })
      }
    }
    const needPhrase =
      !!prac &&
      (prac.phrase.left > 0 || prac.phrase.credited < HORIZON.slowPhrases || s.era < 11)
    if (needPhrase) {
      if (s.horizon?.phrase?.nightOnly && !s.staff.some((m) => m.role === 'nightOperator')) {
        horizon.push({ type: 'hire', role: 'nightOperator' })
        if (s.depth?.open !== false) horizon.push({ type: 'setOpen', open: false })
      }
      if (s.depth?.jammedSymbol) horizon.push({ type: 'clearHorizonRival', kind: 'static' })
      horizon.push({ type: 'fileStandardPhrase' })
    }
    if ((s.horizon?.greenhouses ?? 0) < 1) horizon.push({ type: 'buyGreenhouse' })
    if ((s.horizon?.relays ?? 0) < 1) horizon.push({ type: 'buyRelay' })
    if ((s.horizon?.embassies ?? 0) < 1) horizon.push({ type: 'openEmbassy' })
    // Seat pending clause before the next keep (serial seating).
    horizon.push({ type: 'seatClause' })
    for (const id of ['open-hours', 'local-shelf', 'one-price', 'cold-law'] as const) {
      if (!s.horizon?.clauses?.includes(id)) horizon.push({ type: 'toggleClause', id })
    }
    const hearing = s.depth?.hearing
    if (
      s.horizon?.hearingClause ||
      hearing?.pendingClause ||
      (hearing && hearing.answered < hearing.needed)
    ) {
      horizon.push({ type: 'answerHearing' })
    }
    for (const kind of ['drift', 'keelmark', 'verdant', 'static', 'ration'] as const) {
      horizon.push({ type: 'clearHorizonRival', kind })
    }
    // Rehearse only at the Accept mean; a short list would just scratch a line.
    const listReady = (s.horizon?.listScore ?? 0) + 1e-9 >= HORIZON.listAcceptScore
    horizon.push({ type: 'setCharter', charter: 'standard' }, { type: 'fileStandardList' })
    if (listReady) horizon.push({ type: 'rehearseAccept' })
    horizon.push({ type: 'acceptLastAisle' })
    // Late hubs (Era 7+): franchise, unpack, jump, restock, co-op, broadcast, wire, vault, cryo, instruments, annex.
    if (s.era >= 7) {
      // Survey desk on the Shift Board once before Era 8 credit.
      const surveyor =
        s.staff.find((m) => m.role === 'surveyor') ?? s.staff.find((m) => m.role === 'planogramClerk')
      if (surveyor && !s.depth?.surveyShiftOnce) {
        horizon.push({ type: 'assignShift', slot: 'open', staffId: surveyor.id })
      }
      horizon.push({ type: 'openPlanetFranchise' })
      // Bank survey for Probe Yard (15) before co-op / broadcast drains the trickle.
      if ((s.memos['probe-yard'] ?? 0) > 0 && (s.horizon?.survey ?? 0) >= 20) {
        horizon.push({ type: 'coopOrder', cat: s.orderCat })
      }
      // Lock the bed with the chore Next Goal names (falls back to the season's expected chore).
      const goalAct = s.era >= 9 ? nextGoal(s)?.action?.(s) : undefined
      const seasonChore =
        goalAct?.type === 'doSeasonChore'
          ? goalAct.chore
          : (['water', 'cover', 'harvest', 'rest'] as const)[(s.horizon?.season ?? 0) % 4]!
      horizon.push({ type: 'doSeasonChore', chore: seasonChore })
      // The guest's facing ban and the stop's personality tax are accepted as they come.
      horizon.push({ type: 'serveClimateNeighbor' })
      horizon.push({ type: 'settleStop' })
      horizon.push({ type: 'haulYield' })
      horizon.push({ type: 'seatClause' })
      if (listReady) horizon.push({ type: 'rehearseAccept' })
      const seasonHand = s.staff.find((m) => m.role === 'seasonHand')
      if (seasonHand) {
        horizon.push({ type: 'assignShift', slot: 'mid', staffId: seasonHand.id })
      }
      if ((s.memos['probe-yard'] ?? 0) > 0) {
        for (const climate of ['quiet', 'heat', 'orchard', 'tide', 'night', 'ash', 'ice', 'market'] as const) {
          horizon.push({ type: 'broadcast', climate })
        }
      }
      if (s.era >= 8) {
        horizon.push({ type: 'unpackBonded', count: 1, kind: 'dry' })
        if (s.fuel >= 20) horizon.push({ type: 'jumpLane' })
      }
      if (s.era >= 9) {
        if ((s.builds.storage ?? 0) < 7) horizon.push({ type: 'buyBuild', track: 'storage' })
        horizon.push({ type: 'vaultSeed', amount: 1 })
        horizon.push({ type: 'cryoTreaty' })
      }
      if (s.era >= 10) {
        horizon.push({ type: 'wireAd' })
        horizon.push({ type: 'buyInstrument', id: 'planet-bonds' })
      }
      for (const role of [
        'surveyor',
        'planogramClerk',
        'broker',
        'stevedore',
        'grower',
        'seasonHand',
        'translator',
        'nightOperator',
        'diplomat',
        'minutesClerk',
        'whip',
      ] as const) {
        horizon.push({ type: 'hire', role })
      }
      if (s.horizon?.buildQueue == null) {
        for (const id of ['storefront', 'storage', 'cold', 'production', 'transit', 'civic'] as const) {
          horizon.push({ type: 'queueBuild', id })
        }
      }
      const stocked = s.horizon?.planets.filter((p) => p.stocked).length ?? 0
      const bay = s.offworld?.bay.length ?? 0
      if (stocked > bay && bay < 12 && (s.horizon?.survey ?? 0) >= 8) {
        horizon.push({ type: 'restockOffworld' })
      }
    }
    for (const c of horizon) {
      if (can(s, c).ok) run(s, c)
    }
  }
}

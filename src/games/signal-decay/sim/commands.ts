import { CALLERS, DAYPARTS } from '../content/callers'
import { DOCTRINE_BY_ID, doctrineCost } from '../content/doctrines'
import { syncGoals } from '../content/goals'
import { PROGRAM_BY_ID, programHeatMul } from '../content/programs'
import { UPGRADE_BY_ID, upgradeCost, upgradeEffect } from '../content/upgrades'
import {
  AIR,
  CAPITAL,
  DECAY,
  DEPTH,
  DIAL,
  LATE,
} from './balance'
import {
  antennaBundleCost,
  antennaCost,
  checkInCooldown,
  coolingPower,
  hireCost,
  towerBundleCost,
  towerCost,
} from './formulas'
import { fail, nextRng, ok, pick, type Check } from './helpers'

export type { Check }
import type {
  CharterFork,
  Daypart,
  GameState,
  Habit,
  PromoBand,
  QuietLaw,
  ShiftSlot,
  StopTax,
  TowerPolicy,
} from './state'

export type Command =
  | { type: 'tune' }
  | { type: 'hold' }
  | { type: 'setHolding'; on: boolean }
  | { type: 'log' }
  | { type: 'air' }
  | { type: 'setFormat'; format: Daypart }
  | { type: 'setProgram'; id: string }
  | { type: 'serveCaller' }
  | { type: 'focusCaller'; which: 'active' | 'waiting' }
  | { type: 'checkIn' }
  | { type: 'hire'; role: string }
  | { type: 'assignShift'; slot: ShiftSlot; crewId: string }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'buyAntenna'; qty?: number }
  | { type: 'buyTower'; qty?: number }
  | { type: 'setTowerPolicy'; id: string; policy: TowerPolicy | null }
  | { type: 'buyDepot' }
  | { type: 'buyRegion' }
  | { type: 'buySkip' }
  | { type: 'buyBird' }
  | { type: 'buySubcarrier' }
  | { type: 'payInvoice'; id: string }
  | { type: 'fileFormatClock' }
  | { type: 'printPromo'; band: PromoBand }
  | { type: 'signHeatLog' }
  | { type: 'walkHotTrait' }
  | { type: 'fileManifest'; kind: 'clean' | 'exam' | 'fast' }
  | { type: 'finishHaul' }
  | { type: 'stampQuiet' }
  | { type: 'quietStay'; laws?: QuietLaw[] }
  | { type: 'quietRetune'; laws?: QuietLaw[]; carry?: GameState['prestigeCarry'] }
  | { type: 'quietSignOff' }
  | { type: 'serveGuestEar' }
  | { type: 'settleStop'; tax: StopTax }
  | { type: 'doSeasonChore' }
  | { type: 'fileDial'; layer: string; clever: boolean }
  | { type: 'postHabit'; habit: Habit }
  | { type: 'setOperatorHabit'; id: string; habit: Habit }
  | { type: 'seatClause'; id: string }
  | { type: 'answerHearing' }
  | { type: 'signCharter'; fork: CharterFork }
  | { type: 'fillLine'; line: string }
  | { type: 'rehearseAccept' }
  | { type: 'acceptLast' }
  | { type: 'rejectLast' }
  | { type: 'runTournament' }
  | { type: 'buyDoctrine'; id: string }
  | { type: 'retune'; carry?: GameState['prestigeCarry'] }
  | { type: 'setEra'; era: number }
  | { type: 'dismissAway' }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'setSpeed'; speed: number }
  | { type: 'markIntro' }
  | { type: 'acceptChapter' }
  | { type: 'startWar'; rivalId: string }
  | { type: 'buyoutRival'; rivalId: string }
  | { type: 'hushChoir' }
  | { type: 'undo' }
  | { type: 'buyBestUpgrade' }

function spend(s: GameState, n: number): Check {
  if (s.cash < n) return fail(`Need $${n.toFixed(0)}.`)
  s.cash -= n
  return ok()
}

function lateFloor(s: GameState, base: number): number {
  return Math.max(base, (s.rates.revenuePerSec || 0.5) * LATE.buildingFloorSec)
}

function buyQty(qty: number | undefined): number {
  const n = Math.floor(qty ?? 1)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(DEPTH.buyQtyMax, n)
}

export function can(s: GameState, cmd: Command): Check {
  switch (cmd.type) {
    case 'tune':
      if (s.time < s.air.tuneReadyAt) return fail('Sweep cooling.')
      return ok()
    case 'hold':
      if (!s.air.tuned) return fail('Tune first.')
      return ok()
    case 'setHolding':
      if (cmd.on && !s.air.tuned) return fail('Tune first.')
      return ok()
    case 'log':
      if (s.air.logFill < 1) return fail('Buffer empty.')
      return ok()
    case 'air':
      if (s.air.cleanLogs < 1) return fail('No clean log.')
      if (s.time < s.air.airReadyAt) return fail('Transmitter cooling.')
      return ok()
    case 'setFormat':
      return ok()
    case 'setProgram':
      if (s.era < 1) return fail('Neighborhood first.')
      if (!PROGRAM_BY_ID[cmd.id]) return fail('Unknown show.')
      return ok()
    case 'serveCaller': {
      const c = s.depth.activeCaller
      if (!c) return fail('No caller.')
      if (s.depth.featuredFormat !== c.want) return fail(`Feature ${c.want}.`)
      return ok()
    }
    case 'focusCaller':
      if (!s.depth.waitingCaller) return fail('No waiting caller.')
      return ok()
    case 'checkIn':
      if (s.era < 1) return fail('Neighborhood first.')
      if (s.time < s.depth.checkInReadyAt) return fail('Check-in cooling.')
      if (!s.depth.activeCaller?.layaway && s.depth.callersServed < 1)
        return fail('Serve a caller first.')
      return ok()
    case 'hire':
      return s.cash >= hireCost(s) ? ok() : fail('Need cash.')
    case 'assignShift':
      return s.crew.some((c) => c.id === cmd.crewId) ? ok() : fail('Missing crew.')
    case 'buyUpgrade': {
      const def = UPGRADE_BY_ID[cmd.id]
      if (!def) return fail('Unknown upgrade.')
      if (s.era < def.era) return fail('Locked.')
      return s.cash >= upgradeCost(s, cmd.id) ? ok() : fail('Need cash.')
    }
    case 'buyAntenna': {
      const qty = buyQty(cmd.qty)
      if (cmd.qty != null && (cmd.qty < 1 || cmd.qty > DEPTH.buyQtyMax)) return fail('Quantity is 1–10.')
      return s.cash >= antennaBundleCost(s, qty) ? ok() : fail('Need cash.')
    }
    case 'buyTower': {
      if (s.era < 2) return fail('Net first.')
      const qty = buyQty(cmd.qty)
      if (cmd.qty != null && (cmd.qty < 1 || cmd.qty > DEPTH.buyQtyMax)) return fail('Quantity is 1–10.')
      return s.cash >= towerBundleCost(s, qty) ? ok() : fail('Need cash.')
    }
    case 'setTowerPolicy': {
      const tower = s.towers.find((t) => t.id === cmd.id)
      if (!tower) return fail('No tower.')
      if (cmd.policy && cmd.policy !== 'match' && cmd.policy !== 'push' && cmd.policy !== 'quiet')
        return fail('Unknown policy.')
      return ok()
    }
    case 'buyDepot':
      if (s.towers.length < 4) return fail('Need 4 towers.')
      if (s.ear < DEPTH.depotEarNeed) return fail(`Need ${DEPTH.depotEarNeed} Ear.`)
      return s.cash >= lateFloor(s, 400) ? ok() : fail('Need cash.')
    case 'buyRegion':
      if (s.era < 4) return fail('Band Plan first.')
      return s.cash >= lateFloor(s, 600) ? ok() : fail('Need cash.')
    case 'buySkip':
      if (s.era < 3) return fail('Night Skip first.')
      return s.cash >= lateFloor(s, 280) ? ok() : fail('Need cash.')
    case 'buyBird':
      if (s.era < 5) return fail('Birds first.')
      return s.cash >= lateFloor(s, 900) ? ok() : fail('Need cash.')
    case 'buySubcarrier':
      if (s.era < 7) return fail('Subcarrier first.')
      return s.cash >= lateFloor(s, 1200) ? ok() : fail('Need cash.')
    case 'payInvoice': {
      const inv = s.depth.invoices.find((i) => i.id === cmd.id && !i.paid)
      if (!inv) return fail('No invoice.')
      return s.cash >= inv.amount ? ok() : fail('Need cash.')
    }
    case 'fileFormatClock':
      if (s.era < 2) return fail('Net first.')
      if (s.depth.formatCredited) return fail('Already credited.')
      return ok()
    case 'printPromo':
      if (s.era < 2) return fail('Net first.')
      if (s.time < s.depth.promoUntil) return fail('Promo cooling.')
      return s.cash >= CAPITAL.promoCost ? ok() : fail('Need cash.')
    case 'signHeatLog':
      if (s.era < 3) return fail('Night Skip first.')
      if (s.time < s.depth.heatLogReadyAt) return fail('Log cooling.')
      return ok()
    case 'walkHotTrait':
      if (s.era < 3) return fail('Night Skip first.')
      if (!s.depth.hotTrait) return fail('No hot trait.')
      if (s.time < s.depth.hotTraitReadyAt) return fail('Walk cooling.')
      return ok()
    case 'fileManifest':
      if (s.era < 4) return fail('Band Plan first.')
      if (s.time < s.depth.manifestReadyAt) return fail('Manifest cooling.')
      return ok()
    case 'finishHaul':
      if (s.era < 5) return fail('Birds first.')
      if (s.time < s.depth.haulReadyAt) return fail('Haul en route.')
      return ok()
    case 'stampQuiet':
      if (s.era < 6) return fail('Quiet first.')
      if (s.time < s.depth.quietReadyAt) return fail('Ledger cooling.')
      return ok()
    case 'quietStay':
      if (s.era !== 6) return fail('Quiet door only.')
      if (s.depth.quietStamps < DEPTH.quietStampNeed) return fail('Stamp the ledger.')
      return ok()
    case 'quietRetune':
      if (s.era !== 6) return fail('Quiet door only.')
      if (s.depth.quietStamps < DEPTH.quietStampNeed) return fail('Stamp the ledger.')
      return ok()
    case 'quietSignOff':
      if (s.era !== 6) return fail('Quiet door only.')
      return ok()
    case 'serveGuestEar':
      if (s.era < 7) return fail('Subcarrier first.')
      if (s.time < s.depth.guestReadyAt) return fail('Guest cooling.')
      return ok()
    case 'settleStop':
      if (s.era < 8) return fail('Packet Net first.')
      if (s.time < s.depth.settleReadyAt) return fail('Hop cooling.')
      return ok()
    case 'doSeasonChore':
      if (s.era < 9) return fail('Night Garden first.')
      if (s.depth.bedLocked) return fail('Bed locked.')
      if (s.time < s.depth.choreReadyAt) return fail('Chore cooling.')
      return ok()
    case 'fileDial': {
      if (s.era < 7) return fail('Dial first.')
      if (s.time < s.dial.deskReadyAt) return fail('Desk cooling.')
      const layer = cmd.layer
      const needEra: Record<string, number> = {
        reel: 7,
        route: 8,
        season: 9,
        phrase: 10,
      }
      if ((needEra[layer] ?? 99) > s.era) return fail('Layer locked.')
      if (layer === 'season' && s.depth.bedLocked && cmd.clever) return fail('Bed locked.')
      return ok()
    }
    case 'postHabit':
      if (s.era < 10) return fail('Grammar first.')
      if (s.time < s.depth.habitReadyAt) return fail('Watch cooling.')
      return ok()
    case 'setOperatorHabit':
      return s.operators.some((o) => o.id === cmd.id) ? ok() : fail('Missing operator.')
    case 'seatClause':
      if (s.era < 11) return fail('Charter first.')
      if (s.depth.seatedClauses.includes(cmd.id)) return fail('Already seated.')
      if (s.time < s.depth.clauseReadyAt) return fail('Seat cooling.')
      return ok()
    case 'answerHearing':
      if (s.era < 11) return fail('Charter first.')
      if (s.depth.hearingSession >= DIAL.hearingSessions) return fail('Docket done.')
      if (s.depth.seatedClauses.length === 0) return fail('Seat a clause.')
      return ok()
    case 'signCharter':
      if (s.era < 11) return fail('Charter first.')
      if (s.depth.clauseSeats < DEPTH.clauseSeatNeed) return fail('Seat clauses.')
      return ok()
    case 'fillLine':
      if (s.era < 12) return fail('Last Carrier first.')
      return ok()
    case 'rehearseAccept':
      if (s.era < 12) return fail('Last Carrier first.')
      if (s.time < s.dial.rehearsalUntil) return fail('Retry wait.')
      if (s.dial.listLines.filter(Boolean).length < 3) return fail('Fill more lines.')
      return ok()
    case 'acceptLast':
      if (s.era < 12) return fail('Last Carrier first.')
      if (s.dial.listMean < DIAL.acceptMean) return fail('Mean too low.')
      if (!s.depth.rehearseDone) return fail('Rehearse first.')
      return ok()
    case 'rejectLast':
      if (s.era < 12) return fail('Last Carrier first.')
      return ok()
    case 'runTournament':
      if (s.time < s.tournamentReadyAt) return fail('Tournament cooling.')
      if (s.calls < DEPTH.tournamentCallCost) return fail('Need Calls.')
      return ok()
    case 'buyDoctrine':
      if (s.era < CAPITAL.retuneMinEra) return fail('Doctrines open in Night Skip.')
      if (!DOCTRINE_BY_ID[cmd.id]) return fail('Unknown doctrine.')
      if (s.doctrines.includes(cmd.id)) return fail('Already owned.')
      return s.cash >= doctrineCost(s) ? ok() : fail('Need cash.')
    case 'retune':
      if (s.era < CAPITAL.retuneMinEra) return fail('Retune from Night Skip.')
      return ok()
    case 'setEra': {
      if (cmd.era !== s.era + 1) return fail('Eras move one step.')
      return canOpenEra(s, cmd.era)
    }
    case 'dismissAway':
    case 'setPaused':
    case 'setSpeed':
    case 'markIntro':
    case 'acceptChapter':
    case 'undo':
      return ok()
    case 'startWar': {
      const r = s.rivals[cmd.rivalId]
      if (!r) return fail('No rival.')
      return ok()
    }
    case 'buyoutRival': {
      const r = s.rivals[cmd.rivalId]
      if (!r) return fail('No rival.')
      const cost = 40 + r.stores * 12
      if (s.cash < cost) return fail(`Need $${cost.toFixed(0)}.`)
      return ok()
    }
    case 'hushChoir':
      if (s.era < 7) return fail('The Choir wakes in Subcarrier.')
      if (!s.rivals.choir) return fail('The Choir is quiet.')
      if (s.time < s.depth.choirHushUntil) return fail('Already answered.')
      return ok()
    case 'buyBestUpgrade': {
      const open = Object.keys(UPGRADE_BY_ID).filter((id) => {
        const def = UPGRADE_BY_ID[id]
        return def && def.era <= s.era && s.cash >= upgradeCost(s, id)
      })
      if (open.length === 0) return fail('Nothing affordable.')
      return ok()
    }
    default:
      return fail('Unknown.')
  }
}

function canOpenEra(s: GameState, era: number): Check {
  switch (era) {
    case 1:
      if (s.depth.cleanLogsLifetime < DEPTH.era0CleanLogs) return fail('More clean logs.')
      if (s.depth.deadAirDips < DEPTH.era0DeadAirDips) return fail('Recover dead-air dips.')
      if (s.antenna < 1) return fail('Raise an antenna.')
      return ok()
    case 2:
      if (s.depth.callersServed < DEPTH.era1CallersNeed) return fail('Serve callers.')
      if (s.depth.checkIns < DEPTH.era1CheckInsNeed) return fail('Check-ins.')
      if (s.depth.stars < DEPTH.starMinEra1) return fail('Stars.')
      if (!s.depth.featuredFormat) return fail('Feature a format.')
      if (!s.depth.shifts.dawn) return fail('Staff dawn.')
      if (s.depth.dawnDays < DEPTH.dawnDaysNeedEra2) return fail('Dawn days.')
      return ok()
    case 3:
      if (s.towers.length < 2) return fail('Two towers.')
      if (!s.depth.formatCredited) return fail('Credit format clock.')
      if (s.depth.promoWeeks < 8) return fail('Promo weeks.')
      if (s.depth.invoicesOnTime < 24) return fail('On-time invoices.')
      if (s.depth.dawnDays < 32) return fail('Dawn days.')
      return ok()
    case 4:
      if (s.depth.heatLogs < DEPTH.heatLogNeedEra3) return fail('Heat logs.')
      if (s.depth.hotTraitWalks < DEPTH.hotTraitWalkNeed) return fail('Hot trait walks.')
      if (s.depth.promoWeeks < DEPTH.promoWeeksNeedSkip) return fail('Promo weeks.')
      if (s.skips < 1) return fail('Buy a skip.')
      if (s.depth.stars < DEPTH.starMinSkip) return fail('Stars.')
      if (s.depth.dawnDays < 54) return fail('Dawn days.')
      return ok()
    case 5:
      if (s.depth.examHolds < DEPTH.examHoldNeed) return fail('Exam holds.')
      if (s.depth.cleanManifests < DEPTH.cleanManifestNeed) return fail('Clean manifests.')
      if (s.depth.heatLogs < DEPTH.heatLogNeedLeave) return fail('Heat logs.')
      if (s.regions < 1) return fail('Open a region.')
      return ok()
    case 6:
      if (s.depth.fieldHaulsDone < DEPTH.fieldHaulNeed) return fail('Field hauls.')
      if (s.birds < 1) return fail('Berth a bird.')
      return ok()
    case 7:
      if (s.depth.quietStamps < DEPTH.quietStampNeed) return fail('Quiet stamps.')
      return ok()
    case 8:
      if ((s.dial.credited.reel ?? 0) < DIAL.slowReels) return fail('Credit reels.')
      if (s.depth.guestEars < DEPTH.guestEarNeed) return fail('Guest ears.')
      return ok()
    case 9:
      if ((s.dial.credited.route ?? 0) < DIAL.slowRoutes) return fail('Credit routes.')
      if (s.depth.settles < DEPTH.settleNeed) return fail('Settles.')
      return ok()
    case 10:
      if ((s.dial.credited.season ?? 0) < DIAL.slowSeasons) return fail('Credit seasons.')
      if (s.depth.yieldHauls < DEPTH.yieldHaulNeed) return fail('Season chores.')
      return ok()
    case 11:
      if ((s.dial.credited.phrase ?? 0) < DIAL.slowPhrases) return fail('Credit phrases.')
      if (s.depth.habitWatches < DEPTH.habitWatchNeed) return fail('Habit watches.')
      return ok()
    case 12:
      if (s.depth.clauseSeats < DEPTH.clauseSeatNeed) return fail('Seat clauses.')
      if (!s.depth.charterFork) return fail('Sign charter.')
      if (s.depth.hearingSession < DIAL.hearingSessions) return fail('Hearings.')
      return ok()
    default:
      return fail('No era.')
  }
}

export function run(s: GameState, cmd: Command): Check {
  const gate = can(s, cmd)
  if (!gate.ok) return gate

  switch (cmd.type) {
    case 'tune': {
      s.air.tuned = true
      s.air.frequency = 88 + Math.floor(nextRng(s) * 20) + nextRng(s)
      s.air.carrier = 1 + upgradeEffect(s, 'crystal-gain')
      s.air.noise = Math.max(0.05, s.air.noise * 0.85)
      s.air.tuneReadyAt = s.time + AIR.tuneCooldownSec
      break
    }
    case 'hold': {
      s.air.noise = Math.max(0, s.air.noise - DECAY.holdPush * (1 + upgradeEffect(s, 'hold-push')))
      s.air.carrier = Math.min(3, s.air.carrier + AIR.carrierLockBonus * 0.15)
      s.air.lastHoldAt = s.time
      s.air.holding = true
      s.calls += 0.02
      break
    }
    case 'setHolding': {
      s.air.holding = cmd.on
      if (cmd.on) {
        s.air.lastHoldAt = s.time
        s.air.noise = Math.max(
          0,
          s.air.noise - DECAY.holdPush * 0.35 * (1 + upgradeEffect(s, 'hold-push')),
        )
      }
      break
    }
    case 'log': {
      s.air.logFill = 0
      s.air.cleanLogs += 1
      s.air.noise = Math.max(0, s.air.noise - coolingPower(s) * 0.25)
      break
    }
    case 'air': {
      s.air.cleanLogs -= 1
      s.air.airingUntil = s.time + AIR.airDurationSec
      s.air.airReadyAt = s.time + AIR.airCooldownSec
      s.depth.cleanLogsLifetime += 1
      const burst = AIR.airBurstCash * (1 + s.antenna * 0.35) * (1 + s.era * 0.15)
      s.cash += burst
      s.lifetimeRevenue += burst
      s.air.lastBurst = burst
      s.air.lastBurstAt = s.time
      s.air.heat = Math.min(DECAY.heatMax, s.air.heat + 0.08 * programHeatMul(s))
      if (s.air.heat > 0.5 && s.depth.deadAirDips < DEPTH.era0DeadAirDips + 10) {
        if (s.depth.cleanLogsLifetime % 12 === 0) s.depth.deadAirDips += 1
      }
      if (s.depth.stars < 5)
        s.depth.stars = Math.min(
          5,
          s.depth.stars + 0.02 + upgradeEffect(s, 'star-glow') * 0.02,
        )
      break
    }
    case 'setFormat': {
      s.depth.featuredFormat = cmd.format
      break
    }
    case 'setProgram': {
      const prog = PROGRAM_BY_ID[cmd.id]
      if (prog) s.depth.programs[prog.daypart] = prog.id
      break
    }
    case 'serveCaller': {
      const c = s.depth.activeCaller!
      s.depth.callersServed += 1
      s.depth.stars = Math.min(5, s.depth.stars + 0.05)
      s.calls += 1
      s.depth.activeCaller = s.depth.waitingCaller
      s.depth.waitingCaller = null
      if (c.layaway) s.depth.checkIns += 0 // layaway served counts via check-in path
      void c
      break
    }
    case 'focusCaller': {
      const a = s.depth.activeCaller
      s.depth.activeCaller = s.depth.waitingCaller
      s.depth.waitingCaller = a
      break
    }
    case 'checkIn': {
      s.depth.checkIns += 1
      s.depth.checkInReadyAt = s.time + checkInCooldown(s)
      if (s.depth.activeCaller) s.depth.activeCaller.layaway = true
      break
    }
    case 'hire': {
      const cost = hireCost(s)
      const paid = spend(s, cost)
      if (!paid.ok) return paid
      const id = `crew-${s.crew.length + 1}`
      s.crew.push({ id, role: cmd.role, name: pick(s, ['Ash', 'Remy', 'Poe', 'Kit', 'Val']) })
      break
    }
    case 'assignShift': {
      s.depth.shifts[cmd.slot] = cmd.crewId
      break
    }
    case 'buyUpgrade': {
      const cost = upgradeCost(s, cmd.id)
      const paid = spend(s, cost)
      if (!paid.ok) return paid
      s.upgrades[cmd.id] = (s.upgrades[cmd.id] ?? 0) + 1
      break
    }
    case 'buyAntenna': {
      const qty = buyQty(cmd.qty)
      for (let i = 0; i < qty; i++) {
        const cost = antennaCost(s)
        const paid = spend(s, cost)
        if (!paid.ok) return paid
        s.antenna += 1
        if (s.era >= 2) pushInvoice(s, cost * 0.2)
      }
      break
    }
    case 'buyTower': {
      const qty = buyQty(cmd.qty)
      for (let i = 0; i < qty; i++) {
        const paid = spend(s, towerCost(s))
        if (!paid.ok) return paid
        const trait = pick(s, ['commuter', 'night', 'storm', 'highway'] as const)
        s.towers.push({ id: `tw-${s.towers.length + 1}`, trait, policy: null })
        pushInvoice(s, towerCost(s) * 0.15)
        if (!s.rivals.pirate) s.rivals.pirate = { stores: 0, frozenUntil: 0 }
      }
      break
    }
    case 'setTowerPolicy': {
      const tower = s.towers.find((t) => t.id === cmd.id)
      if (tower) tower.policy = cmd.policy
      break
    }
    case 'buyDepot': {
      const paid = spend(s, lateFloor(s, 400))
      if (!paid.ok) return paid
      s.hasDepot = true
      break
    }
    case 'buyRegion': {
      const paid = spend(s, lateFloor(s, 600))
      if (!paid.ok) return paid
      s.regions += 1
      break
    }
    case 'buySkip': {
      const paid = spend(s, lateFloor(s, 280))
      if (!paid.ok) return paid
      s.skips += 1
      s.depth.hotTrait = pick(s, ['commuter', 'night', 'storm', 'highway'] as const)
      if (!s.rivals.metrowave) s.rivals.metrowave = { stores: 0, frozenUntil: 0 }
      break
    }
    case 'buyBird': {
      const paid = spend(s, lateFloor(s, 900))
      if (!paid.ok) return paid
      s.birds += 1
      if (!s.rivals.orbital) s.rivals.orbital = { stores: 0, frozenUntil: 0 }
      break
    }
    case 'buySubcarrier': {
      const paid = spend(s, lateFloor(s, 1200))
      if (!paid.ok) return paid
      s.subcarriers += 1
      break
    }
    case 'payInvoice': {
      const inv = s.depth.invoices.find((i) => i.id === cmd.id && !i.paid)!
      let amt = inv.amount
      if (s.time <= inv.dueAt) {
        amt *= DEPTH.invoiceEarlyDisc
        inv.onTime = true
        s.depth.invoicesOnTime += 1
      } else {
        amt *= DEPTH.invoiceLateFee
        inv.onTime = false
      }
      const paid = spend(s, amt)
      if (!paid.ok) return paid
      inv.paid = true
      break
    }
    case 'fileFormatClock': {
      // Fill empty slots with dayparts for a legal clock
      for (let i = 0; i < s.depth.formatSlots.length; i++) {
        if (!s.depth.formatSlots[i]) s.depth.formatSlots[i] = DAYPARTS[i % DAYPARTS.length]!
      }
      s.depth.formatPractice += 1
      if (s.depth.formatPractice >= DEPTH.formatPracticeNeed) s.depth.formatCredited = true
      break
    }
    case 'printPromo': {
      const paid = spend(s, CAPITAL.promoCost)
      if (!paid.ok) return paid
      s.depth.promoBand = cmd.band
      s.depth.promoUntil = s.time + DEPTH.promoCooldownSec
      s.depth.promoWeeks += 1
      break
    }
    case 'signHeatLog': {
      s.depth.heatLogs += 1
      s.depth.heatLogReadyAt = s.time + DEPTH.heatLogCooldownSec
      s.air.heat = Math.max(0, s.air.heat - coolingPower(s))
      break
    }
    case 'walkHotTrait': {
      s.depth.hotTraitWalks += 1
      s.depth.hotTraitReadyAt = s.time + DEPTH.hotTraitCooldownSec
      s.depth.hotTrait = pick(s, ['commuter', 'night', 'storm', 'highway'] as const)
      break
    }
    case 'fileManifest': {
      if (cmd.kind === 'fast') {
        const burst = Math.max(DEPTH.fastManifestMin, (s.rates.revenuePerSec || 1) * DEPTH.fastManifestCashSec)
        s.cash += burst
        s.lifetimeRevenue += burst
        s.depth.laneOpen = true
        s.depth.manifestReadyAt = s.time + DEPTH.manifestCooldownSec * DEPTH.fastManifestFrac
        break
      }
      if (cmd.kind === 'exam') s.depth.examHolds += 1
      else s.depth.cleanManifests += 1
      s.depth.laneOpen = false
      s.depth.manifestReadyAt = s.time + DEPTH.manifestCooldownSec
      break
    }
    case 'finishHaul': {
      s.depth.fieldHaulsDone += 1
      s.depth.haulReadyAt = s.time + DEPTH.haulCooldownSec
      break
    }
    case 'stampQuiet': {
      s.depth.quietStamps += 1
      s.depth.quietReadyAt = s.time + DEPTH.quietCooldownSec
      break
    }
    case 'quietStay': {
      s.quietLaws = (cmd.laws ?? []).slice(0, 2)
      s.era = 7
      s.menus.dial = true
      s.dial.tape += 5
      seedChoir(s)
      break
    }
    case 'quietRetune': {
      retuneRun(s, cmd.carry ?? null)
      s.quietLaws = (cmd.laws ?? []).slice(0, 2)
      break
    }
    case 'quietSignOff': {
      s.paused = true
      break
    }
    case 'serveGuestEar': {
      s.depth.guestEars += 1
      s.depth.guestReadyAt = s.time + DEPTH.guestCooldownSec
      if (s.depth.featuredFormat) {
        s.depth.climateFacingBan = {
          format: s.depth.featuredFormat,
          until: (Math.floor(s.time / DEPTH.shiftDaySec) + 1) * DEPTH.shiftDaySec,
        }
      }
      s.dial.tape += 1
      break
    }
    case 'settleStop': {
      s.depth.settles += 1
      s.depth.settleReadyAt = s.time + DEPTH.settleCooldownSec
      s.depth.pendingStop = cmd.tax
      s.dial.packet += 1
      break
    }
    case 'doSeasonChore': {
      s.depth.yieldHauls += 1
      s.depth.choreReadyAt = s.time + DEPTH.choreCooldownSec
      s.depth.bedLocked = true
      s.dial.season += 1
      break
    }
    case 'fileDial': {
      const layer = cmd.layer
      const practice = s.dial.practice[layer] ?? 0
      const score = cmd.clever ? 0.88 : 0.74
      s.dial.lastScore = score
      if (practice < DIAL.practicePerLayer) {
        s.dial.practice[layer] = practice + 1
      } else {
        s.dial.credited[layer] = (s.dial.credited[layer] ?? 0) + 1
        s.dial.deskReadyAt = s.time + DIAL.deskGapSec
        if (layer === 'phrase') {
          // posting habit on credit
          s.depth.postedHabit = {
            habit: 'talk',
            until: s.time + 600,
            agentId: s.operators[0]?.id ?? null,
          }
        }
      }
      if (layer === 'reel') s.dial.tape += 0.5
      if (layer === 'route') s.dial.packet += 0.5
      if (layer === 'season') s.dial.season += 0.5
      if (layer === 'phrase') s.dial.phrase += 0.5
      break
    }
    case 'postHabit': {
      if (s.operators.length === 0) {
        s.operators.push({ id: 'op-1', name: 'Handler', habit: cmd.habit })
      }
      const agent = s.operators.find((o) => o.habit === cmd.habit) ?? s.operators[0]!
      s.depth.postedHabit = { habit: cmd.habit, until: s.time + 480, agentId: agent.id }
      s.depth.habitWatches += 1
      s.depth.habitReadyAt = s.time + DEPTH.habitCooldownSec
      break
    }
    case 'setOperatorHabit': {
      const op = s.operators.find((o) => o.id === cmd.id)!
      const post = s.depth.postedHabit
      if (post && post.agentId === cmd.id && s.time < post.until) return fail('Posted agent locked.')
      op.habit = cmd.habit
      if (post && !post.agentId && post.habit === cmd.habit) post.agentId = cmd.id
      break
    }
    case 'seatClause': {
      s.depth.seatingClause = cmd.id
      s.depth.seatedClauses.push(cmd.id)
      s.depth.clauseSeats += 1
      s.depth.clauseReadyAt = s.time + DEPTH.clauseCooldownSec
      s.dial.seal += 1
      break
    }
    case 'answerHearing': {
      const next = s.depth.seatedClauses.find((c) => !s.depth.heardClauses.includes(c))
      if (next) s.depth.heardClauses.push(next)
      s.depth.hearingSession += 1
      break
    }
    case 'signCharter': {
      s.depth.charterFork = cmd.fork
      break
    }
    case 'fillLine': {
      const idx = s.dial.listLines.findIndex((l) => !l)
      if (idx >= 0) s.dial.listLines[idx] = cmd.line
      else s.dial.listLines[s.dial.listLines.length - 1] = cmd.line
      const filled = s.dial.listLines.filter(Boolean).length
      s.dial.listMean = filled / s.dial.listLines.length
      break
    }
    case 'rehearseAccept': {
      const mean = s.dial.listMean
      const pad = Math.min(0.08, upgradeEffect(s, 'rehearsal-pad'))
      const missChance =
        mean < DIAL.acceptMean ? 1 : Math.max(0, DIAL.rehearsalMissChance - pad)
      if (nextRng(s) < missChance) {
        // scratch weakest
        let weak = 0
        for (let i = 0; i < s.dial.listLines.length; i++) {
          if (s.dial.listLines[i]) weak = i
        }
        s.dial.listLines[weak] = null
        const filled = s.dial.listLines.filter(Boolean).length
        s.dial.listMean = filled / s.dial.listLines.length
        s.dial.rehearsalUntil = s.time + DIAL.rehearsalRetrySec
        return fail('Rehearsal scratched a line.')
      }
      s.depth.rehearseDone = true
      s.dial.rehearsalUntil = s.time + 900
      break
    }
    case 'acceptLast': {
      s.dial.accepted = true
      s.depth.lastMutationAt = s.time
      break
    }
    case 'rejectLast': {
      s.dial.rejected += 1
      if (s.dial.rejected >= 2) s.paused = true
      break
    }
    case 'runTournament': {
      s.calls -= DEPTH.tournamentCallCost
      s.ear += 8
      s.tournamentReadyAt = s.time + DEPTH.tournamentCooldownSec
      break
    }
    case 'buyDoctrine': {
      const cost = doctrineCost(s)
      const paid = spend(s, cost)
      if (!paid.ok) return paid
      if (!s.doctrines.includes(cmd.id)) s.doctrines.push(cmd.id)
      break
    }
    case 'retune': {
      retuneRun(s, cmd.carry ?? null)
      break
    }
    case 'setEra': {
      s.era = cmd.era
      unlockMenus(s)
      seedChoir(s)
      break
    }
    case 'dismissAway': {
      s.awayReceipt = null
      break
    }
    case 'setPaused': {
      s.paused = cmd.paused
      break
    }
    case 'setSpeed': {
      s.speed = Math.max(0, Math.min(8, cmd.speed))
      break
    }
    case 'markIntro': {
      s.introSeen = true
      break
    }
    case 'acceptChapter': {
      s.chapterSeen = s.era
      break
    }
    case 'startWar': {
      const r = s.rivals[cmd.rivalId]
      if (r) {
        r.frozenUntil = s.time + 420
        r.stores = Math.max(0, r.stores - 2)
        s.air.noise += 0.04
      }
      break
    }
    case 'buyoutRival': {
      const r = s.rivals[cmd.rivalId]
      if (r) {
        const cost = 40 + r.stores * 12
        const paid = spend(s, cost)
        if (!paid.ok) return paid
        delete s.rivals[cmd.rivalId]
        if (!s.buyouts.includes(cmd.rivalId)) s.buyouts.push(cmd.rivalId)
      }
      break
    }
    case 'hushChoir': {
      s.depth.choirHushUntil = s.time + DEPTH.choirHushSec
      break
    }
    case 'buyBestUpgrade': {
      let best: string | null = null
      let bestCost = Infinity
      for (const id of Object.keys(UPGRADE_BY_ID)) {
        const def = UPGRADE_BY_ID[id]
        if (!def || def.era > s.era) continue
        const c = upgradeCost(s, id)
        if (c <= s.cash && c < bestCost) {
          best = id
          bestCost = c
        }
      }
      if (!best) return fail('Nothing affordable.')
      return run(s, { type: 'buyUpgrade', id: best })
    }
    case 'undo':
      // Engine restores snapshot; no-op here.
      break
  }

  syncGoals(s)
  return ok()
}

function pushInvoice(s: GameState, amount: number) {
  if (s.depth.invoices.filter((i) => !i.paid).length >= DEPTH.invoiceUnpaidCap) return
  s.depth.invoices.push({
    id: `inv-${s.depth.invoices.length + 1}-${Math.floor(s.time)}`,
    amount,
    dueAt: s.time + DEPTH.invoiceDueSec,
    paid: false,
    onTime: false,
  })
}

function unlockMenus(s: GameState) {
  s.menus.air = true
  if (s.era >= 1) s.menus.crew = true
  if (s.era >= 2) {
    s.menus.plant = true
    s.menus.network = true
    s.menus.books = true
  }
  if (s.era >= 7) s.menus.dial = true
  if (s.era >= 3) s.menus.archive = true
}

/** The Choir wakes once the Dial is open (era ≥ 7), like Pirate / MetroWave wake with a tower / skip. */
function seedChoir(s: GameState) {
  if (s.era < 7) return
  if (s.rivals.choir || s.buyouts.includes('choir')) return
  s.rivals.choir = { stores: 0, frozenUntil: 0 }
}

function retuneRun(s: GameState, carry: GameState['prestigeCarry']) {
  const archive = { ...s.archive }
  const trust = Math.floor(Math.cbrt(s.lifetimeRevenue / 1e6)) + s.listenerTrust
  const doctrines = [...s.doctrines]
  const keepDoctrine =
    carry?.type === 'doctrine' && doctrines.includes(carry.id) && !!DOCTRINE_BY_ID[carry.id]
      ? carry.id
      : null
  const carriedProgram =
    carry?.type === 'facing' && PROGRAM_BY_ID[carry.id] ? PROGRAM_BY_ID[carry.id] : null
  const kept: GameState['prestigeCarry'] = keepDoctrine
    ? { type: 'doctrine', id: keepDoctrine }
    : carriedProgram
      ? { type: 'facing', id: carriedProgram.id }
      : null
  const seed = s.seed
  const createdAt = s.createdAt
  Object.assign(s, {
    ...s,
    era: 0,
    cash: 12 + trust * 2,
    calls: 0,
    ear: s.ear,
    antenna: 0,
    towers: [],
    regions: 0,
    skips: 0,
    birds: 0,
    subcarriers: 0,
    hasDepot: false,
    crew: [],
    operators: [],
    upgrades: {},
    memos: {},
    goalsDone: {},
    menus: { air: true },
    quietLaws: [],
    air: {
      tuned: false,
      frequency: 88.1,
      carrier: 1,
      noise: 0.2,
      heat: 0,
      focus: 1,
      logFill: 0,
      cleanLogs: 0,
      airingUntil: 0,
      airReadyAt: 0,
      tuneReadyAt: 0,
      lastHoldAt: 0,
      holding: false,
      lastBurst: 0,
      lastBurstAt: 0,
    },
    depth: {
      stars: DEPTH.starsStart,
      callersServed: 0,
      checkIns: 0,
      checkInReadyAt: 0,
      deadAirDips: 0,
      cleanLogsLifetime: 0,
      dawnDays: 0,
      shiftDay: 0,
      shifts: { dawn: null, day: null, night: null },
      activeCaller: null,
      waitingCaller: null,
      nextCallerAt: 30,
      featuredFormat: null,
      formatSlots: Array.from({ length: DEPTH.formatSlots }, () => null),
      formatPractice: 0,
      formatCredited: false,
      invoices: [],
      invoicesOnTime: 0,
      promoBand: null,
      promoUntil: 0,
      promoWeeks: 0,
      heatLogs: 0,
      heatLogReadyAt: 0,
      hotTrait: null,
      hotTraitWalks: 0,
      hotTraitReadyAt: 0,
      examHolds: 0,
      cleanManifests: 0,
      manifestReadyAt: 0,
      fieldHaulsDone: 0,
      haulReadyAt: 0,
      quietStamps: 0,
      quietReadyAt: 0,
      guestEars: 0,
      guestReadyAt: 0,
      settles: 0,
      settleReadyAt: 0,
      yieldHauls: 0,
      choreReadyAt: 0,
      habitWatches: 0,
      habitReadyAt: 0,
      clauseSeats: 0,
      clauseReadyAt: 0,
      rehearseDone: false,
      climateFacingBan: null,
      pendingStop: null,
      bedLocked: false,
      postedHabit: null,
      seatingClause: null,
      seatedClauses: [],
      heardClauses: [],
      hearingSession: 0,
      charterFork: null,
      endlessBan: null,
      lastMutationAt: 0,
      programs: carriedProgram ? { [carriedProgram.daypart]: carriedProgram.id } : {},
      choirHushUntil: 0,
      laneOpen: false,
    },
    dial: {
      tape: 0,
      packet: 0,
      season: 0,
      phrase: 0,
      seal: 0,
      practice: {},
      credited: {},
      deskReadyAt: 0,
      lastScore: 0,
      listLines: [null, null, null, null, null],
      listMean: 0,
      rehearsalUntil: 0,
      accepted: false,
      rejected: 0,
    },
    archive,
    listenerTrust: trust,
    doctrines: keepDoctrine ? [keepDoctrine] : [],
    prestigeCarry: kept,
    seed,
    createdAt,
    rivals: {},
    buyouts: [],
    introSeen: true,
  } satisfies Partial<GameState>)
  // Force depth/air from create-like empties already assigned above
  void CALLERS
}

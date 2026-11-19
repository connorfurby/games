import { cashLabel } from '@/shared/bn'
import { emptyBills, type BillId, BILL_DEFS } from '../../content/depth'
import { DEPTH, POLITICS } from '../balance'
import { clamp, log, round2, setEra, unlockMenu } from '../helpers'
import { chance } from '../rng'
import type { GameState } from '../state'
import { plantCountOf } from './cold'

export function openPolitics(s: GameState) {
  if (s.politics.capital <= 0) s.politics.capital = POLITICS.capitalStart
  unlockMenu(s, 'politics')
  log(s, 'Lobbyist hired. Political Capital slowly drains, so spend it.', 'memo')
}

export function canHireLobby(s: GameState): string | null {
  if (!(s.memos['lobby-office'] > 0) && s.era < 3) return 'Politics locked.'
  if (s.cash < POLITICS.lobbyCost) return `Need ${cashLabel(POLITICS.lobbyCost)}.`
  return null
}

export function hireLobby(s: GameState) {
  s.cash = round2(s.cash - POLITICS.lobbyCost)
  s.politics.lobby += 1
  s.politics.capital = round2(s.politics.capital + POLITICS.lobbyCapitalGain)
  unlockMenu(s, 'politics')
  log(s, 'Lobbyist on retainer. Capital topped up.', 'good')
}

export function acquireCost(s: GameState): { cash: number; capital: number } {
  const n = s.politics.acquisitions
  return {
    cash: Math.ceil(POLITICS.acquireCash * Math.pow(POLITICS.acquireGrowth, n)),
    capital: Math.ceil(POLITICS.acquireCapital * Math.pow(1.2, n)),
  }
}

export function canAcquire(s: GameState): string | null {
  if (!(s.memos['monopoly-watch'] > 0) && s.politics.acquisitions <= 0 && s.era < 3) {
    return 'Acquisition Desk locked.'
  }
  const { cash, capital } = acquireCost(s)
  if (s.cash < cash) return `Need ${cashLabel(cash)}.`
  if (s.politics.capital < capital) return `Need ${capital} Political Capital.`
  return null
}

export function acquireRegion(s: GameState) {
  const { cash, capital } = acquireCost(s)
  s.cash = round2(s.cash - cash)
  s.politics.capital = round2(s.politics.capital - capital)
  s.politics.acquisitions += 1
  s.politics.monopolyRisk = clamp(
    s.politics.monopolyRisk + POLITICS.monopolyPerAcquire,
    0,
    POLITICS.monopolyCap,
  )
  log(s, `Acquired a neighbor (#${s.politics.acquisitions}). Monopoly risk ${Math.round(s.politics.monopolyRisk * 100)}%.`, 'good')

  if (s.politics.monopolyRisk > 0.55 && chance(s, s.politics.monopolyRisk * 0.15)) {
    const fine = Math.min(
      s.cash * POLITICS.monopolyFineCashFrac,
      POLITICS.monopolyFineFlat * (1 + s.politics.acquisitions * 0.2),
    )
    const pay = round2(Math.min(s.cash, fine))
    s.cash = round2(s.cash - pay)
    s.stats.finesPaid += pay
    log(s, `Monopoly receipt: ${cashLabel(pay)} fine. Run continues.`, 'warn')
  }
}

export function billsPassed(s: GameState): number {
  if (!s.politics.bills) return 0
  return Object.values(s.politics.bills).filter(Boolean).length
}

export function billCost(s: GameState): { cash: number; capital: number } {
  const n = billsPassed(s)
  return {
    cash: Math.ceil(POLITICS.billCash * Math.pow(POLITICS.billGrowth, n)),
    capital: Math.ceil(POLITICS.billCapital * Math.pow(1.15, n)),
  }
}

export function canPassBill(s: GameState, id: BillId): string | null {
  if (s.era < 3 && !(s.memos['monopoly-watch'] > 0)) return 'Politics locked.'
  if (!BILL_DEFS[id]) return 'Unknown bill.'
  if (!s.politics.bills) s.politics.bills = emptyBills()
  if (s.politics.bills[id]) return 'Already passed.'
  const { cash, capital } = billCost(s)
  if (s.cash < cash) return `Need ${cashLabel(cash)}.`
  if (s.politics.capital < capital) return `Need ${capital} Political Capital.`
  return null
}

export function passBill(s: GameState, id: BillId) {
  if (!s.politics.bills) s.politics.bills = emptyBills()
  const { cash, capital } = billCost(s)
  s.cash = round2(s.cash - cash)
  s.politics.capital = round2(s.politics.capital - capital)
  s.politics.bills[id] = true
  // Map bills to acquisitions counter for council seats later
  s.politics.acquisitions = Math.max(s.politics.acquisitions, billsPassed(s))
  s.politics.monopolyRisk = clamp(
    s.politics.monopolyRisk + POLITICS.monopolyPerAcquire * 0.5,
    0,
    POLITICS.monopolyCap,
  )
  unlockMenu(s, 'politics')
  log(s, `Passed the ${BILL_DEFS[id].name}.`, 'good')
}

export function canLeaveRegion(s: GameState): string | null {
  if (s.politics.leftRegion || s.era >= 4) return 'Already left the region.'
  if (s.cold.yieldLeft > POLITICS.leaveYieldNeed) return 'Empty regional yield first.'
  if (billsPassed(s) < POLITICS.leaveBillsNeed) {
    return `Pass ${POLITICS.leaveBillsNeed} bills first (${billsPassed(s)}/${POLITICS.leaveBillsNeed}).`
  }
  if (s.politics.capital < POLITICS.leaveCapitalNeed) {
    return `Need ${POLITICS.leaveCapitalNeed} Political Capital to leave the region.`
  }
  if (!(s.memos['leave-region'] > 0) && s.era < 3) return 'Leave the Region memo first.'
  const logs = s.depth?.cooler?.logsSigned ?? 0
  if (logs < DEPTH.coolerLogNeed) {
    return `Sign ${DEPTH.coolerLogNeed} cooler logs (${logs}/${DEPTH.coolerLogNeed}).`
  }
  if (plantCountOf(s, 'blast') < 1) return 'Need a blast freezer plant.'
  if (plantCountOf(s, 'tunnel') < 1) return 'Need a tunnel cold plant.'
  if (!s.depth?.leadsOnBoard?.fresh || !s.depth?.leadsOnBoard?.cold) {
    return 'Put Fresh and Cold leads on the Shift Board at least once.'
  }
  if ((s.depth?.stars ?? 0) < DEPTH.leaveStarMin) {
    return `Need stars ≥ ${DEPTH.leaveStarMin}.`
  }
  return null
}

export function leaveRegion(s: GameState) {
  s.politics.capital = round2(s.politics.capital - POLITICS.leaveCapitalNeed)
  s.politics.leftRegion = true
  setEra(s, 4)
  unlockMenu(s, 'logistics')
  log(s, 'Packed the brand. Left the region. The map gets bigger — Era 4.', 'era')
}

/** Capital leak, lobby trickle, brand regen. */
export function tickPolitics(s: GameState, dt: number) {
  if (s.era < 3) return
  if (!(s.memos['lobby-office'] > 0) && s.politics.capital <= 0 && s.politics.lobby <= 0) return

  if (s.politics.capital > 0) {
    const leak = POLITICS.leakPerSec * dt
    s.politics.capital = Math.max(0, round2(s.politics.capital - leak))
  }
  let lobby = s.politics.lobby
  // Cold-desk lobbyistPerson counts as a retainer
  if (s.staff.some((m) => m.role === 'lobbyistPerson')) lobby += 1
  if (lobby > 0) {
    s.politics.capital = round2(s.politics.capital + POLITICS.lobbyGainPerSec * lobby * dt)
  }

  if (s.brand < 1) {
    s.brand = clamp(s.brand + POLITICS.brandRegenPerSec * dt, 0, 1)
  }
}

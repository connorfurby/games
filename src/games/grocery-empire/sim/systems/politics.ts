import { POLITICS } from '../balance'
import { clamp, log, round2, setEra, unlockMenu } from '../helpers'
import { chance } from '../rng'
import type { GameState } from '../state'

export function openPolitics(s: GameState) {
  if (s.politics.capital <= 0) s.politics.capital = POLITICS.capitalStart
  unlockMenu(s, 'politics')
  log(s, 'Lobby retainer signed. Political Capital is a leaky wallet.', 'memo')
}

export function canHireLobby(s: GameState): string | null {
  if (!(s.memos['lobby-office'] > 0) && s.era < 3) return 'Politics locked.'
  if (s.cash < POLITICS.lobbyCost) return `Need $${POLITICS.lobbyCost}.`
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
  if (s.cash < cash) return `Need $${cash.toFixed(0)}.`
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

  // Soft monopoly fine — caps cash hit, never bricks
  if (s.politics.monopolyRisk > 0.55 && chance(s, s.politics.monopolyRisk * 0.15)) {
    const fine = Math.min(
      s.cash * POLITICS.monopolyFineCashFrac,
      POLITICS.monopolyFineFlat * (1 + s.politics.acquisitions * 0.2),
    )
    const pay = round2(Math.min(s.cash, fine))
    s.cash = round2(s.cash - pay)
    s.stats.finesPaid += pay
    log(s, `Monopoly receipt: $${pay.toFixed(0)} fine. Run continues.`, 'warn')
  }
}

export function canLeaveRegion(s: GameState): string | null {
  if (s.politics.leftRegion || s.era >= 4) return 'Already left the region.'
  if (s.cold.yieldLeft > POLITICS.leaveYieldNeed) return 'Empty regional yield first.'
  if (s.politics.capital < POLITICS.leaveCapitalNeed) {
    return `Need ${POLITICS.leaveCapitalNeed} Political Capital to file departure.`
  }
  if (!(s.memos['leave-region'] > 0) && s.era < 3) return 'Leave the Region memo first.'
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
    const leak = POLITICS.leakPerSec * (1 + s.politics.lobby * 0.1) * dt
    s.politics.capital = Math.max(0, round2(s.politics.capital - leak))
  }
  if (s.politics.lobby > 0) {
    s.politics.capital = round2(
      s.politics.capital + POLITICS.lobbyGainPerSec * s.politics.lobby * dt,
    )
  }

  // Brand regenerates; never a brick
  if (s.brand < 1) {
    s.brand = clamp(s.brand + POLITICS.brandRegenPerSec * dt, 0, 1)
  }
}

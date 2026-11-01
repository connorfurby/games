import { CAPITAL, INVEST } from '../balance'
import { clamp, log, round2 } from '../helpers'
import { nextRng } from '../rng'
import type { GameState, InvestRisk } from '../state'

function gaussian(s: GameState) {
  // Box-Muller using sim RNG
  const u1 = Math.max(1e-9, nextRng(s))
  const u2 = nextRng(s)
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/** Debt covenant: high leverage blocks aggressive capital moves. */
export function debtCovenantBreached(s: GameState): boolean {
  if (s.debt.owed <= 0) return false
  const denom = Math.max(1, s.cash + s.passbook.balance + s.invest.balance + s.equity * 0.1)
  return s.debt.owed / denom >= CAPITAL.covenantDebtRatio
}

export function investEngineCost(s: GameState): number {
  const lvl = s.invest.engineLevel
  return Math.ceil(INVEST.engineBaseCost * Math.pow(INVEST.engineGrowth, lvl))
}

export function doctrineCost(s: GameState, owned: number): number {
  return Math.ceil(CAPITAL.doctrineBaseRead * Math.pow(CAPITAL.doctrineGrowth, owned))
}

function tickInvestBook(s: GameState, dt: number) {
  if (!s.invest.unlocked || s.invest.balance <= 0) return
  if (s.invest.circuitBreaker) return

  s.invest.tickAcc += dt
  if (s.invest.tickAcc < INVEST.tickSec) return
  s.invest.tickAcc -= INVEST.tickSec

  const risk: InvestRisk = s.invest.risk
  const profile = INVEST.risk[risk]
  const engineBonus = 1 + s.invest.engineLevel * INVEST.engineMeanBonus
  const mean = profile.mean * engineBonus
  const ret = mean + profile.vol * gaussian(s)
  const before = s.invest.balance
  s.invest.balance = Math.max(0, round2(s.invest.balance * (1 + ret)))
  if (s.invest.balance > s.invest.peak) s.invest.peak = s.invest.balance

  const peak = Math.max(s.invest.peak, before)
  if (peak > 0 && s.invest.balance <= peak * (1 - INVEST.circuitDrop)) {
    s.invest.circuitBreaker = true
    log(
      s,
      `Investment book circuit breaker: −${Math.round(INVEST.circuitDrop * 100)}% from peak. Withdraw or lower risk to reset.`,
      'warn',
    )
  }
}

function tickBoard(s: GameState, dt: number) {
  if (!s.incorporated) return
  if (s.board.nextMeetingAt <= 0) {
    s.board.nextMeetingAt = s.time + CAPITAL.boardIntervalSec
    return
  }
  // Soft pressure: ignoring a due meeting slowly spends Reputation (never bricks).
  if (s.time >= s.board.nextMeetingAt && s.board.lastResolvedAt < s.board.nextMeetingAt) {
    const overdue = s.time - s.board.nextMeetingAt
    if (overdue > 0 && s.compute.reputation > 0) {
      const drainChance = Math.min(0.4, overdue / CAPITAL.boardIntervalSec) * dt * 0.02
      if (drainChance > 0 && nextRng(s) < drainChance) {
        s.compute.reputation = Math.max(0, s.compute.reputation - 1)
        s.repSpent += 1
        log(s, 'Board agenda ignored — one Reputation spent on damage control.', 'warn')
      }
    }
  }
  // Advance schedule quietly so meetings keep arriving
  if (s.time >= s.board.nextMeetingAt + CAPITAL.boardIntervalSec) {
    s.board.nextMeetingAt = s.time + CAPITAL.boardIntervalSec
  }
}

/**
 * Stub Read trickle while doctrines exist and Ideas are on — real Read comes from
 * tournaments; this keeps the currency visible between runs.
 */
function tickReadStub(s: GameState, dt: number) {
  if (s.era < 2) return
  const doctrineCount = Object.values(s.doctrines).reduce((a, n) => a + (n > 0 ? 1 : 0), 0)
  if (doctrineCount <= 0) return
  if (!s.compute.ideasUnlocked || !s.compute.ideasOn) return
  s.read += doctrineCount * 0.002 * dt
}

/** Invest book returns, board pressure, Read stub, debt covenant logging. */
export function tickCapital(s: GameState, dt: number) {
  if (s.era < 2) return
  tickInvestBook(s, dt)
  tickBoard(s, dt)
  tickReadStub(s, dt)

  if (debtCovenantBreached(s) && s.time % 90 < dt) {
    // Rare soft reminder — recovery still works
    log(s, 'Debt covenant: leverage is high. Expansion and High-risk book moves are blocked until repaid.', 'warn')
  }
}

export function resolveBoardMeeting(s: GameState) {
  if (!s.incorporated) return
  s.board.lastResolvedAt = s.time
  s.board.nextMeetingAt = s.time + CAPITAL.boardIntervalSec
  s.stats.boardMeetings += 1
  // Tiny equity float bump — flavor, not a win condition
  s.equity = round2(s.equity + Math.max(5, s.equity * 0.002))
  log(s, 'Board meeting resolved. Agenda filed; Brand holds.', 'good')
}

export function tournamentReadPayout(s: GameState): number {
  const doctrines = Object.values(s.doctrines).reduce((a, n) => a + Math.max(0, n), 0)
  return round2(CAPITAL.tournamentBaseRead + doctrines * CAPITAL.readPerDoctrine)
}

export function canReleaseAutonomous(s: GameState): string | null {
  if (s.autonomous) return 'Already released.'
  if (s.era < 2) return 'Need Era 2.'
  if (!s.depot) return 'Build the depot first.'
  if (s.read < CAPITAL.autonomousReadNeed) {
    return `Need ${CAPITAL.autonomousReadNeed} Read (have ${Math.floor(s.read)}).`
  }
  if (s.repSpent < CAPITAL.autonomousRepSpentNeed) {
    return `Need ~${CAPITAL.autonomousRepSpentNeed} Reputation spent on Analysts/Archives (have ${s.repSpent}).`
  }
  return null
}

export function applyAutonomous(s: GameState) {
  s.autonomous = true
  s.compute.reputation = 0
  // Soft auto-price toward reference when released
  s.price = clamp(s.price, 1.2, 2.2)
  log(s, 'Autonomous fulfillment released. Manual pricing UI rests; Analysts, Archives, Ideas, Read, and the book remain.', 'era')
}

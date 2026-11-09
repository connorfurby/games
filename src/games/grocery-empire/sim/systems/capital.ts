import { CAPITAL, DOCTRINE_EFFECTS, INVEST } from '../balance'
import { upgradeEffect } from '../../content/upgrades'
import { DOCTRINES as ERA2_DOCTRINES } from '../../content/era2'
import { bestPrice, covenantRatio, investBookCap, investYieldingBalance, up } from '../formulas'
import { clamp, log, round2 } from '../helpers'
import { nextRng } from '../rng'
import type { BoardAgenda, GameState, InvestRisk } from '../state'

function gaussian(s: GameState) {
  const u1 = Math.max(1e-9, nextRng(s))
  const u2 = nextRng(s)
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/** Debt covenant: high leverage blocks aggressive capital moves. */
export function debtCovenantBreached(s: GameState): boolean {
  if (s.debt.owed <= 0) return false
  const denom = Math.max(1, s.cash + s.passbook.balance + s.invest.balance + s.equity * 0.1)
  return s.debt.owed / denom >= covenantRatio(s)
}

export function investEngineCost(s: GameState): number {
  const lvl = s.invest.engineLevel
  return Math.ceil(INVEST.engineBaseCost * Math.pow(INVEST.engineGrowth, lvl))
}

export function doctrineCost(s: GameState, owned: number): number {
  return Math.ceil(CAPITAL.doctrineBaseRead * Math.pow(CAPITAL.doctrineGrowth, owned))
}

/** Count only era2 doctrine ids (ghost lateEras keys must not inflate Read). */
export function era2DoctrineCount(s: GameState): number {
  let n = 0
  for (const d of ERA2_DOCTRINES) {
    if ((s.doctrines[d.id] ?? 0) > 0) n += 1
  }
  return n
}

function tickInvestBook(s: GameState, dt: number) {
  if (!s.invest.unlocked || s.invest.balance <= 0) return
  if (s.invest.circuitBreaker) return

  s.invest.tickAcc += dt
  if (s.invest.tickAcc < INVEST.tickSec) return
  s.invest.tickAcc -= INVEST.tickSec

  const risk: InvestRisk = s.invest.risk
  const profile = INVEST.risk[risk]
  const mean =
    profile.mean * (1 + s.invest.engineLevel * INVEST.engineMeanBonus) * (1 + up(s, 'float-ladder') * 0.03)
  const ret = mean + profile.vol * gaussian(s)
  const before = s.invest.balance
  const yielding = investYieldingBalance(s)
  if (yielding <= 0) {
    s.rates.investYieldPerSec = 0
    return
  }
  const gain = yielding * ret
  s.invest.balance = Math.max(0, round2(before + gain))
  s.rates.investYieldPerSec = gain / INVEST.tickSec
  s.stats.interestEarned += Math.max(0, gain)
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

  const cap = investBookCap(s)
  if (before > cap * 1.05 && s.time % 120 < INVEST.tickSec) {
    log(
      s,
      `Book yielding on $${Math.floor(cap).toLocaleString()} of $${Math.floor(before).toLocaleString()}. Withdraw surplus to spend it.`,
      'info',
    )
  }
}

function meetingDue(s: GameState): boolean {
  return (
    s.incorporated &&
    s.board.nextMeetingAt > 0 &&
    s.time >= s.board.nextMeetingAt &&
    s.board.lastResolvedAt < s.board.nextMeetingAt
  )
}

function tickBoard(s: GameState, dt: number) {
  if (!s.incorporated) return
  if (s.board.nextMeetingAt <= 0) {
    s.board.nextMeetingAt = s.time + CAPITAL.boardIntervalSec
    return
  }
  // Soft pressure: ignore drains unspent Rep (never bricks) — does NOT bump repSpent.
  if (meetingDue(s)) {
    const overdue = s.time - s.board.nextMeetingAt
    if (overdue > 0 && s.compute.reputation > 0) {
      const drainChance =
        Math.min(0.4, overdue / CAPITAL.boardIntervalSec) *
        dt *
        CAPITAL.boardIgnoreRepDrain *
        Math.max(0.2, 1 - up(s, 'board-buffer') * 0.15 - upgradeEffect(s, 'minute-taker'))
      if (drainChance > 0 && nextRng(s) < drainChance) {
        s.compute.reputation = Math.max(0, s.compute.reputation - 1)
        s.brand = clamp(s.brand - 0.01, 0.05, 1)
        log(s, 'Board agenda ignored — Reputation and Brand take a nick.', 'warn')
      }
    }
  }
  // Keep pressure until resolved — do not silently reschedule away the meeting.
}

/**
 * Stub Read trickle — only era2 doctrines count.
 */
function tickReadStub(s: GameState, dt: number) {
  if (s.era < 2) return
  const doctrineCount = era2DoctrineCount(s)
  if (doctrineCount <= 0) return
  if (!s.compute.ideasUnlocked || !s.compute.ideasOn) return
  s.read += doctrineCount * 0.002 * dt
}

/** Brand regenerates slowly in every era so Era 2 nicks heal. */
function tickBrandRegen(s: GameState, dt: number) {
  if (s.brand >= 1) return
  const rate = CAPITAL.brandRegenPerSec ?? 0.002
  s.brand = clamp(s.brand + rate * dt, 0.05, 1)
}

/** After Autonomous release: slew price / equalize Att / auto-collect per habit. */
function tickAutonomous(s: GameState, dt: number) {
  if (!s.autonomous) return
  // Fire about every 10 sim-seconds without touching acc.secTimer (used by rates).
  if (Math.floor(s.time / 10) === Math.floor((s.time - dt) / 10)) return
  const habit = s.autonomousHabit ?? 'balanced'
  const doPrice = habit === 'balanced' || habit === 'price'
  const doAtt = habit === 'balanced' || habit === 'attention'
  const doCollect = habit === 'balanced' || habit === 'collect'
  if (doPrice) {
    const tip = bestPrice(s)
    if (Number.isFinite(tip) && tip > 0) {
      s.price = clamp(s.price + (tip - s.price) * 0.35, 0.5, 50)
    }
  }
  if (doAtt && s.stores.length > 1) {
    const even = 1 / s.stores.length
    for (const st of s.stores) st.attentionShare = even
  }
  if (doCollect) {
    for (const [id, v] of Object.entries(s.ventures)) {
      if (v && v.stored > 0.5) {
        s.cash += v.stored
        v.lifetime = (v.lifetime ?? 0) + v.stored
        v.stored = 0
        log(s, `Autonomous collected ${id} till.`, 'info')
      }
    }
  }
}

export function setAutonomousHabit(s: GameState, habit: import('../state').AutonomousHabit) {
  s.autonomousHabit = habit
  log(s, `Autonomous habit → ${habit}.`, 'info')
}

/** Invest book returns, board pressure, Read stub, Brand regen, Autonomous habits. */
export function tickCapital(s: GameState, dt: number) {
  tickBrandRegen(s, dt)
  if (s.era < 2) return
  tickInvestBook(s, dt)
  tickBoard(s, dt)
  tickReadStub(s, dt)
  tickAutonomous(s, dt)

  if (debtCovenantBreached(s) && s.time % 90 < dt) {
    log(s, 'Debt covenant: leverage is high. Expansion and High-risk book moves are blocked until repaid.', 'warn')
  }
}

export function canResolveBoard(s: GameState): string | null {
  if (!s.incorporated) return 'Incorporate first.'
  if (!meetingDue(s)) return 'No board meeting due.'
  return null
}

export function resolveBoardMeeting(s: GameState, agenda?: BoardAgenda) {
  if (!s.incorporated) return
  if (!meetingDue(s)) return
  const pick = agenda ?? s.board.pendingAgenda ?? 'expand'
  s.board.lastResolvedAt = s.time
  s.board.nextMeetingAt = s.time + CAPITAL.boardIntervalSec
  s.board.pendingAgenda = null
  s.stats.boardMeetings += 1

  switch (pick) {
    case 'expand': {
      s.board.expandDiscount = 0.9
      const equityHit = Math.min(s.equity * 0.08, s.equity)
      s.equity = round2(Math.max(0, s.equity - equityHit))
      log(s, 'Board: Expand — next store opens 10% cheaper (equity reserved).', 'good')
      break
    }
    case 'dividend': {
      const payout = Math.min(s.equity * 0.12, s.equity)
      s.equity = round2(Math.max(0, s.equity - payout))
      s.cash += payout * 0.85
      s.brand = clamp(s.brand - 0.04, 0.05, 1)
      log(s, `Board: Dividend — $${Math.floor(payout * 0.85)} cash; Brand nicked.`, 'good')
      break
    }
    case 'rnd': {
      s.board.rndUntil = s.time + CAPITAL.boardIntervalSec
      const cash = Math.min(s.cash, 400)
      s.cash -= cash
      log(s, 'Board: Shelf R&D — perishables keep longer until the next meeting.', 'good')
      break
    }
    case 'hours': {
      s.board.cutHoursUntil = s.time + Math.min(180, CAPITAL.boardIntervalSec * 0.4)
      s.hours = Math.min(s.hours, 1.0)
      log(s, 'Board: Cut hours — wages ease; demand softens briefly.', 'info')
      break
    }
  }
  s.equity = round2(s.equity + Math.max(2, s.equity * 0.001))
}

export function tournamentReadPayout(s: GameState): number {
  const doctrines = era2DoctrineCount(s)
  let payout = CAPITAL.tournamentBaseRead + doctrines * CAPITAL.readPerDoctrine
  if ((s.doctrines['read-bank'] ?? 0) > 0) payout += DOCTRINE_EFFECTS.bankReadBonus
  return round2(payout)
}

export function canReleaseAutonomous(s: GameState): string | null {
  if (s.autonomous) return 'Already released.'
  if (s.era < 2) return 'Need Era 2.'
  if (!s.depot) return 'Build the depot first.'
  if ((s.memos['autonomous-brief'] ?? 0) <= 0) return 'Stamp the Autonomous Brief memo first.'
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
  if (!s.autonomousHabit) s.autonomousHabit = 'balanced'
  s.compute.reputation = 0
  const tip = bestPrice(s)
  if (Number.isFinite(tip) && tip > 0) s.price = clamp(tip, 0.5, 50)
  else s.price = clamp(s.price, 1.2, 2.2)
  log(
    s,
    'Autonomous fulfillment released. Habits run from Books — default Balanced (price, Att, collect).',
    'era',
  )
}

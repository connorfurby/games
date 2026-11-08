import { BUILD_TRACKS } from '../../content/builds'
import { upgradeEffect } from '../../content/upgrades'
import { DEBT, LOYALTY, RECOVERY } from '../balance'
import {
  arrearsCap,
  passbookRate,
  passbookYieldingBalance,
  rentPerSec,
  up,
  upkeepPerSec,
  wagesPerSec,
} from '../formulas'
import { log } from '../helpers'
import type { GameState } from '../state'

/**
 * Rent, wages, upkeep → cash or arrears. Arrears and nephew debt skim a share of
 * incoming revenue. Passbook accrues interest into the book balance.
 */
export function tickFinance(s: GameState, dt: number, revenueThisTick = 0) {
  const rent = rentPerSec(s) * dt
  const wages = wagesPerSec(s) * dt
  const upkeep = upkeepPerSec(s, BUILD_TRACKS) * dt
  const bill = rent + wages + upkeep

  if (bill > 0) {
    if (s.cash >= bill) {
      s.cash -= bill
      s.stats.rentPaid += rent
      s.stats.wagesPaid += wages
      s.stats.upkeepPaid += upkeep
      s.acc.costWindow += bill
    } else {
      const pay = Math.max(0, s.cash)
      s.cash = 0
      s.stats.rentPaid += Math.min(rent, pay)
      const leftoverBill = bill - pay
      const cap = arrearsCap(s, RECOVERY.arrearsCapSec)
      const before = s.arrears
      s.arrears = Math.min(cap, s.arrears + leftoverBill)
      if (s.arrears >= cap - 1e-9 && before < cap - 1e-9) {
        const forgiven = leftoverBill - (s.arrears - before)
        if (forgiven > 0) s.arrearsForgiven += forgiven
      }
      s.acc.costWindow += pay
    }
  }

  if (revenueThisTick > 0) {
    if (s.arrears > 0) {
      const skim = Math.min(
        s.arrears,
        revenueThisTick * RECOVERY.arrearsRevenueShare * (1 + up(s, 'arrears-call') * 0.1),
      )
      s.arrears -= skim
      s.cash = Math.max(0, s.cash - skim)
      s.stats.rentPaid += skim
    }
    if (s.debt.owed > 0) {
      const share =
        DEBT.revenueShare *
        (1 + up(s, 'debt-plan') * DEBT.planBonusPerLevel + upgradeEffect(s, 'iou-folder'))
      const pay = Math.min(s.debt.owed, revenueThisTick * share, s.cash)
      if (pay > 0) {
        s.cash -= pay
        s.debt.owed -= pay
        if (s.debt.owed <= 0.01) {
          s.debt.owed = 0
          log(s, 'Nephew’s float repaid in full.', 'good')
        }
      }
    }
    if (s.loyalty.tier > 0) {
      s.loyalty.liability += revenueThisTick * LOYALTY.liabilityFrac * s.loyalty.tier
    }
  }

  if (s.passbook.balance > 0) {
    const yielding = passbookYieldingBalance(s)
    const interest = yielding * passbookRate(s) * dt
    if (interest > 0) {
      s.passbook.balance += interest
      s.stats.interestEarned += interest
    }
    // Fold passbook yield into the combined invest yield HUD line when book is idle.
    if (!(s.invest?.unlocked && s.invest.balance > 0 && !s.invest.circuitBreaker)) {
      s.rates.investYieldPerSec = interest / Math.max(dt, 1e-6)
    } else {
      s.rates.investYieldPerSec = (s.rates.investYieldPerSec ?? 0) + interest / Math.max(dt, 1e-6)
    }
  }

  if (s.cash > s.stats.peakCash) s.stats.peakCash = s.cash
}

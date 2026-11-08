import { COMPUTE } from './balance'

/** Basket-earned Reputation points (excludes free starter Rep). */
export function basketRepEarned(repEarned: number) {
  return Math.max(0, Math.floor(repEarned) - COMPUTE.freeRep)
}

/**
 * Baskets needed to have earned `basketPoints` from sales
 * (0 → firstRepAt threshold for the first +1).
 */
export function nextRepThreshold(basketPoints: number): number {
  let t = COMPUTE.firstRepAt
  const n = Math.max(0, Math.floor(basketPoints))
  for (let i = 0; i < n; i++) {
    t += Math.round(COMPUTE.repGapBase * Math.pow(COMPUTE.repGapGrowth, i))
  }
  return t
}

/** How many basket-earned Reputation points `baskets` deserve. */
export function basketRepFromBaskets(baskets: number): number {
  let earned = 0
  while (nextRepThreshold(earned) <= baskets) earned += 1
  return earned
}

/** Gap to the next +1 after `basketPoints` already earned from baskets. */
export function nextRepGap(basketPoints: number): number {
  return Math.round(COMPUTE.repGapBase * Math.pow(COMPUTE.repGapGrowth, Math.max(0, basketPoints)))
}

/** Total repEarned (including free starter) deserved from current baskets. */
export function deservedRepEarned(baskets: number): number {
  return COMPUTE.freeRep + basketRepFromBaskets(baskets)
}

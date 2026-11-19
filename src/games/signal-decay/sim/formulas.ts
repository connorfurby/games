import { programPullMul } from '../content/programs'
import { statBonus } from '../content/upgrades'
import { AIR, BAND, CAPITAL, DECAY, DEMAND, DEPTH, RELAY } from './balance'
import { clarity, clamp } from './helpers'
import type { GameState, ShiftSlot } from './state'

export function bandMul(s: GameState): number {
  const ant = BAND.antenna[clamp(s.antenna, 0, BAND.antenna.length - 1)] ?? 1
  const era = BAND.era[clamp(s.era, 0, BAND.era.length - 1)] ?? 1
  return ant * era
}

export function shiftCovered(s: GameState, slot: ShiftSlot): boolean {
  return !!s.depth.shifts[slot]
}

export function neglectMul(s: GameState): number {
  if (s.era < 1) return 1
  const covered = DEPTH.shiftSlots.filter((slot) => shiftCovered(s, slot)).length
  if (covered === 0) return RELAY.neglectFloor
  if (covered < 2) return (RELAY.neglectFloor + 1) / 2
  return 1
}

/** Match pays when the tower's trait is the hot one. Push is louder. Quiet thins the net. */
export function towerPolicyMul(s: GameState): number {
  let bonus = 0
  let quiet = 1
  const hot = s.depth.hotTrait
  for (const t of s.towers) {
    if (t.policy === 'match' && hot && t.trait === hot) bonus += DEPTH.towerMatchStep
    if (t.policy === 'push') bonus += DEPTH.towerPushStep
    if (t.policy === 'quiet') quiet *= DEPTH.towerQuietRelay
  }
  return (1 + Math.min(DEPTH.towerPolicyCap, bonus)) * Math.max(DEPTH.towerQuietFloor, quiet)
}

export function relayMul(s: GameState): number {
  let w = 1
  const towerW =
    (RELAY.towerBase + s.towers.length * RELAY.towerPer) * (1 + statBonus(s, 'towerWeight'))
  w += towerW
  if (s.towers.length >= RELAY.towersBeforeDepot && !s.hasDepot) w *= RELAY.noDepotMul
  w += s.regions * RELAY.regionPer
  w += s.skips * RELAY.skipPer * (1 + statBonus(s, 'skipMul'))
  w += s.birds * RELAY.birdPer * (1 + statBonus(s, 'birdMul'))
  w += s.subcarriers * RELAY.subPer
  if (s.regions > 0) w = 1 + (w - 1) * (0.6 + RELAY.oldLayerWeightSoft)
  return Math.max(1, w) * neglectMul(s) * towerPolicyMul(s)
}

export function earlyDemandMul(s: GameState): number {
  if (s.era >= 2) return 1
  const progress = clamp(
    (s.depth.callersServed + s.depth.cleanLogsLifetime / 4) / Math.max(1, DEPTH.era1CallersNeed),
    0,
    1,
  )
  return DEMAND.earlyMulStart + (DEMAND.earlyMulEnd - DEMAND.earlyMulStart) * progress
}

export function formatFit(s: GameState): number {
  if (!s.depth.featuredFormat) return 0.85
  const ban = s.depth.climateFacingBan
  if (ban && ban.format === s.depth.featuredFormat && s.time < ban.until) return 0.85
  return 1.08 * programPullMul(s)
}

/** Choir stores nibble the audience until someone answers them. */
export function choirHum(s: GameState): number {
  const choir = s.rivals.choir
  if (!choir || choir.stores <= 0) return 1
  if (s.time < s.depth.choirHushUntil) return 1
  return 1 - Math.min(DEPTH.choirHumCap, choir.stores * DEPTH.choirHumPerStore)
}

function weirdDamp(s: GameState): number {
  if (!s.quietLaws.includes('weirdElasticity')) return 1
  return 1 / (1 + Math.max(0, bandMul(s) - 1) * DEPTH.weirdBandDamp)
}

function clarityAudience(s: GameState, c: number): number {
  const slope = s.quietLaws.includes('weirdElasticity') ? DEPTH.weirdClaritySlope : DEMAND.claritySlope
  return (1 + c * slope) * weirdDamp(s)
}

export function nightPayMul(s: GameState): number {
  if (!s.quietLaws.includes('richerNight')) return 1
  if (s.depth.featuredFormat === 'night' || shiftCovered(s, 'night')) return DEPTH.richerNightMul
  return 1
}

export function starMul(s: GameState): number {
  const stars = s.depth.stars
  if (stars >= 4.5) return 1.12
  if (stars >= 4) return 1.05
  if (stars >= 3.5) return 1
  if (stars >= 3) return 0.92
  if (stars >= 2.5) return 0.8
  return 0.65
}

export function rivalCut(s: GameState): number {
  let stores = 0
  for (const r of Object.values(s.rivals)) stores += r.stores
  return 1 / (1 + stores * 0.006)
}

export function wordOfMouth(s: GameState): number {
  return 1 + DEMAND.wordOfMouth * Math.log10(1 + s.depth.cleanLogsLifetime / 60)
}

export function listenersPerSec(s: GameState): number {
  const c = clarity(s)
  if (c < DECAY.clarityFloor) {
    return (
      DEMAND.baseListenersPerSec *
      DECAY.underFloorAudienceMul *
      earlyDemandMul(s) *
      starMul(s) *
      rivalCut(s) *
      choirHum(s) *
      weirdDamp(s)
    )
  }
  return (
    DEMAND.baseListenersPerSec *
    formatFit(s) *
    earlyDemandMul(s) *
    starMul(s) *
    wordOfMouth(s) *
    rivalCut(s) *
    choirHum(s) *
    clarityAudience(s, c)
  )
}

export function airRate(s: GameState): number {
  return (
    AIR.rateBase *
    bandMul(s) *
    (1 + statBonus(s, 'airRate')) *
    (s.quietLaws.includes('expensivePromos') ? 0.92 : 1)
  )
}

export function revenuePerSec(s: GameState): number {
  if (s.air.airingUntil <= s.time) return 0
  const flag = listenersPerSec(s) * airRate(s)
  const net = (relayMul(s) - 1) * flag * RELAY.margin
  return (flag + net) * nightPayMul(s)
}

export function towerCost(s: GameState): number {
  return CAPITAL.towerBase * Math.pow(CAPITAL.towerGrowth, s.towers.length)
}

export function antennaCost(s: GameState): number {
  return CAPITAL.antennaBase * Math.pow(CAPITAL.antennaGrowth, s.antenna)
}

export function antennaBundleCost(s: GameState, qty: number): number {
  let total = 0
  for (let i = 0; i < qty; i++) {
    total += CAPITAL.antennaBase * Math.pow(CAPITAL.antennaGrowth, s.antenna + i)
  }
  return total
}

export function towerBundleCost(s: GameState, qty: number): number {
  let total = 0
  for (let i = 0; i < qty; i++) {
    total += CAPITAL.towerBase * Math.pow(CAPITAL.towerGrowth, s.towers.length + i)
  }
  return total
}

/** How many of a growing ladder the cash on hand can buy, capped. */
export function affordableQty(cash: number, costAt: (index: number) => number, cap: number): number {
  let qty = 0
  let left = cash
  for (let i = 0; i < cap; i++) {
    const cost = costAt(i)
    if (left < cost) break
    left -= cost
    qty += 1
  }
  return qty
}

export function hireCost(s: GameState): number {
  return CAPITAL.hireBase * Math.pow(CAPITAL.hireGrowth, s.crew.length)
}

export function decayRate(s: GameState): number {
  const eraMul = DECAY.eraMul[clamp(s.era, 0, DECAY.eraMul.length - 1)] ?? 1
  const heatMul = 1 + s.air.heat * 0.35
  const law = s.quietLaws.includes('fasterDecay') ? 1.25 : 1
  const cut = 1 - Math.min(0.5, statBonus(s, 'noiseCut'))
  return DECAY.rate * eraMul * heatMul * law * cut
}

export function holdPush(s: GameState): number {
  return DECAY.holdPush * (1 + statBonus(s, 'holdPush'))
}

export function coolingPower(s: GameState): number {
  return DECAY.coolingPerLog * (1 + statBonus(s, 'cooling'))
}

export function logSpeed(s: GameState): number {
  return AIR.logFillPerSec * (1 + statBonus(s, 'logSpeed'))
}

export function checkInCooldown(s: GameState): number {
  const pad = Math.min(0.5, statBonus(s, 'checkInPad'))
  return DEPTH.checkInCooldownSec * (1 - pad)
}

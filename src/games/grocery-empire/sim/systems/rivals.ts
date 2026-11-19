import { cashLabel } from '@/shared/bn'
import { CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { RIVALS, RIVAL_BY_ID, type RivalDef, type RivalId } from '../../content/rivals'
import { DEPTH, EMPIRE, HORIZON, RIVAL_CHAINS } from '../balance'
import { log, waitLabel } from '../helpers'
import { lateCashFloor } from '../lateCost'
import { chance, pick } from '../rng'
import type { GameState, RivalState } from '../state'
import { pennyLockChanceMul, pennyLockGapMul } from './flyerStance'
import { hearingSessionOpen, nextHearingClause, openHearingSession } from './horizonCore'
import { upgradeEffect } from '../../content/upgrades'
import { statCut, statMul } from './stats'

export function clearRivalLock(s: GameState, why?: string) {
  if (!s.depth?.rivalLockCat) return
  const cat = s.depth.rivalLockCat
  s.depth.rivalLockCat = null
  log(s, why ?? `Penny aisle lock on ${cat} cleared.`, 'good')
}

/**
 * Named rival chains. One opens per era from Era 2. An independent rival grows a
 * store every few minutes and every store shaves a little demand. Price wars knock
 * it back; buyouts fold its stores into your network for good.
 */

export function rivalOpen(s: GameState, def: RivalDef): boolean {
  return s.era >= def.era
}

function fresh(s: GameState, def: RivalDef): RivalState {
  return {
    stores: def.startStores,
    bought: false,
    boughtStores: 0,
    nextGrowAt: s.time + def.growSec,
    frozenUntil: 0,
    warReadyAt: 0,
    grown: 0,
    wars: 0,
  }
}

/** The rival's state, or null if its era has not arrived. */
export function rivalState(s: GameState, id: RivalId): RivalState | null {
  return s.rivals?.[id] ?? null
}

/** Independent rivals currently on the board. */
export function activeRivals(s: GameState): { def: RivalDef; st: RivalState }[] {
  const out: { def: RivalDef; st: RivalState }[] = []
  for (const def of RIVALS) {
    const st = s.rivals?.[def.id]
    if (st && !st.bought) out.push({ def, st })
  }
  return out
}

/** Seconds in one ration-ledger day (a shift day, shortened by Ledger Stamp Pad). */
export function ledgerDayLength(s: GameState): number {
  return DEPTH.shiftDaySec * (1 - Math.min(0.35, upgradeEffect(s, 'ledger-stamp-pad')))
}

/**
 * Phase 9 — the Ration Board in ration week (Era 6). The Board's named chain opens in Era 12, but its
 * clipboard is already on the door: once the first slice of a ledger day has passed with no
 * `stampLedger`, it feeds on the gap until you stamp. Stateless — read from `lastLedgerDay` and the clock.
 */
export function rationBoardBehind(s: GameState): boolean {
  if (!s.depth || s.era < 6) return false
  const until = s.depth.rationWeekUntil ?? 0
  if (until <= 0 || s.time >= until) return false
  if ((s.depth.ledgerStamps ?? 0) >= DEPTH.rationLedgerNeed) return false
  if (s.rivals?.ration?.bought) return false
  const len = ledgerDayLength(s)
  const day = Math.floor(s.time / len)
  if ((s.depth.lastLedgerDay ?? -1) >= day) return false
  return (s.time % len) / len >= DEPTH.rationBoardGraceFrac
}

/** Demand the Board skims while the ledger is a day behind (1 when it is caught up). */
export function rationBoardDemandMul(s: GameState): number {
  return rationBoardBehind(s) ? DEPTH.rationBoardDemandMul : 1
}

/** Demand multiplier from independent rivals (≤ 1). */
export function rivalDemandMul(s: GameState): number {
  let stores = 0
  for (const { st } of activeRivals(s)) stores += st.stores
  const board = rationBoardDemandMul(s)
  if (stores <= 0) return board
  return board / (1 + stores * RIVAL_CHAINS.perStore * statCut(s, 'rivalCut'))
}

function tickRationBoardWeek(s: GameState) {
  if (!rationBoardBehind(s)) return
  const len = ledgerDayLength(s)
  const dayStart = Math.floor(s.time / len) * len
  const text = 'The Ration Board counts an unstamped ledger — demand slips until you stamp.'
  if (s.ledger.some((e) => e.t >= dayStart && e.text === text)) return
  log(s, text, 'warn')
}

/** Store-equivalents added to the network by bought rivals. */
export function boughtRivalStores(s: GameState): number {
  let n = 0
  for (const def of RIVALS) {
    const st = s.rivals?.[def.id]
    if (st?.bought) n += st.boughtStores
  }
  return n * RIVAL_CHAINS.boughtStoreWeight * statMul(s, 'store')
}

export function buyoutCost(s: GameState, id: RivalId): number {
  const def = RIVAL_BY_ID[id]
  const st = s.rivals?.[id]
  const stores = st?.stores ?? def.startStores
  const authored = def.buyoutBase * (1 + stores * RIVAL_CHAINS.buyoutPerStore) * statCut(s, 'dealCut')
  // Late / Horizon chains follow revenue so buyouts stay spendable.
  if (def.era >= 7) return Math.ceil(lateCashFloor(s, authored, RIVAL_CHAINS.lateGateMul))
  return Math.ceil(authored)
}

export function priceWarCost(s: GameState, id: RivalId): number {
  return Math.ceil(buyoutCost(s, id) * RIVAL_CHAINS.warCostFrac)
}

export function canPriceWar(s: GameState, id: RivalId): string | null {
  const def = RIVAL_BY_ID[id]
  if (!def) return 'Unknown rival.'
  const st = s.rivals?.[id]
  if (!st) return `${def.name} opens in Era ${def.era}.`
  if (st.bought) return 'Already yours.'
  if (st.stores <= 1) return 'Down to their first store.'
  if (s.time < st.warReadyAt) return `Ready in ${waitLabel(st.warReadyAt - s.time)}.`
  const cost = priceWarCost(s, id)
  if (s.cash < cost) return `Need ${cashLabel(cost)}.`
  return null
}

export function priceWar(s: GameState, id: RivalId) {
  const def = RIVAL_BY_ID[id]
  const st = s.rivals[id]!
  const cost = priceWarCost(s, id)
  s.cash -= cost
  const closed = Math.min(RIVAL_CHAINS.warStoresClosed, st.stores - 1)
  st.stores -= closed
  st.frozenUntil = s.time + RIVAL_CHAINS.warFreezeSec
  st.nextGrowAt = Math.max(st.nextGrowAt, st.frozenUntil)
  st.warReadyAt = s.time + RIVAL_CHAINS.warCooldownSec
  st.wars += 1
  if (id === 'penny') clearRivalLock(s, 'Price war broke Penny’s aisle lock.')
  if (id === 'drift' && s.depth?.driftLockPlanet) {
    const planet = s.horizon?.planets.find((p) => p.id === s.depth!.driftLockPlanet)
    if (planet) planet.lockedSku = null
    s.depth.driftLockPlanet = null
    log(s, 'Price war cleared Drift’s SKU lock.', 'good')
  }
  if (id === 'keelmark' && s.depth && s.depth.stolenBay >= 0) {
    s.depth.stolenBay = -1
    s.depth.stolenBayCircuit = -1
    log(s, 'Price war returned Keelmark’s stolen bay.', 'good')
  }
  if (id === 'verdant' && s.depth?.verdantTrait) {
    s.depth.verdantTrait = null
    log(s, 'Price war lifted Verdant’s undercut.', 'good')
  }
  if (id === 'static' && s.depth?.jammedSymbol) {
    s.depth.jammedSymbol = null
    log(s, 'Price war cleared Static’s jam.', 'good')
  }
  if (id === 'ration' && s.depth && s.depth.rationLine >= 0) {
    s.depth.rationLine = -1
    log(s, 'Price war eased Ration Board pressure.', 'good')
  }
  if (id === 'megamart' && s.depth?.megaMartTarget) {
    s.depth.megaMartTarget = null
    s.depth.megaMartUntil = 0
    log(s, 'Price war pushed MegaMart off your franchise.', 'good')
  }
  log(s, `Price war with ${def.name}: ${closed} store${closed === 1 ? '' : 's'} closed (−${cashLabel(cost)}). ${def.flinch}`, 'good')
}

export function canBuyout(s: GameState, id: RivalId): string | null {
  const def = RIVAL_BY_ID[id]
  if (!def) return 'Unknown rival.'
  const st = s.rivals?.[id]
  if (!st) return `${def.name} opens in Era ${def.era}.`
  if (st.bought) return 'Already yours.'
  if (id === 'concord') {
    const need = HORIZON.clauseSeatingNeed
    const done = s.horizon?.seatingsDone ?? 0
    if (done < need) return `Seat ${need} clauses before Concord buyout (${done}/${need}).`
  }
  const cost = buyoutCost(s, id)
  if (s.cash < cost) return `Need ${cashLabel(cost)}.`
  return null
}

export function buyout(s: GameState, id: RivalId) {
  const def = RIVAL_BY_ID[id]
  const st = s.rivals[id]!
  const cost = buyoutCost(s, id)
  s.cash -= cost
  foldRival(s, id)
  log(s, `Bought ${def.name} (−${cashLabel(cost)}). ${st.stores} stores join the network. ${def.farewell}`, 'good')
}

/** A rival becomes yours (cash buyout or a share takeover): its stores join your network. */
export function foldRival(s: GameState, id: RivalId) {
  const st = s.rivals[id]!
  st.bought = true
  st.boughtStores = st.stores
  if (id === 'megamart' && s.depth) {
    s.depth.megaMartTarget = null
    s.depth.megaMartUntil = 0
    log(s, 'MegaMart buyout ends franchise pressure.', 'era')
  }
  // A buyout is worth a share of the current Empire level per store, so it matters in every era.
  const levelXp = EMPIRE.levelBase * Math.pow(EMPIRE.levelGrowth, Math.max(0, s.empire.level - 1))
  s.empire.xp += st.stores * levelXp * RIVAL_CHAINS.buyoutLevelShare * statMul(s, 'xp')
  s.stats.rivalsBought = (s.stats.rivalsBought ?? 0) + 1
}

function tickPennyAisleLock(s: GameState) {
  if (!s.depth) return
  const penny = s.rivals?.penny
  if (!penny || penny.bought || s.era < 2) return
  if (s.depth.rivalLockCat) return
  // SAVE 32: a live deep flyer shortens the gap and raises the chance.
  const gap = DEPTH.rivalLockGapSec * pennyLockGapMul(s)
  if (s.depth.rivalLockAt > 0 && s.time - s.depth.rivalLockAt < gap) return
  if (!chance(s, DEPTH.rivalLockChancePerSec * pennyLockChanceMul(s))) return
  const unlocked = CATEGORY_IDS.filter((c) => s.categories[c] && c !== 'privateLabel')
  if (unlocked.length === 0) return
  const cat = pick(s, unlocked) as CategoryId
  s.depth.rivalLockCat = cat
  s.depth.rivalLockAt = s.time
  log(s, `Penny Pantry locked your ${cat} aisle. Reface it, change posture, or price-war.`, 'warn')
}

function tickPennyCounterFlyer(s: GameState) {
  if (!s.depth) return
  const penny = s.rivals?.penny
  if (!penny || penny.bought || s.era < 2) return
  if (s.depth.counterFlyerNeeded) return
  if (s.depth.counterFlyerAt > 0 && s.time - s.depth.counterFlyerAt < DEPTH.counterFlyerGapSec) return
  // Prefer after at least one flyer so the desk is known.
  if ((s.depth.flyerWeeks ?? 0) < 1 && (s.depth.circularsRun ?? 0) < 1) return
  if (!chance(s, DEPTH.counterFlyerChancePerSec)) return
  s.depth.counterFlyerNeeded = true
  s.depth.counterFlyerAt = s.time
  log(s, 'Penny dropped a counter-flyer. Print a week from the Flyer Desk.', 'warn')
}

export function tickRivals(s: GameState) {
  if (!s.rivals) s.rivals = {}
  for (const def of RIVALS) {
    if (!rivalOpen(s, def)) continue
    let st = s.rivals[def.id]
    if (!st) {
      st = s.rivals[def.id] = fresh(s, def)
      log(s, `A rival opens: ${def.name}. ${def.tagline} See Team › Rivals.`, 'warn')
      continue
    }
    if (st.bought || st.stores >= def.maxStores) continue
    if (s.time < st.frozenUntil || s.time < st.nextGrowAt) continue
    st.stores += 1
    st.grown += 1
    st.nextGrowAt = s.time + def.growSec
    if (st.grown % RIVAL_CHAINS.tauntEvery === 1) {
      log(s, def.taunts[Math.floor(st.grown / RIVAL_CHAINS.tauntEvery) % def.taunts.length]!, 'warn')
    }
  }
  tickPennyAisleLock(s)
  tickPennyCounterFlyer(s)
  tickRationBoardWeek(s)
  tickHorizonRivalPressure(s)
}

function tickHorizonRivalPressure(s: GameState) {
  if (!s.depth || s.era < 7) return
  if (s.depth.hzRivalAt > 0 && s.time - s.depth.hzRivalAt < DEPTH.hzRivalGapSec) return
  if (!chance(s, DEPTH.hzRivalChancePerSec)) return
  const h = s.horizon
  if (!h) return

  if (s.era >= 7 && s.rivals?.drift && !s.rivals.drift.bought && !s.depth.driftLockPlanet) {
    const stocked = h.planets.filter((p) => p.stocked && p.slots.some(Boolean))
    if (stocked.length) {
      const planet = pick(s, stocked)
      const sku = planet.slots.find((id) => id) ?? null
      if (sku) {
        planet.lockedSku = sku
        s.depth.driftLockPlanet = planet.id
        s.depth.hzRivalAt = s.time
        log(s, `Drift Provisions locked ${sku} on ${planet.id}. Price-war or clear the lock.`, 'warn')
        return
      }
    }
  }

  if (s.era >= 8 && s.rivals?.keelmark && !s.rivals.keelmark.bought && s.depth.stolenBay < 0) {
    if (h.circuits.length) {
      s.depth.stolenBay = pick(s, [0, 1, 2, 3, 4] as const)
      s.depth.stolenBayCircuit = Math.min(h.circuits.length - 1, Math.floor(s.time) % h.circuits.length)
      s.depth.hzRivalAt = s.time
      log(s, `Keelmark stole bay ${s.depth.stolenBay + 1}. Answer them to reopen it.`, 'warn')
      return
    }
  }

  if (s.era >= 9 && s.rivals?.verdant && !s.rivals.verdant.bought && !s.depth.verdantTrait) {
    const traits = ['sweet', 'sturdy', 'pretty', 'lasting', 'rich', 'quiet'] as const
    s.depth.verdantTrait = pick(s, [...traits])
    s.depth.hzRivalAt = s.time
    log(s, `Verdant undercuts ${s.depth.verdantTrait} on the breeding bench.`, 'warn')
    return
  }

  if (s.era >= 10 && s.rivals?.static && !s.rivals.static.bought && !s.depth.jammedSymbol) {
    const symbols = ['can', 'star', 'wave', 'leaf', 'bell', 'key'] as const
    s.depth.jammedSymbol = pick(s, [...symbols])
    s.depth.hzRivalAt = s.time
    log(s, `Static FM jammed the ${s.depth.jammedSymbol} mark.`, 'warn')
    return
  }

  // SAVE 35: Concord only hears clauses you have seated; seatClause usually opens the session itself.
  if (s.era >= 11 && s.rivals?.concord && !s.rivals.concord.bought && hearingSessionOpen(s)) {
    const clause = nextHearingClause(s)
    if (clause) {
      openHearingSession(s, clause)
      s.depth.hzRivalAt = s.time
      return
    }
  }

  if (s.era >= 12 && s.rivals?.ration && !s.rivals.ration.bought && h.list?.length) {
    s.depth.rationLine = Math.floor(s.time) % h.list.length
    s.depth.hzRivalAt = s.time
    log(s, `The Ration Board pressures list line ${s.depth.rationLine + 1}.`, 'warn')
  }
}

/** Name of the biggest independent rival, for event copy. */
export function leadingRivalName(s: GameState): string | null {
  let best: { def: RivalDef; st: RivalState } | null = null
  for (const r of activeRivals(s)) if (!best || r.st.stores > best.st.stores) best = r
  return best?.def.name ?? null
}

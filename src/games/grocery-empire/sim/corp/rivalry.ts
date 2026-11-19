import { upgradeEffect } from '../../content/upgrades'
import { cashLabel } from '@/shared/bn'
import { CEOS, warBeats, type CeoMove, type WarMove } from '../../content/corp/ceos'
import { RIVAL_BY_ID, RIVALS, type RivalId } from '../../content/rivals'
import { CORP, CRIME, RIVALRY } from '../balance'
import { log } from '../helpers'
import type { GameState } from '../state'
import { crimeOf } from '../systems/crime'
import { foldRival } from '../systems/rivals'
import { addBoost, coOf, sharePrice } from './company'
import { corpOf, crand, round2, salesRate } from './core'
import { shockTicker } from './market'
import type { CeoState } from './types'

export function rivalActive(s: GameState, id: string): boolean {
  const st = s.rivals?.[id]
  return !!st && !st.bought
}

export function ceoOf(s: GameState, id: string): CeoState {
  const c = corpOf(s)
  let st = c.ceo[id]
  if (!st) {
    st = c.ceo[id] = {
      grudge: 0,
      nextMoveAt: s.time + RIVALRY.moveGapMin,
      truceUntil: 0,
      mole: null,
      war: null,
      warReadyAt: 0,
      stakeInYou: 0,
      seenOwned: 0,
      lastPillAt: -1e9,
      wins: 0,
      losses: 0,
      lastLine: '',
    }
  }
  return st
}

/** Read a boss without creating one (for the screen). */
export function ceoPeek(s: GameState, id: string): CeoState {
  return (
    s.corp?.ceo[id] ?? {
      grudge: 0,
      nextMoveAt: 0,
      truceUntil: 0,
      mole: null,
      war: null,
      warReadyAt: 0,
      stakeInYou: 0,
      seenOwned: 0,
      lastPillAt: -1e9,
      wins: 0,
      losses: 0,
      lastLine: '',
    }
  )
}

export function addGrudge(s: GameState, id: string, n: number) {
  const st = ceoOf(s, id)
  const mul = CEOS[id as RivalId]?.grudgeMul ?? 1
  st.grudge = Math.max(0, Math.min(100, st.grudge + n * (n > 0 ? mul : 1)))
}

function say(s: GameState, id: string, line: string) {
  ceoOf(s, id).lastLine = line
}

function weighted<T extends string>(s: GameState, w: Partial<Record<T, number>>): T {
  const entries = Object.entries(w) as [T, number][]
  const total = entries.reduce((a, [, v]) => a + v, 0)
  let r = crand(s) * total
  for (const [k, v] of entries) {
    r -= v
    if (r <= 0) return k
  }
  return entries[0]![0]
}

/** All rival stakes in your company (shares). */
export function rivalStakeTotal(s: GameState): number {
  if (!s.corp) return 0
  let n = 0
  for (const st of Object.values(s.corp.ceo)) n += st.stakeInYou
  return n
}

export function rivalStakeDemandMul(s: GameState): number {
  return 1 - RIVALRY.stakeDemandCut * (rivalStakeTotal(s) / CORP.sharesPerCompany)
}

// ── Truce ────────────────────────────────────────────────────────────────

export function truceCost(s: GameState) {
  return round2(salesRate(s) * RIVALRY.truceCostSec)
}

export function makeTruce(s: GameState, id: string) {
  const st = ceoOf(s, id)
  s.cash = round2(s.cash - truceCost(s))
  st.grudge = Math.max(0, st.grudge - RIVALRY.truceCut)
  st.truceUntil = s.time + RIVALRY.truceSec
  say(s, id, CEOS[id as RivalId]?.truce ?? '')
  log(s, `A truce with ${RIVAL_BY_ID[id as RivalId]?.founder}. ${CEOS[id as RivalId]?.truce ?? ''}`, 'good')
}

export function stakeBuybackCost(s: GameState, id: string) {
  return round2(ceoOf(s, id).stakeInYou * sharePrice(s) * (1 + RIVALRY.stakeBuybackPremium))
}

export function buyBackStake(s: GameState, id: string) {
  const st = ceoOf(s, id)
  const cost = stakeBuybackCost(s, id)
  s.cash = round2(s.cash - cost)
  coOf(s).you += st.stakeInYou
  st.stakeInYou = 0
  addGrudge(s, id, 10)
  log(s, `You bought ${RIVAL_BY_ID[id as RivalId]?.name}'s stake back for ${cashLabel(cost)}.`, 'good')
}

// ── Head-to-head price war ───────────────────────────────────────────────

export function warRoundCost(s: GameState, move: WarMove) {
  return round2(salesRate(s) * RIVALRY.warRoundCostSec[move] * (1 - upgradeEffect(s, 'war-room')))
}

function rollNext(s: GameState, id: string, lastYou: WarMove | null): WarMove {
  const def = CEOS[id as RivalId]
  // Sometimes they read your last move and play what beats it.
  if (lastYou && crand(s) < RIVALRY.warReadOdds) {
    const counter = (['undercut', 'match', 'hold'] as WarMove[]).find((m) => warBeats(m, lastYou))
    if (counter) return counter
  }
  return weighted(s, def?.style ?? { undercut: 1, match: 1, hold: 1 })
}

export function startWar(s: GameState, id: string) {
  const st = ceoOf(s, id)
  st.war = { round: 1, you: 0, them: 0, next: rollNext(s, id, null), log: [] }
  st.warReadyAt = s.time + RIVALRY.warCooldownSec
  addGrudge(s, id, RIVALRY.warGrudge)
  log(s, `Price war with ${RIVAL_BY_ID[id as RivalId]?.name}: best of three.`, 'info')
}

export function playWar(s: GameState, id: string, move: WarMove) {
  const st = ceoOf(s, id)
  const w = st.war
  if (!w) return
  s.cash = round2(s.cash - warRoundCost(s, move))
  const them = w.next
  let win: boolean | null
  if (warBeats(move, them)) win = true
  else if (warBeats(them, move)) win = false
  else win = (s.brand ?? 0.5) >= 0.5 ? true : null // a tie goes to the better-known name
  if (win === true) w.you += 1
  if (win === false) w.them += 1
  w.log.push({ you: move, them, win })
  w.round += 1
  const done = w.you >= 2 || w.them >= 2 || w.round > 3
  if (!done) {
    w.next = rollNext(s, id, move)
    return
  }
  const rival = RIVAL_BY_ID[id as RivalId]
  const def = CEOS[id as RivalId]
  if (w.you > w.them) {
    st.wins += 1
    addBoost(s, 'demand', RIVALRY.warWinDemand, RIVALRY.warWinSec, `Won the price war with ${rival?.name}`)
    const r = s.rivals?.[id]
    if (r) r.frozenUntil = Math.max(r.frozenUntil, s.time + RIVALRY.warWinFreezeSec)
    shockTicker(s, id, RIVALRY.warWinStock, `${rival?.name} bleeds after a price war.`)
    say(s, id, def?.loseWar ?? '')
    log(s, `You won the price war with ${rival?.name}. ${def?.loseWar ?? ''}`, 'good')
  } else {
    st.losses += 1
    addBoost(s, 'demand', RIVALRY.warLoseDemand, RIVALRY.warLoseSec, `Lost the price war with ${rival?.name}`)
    shockTicker(s, id, 1.08, `${rival?.name} wins a price war.`)
    st.grudge = Math.max(0, st.grudge - 10)
    say(s, id, def?.winWar ?? '')
    log(s, `${rival?.name} won the price war. ${def?.winWar ?? ''}`, 'warn')
  }
  st.war = null
}

// ── Moles ────────────────────────────────────────────────────────────────

export function moleCost(s: GameState) {
  return round2(salesRate(s) * RIVALRY.moleCostSec)
}

export function plantMole(s: GameState, id: string) {
  const st = ceoOf(s, id)
  s.cash = round2(s.cash - moleCost(s))
  st.mole = { cover: RIVALRY.moleCoverStart, nextIntelAt: s.time + 60 }
  log(s, `A new stock clerk starts at ${RIVAL_BY_ID[id as RivalId]?.name}. They work for you.`, 'info')
}

function moleCaught(s: GameState, id: string) {
  const st = ceoOf(s, id)
  st.mole = null
  addGrudge(s, id, RIVALRY.caughtGrudge)
  s.brand = Math.max(0, s.brand - RIVALRY.caughtBrand)
  const c = crimeOf(s)
  c.heat = Math.min(CRIME.heatMax, c.heat + RIVALRY.caughtHeat)
  const line = CEOS[id as RivalId]?.caughtSpy ?? ''
  say(s, id, line)
  log(s, `Your mole at ${RIVAL_BY_ID[id as RivalId]?.name} was caught. ${line}`, 'warn')
  for (const f of spySuers) f(s, id)
}

/** The courts may follow a caught mole (registered by court.ts). */
export const spySuers: ((s: GameState, rival: string) => void)[] = []

/** A mole job: the cover it burns, and whether they get caught doing it. */
export function moleJob(s: GameState, id: string, job: 'steal' | 'sabotage') {
  const st = ceoOf(s, id)
  if (!st.mole) return
  const burn = job === 'steal' ? RIVALRY.stealCover : RIVALRY.sabotageCover
  const risk = Math.max(0, 1 - st.mole.cover / 100) * 0.6
  st.mole.cover -= burn
  if (crand(s) < risk || st.mole.cover <= 0) {
    moleCaught(s, id)
    return
  }
  const rival = RIVAL_BY_ID[id as RivalId]
  if (job === 'steal') {
    addBoost(s, 'ventures', RIVALRY.stealVentures, RIVALRY.stealSec, `Recipes from ${rival?.name}`)
    log(s, `Your mole lifted ${rival?.name}'s best recipes. Venture tills fill faster.`, 'good')
  } else {
    const r = s.rivals?.[id]
    if (r) r.frozenUntil = Math.max(r.frozenUntil, s.time + RIVALRY.sabotageFreezeSec)
    shockTicker(s, id, RIVALRY.sabotageStock, `${rival?.name}'s big launch goes mysteriously wrong.`)
    log(s, `${rival?.name}'s launch fizzled. Nobody knows why. (You know why.)`, 'good')
  }
}

// ── Takeovers ────────────────────────────────────────────────────────────

export function takeover(s: GameState, id: string) {
  const t = corpOf(s).tickers[id]
  const rival = RIVAL_BY_ID[id as RivalId]
  if (t) {
    t.owned = 0
    t.basis = 0
    t.listed = false
  }
  foldRival(s, id as RivalId)
  corpOf(s).takeovers += 1
  const st = ceoOf(s, id)
  st.mole = null
  st.war = null
  // Their stake in you comes home with the company.
  coOf(s).you += st.stakeInYou
  st.stakeInYou = 0
  const line = CEOS[id as RivalId]?.takeover ?? ''
  say(s, id, line)
  log(s, `Takeover! ${rival?.name} is yours: ${s.rivals[id]?.stores ?? 0} stores join the network. ${line}`, 'era')
}

// ── Tick ─────────────────────────────────────────────────────────────────

function move(s: GameState, id: string, m: CeoMove) {
  const rival = RIVAL_BY_ID[id as RivalId]
  const st = ceoOf(s, id)
  const line = CEOS[id as RivalId]?.angry ?? ''
  if (m === 'buyIn') {
    const co = coOf(s)
    if (!co.listed || co.float <= 0) m = 'smear'
    else {
      const n = Math.min(co.float, Math.round(RIVALRY.buyInMin + crand(s) * (RIVALRY.buyInMax - RIVALRY.buyInMin)))
      co.float -= n
      st.stakeInYou += n
      say(s, id, line)
      log(s, `${rival?.name} quietly bought ${(n / 10).toFixed(1)}% of your company. ${line}`, 'warn')
      return
    }
  }
  if (m === 'sue' && suers.length) {
    suers[0]!(s, id)
    say(s, id, line)
    return
  }
  if (m === 'poach') {
    addBoost(s, 'wages', RIVALRY.poachWages, RIVALRY.moveSec, `${rival?.name} poaching your crew`)
    log(s, `${rival?.founder} is poaching your crew. Wages up to keep them. ${line}`, 'warn')
  } else {
    addBoost(s, 'demand', RIVALRY.smearDemand, RIVALRY.moveSec, `${rival?.name} smear ads`)
    log(s, `${rival?.name} runs ads about you. They are not nice. ${line}`, 'warn')
  }
  say(s, id, line)
}

/** Lawsuit hook (the courts register themselves here, so this file stays small). */
export const suers: ((s: GameState, rival: string) => void)[] = []

export function tickRivalry(s: GameState) {
  const c = corpOf(s)
  for (const def of RIVALS) {
    if (!rivalActive(s, def.id)) continue
    const st = ceoOf(s, def.id)
    const ceo = CEOS[def.id]
    st.grudge = Math.max(0, st.grudge - (RIVALRY.grudgeDecayPerMin * (ceo?.temper === 'hot' ? 0.6 : 1)) / 60)
    // Buying their shares gets noticed.
    const t = c.tickers[def.id]
    const owned = t?.listed ? t.owned : 0
    if (owned > st.seenOwned) addGrudge(s, def.id, ((owned - st.seenOwned) / 100) * RIVALRY.stakeGrudgePer10)
    st.seenOwned = owned
    // A big stake triggers their poison pill: new shares dilute yours.
    if (t?.listed && owned >= RIVALRY.pillAt && owned < RIVALRY.takeoverShares && s.time - st.lastPillAt >= RIVALRY.pillEverySec) {
      st.lastPillAt = s.time
      const cut = Math.floor(owned * RIVALRY.pillCut)
      t.owned -= cut
      t.basis = round2(t.basis * (1 - cut / owned))
      st.seenOwned = t.owned
      log(s, `${def.name} issued new shares to fight you off. Your stake fell to ${(t.owned / 10).toFixed(1)}%.`, 'warn')
    }
    // Angry bosses act.
    if (st.grudge >= RIVALRY.actAt && st.truceUntil <= s.time && s.time >= st.nextMoveAt) {
      move(s, def.id, weighted(s, ceo?.moves ?? { smear: 1 }))
      st.nextMoveAt = s.time + RIVALRY.moveGapMin + crand(s) * (RIVALRY.moveGapMax - RIVALRY.moveGapMin)
    } else if (st.grudge < RIVALRY.actAt && st.nextMoveAt < s.time) {
      st.nextMoveAt = s.time + RIVALRY.moveGapMin
    }
    // Moles lose cover over time.
    if (st.mole) {
      st.mole.cover -= RIVALRY.moleCoverPerMin / 60
      if (st.mole.cover <= 0) moleCaught(s, def.id)
    }
  }
}

import { cashLabel } from '@/shared/bn'
import { JUDGES, JUDGE_BY_ID, LAWYERS, SUIT_BY_ID, SUIT_KINDS, YOUR_SUITS, type SuitKind } from '../../content/corp/legal'
import { RIVAL_BY_ID, type RivalId } from '../../content/rivals'
import { LAW } from '../balance'
import { log } from '../helpers'
import type { GameState } from '../state'
import { corpOf, cpick, crand, round2, salesRate } from './core'
import { shockTicker } from './market'
import { addGrudge, ceoPeek, rivalActive, spySuers, suers } from './rivalry'
import { insurePays } from './treasury'
import type { SuitState } from './types'

const CUSTOMERS = ['Mrs. Abernathy', 'Gary Pruitt', 'A man named Todd', 'The Whitlock twins', 'Professor Lumm', 'Ms. Ferraro']

export function suitKind(id: string): SuitKind | undefined {
  return SUIT_BY_ID[id] ?? YOUR_SUITS.find((k) => k.id === id)
}

export function byName(by: string): string {
  if (by === 'regulator') return 'The regulator'
  return RIVAL_BY_ID[by as RivalId]?.name ?? by
}

function file(s: GameState, kind: SuitKind, by: string, yours = false): SuitState {
  const c = corpOf(s)
  const suit: SuitState = {
    id: c.nextId++,
    kind: kind.id,
    by,
    yours,
    claim: round2(salesRate(s) * kind.claimSec),
    judge: cpick(s, JUDGES).id,
    lawyer: 0,
    answerBy: s.time + LAW.answerSec,
  }
  c.suits.push(suit)
  return suit
}

/** Rival bosses sue through here (registered as a boss move). */
export function rivalSues(s: GameState, rival: string) {
  const kinds = SUIT_KINDS.filter((k) => k.by === 'rival' && k.id !== 'spying')
  const kind = cpick(s, kinds)
  const suit = file(s, kind, rival)
  log(s, `${byName(rival)} is suing you: “${kind.title}” for ${cashLabel(suit.claim)}. Answer it in the Courthouse.`, 'warn')
}
suers.push(rivalSues)
spySuers.push((s, r) => maybeSpySuit(s, r))

/** A caught mole may come with a lawsuit. */
export function maybeSpySuit(s: GameState, rival: string) {
  if (crand(s) < LAW.moleSuitOdds) {
    const suit = file(s, SUIT_BY_ID.spying!, rival)
    log(s, `${byName(rival)} sues for espionage: ${cashLabel(suit.claim)}.`, 'warn')
  }
}

export function trialOdds(s: GameState, suit: SuitState): number {
  const kind = suitKind(suit.kind)
  const judge = JUDGE_BY_ID[suit.judge]
  let o = (kind?.odds ?? 0.5) + (LAWYERS[suit.lawyer]?.odds ?? 0) + (judge?.lean ?? 0)
  if (judge?.id === 'haddock' && (s.stores?.length ?? 1) > 10) o -= 0.05
  if (judge?.id === 'okoro') o += (LAWYERS[suit.lawyer]?.odds ?? 0) * 0.5
  return Math.max(0.05, Math.min(0.92, o))
}

export function lawyerCost(s: GameState, tier: number) {
  return round2(salesRate(s) * (LAWYERS[tier]?.costSec ?? 0))
}

export function hireLawyer(s: GameState, suitId: number, tier: number) {
  const suit = corpOf(s).suits.find((x) => x.id === suitId)
  if (!suit) return
  const cost = lawyerCost(s, tier)
  s.cash = round2(s.cash - cost)
  suit.lawyer = tier
  log(s, `${LAWYERS[tier]?.name} takes the case.`, 'info')
}

function close(s: GameState, suit: SuitState) {
  const c = corpOf(s)
  c.suits = c.suits.filter((x) => x.id !== suit.id)
}

export function settle(s: GameState, suitId: number) {
  const c = corpOf(s)
  const suit = c.suits.find((x) => x.id === suitId)
  if (!suit) return
  const pay = round2(suit.claim * LAW.settleShare)
  if (suit.yours) {
    // They settle with you.
    s.cash = round2(s.cash + pay)
    log(s, `${byName(suit.by)} settled for ${cashLabel(pay)}.`, 'good')
  } else {
    s.cash = round2(s.cash - pay)
    log(s, `Settled “${suitKind(suit.kind)?.title}” for ${cashLabel(pay)}.`, 'info')
  }
  c.settled += 1
  close(s, suit)
}

export function settleCost(s: GameState, suitId: number) {
  const suit = corpOf(s).suits.find((x) => x.id === suitId)
  return suit && !suit.yours ? round2(suit.claim * LAW.settleShare) : 0
}

function lose(s: GameState, suit: SuitState, mul: number) {
  const c = corpOf(s)
  let pay = round2(suit.claim * mul)
  const back = insurePays(s, 'liability', pay)
  pay = round2(pay - back)
  s.cash = round2(Math.max(0, s.cash - pay))
  s.brand = Math.max(0, s.brand - LAW.loseBrand)
  c.suitsLost += 1
  return pay
}

export function goToTrial(s: GameState, suitId: number) {
  const c = corpOf(s)
  const suit = c.suits.find((x) => x.id === suitId)
  if (!suit) return
  const odds = trialOdds(s, suit)
  const judge = JUDGE_BY_ID[suit.judge]
  const kind = suitKind(suit.kind)
  const win = crand(s) < odds
  if (suit.yours) {
    if (win) {
      const got = round2(suit.claim)
      s.cash = round2(s.cash + got)
      c.suitsWon += 1
      addGrudge(s, suit.by, 20)
      shockTicker(s, suit.by, 0.9, `${byName(suit.by)} loses in court.`)
      log(s, `${judge?.name} rules for you: ${byName(suit.by)} pays ${cashLabel(got)}.`, 'good')
    } else {
      const costs = round2(suit.claim * 0.2)
      s.cash = round2(Math.max(0, s.cash - costs))
      c.suitsLost += 1
      log(s, `${judge?.name} throws out your suit. Court costs ${cashLabel(costs)}.`, 'warn')
    }
  } else if (win) {
    const got = round2(suit.claim * LAW.winShare)
    s.cash = round2(s.cash + got)
    c.suitsWon += 1
    log(s, `${judge?.name} rules for you in “${kind?.title}”. ${byName(suit.by)} pays your costs: ${cashLabel(got)}.`, 'good')
  } else {
    const paid = lose(s, suit, 1)
    log(s, `${judge?.name} rules against you in “${kind?.title}”. You pay ${cashLabel(paid)}.`, 'warn')
  }
  close(s, suit)
}

export function canSue(s: GameState, rival: string): string | null {
  if (!rivalActive(s, rival)) return 'Not a live rival.'
  if (ceoPeek(s, rival).grudge < LAW.sueGrudge) return 'They haven’t done anything to you yet.'
  if (corpOf(s).sueReadyAt > s.time) return 'Your lawyers need a breather.'
  if (corpOf(s).suits.some((x) => x.yours && x.by === rival)) return 'Already in court with them.'
  return null
}

export function sueRival(s: GameState, rival: string) {
  const kind = cpick(s, YOUR_SUITS)
  const suit = file(s, kind, rival, true)
  suit.answerBy = s.time + LAW.answerSec
  corpOf(s).sueReadyAt = s.time + LAW.sueCooldownSec
  addGrudge(s, rival, 10)
  log(s, `You sued ${byName(rival)}: “${kind.title}” for ${cashLabel(suit.claim)}.`, 'info')
}

export function tickCourt(s: GameState) {
  const c = corpOf(s)
  for (const suit of [...c.suits]) {
    if (suit.answerBy > s.time) continue
    if (suit.yours) {
      // Your suit goes to trial on its own when the clock runs out.
      goToTrial(s, suit.id)
    } else {
      const paid = lose(s, suit, LAW.defaultMul)
      log(s, `You never answered “${suitKind(suit.kind)?.title}”. Lost by default: ${cashLabel(paid)}.`, 'warn')
      close(s, suit)
    }
  }
  if (s.era >= LAW.customerEra && s.time >= c.nextCustomerSuitAt) {
    c.nextCustomerSuitAt = s.time + LAW.customerGapSec * (0.6 + crand(s) * 0.8)
    const kind = cpick(
      s,
      SUIT_KINDS.filter((k) => k.by === 'customer'),
    )
    const who = cpick(s, CUSTOMERS)
    const suit = file(s, kind, who)
    log(s, `${who} is suing: “${kind.title}” for ${cashLabel(suit.claim)}.`, 'warn')
  }
}

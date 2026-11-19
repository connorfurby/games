import { cashLabel } from '@/shared/bn'
import { OWNER_BY_ID, OWNERS, PROPOSAL_BY_ID, PROPOSALS, type OwnerLever, type ProposalDef } from '../../content/corp/owners'
import { CO, CORP, CRIME } from '../balance'
import { log } from '../helpers'
import type { GameState } from '../state'
import { crimeOf } from '../systems/crime'
import { cnorm, corpOf, cpick, crand, round2, salesRate } from './core'
import { pushTape } from './market'
import type { CompanyState } from './types'

const N = () => CORP.sharesPerCompany

export function coOf(s: GameState): CompanyState {
  return corpOf(s).co
}

/** What the whole company is worth right now. */
export function valuation(s: GameState): number {
  const co = coOf(s)
  const brand = 0.8 + 0.4 * Math.max(0, Math.min(1, s.brand ?? 0.5))
  const momentum = 1 + CO.streakValue * Math.min(CO.streakCap, co.streak)
  return salesRate(s) * 60 * CO.valMin * brand * momentum * co.walk
}

export function sharePrice(s: GameState): number {
  return valuation(s) / N()
}

export function stakeOf(s: GameState, owner: string): number {
  return (coOf(s).owners[owner] ?? 0) / N()
}

export function yourStake(s: GameState): number {
  return coOf(s).you / N()
}

/** An owner lever summed over every owner, scaled by stake (a 20% stake = the listed value). */
export function ownerLever(s: GameState, lever: OwnerLever): number {
  if (!s.corp) return 0
  let v = 0
  for (const [id, sh] of Object.entries(coOf(s).owners)) {
    const def = OWNER_BY_ID[id]
    const l = def?.levers[lever]
    if (l) v += l * (sh / N() / 0.2)
  }
  return Math.max(-CO.leverCap, Math.min(CO.leverCap * 3, v))
}

export function alleyVetoed(s: GameState): string | null {
  if (!s.corp) return null
  for (const [id, sh] of Object.entries(coOf(s).owners)) {
    if (OWNER_BY_ID[id]?.vetoesAlley && sh >= N() * 0.1) return `${OWNER_BY_ID[id].name} owns ${Math.round((sh / N()) * 100)}% and forbids it.`
  }
  return null
}

function addBoost(s: GameState, kind: 'demand' | 'wages' | 'ventures', mul: number, sec: number, label: string) {
  corpOf(s).boosts.push({ kind, mul, until: s.time + sec, label })
}

// ── Investors ────────────────────────────────────────────────────────────

function eligibleOwners(s: GameState) {
  return OWNERS.filter((o) => s.era >= o.era)
}

export function sellableShares(s: GameState): number {
  return Math.max(0, coOf(s).you - Math.ceil(N() * CO.minYou))
}

export function acceptOffer(s: GameState) {
  const co = coOf(s)
  const o = co.offer
  if (!o) return
  const n = Math.min(o.shares, sellableShares(s))
  const pay = round2(n * o.price)
  co.you -= n
  co.owners[o.owner] = (co.owners[o.owner] ?? 0) + n
  co.raised = round2(co.raised + pay)
  s.cash = round2(s.cash + pay)
  co.offer = null
  co.nextOfferAt = s.time + CO.offerGapSec
  const def = OWNER_BY_ID[o.owner]
  log(s, `${def?.name ?? 'An investor'} bought ${((n / N()) * 100).toFixed(1)}% of the company for ${cashLabel(pay)}.`, 'good')
}

export function declineOffer(s: GameState) {
  const co = coOf(s)
  co.offer = null
  co.nextOfferAt = s.time + CO.offerGapSec
}

export function ownerBuyoutCost(s: GameState, owner: string): number {
  const sh = coOf(s).owners[owner] ?? 0
  return round2(sh * sharePrice(s) * (1 + (OWNER_BY_ID[owner]?.buyoutPremium ?? 0.1)))
}

export function buyOutOwner(s: GameState, owner: string) {
  const co = coOf(s)
  const sh = co.owners[owner] ?? 0
  const cost = ownerBuyoutCost(s, owner)
  s.cash = round2(s.cash - cost)
  co.you += sh
  delete co.owners[owner]
  log(s, `You bought ${OWNER_BY_ID[owner]?.name ?? 'an owner'} out for ${cashLabel(cost)}.`, 'good')
}

// ── Listing ──────────────────────────────────────────────────────────────

export function ipoProceeds(s: GameState, pct: number): number {
  const n = Math.min(Math.round(N() * pct), sellableShares(s))
  return round2(n * sharePrice(s) * (1 - CO.ipoDiscount))
}

function startQuarter(s: GameState) {
  const co = coOf(s)
  const base = co.quarter.samples > 0 ? co.quarter.sum / co.quarter.samples : salesRate(s)
  const g = Math.max(0.02, CO.targetGrowth + co.promise + ownerLever(s, 'quarterTarget') * CO.targetGrowth)
  co.quarter = { n: co.quarter.n + 1, endsAt: s.time + CO.quarterSec, base, sum: 0, samples: 0, target: base * (1 + g) }
  co.promise = 0
}

export function goPublic(s: GameState, pct: number) {
  const co = coOf(s)
  const n = Math.min(Math.round(N() * pct), sellableShares(s))
  const pay = round2(n * sharePrice(s) * (1 - CO.ipoDiscount))
  co.you -= n
  co.float += n
  co.listed = true
  co.raised = round2(co.raised + pay)
  s.cash = round2(s.cash + pay)
  co.quarter.sum = 0
  co.quarter.samples = 0
  startQuarter(s)
  co.nextVoteAt = s.time + CO.voteGapSec / 2
  pushTape(s, `${s.storeName || 'Your store'} rings the opening bell!`, true)
  log(s, `You went public: ${Math.round((n / N()) * 100)}% sold for ${cashLabel(pay)}. Quarterly targets start now.`, 'era')
}

export function buybackCost(s: GameState): number {
  const n = Math.min(coOf(s).float, Math.round(N() * CO.buybackPct))
  return round2(n * sharePrice(s) * (1 + CO.buybackPremium))
}

export function buyback(s: GameState) {
  const co = coOf(s)
  const n = Math.min(co.float, Math.round(N() * CO.buybackPct))
  const cost = buybackCost(s)
  s.cash = round2(s.cash - cost)
  co.float -= n
  co.you += n
  co.walk = Math.min(CORP.walkMax, co.walk * 1.03)
  log(s, `Bought back ${n} shares for ${cashLabel(cost)}. You own ${Math.round(yourStake(s) * 100)}%.`, 'good')
}

export function issueProceeds(s: GameState): number {
  const n = Math.min(Math.round(N() * CO.issuePct), sellableShares(s))
  return round2(n * sharePrice(s) * (1 - CO.issueDiscount))
}

export function issueShares(s: GameState) {
  const co = coOf(s)
  const n = Math.min(Math.round(N() * CO.issuePct), sellableShares(s))
  const pay = issueProceeds(s)
  co.you -= n
  co.float += n
  co.walk = Math.max(CORP.walkMin, co.walk * 0.98)
  co.raised = round2(co.raised + pay)
  s.cash = round2(s.cash + pay)
  log(s, `Sold ${n} more shares to the public for ${cashLabel(pay)}.`, 'good')
}

export function goPrivateCost(s: GameState): number {
  return round2(coOf(s).float * sharePrice(s) * (1 + CO.privatePremium))
}

export function goPrivate(s: GameState) {
  const co = coOf(s)
  const cost = goPrivateCost(s)
  s.cash = round2(s.cash - cost)
  co.you += co.float
  co.float = 0
  co.listed = false
  co.meeting = null
  log(s, `You took the company private for ${cashLabel(cost)}. No more quarterly targets.`, 'era')
}

// ── Shareholder meeting ──────────────────────────────────────────────────

export type MeetingChoice = 'cuts' | 'buyback' | 'promise' | 'apology'

export function meetingCost(s: GameState, choice: MeetingChoice): number {
  return choice === 'buyback' ? round2(valuation(s) * 0.02) : 0
}

export function resolveMeeting(s: GameState, choice: MeetingChoice) {
  const co = coOf(s)
  if (!co.meeting) return
  if (choice === 'cuts') {
    addBoost(s, 'wages', 0.9, 600, 'Cost cuts')
    s.brand = Math.max(0, s.brand - 0.02)
    co.walk *= 1.05
    log(s, 'Shareholders cheer the cost cuts. The crew does not.', 'info')
  } else if (choice === 'buyback') {
    const cost = meetingCost(s, 'buyback')
    s.cash = round2(s.cash - cost)
    const n = Math.min(co.float, Math.floor(cost / Math.max(1e-9, sharePrice(s))))
    co.float -= n
    co.you += n
    co.walk *= 1.06
    log(s, `A buyback calms the room: ${n} shares back for ${cashLabel(cost)}.`, 'good')
  } else if (choice === 'promise') {
    co.promise += 0.05
    co.walk *= 1.04
    log(s, 'You promise a bigger quarter. The room wants to believe you.', 'info')
  } else {
    s.brand = Math.max(0, s.brand - 0.01)
    co.walk *= 1.02
    log(s, 'A humble apology. Nobody claps, but nobody sells.', 'info')
  }
  co.walk = Math.max(CORP.walkMin, Math.min(CORP.walkMax, co.walk))
  co.meeting = null
}

// ── Board votes ──────────────────────────────────────────────────────────

function ownerYes(def: { lean: Record<string, number> }, p: ProposalDef): boolean {
  let d = 0
  for (const [k, v] of Object.entries(p.leans)) d += (def.lean[k] ?? 0) * (v ?? 0)
  return d > 0
}

/** How every slice votes. `you` is your vote (null = you abstain). */
export function tally(s: GameState, youYes: boolean | null) {
  const co = coOf(s)
  const v = co.vote
  const p = v ? PROPOSAL_BY_ID[v.id] : undefined
  const rows: { who: string; shares: number; yes: boolean | null }[] = []
  if (!p) return { rows, yes: 0, no: 0, pass: false }
  rows.push({ who: 'You', shares: co.you, yes: youYes })
  for (const [id, sh] of Object.entries(co.owners)) {
    const def = OWNER_BY_ID[id]
    if (!def || sh <= 0) continue
    let yes = def.id === 'grudge' && youYes != null ? !youYes : ownerYes(def, p)
    if (v!.lobbied.includes(id)) yes = youYes ?? yes
    rows.push({ who: def.name, shares: sh, yes })
  }
  if (co.float > 0) {
    // The public votes for whatever lifts the price.
    const lifts = p.yes.some((e) => (e.kind === 'price' || e.kind === 'demand') && e.v > 1)
    rows.push({ who: 'The public', shares: co.float, yes: lifts })
  }
  let yes = 0
  let no = 0
  for (const r of rows) {
    if (r.yes === true) yes += r.shares
    else if (r.yes === false) no += r.shares
  }
  return { rows, yes, no, pass: yes > no }
}

export function lobbyCost(s: GameState): number {
  return round2(salesRate(s) * CO.lobbySec)
}

export function lobby(s: GameState, owner: string) {
  const v = coOf(s).vote
  if (!v) return
  s.cash = round2(s.cash - lobbyCost(s))
  v.lobbied.push(owner)
  log(s, `A long lunch with ${OWNER_BY_ID[owner]?.name ?? 'an owner'}. They’ll vote with you.`, 'info')
}

function applyProposal(s: GameState, p: ProposalDef) {
  const co = coOf(s)
  for (const e of p.yes) {
    if (e.kind === 'demand' || e.kind === 'wages' || e.kind === 'ventures') addBoost(s, e.kind, e.v, e.sec ?? 600, p.title)
    else if (e.kind === 'cash') s.cash = round2(Math.max(0, s.cash + e.v * salesRate(s)))
    else if (e.kind === 'brand') s.brand = Math.max(0, Math.min(1, s.brand + e.v))
    else if (e.kind === 'price') co.walk = Math.min(CORP.walkMax, co.walk * e.v)
    else if (e.kind === 'heat') {
      const c = crimeOf(s)
      c.heat = Math.max(0, Math.min(CRIME.heatMax, c.heat + e.v))
    }
  }
}

export function castVote(s: GameState, yes: boolean | null) {
  const co = coOf(s)
  const v = co.vote
  const p = v ? PROPOSAL_BY_ID[v.id] : undefined
  if (!v || !p) return
  const r = tally(s, yes)
  if (r.pass) applyProposal(s, p)
  const youWon = yes == null ? null : yes === r.pass
  if (youWon === true) co.votesWon += 1
  if (youWon === false) co.votesLost += 1
  log(
    s,
    `Board vote — ${p.title}: ${r.pass ? 'passed' : 'failed'} (${Math.round((r.yes / N()) * 100)}% yes).${youWon === false ? ' The board overruled you.' : ''}`,
    youWon === false ? 'warn' : 'info',
  )
  co.lastVote = v.id
  co.vote = null
  co.nextVoteAt = s.time + CO.voteGapSec * (0.7 + crand(s) * 0.6)
}

function hasBoard(s: GameState): boolean {
  const co = coOf(s)
  return co.listed || Object.values(co.owners).some((n) => n > 0)
}

// ── Tick (once a second) ─────────────────────────────────────────────────

export function tickCompany(s: GameState) {
  const c = corpOf(s)
  const co = c.co
  c.boosts = c.boosts.filter((b) => b.until > s.time)
  // The share price wanders, sags while a meeting waits, and keeps a chart.
  co.walk += (CORP.revertPerMin / 60) * (1 - co.walk) + (CO.walkVol / Math.sqrt(60)) * cnorm(s) * co.walk
  if (co.meeting) co.walk *= 1 - CO.meetingSagPerMin / 60
  co.walk = Math.max(CORP.walkMin, Math.min(CORP.walkMax, co.walk))
  co.price = sharePrice(s)
  if (c.clock % CORP.histEverySec === 0) {
    co.hist.push(co.price)
    if (co.hist.length > CORP.histMax) co.hist.splice(0, co.hist.length - CORP.histMax)
  }
  // Owners who sour the brand.
  const drift = ownerLever(s, 'brandDrift')
  if (drift) s.brand = Math.max(0, Math.min(1, s.brand + drift / 60))
  // Chef Rosa walks after a scandal.
  const crime = s.crime
  if (crime && crime.scandalUntil > s.time && crime.scandalUntil !== co.lastScandal) {
    co.lastScandal = crime.scandalUntil
    const sh = co.owners.rosa ?? 0
    if (sh > 0) {
      delete co.owners.rosa
      if (co.listed) co.float += sh
      else co.you += sh
      co.walk *= 0.9
      log(s, 'Chef Rosa saw the headlines and sold every share. “I cannot cook next to this.”', 'warn')
    }
  }
  // Quarters (listed only).
  if (co.listed) {
    co.quarter.sum += salesRate(s)
    co.quarter.samples += 1
    if (s.time >= co.quarter.endsAt) {
      const got = co.quarter.sum / Math.max(1, co.quarter.samples)
      const target = co.quarter.target
      if (got >= target) {
        co.streak += 1
        co.beats += 1
        co.walk = Math.min(CORP.walkMax, co.walk * CO.beatWalk)
        s.brand = Math.min(1, s.brand + 0.01)
        log(s, `Quarter ${co.quarter.n}: beat the target. Shares jump.`, 'good')
        pushTape(s, `${s.storeName || 'Your store'} beats its quarter.`, true)
      } else {
        co.streak = 0
        co.misses += 1
        co.walk = Math.max(CORP.walkMin, co.walk * CO.missWalk)
        co.meeting = { at: s.time, base: co.quarter.base, target, got }
        log(s, `Quarter ${co.quarter.n}: missed the target. The shareholders want a meeting.`, 'warn')
        pushTape(s, `${s.storeName || 'Your store'} misses its quarter.`, false)
      }
      startQuarter(s)
    }
  }
  // Investor offers.
  if (!co.offer && s.lifetimeRevenue >= CO.offerRevenue && s.time >= co.nextOfferAt && sellableShares(s) > 0) {
    const pool = eligibleOwners(s)
    if (pool.length) {
      const def = cpick(s, pool)
      const pct = CO.offerMinPct + crand(s) * (CO.offerMaxPct - CO.offerMinPct)
      const shares = Math.max(1, Math.min(sellableShares(s), Math.round(N() * pct)))
      const premium = CO.offerPremiumMin + crand(s) * (CO.offerPremiumMax - CO.offerPremiumMin)
      co.offer = { owner: def.id, shares, price: sharePrice(s) * (1 + premium), until: s.time + CO.offerWaitSec }
    }
    if (!co.offer) co.nextOfferAt = s.time + CO.offerGapSec
  }
  if (co.offer && co.offer.until <= s.time) declineOffer(s)
  // Board votes.
  if (co.vote && co.vote.until <= s.time) castVote(s, null)
  if (!co.vote && hasBoard(s) && s.time >= co.nextVoteAt) {
    const pool = PROPOSALS.filter((p) => s.era >= p.era && p.id !== co.lastVote)
    if (pool.length) co.vote = { id: cpick(s, pool).id, until: s.time + CO.voteWaitSec, lobbied: [] }
    else co.nextVoteAt = s.time + CO.voteGapSec
  }
}

export function companyBoost(s: GameState, kind: 'demand' | 'wages' | 'ventures'): number {
  if (!s.corp) return 1
  let m = 1
  for (const b of corpOf(s).boosts) if (b.kind === kind && b.until > s.time) m *= b.mul
  return m
}

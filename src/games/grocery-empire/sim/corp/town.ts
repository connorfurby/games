import { CAUSE_BY_ID, CAUSES, OFFICE_BY_ID, OFFICES, OUTLETS, SEGMENTS, UNION_DEMANDS, type CausePerk, type PlatformLever } from '../../content/corp/town'
import { RIVAL_BY_ID, type RivalId } from '../../content/rivals'
import { CRIME, TOWN } from '../balance'
import { log } from '../helpers'
import type { GameState } from '../state'
import { crimeOf } from '../systems/crime'
import { addBoost } from './company'
import { corpOf, crand, round2, salesRate } from './core'
import { pushTape, shockTicker } from './market'
import { addGrudge, rivalActive } from './rivalry'
import { execPower } from './more'
import type { TownState } from './types'

export function townOf(s: GameState): TownState {
  return corpOf(s).town
}

// ── Foundation ───────────────────────────────────────────────────────────

export function causeLevelCost(s: GameState, id: string): number {
  const lvl = townOf(s).causes[id] ?? 0
  return round2(salesRate(s) * TOWN.causeLevelSec * (lvl + 1))
}

/** Perk strength from a cause (0 below level 3, then growing slowly). */
export function causePerk(s: GameState, perk: CausePerk): number {
  if (!s.corp) return 0
  let v = 0
  for (const def of CAUSES) {
    if (def.perk !== perk) continue
    const lvl = s.corp.town.causes[def.id] ?? 0
    if (lvl >= TOWN.perkAt) v += def.perkSize * (1 + (lvl - TOWN.perkAt) * 0.25)
  }
  return v
}

export function donate(s: GameState, cause: string, sec: number) {
  const t = townOf(s)
  const amount = round2(salesRate(s) * sec)
  s.cash = round2(s.cash - amount)
  t.donated = round2(t.donated + amount)
  t.goodwill += sec * TOWN.goodwillPerSec
  t.causeGiven[cause] = round2((t.causeGiven[cause] ?? 0) + amount)
  // Level up while the gift covers it.
  let lvl = t.causes[cause] ?? 0
  while (lvl < TOWN.causeMax && (t.causeGiven[cause] ?? 0) >= levelThreshold(s, lvl + 1)) lvl += 1
  if (lvl > (t.causes[cause] ?? 0)) {
    t.causes[cause] = lvl
    const def = CAUSE_BY_ID[cause]
    log(s, `${def?.name} reaches level ${lvl}.${lvl === TOWN.perkAt ? ` ${def?.perkText}.` : ''}`, 'good')
  }
  const crime = crimeOf(s)
  crime.heat = Math.max(0, crime.heat - sec * 0.02)
}

/** Total given to reach a level (in today's sales). */
export function levelThreshold(s: GameState, lvl: number): number {
  return salesRate(s) * TOWN.causeLevelSec * ((lvl * (lvl + 1)) / 2)
}

export function goodwillDemand(s: GameState): number {
  if (!s.corp) return 0
  return Math.min(TOWN.goodwillDemandCap, s.corp.town.goodwill * TOWN.goodwillDemand)
}

/** Character witnesses: goodwill buys a softer sentence. Returns true if it was used. */
export function callWitnesses(s: GameState): boolean {
  if (!s.corp) return false
  const t = s.corp.town
  if (t.goodwill < TOWN.witnessCost) return false
  t.goodwill -= TOWN.witnessCost
  t.witnesses += 1
  return true
}

// ── City hall ────────────────────────────────────────────────────────────

function nextOffice(s: GameState) {
  const t = townOf(s)
  // The highest open office whose term has run out (or never been filled).
  const open = OFFICES.filter((o) => s.era >= o.era && (t.officeHolders[o.id]?.until ?? 0) <= s.time)
  return open[open.length - 1] ?? null
}

export function startElection(s: GameState) {
  const t = townOf(s)
  const office = nextOffice(s)
  if (!office) return
  t.election = { office: office.id, dayAt: s.time + TOWN.campaignSec, sway: {}, backed: {} }
  log(s, `The race for ${office.title} is on. Election day in ${TOWN.campaignSec / 60} minutes.`, 'info')
}

export function voteShare(s: GameState): Record<string, number> {
  const t = townOf(s)
  const e = t.election
  if (!e) return {}
  const office = OFFICE_BY_ID[e.office]!
  const raw: Record<string, number> = {}
  for (const c of office.candidates) raw[c.id] = Math.max(0.02, c.base + (e.sway[c.id] ?? 0))
  const sum = Object.values(raw).reduce((a, b) => a + b, 0)
  for (const k of Object.keys(raw)) raw[k] = raw[k]! / sum
  return raw
}

export function backCandidate(s: GameState, cand: string, mins: number) {
  const e = townOf(s).election
  if (!e) return
  const cost = round2(salesRate(s) * 60 * mins)
  s.cash = round2(s.cash - cost)
  e.sway[cand] = Math.min(TOWN.swayCap, (e.sway[cand] ?? 0) + mins * TOWN.donationSwayPerMin)
  e.backed[cand] = round2((e.backed[cand] ?? 0) + cost)
}

function electionDay(s: GameState) {
  const t = townOf(s)
  const e = t.election!
  const office = OFFICE_BY_ID[e.office]!
  const share = voteShare(s)
  let r = crand(s)
  let winner = office.candidates[0]!.id
  for (const c of office.candidates) {
    r -= share[c.id] ?? 0
    if (r <= 0) {
      winner = c.id
      break
    }
  }
  const def = office.candidates.find((c) => c.id === winner)!
  t.officeHolders[office.id] = { cand: winner, until: s.time + TOWN.termSec }
  const backedWinner = (e.backed[winner] ?? 0) > 0
  const backedLoser = Object.entries(e.backed).some(([k, v]) => k !== winner && v > 0)
  if (backedWinner) {
    t.favors += TOWN.favorsPerWin
    t.wins += 1
  } else if (backedLoser) {
    const c = crimeOf(s)
    c.heat = Math.min(CRIME.heatMax, c.heat + TOWN.loserGrudgeHeat)
  }
  pushTape(s, `${def.name} wins the race for ${office.title}.`, true)
  log(
    s,
    `${def.name} is the new ${office.title}: “${def.platform}”${backedWinner ? ` They owe you ${TOWN.favorsPerWin} favours.` : backedLoser ? ' They remember who you backed. Heat rises.' : ''}`,
    'era',
  )
  t.election = null
}

/** A sitting office-holder's lever, summed across offices. */
export function officeLever(s: GameState, lever: PlatformLever): number {
  if (!s.corp) return 0
  let v = 0
  for (const [office, h] of Object.entries(s.corp.town.officeHolders)) {
    if (h.until <= s.time) continue
    const c = OFFICE_BY_ID[office]?.candidates.find((x) => x.id === h.cand)
    v += c?.levers[lever] ?? 0
  }
  return v
}

export function callFavor(s: GameState, id: string) {
  const t = townOf(s)
  t.favors -= 1
  if (id === 'zoning') addBoost(s, 'demand', 1.06, 600, 'Zoning favour')
  else if (id === 'permits') addBoost(s, 'ventures', 1.3, 600, 'Fast-tracked permits')
  else {
    const c = crimeOf(s)
    c.heat = Math.max(0, c.heat - 30)
  }
  log(s, 'A favour, quietly called in.', 'info')
}

// ── Union ────────────────────────────────────────────────────────────────

export function answerUnion(s: GameState, accept: boolean) {
  const u = townOf(s).union
  const d = u.demand
  if (!d) return
  const def = UNION_DEMANDS.find((x) => x.id === d.id)
  if (accept) {
    u[d.id as 'pay' | 'benefits' | 'hours'] += 1
    u.refusals = 0
    log(s, `You signed: ${def?.title}. The crew cheers.`, 'good')
  } else {
    u.refusals += 1
    // A good Head of People can talk them down once.
    if (u.refusals >= TOWN.strikeAfterRefusals && crand(s) < execPower(s, 'hr')) {
      u.refusals = 0
      log(s, 'Your Head of People talked the union out of a strike.', 'good')
    } else if (u.refusals >= TOWN.strikeAfterRefusals) {
      u.strikeUntil = s.time + TOWN.strikeSec
      u.refusals = 0
      log(s, 'STRIKE! The crew walks out. Only the regulars get served.', 'warn')
    } else {
      log(s, `You turned down “${def?.title}”. The union is not happy.`, 'warn')
    }
  }
  u.demand = null
  u.nextDemandAt = s.time + TOWN.demandGapSec
}

export function endStrike(s: GameState) {
  const u = townOf(s).union
  u.strikeUntil = 0
  u.pay += 1
  log(s, 'You gave in on pay. The strike is over.', 'good')
}

export function unionLever(s: GameState, kind: 'demand' | 'wages'): number {
  if (!s.corp) return 0
  const u = s.corp.town.union
  if (kind === 'wages') return u.pay * 0.05 + u.benefits * 0.03 - u.hours * 0.03
  return u.pay * 0.025 + u.benefits * 0.015 + u.hours * 0.02
}

// ── Press ────────────────────────────────────────────────────────────────

export function outletCost(s: GameState, id: string): number {
  const o = OUTLETS.find((x) => x.id === id)
  return o ? round2(salesRate(s) * 60 * o.costMin) : 0
}

export function buyOutlet(s: GameState, id: string) {
  const t = townOf(s)
  s.cash = round2(s.cash - outletCost(s, id))
  t.outlets.push(id)
  log(s, `You own ${OUTLETS.find((x) => x.id === id)?.name} now. The news has a new owner.`, 'era')
}

export function pressReach(s: GameState): number {
  if (!s.corp) return 0
  return s.corp.town.outlets.reduce((a, id) => a + (OUTLETS.find((o) => o.id === id)?.reach ?? 0), 0)
}

function credMul(s: GameState) {
  return 0.4 + 0.6 * (townOf(s).cred / TOWN.credMax)
}

export function spin(s: GameState, kind: string, target?: string) {
  const t = townOf(s)
  const power = credMul(s) * (1 + 0.25 * (t.outlets.length - 1))
  const crime = crimeOf(s)
  if (kind === 'puff') {
    addBoost(s, 'demand', 1 + TOWN.puffDemandPer * power, TOWN.puffSec, 'A glowing story about you')
    log(s, 'A glowing profile runs everywhere you own. Shoppers come to see.', 'good')
  } else if (kind === 'attack' && target) {
    shockTicker(s, target, 1 - (1 - TOWN.attackStock) * power, `${RIVAL_BY_ID[target as RivalId]?.name} slammed in the press.`)
    const r = s.rivals?.[target]
    if (r) r.frozenUntil = Math.max(r.frozenUntil, s.time + TOWN.attackFreezeSec)
    addGrudge(s, target, 15)
  } else if (kind === 'bury') {
    crime.scandalUntil = Math.min(crime.scandalUntil, s.time)
    crime.heat = Math.max(0, crime.heat - 20)
    log(s, 'The story gets buried on page 40, under the crossword.', 'good')
  } else if (kind === 'pump' && target) {
    shockTicker(s, target, 1 + (TOWN.pumpStock - 1) * power, `Your outlets can’t stop talking about ${target.toUpperCase()}.`)
    crime.heat = Math.min(CRIME.heatMax, crime.heat + TOWN.pumpHeat)
  } else if (kind === 'endorse' && target) {
    const e = t.election
    if (e) e.sway[target] = Math.min(TOWN.swayCap, (e.sway[target] ?? 0) + TOWN.endorseSway * power)
    log(s, 'Your outlets endorse a candidate. Very neutrally.', 'info')
  }
  const cost = { puff: 10, attack: 15, bury: 20, pump: 15, endorse: 10 }[kind] ?? 10
  t.cred = Math.max(0, t.cred - cost)
  t.spinReadyAt = s.time + TOWN.spinCooldownSec
}

// ── Customers ────────────────────────────────────────────────────────────

export function openSegments(s: GameState) {
  return SEGMENTS.filter((x) => s.era >= x.era)
}

/** How well the store fits a segment right now (0–100). */
export function segmentFit(s: GameState, id: string): number {
  const def = SEGMENTS.find((x) => x.id === id)
  if (!def) return 50
  // Cheap (−1) to premium (+1): how far your price sits from the reference.
  const ref = 1.5 * Math.pow(1.6, Math.max(0, s.era))
  const pos = Math.max(-1, Math.min(1, Math.log((s.price || ref) / ref) / Math.log(2)))
  const priceFit = 1 - Math.abs(pos - def.price) / 2
  const has = def.aisles.filter((a) => (s.categories as Record<string, boolean>)[a]).length
  const aisleFit = def.aisles.length ? has / def.aisles.length : 1
  let extra = 0
  if (id === 'nightowls' || id === 'students') extra += Math.max(0, Math.min(0.2, ((s.hours ?? 1) - 1) * 0.4))
  if (id === 'seniors') extra += (townOf(s).causes.library ?? 0) * 0.03
  if (id === 'families') extra += (townOf(s).causes.gardens ?? 0) * 0.03
  if (id === 'foodies') extra += Math.max(0, (s.brand ?? 0.5) - 0.5) * 0.4
  if (id === 'students' && (s.ventures?.coffee?.level ?? 0) > 0) extra += 0.1
  return Math.max(0, Math.min(100, (priceFit * 0.5 + aisleFit * 0.5 + extra) * 100))
}

export function segmentShares(s: GameState): Record<string, number> {
  const open = openSegments(s)
  const sum = open.reduce((a, x) => a + x.weight, 0)
  const out: Record<string, number> = {}
  for (const x of open) out[x.id] = x.weight / sum
  return out
}

export function segmentDemand(s: GameState): number {
  if (!s.corp?.town.segmentsOn) return 0
  const t = s.corp.town
  const share = segmentShares(s)
  let v = 0
  for (const [id, sh] of Object.entries(share)) v += sh * (((t.loyalty[id] ?? TOWN.loyaltyStart) - 50) / TOWN.loyaltyDiv)
  if (t.focus) v += TOWN.focusDemand * (share[t.focus] ?? 0) * 4
  return v
}

export function setFocus(s: GameState, id: string | null) {
  const t = townOf(s)
  t.segmentsOn = true
  t.focus = id
}

// ── Tick ─────────────────────────────────────────────────────────────────

export function tickTown(s: GameState) {
  const c = corpOf(s)
  const t = c.town
  // Goodwill fades slowly; big givers win awards.
  if (t.goodwill > 0) t.goodwill *= 1 - TOWN.goodwillDecayPerMin / 60
  if (s.time >= t.nextAwardAt) {
    t.nextAwardAt = s.time + TOWN.awardEverySec
    if (t.goodwill >= TOWN.awardGoodwill) {
      t.awards += 1
      s.brand = Math.min(1, s.brand + 0.02)
      pushTape(s, `${s.storeName || 'Your store'} wins the Golden Basket for giving.`, true)
      log(s, 'You won the Golden Basket award for community giving. Brand up.', 'good')
    }
  }
  const brandDrip = causePerk(s, 'brand')
  if (brandDrip) s.brand = Math.min(1, s.brand + brandDrip / 60)
  // Elections run once you've opened a campaign office.
  if (t.election && s.time >= t.election.dayAt) electionDay(s)
  // The union forms once the crew is big enough; its demands wait for you.
  const u = t.union
  if (!u.formed && s.era >= TOWN.unionEra && (s.staff?.length ?? 0) >= TOWN.unionStaff) {
    u.formed = true
    u.nextDemandAt = s.time + 120
    log(s, 'Your crew formed a union. They’ll bring their demands to the Union Hall.', 'story')
  }
  if (u.formed && !u.demand && u.strikeUntil <= s.time && s.time >= u.nextDemandAt) {
    const open = UNION_DEMANDS.filter((d) => u[d.id] < 3)
    if (open.length) u.demand = { id: open[Math.floor(crand(s) * open.length) % open.length]!.id, until: s.time + TOWN.demandWaitSec }
    else u.nextDemandAt = s.time + TOWN.demandGapSec
  }
  // An unanswered demand just goes back in the drawer.
  if (u.demand && u.demand.until <= s.time) {
    u.demand = null
    u.nextDemandAt = s.time + TOWN.demandGapSec
  }
  // The press regains its credibility.
  if (t.cred < TOWN.credMax) t.cred = Math.min(TOWN.credMax, t.cred + (TOWN.credRegenPerMin * (1 + execPower(s, 'cmo') * 10)) / 60)
  // Customers drift toward how well you fit them (only once you start watching them).
  if (t.segmentsOn) {
    for (const x of openSegments(s)) {
      const fit = segmentFit(s, x.id)
      const cur = t.loyalty[x.id] ?? TOWN.loyaltyStart
      const pull = (TOWN.loyaltyPull / 60) * (t.focus === x.id ? TOWN.focusPull : 1)
      t.loyalty[x.id] = cur + (fit - cur) * pull
    }
  }
}

export function strikeMul(s: GameState): number {
  return s.corp && s.corp.town.union.strikeUntil > s.time ? TOWN.strikeDemand : 1
}

export { rivalActive }

import { cashLabel } from '@/shared/bn'
import { CATEGORY_IDS } from '../../content/categories'
import { PUNISHMENTS, SCHEME_BY_ID, SCHEMES, type PunishmentId, type SchemeDef } from '../../content/crime'
import { VENTURE_BY_ID, ventureIncome } from '../../content/ventures'
import { CRIME } from '../balance'
import { backroomCap } from '../formulas'
import { addBatch, log, round2, sumQty } from '../helpers'
import { nextRng } from '../rng'
import { emptyCrime, type GameState } from '../state'
import { alleyVetoed } from '../corp/company'
import { corpHeatCoolMul } from '../corp/effects'

/**
 * The Back Alley. Optional schemes pay now and add Heat; Heat cools over time. Pulling a scheme
 * rolls the catch odds; above raidHeat a surprise raid can also come. Punishments escalate with
 * Heat: warning → fine → padlock → scandal / frozen tills / probation.
 */

export function crimeOf(s: GameState) {
  if (!s.crime) s.crime = emptyCrime()
  return s.crime
}

export function alleyOpen(s: GameState): boolean {
  return s.era >= 2 || Object.values(s.ventures).some((v) => v.level > 0)
}

export function schemeAvailable(s: GameState, def: SchemeDef): boolean {
  return s.era >= def.era && (def.available ? def.available(s) : true)
}

export function visibleSchemes(s: GameState): SchemeDef[] {
  return SCHEMES.filter((d) => s.era >= d.era)
}

/** Odds of being caught if you pull this scheme now. */
export function catchOdds(s: GameState, def: SchemeDef): number {
  const c = crimeOf(s)
  return Math.min(CRIME.catchCap, Math.max(0, (c.heat + def.heat * 0.5) / CRIME.catchDiv))
}

const live = (s: GameState, until: number | undefined) => (until ?? 0) > s.time

/** Demand from running schemes, a padlock or a scandal. */
export function crimeDemandMul(s: GameState): number {
  const c = s.crime
  if (!c) return 1
  let m = 1
  for (const [id, until] of Object.entries(c.active)) {
    if (until <= s.time) continue
    const e = SCHEME_BY_ID[id]?.effect
    if (e && (e.kind === 'demand' || e.kind === 'rival')) m *= e.mul
  }
  if (live(s, c.padlockUntil)) m *= CRIME.padlockDemandMul
  if (live(s, c.scandalUntil)) m *= CRIME.scandalDemandMul
  return m
}

export function crimeWageMul(s: GameState): number {
  const c = s.crime
  if (!c) return 1
  let m = 1
  for (const [id, until] of Object.entries(c.active)) {
    const e = SCHEME_BY_ID[id]?.effect
    if (until > s.time && e?.kind === 'wages') m *= e.mul
  }
  return m
}

/** Venture till speed: 0 while frozen, boosted by venture schemes. */
export function crimeVentureMul(s: GameState): number {
  const c = s.crime
  if (!c) return 1
  if (live(s, c.frozenUntil)) return 0
  let m = 1
  for (const [id, until] of Object.entries(c.active)) {
    const e = SCHEME_BY_ID[id]?.effect
    if (until > s.time && e?.kind === 'ventures') m *= e.mul
  }
  return m
}

function revenueRate(s: GameState) {
  return Math.max(0.05, s.rates?.revenuePerSec ?? 0)
}

function fineFor(s: GameState, sec: number) {
  const want = Math.max(CRIME.fineMinCash, revenueRate(s) * sec)
  return round2(Math.min(want, Math.max(0, s.cash) * CRIME.fineCashCap))
}

function record(s: GameState, scheme: string, outcome: string, fine: number) {
  const c = crimeOf(s)
  c.sheet.push({ t: s.time, scheme, outcome, fine })
  if (c.sheet.length > CRIME.sheetCap) c.sheet.splice(0, c.sheet.length - CRIME.sheetCap)
}

/** Getting caught. Returns the punishment handed down. */
export function punish(s: GameState, schemeId: string | null): PunishmentId {
  const c = crimeOf(s)
  const h = c.heat
  let p: PunishmentId
  let sec: number
  if (h < CRIME.warningBelow) {
    p = 'warning'
    sec = CRIME.fineSec.warning
  } else if (h < CRIME.fineBelow) {
    p = 'fine'
    sec = CRIME.fineSec.fine
  } else if (h < CRIME.padlockBelow) {
    p = 'padlock'
    sec = CRIME.fineSec.padlock
  } else {
    const roll = nextRng(s)
    p = roll < 0.34 ? 'scandal' : roll < 0.67 ? 'frozen' : 'probation'
    sec = CRIME.fineSec.severe
  }
  const fine = fineFor(s, sec)
  s.cash = round2(s.cash - fine)
  c.finesPaid = round2(c.finesPaid + fine)
  c.caught += 1
  if (schemeId && p !== 'warning') delete c.active[schemeId]
  if (p === 'padlock') c.padlockUntil = s.time + CRIME.padlockSec
  if (p === 'scandal') {
    c.scandalUntil = s.time + CRIME.scandalSec
    s.brand = Math.max(0, s.brand - CRIME.scandalBrandHit)
  }
  if (p === 'frozen') c.frozenUntil = s.time + CRIME.frozenSec
  if (p === 'probation') c.probationUntil = s.time + CRIME.probationSec
  c.heat = Math.min(CRIME.heatMax, c.heat + CRIME.caughtHeat)
  const what = schemeId ? SCHEME_BY_ID[schemeId]?.name ?? 'a scheme' : 'a surprise raid'
  log(s, `Caught: ${what}. ${PUNISHMENTS[p].name} — ${PUNISHMENTS[p].line} Fine ${cashLabel(fine)}.`, 'warn')
  record(s, schemeId ?? 'raid', p, fine)
  return p
}

function applyEffect(s: GameState, def: SchemeDef): string {
  const c = crimeOf(s)
  const e = def.effect
  switch (e.kind) {
    case 'demand':
    case 'wages':
    case 'ventures':
      c.active[def.id] = s.time + e.sec
      return def.pays
    case 'rival':
      s.events.rival = { ...s.events.rival, kind: null, endsAt: s.time }
      c.active[def.id] = s.time + e.sec
      return def.pays
    case 'cash': {
      const got = round2(revenueRate(s) * e.revenueSec)
      s.cash = round2(s.cash + got)
      return `+${cashLabel(got)}`
    }
    case 'stock': {
      const cats = CATEGORY_IDS.filter((k) => s.categories[k])
      const room = Math.max(0, backroomCap(s) - sumQty(s.backroom))
      const total = Math.floor(room * e.capShare)
      if (total > 0 && cats.length) {
        const each = Math.max(1, Math.floor(total / cats.length))
        for (const k of cats) addBatch(s.backroom, k, each, 0)
      }
      return `+${total} units in the backroom`
    }
    case 'tills': {
      let n = 0
      for (const [id, vs] of Object.entries(s.ventures)) {
        const v = VENTURE_BY_ID[id]
        if (!v || vs.level <= 0) continue
        vs.stored = Math.max(vs.stored, ventureIncome(v, vs.level) * v.storeSec)
        n += 1
      }
      return `${n} tills topped up`
    }
  }
}

export type SchemeResult = { caught: boolean; punishment?: PunishmentId; paid?: string }

export function pullScheme(s: GameState, id: string): SchemeResult {
  const c = crimeOf(s)
  const def = SCHEME_BY_ID[id]
  const odds = catchOdds(s, def)
  c.heat = Math.min(CRIME.heatMax, c.heat + def.heat)
  c.cooldowns[id] = s.time + def.cooldownSec
  c.pulled += 1
  if (nextRng(s) < odds) {
    // Caught red-handed: the payoff never lands.
    return { caught: true, punishment: punish(s, id) }
  }
  const paid = applyEffect(s, def)
  record(s, id, 'clean', 0)
  log(s, `${def.name}: got away with it. ${paid}.`, 'good')
  return { caught: false, paid }
}

export function bribeCost(s: GameState) {
  return round2(Math.max(10, revenueRate(s) * CRIME.bribeSec))
}

export function bribeInspector(s: GameState) {
  const c = crimeOf(s)
  const cost = bribeCost(s)
  s.cash = round2(s.cash - cost)
  c.bribeReadyAt = s.time + CRIME.bribeCooldownSec
  if (nextRng(s) < CRIME.bribeBackfire) {
    c.heat = Math.min(CRIME.heatMax, c.heat + CRIME.bribeBackfireHeat)
    log(s, 'The inspector took the envelope — and wrote it down. Heat went up.', 'warn')
    record(s, 'bribe', 'backfire', cost)
    return false
  }
  c.heat = Math.max(0, c.heat - CRIME.bribeHeatCut)
  log(s, 'An envelope changed hands. The inspector forgot your address.', 'good')
  return true
}

export function lieLow(s: GameState) {
  const c = crimeOf(s)
  c.lieLowUntil = s.time + CRIME.lieLowSec
  log(s, 'Lying low: blinds down, receipts in order. Heat cools three times as fast.', 'info')
}

export function tickCrime(s: GameState, dt: number) {
  const c = crimeOf(s)
  const cool = CRIME.coolPerSec * (c.lieLowUntil > s.time ? CRIME.lieLowMul : 1) * corpHeatCoolMul(s)
  if (c.heat > 0) c.heat = Math.max(0, c.heat - cool * dt)
  for (const [id, until] of Object.entries(c.active)) if (until <= s.time) delete c.active[id]
  // Too hot: the law can drop by on its own. Lying low keeps the door shut.
  if (c.heat >= CRIME.raidHeat && c.lieLowUntil <= s.time && nextRng(s) < CRIME.raidPerSec * dt) {
    punish(s, null)
  }
}

export function alleyBlock(s: GameState): string | null {
  const c = crimeOf(s)
  if (!alleyOpen(s)) return 'The alley opens with your first venture.'
  if (c.probationUntil > s.time) return 'On probation.'
  const veto = alleyVetoed(s)
  if (veto) return veto
  if (c.lieLowUntil > s.time) return 'Lying low.'
  return null
}

import { upgradeEffect } from '../../content/upgrades'
import { cashLabel } from '@/shared/bn'
import {
  CRISES,
  CRISIS_BY_ID,
  EXEC_NAMES,
  EXEC_ROLES,
  EXEC_TRAITS,
  FRANCHISE_TRAITS,
  FRANCHISEE_NAMES,
  INVENTION_BY_ID,
  INVENTIONS,
  LOT_BY_ID,
  LOTS,
  TENANTS,
  type ExecRole,
  type Lever,
} from '../../content/corp/more'
import { CRIME, CRISIS, EXEC, FRANCHISE, LAB, PROPERTY } from '../balance'
import { log } from '../helpers'
import type { GameState } from '../state'
import { crimeOf } from '../systems/crime'
import { addBoost } from './company'
import { corpOf, cpick, crand, round2, salesRate } from './core'
import { pushTape } from './market'
import { causePerk } from './town'
import type { Stage6State } from './types'

export function moreOf(s: GameState): Stage6State {
  return corpOf(s).more
}

// ── Executives (read first: other systems use them) ─────────────────────

export function execPower(s: GameState, role: ExecRole): number {
  const e = s.corp?.more.execs[role]
  if (!e) return 0
  const trait = EXEC_TRAITS.find((t) => t.id === e.trait)
  return EXEC.base[role] * (trait?.power ?? 1) * (1 + EXEC.perLevel * (e.level - 1))
}

export function execSalary(s: GameState, trait: string): number {
  const t = EXEC_TRAITS.find((x) => x.id === trait)
  return round2(salesRate(s) * EXEC.salarySec * (t?.salary ?? 1) * (1 - upgradeEffect(s, 'talent-pipeline')))
}

function refreshPool(s: GameState) {
  const m = moreOf(s)
  const taken = new Set(Object.values(m.execs).map((e) => e?.name))
  m.pool = []
  const roles = EXEC_ROLES.map((r) => r.id).filter((r) => !m.execs[r])
  for (let i = 0; i < EXEC.poolSize && roles.length; i++) {
    const role = roles.splice(Math.floor(crand(s) * roles.length) % roles.length, 1)[0]!
    let name = cpick(s, EXEC_NAMES)
    for (let k = 0; k < 6 && taken.has(name); k++) name = cpick(s, EXEC_NAMES)
    taken.add(name)
    m.pool.push({ role, name, trait: cpick(s, EXEC_TRAITS).id })
  }
  m.nextPoolAt = s.time + EXEC.poolRefreshSec
}

export function hireExec(s: GameState, idx: number) {
  const m = moreOf(s)
  const c = m.pool[idx]
  if (!c) return
  m.execs[c.role] = { name: c.name, trait: c.trait, level: 1, hiredAt: s.time }
  m.pool.splice(idx, 1)
  const title = EXEC_ROLES.find((r) => r.id === c.role)?.title
  log(s, `${c.name} joins as ${title}.`, 'good')
}

export function fireExec(s: GameState, role: string) {
  const m = moreOf(s)
  const e = m.execs[role]
  if (!e) return
  delete m.execs[role]
  log(s, `${e.name} has been let go. They took the good stapler.`, 'info')
}

// ── Lab ──────────────────────────────────────────────────────────────────

export function labSpeed(s: GameState): number {
  return (1 + LAB.speedPerLevel * (moreOf(s).lab.level - 1)) * (1 + causePerk(s, 'research') + execPower(s, 'research') + upgradeEffect(s, 'skunkworks'))
}

export function labLevelCost(s: GameState) {
  return round2(salesRate(s) * LAB.levelCostSec * moreOf(s).lab.level)
}

export function startResearch(s: GameState, id: string) {
  const lab = moreOf(s).lab
  const def = INVENTION_BY_ID[id]!
  s.cash = round2(s.cash - salesRate(s) * def.costSec)
  lab.project = id
  lab.progress = 0
  log(s, `The lab starts work on ${def.name}.`, 'info')
}

export function patentCost(s: GameState) {
  return round2(salesRate(s) * LAB.patentCostSec * ((s.memos['patent-pool'] ?? 0) > 0 ? 0.7 : 1))
}

/** How strong an invention is for you right now (copied or licensed counts half). */
export function inventionShare(s: GameState, id: string): number {
  const inv = s.corp?.more.lab.invented[id]
  if (!inv) return 0
  return inv.copied || inv.licensed ? LAB.licensedShare : 1
}

export function inventionLever(s: GameState, lever: Lever): number {
  if (!s.corp) return 0
  let v = 0
  for (const id of Object.keys(s.corp.more.lab.invented)) {
    const def = INVENTION_BY_ID[id]
    if (def?.lever === lever) v += def.size * inventionShare(s, id)
  }
  return v
}

// ── Property ─────────────────────────────────────────────────────────────

export function lotPrice(s: GameState, id: string): number {
  const def = LOT_BY_ID[id]
  return def ? round2(salesRate(s) * 60 * def.priceMin) : 0
}

export function buyLot(s: GameState, id: string) {
  const m = moreOf(s)
  const price = lotPrice(s, id)
  s.cash = round2(s.cash - price)
  m.lots[id] = { value: price, tenant: null, boughtAt: s.time, paid: price }
  log(s, `You bought ${LOT_BY_ID[id]?.name}.`, 'good')
}

export function sellLot(s: GameState, id: string) {
  const m = moreOf(s)
  const lot = m.lots[id]
  if (!lot) return
  const got = round2(lot.value * (1 - PROPERTY.sellFee))
  s.cash = round2(s.cash + got)
  delete m.lots[id]
  log(s, `Sold ${LOT_BY_ID[id]?.name} for ${cashLabel(got)} (you paid ${cashLabel(lot.paid)}).`, got >= lot.paid ? 'good' : 'info')
}

export function setTenant(s: GameState, id: string, tenant: string | null) {
  const lot = moreOf(s).lots[id]
  if (lot) lot.tenant = tenant
}

export function propertyDemand(s: GameState): number {
  if (!s.corp) return 0
  let v = 0
  for (const [id, lot] of Object.entries(s.corp.more.lots)) {
    v += LOT_BY_ID[id]?.near ?? 0
    v += TENANTS.find((t) => t.id === lot.tenant)?.demand ?? 0
  }
  return Math.max(-0.05, Math.min(PROPERTY.nearCap, v))
}

export function rentPerMin(s: GameState, id: string): number {
  const lot = s.corp?.more.lots[id]
  const def = LOT_BY_ID[id]
  if (!lot || !def) return 0
  const t = TENANTS.find((x) => x.id === lot.tenant)
  return lot.value * def.rentPerMin * (t?.rentMul ?? 0) * (1 + upgradeEffect(s, 'property-managers')) * ((s.memos['standard-lease'] ?? 0) > 0 ? 1.1 : 1)
}

// ── Franchising ──────────────────────────────────────────────────────────

export function franchiseCap(s: GameState): number {
  return Math.min(FRANCHISE.maxTotal, Math.max(0, s.era - 3) * FRANCHISE.perEra)
}

export function franchiseFee(s: GameState) {
  return round2(salesRate(s) * 60 * FRANCHISE.feeMin * (1 + upgradeEffect(s, 'franchise-academy')))
}

export function sellFranchise(s: GameState) {
  const m = moreOf(s)
  const c = corpOf(s)
  const fee = franchiseFee(s)
  const trait = cpick(s, FRANCHISE_TRAITS)
  const used = new Set(m.franchises.map((f) => f.name))
  let name = cpick(s, FRANCHISEE_NAMES)
  for (let k = 0; k < 6 && used.has(name); k++) name = cpick(s, FRANCHISEE_NAMES)
  m.franchises.push({ id: c.nextId++, name, trait: trait.id, quality: 50 + Math.round(crand(s) * 30), openedAt: s.time, paid: 0 })
  s.cash = round2(s.cash + fee)
  log(s, `${name} opened a franchise and paid ${cashLabel(fee)}. (${trait.name}: ${trait.blurb})`, 'good')
}

export function inspectFranchise(s: GameState, id: number) {
  const f = moreOf(s).franchises.find((x) => x.id === id)
  if (!f) return
  s.cash = round2(s.cash - salesRate(s) * FRANCHISE.inspectCostSec)
  f.quality = Math.min(100, f.quality + FRANCHISE.inspectLift)
  log(s, `Inspected ${f.name}’s store. Quality up.`, 'info')
}

export function pullLicense(s: GameState, id: number) {
  const m = moreOf(s)
  const f = m.franchises.find((x) => x.id === id)
  if (!f) return
  m.franchises = m.franchises.filter((x) => x.id !== id)
  log(s, `You pulled ${f.name}’s licence. The sign comes down.`, 'info')
}

// ── Crises ───────────────────────────────────────────────────────────────

/** Crises only find a company in the public eye. */
export function inPublicEye(s: GameState): boolean {
  const c = s.corp
  if (!c) return false
  return c.co.listed || Object.keys(c.co.owners).length > 0 || c.town.outlets.length > 0 || Object.keys(c.more.execs).length > 0
}

function applyOutcome(s: GameState, o: { demand: number; sec: number; brand: number }, label: string) {
  if (o.demand !== 1) addBoost(s, 'demand', o.demand, o.sec, label)
  s.brand = Math.max(0, Math.min(1, s.brand + o.brand))
}

/** Odds an option works, after your marketer and crisis team. */
export function crisisOdds(s: GameState, base: number): number {
  return Math.min(0.97, base + execPower(s, 'cmo') * 0.5 + upgradeEffect(s, 'crisis-pr'))
}

/** What answering a crisis option costs right now. */
export function crisisCost(s: GameState, costSec: number): number {
  return salesRate(s) * costSec * ((s.memos['crisis-playbook'] ?? 0) > 0 ? 0.75 : 1)
}

export function answerCrisis(s: GameState, pick: number) {
  const m = moreOf(s)
  const cur = m.crisis
  const def = cur ? CRISIS_BY_ID[cur.id] : undefined
  if (!def) return
  const o = def.options[pick]!
  s.cash = round2(s.cash - crisisCost(s, o.costSec))
  // A good Head of People or marketer tilts the odds a little.
  const odds = crisisOdds(s, o.odds)
  const win = crand(s) < odds
  applyOutcome(s, win ? o.win : o.lose, def.title)
  m.lastCrisis = { id: def.id, win, pick, t: s.time }
  corpOf(s).co.walk = Math.max(0.35, Math.min(3, corpOf(s).co.walk * (win ? 1.02 : 0.94)))
  if (def.id === 'space-bugs' && pick === 2) {
    const c = crimeOf(s)
    c.heat = Math.min(CRIME.heatMax, c.heat + 20)
  }
  m.crisis = null
  m.crisesHandled += 1
  m.nextCrisisAt = s.time + CRISIS.gapMin + crand(s) * (CRISIS.gapMax - CRISIS.gapMin)
  log(s, `${def.title}: “${o.label}” ${win ? 'worked.' : 'backfired.'}`, win ? 'good' : 'warn')
}

// ── Tick ─────────────────────────────────────────────────────────────────

export function tickMore(s: GameState) {
  const c = corpOf(s)
  const m = c.more
  // Lab.
  const lab = m.lab
  if (lab.project) {
    const def = INVENTION_BY_ID[lab.project]
    if (def) {
      lab.progress += labSpeed(s)
      if (lab.progress >= def.sec) {
        lab.invented[def.id] = { at: s.time, patented: false, licensed: false, copied: false }
        lab.project = null
        lab.progress = 0
        pushTape(s, `${s.storeName || 'Your store'} unveils ${def.name}.`, true)
        corpOf(s).co.walk = Math.min(1.8, corpOf(s).co.walk * 1.04)
        log(s, `Invented: ${def.name}! Patent it before a rival copies it.`, 'era')
      }
    } else lab.project = null
  }
  for (const [id, inv] of Object.entries(lab.invented)) {
    if (!inv.patented && !inv.copied && s.time - inv.at >= LAB.copyAfterSec) {
      inv.copied = true
      log(s, `A rival copied ${INVENTION_BY_ID[id]?.name}. It counts for half now.`, 'warn')
    }
  }
  const everyMin = c.clock % 60 === 0
  if (everyMin) {
    // Licensing royalties.
    for (const [id, inv] of Object.entries(lab.invented)) {
      if (inv.licensed) {
        const pay = round2(salesRate(s) * (INVENTION_BY_ID[id]?.royaltySec ?? 0))
        s.cash = round2(s.cash + pay)
        m.royalties = round2(m.royalties + pay)
      }
    }
    // Property: rent and values.
    for (const [id, lot] of Object.entries(m.lots)) {
      const rent = rentPerMin(s, id)
      if (rent > 0) {
        s.cash = round2(s.cash + rent)
        m.rentEarned = round2(m.rentEarned + rent)
      }
      lot.value = round2(lot.value * (1 + PROPERTY.appreciatePerMin * (0.5 + (s.brand ?? 0.5))))
    }
    // Franchises: royalties, drift, bad ones sour the brand.
    for (const f of m.franchises) {
      const trait = FRANCHISE_TRAITS.find((t) => t.id === f.trait)
      f.quality = Math.max(0, Math.min(100, f.quality + (trait?.drift ?? 0) * FRANCHISE.driftPerMin + (crand(s) - 0.5) * 2))
      const greedy = f.trait === 'greedy' ? 0.6 : 1
      const pay = round2(salesRate(s) * FRANCHISE.royaltySec * (f.quality / 100) * greedy)
      s.cash = round2(s.cash + pay)
      f.paid = round2(f.paid + pay)
      m.royalties = round2(m.royalties + pay)
      if (f.quality < FRANCHISE.badBelow) s.brand = Math.max(0, s.brand - FRANCHISE.brandDrainPerMin)
    }
    // Executives: salaries, experience, and the occasional incident.
    for (const [role, e] of Object.entries(m.execs)) {
      if (!e) continue
      const pay = execSalary(s, e.trait)
      if (s.cash >= pay) s.cash = round2(s.cash - pay)
      else {
        delete m.execs[role]
        log(s, `${e.name} quit: the paycheque bounced.`, 'warn')
        continue
      }
      if (e.level < EXEC.levelMax && s.time - e.hiredAt >= EXEC.levelEverySec * e.level) e.level += 1
      const trait = EXEC_TRAITS.find((t) => t.id === e.trait)
      if ((trait?.risk ?? 0) > 0 && crand(s) < EXEC.incidentPerMin * (trait?.risk ?? 0)) {
        if (e.trait === 'shady') {
          const took = round2(Math.min(Math.max(0, s.cash) * 0.05, salesRate(s) * 120))
          s.cash = round2(s.cash - took)
          log(s, `${e.name} was skimming. ${cashLabel(took)} is gone, and so are they.`, 'warn')
          delete m.execs[role]
        } else {
          addBoost(s, 'demand', 0.95, 180, `${e.name}’s unwise post`)
          s.brand = Math.max(0, s.brand - 0.01)
          log(s, `${e.name} posted something unwise. Shoppers wince.`, 'warn')
        }
      }
    }
  }
  if (s.era >= EXEC.era && s.time >= m.nextPoolAt) refreshPool(s)
  // Crises.
  if (m.crisis && m.crisis.until <= s.time) {
    const def = CRISIS_BY_ID[m.crisis.id]
    if (def) {
      applyOutcome(s, def.ignore, def.title)
      log(s, `${def.title}: you said nothing, and it got worse.`, 'warn')
    }
    m.crisis = null
    m.nextCrisisAt = s.time + CRISIS.gapMin + crand(s) * (CRISIS.gapMax - CRISIS.gapMin)
  }
  if (!m.crisis && inPublicEye(s) && s.time >= m.nextCrisisAt) {
    const pool = CRISES.filter((x) => s.era >= x.era)
    if (pool.length) {
      const def = cpick(s, pool)
      m.crisis = { id: def.id, until: s.time + CRISIS.waitSec }
    }
  }
}

export { INVENTIONS, LOTS }

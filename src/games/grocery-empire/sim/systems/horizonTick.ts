/**
 * Horizon per-tick systems: agents, deputies, seasons, phrases, keel, headlines, trickles, wages.
 * Split out of horizon.ts. Filing verbs (`fileStandard*`, `launchProbe`) and `maybeOpenEras` stay in
 * horizon.ts and are only called at tick time, so the horizon.ts <-> horizonTick.ts cycle is safe.
 */

import {
  HEADLINES,
  SEASON_NAMES,
  STANDARD_SCORE,
  type SeasonIndex,
} from '../../content/horizon'
import { upgradeEffect } from '../../content/upgrades'
import { DEMAND, HORIZON, LATE, PRICE, SHELF, WHOLESALE } from '../balance'
import { log, sumQty } from '../helpers'
import {
  annexPaceMul,
  deputyCooldownMul,
  diplomatEmbassyMul,
  handlerWaitMul,
} from '../staffAnnex'
import { hasFork } from '../ventureForks'
import type { GameState } from '../state'
import { statMul } from './stats'
import { SEED_CAP, ensureHorizon, expectedSeasonChore, say } from './horizonCore'
import {
  canFileStandardConvoy,
  canFileStandardCross,
  canFileStandardPhrase,
  canLaunchProbe,
  fileStandardConvoy,
  fileStandardCross,
  fileStandardPhrase,
  launchProbe,
  maybeOpenEras,
  probeCost,
  spawnPhrase,
  stockedCount,
} from './horizon'
import { stopTariffMul } from './horizonVerbs'

const SEED_BASE_PER_SEC = HORIZON.seedPerSec
const SEED_PER_GREENHOUSE = HORIZON.seedPerGreenhouse
const SEASON_LINE = ['hz-season-thaw', 'hz-season-sun', 'hz-season-harvest', 'hz-season-dark'] as const

function seasonHandOnBoard(s: GameState): boolean {
  const sh = s.depth?.shifts
  if (!sh) return false
  const ids = [...sh.open, ...sh.mid, ...sh.close]
  return ids.some((id) => s.staff.find((m) => m.id === id)?.role === 'seasonHand')
}

function roughBest(s: GameState): number {
  const e = s.horizon.clauses.includes('one-price') ? 1.2 : DEMAND.elasticity
  if (e <= 1.01) return DEMAND.refPrice
  const tip = Number.isFinite(s.wholesale.tipIndex) ? s.wholesale.tipIndex : s.wholesale.index
  const cost = WHOLESALE.baseCanCost * (Number.isFinite(tip) ? tip : 1)
  const raw = (cost * e) / (e - 1)
  const snapped = Math.round(raw * 10) / 10
  return Math.min(PRICE.max, Math.max(PRICE.min, snapped))
}

function shelfRoughCap(s: GameState): number {
  const front = s.builds?.storefront ?? 1
  let cap = SHELF.baseCap
  if (front >= 2) cap += 20
  if (front >= 3) cap += 60
  if (front >= 4) cap += 200
  return cap
}

function pushAgentLog(s: GameState, line: string) {
  const h = ensureHorizon(s)
  h.agentLog.push(line)
  while (h.agentLog.length > 8) h.agentLog.shift()
}

function habitPrice(s: GameState, name: string): boolean {
  const best = roughBest(s)
  if (best <= 0 || Math.abs(s.price - best) / best <= 0.08) return false
  s.price = Math.round(best * 100) / 100
  s.stats.priceChanges += 1
  const line = `${name} set the price to ${s.price.toFixed(2)}.`
  pushAgentLog(s, line)
  log(s, line, 'info')
  return true
}

function habitStock(s: GameState, name: string): boolean {
  if (sumQty(s.shelf) >= shelfRoughCap(s) * 0.3) return false
  if (s.orders.length >= 3) return false
  const cat = s.orderCat
  if (!s.categories[cat]) return false
  const crates = s.supplier === 'b' ? 2 : 1
  const index = Number.isFinite(s.wholesale.index) ? s.wholesale.index : 1
  const unit = WHOLESALE.baseCanCost * index
  const cost = unit * WHOLESALE.spoolUnits * crates
  if (!(s.cash > cost)) return false
  s.cash -= cost
  s.stats.wholesaleSpent += cost
  s.stats.ordersPlaced += 1
  s.orders.push({
    id: s.nextOrderId++,
    supplier: s.supplier,
    cat,
    qty: WHOLESALE.spoolUnits * crates,
    eta: 8,
    unitCost: unit,
  })
  const line = `${name} ordered ${crates === 1 ? 'a crate' : `${crates} crates`}.`
  pushAgentLog(s, line)
  log(s, line, 'info')
  return true
}

export function tickAgents(s: GameState) {
  const h = s.horizon
  const posted = h.watchUntil > 0 ? (h.postedHabit?.agentId ?? null) : null
  for (const agent of h.agents) {
    // Posted on a habit watch: off their own job until the watch resolves.
    if (agent.id === posted) continue
    if (s.time < (h.agentAt[agent.id] ?? 0)) continue
    let acted = false
    if (agent.habit === 'price') acted = habitPrice(s, agent.name)
    else if (agent.habit === 'stock') acted = habitStock(s, agent.name)
    else if (agent.habit === 'route') {
      if (h.standingRoute && !canFileStandardConvoy(s)) {
        const err = fileStandardConvoy(s, {
          origin: h.standingRoute.origin,
          stop: h.standingRoute.stop,
          dest: h.standingRoute.dest,
          good: h.standingRoute.good,
        })
        acted = !err
        if (acted) {
          const line = `${agent.name} refiled the standing route.`
          pushAgentLog(s, line)
          log(s, line, 'info')
        }
      }
    } else if (agent.habit === 'taste') {
      const left = HORIZON.seasonSec - h.seasonT
      if (left <= 60 && h.plots.some((p) => p.child.length === 0) && !canFileStandardCross(s)) {
        acted = !fileStandardCross(s)
        if (acted) {
          const line = `${agent.name} planted the season’s cross.`
          pushAgentLog(s, line)
          log(s, line, 'info')
        }
      }
    }
    if (acted) {
      agent.xp += 1
      h.agentAt[agent.id] = s.time + (agent.habit === 'taste' ? 60 : 30) * agentWaitMul(s)
    } else {
      h.agentAt[agent.id] = s.time + 30 * agentWaitMul(s)
    }
  }
}

/** Handler staff levels and Brisk Desk ranks both shorten an agent's wait (never past the floor). */
function agentWaitMul(s: GameState): number {
  const desk = Math.max(HORIZON.briskDeskFloor, 1 - upgradeEffect(s, 'sg-brisk-desk'))
  return handlerWaitMul(s) * desk
}

export function tickDeputies(s: GameState) {
  const h = s.horizon
  const pinFile = Math.max(HORIZON.pinFileFloor, 1 - upgradeEffect(s, 'ex-pin-file'))
  const baseCooldown =
    (upgradeEffect(s, 'probe-clerk') > 0 ? HORIZON.deputyCooldownFast : HORIZON.deputyCooldown) * pinFile
  for (const member of s.staff) {
    if (!h.deputy[member.id] && !member.deputy) continue
    if (s.time < (h.deputyAt[member.id] ?? 0)) continue
    const role = member.role as string
    // Annex staff level shortens their own deputy's wait. Own-route couriers refile the standing route sooner.
    let cooldown = baseCooldown * deputyCooldownMul(member.level)
    if (role === 'broker' && hasFork(s, 'courierOwn')) cooldown *= LATE.courierOwnPaceMul
    let acted = false
    if (role === 'surveyor') {
      const cost = probeCost(s)
      const floorOk = s.cash - cost >= s.cash * HORIZON.deputyCashFloor
      if (s.cash >= cost * 2 && floorOk && !canLaunchProbe(s)) {
        acted = !launchProbe(s)
      }
    } else if (role === 'broker') {
      if (h.standingRoute && !canFileStandardConvoy(s)) acted = !fileStandardConvoy(s)
    } else if (role === 'grower') {
      const left = HORIZON.seasonSec - h.seasonT
      if (left <= 30 && !canFileStandardCross(s)) acted = !fileStandardCross(s)
    } else if (role === 'translator') {
      if (h.phrase && !canFileStandardPhrase(s)) acted = !fileStandardPhrase(s)
    }
    if (acted) h.deputyAt[member.id] = s.time + cooldown
  }
}

export function tickSeasons(s: GameState, dt: number) {
  if (s.era < 9) return
  const h = s.horizon
  say(s, SEASON_LINE[h.season] ?? '')
  h.seasonT += dt
  let guard = 0
  while (h.seasonT >= HORIZON.seasonSec && guard < 80) {
    // Missed chore → weak year unless Season Hand on the Shift Board saves one.
    if (!h.seasonChore) {
      if (seasonHandOnBoard(s) && h.seasonHandSaves > 0) {
        h.seasonHandSaves -= 1
        h.seasonChore = expectedSeasonChore(s)
        log(s, 'Season Hand on shift covered a missed chore.', 'info')
      } else {
        h.weakYears += 1
        log(s, 'A season chore was missed — weak year.', 'warn')
      }
    }
    // Armed haul left undone → weak year (season still advances).
    if (h.haulUntil > 0) {
      h.weakYears += 1
      h.haulUntil = 0
      log(s, 'The harvest was missed. This season is a weak year.', 'warn')
    }
    h.seasonT -= HORIZON.seasonSec
    h.season = ((h.season + 1) % 4) as SeasonIndex
    h.seasonsSeen += 1
    h.aids = []
    h.seasonChore = null
    h.bedLockedChore = null
    if (h.season === 0) h.seasonHandSaves = HORIZON.seasonHandSaves
    if (h.seasonsSeen <= 4) log(s, `${SEASON_NAMES[h.season]} arrives.`, 'info')
    say(s, SEASON_LINE[h.season] ?? '')
    maybeOpenEras(s)
    guard++
  }
}

export function tickPhrases(s: GameState) {
  if (s.era < 10) return
  const h = s.horizon
  if (h.phrase) return
  if (h.relays <= 0) return
  if (h.nextPhraseAt <= 0) h.nextPhraseAt = s.time
  if (s.time < h.nextPhraseAt) return
  spawnPhrase(s)
}

export function tickKeel(s: GameState) {
  if (s.era < 8) return
  const keel = s.horizon.keel
  if (keel.bought) return
  const h = s.horizon
  if (h.nextKeelAt <= 0) h.nextKeelAt = s.time + HORIZON.keelConvoyEvery
  if (s.time < keel.frozenUntil || s.time < h.nextKeelAt) return
  keel.convoys += 1
  const faster = h.clauses.includes('open-hours') ? 0.9 : 1
  h.nextKeelAt = s.time + HORIZON.keelConvoyEvery * faster
  if (keel.convoys === 1) {
    log(s, 'Keel & Sons put a convoy on your route.', 'warn')
    say(s, 'hz-keel-convoy', 'hz-keel-convoy-clerk')
  }
}

function forecastLead(s: GameState): number {
  let lead: number =
    upgradeEffect(s, 'season-bell') > 0 ? HORIZON.forecastLeadFastSec : HORIZON.forecastLeadSec
  const early =
    (s.empire.perks['hz-season'] ?? 0) > 0 ||
    (s.ventures.almanac?.policy === 'a' && (s.ventures.almanac?.level ?? 0) >= 10)
  if (lead >= 120 && early) lead = 180
  return lead + upgradeEffect(s, 'cu-long-bell')
}

export function tickHeadlines(s: GameState) {
  if (s.era < 7) return
  const h = s.horizon
  if (h.aids.length) h.aids = h.aids.filter((aid) => s.time < aid.untilTime)
  if (s.era >= 9) {
    const left = HORIZON.seasonSec - h.seasonT
    const lead = forecastLead(s)
    const key = `hl-season-telegraph:${h.seasonsSeen}`
    if (left > 0 && left <= lead && !h.seenHeadlines.includes(key)) {
      h.seenHeadlines.push(key)
      if (h.seenHeadlines.length > 80) h.seenHeadlines.splice(0, h.seenHeadlines.length - 80)
      h.headlineId = 'hl-season-telegraph'
      h.headlineUntil = s.time + left
      log(s, 'Season telegraph.', 'info')
      return
    }
  }
  if (h.nextHeadlineAt <= 0) h.nextHeadlineAt = s.time + HORIZON.headlineEvery
  if (h.headlineId && s.time >= h.headlineUntil) {
    h.headlineId = null
    h.headlineUntil = 0
  }
  if (h.headlineId || s.time < h.nextHeadlineAt) return
  const seen = new Set(h.seenHeadlines)
  const revealed = new Set(h.planets.filter((p) => p.revealed).map((p) => p.id))
  const pool = HEADLINES.filter((row) => {
    if (s.era < row.minEra) return false
    if (row.once && seen.has(row.id)) return false
    if (row.planetId && !revealed.has(row.planetId)) return false
    return row.weight > 0
  })
  h.nextHeadlineAt = s.time + HORIZON.headlineEvery
  let total = 0
  for (const row of pool) total += row.weight
  if (total <= 0) return
  let cursor = ((s.seed * 17 + Math.floor(s.time)) % 100000) / 100000 * total
  let pick = pool[pool.length - 1]
  for (const row of pool) {
    cursor -= row.weight
    if (cursor <= 0) {
      pick = row
      break
    }
  }
  if (!pick) return
  h.headlineId = pick.id
  h.headlineUntil = s.time + Math.max(30, HORIZON.seasonSec - h.seasonT)
  if (pick.once) {
    h.seenHeadlines.push(pick.id)
    if (h.seenHeadlines.length > 80) h.seenHeadlines.splice(0, h.seenHeadlines.length - 80)
  }
  // Temporary ban/demand: filed shelves go stale until refiled.
  const ban = pick.text.match(/\bbans?\s+([a-z]+)/i) || pick.helpEffect?.match(/ban\s+([a-z]+)/i)
  const demand = pick.text.match(/\bdemands?\s+([a-z]+)/i)
  if (pick.planetId) {
    const run = h.planets.find((p) => p.id === pick.planetId)
    if (run && ban?.[1]) {
      run.banTag = ban[1].toLowerCase()
      if (run.stocked) run.score = Math.min(run.score, STANDARD_SCORE * 0.9)
    }
    if (run && demand?.[1]) {
      h.aids.push({
        planetId: pick.planetId,
        kind: 'demand',
        tag: demand[1].toLowerCase(),
        mul: 1.1,
        untilTime: h.headlineUntil,
      })
    }
  }
  log(s, pick.text, 'info')
  say(s, 'hz-headline-ignore')
}

export function tickTrickles(s: GameState, dt: number) {
  const h = s.horizon
  if ((s.memos['survey-office'] ?? 0) > 0 || h.continued || upgradeEffect(s, 'survey-desk') > 0) {
    const kiosk = hasFork(s, 'kioskAlways') ? LATE.endlessKioskSurveyMul : 1
    h.survey = Math.min(
      HORIZON.surveyCap,
      h.survey +
        HORIZON.surveyPerSec * annexPaceMul(s, 'surveyor') * kiosk * (1 + upgradeEffect(s, 'pan-wide-pin')) * dt,
    )
  }
  // Probe Plaza: +1 survey trickle slot while the plaza stands.
  if ((s.builds.storefront ?? 0) >= 8) {
    h.survey = Math.min(HORIZON.surveyCap, h.survey + LATE.probePlazaSurveyPerSec * dt)
  }
  let freightEach =
    HORIZON.freightPerPlanet *
    statMul(s, 'freight') *
    annexPaceMul(s, 'broker') *
    (1 + upgradeEffect(s, 'ex-freight-clerk')) *
    (h.clauses.includes('local-shelf') ? 0.9 : 1) *
    stopTariffMul(s)
  if (s.ventures.bonded?.policy === 'b' && (s.ventures.bonded.level ?? 0) >= 1) freightEach *= 1.1
  h.freight = Math.min(HORIZON.freightCap, h.freight + stockedCount(s) * freightEach * dt)
  if (s.era >= 9) {
    let rate =
      (SEED_BASE_PER_SEC + h.greenhouses * SEED_PER_GREENHOUSE) *
      statMul(s, 'seed') *
      annexPaceMul(s, 'grower') *
      (1 + upgradeEffect(s, 'cu-bed-hand'))
    if (h.clauses.includes('cold-law')) rate *= HORIZON.coldLawSeedMul
    if ((s.ventures.wire?.level ?? 0) >= 1) {
      if (s.ventures.wire?.policy === 'a') rate *= 1.1
      if (s.ventures.wire?.policy === 'b') rate *= 0.9
    }
    h.seed = Math.min(SEED_CAP, h.seed + rate * dt)
  }
  if (h.relays > 0) {
    h.signal = Math.min(
      HORIZON.signalCap,
      h.signal +
        h.relays *
          HORIZON.signalPerRelay *
          statMul(s, 'signal') *
          annexPaceMul(s, 'translator') *
          (1 + upgradeEffect(s, 'sg-mast-tune')) *
          dt,
    )
  }
  if (h.embassies > 0) {
    h.seal = Math.min(
      HORIZON.sealCap,
      h.seal +
        h.embassies *
          HORIZON.embassySealPerSec *
          diplomatEmbassyMul(s) *
          (hasFork(s, 'embassyCourtesy') ? LATE.embassyGiftSealMul : 1) *
          statMul(s, 'seal') *
          dt,
    )
  }
}

export function tickWages(s: GameState, dt: number) {
  const agents = s.horizon.agents.length
  if (agents <= 0 || dt <= 0) return
  const each = Math.max(HORIZON.agentMinWage, Math.max(0, s.rates.revenuePerSec) * HORIZON.agentWageFrac)
  const agentPerk = s.empire.perks['hz-agent'] ?? 0
  let bill = each * agents * dt * (agentPerk > 0 ? Math.pow(0.9, agentPerk) : 1)
  if (s.ventures.frequency?.policy === 'a' && s.hours > 1) bill *= 0.9
  if (hasFork(s, 'ivoCounter')) bill *= LATE.ivoDinerWageMul
  if (!(bill > 0)) return
  const paid = Math.min(s.cash, bill)
  s.cash -= paid
  s.stats.wagesPaid += paid
}

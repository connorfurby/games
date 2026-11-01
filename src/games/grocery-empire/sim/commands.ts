import { TRACK_BY_ID, type BuildFilter, refundFrac } from '../content/builds'
import { CATEGORY_IDS, type CategoryId } from '../content/categories'
import { ERA2_EXPANSION_BY_ID } from '../content/era2'
import { INTRO_BEATS } from '../content/intro'
import { MEMO_BY_ID } from '../content/memos'
import { PERK_BY_ID } from '../content/perks'
import { ROLE_IDS, type RoleId } from '../content/staff'
import { TIP_BY_ID } from '../content/tips'
import { UPGRADE_BY_ID } from '../content/upgrades'
import { VENTURE_BY_ID, ventureLevelCost } from '../content/ventures'
import { DEMAND, EMPIRE, ENDCAP, HOURS, LOYALTY, PRICE, WHOLESALE } from './balance'
import {
  adCostGrowth,
  backroomCap,
  crateCost,
  crateSize,
  deliveryTime,
  hireCost,
  hoursMax,
  manualUnpackAmount,
  nextUpgradeCost,
  restockTargets,
  shortShipChance,
  unitCost,
  upgradeBulkCost,
} from './formulas'
import {
  addBatch,
  advanceTutorialStep,
  beginTutorial,
  clamp,
  isMenuId,
  log,
  queueTutorial,
  replayTutorial,
  round2,
  setEra,
  sumQty,
  unlockMenu,
} from './helpers'
import { TUTORIAL_BY_ID } from '../content/tutorials'
import { chance } from './rng'
import type { GameState, InvestRisk, PrestigeMutatorId, StorePolicy, SupplierId } from './state'
import {
  buyAnalyst,
  buyArchive,
  canBuyAnalyst,
  canBuyArchive,
  canPulseScanner,
  pulseScanner,
  toggleIdeas,
} from './systems/office'
import {
  callInspector,
  canCallInspector,
  canMatchCoupons,
  canOrderPizza,
  matchCoupons,
  orderPizza,
} from './systems/events'
import { collectVenture } from './systems/growth'
import { unpackUnits, staffName } from './systems/people'
import {
  applyBailout,
  applyEmptyShelfHelper,
  applyEmergencyDelivery,
  applyMentorRestock,
  canEmptyShelfHelper,
  dumpCooler,
} from './systems/recovery'
import { ensureFlagshipStore } from './systems/chain'
import { debtCovenantBreached } from './systems/capital'
import { era2Handlers } from './commandsEra2'
import { eraLateHandlers } from './commandsEraLate'

export interface Check {
  ok: boolean
  reason?: string
}

export type Command =
  | { type: 'unpack'; amount?: number }
  | { type: 'setPrice'; price: number }
  | { type: 'buyWholesale'; cat?: CategoryId; crates?: number; qty?: number }
  | { type: 'setSupplier'; supplier: SupplierId }
  | { type: 'hire'; role: RoleId }
  | { type: 'fire'; id: number }
  | { type: 'buyAd' }
  | { type: 'refundAd' }
  | { type: 'setHours'; hours: number }
  | { type: 'orderPizza' }
  | { type: 'callInspector' }
  | { type: 'matchCoupons' }
  | { type: 'dumpCooler' }
  | { type: 'buyMemo'; id: string }
  | { type: 'buyUpgrade'; id: string; count?: number }
  | { type: 'buyBuild'; track?: string; id?: BuildFilter }
  | { type: 'sellBuild'; track?: string; id?: BuildFilter }
  | { type: 'buyEndcap' }
  | { type: 'sellEndcap' }
  | { type: 'openVenture'; id: string }
  | { type: 'levelVenture'; id: string }
  | { type: 'collectVenture'; id: string }
  | { type: 'depositPassbook'; amount: number }
  | { type: 'withdrawPassbook'; amount: number }
  | { type: 'buyPerk'; id: string }
  | { type: 'expandLot'; id?: string }
  | { type: 'expandSideYard' }
  | { type: 'emergencyDelivery' }
  | { type: 'mentorRestock' }
  | { type: 'bailout' }
  | { type: 'callStarterCrate' }
  | { type: 'dismissTip'; id: string }
  | { type: 'finishIntro' }
  | { type: 'introBeat'; index: number }
  | { type: 'setAutoRestock'; enabled: boolean; maxCost?: number; minUnits?: number }
  | { type: 'setMix'; cat: CategoryId; weight: number }
  | { type: 'setOrderCat'; cat: CategoryId }
  | { type: 'toggleFavoriteMemo'; id: string }
  | { type: 'dismissOfflineReceipt' }
  | { type: 'skipTutorial' }
  | { type: 'completeTutorialStep' }
  | { type: 'doTutorialForMe' }
  | { type: 'setPaused'; paused?: boolean }
  | { type: 'setSpeed'; speed: number }
  | { type: 'acceptChapter' }
  | { type: 'buyAnalyst' }
  | { type: 'buyArchive' }
  | { type: 'spendRep'; on: 'analyst' | 'archive' }
  | { type: 'toggleIdeas' }
  | { type: 'pulseScanner' }
  | { type: 'startTutorial'; id: string }
  | { type: 'redeemLoyalty' }
  | { type: 'openStore'; name?: string }
  | { type: 'setPolicy'; storeId: string; policy: StorePolicy }
  | { type: 'setAttentionShare'; storeId: string; share: number }
  | { type: 'incorporate' }
  | { type: 'depositInvest'; amount: number }
  | { type: 'withdrawInvest'; amount: number }
  | { type: 'setInvestRisk'; risk: InvestRisk }
  | { type: 'resetCircuitBreaker' }
  | { type: 'buyInvestEngine' }
  | { type: 'runTournament' }
  | { type: 'buyDoctrine'; id: string }
  | { type: 'buildDepot' }
  | { type: 'releaseAutonomous' }
  | { type: 'resolveBoard' }
  // Era 3–6
  | { type: 'buyPlant' }
  | { type: 'buyTank' }
  | { type: 'decommissionPlant' }
  | { type: 'hireLobby' }
  | { type: 'acquireRegion' }
  | { type: 'leaveRegion' }
  | { type: 'openLane' }
  | { type: 'buyFuel' }
  | { type: 'openFranchise' }
  | { type: 'launchBarge' }
  | { type: 'buyCharter' }
  | { type: 'setCharterAxis'; axis: string; delta: number }
  | { type: 'applyGuardian' }
  | { type: 'rebootFleet' }
  | { type: 'startDriftWar' }
  | { type: 'acceptEnding' }
  | { type: 'rejectEnding' }
  | { type: 'clearPendingAccept' }
  | { type: 'confirmHungryLaws'; mutators?: PrestigeMutatorId[] }

function buildTrackId(cmd: { track?: string; id?: string }): BuildFilter | null {
  const raw = cmd.track ?? cmd.id
  if (!raw || !(raw in TRACK_BY_ID)) return null
  return raw as BuildFilter
}

type Handler = {
  can: (s: GameState, cmd: Command) => Check
  run: (s: GameState, cmd: Command) => void
}

const ok: Check = { ok: true }
const no = (reason: string): Check => ({ ok: false, reason })

function placeOrder(s: GameState, cat: CategoryId, crates: number): Check {
  if (!s.categories[cat]) return no('Category locked.')
  const supplier = s.supplier
  if (supplier === 'b') {
    if (crates < WHOLESALE.supplierB.minSpools) {
      return no(`Supplier B needs at least ${WHOLESALE.supplierB.minSpools} crates.`)
    }
  }
  const costEach = crateCost(s, cat, supplier)
  const total = round2(costEach * crates)
  if (s.cash < total) return no(`Need $${total.toFixed(2)}.`)
  const unitsEach = crateSize(s)
  let qty = unitsEach * crates
  let paid = total
  let unit = unitCost(s, cat, supplier)
  if (supplier === 'b' && chance(s, shortShipChance(s))) {
    const kept = Math.max(1, Math.floor(qty * WHOLESALE.supplierB.shortShipFrac))
    const refundUnits = qty - kept
    qty = kept
    const refund = round2(refundUnits * unit)
    paid = round2(paid - refund)
    s.stats.shortShips += 1
    log(s, `Short ship: crate light by ${refundUnits}. $${refund.toFixed(2)} credited.`, 'warn')
  }
  const firstOrder = s.stats.ordersPlaced <= 0
  s.cash -= paid
  s.stats.wholesaleSpent += paid
  s.stats.ordersPlaced += 1
  if (s.wholesale.index < 0.85) s.stats.ordersBelow85 += 1
  s.wholesale.drift = Math.min(1.35, s.wholesale.drift + WHOLESALE.buyBump * crates)
  s.wholesale.idleSec = 0
  const eta = deliveryTime(s, supplier)
  s.orders.push({
    id: s.nextOrderId++,
    supplier,
    cat,
    qty,
    eta,
    unitCost: unit,
  })
  if (firstOrder) {
    log(s, 'Truck inbound. Crates land in the backroom — Unpack them before the shelf goes bare.', 'story')
  }
  const room = backroomCap(s) - sumQty(s.backroom)
  if (room < qty * 0.25) {
    log(s, 'Order placed — backroom is tight. Overflow will refund at the door.', 'warn')
  }
  return ok
}

/**
 * Map tutorial step.action → real Command paths (same can/run as the player).
 * openMenu unlocks the menu; UI switches via Coach / setActiveMenu.
 */
function applyTutorialAction(s: GameState, action: { type: string; params?: Record<string, unknown> }) {
  const p = action.params ?? {}
  switch (action.type) {
    case 'unpack': {
      // Never softlock a tour demo on empty backroom.
      if (sumQty(s.backroom) <= 0) {
        addBatch(s.backroom, 'cans', 8, 0)
      }
      const amount = Math.max(0, Math.floor(Number(p.n ?? p.amount ?? 0) || 0))
      run(s, amount > 0 ? { type: 'unpack', amount } : { type: 'unpack' })
      break
    }
    case 'setPrice': {
      let price: number
      if (typeof p.price === 'number' && Number.isFinite(p.price)) {
        price = p.price
      } else {
        const delta = typeof p.delta === 'number' ? p.delta : -0.05
        price = round2(clamp(s.price + delta, PRICE.min, PRICE.max))
      }
      run(s, { type: 'setPrice', price })
      break
    }
    case 'buyWholesale': {
      const crates = Math.max(1, Math.floor(Number(p.qty ?? p.crates ?? 1) || 1))
      const cat = typeof p.cat === 'string' ? (p.cat as CategoryId) : undefined
      run(s, { type: 'buyWholesale', crates, cat })
      break
    }
    case 'hire': {
      const role = (typeof p.role === 'string' && ROLE_IDS.includes(p.role as RoleId)
        ? p.role
        : 'clerk') as RoleId
      run(s, { type: 'hire', role })
      break
    }
    case 'buyAd':
      run(s, { type: 'buyAd' })
      break
    case 'matchCoupons':
      run(s, { type: 'matchCoupons' })
      break
    case 'buyMemo':
      if (typeof p.id === 'string') run(s, { type: 'buyMemo', id: p.id })
      break
    case 'buyArchives':
    case 'buyArchive':
      run(s, { type: 'buyArchive' })
      break
    case 'buyUpgrade':
      if (typeof p.id === 'string') {
        const count = typeof p.count === 'number' ? p.count : undefined
        run(s, { type: 'buyUpgrade', id: p.id, count })
      }
      break
    case 'openVenture':
      if (typeof p.id === 'string') run(s, { type: 'openVenture', id: p.id })
      break
    case 'buyExpansion':
    case 'expandLot': {
      const id = typeof p.id === 'string' ? p.id : 'side-yard'
      run(s, { type: 'expandLot', id })
      break
    }
    case 'setAutoRestock':
      run(s, {
        type: 'setAutoRestock',
        enabled: p.enabled !== false,
        maxCost: typeof p.maxCost === 'number' ? p.maxCost : undefined,
        minUnits: typeof p.minUnits === 'number' ? p.minUnits : undefined,
      })
      break
    case 'openStore':
      run(s, { type: 'openStore', name: typeof p.name === 'string' ? p.name : undefined })
      break
    case 'buildDepot':
      run(s, { type: 'buildDepot' })
      break
    case 'incorporate':
      run(s, { type: 'incorporate' })
      break
    case 'resolveBoard':
      run(s, { type: 'resolveBoard' })
      break
    case 'releaseAutonomous':
      run(s, { type: 'releaseAutonomous' })
      break
    case 'runTournament':
      run(s, { type: 'runTournament' })
      break
    case 'openMenu': {
      const menu = typeof p.menu === 'string' ? p.menu : ''
      if (isMenuId(menu)) {
        unlockMenu(s, menu)
        s.seenMenus[menu] = true
      }
      break
    }
    case 'buyPlant':
    case 'buyColdPlant':
      run(s, { type: 'buyPlant' })
      break
    case 'hireLobby':
      run(s, { type: 'hireLobby' })
      break
    case 'openLane':
      run(s, { type: 'openLane' })
      break
    case 'launchBarge':
      run(s, { type: 'launchBarge' })
      break
    case 'applyGuardian':
    case 'guardianPreset':
      run(s, { type: 'applyGuardian' })
      break
    case 'releaseAutonomous':
      run(s, { type: 'releaseAutonomous' })
      break
    case 'buildDepot':
      run(s, { type: 'buildDepot' })
      break
    case 'incorporate':
      run(s, { type: 'incorporate' })
      break
    case 'resolveBoard':
      run(s, { type: 'resolveBoard' })
      break
    case 'pulseScanner':
      run(s, { type: 'pulseScanner' })
      break
    default:
      break
  }
}

const coreHandlers = {
  unpack: {
    can: (s) => (sumQty(s.backroom) <= 0 ? no('Backroom empty.') : ok),
    run: (s, cmd) => {
      const first = s.stats.unpackedManual <= 0
      const extra = Math.max(0, Math.floor((cmd as Extract<Command, { type: 'unpack' }>).amount ?? 0))
      const n = manualUnpackAmount(s) + extra
      const moved = unpackUnits(s, n)
      s.stats.unpackedManual += moved
      if (first && moved > 0) {
        log(s, 'Stock on the shelf. Shoppers can buy now — watch baskets and cash climb.', 'story')
      }
    },
  },
  setPrice: {
    can: (s, cmd) => {
      if (s.autonomous) return no('Autonomous fulfillment sets price.')
      const p = (cmd as Extract<Command, { type: 'setPrice' }>).price
      if (!Number.isFinite(p)) return no('Bad price.')
      if (p < PRICE.min || p > PRICE.max) return no(`Price ${PRICE.min}–${PRICE.max}.`)
      return ok
    },
    run: (s, cmd) => {
      const p = round2(clamp((cmd as Extract<Command, { type: 'setPrice' }>).price, PRICE.min, PRICE.max))
      if (p !== s.price) s.stats.priceChanges += 1
      s.price = p
      if (p > s.stats.peakPrice) s.stats.peakPrice = p
      if (p < s.stats.minPrice) s.stats.minPrice = p
    },
  },
  buyWholesale: {
    can: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'buyWholesale' }>
      const cat = c.cat ?? s.orderCat
      const crates = Math.max(1, Math.floor(c.crates ?? c.qty ?? 1))
      if (!s.categories[cat]) return no('Category locked.')
      const total = round2(crateCost(s, cat) * crates)
      if (s.cash < total) return no(`Need $${total.toFixed(2)}.`)
      if (s.supplier === 'b' && crates < WHOLESALE.supplierB.minSpools) {
        return no(`Supplier B needs ≥${WHOLESALE.supplierB.minSpools} crates.`)
      }
      return ok
    },
    run: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'buyWholesale' }>
      placeOrder(s, c.cat ?? s.orderCat, Math.max(1, Math.floor(c.crates ?? c.qty ?? 1)))
    },
  },
  setSupplier: {
    can: (s, cmd) => {
      const supplier = (cmd as Extract<Command, { type: 'setSupplier' }>).supplier
      if (supplier !== 'a' && supplier !== 'b') return no('Unknown supplier.')
      if (supplier === 'b' && !s.memos['second-wholesaler']) return no('Second wholesaler memo first.')
      return ok
    },
    run: (s, cmd) => {
      s.supplier = (cmd as Extract<Command, { type: 'setSupplier' }>).supplier
    },
  },
  hire: {
    can: (s, cmd) => {
      const role = (cmd as Extract<Command, { type: 'hire' }>).role
      if (!ROLE_IDS.includes(role)) return no('Unknown role.')
      if (role === 'night' && !s.memos['night-latch']) return no('Night Latch memo first.')
      if (!s.menus.staff && !s.memos['help-wanted']) return no('Staff not unlocked.')
      const cost = hireCost(s, role)
      if (s.cash < cost) return no(`Need $${cost}.`)
      return ok
    },
    run: (s, cmd) => {
      const role = (cmd as Extract<Command, { type: 'hire' }>).role
      const cost = hireCost(s, role)
      s.cash -= cost
      const id = s.nextStaffId++
      s.staff.push({ id, role, name: staffName(id), level: 1, xp: 0, hiredAt: s.time })
      s.stats.hires += 1
      log(s, `Hired ${staffName(id)} as ${role}.`, 'staff')
    },
  },
  fire: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'fire' }>).id
      if (!s.staff.some((m) => m.id === id)) return no('No such employee.')
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'fire' }>).id
      const i = s.staff.findIndex((m) => m.id === id)
      if (i < 0) return
      const [gone] = s.staff.splice(i, 1)
      log(s, `${gone.name} left the store.`, 'staff')
    },
  },
  buyAd: {
    can: (s) => {
      if (!s.menus.marketing && s.era < 1) return no('Marketing locked.')
      if (s.cash < s.adCost) return no(`Need $${s.adCost}.`)
      return ok
    },
    run: (s) => {
      s.cash -= s.adCost
      s.lastAdSpend = s.adCost
      s.lastAdAt = s.time
      s.ads += 1
      s.stats.adsBought += 1
      s.adCost = Math.ceil(s.adCost * adCostGrowth(s))
      log(s, `Ad level ${s.ads}. Next costs $${s.adCost}.`, 'info')
    },
  },
  refundAd: {
    can: (s) => {
      if (s.lastAdAt < 0) return no('No recent ad.')
      if (s.time - s.lastAdAt > 10) return no('Refund window is 10 seconds.')
      if (s.ads <= 1) return no('Cannot refund below level 1.')
      return ok
    },
    run: (s) => {
      s.ads -= 1
      s.cash += s.lastAdSpend
      s.adCost = Math.max(DEMAND.adStartCost, Math.ceil(s.lastAdSpend))
      s.lastAdAt = -1
      log(s, `Ad refunded. $${s.lastAdSpend.toFixed(0)} returned.`, 'info')
    },
  },
  setHours: {
    can: (s, cmd) => {
      const h = (cmd as Extract<Command, { type: 'setHours' }>).hours
      if (!Number.isFinite(h)) return no('Bad hours.')
      if (h < HOURS.min || h > hoursMax(s) + 1e-9) return no(`Hours ${HOURS.min}–${hoursMax(s)}.`)
      return ok
    },
    run: (s, cmd) => {
      s.hours = clamp((cmd as Extract<Command, { type: 'setHours' }>).hours, HOURS.min, hoursMax(s))
    },
  },
  orderPizza: {
    can: (s) => {
      const r = canOrderPizza(s)
      return r ? no(r) : ok
    },
    run: (s) => orderPizza(s),
  },
  callInspector: {
    can: (s) => {
      const r = canCallInspector(s)
      return r ? no(r) : ok
    },
    run: (s) => callInspector(s),
  },
  matchCoupons: {
    can: (s) => {
      const r = canMatchCoupons(s)
      return r ? no(r) : ok
    },
    run: (s) => matchCoupons(s),
  },
  dumpCooler: {
    can: (s) => {
      const n =
        s.shelf.filter((b) => b.qty > 0).length + s.backroom.filter((b) => b.qty > 0).length
      return n > 0 ? ok : no('Nothing to dump.')
    },
    run: (s) => {
      dumpCooler(s)
    },
  },
  buyMemo: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'buyMemo' }>).id
      const def = MEMO_BY_ID[id]
      if (!def) return no('Unknown memo.')
      if ((s.memos[id] ?? 0) > 0 && !def.repeatable) return no('Already done.')
      try {
        if (!def.visible(s) && !s.memoSeen[id]) return no('Not available yet.')
      } catch {
        return no('Not available yet.')
      }
      const blocked = def.blocked?.(s)
      if (blocked) return no(blocked)
      const cost = def.cost(s)
      if ((cost.cash ?? 0) > s.cash) return no(`Need $${cost.cash}.`)
      if ((cost.attention ?? 0) > s.compute.attention) return no(`Need ${cost.attention} Attention.`)
      if ((cost.ideas ?? 0) > s.compute.ideas) return no(`Need ${cost.ideas} Ideas.`)
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'buyMemo' }>).id
      const def = MEMO_BY_ID[id]
      const cost = def.cost(s)
      s.cash -= cost.cash ?? 0
      s.compute.attention -= cost.attention ?? 0
      s.compute.ideas -= cost.ideas ?? 0
      s.memos[id] = (s.memos[id] ?? 0) + 1
      s.memoSeen[id] = true
      s.stats.memosDone += 1
      s.empire.xp += EMPIRE.xpPerMemo
      def.run?.(s)
      log(s, def.voice, 'story')
      log(s, def.done, 'memo')
    },
  },
  buyUpgrade: {
    can: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'buyUpgrade' }>
      const id = c.id
      const def = UPGRADE_BY_ID[id]
      if (!def) return no('Unknown upgrade.')
      if (def.visible && !def.visible(s)) return no('Not visible yet.')
      const lvl = s.upgrades[id] ?? 0
      if (lvl >= def.max) return no('Maxed.')
      const want = Math.max(1, Math.floor(c.count ?? 1))
      const count = Math.min(want, def.max - lvl, 50)
      if (count < 1) return no('Maxed.')
      const cost = upgradeBulkCost(s, id, count)
      if (s.cash < cost) return no(`Need $${cost}.`)
      return ok
    },
    run: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'buyUpgrade' }>
      const id = c.id
      const def = UPGRADE_BY_ID[id]
      const want = Math.max(1, Math.floor(c.count ?? 1))
      const count = Math.min(want, def.max - (s.upgrades[id] ?? 0), 50)
      for (let i = 0; i < count; i++) {
        const cost = nextUpgradeCost(s, id)
        s.cash -= cost
        s.upgrades[id] = (s.upgrades[id] ?? 0) + 1
        s.upgradeSpend += cost
      }
      s.stats.upgradesBought += count
      s.empire.xp += EMPIRE.xpPerUpgrade * count
    },
  },
  buyBuild: {
    can: (s, cmd) => {
      const id = buildTrackId(cmd as { track?: string; id?: string })
      if (!id) return no('Unknown build.')
      const track = TRACK_BY_ID[id]
      if (!track.visible(s)) return no('Track locked.')
      const lvl = s.builds[id] ?? 0
      const next = track.tiers[lvl + 1]
      if (!next) return no('Max tier.')
      if (next.era > s.era) return no(`Needs era ${next.era}.`)
      if (s.cash < next.cost) return no(`Need $${next.cost}.`)
      return ok
    },
    run: (s, cmd) => {
      const id = buildTrackId(cmd as { track?: string; id?: string })!
      const track = TRACK_BY_ID[id]
      const lvl = s.builds[id] ?? 0
      const next = track.tiers[lvl + 1]
      s.cash -= next.cost
      s.builds[id] = lvl + 1
      s.stats.buildsBought += 1
      log(s, `Built ${next.name}.`, 'good')
    },
  },
  sellBuild: {
    can: (s, cmd) => {
      const id = buildTrackId(cmd as { track?: string; id?: string })
      if (!id) return no('Unknown build.')
      const lvl = s.builds[id] ?? 0
      const min = id === 'storefront' || id === 'storage' ? 1 : 0
      if (lvl <= min) return no('Nothing to sell.')
      return ok
    },
    run: (s, cmd) => {
      const id = buildTrackId(cmd as { track?: string; id?: string })!
      const track = TRACK_BY_ID[id]
      const lvl = s.builds[id] ?? 0
      const tier = track.tiers[lvl]
      const refund = round2((tier?.cost ?? 0) * refundFrac(s))
      s.builds[id] = lvl - 1
      s.cash += refund
      log(s, `Sold back ${tier?.name ?? id} for $${refund.toFixed(2)}.`, 'info')
    },
  },
  buyEndcap: {
    can: (s) => {
      if (s.endcaps >= ENDCAP.max) return no('Max endcaps.')
      const cost = Math.ceil(ENDCAP.base * Math.pow(ENDCAP.growth, s.endcaps))
      if (s.cash < cost) return no(`Need $${cost}.`)
      return ok
    },
    run: (s) => {
      const cost = Math.ceil(ENDCAP.base * Math.pow(ENDCAP.growth, s.endcaps))
      s.cash -= cost
      s.endcaps += 1
    },
  },
  sellEndcap: {
    can: (s) => (s.endcaps > 0 ? ok : no('No endcaps.')),
    run: (s) => {
      const cost = Math.ceil(ENDCAP.base * Math.pow(ENDCAP.growth, s.endcaps - 1))
      s.endcaps -= 1
      s.cash += round2(cost * ENDCAP.refund)
    },
  },
  openVenture: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'openVenture' }>).id
      const def = VENTURE_BY_ID[id]
      if (!def) return no('Unknown venture.')
      if (!def.available(s)) return no('Not available.')
      if (s.ventures[id]?.level) return no('Already open.')
      if (s.cash < def.openCost) return no(`Need $${def.openCost}.`)
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'openVenture' }>).id
      const def = VENTURE_BY_ID[id]
      s.cash -= def.openCost
      s.ventures[id] = { level: 1, stored: 0, lifetime: 0, carry: 0 }
      log(s, `${def.name} opened.`, 'good')
    },
  },
  levelVenture: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'levelVenture' }>).id
      const def = VENTURE_BY_ID[id]
      const vs = s.ventures[id]
      if (!def || !vs) return no('Venture closed.')
      if (vs.level >= def.maxLevel) return no('Max level.')
      const cost = ventureLevelCost(def, vs.level)
      if (s.cash < cost) return no(`Need $${cost}.`)
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'levelVenture' }>).id
      const def = VENTURE_BY_ID[id]
      const vs = s.ventures[id]
      const cost = ventureLevelCost(def, vs.level)
      s.cash -= cost
      vs.level += 1
    },
  },
  collectVenture: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'collectVenture' }>).id
      const vs = s.ventures[id]
      if (!vs || vs.stored <= 0) return no('Nothing to collect.')
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'collectVenture' }>).id
      const got = collectVenture(s, id)
      if (got > 0) log(s, `Collected $${got.toFixed(2)} from venture.`, 'sale')
    },
  },
  depositPassbook: {
    can: (s, cmd) => {
      if (!s.menus.invest && !s.memos['passbook']) return no('Invest locked.')
      const amount = (cmd as Extract<Command, { type: 'depositPassbook' }>).amount
      if (!(amount > 0)) return no('Enter an amount.')
      if (s.cash < amount) return no('Not enough cash.')
      return ok
    },
    run: (s, cmd) => {
      const amount = round2((cmd as Extract<Command, { type: 'depositPassbook' }>).amount)
      s.cash -= amount
      s.passbook.balance += amount
    },
  },
  withdrawPassbook: {
    can: (s, cmd) => {
      const amount = (cmd as Extract<Command, { type: 'withdrawPassbook' }>).amount
      if (!(amount > 0)) return no('Enter an amount.')
      if (s.passbook.balance < amount) return no('Passbook balance too low.')
      return ok
    },
    run: (s, cmd) => {
      const amount = round2((cmd as Extract<Command, { type: 'withdrawPassbook' }>).amount)
      s.passbook.balance -= amount
      s.cash += amount
    },
  },
  buyPerk: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'buyPerk' }>).id
      const def = PERK_BY_ID[id]
      if (!def) return no('Unknown perk.')
      const lvl = s.empire.perks[id] ?? 0
      if (lvl >= def.max) return no('Maxed.')
      if (s.empire.points < def.cost) return no('Need perk points.')
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'buyPerk' }>).id
      const def = PERK_BY_ID[id]
      s.empire.points -= def.cost
      s.empire.perks[id] = (s.empire.perks[id] ?? 0) + 1
      if (id === 'starting-cash') s.cash += 10
      if (id === 'extra-archive' && s.compute.unlocked) s.compute.archives += 1
    },
  },
  expandLot: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'expandLot' }>).id ?? 'side-yard'
      if (!s.menus.land && !s.memos['lot-survey'] && s.era < 2) return no('Land locked.')
      if (s.expansions[id]) return no('Already owned.')
      const era2 = ERA2_EXPANSION_BY_ID[id]
      if (era2) {
        if (era2.era > s.era) return no(`Needs era ${era2.era}.`)
        if (era2.requires && !era2.requires(s)) return no('Prerequisites not met.')
        if (debtCovenantBreached(s)) return no('Debt covenant blocks expansion.')
        if (s.cash < era2.cost) return no(`Need $${era2.cost}.`)
        return ok
      }
      const cost = id === 'side-yard' ? 2500 : id === 'lot' ? 5000 : 5000
      if (s.cash < cost) return no(`Need $${cost}.`)
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'expandLot' }>).id ?? 'side-yard'
      const era2 = ERA2_EXPANSION_BY_ID[id]
      const cost = era2 ? era2.cost : id === 'side-yard' ? 2500 : 5000
      s.cash -= cost
      s.expansions[id] = true
      log(s, `Expansion purchased: ${id}.`, 'era')
      // Lot / side yard gates Era 2 — chain and capital
      if (id === 'lot' || id === 'side-yard') {
        setEra(s, 2)
        ensureFlagshipStore(s)
        unlockMenu(s, 'land')
        unlockMenu(s, 'strategy')
        queueTutorial(s, 'e2-second-store')
        queueTutorial(s, 'e2-policies')
        queueTutorial(s, 'e2-depot')
        queueTutorial(s, 'e2-incorporate')
        queueTutorial(s, 'e2-invest')
        queueTutorial(s, 'e2-tournament')
        queueTutorial(s, 'e2-board')
        queueTutorial(s, 'e2-expansions')
        queueTutorial(s, 'e2-ventures')
        queueTutorial(s, 'e2-autonomous')
        log(s, 'Era 2 — Chain and capital. Attention splits; the book waits.', 'era')
      }
    },
  },
  expandSideYard: {
    can: (s) => can(s, { type: 'expandLot', id: 'side-yard' }),
    run: (s) => {
      run(s, { type: 'expandLot', id: 'side-yard' })
    },
  },
  emergencyDelivery: {
    can: (s) => {
      const stock = sumQty(s.shelf) + sumQty(s.backroom)
      if (stock > crateSize(s) * 2) return no('Stock is not critically low.')
      return ok
    },
    run: (s) => {
      applyEmergencyDelivery(s)
    },
  },
  mentorRestock: {
    can: (s) => {
      if (sumQty(s.shelf) + sumQty(s.backroom) > 0) return no('You still have stock.')
      if (s.era > 0 && s.stats.playSec > 1200) return no('Mentor has moved on.')
      return ok
    },
    run: (s) => {
      applyMentorRestock(s)
    },
  },
  bailout: {
    can: (s) => {
      if (s.time - s.recovery.lastBailoutAt < 30) return no('Bailout cooling down.')
      if (s.cash > 25 && sumQty(s.backroom) + sumQty(s.shelf) > 0) return no('Not broke enough.')
      return ok
    },
    run: (s) => {
      if (!applyBailout(s)) {
        // Force a soft bailout when the player asks and can() passed
        s.cash += 15
        addBatch(s.backroom, 'cans', 12, 0)
        s.recovery.lastBailoutAt = s.time
        s.stats.bailouts += 1
        log(s, 'Bailout accepted.', 'recovery')
      }
    },
  },
  callStarterCrate: {
    can: (s) => {
      const reason = canEmptyShelfHelper(s, { ignoreWait: true })
      return reason ? no(reason) : ok
    },
    run: (s) => {
      applyEmptyShelfHelper(s, { ignoreWait: true })
    },
  },
  dismissTip: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'dismissTip' }>).id
      if (!TIP_BY_ID[id]) return no('Unknown tip.')
      if (s.tipsSeen[id]) return no('Already dismissed.')
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'dismissTip' }>).id
      s.tipsSeen[id] = true
    },
  },
  introBeat: {
    can: (s) => (s.introSeen ? no('Intro already finished.') : ok),
    run: (s, cmd) => {
      const idx = (cmd as Extract<Command, { type: 'introBeat' }>).index
      const beat = INTRO_BEATS[idx]
      if (beat?.ledger) log(s, beat.ledger, 'story')
    },
  },
  finishIntro: {
    can: (s) => (s.introSeen ? no('Intro already finished.') : ok),
    run: (s) => {
      s.introSeen = true
      s.paused = false
      log(s, 'The counter is yours. Unpack puts stock on the shelf. Baskets are the score; cash pays the bills.', 'story')
      log(s, 'Coach will spotlight each control once. Story keeps writing along the bottom.', 'story')
      queueTutorial(s, 'unpack')
    },
  },
  setAutoRestock: {
    can: (s) => {
      if (!s.memos['auto-order']) return no('Auto-Order Clipboard memo first.')
      return ok
    },
    run: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'setAutoRestock' }>
      s.autoRestock.enabled = c.enabled
      if (c.maxCost !== undefined) s.autoRestock.maxCost = c.maxCost
      if (c.minUnits !== undefined) s.autoRestock.minUnits = Math.max(1, Math.floor(c.minUnits))
    },
  },
  setMix: {
    can: (_s, cmd) => {
      const c = cmd as Extract<Command, { type: 'setMix' }>
      if (!CATEGORY_IDS.includes(c.cat)) return no('Bad category.')
      if (!Number.isFinite(c.weight)) return no('Bad weight.')
      return ok
    },
    run: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'setMix' }>
      s.mix[c.cat] = clamp(c.weight, 0, 1)
    },
  },
  setOrderCat: {
    can: (s, cmd) => {
      const cat = (cmd as Extract<Command, { type: 'setOrderCat' }>).cat
      if (!s.categories[cat]) return no('Category locked.')
      return ok
    },
    run: (s, cmd) => {
      s.orderCat = (cmd as Extract<Command, { type: 'setOrderCat' }>).cat
    },
  },
  toggleFavoriteMemo: {
    can: (_s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'toggleFavoriteMemo' }>).id
      return MEMO_BY_ID[id] ? ok : no('Unknown memo.')
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'toggleFavoriteMemo' }>).id
      s.memoFavorites[id] = !s.memoFavorites[id]
    },
  },
  dismissOfflineReceipt: {
    can: (s) => (s.offlineReceipt ? ok : no('No receipt.')),
    run: (s) => {
      s.offlineReceipt = null
    },
  },
  skipTutorial: {
    can: (s) => (s.tutorials.active ? ok : no('No active tutorial.')),
    run: (s) => {
      const id = s.tutorials.active!.id
      s.tutorials.done[id] = true
      s.tutorials.active = null
    },
  },
  completeTutorialStep: {
    can: (s) => (s.tutorials.active ? ok : no('No active tutorial.')),
    run: (s) => {
      advanceTutorialStep(s)
    },
  },
  doTutorialForMe: {
    can: (s) => (s.tutorials.active ? ok : no('No active tutorial.')),
    run: (s) => {
      const t = s.tutorials.active!
      const step = TUTORIAL_BY_ID[t.id]?.steps[t.step]
      if (step?.action) applyTutorialAction(s, step.action)
      advanceTutorialStep(s)
    },
  },
  setPaused: {
    can: () => ok,
    run: (s, cmd) => {
      const p = (cmd as Extract<Command, { type: 'setPaused' }>).paused
      s.paused = p === undefined ? !s.paused : p
    },
  },
  setSpeed: {
    can: (_s, cmd) => {
      const speed = (cmd as Extract<Command, { type: 'setSpeed' }>).speed
      if (![1, 2, 4].includes(speed)) return no('Speed must be 1, 2, or 4.')
      return ok
    },
    run: (s, cmd) => {
      s.speed = (cmd as Extract<Command, { type: 'setSpeed' }>).speed
    },
  },
  acceptChapter: {
    can: (s) => (s.chapterQueue.length ? ok : no('No chapter waiting.')),
    run: (s) => {
      const era = s.chapterQueue.shift()
      if (era != null) {
        log(s, `Chapter ${era} accepted. The aisle keeps its new name.`, 'story')
      }
    },
  },
  buyAnalyst: {
    can: (s) => {
      const r = canBuyAnalyst(s)
      return r ? no(r) : ok
    },
    run: (s) => buyAnalyst(s),
  },
  buyArchive: {
    can: (s) => {
      const r = canBuyArchive(s)
      return r ? no(r) : ok
    },
    run: (s) => buyArchive(s),
  },
  spendRep: {
    can: (s, cmd) => {
      const on = (cmd as Extract<Command, { type: 'spendRep' }>).on
      const r = on === 'archive' ? canBuyArchive(s) : canBuyAnalyst(s)
      return r ? no(r) : ok
    },
    run: (s, cmd) => {
      const on = (cmd as Extract<Command, { type: 'spendRep' }>).on
      if (on === 'archive') buyArchive(s)
      else buyAnalyst(s)
    },
  },
  toggleIdeas: {
    can: (s) => (s.compute.ideasUnlocked ? ok : no('Ideas not unlocked.')),
    run: (s) => toggleIdeas(s),
  },
  pulseScanner: {
    can: (s) => {
      const r = canPulseScanner(s)
      return r ? no(r) : ok
    },
    run: (s) => pulseScanner(s),
  },
  startTutorial: {
    can: (_s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'startTutorial' }>).id
      if (!TUTORIAL_BY_ID[id]) return no('Unknown tour.')
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'startTutorial' }>).id
      replayTutorial(s, id)
      unlockMenu(s, 'coach')
      // Promote immediately so Replay feels responsive
      if (!s.tutorials.active && s.tutorials.queue[0] === id) {
        s.tutorials.queue.shift()
        beginTutorial(s, id)
      }
    },
  },
  redeemLoyalty: {
    can: (s) => {
      if (s.loyalty.tier <= 0) return no('No punch card yet.')
      if (s.loyalty.liability < 0.5) return no('No rewards waiting.')
      if (s.cash < 0.5) return no('Need cash to pay rewards.')
      return ok
    },
    run: (s) => {
      const cap = Math.max(1, s.loyalty.liability * LOYALTY.redeemCapFrac)
      const pay = round2(Math.min(s.cash, s.loyalty.liability, cap))
      if (pay <= 0) return
      s.cash = round2(s.cash - pay)
      s.loyalty.liability = round2(Math.max(0, s.loyalty.liability - pay))
      log(s, `Punch-card rewards paid: $${pay.toFixed(2)}. Regulars stay happy.`, 'good')
    },
  },
} satisfies Record<string, Handler>

const handlers = {
  ...coreHandlers,
  ...Object.fromEntries(
    Object.entries(era2Handlers).map(([k, h]) => [
      k,
      {
        can: (s: GameState, cmd: Command) => h.can(s, cmd as never),
        run: (s: GameState, cmd: Command) => h.run(s, cmd as never),
      } satisfies Handler,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(eraLateHandlers).map(([k, h]) => [
      k,
      {
        can: (s: GameState, cmd: Command) => h.can(s, cmd as never),
        run: (s: GameState, cmd: Command) => h.run(s, cmd as never),
      } satisfies Handler,
    ]),
  ),
} as Record<string, Handler>

export function can(s: GameState, cmd: Command): Check {
  const h = handlers[cmd.type]
  if (!h) return no('Unknown command.')
  try {
    return h.can(s, cmd)
  } catch {
    return no('Cannot do that.')
  }
}

/** Mutates state. No-ops when can() fails. */
export function run(s: GameState, cmd: Command): Check {
  const check = can(s, cmd)
  if (!check.ok) return check
  const h = handlers[cmd.type]
  if (!h) return no('Unknown command.')
  h.run(s, cmd)
  return ok
}

/** Auto-restock tick helper — places orders through the same buy path. */
export function tickAutoRestock(s: GameState) {
  if (!s.autoRestock.enabled) return
  if (!s.memos['auto-order']) return
  if (s.orders.length > 0) return
  const back = sumQty(s.backroom)
  if (back >= s.autoRestock.minUnits) return
  // Prefer the unlocked category furthest below its mix target in the backroom.
  const targets = restockTargets(s)
  const backTotal = Math.max(1, back)
  let cat: CategoryId | null = null
  let bestGap = -Infinity
  for (const c of CATEGORY_IDS) {
    const target = targets[c]
    if (target == null) continue
    const gap = target - sumQty(s.backroom, c) / backTotal
    if (gap > bestGap) {
      bestGap = gap
      cat = c
    }
  }
  if (!cat && s.categories[s.orderCat]) cat = s.orderCat
  if (!cat) return
  const cost = unitCost(s, cat)
  if (cost > s.autoRestock.maxCost) return
  const crates = s.supplier === 'b' ? WHOLESALE.supplierB.minSpools : 1
  if (can(s, { type: 'buyWholesale', cat, crates }).ok) {
    run(s, { type: 'buyWholesale', cat, crates })
  }
}

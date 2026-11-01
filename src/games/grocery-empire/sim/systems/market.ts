import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { DEMAND, EMPIRE, INSPECTION, SHRINK, WEATHER_SEC, WHOLESALE } from '../balance'
import {
  agingMul,
  backroomCap,
  categoryWeights,
  checkoutCap,
  demandPerSec,
  inspectionGainMul,
  lifeMul,
  memo,
  roleCount,
  shrinkMul,
  varietyMul,
  revenueMul,
} from '../formulas'
import { addBatch, compact, log, sumQty, takeUnits } from '../helpers'
import { chance, nextRng, pick } from '../rng'
import type { Batch, GameState, WeatherId } from '../state'

/** Paperclips-style wire walk: sine wobble around a base that bumps on buys and sags when idle. */
export function tickWholesale(s: GameState, dt: number) {
  const w = s.wholesale
  if (chance(s, WHOLESALE.changeChancePerSec * dt)) w.phase += 0.6 + nextRng(s) * 0.9
  w.idleSec += dt
  if (w.idleSec >= WHOLESALE.idleSagEverySec) {
    w.idleSec = 0
    w.drift = Math.max(WHOLESALE.baseFloor, w.drift * (1 - WHOLESALE.idleSag))
  }
  const floor = memo(s, 'market-almanac') ? WHOLESALE.indexFloor - 0.06 : WHOLESALE.indexFloor
  w.index = Math.max(floor, w.drift * (1 + WHOLESALE.sineAmp * Math.sin(w.phase)))
}

const WEATHERS: WeatherId[] = ['fair', 'fair', 'rain', 'heat', 'cold']

export function tickWeather(s: GameState, dt: number) {
  if (s.era < 1) return
  const wx = s.weather
  wx.timer += dt
  if (wx.timer < WEATHER_SEC) return
  wx.timer = 0
  wx.now = wx.next
  wx.next = pick(s, WEATHERS)
  s.stats.weatherDays += 1
  if (wx.now !== 'fair') {
    const text: Record<WeatherId, string> = {
      fair: '',
      rain: 'Rain day. Comfort food moves; umbrellas by the door.',
      heat: 'Heat wave. Drinks fly off the shelf and produce wilts faster.',
      cold: 'Cold snap. Fewer shoppers, but nothing spoils as fast.',
    }
    log(s, text[wx.now], 'info')
  }
}

export function tickDeliveries(s: GameState, dt: number) {
  if (!s.orders.length) return
  for (const o of s.orders) o.eta -= dt
  const arrived = s.orders.filter((o) => o.eta <= 0)
  if (!arrived.length) return
  s.orders = s.orders.filter((o) => o.eta > 0)
  for (const o of arrived) {
    const room = Math.max(0, backroomCap(s) - sumQty(s.backroom))
    const accepted = Math.min(room, o.qty)
    const refused = o.qty - accepted
    addBatch(s.backroom, o.cat, accepted, 0)
    if (refused > 0) {
      const refund = Math.round(refused * o.unitCost * 100) / 100
      s.cash += refund
      log(s, `Backroom full: ${refused} ${CATEGORIES[o.cat].name.toLowerCase()} refused at the door, $${refund.toFixed(2)} refunded.`, 'warn')
    }
  }
}

/** Age every batch; anything past its life spoils. Returns units spoiled. */
export function tickAging(s: GameState, dt: number): number {
  let spoiled = 0
  const age = (list: Batch[], where: 'shelf' | 'backroom') => {
    for (const b of list) {
      const life = CATEGORIES[b.cat].life
      if (life === null) continue
      b.age += dt * agingMul(s, where, b.cat)
      if (b.age >= life * lifeMul(s, b.cat)) {
        spoiled += b.qty
        s.stats.spoiledByCat[b.cat] += b.qty
        b.qty = 0
      }
    }
    compact(list)
  }
  age(s.shelf, 'shelf')
  age(s.backroom, 'backroom')
  if (spoiled > 0) {
    s.stats.spoiled += spoiled
    s.acc.spoilWindow += spoiled
    s.inspection.meter += spoiled * INSPECTION.inspectionPerUnit * inspectionGainMul(s)
    if (s.time - s.acc.lastSpoilLogAt > 20) {
      s.acc.lastSpoilLogAt = s.time
      log(s, `${spoiled} unit${spoiled === 1 ? '' : 's'} spoiled. Stockers and coolers slow this down.`, 'warn')
    }
    // Museum of Spoiled Goods — keep the twelve largest spoil events.
    if (!s.museum) s.museum = { exhibits: [] }
    const exhibits = s.museum.exhibits
    const worst = exhibits.length < 12 || spoiled > (exhibits[exhibits.length - 1]?.qty ?? 0)
    if (worst) {
      exhibits.push({
        t: s.time,
        qty: spoiled,
        note: `${spoiled} unit${spoiled === 1 ? '' : 's'} spoiled`,
      })
      exhibits.sort((a, b) => b.qty - a.qty)
      if (exhibits.length > 12) exhibits.length = 12
    }
  }
  return spoiled
}

/** Demand → sales. Out-of-stock categories pass part of their shoppers to stocked ones. */
export function tickSales(s: GameState, dt: number): { sold: number; revenue: number } {
  const weights = categoryWeights(s)
  const base = demandPerSec(s) * varietyMul(s)
  s.rates.demandPerSec = base
  const capUnits = checkoutCap(s) * dt
  let want = Math.min(base * dt, capUnits)

  const wantBy: Partial<Record<CategoryId, number>> = {}
  let overflow = 0
  let stockedWeight = 0
  for (const c of CATEGORY_IDS) {
    const wc = weights[c]
    if (wc === undefined) continue
    const has = sumQty(s.shelf, c) > 0
    if (has) {
      wantBy[c] = want * wc
      stockedWeight += wc
    } else {
      overflow += want * wc * DEMAND.substitution
      wantBy[c] = 0
    }
  }
  if (stockedWeight > 0 && overflow > 0) {
    for (const c of CATEGORY_IDS) {
      if (!wantBy[c]) continue
      wantBy[c]! += overflow * ((weights[c] ?? 0) / stockedWeight)
    }
  }
  want = 0

  const fifo = roleCount(s, 'stocker') > 0
  let sold = 0
  let revenue = 0
  for (const c of CATEGORY_IDS) {
    const wc = wantBy[c]
    if (wc === undefined) continue
    const onShelf = sumQty(s.shelf, c)
    s.acc.cat[c] = Math.min(2, s.acc.cat[c] + wc)
    const n = Math.min(onShelf, Math.floor(s.acc.cat[c]))
    if (n <= 0) continue
    s.acc.cat[c] -= n
    takeUnits(s.shelf, n, fifo, c)
    const r = n * s.price * CATEGORIES[c].priceRatio * revenueMul(s)
    sold += n
    revenue += r
    s.stats.soldByCat[c] += n
    s.stats.revenueByCat[c] += r
  }

  if (sold > 0) {
    const firstBasket = s.stats.sold <= 0
    s.baskets += sold
    s.stats.sold += sold
    s.cash += revenue
    s.lifetimeRevenue += revenue
    s.acc.revWindow += revenue
    s.acc.soldWindow += sold
    s.empire.xp += sold * EMPIRE.xpPerUnitSold
    if (firstBasket) {
      log(
        s,
        'First basket. That number top-left is the score — cash beside it pays the bills.',
        'story',
      )
    }
  }
  if (sumQty(s.shelf) === 0) s.stats.stockoutSec += dt
  return { sold, revenue }
}

export function tickShrink(s: GameState, dt: number) {
  const units = sumQty(s.shelf)
  if (units <= 0) return
  s.acc.shrink += units * SHRINK.perUnitPerSec * shrinkMul(s) * dt
  if (s.acc.shrink < 1) return
  const n = Math.min(units, Math.floor(s.acc.shrink))
  s.acc.shrink -= n
  takeUnits(s.shelf, n, false)
  s.stats.shrunk += n
  if (s.time - s.acc.lastShrinkLogAt > 60) {
    s.acc.lastShrinkLogAt = s.time
    log(s, `Shrink: ${n} unit${n === 1 ? '' : 's'} walked out unpaid. Security and cashiers cut this.`, 'warn')
  }
}

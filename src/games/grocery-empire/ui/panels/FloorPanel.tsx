import { valueMul } from '../../sim/systems/network'
import { useStable } from '../useStable'
import { useEffect, useRef, useState } from 'react'
import { useMeta } from '@/shell/MetaContext'
import { playUnpackFx } from '@/shared/audio'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { earlyFloorChromeDone } from '../../content/dialogue'
import { INSPECTION, PRICE } from '../../sim/balance'
import { can } from '../../sim/commands'
import {
  batchSpoilFrac,
  bestPrice,
  demandPerSec,
  effectiveLife,
  varietyMul,
  crateCost,
  featuredCategories,
  hasWeatherForecast,
  manualUnpackAmount,
  rentPerSec,
  reputationEtaSec,
  salesBottleneck,
  shelfCap,
  unitCost,
  shelfPrice,
  up,
} from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import { useGame } from '../GameContext'
import { clock, money, qty, rate } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import { Icon } from '../icons/Icon'

/** Tiny weather icons for the status chip. */
function WeatherGlyph({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden className="fl-ico">
      {kind === 'rain' ? (
        <g fill="currentColor">
          <ellipse cx="6" cy="4.5" rx="4.5" ry="2.5" />
          <path d="M3.5 8l-1 2.5M6 8l-1 2.5M8.5 8l-1 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </g>
      ) : kind === 'cold' ? (
        <path d="M6 1v10M1.7 3.5l8.6 5M1.7 8.5l8.6-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      ) : kind === 'heat' ? (
        <g fill="currentColor">
          <circle cx="6" cy="6" r="2.6" />
          <path d="M6 .5v2M6 9.5v2M.5 6h2M9.5 6h2M2 2l1.4 1.4M8.6 8.6L10 10M2 10l1.4-1.4M8.6 3.4L10 2" stroke="currentColor" strokeWidth="1" />
        </g>
      ) : (
        <g fill="currentColor">
          <circle cx="4.5" cy="5" r="2.2" opacity=".85" />
          <ellipse cx="7" cy="7.5" rx="4" ry="2.2" />
        </g>
      )}
    </svg>
  )
}

export function FloorPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion, setActiveMenu } = useGame()
  const { meta } = useMeta()
  const holdRef = useRef<number | null>(null)
  const canHold = up(s, 'hold-unpack') > 0
  const shelf = sumQty(s.shelf)
  const back = sumQty(s.backroom)
  const cap = shelfCap(s)
  const tip = up(s, 'price-iq') > 0 ? bestPrice(s) : null
  const unlockedCats = CATEGORY_IDS.filter((c) => s.categories[c])
  const orderCat = (
    unlockedCats.includes((s.orderCat || 'cans') as CategoryId)
      ? s.orderCat || 'cans'
      : unlockedCats[0] || 'cans'
  ) as CategoryId
  const wholesaleCost = crateCost(s, orderCat, s.supplier)
  const starterCrate = can(s, { type: 'callStarterCrate' })
  const orderName = CATEGORIES[orderCat]?.name ?? orderCat
  const weather = s.weather?.now ?? 'fair'
  const fill = Math.min(1, shelf / Math.max(1, cap))
  const [priceFlick, setPriceFlick] = useState(false)
  const pricePrev = useRef(s.price)


  useEffect(() => {
    if (pricePrev.current === s.price) return
    pricePrev.current = s.price
    if (reducedMotion) return
    setPriceFlick(true)
    const t = window.setTimeout(() => setPriceFlick(false), 280)
    return () => window.clearTimeout(t)
  }, [s.price, reducedMotion])

  const unpack = () => {
    dispatch({ type: 'unpack' })
    playUnpackFx(meta.settings.muted)
  }

  useEffect(() => {
    return () => {
      if (holdRef.current != null) window.clearInterval(holdRef.current)
    }
  }, [])

  const startHold = () => {
    if (!canHold) return
    unpack()
    holdRef.current = window.setInterval(unpack, reducedMotion ? 180 : 120)
  }
  const stopHold = () => {
    if (holdRef.current != null) {
      window.clearInterval(holdRef.current)
      holdRef.current = null
    }
  }

  const nudge = (delta: number) => {
    const next = Math.round((s.price + delta) * 10) / 10
    dispatch({ type: 'setPrice', price: Math.max(PRICE.min, Math.min(PRICE.max, next)) })
  }

  const catFill = (c: CategoryId) => {
    const n = sumQty(s.shelf, c)
    return Math.min(1, n / Math.max(1, cap / Math.max(1, unlockedCats.length)))
  }

  const celebUntil = s.campaigns?.celebrityUntil ?? 0
  const celebLeft = celebUntil > s.time ? Math.max(0, Math.ceil(celebUntil - s.time)) : 0

  const early = s.era < 1 && !earlyFloorChromeDone(s)
  const tight = shelf + back <= 0 || s.cash < 2
  const backHeavy = back > Math.max(20, shelf * 2) && shelf >= cap * 0.85
  const rent = rentPerSec(s)
  const wx =
    s.era < 1
      ? '—'
      : `${weather}${hasWeatherForecast(s) ? ` → ${s.weather?.next ?? 'fair'}` : ''}`
  const suppliersOpen = !!s.menus.suppliers
  // The limit swings shelf ↔ demand with every unpack; show it once it settles.
  const bottleneck = useStable(salesBottleneck(s), (b) => b.kind, 2000, 5000)
  const featured = featuredCategories(s)
  const repEta = reputationEtaSec(s)
  const orderDef = CATEGORIES[orderCat]
  const unit = unitCost(s, orderCat)
  const sell = shelfPrice(s, orderCat)
  const premium = valueMul(s)
  const margin = sell - unit
  const eff = effectiveLife(s, orderCat)

  const inspectCheck = can(s, { type: 'callInspector' })
  const heat = s.inspection?.meter ?? 0
  const heatHot = heat > 0.7

  const orders = s.orders ?? []
  const nextEta =
    orders.length > 0 ? Math.max(0, Math.min(...orders.map((o) => o.eta)) - s.time) : null

  const burnPerSec = (() => {
    const tracked = s.rates.cashPerSec
    if (Number.isFinite(tracked) && Math.abs(tracked) >= 0.01) return tracked < 0 ? -tracked : 0
    return Math.max(0, Math.max(s.rates.costPerSec, rent) - s.rates.revenuePerSec)
  })()
  const runwayMin = burnPerSec > 1e-6 && s.cash > 0 ? s.cash / burnPerSec / 60 : null

  const demandLow = demandPerSec(s, Math.max(PRICE.min, s.price - 0.1)) * varietyMul(s)
  const demandHigh = demandPerSec(s, Math.min(PRICE.max, s.price + 0.1)) * varietyMul(s)

  const unpackCheck = can(s, { type: 'unpack' })
  const hireClerk = can(s, { type: 'hire', role: 'clerk' })
  const hireCashier = can(s, { type: 'hire', role: 'cashier' })
  const staffOpen = !!s.menus.staff
  const marketingOpen = !!s.menus.marketing
  const canBuyCrate = s.cash >= wholesaleCost

  const bottleneckAction = (() => {
    switch (bottleneck.kind) {
      case 'shelf':
        if (back > 0) {
          return { label: `Unpack +${manualUnpackAmount(s)}`, onClick: unpack, disabled: !unpackCheck.ok }
        }
        if (canBuyCrate) {
          return {
            label: `Buy ${orderName} · ${money(wholesaleCost, numberFormat)}`,
            onClick: () => dispatch({ type: 'buyWholesale', cat: orderCat, crates: 1 }),
          }
        }
        if (suppliersOpen) return { label: 'Open Suppliers', onClick: () => setActiveMenu('suppliers') }
        return { label: 'Starter crate', onClick: () => dispatch({ type: 'callStarterCrate' }), disabled: !starterCrate.ok }
      case 'unpack':
        if (staffOpen && hireClerk.ok) {
          return { label: 'Hire clerk', onClick: () => setActiveMenu('staff') }
        }
        return { label: `Unpack +${manualUnpackAmount(s)}`, onClick: unpack, disabled: !unpackCheck.ok }
      case 'checkout':
        if (hireCashier.ok) {
          return { label: 'Hire cashier', onClick: () => dispatch({ type: 'hire', role: 'cashier' }) }
        }
        if (staffOpen) return { label: 'Open Staff', onClick: () => setActiveMenu('staff') }
        return null
      case 'demand':
      default:
        if (marketingOpen) {
          return s.cash >= s.adCost
            ? { label: `Buy ad · ${money(s.adCost, numberFormat)}`, onClick: () => dispatch({ type: 'buyAd' }) }
            : { label: 'Open Marketing', onClick: () => setActiveMenu('marketing') }
        }
        return { label: 'Lower price −10¢', onClick: () => nudge(-0.1), disabled: s.price <= PRICE.min }
    }
  })()

  const flowLine = backHeavy
    ? `Shelf full · ${qty(back)} waiting in back.`
    : `Cash → truck → backroom → Unpack. Rent ${rate(rent)}.`
  const statusLine = [
    featured.length ? `Featuring ${featured.map((c) => CATEGORIES[c].short).join(' + ')}` : null,
    Number.isFinite(repEta) && repEta > 0
      ? `Rep in ~${repEta < 60 ? `${Math.ceil(repEta)}s` : `${Math.ceil(repEta / 60)} min`}`
      : null,
    celebLeft > 0 ? `Celebrity endcap +25% · ${celebLeft}s` : null,
  ].filter(Boolean)

  const unpackBtn = (dock: boolean) => (
    <Btn
      tone="primary"
      coachId={dock ? undefined : 'floor-unpack'}
      className={`ge-unpack${dock ? ' fl-dock__btn' : ''}`}
      title="Backroom → shelf (free). Shoppers only buy shelf stock."
      disabled={back <= 0}
      onClick={unpack}
      onPointerDown={canHold ? startHold : undefined}
      onPointerUp={canHold ? stopHold : undefined}
      onPointerLeave={canHold ? stopHold : undefined}
      onPointerCancel={canHold ? stopHold : undefined}
    >
      <Icon name="unpack" size={dock ? 18 : 16} />
      Unpack
      <span className="ge-unpack__amt">+{manualUnpackAmount(s)}</span>
    </Btn>
  )

  return (
    <Panel title="Floor" purpose="Sell baskets: unpack, price, restock." lore="floor" className="fl">
      {early || (s.era < 1 && s.baskets < 25) ? (
        <p className="fl-goal" data-coach-id="floor-goal">
          <strong>Right now:</strong> unpack to the shelf. Baskets score; cash pays rent and trucks.
        </p>
      ) : null}

      <div className="fl-strip" data-coach-id="floor-weather">
        <span className={`fl-chip fl-chip--meter${shelf <= 0 ? ' is-bad' : ''}`} title="What shoppers can buy">
          <Icon name="floor" size={12} />
          <span>Shelf</span>
          <strong>
            {qty(shelf)}/{qty(cap)}
          </strong>
          <i style={{ transform: `scaleX(${fill})` }} />
        </span>
        <span className="fl-chip" title="Waiting for Unpack">
          <Icon name="backroom" size={12} />
          <span>Back</span>
          <strong>{qty(back)}</strong>
        </span>
        {s.era >= 1 ? (
          <span className={`fl-chip fl-chip--wx-${weather}`} title="Weather now (and tomorrow with the Weather Radio)">
            <WeatherGlyph kind={weather} />
            <span>Weather</span>
            <strong>{wx}</strong>
          </span>
        ) : null}
        <span className={`fl-chip${heatHot ? ' is-bad' : ''}`} title="Inspection heat. Call the inspector early when it runs hot.">
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden className="fl-ico">
            <path d="M6 1c1 2 4 3 4 6a4 4 0 0 1-8 0c0-2 1-3 2-4 .5 1 .5 2 1.5 2.5C6 4 5.5 2.5 6 1z" fill="currentColor" />
          </svg>
          <span>Heat</span>
          <strong>{Math.round(heat * 100)}%</strong>
        </span>
        {statusLine.length ? <span className="fl-strip__note">{statusLine.join(' · ')}</span> : null}
      </div>

      {!early ? (
        <div className="fl-limit" role="status" data-coach-id="floor-bottleneck">
          <p>
            <strong>Limit: {bottleneck.kind}.</strong> {bottleneck.label}
            {nextEta != null ? ` Truck in ${clock(nextEta)}${orders.length > 1 ? ` (+${orders.length - 1})` : ''}.` : ''}
            {runwayMin != null ? ` Runway ~${runwayMin < 1 ? '<1' : Math.floor(runwayMin)} min.` : ''}
          </p>
          {bottleneckAction ? (
            <Btn tone="primary" disabled={bottleneckAction.disabled} onClick={bottleneckAction.onClick}>
              {bottleneckAction.label}
            </Btn>
          ) : null}
        </div>
      ) : null}

      {!early && heatHot ? (
        <div className="fl-limit is-hot" data-coach-id="floor-inspection">
          <p>
            <strong>Inspection heat.</strong>{' '}
            {inspectCheck.ok
              ? `Call early to cut ${Math.round(INSPECTION.inspectorRelief * 100)} pts.`
              : (inspectCheck.reason ?? 'Inspector unavailable.')}
          </p>
          <Btn
            tone="primary"
            coachId="call-inspector"
            disabled={!inspectCheck.ok}
            title={!inspectCheck.ok ? inspectCheck.reason : undefined}
            onClick={() => dispatch({ type: 'callInspector' })}
          >
            Inspector · {money(INSPECTION.inspectorCost, numberFormat)}
          </Btn>
        </div>
      ) : s.era >= 1 ? (
        <p className="ge-muted" data-coach-id="floor-inspection">
          Inspection meter {Math.round(heat * 100)}%. Spoil and dirt fill it; prep memos drain it.
        </p>
      ) : null}

      <div className={`fl-grid ge-floor--wx-${weather}`}>
        <section className="fl-card fl-card--unpack" aria-label="Unpack">
          {unpackBtn(false)}
          <div className="fl-cats">
            {unlockedCats.map((c) => {
              const def = CATEGORIES[c]
              const n = sumQty(s.shelf, c)
              const oldest = s.shelf.find((b) => b.cat === c)
              const spoil = oldest ? batchSpoilFrac(s, oldest) : 0
              return (
                <div
                  key={c}
                  className={`fl-cat${spoil > 0.55 ? ' is-spoil' : ''}`}
                  title={def.life != null && oldest ? `${def.name}: oldest batch ${Math.floor(oldest.age)}s old` : `${def.name}: does not spoil`}
                >
                  <span>{def.short}</span>
                  <span className="fl-cat__bar">
                    <i style={{ transform: `scaleX(${catFill(c)})` }} />
                  </span>
                  <strong>{qty(n)}</strong>
                </div>
              )
            })}
          </div>
          <p className="fl-note" data-coach-id="floor-rent">
            {flowLine}
          </p>
        </section>

        <section
          className={`fl-card fl-card--price${priceFlick ? ' ge-price--flick' : ''}`}
          aria-label="Price"
          data-coach-id="floor-price"
          data-suggest-id="floor-price"
        >
          <h3 className="fl-card__title">
            <Icon name="price" size={14} /> Price
          </h3>
          <div className="fl-stepper">
            <button type="button" onClick={() => nudge(-0.1)} aria-label="Lower price">
              −
            </button>
            <input
              className="ge-price__input"
              type="number"
              min={PRICE.min}
              max={PRICE.max}
              step={PRICE.step}
              value={s.price}
              aria-label="Shelf price"
              onChange={(e) => {
                const v = Number(e.target.value)
                if (Number.isFinite(v)) dispatch({ type: 'setPrice', price: v })
              }}
            />
            <button type="button" onClick={() => nudge(0.1)} aria-label="Raise price">
              +
            </button>
          </div>
          {tip != null ? (
            <p className="fl-note">
              Best ≈ {money(tip, numberFormat)}{' '}
              {Math.abs(s.price - tip) >= 0.05 ? (
                <button type="button" className="fl-link" onClick={() => dispatch({ type: 'setPrice', price: tip })}>
                  Match
                </button>
              ) : (
                '· on target'
              )}
            </p>
          ) : null}
          {!early ? (
            <p className="fl-note" title="Projected demand if you nudge the price by 10¢">
              −10¢ → {rate(demandLow)} · +10¢ → {rate(demandHigh)}
            </p>
          ) : null}
          {premium > 1.001 ? (
            <p className="fl-note" title="Better stores carry premium stock: it costs more and rings up for more.">
              Premium ×{premium.toFixed(premium < 10 ? 1 : 0)}: a can rings up at {money(shelfPrice(s, 'cans'), numberFormat)}
            </p>
          ) : null}
        </section>

        <section className="fl-card fl-card--stock" aria-label="Stock" data-coach-id="floor-wholesale" data-suggest-id="floor-wholesale">
          <h3 className="fl-card__title">
            <Icon name="wholesale" size={14} /> Stock
          </h3>
          {unlockedCats.length > 1 ? (
            <div className="fl-seg" role="radiogroup" aria-label="Aisle to buy">
              {unlockedCats.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={orderCat === c}
                  className={orderCat === c ? 'is-on' : ''}
                  title={CATEGORIES[c].role}
                  onClick={() => dispatch({ type: 'setOrderCat', cat: c })}
                >
                  {CATEGORIES[c].short}
                </button>
              ))}
            </div>
          ) : null}
          {orderDef ? (
            <p className="fl-note" title={orderDef.role}>
              Sell {money(sell, numberFormat)} · cost {money(unit, numberFormat)} · margin {money(margin, numberFormat)}
              {eff != null ? ` · life ~${Math.round(eff / 60)}m` : ''}
            </p>
          ) : null}
          <div className="fl-row">
            <Btn
              tone="primary"
              disabled={s.cash < wholesaleCost}
              title={`Buy one ${orderName} crate into the backroom`}
              onClick={() => dispatch({ type: 'buyWholesale', cat: orderCat, crates: 1 })}
            >
              Buy {orderName} · {money(wholesaleCost, numberFormat)}
            </Btn>
            {starterCrate.ok || tight ? (
              <Btn
                tone="ghost"
                disabled={!starterCrate.ok}
                title={starterCrate.ok ? 'Free cans crate' : (starterCrate.reason ?? 'Not eligible')}
                onClick={() => dispatch({ type: 'callStarterCrate' })}
              >
                Starter crate
              </Btn>
            ) : null}
            {tight && suppliersOpen ? (
              <Btn tone="ghost" onClick={() => setActiveMenu('suppliers')}>
                Safety nets
              </Btn>
            ) : null}
          </div>
        </section>
      </div>

      <HelpCard title="What am I doing?">
        Pick an aisle, buy a crate (backroom), then Unpack to the shelf. Restock priority only chooses among aisles you
        already bought — it does not order for you. Price IQ shows a Best ≈ price tuned to your demand curve and
        wholesale cost; without it, nudge price and watch the projected demand.
      </HelpCard>

      <div className="fl-dock">{unpackBtn(true)}</div>
    </Panel>
  )
}

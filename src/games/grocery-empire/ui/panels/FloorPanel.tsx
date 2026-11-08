import { valueMul } from '../../sim/systems/network'
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
import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'
import { StatusBand, type StatusItem } from '../components/StatusBand'
import { Icon } from '../icons/Icon'

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
  const presentation = meta.settings.presentation
  const weather = s.weather?.now ?? 'fair'
  const fill = Math.min(1, shelf / Math.max(1, cap))
  const [priceFlick, setPriceFlick] = useState(false)
  const pricePrev = useRef(s.price)

  const showPlanogram = presentation !== 'dense' && unlockedCats.length >= 2
  const coldOn = !!s.menus.cold || (s.cold?.plants ?? 0) > 0
  const fleetOn = !!s.menus.fleet || (s.fleet?.barges ?? 0) > 0
  const plants = s.cold?.plants ?? 0
  const barges = Math.min(12, Math.max(0, Math.floor(s.fleet?.barges ?? 0)))

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
  const showPlanogramNow = showPlanogram && !early
  const tight = shelf + back <= 0 || s.cash < 2
  const backHeavy = back > Math.max(20, shelf * 2) && shelf >= cap * 0.85
  const rent = rentPerSec(s)
  const wx =
    s.era < 1
      ? '—'
      : `${weather}${hasWeatherForecast(s) ? ` → ${s.weather?.next ?? 'fair'}` : ''}`
  const suppliersOpen = !!s.menus.suppliers
  const bottleneck = salesBottleneck(s)
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

  const burnPerSec = Math.max(s.rates.costPerSec, rent) - s.rates.revenuePerSec
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

  return (
    <Panel
      title="Floor"
      purpose="Sell baskets. Unpack, price, buy crates."
      lore="floor"
    >
      {early || (s.era < 1 && s.baskets < 25) ? (
        <div className="ge-goal" data-coach-id="floor-goal">
          <strong>Right now</strong>
          <p>Unpack to the shelf. Baskets score. Cash pays rent &amp; trucks.</p>
        </div>
      ) : featured.length > 0 || (Number.isFinite(repEta) && repEta > 0) ? (
        <p className="ge-muted" style={{ marginTop: 0 }}>
          {[
            featured.length
              ? `Featuring ${featured.map((c) => CATEGORIES[c].short).join(' + ')}`
              : null,
            Number.isFinite(repEta) && repEta > 0
              ? `Rep ~${repEta < 60 ? `${Math.ceil(repEta)}s` : `${Math.ceil(repEta / 60)} min`}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
      {celebLeft > 0 ? (
        <p className="ge-coupon-war" role="status">
          Celebrity endcap · +25% demand · {celebLeft}s left
        </p>
      ) : null}

      <div data-coach-id="floor-weather">
        <StatusBand
          items={(
            [
              {
                label: 'Shelf',
                value: `${qty(shelf)} / ${qty(cap)}`,
                fill,
                tone: shelf <= 0 ? 'danger' : fill > 0.7 ? 'success' : 'accent',
                hint: 'What shoppers can buy',
              },
              {
                label: 'Back',
                value: qty(back),
                tone: back <= 0 ? 'muted' : 'accent',
                hint: 'Waiting for Unpack',
              },
              ...(s.era >= 1
                ? [
                    {
                      label: 'Wx',
                      value: wx,
                      tone: weather !== 'fair' ? 'accent' : 'muted',
                      hint: 'Weather now (and tomorrow with the Weather Radio)',
                    } satisfies StatusItem,
                  ]
                : []),
              {
                label: 'Heat',
                value: `${Math.round(heat * 100)}%`,
                fill: heat,
                tone: heatHot ? 'danger' : 'muted',
                hint: 'Inspection heat — call early when hot',
              },
            ] as StatusItem[]
          )}
        />
      </div>

      {!early ? (
        <div className="ge-dept-callout" role="status" data-coach-id="floor-bottleneck">
          <div className="ge-dept-callout__copy">
            <h3>Limit · {bottleneck.kind}</h3>
            <p>
              {bottleneck.label}
              {nextEta != null
                ? ` · Truck ${clock(nextEta)}${orders.length > 1 ? ` (+${orders.length - 1})` : ''}`
                : ''}
              {runwayMin != null
                ? ` · Runway ~${runwayMin < 1 ? '<1' : Math.floor(runwayMin)} min`
                : ''}
            </p>
          </div>
          {bottleneckAction ? (
            <Btn
              tone="primary"
              disabled={bottleneckAction.disabled}
              onClick={bottleneckAction.onClick}
            >
              {bottleneckAction.label}
            </Btn>
          ) : null}
        </div>
      ) : null}

      {!early && heatHot ? (
        <div className="ge-dept-callout is-ready" data-coach-id="floor-inspection">
          <div className="ge-dept-callout__copy">
            <h3>Inspection heat</h3>
            <p>
              {inspectCheck.ok
                ? `Call early to cut ${Math.round(INSPECTION.inspectorRelief * 100)} pts.`
                : (inspectCheck.reason ?? 'Inspector unavailable.')}
            </p>
          </div>
          <Btn
            tone="primary"
            coachId="call-inspector"
            disabled={!inspectCheck.ok}
            title={!inspectCheck.ok ? inspectCheck.reason : undefined}
            onClick={() => dispatch({ type: 'callInspector' })}
          >
            Call inspector · {money(INSPECTION.inspectorCost, numberFormat)}
          </Btn>
        </div>
      ) : null}

      <div
        className={`ge-floor ge-floor--${presentation} ge-floor--wx-${weather}${
          coldOn && presentation === 'map' ? ' ge-floor--cold-glow' : ''
        }${fleetOn && presentation === 'map' ? ' ge-floor--stars' : ''}`.trim()}
        style={{ ['--ge-shelf-fill' as string]: String(fill) }}
        aria-label={`Storefront · ${weather} · shelf ${Math.round(fill * 100)}%`}
      >
        {presentation === 'map' ? (
          <div className="ge-floor__aisle" aria-hidden>
            <div className="ge-floor__bay">A1</div>
            <div className="ge-floor__bay">A2</div>
            <div className={`ge-floor__bay${coldOn ? ' ge-floor__bay--cold' : ''}`.trim()}>
              {coldOn ? `Cold×${Math.max(1, plants)}` : 'Reg'}
            </div>
            {fleetOn ? (
              <div className="ge-floor__stars" aria-hidden>
                {Array.from({ length: Math.max(3, barges || 3) }, (_, i) => (
                  <i key={i} className="ge-floor__star" />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {showPlanogramNow ? (
          <div className="ge-planogram" aria-hidden>
            {unlockedCats.map((c) => {
              const def = CATEGORIES[c]
              const oldest = s.shelf.find((b) => b.cat === c)
              const spoil = oldest ? batchSpoilFrac(s, oldest) : 0
              return (
                <div
                  key={c}
                  className={`ge-planogram__bar${spoil > 0.55 ? ' is-spoil ge-planogram__bar--wilt' : ''}`.trim()}
                  style={{
                    ['--ge-cat-fill' as string]: String(catFill(c)),
                    ['--ge-spoil' as string]: String(spoil),
                  }}
                  title={def.short}
                >
                  <span>{def.short}</span>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className="ge-floor__desk">
          <div className="ge-floor__actions">
            <Btn
              tone="primary"
              coachId="floor-unpack"
              className="ge-unpack"
              title="Backroom → shelf (free). Shoppers only buy shelf stock."
              onClick={unpack}
              onPointerDown={canHold ? startHold : undefined}
              onPointerUp={canHold ? stopHold : undefined}
              onPointerLeave={canHold ? stopHold : undefined}
              onPointerCancel={canHold ? stopHold : undefined}
            >
              <Icon name="unpack" size={18} />
              Unpack
              <span className="ge-unpack__amt">+{manualUnpackAmount(s)}</span>
            </Btn>

            <div
              className={`ge-price${priceFlick ? ' ge-price--flick' : ''}`.trim()}
              data-coach-id="floor-price"
              data-suggest-id="floor-price"
            >
              <span className="ge-price__tag">
                <Icon name="price" size={14} /> Price
              </span>
              <div className="ge-price__row">
                <Btn tone="ghost" onClick={() => nudge(-0.1)} aria-label="Lower price">
                  −
                </Btn>
                <input
                  className="ge-price__input"
                  type="number"
                  min={PRICE.min}
                  max={PRICE.max}
                  step={PRICE.step}
                  value={s.price}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (Number.isFinite(v)) dispatch({ type: 'setPrice', price: v })
                  }}
                />
                <Btn tone="ghost" onClick={() => nudge(0.1)} aria-label="Raise price">
                  +
                </Btn>
              </div>
              {premium > 1.001 ? (
                <p className="ge-muted" title="Better stores carry premium stock: it costs more and rings up for more.">
                  Premium stock ×{premium.toFixed(premium < 10 ? 1 : 0)} — a can rings up at{' '}
                  {money(shelfPrice(s, 'cans'), numberFormat)}
                </p>
              ) : null}
              {tip != null ? (
                <div className="ge-price__tip">
                  <span className="ge-muted">Best ≈ {money(tip, numberFormat)}</span>
                  {Math.abs(s.price - tip) >= 0.05 ? (
                    <Btn
                      tone="ghost"
                      title="Set shelf price to Best"
                      onClick={() => dispatch({ type: 'setPrice', price: tip })}
                    >
                      Match
                    </Btn>
                  ) : (
                    <span className="ge-muted">On target</span>
                  )}
                </div>
              ) : null}
              {!early ? (
                <p className="ge-muted" title="Projected demand if you nudge the price by 10¢">
                  {money(Math.max(PRICE.min, s.price - 0.1), numberFormat)} → {rate(demandLow)} · {' '}
                  {money(Math.min(PRICE.max, s.price + 0.1), numberFormat)} → {rate(demandHigh)}
                </p>
              ) : null}
            </div>

            <div className="ge-floor__buy" data-coach-id="floor-wholesale" data-suggest-id="floor-wholesale">
              <span className="ge-price__tag">
                <Icon name="wholesale" size={14} /> Stock
              </span>
              {unlockedCats.length > 1 ? (
                <div className="ge-chip-row" role="group" aria-label="Aisle to buy">
                  {unlockedCats.map((c) => (
                    <Btn
                      key={c}
                      tone={orderCat === c ? 'primary' : 'ghost'}
                      title={CATEGORIES[c].role}
                      onClick={() => dispatch({ type: 'setOrderCat', cat: c })}
                    >
                      {CATEGORIES[c].short}
                    </Btn>
                  ))}
                </div>
              ) : null}
              {orderDef ? (
                <p className="ge-muted">
                  {orderDef.role} · sell {money(sell, numberFormat)} · cost{' '}
                  {money(unit, numberFormat)} · margin {money(margin, numberFormat)}
                  {eff != null ? ` · life ~${Math.round(eff / 60)}m` : ' · no spoil'}
                </p>
              ) : null}
              <Btn
                tone="primary"
                disabled={s.cash < wholesaleCost}
                title={`Buy one ${orderName} crate into the backroom`}
                onClick={() => dispatch({ type: 'buyWholesale', cat: orderCat, crates: 1 })}
              >
                Buy {orderName} · {money(wholesaleCost, numberFormat)}
              </Btn>
              <Btn
                tone="ghost"
                disabled={!starterCrate.ok}
                title={starterCrate.ok ? 'Free cans crate' : (starterCrate.reason ?? 'Not eligible')}
                onClick={() => dispatch({ type: 'callStarterCrate' })}
              >
                Starter crate
              </Btn>
            </div>
          </div>

          <div className="ge-floor__shelf-block">
            <Section label="On the shelf">
              <div className="ge-floor__shelf-head">
                <Meter
                  value={shelf}
                  max={Math.max(1, cap)}
                  label={`${qty(shelf)} / ${qty(cap)}`}
                  tone={shelf <= 0 ? undefined : 'accent'}
                />
              </div>
              <div className="ge-cat-grid">
                {unlockedCats.map((c) => {
                  const def = CATEGORIES[c]
                  const n = sumQty(s.shelf, c)
                  const oldest = s.shelf.find((b) => b.cat === c)
                  const spoil = oldest ? batchSpoilFrac(s, oldest) : 0
                  return (
                    <div
                      key={c}
                      className={`ge-cat-chip${spoil > 0.55 ? ' ge-cat-chip--spoil ge-cat-chip--wilt' : ''}`.trim()}
                      style={spoil > 0 ? { ['--ge-spoil' as string]: String(spoil) } : undefined}
                    >
                      <strong>{def.short}</strong>
                      <span>{qty(n)}</span>
                      <span className="ge-muted">
                        {def.life != null && oldest ? `age ${Math.floor(oldest.age)}s` : 'stable'}
                      </span>
                    </div>
                  )
                })}
              </div>
              {backHeavy ? (
                <p className="ge-muted ge-floor__nudge">
                  Shelf is full · {qty(back)} waiting in back. Sales free slots; then Unpack.
                </p>
              ) : (
                <p className="ge-muted ge-floor__flow" data-coach-id="floor-rent">
                  Cash → truck → backroom → Unpack. Rent {rate(rent)}.
                </p>
              )}
            </Section>
          </div>
        </div>

        {tight ? (
          <Section label="Tight week">
            <div className="ge-chip-row">
              <Btn
                tone="primary"
                disabled={!starterCrate.ok}
                title={starterCrate.ok ? 'Free cans crate' : (starterCrate.reason ?? 'Not eligible')}
                onClick={() => dispatch({ type: 'callStarterCrate' })}
              >
                Starter crate
              </Btn>
              {suppliersOpen ? (
                <Btn tone="ghost" onClick={() => setActiveMenu('suppliers')}>
                  Safety nets on Suppliers
                </Btn>
              ) : null}
            </div>
          </Section>
        ) : null}

        <HelpCard title="What am I doing?">
          Pick an aisle, buy a crate (backroom), then Unpack to the shelf. Restock priority only chooses
          among aisles you already bought — it does not order for you. Price IQ shows a Best ≈ price
          tuned to your demand curve and wholesale cost; without it, nudge price and watch the projected demand.
        </HelpCard>
      </div>
    </Panel>
  )
}

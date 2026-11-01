import { useEffect, useRef, useState } from 'react'
import { useMeta } from '@/shell/MetaContext'
import { playUnpackFx } from '@/shared/audio'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { PRICE } from '../../sim/balance'
import { can } from '../../sim/commands'
import { bestPrice, crateCost, hasWeatherForecast, manualUnpackAmount, shelfCap, up } from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import { useGame } from '../GameContext'
import { money, qty, rate } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Line } from '../components/Line'
import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

function spoilFrac(age: number | undefined, life: number | null): number {
  if (life == null || age == null) return 0
  return Math.min(1, Math.max(0, age / life))
}

export function FloorPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const { meta } = useMeta()
  const holdRef = useRef<number | null>(null)
  const canHold = up(s, 'hold-unpack') > 0
  const shelf = sumQty(s.shelf)
  const cap = shelfCap(s)
  const tip = up(s, 'price-iq') > 0 ? bestPrice(s) : null
  const wholesaleCost = crateCost(s, s.orderCat || 'cans', s.supplier)
  const starterCrate = can(s, { type: 'callStarterCrate' })
  const presentation = meta.settings.presentation
  const weather = s.weather?.now ?? 'fair'
  const fill = Math.min(1, shelf / Math.max(1, cap))
  const [priceFlick, setPriceFlick] = useState(false)
  const pricePrev = useRef(s.price)

  const unlockedCats = CATEGORY_IDS.filter((c) => s.categories[c])
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
    const next = Math.round((s.price + delta) * 100) / 100
    dispatch({ type: 'setPrice', price: Math.max(PRICE.min, Math.min(PRICE.max, next)) })
  }

  const catFill = (c: CategoryId) => {
    const n = sumQty(s.shelf, c)
    return Math.min(1, n / Math.max(1, cap / Math.max(1, unlockedCats.length)))
  }

  const celebUntil = s.campaigns?.celebrityUntil ?? 0
  const celebLeft = celebUntil > s.time ? Math.max(0, Math.ceil(celebUntil - s.time)) : 0

  const early = s.era < 1 && s.baskets < 25

  return (
    <Panel
      title="Floor"
      purpose="Unpack stock onto the shelf, set a price, and sell baskets."
      lore="floor"
    >
      {early ? (
        <div className="ge-goal" data-coach-id="floor-goal">
          <strong>Right now</strong>
          <p>
            Goal: Unpack cans onto the <em>shelf</em>, sell <em>baskets</em> (score, top-left), and
            keep <em>cash</em> for rent and trucks. Backroom = storage. Wholesale = buy more crates.
            Story dialogue writes along the bottom as you go.
          </p>
        </div>
      ) : null}
      {celebLeft > 0 ? (
        <p className="ge-coupon-war" role="status">
          Celebrity endcap · +25% demand · {celebLeft}s left
        </p>
      ) : null}
      <div
        className={`ge-floor ge-floor--${presentation} ge-floor--wx-${weather}${
          coldOn && presentation === 'map' ? ' ge-floor--cold-glow' : ''
        }${fleetOn && presentation === 'map' ? ' ge-floor--stars' : ''}`.trim()}
        style={{ ['--ge-shelf-fill' as string]: String(fill) }}
        aria-label={`Storefront · ${weather} · shelf ${Math.round(fill * 100)}%`}
      >
        <div className="ge-floor__storefront" aria-hidden />
        <div className="ge-floor__glow" aria-hidden />
        <div className="ge-floor__aisle" aria-hidden>
          {presentation === 'map' ? (
            <>
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
            </>
          ) : null}
        </div>

        {showPlanogram ? (
          <div className="ge-planogram" aria-hidden>
            {unlockedCats.map((c) => {
              const def = CATEGORIES[c]
              const oldest = s.shelf.find((b) => b.cat === c)
              const spoil = spoilFrac(oldest?.age, def.life)
              return (
                <div
                  key={c}
                  className={`ge-planogram__bar${spoil > 0.55 ? ' is-spoil' : ''}`.trim()}
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

        <Section className="ge-floor__hero">
          <div className="ge-floor__control">
            <Btn
              tone="primary"
              coachId="floor-unpack"
              className="ge-unpack"
              title="Move stock from backroom → shelf (free). Shoppers only buy shelf stock."
              onClick={unpack}
              onPointerDown={canHold ? startHold : undefined}
              onPointerUp={canHold ? stopHold : undefined}
              onPointerLeave={canHold ? stopHold : undefined}
              onPointerCancel={canHold ? stopHold : undefined}
            >
              Unpack
              <span className="ge-unpack__amt">+{manualUnpackAmount(s)}</span>
            </Btn>
            {early ? (
              <p className="ge-floor__hint">Backroom → shelf. Free. Empty shelf = no sales.</p>
            ) : null}
          </div>
          <div
            className={`ge-price${priceFlick ? ' ge-price--flick' : ''}`.trim()}
            data-coach-id="floor-price"
          >
            <span className="ge-price__tag">Shelf price</span>
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
            {early ? (
              <p className="ge-floor__hint">What shoppers pay. Start near $1.50.</p>
            ) : null}
            {tip != null ? (
              <p className="ge-muted">Best profit ≈ {money(tip, numberFormat)}</p>
            ) : null}
          </div>
        </Section>

        <Section label="Buy stock (wholesale)">
          <p className="ge-muted">
            Spends cash · trucks fill the <em>backroom</em> · then Unpack to the <em>shelf</em>.
          </p>
          <Btn
            tone="primary"
            coachId="floor-wholesale"
            disabled={s.cash < wholesaleCost}
            onClick={() => dispatch({ type: 'buyWholesale', cat: s.orderCat || 'cans', crates: 1 })}
          >
            Buy wholesale · {money(wholesaleCost, numberFormat)}
          </Btn>
          <Btn
            tone="ghost"
            disabled={!starterCrate.ok}
            aria-describedby={!starterCrate.ok ? 'ge-starter-crate-hint' : undefined}
            title={
              starterCrate.ok
                ? 'Free starter crate to the backroom (once per hour)'
                : (starterCrate.reason ?? 'Not eligible')
            }
            onClick={() => dispatch({ type: 'callStarterCrate' })}
          >
            Call starter crate
          </Btn>
          {!starterCrate.ok ? (
            <p id="ge-starter-crate-hint" className="ge-muted ge-floor__cta-hint">
              {starterCrate.reason ?? 'Not eligible'}
            </p>
          ) : null}
          <p className="ge-muted" data-coach-id="floor-rent">
            Rent ticks while you sell. Arrears cap — you cannot go bankrupt.
          </p>
        </Section>

        <Section label="Shelf (what shoppers can buy)">
          <Meter value={shelf} max={Math.max(1, cap)} label={`${qty(shelf)} / ${qty(cap)} on shelf`} tone="accent" />
          <div className="ge-cat-grid">
            {unlockedCats.map((c) => {
              const def = CATEGORIES[c]
              const n = sumQty(s.shelf, c)
              const oldest = s.shelf.find((b) => b.cat === c)
              const spoil = spoilFrac(oldest?.age, def.life)
              return (
                <div
                  key={c}
                  className={`ge-cat-chip${spoil > 0.55 ? ' ge-cat-chip--spoil' : ''}`.trim()}
                  style={spoil > 0 ? { ['--ge-spoil' as string]: String(spoil) } : undefined}
                >
                  <strong>{def.short}</strong>
                  <span>{qty(n)}</span>
                  {def.life != null && oldest ? (
                    <span className="ge-muted">age {Math.floor(oldest.age)}s</span>
                  ) : (
                    <span className="ge-muted">stable</span>
                  )}
                </div>
              )
            })}
            {unlockedCats.length === 0 ? <p className="ge-empty">No categories unlocked.</p> : null}
          </div>
        </Section>

        {unlockedCats.length >= 2 ? (
          <Section label="Category mix">
            <p className="ge-muted">
              Clerks and auto-orders lean toward higher weights. Drag to steer the aisle.
            </p>
            <div className="ge-mix" data-coach-id="floor-mix">
              {unlockedCats.map((c) => {
                const def = CATEGORIES[c]
                const w = Math.round((s.mix[c] ?? 0.5) * 100)
                return (
                  <label key={c} className="ge-mix__row">
                    <span className="ge-mix__name" title={def.name}>
                      {def.short}
                    </span>
                    <input
                      className="ge-range ge-mix__slider"
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={w}
                      aria-label={`${def.name} restock mix`}
                      onChange={(e) =>
                        dispatch({ type: 'setMix', cat: c, weight: Number(e.target.value) / 100 })
                      }
                    />
                    <span className="ge-mix__pct" aria-hidden>
                      {w}
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="ge-chip-row">
              <Btn
                tone="ghost"
                onClick={() => {
                  for (const c of unlockedCats) dispatch({ type: 'setMix', cat: c, weight: 0.5 })
                }}
              >
                Even mix
              </Btn>
              <Btn
                tone="ghost"
                onClick={() => {
                  for (const c of unlockedCats) {
                    const perish = CATEGORIES[c].life != null
                    dispatch({ type: 'setMix', cat: c, weight: perish ? 0.85 : 0.35 })
                  }
                }}
              >
                Prefer fresh
              </Btn>
            </div>
          </Section>
        ) : null}

        <Section label="Pace">
          <Line left="Sold" right={rate(s.rates.soldPerSec)} />
          <Line left="Revenue" right={rate(s.rates.revenuePerSec)} />
          <Line left="Demand" right={rate(s.rates.demandPerSec)} />
          <Line
            left="Weather"
            right={
              s.era < 1
                ? '—'
                : `${s.weather?.now ?? 'fair'}${
                    hasWeatherForecast(s) ? ` → ${s.weather?.next ?? 'fair'}` : ''
                  }`
            }
            muted
          />
          <div data-coach-id="floor-inspection">
            <Line left="Inspection" right={`${Math.round((s.inspection?.meter ?? 0) * 100)}%`} muted />
          </div>
        </Section>

        {sumQty(s.shelf) + sumQty(s.backroom) <= 0 || s.cash < 2 ? (
          <Section label="Tight week — recovery">
            <p className="ge-muted">Bad weeks only slow you. These rails never wipe the run.</p>
            <div className="ge-chip-row">
              <Btn
                tone="primary"
                coachId="emergency-delivery"
                disabled={!can(s, { type: 'emergencyDelivery' }).ok}
                onClick={() => dispatch({ type: 'emergencyDelivery' })}
              >
                Emergency delivery
              </Btn>
              <Btn
                disabled={!starterCrate.ok}
                title={
                  starterCrate.ok
                    ? 'Free starter crate to the backroom'
                    : (starterCrate.reason ?? 'Not eligible')
                }
                onClick={() => dispatch({ type: 'callStarterCrate' })}
              >
                Call starter crate
              </Btn>
              <Btn
                disabled={!can(s, { type: 'mentorRestock' }).ok}
                onClick={() => dispatch({ type: 'mentorRestock' })}
              >
                Mentor restock
              </Btn>
              <Btn disabled={!can(s, { type: 'bailout' }).ok} onClick={() => dispatch({ type: 'bailout' })}>
                Bailout
              </Btn>
            </div>
          </Section>
        ) : null}

        <HelpCard title="What am I doing?">
          Heartbeat: buy wholesale → unpack to shelf → shoppers buy → baskets + cash. Keep the shelf from emptying.
          Price near cost × 1.5–2 until Price IQ. You cannot lose — bad weeks only slow you.
        </HelpCard>
      </div>
    </Panel>
  )
}

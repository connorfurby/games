import { valueMul } from '../../sim/systems/network'
import { memo, useState } from 'react'
import { useMeta } from '@/shell/MetaContext'
import { playUnpackFx } from '@/shared/audio'
import { RegularsSheet } from './RegularsSheet'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { FACING_BY_ID, facingsFor, REGULAR_BY_ID, type RegularDef } from '../../content/depth'
import { DEPTH, HORIZON, INSPECTION, PRICE } from '../../sim/balance'
import { can, type Command } from '../../sim/commands'
import {
  bestPrice,
  crateCost,
  demandPerSec,
  effectiveLife,
  featuredCategories,
  manualUnpackAmount,
  salesBottleneck,
  shelfPrice,
  unitCost,
  up,
  varietyMul,
  climateBanPullMul,
} from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import { useGame } from '../GameContext'
import { clock, money, qty, rate } from '../format'
import { Icon } from '../icons/Icon'
import { Button, Chip, Meter, Sheet, Stepper, Toggle, SegmentedControl } from '../kit'
import { MENUS } from '../../content/menus'
import { FailReason, PlayFrame, StatusChip, Field } from '../play'
import { activeFacingBan } from '../../sim/systems/horizonVerbs'
import { useStable } from '../useStable'
import { FloorRoom } from '../scenes/room'
import './floor.css'

/** Late-era command not in the Command union yet; unknown types fail `can()` cleanly. */
const lateCmd = (cmd: { type: string; [k: string]: unknown }) => cmd as unknown as Command

/** "Maya wants tomatoes on cans" — the person behind the facing. */
function regularWant(def: RegularDef): string {
  const cats = def.wants.map((c) => CATEGORIES[c]?.name.toLowerCase() ?? c).join(' + ')
  const facing = def.facingId ? FACING_BY_ID[def.facingId] : null
  return facing ? `${def.name} wants ${facing.name.toLowerCase()} on ${cats}` : `${def.name} wants ${cats}`
}

/** Memoized: re-renders from its own context reads, not from unrelated parent renders. */
export const FloorPanel = memo(FloorPanelInner)

function FloorPanelInner() {
  const { state: s, dispatch, numberFormat, reducedMotion, setActiveMenu } = useGame()
  const { meta } = useMeta()
  const canHold = up(s, 'hold-unpack') > 0
  const shelf = sumQty(s.shelf)
  const back = sumQty(s.backroom)
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

  const unpack = () => {
    dispatch({ type: 'unpack' })
    playUnpackFx(meta.settings.muted)
  }

  const nudge = (delta: number) => {
    const next = Math.round((s.price + delta) * 10) / 10
    dispatch({ type: 'setPrice', price: Math.max(PRICE.min, Math.min(PRICE.max, next)) })
  }

  const checkoutLimitRaw = s.era >= 1 && s.stats.sold > 0 && salesBottleneck(s).kind === 'checkout'
  // The bottleneck flips with every crate; only change the callout once it settles.
  const checkoutLimit = useStable(checkoutLimitRaw, String, 2000, 5000)
  const tight = shelf + back <= 0 || s.cash < 2
  const suppliersOpen = !!s.menus.suppliers
  const featured = featuredCategories(s)
  const orderDef = CATEGORIES[orderCat]
  const unit = unitCost(s, orderCat)
  const sell = shelfPrice(s, orderCat)
  const premium = valueMul(s)
  const margin = sell - unit
  const eff = effectiveLife(s, orderCat)
  const inspectCheck = can(s, { type: 'callInspector' })
  const heat = s.inspection?.meter ?? 0
  const heatHot = heat > 0.7
  const demandLow = demandPerSec(s, Math.max(PRICE.min, s.price - 0.1)) * varietyMul(s)
  const demandHigh = demandPerSec(s, Math.min(PRICE.max, s.price + 0.1)) * varietyMul(s)
  const bay = s.era >= 7 ? (s.offworld?.bay ?? []) : []
  const restockCheck = can(s, lateCmd({ type: 'restockOffworld' }))
  const regularId = s.depth?.regulars?.activeId
  const regularDef = regularId ? REGULAR_BY_ID[regularId] : null
  const regularsMet = Object.values(s.depth?.regulars?.seen ?? {}).filter((n) => n > 0).length
  const [regularsOpen, setRegularsOpen] = useState(false)
  const serveCheck = can(s, { type: 'serveRegular' })
  const serveOk = serveCheck.ok
  const layaway = !!s.depth?.regulars?.layaway
  const waitingId = s.depth?.regulars?.waitingId
  const waitingDef = waitingId ? REGULAR_BY_ID[waitingId] : null
  const waitingLeft = Math.max(0, Math.ceil((s.depth?.regulars?.waitingPatienceUntil ?? 0) - s.time))
  const focusCheck = can(s, { type: 'focusRegular', which: 'waiting' })
  const marginPct = sell > 0 ? margin / sell : 0
  const marginTone = marginPct >= 0.3 ? 'success' : marginPct >= 0.1 ? 'warn' : 'danger'
  const unpackDisabled = back <= 0
  const facingBan = activeFacingBan(s)

  const sheets = (
    <>

      <Sheet
        open
        onClose={() => {}}
        title="Regulars"
        reducedMotion={reducedMotion}
      >
        <div className="fp-card__stack">
          <Toggle checked={s.depth?.open !== false} onChange={(on) => dispatch({ type: 'setOpen', open: on })}>
            {s.depth?.open === false ? 'Store closed' : 'Store open'}
          </Toggle>
          {unlockedCats
            .filter((c) => facingsFor(c).length > 0 && (c === 'cans' || s.era >= 1))
            .map((c) => {
              const options = facingsFor(c)
              const current = s.depth?.facings?.[c]
              return (
                <Field key={c} label={`${CATEGORIES[c].name} facing`}>
                  <SegmentedControl
                    aria-label={`${CATEGORIES[c].name} facing`}
                    value={current ?? ''}
                    onChange={(id) => dispatch({ type: 'setFacing', cat: c, facingId: id })}
                    options={options.map((f) => ({ value: f.id, label: f.name, title: f.blurb }))}
                  />
                </Field>
              )
            })}
          {facingBan ? (
            <div className="fp-row" role="status">
              <StatusChip tone="warn" title="A climate guest banned this facing. Swap it to dodge the cut, or wait for the shift to turn.">
                Guest ban · {FACING_BY_ID[facingBan.tag]?.name ?? facingBan.tag} −
                {Math.round((1 - climateBanPullMul(s)) * 100)}% pull · {clock(facingBan.until - s.time)}
              </StatusChip>
            </div>
          ) : null}
          {regularDef ? (
            <p className="fp-note" data-coach-id="floor-regular-want">
              {regularWant(regularDef)}
            </p>
          ) : null}
          {waitingDef ? (
            <div className="fp-row" role="status">
              <Chip>
                Also waiting: {waitingDef.name} · {waitingLeft}s
              </Chip>
              <Button
                size="sm"
                tone="ghost"
                disabled={!focusCheck.ok}
                title={focusCheck.ok ? regularWant(waitingDef) : focusCheck.reason}
                onClick={() => dispatch({ type: 'focusRegular', which: 'waiting' })}
              >
                Switch to {waitingDef.name}
              </Button>
            </div>
          ) : null}
          {regularDef ? (
            <div className="fp-row" role="status">
              <Chip selected>
                {regularDef.name}
                {layaway ? ' · slip' : ''} ·{' '}
                {Math.max(0, Math.ceil((s.depth?.regulars?.patienceUntil ?? 0) - s.time))}s
              </Chip>
              <Button size="sm" tone="free" disabled={!serveOk} onClick={() => dispatch({ type: 'serveRegular' })}>
                {layaway ? 'Clear slip' : 'Serve'}
              </Button>
            </div>
          ) : (
            <p className="fp-note" data-coach-id="floor-layaway">
              Nobody at the counter right now. Keep the shelf stocked and someone will drop in.
            </p>
          )}
          {s.era < 1 ? (
            <>
              <Meter
                value={s.depth?.regularSatisfied ?? 0}
                max={DEPTH.era1RegularNeed}
                label="Regulars served"
                eta={`${s.depth?.regularSatisfied ?? 0} of ${DEPTH.era1RegularNeed}`}
              />
              <Meter
                value={s.depth?.layawaySlips ?? 0}
                max={DEPTH.layawaySlipNeed}
                label="Layaway slips cleared"
                eta={`${s.depth?.layawaySlips ?? 0} of ${DEPTH.layawaySlipNeed}`}
              />
              <p className="fp-note">Some regulars pay on layaway. When one is at the counter, the big button says Clear slip.</p>
            </>
          ) : null}
          {featured.length ? (
            <p className="fp-note">Featured today: {featured.map((c) => CATEGORIES[c].name).join(', ')}</p>
          ) : null}
          {regularsMet > 0 ? (
            <Button tone="secondary" onClick={() => setRegularsOpen(true)}>
              Everyone you've met · {regularsMet}
            </Button>
          ) : null}
          {s.era >= 1 ? (
            <Button
              size="sm"
              tone="ghost"
              disabled={!can(s, { type: 'fileStandardFlagship' }).ok}
              title={
                s.depth?.flagship?.credited
                  ? `Planogram credited · ${s.depth.flagship.score.toFixed(2)}`
                  : can(s, { type: 'fileStandardFlagship' }).reason
              }
              onClick={() => dispatch({ type: 'fileStandardFlagship' })}
            >
              {s.depth?.flagship?.credited
                ? 'Planogram filed'
                : `Planogram · practice ${s.depth?.flagship?.practiceLeft ?? 0}`}
            </Button>
          ) : null}
          {s.era >= 1 &&
          sumQty(s.backroom, 'produce') +
            sumQty(s.shelf, 'produce') +
            sumQty(s.backroom, 'dairy') +
            sumQty(s.shelf, 'dairy') +
            sumQty(s.backroom, 'meat') +
            sumQty(s.shelf, 'meat') >
            0 ? (
            <div className="fp-row">
              <Button
                size="sm"
                tone="ghost"
                disabled={!can(s, { type: 'morningWriteOff', mode: 'dump' }).ok}
                onClick={() => dispatch({ type: 'morningWriteOff', mode: 'dump' })}
              >
                Write-off dump
              </Button>
              <Button
                size="sm"
                tone="ghost"
                disabled={!can(s, { type: 'morningWriteOff', mode: 'discount' }).ok}
                onClick={() => dispatch({ type: 'morningWriteOff', mode: 'discount' })}
              >
                Markdown
              </Button>
            </div>
          ) : null}
        </div>
      </Sheet>

      <Sheet
        open
        onClose={() => {}}
        title="Shelf price"
        reducedMotion={reducedMotion}
      >
        <div className="fp-card__stack">
          <div data-coach-id="floor-price-step">
            <Stepper
              label="shelf price"
              value={Number(s.price.toFixed(2))}
              step={0.1}
              min={PRICE.min}
              max={PRICE.max}
              format={(v) => money(v, numberFormat)}
              onChange={(v) => nudge(v - s.price)}
            />
          </div>
          {orderDef ? (
            <Meter
              tone={marginTone}
              value={Math.max(0, marginPct)}
              max={0.6}
              label={`${orderName}: sell ${money(sell, numberFormat)} · cost ${money(unit, numberFormat)}`}
              eta={`margin ${money(margin, numberFormat)}`}
            />
          ) : null}
          <p className="fp-proj">
            <span>10¢ less: {rate(demandLow)} shoppers</span>
            <span>10¢ more: {rate(demandHigh)} shoppers</span>
          </p>
          {tip != null ? (
            <div className="fp-row">
              <p className="fp-note">Best price ≈ {money(tip, numberFormat)}{Math.abs(s.price - tip) >= 0.05 ? '' : ' · you are on it'}</p>
              {Math.abs(s.price - tip) >= 0.05 ? (
                <Button size="sm" tone="secondary" onClick={() => dispatch({ type: 'setPrice', price: tip })}>
                  Use best price
                </Button>
              ) : null}
            </div>
          ) : null}
          {premium >= 2 ? (
            <p className="fp-note">
              Stock tier ×{qty(premium, numberFormat)} · can rings {money(shelfPrice(s, 'cans'), numberFormat)}
            </p>
          ) : null}
        </div>
      </Sheet>

      <Sheet
        open
        onClose={() => {}}
        title="Restock"
        reducedMotion={reducedMotion}
      >
        <div className="fp-card__stack">
          {unlockedCats.length > 1 ? (
            <Field label="Aisle">
              <SegmentedControl
                aria-label="Aisle to buy"
                value={orderCat}
                onChange={(c) => dispatch({ type: 'setOrderCat', cat: c })}
                options={unlockedCats.map((c) => ({ value: c, label: CATEGORIES[c].name, title: CATEGORIES[c].role }))}
              />
            </Field>
          ) : null}
          {eff != null ? <p className="fp-note">{orderName} keeps ~{Math.round(eff / 60)}m on the shelf.</p> : null}
          <div className="fp-row">
            <Button
              tone="primary"
              feedback
              coachId="floor-wholesale-buy"
              affordable={s.cash >= wholesaleCost}
              cost={money(wholesaleCost, numberFormat)}
              title={`Buy one ${orderName} crate`}
              onClick={() => dispatch({ type: 'buyWholesale', cat: orderCat, crates: 1 })}
            >
              Buy {orderName}
            </Button>
            {starterCrate.ok || tight ? (
              <Button
                tone="free"
                disabled={!starterCrate.ok}
                title={starterCrate.ok ? 'Free cans crate' : (starterCrate.reason ?? 'Not eligible')}
                onClick={() => dispatch({ type: 'callStarterCrate' })}
              >
                Starter crate
              </Button>
            ) : null}
            {tight && suppliersOpen ? (
              <Button tone="ghost" onClick={() => setActiveMenu('suppliers')}>
                Suppliers
              </Button>
            ) : null}
          </div>
        </div>
      </Sheet>

      <Sheet
        open
        deskHidden={s.era < 7}
        onClose={() => {}}
        title={`Off-world bay · ${bay.length}`}
        reducedMotion={reducedMotion}
        footer={
          <Button
            tone={restockCheck.ok ? 'primary' : 'ghost'}
            disabled={!restockCheck.ok}
            title={!restockCheck.ok ? restockCheck.reason : 'Refill from stocked worlds'}
            onClick={() => {
              dispatch(lateCmd({ type: 'restockOffworld' }))
            }}
          >
            Restock from worlds
          </Button>
        }
      >
        <div className="fp-bay">
          {bay.map((id, i) => (
            <Chip key={`${id}-${i}`}>{id}</Chip>
          ))}
          {s.era >= 9 ? (
            <Chip>Season {clock(Math.max(0, HORIZON.seasonSec - (s.horizon?.seasonT ?? 0)))}</Chip>
          ) : null}
        </div>
      </Sheet>
    </>
  )

  return (
    <section className="ge-panel fl fp">
      <PlayFrame
        purpose={MENUS.floor.purpose}
        department="Floor"
        room={<FloorRoom />}
        desks={sheets}
        tray={{
          primary: regularDef
            ? {
                label: (
                  <>
                    <Icon name="floor" size={16} />
                    {layaway ? 'Clear slip' : 'Serve'} {regularDef.name}
                  </>
                ),
                tone: 'free',
                size: 'lg',
                coachId: 'floor-serve-regular',
                disabled: !serveOk,
                title: serveOk ? undefined : serveCheck.reason,
                onClick: () => dispatch({ type: 'serveRegular' }),
              }
            : {
                label: (
                  <>
                    <Icon name="unpack" size={16} />
                    Unpack
                    <span className="ge-unpack__amt">+{manualUnpackAmount(s)}</span>
                  </>
                ),
                tone: 'free',
                size: 'lg',
                hold: canHold,
                coachId: 'floor-unpack',
                className: 'ge-unpack fp-unpack',
                title: 'Backroom → shelf. Free.',
                disabled: unpackDisabled,
                onClick: unpack,
              },
          failReason: regularDef
            ? serveCheck.reason
            : unpackDisabled
              ? 'Nothing in the backroom'
              : undefined,
          failAction:
            !regularDef && unpackDisabled && suppliersOpen
              ? { label: 'Order at Suppliers', onClick: () => setActiveMenu('suppliers') }
              : undefined,
          secondaries: [
            ...(waitingDef
              ? [
                  {
                    key: 'switch',
                    label: `Switch to ${waitingDef.name}`,
                    coachId: 'floor-switch-regular',
                    onClick: () => dispatch({ type: 'focusRegular', which: 'waiting' }),
                  },
                ]
              : []),
          ],
        }}
      >
        {checkoutLimit && s.menus.staff ? (
          <FailReason action={{ label: 'Open Staff', onClick: () => setActiveMenu('staff') }}>
            The checkout line is the limit — more cashiers would sell more.
          </FailReason>
        ) : null}
        {heatHot ? (
          <div className="fp-callout is-hot" data-coach-id="floor-inspection">
            <p>
              Heat {Math.round(heat * 100)}%
              {inspectCheck.ok ? ` — call early (−${Math.round(INSPECTION.inspectorRelief * 100)}).` : `.`}
            </p>
            <Button
              tone="primary"
              size="sm"
              coachId="call-inspector"
              disabled={!inspectCheck.ok}
              title={!inspectCheck.ok ? inspectCheck.reason : undefined}
              onClick={() => dispatch({ type: 'callInspector' })}
              cost={money(INSPECTION.inspectorCost, numberFormat)}
            >
              Inspector
            </Button>
          </div>
        ) : null}
      </PlayFrame>
      <RegularsSheet open={regularsOpen} onClose={() => setRegularsOpen(false)} />
    </section>
  )
}

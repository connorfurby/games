import { valueMul } from '../../sim/systems/network'
import { memo, useState } from 'react'
import { useMeta } from '@/shell/MetaContext'
import { playUnpackFx } from '@/shared/audio'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { facingsFor, REGULAR_BY_ID } from '../../content/depth'
import { DEPTH, HORIZON, INSPECTION, PRICE } from '../../sim/balance'
import { can, type Command } from '../../sim/commands'
import {
  bestPrice,
  crateCost,
  demandPerSec,
  effectiveLife,
  featuredCategories,
  manualUnpackAmount,
  shelfPrice,
  unitCost,
  up,
  varietyMul,
} from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import { useGame } from '../GameContext'
import { clock, money, qty, rate } from '../format'
import { Icon } from '../icons/Icon'
import { Button, Chip, Meter, Sheet, Stepper, Toggle } from '../kit'
import { PlayFrame } from '../play'
import { FloorRoom } from '../scenes/room'
import './floor.css'

/** Late-era command not in the Command union yet; unknown types fail `can()` cleanly. */
const lateCmd = (cmd: { type: string; [k: string]: unknown }) => cmd as unknown as Command

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
  const [desk, setDesk] = useState<'facing' | 'price' | 'restock' | 'bay' | null>(null)

  const unpack = () => {
    dispatch({ type: 'unpack' })
    playUnpackFx(meta.settings.muted)
  }

  const nudge = (delta: number) => {
    const next = Math.round((s.price + delta) * 10) / 10
    dispatch({ type: 'setPrice', price: Math.max(PRICE.min, Math.min(PRICE.max, next)) })
  }

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
  const serveCheck = can(s, { type: 'serveRegular' })
  const serveOk = serveCheck.ok
  const layaway = !!s.depth?.regulars?.layaway
  const marginPct = sell > 0 ? margin / sell : 0
  const marginTone = marginPct >= 0.3 ? 'success' : marginPct >= 0.1 ? 'warn' : 'danger'
  const unpackDisabled = back <= 0

  const sheets = (
    <>
      <Sheet
        open={desk === 'facing'}
        onClose={() => setDesk(null)}
        title="Facing · regulars"
        reducedMotion={reducedMotion}
        footer={
          <Button tone="ghost" onClick={() => setDesk(null)}>
            Done
          </Button>
        }
      >
        <div className="fp-card__stack">
          <Toggle checked={s.depth?.open !== false} onChange={(on) => dispatch({ type: 'setOpen', open: on })}>
            {s.depth?.open === false ? 'Closed' : 'Open'}
          </Toggle>
          {unlockedCats
            .filter((c) => facingsFor(c).length > 0 && (c === 'cans' || s.era >= 1))
            .map((c) => {
              const options = facingsFor(c)
              const current = s.depth?.facings?.[c]
              return (
                <div key={c} className="fp-aisles" role="group" aria-label={`${CATEGORIES[c].name} facing`}>
                  <span className="fp-note">{CATEGORIES[c].short}</span>
                  {options.map((f) => (
                    <span key={f.id} title={f.blurb}>
                      <Chip
                        selected={current === f.id}
                        onClick={() => dispatch({ type: 'setFacing', cat: c, facingId: f.id })}
                      >
                        {f.name}
                      </Chip>
                    </span>
                  ))}
                </div>
              )
            })}
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
              Regulars {s.depth?.regularSatisfied ?? 0}
              {s.era < 1 ? ` / ${DEPTH.era1RegularNeed}` : ''}
              {s.era < 1 ? ` · Slips ${s.depth?.layawaySlips ?? 0}/${DEPTH.layawaySlipNeed}` : ''}
              {featured.length ? ` · Feat ${featured.map((c) => CATEGORIES[c].short).join('+')}` : ''}
            </p>
          )}
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
        open={desk === 'price'}
        onClose={() => setDesk(null)}
        title="Shelf price"
        reducedMotion={reducedMotion}
        footer={
          <Button tone="ghost" onClick={() => setDesk(null)}>
            Done
          </Button>
        }
      >
        <div className="fp-card__stack">
          <Stepper
            label="shelf price"
            value={Number(s.price.toFixed(2))}
            step={0.1}
            min={PRICE.min}
            max={PRICE.max}
            format={(v) => money(v, numberFormat)}
            onChange={(v) => nudge(v - s.price)}
          />
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
            <span>−10¢ → {rate(demandLow)}</span>
            <span>+10¢ → {rate(demandHigh)}</span>
          </p>
          {tip != null ? (
            <p className="fp-note">
              Best ≈ {money(tip, numberFormat)}{' '}
              {Math.abs(s.price - tip) >= 0.05 ? (
                <button type="button" className="fp-link" onClick={() => dispatch({ type: 'setPrice', price: tip })}>
                  Match
                </button>
              ) : (
                '· on target'
              )}
            </p>
          ) : null}
          {premium >= 2 ? (
            <p className="fp-note">
              Stock tier ×{qty(premium, numberFormat)} · can rings {money(shelfPrice(s, 'cans'), numberFormat)}
            </p>
          ) : null}
        </div>
      </Sheet>

      <Sheet
        open={desk === 'restock'}
        onClose={() => setDesk(null)}
        title="Restock"
        reducedMotion={reducedMotion}
        footer={
          <Button tone="ghost" onClick={() => setDesk(null)}>
            Done
          </Button>
        }
      >
        <div className="fp-card__stack">
          {unlockedCats.length > 1 ? (
            <div className="fp-aisles" role="group" aria-label="Aisle to buy">
              {unlockedCats.map((c) => (
                <span key={c} title={CATEGORIES[c].role}>
                  <Chip selected={orderCat === c} onClick={() => dispatch({ type: 'setOrderCat', cat: c })}>
                    {CATEGORIES[c].short}
                  </Chip>
                </span>
              ))}
            </div>
          ) : null}
          {eff != null ? <p className="fp-note">{orderName} keeps ~{Math.round(eff / 60)}m on the shelf.</p> : null}
          <div className="fp-row">
            <Button
              tone="primary"
              feedback
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
        open={desk === 'bay'}
        onClose={() => setDesk(null)}
        title={`Off-world bay · ${bay.length}`}
        reducedMotion={reducedMotion}
        footer={
          <Button
            tone={restockCheck.ok ? 'primary' : 'ghost'}
            disabled={!restockCheck.ok}
            title={!restockCheck.ok ? restockCheck.reason : 'Refill from stocked worlds'}
            onClick={() => {
              dispatch(lateCmd({ type: 'restockOffworld' }))
              setDesk(null)
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
        purpose="Run the flagship: shelves, stock and the building itself."
        department="Floor"
        room={<FloorRoom />}
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
          secondaries: [
            { key: 'facing', label: 'Facing', onClick: () => setDesk('facing') },
            { key: 'price', label: 'Price', coachId: 'floor-price', onClick: () => setDesk('price') },
            { key: 'restock', label: 'Restock', coachId: 'floor-wholesale', onClick: () => setDesk('restock') },
            ...(s.era >= 7
              ? [{ key: 'bay', label: 'Bay', fact: String(bay.length), onClick: () => setDesk('bay') }]
              : []),
          ],
        }}
      >
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
      {sheets}
    </section>
  )
}

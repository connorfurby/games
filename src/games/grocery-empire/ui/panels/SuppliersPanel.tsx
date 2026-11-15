import { useState } from 'react'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { DEPTH, PRICE_LOCK, WHOLESALE } from '../../sim/balance'
import { can } from '../../sim/commands'
import {
  crateCost,
  crateSize,
  deliveryTime,
  shortShipChance,
  unitCost,
} from '../../sim/formulas'
import { canCoopOrder, coopCrateCost } from '../../sim/systems/late'
import { useGame } from '../GameContext'
import { clock, money, qty } from '../format'
import { MixPriority } from '../components/MixPriority'
import { ActionRow, PlayFrame } from '../play'
import { Badge, Button, Chip, Disclosure, EmptyState, Meter, Sheet, Toggle, Tooltip } from '../kit'
import { DockScene } from '../scenes/live'

function indexMood(index: number): { label: string; hint: string } {
  if (index < 0.88) return { label: 'Cheap', hint: 'Wholesale is soft — good time to buy.' }
  if (index > 1.08) return { label: 'Dear', hint: 'Prices are high. Buy lean or wait for a dip.' }
  return { label: 'Fair', hint: 'Normal market. Order what the shelf needs.' }
}

export function SuppliersPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const [invoiceBook, setInvoiceBook] = useState(false)
  const [dockSheet, setDockSheet] = useState(false)
  const cat = (s.orderCat in CATEGORIES ? s.orderCat : 'cans') as CategoryId
  const unlocked = CATEGORY_IDS.filter((c) => s.categories[c])
  const supplier = s.supplier === 'b' ? 'b' : 'a'
  const crates = supplier === 'b' ? WHOLESALE.supplierB.minSpools : 1
  const cost = crateCost(s, cat, supplier) * crates
  const units = crateSize(s) * crates
  const buyCheck = can(s, { type: 'buyWholesale', cat, crates })
  const dockCheck = can(s, { type: 'dockCheckIn', aisle: cat })
  const emergencyCheck = can(s, { type: 'emergencyDelivery' })
  const mentorCheck = can(s, { type: 'mentorRestock' })
  const bailoutCheck = can(s, { type: 'bailout' })
  const eta = deliveryTime(s, supplier)
  const autoOn = !!s.memos['auto-order']
  const hasB = !!s.memos['second-wholesaler']
  const mood = indexMood(s.wholesale.index)
  const unit = unitCost(s, cat, supplier)
  const shortShip = supplier === 'b' ? Math.round(shortShipChance(s) * 100) : 0
  const lockCheck = can(s, { type: 'lockWholesalePrice' })
  const lockLeft = s.priceLockUntil > s.time ? Math.ceil(s.priceLockUntil - s.time) : 0
  const coopOn = s.era >= 7
  const coopCheck = canCoopOrder(s, cat)
  const coopCost = coopCrateCost(s, cat)
  const expressCost = crateCost(s, cat, 'a')
  const budgetCrates = WHOLESALE.supplierB.minSpools
  const budgetCost = crateCost(s, cat, 'b') * budgetCrates
  const setAuto = (patch: { enabled?: boolean; maxCost?: number; minUnits?: number }) =>
    dispatch({
      type: 'setAutoRestock',
      enabled: patch.enabled ?? !!s.autoRestock.enabled,
      maxCost: patch.maxCost ?? s.autoRestock.maxCost,
      minUnits: patch.minUnits ?? s.autoRestock.minUnits,
    })

  const orders = s.orders ?? []
  const safety: {
    key: string
    label: string
    blurb: string
    check: { ok: boolean; reason?: string }
    run: () => void
    coachId?: string
  }[] = [
    {
      key: 'emergency',
      label: 'Emergency delivery',
      blurb: 'Rush crate for 1 Reputation, not cash.',
      check: emergencyCheck,
      run: () => dispatch({ type: 'emergencyDelivery' }),
      coachId: 'emergency-delivery',
    },
    {
      key: 'mentor',
      label: 'Mentor restock',
      blurb: 'Soft help when you are new and empty.',
      check: mentorCheck,
      run: () => dispatch({ type: 'mentorRestock' }),
    },
    {
      key: 'bailout',
      label: 'Bailout',
      blurb: 'Cash float when you are broke.',
      check: bailoutCheck,
      run: () => dispatch({ type: 'bailout' }),
    },
  ]
  const safetyReady = safety.some((n) => n.check.ok)
  const openInvoices = (s.depth?.invoices ?? []).filter((i) => !i.paid)
  const invoicesOnTime = s.depth?.invoicesOnTime ?? 0
  const dockReady = s.era >= 1 && dockCheck.ok

  return (
    <section className="ge-panel">
      <PlayFrame
        purpose="Buy stock and move it — trucks, cold chain, ocean lanes."
        department="Suppliers"
        room={<DockScene />}
        tray={{
          primary: dockReady
            ? {
                label: `Dock check-in · ${s.depth?.dockCheckIns ?? 0}/${DEPTH.dockCheckInNeed}`,
                tone: 'free',
                size: 'lg',
                coachId: 'suppliers-dock-check',
                onClick: () => setDockSheet(true),
              }
            : {
                label: `Buy ${crates > 1 ? `${crates} crates` : 'crate'}`,
                tone: 'primary',
                size: 'lg',
                coachId: 'floor-wholesale',
                disabled: !buyCheck.ok,
                title: !buyCheck.ok
                  ? buyCheck.reason
                  : `${qty(units)} ${CATEGORIES[cat]?.name ?? cat} · ${money(unit, numberFormat)} · ${eta.toFixed(0)}s${shortShip > 0 ? ` · ${shortShip}% short` : ''}`,
                cost: money(cost, numberFormat),
                feedback: true,
                onClick: () => dispatch({ type: 'buyWholesale', cat, crates }),
              },
          failReason: dockReady ? undefined : buyCheck.reason,
          secondaries: [
            {
              key: 'invoices',
              label: 'Invoices',
              fact: String(openInvoices.length),
              coachId: 'suppliers-invoices',
              onClick: () => setInvoiceBook(true),
            },
            ...(s.era >= 1
              ? [
                  {
                    key: 'dock',
                    label: 'Dock',
                    fact: `${s.depth?.dockCheckIns ?? 0}/${DEPTH.dockCheckInNeed}`,
                    coachId: 'suppliers-dock-check',
                    onClick: () => setDockSheet(true),
                  },
                ]
              : []),
            ...(s.memos['price-lock']
              ? [
                  {
                    key: 'lock',
                    label: lockLeft > 0 ? `Locked ${lockLeft}s` : 'Lock price',
                    disabled: !lockCheck.ok && lockLeft <= 0,
                    title: !lockCheck.ok ? lockCheck.reason : `Freeze index ${PRICE_LOCK.durationSec}s`,
                    onClick: () => dispatch({ type: 'lockWholesalePrice' }),
                  },
                ]
              : []),
          ],
        }}
      >
        <div className="p6-row">
          <Badge tone={mood.label === 'Cheap' ? 'success' : mood.label === 'Dear' ? 'warn' : 'muted'}>
            <span data-coach-id="wholesale-index">
              Index {mood.label}
              {lockLeft > 0 ? ` · locked ${lockLeft}s` : ''}
            </span>
          </Badge>
          {orders.length > 0 ? <Badge tone="muted">{orders.length} on the road</Badge> : null}
          <Badge tone="muted">
            {openInvoices.length} open · {invoicesOnTime} on time
          </Badge>
        </div>

        <div className="p6-row">
          {unlocked.map((c) => (
            <Chip key={c} selected={cat === c} onClick={() => dispatch({ type: 'setOrderCat', cat: c })}>
              {CATEGORIES[c].short}
            </Chip>
          ))}
        </div>
        <div className="p6-row">
          <button
            type="button"
            className={`p6-choice p6-choice--row${supplier === 'a' ? ' is-on' : ''}`}
            aria-pressed={supplier === 'a'}
            onClick={() => dispatch({ type: 'setSupplier', supplier: 'a' })}
          >
            <strong>Express</strong>
            <em>{money(expressCost, numberFormat)}</em>
          </button>
          <button
            type="button"
            className={`p6-choice p6-choice--row${supplier === 'b' ? ' is-on' : ''}`}
            aria-pressed={supplier === 'b'}
            disabled={!hasB}
            title={hasB ? 'Cheaper, slower, sometimes short' : 'Unlock with Second Wholesaler memo'}
            onClick={() => dispatch({ type: 'setSupplier', supplier: 'b' })}
          >
            <strong>Budget</strong>
            <em>{hasB ? money(budgetCost, numberFormat) : '—'}</em>
          </button>
          {coopOn ? (
            <Button
              tone="ghost"
              size="sm"
              disabled={!!coopCheck}
              title={coopCheck ?? 'Co-op truck'}
              onClick={() => dispatch({ type: 'coopOrder', cat })}
            >
              Co-op · {money(coopCost, numberFormat)}
            </Button>
          ) : null}
        </div>

        {orders.length > 0 ? (
          <ul className="p6-orders">
            {orders.map((o) => {
              const total = Math.max(1, deliveryTime(s, o.supplier === 'b' ? 'b' : 'a'))
              const left = Math.max(0, o.eta)
              return (
                <li key={o.id}>
                  <div className="p6-orders__top">
                    <strong>
                      {CATEGORIES[o.cat]?.name ?? o.cat} ×{qty(o.qty)}
                    </strong>
                    <span>{o.supplier === 'b' ? 'Budget' : 'Express'}</span>
                  </div>
                  <Meter value={total - left} max={total} tone="success" eta={clock(left)} />
                </li>
              )
            })}
          </ul>
        ) : null}

        {safetyReady
          ? safety.map((n) =>
              n.check.ok ? (
                <Tooltip key={n.key} content={n.blurb}>
                  <Button tone="free" size="sm" coachId={n.coachId} onClick={n.run}>
                    {n.label}
                  </Button>
                </Tooltip>
              ) : null,
            )
          : null}

        <Disclosure
          title="Auto-restock"
          actions={
            <div data-coach-id="suppliers-autorestock">
              <Toggle
                checked={!!s.autoRestock?.enabled}
                disabled={!autoOn}
                title={autoOn ? undefined : 'Buy the Auto-order memo to unlock'}
                onChange={(enabled) => setAuto({ enabled })}
              >
                {autoOn ? 'On' : 'Locked'}
              </Toggle>
            </div>
          }
        >
          <div className="p6-stack">
            <p className="p6-copy">
              {autoOn
                ? 'Reorders the aisle furthest under your Restock priority when the backroom runs low.'
                : 'Buy the Auto-order memo to let the desk reorder for you.'}
            </p>
            {autoOn ? (
              <>
                <div className="p6-row">
                  <label className="p6-field">
                    Max cost / unit
                    <input
                      type="number"
                      min={0.05}
                      step={0.05}
                      value={s.autoRestock.maxCost}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (Number.isFinite(v) && v > 0) setAuto({ maxCost: v })
                      }}
                    />
                  </label>
                  <label className="p6-field">
                    Keep in back
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={s.autoRestock.minUnits}
                      onChange={(e) => {
                        const v = Math.floor(Number(e.target.value))
                        if (Number.isFinite(v) && v >= 1) setAuto({ minUnits: v })
                      }}
                    />
                  </label>
                </div>
              </>
            ) : null}
          </div>
        </Disclosure>

        <MixPriority coachId="floor-mix" compact />
      </PlayFrame>

      <Sheet
        open={invoiceBook}
        onClose={() => setInvoiceBook(false)}
        title={`Invoice book · ${openInvoices.length} open`}
        reducedMotion={reducedMotion}
        footer={
          <Button tone="ghost" onClick={() => setInvoiceBook(false)}>
            Done
          </Button>
        }
      >
        {openInvoices.length === 0 ? (
          <EmptyState
            title="No open invoices"
            body="Pay early for a discount; late fees hit stars."
          />
        ) : (
          <div className="p6-stack">
            <p className="p6-copy">
              Pay now (×{DEPTH.invoiceEarlyDisc}) keeps the greengrocer deal. Float (×{DEPTH.invoiceLateFee}) ages
              produce.
            </p>
            {openInvoices.map((inv) => {
              const early = s.time <= inv.dueAt
              const due = inv.amount * (early ? DEPTH.invoiceEarlyDisc : DEPTH.invoiceLateFee)
              const left = Math.max(0, Math.ceil(inv.dueAt - s.time))
              const check = can(s, { type: 'payInvoice', id: inv.id })
              return (
                <ActionRow
                  key={inv.id}
                  label={`#${inv.id} ${CATEGORIES[inv.cat]?.name ?? inv.cat}`}
                  fact={`${early ? `${left}s left` : 'late'} · ${money(due, numberFormat)}`}
                  disabled={!check.ok}
                  title={check.reason}
                  onClick={() => dispatch({ type: 'payInvoice', id: inv.id })}
                />
              )
            })}
          </div>
        )}
      </Sheet>

      <Sheet
        open={dockSheet}
        onClose={() => setDockSheet(false)}
        title="Dock check-in"
        reducedMotion={reducedMotion}
        footer={
          <Button tone="ghost" onClick={() => setDockSheet(false)}>
            Done
          </Button>
        }
      >
        <div className="p6-stack" data-coach-id="suppliers-dock-check">
          <p className="p6-copy">
            Put the crate into an aisle’s back stock. Full crate is slower; short-ship is faster with fewer units.
            {(s.depth?.nextDockAt ?? 0) > s.time
              ? ` Next in ${Math.ceil((s.depth?.nextDockAt ?? 0) - s.time)}s.`
              : ''}
            {s.depth?.lastDockAisle ? ` Last → ${CATEGORIES[s.depth.lastDockAisle as CategoryId]?.short ?? s.depth.lastDockAisle}.` : ''}
          </p>
          <div className="p6-row">
            {unlocked.map((aisle) => {
              const full = can(s, { type: 'dockCheckIn', aisle })
              const short = can(s, { type: 'dockCheckIn', aisle, short: true })
              return (
                <div key={aisle} className="p6-stack" style={{ gap: '0.35rem' }}>
                  <strong>{CATEGORIES[aisle].short}</strong>
                  <Button
                    tone="free"
                    size="sm"
                    disabled={!full.ok}
                    title={full.ok ? 'Full crate' : full.reason}
                    onClick={() => {
                      dispatch({ type: 'dockCheckIn', aisle })
                      setDockSheet(false)
                    }}
                  >
                    Full
                  </Button>
                  <Button
                    tone="ghost"
                    size="sm"
                    disabled={!short.ok}
                    title={short.ok ? 'Short-ship · faster, fewer units' : short.reason}
                    onClick={() => {
                      dispatch({ type: 'dockCheckIn', aisle, short: true })
                      setDockSheet(false)
                    }}
                  >
                    Short
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      </Sheet>
    </section>
  )
}

import { waitLabel } from '../../sim/helpers'
import { useState } from 'react'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { DEPTH, PRICE_LOCK, WHOLESALE } from '../../sim/balance'
import { can } from '../../sim/commands'
import {
  backroomCap,
  crateCost,
  crateSize,
  doorOverflow,
  deliveryTime,
  shortShipChance,
  unitCost,
} from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import { canCoopOrder, coopCrateCost } from '../../sim/systems/late'
import { useGame } from '../GameContext'
import { clock, money, qty } from '../format'
import { MENUS } from '../../content/menus'
import { FailReason, Field, FieldSet, PlayFrame } from '../play'
import { Badge, Button, Meter, SegmentedControl, Sheet, Toggle, Tooltip } from '../kit'
import { DockScene } from '../scenes/live'

const MAX_CRATES = 200

function indexMood(index: number): { label: string; hint: string } {
  if (index < 0.88) return { label: 'Low', hint: 'Crates are cheap right now: a good time to buy.' }
  if (index > 1.08) return { label: 'High', hint: 'Crates cost more right now. Buy only what you need, or wait.' }
  return { label: 'Normal', hint: 'Normal prices. Order what the shelf needs.' }
}

export function SuppliersPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion, setActiveMenu } = useGame()
  const [qtyPick, setQtyPick] = useState<number | 'fill'>(1)
  const cat = (s.orderCat in CATEGORIES ? s.orderCat : 'cans') as CategoryId
  const unlocked = CATEGORY_IDS.filter((c) => s.categories[c])
  const supplier = s.supplier === 'b' ? 'b' : 'a'
  const minCrates = supplier === 'b' ? WHOLESALE.supplierB.minSpools : 1
  const eachCost = crateCost(s, cat, supplier)
  const eachUnits = crateSize(s)
  const pendingUnits = (s.orders ?? []).reduce((n, o) => n + o.qty, 0)
  const backRoom = Math.max(0, backroomCap(s) + doorOverflow(s) - sumQty(s.backroom) - pendingUnits)
  // Fill = as many crates as cash covers, never more than the backroom can take (door refunds the rest).
  const fillCrates = Math.max(
    minCrates,
    Math.min(
      eachCost > 0 ? Math.floor(s.cash / eachCost) : 1,
      Math.floor(backRoom / Math.max(1, eachUnits)),
      MAX_CRATES,
    ),
  )
  const qtySteps = Array.from(new Set([minCrates, 5].filter((n) => n >= minCrates)))
  const crates = qtyPick === 'fill' ? fillCrates : Math.max(minCrates, qtyPick)
  const cost = eachCost * crates
  const units = eachUnits * crates
  const backroomTight = backRoom < units && s.menus.build
  const buyCheck = can(s, { type: 'buyWholesale', cat, crates })
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
  const autoPay = s.depth?.autoPayInvoices ?? true
  const payAll = can(s, { type: 'payAllInvoices' })
  const totalDue = openInvoices.reduce(
    (n, i) => n + i.amount * (s.time <= i.dueAt ? DEPTH.invoiceEarlyDisc : DEPTH.invoiceLateFee),
    0,
  )
  const invoicesOnTime = s.depth?.invoicesOnTime ?? 0

  return (
    <section className="ge-panel">
      <PlayFrame
        purpose={MENUS.suppliers.purpose}
        department="Suppliers"
        room={<DockScene />}
        desks={
          <>
      <Sheet
        open
        onClose={() => {}}
        title={openInvoices.length ? `Invoices · ${openInvoices.length} to pay` : 'Invoices'}
        className="pf-desk--invoices"
        deskHidden={openInvoices.length === 0 && invoicesOnTime === 0}
      >
        <Toggle
          checked={autoPay}
          onChange={(on) => dispatch({ type: 'setAutoPayInvoices', on })}
        >
          Pay invoices automatically when I have the cash
        </Toggle>
        {openInvoices.length === 0 ? (
          <p className="p6-copy">
            {autoPay ? 'Nothing owed. New invoices are paid for you, early, so you keep the discount.' : 'All paid.'}{' '}
            {invoicesOnTime} paid on time so far.
          </p>
        ) : (
          <div className="p6-stack">
            <p className="p6-copy">
              Some crates arrive on credit. Paying before the timer runs out saves{' '}
              {money(openInvoices.reduce((n, i) => n + i.amount * (1 - DEPTH.invoiceEarlyDisc), 0), numberFormat)}; late
              costs more, and a full book stops new orders.
            </p>
            {payAll.ok ? (
              <Button tone="primary" feedback cost={money(totalDue, numberFormat)} onClick={() => dispatch({ type: 'payAllInvoices' })}>
                Pay all {openInvoices.length}
              </Button>
            ) : (
              <p className="p6-muted">{payAll.reason}</p>
            )}
            {openInvoices.map((inv) => {
              const early = s.time <= inv.dueAt
              const due = inv.amount * (early ? DEPTH.invoiceEarlyDisc : DEPTH.invoiceLateFee)
              const left = Math.max(0, Math.ceil(inv.dueAt - s.time))
              return (
                <div key={inv.id} className="p6-invoice">
                  <span className="p6-invoice__what">
                    <strong>{CATEGORIES[inv.cat]?.name ?? inv.cat} crate</strong>
                    <span className={early ? 'p6-muted' : 'p6-late'}>{early ? `Discount for ${left}s` : 'Late — costs more'}</span>
                  </span>
                  <span className="p6-muted">{money(due, numberFormat)}</span>
                </div>
              )
            })}
          </div>
        )}
      </Sheet>

      <Sheet open onClose={() => {}} title={`Dock check-in · ${s.depth?.dockCheckIns ?? 0} of ${DEPTH.dockCheckInNeed}`} deskHidden={s.era < 1}>
        <div className="p6-stack" data-coach-id="suppliers-dock-check">
          <p className="p6-copy">
            {(s.depth?.dockCheckIns ?? 0) < DEPTH.dockAutoAfter
              ? 'Choose which aisle gets the truck. After a few by hand, a receiver on shift finishes the rest.'
              : s.depth?.autoDock !== false
                ? 'Your receiver is checking trucks in. Pick an aisle below if you want the next one by hand.'
                : 'When a truck checks in, choose which aisle gets it. A short crate is quicker with fewer units.'}
            {(s.depth?.nextDockAt ?? 0) > s.time
              ? ` Next truck in ${waitLabel((s.depth?.nextDockAt ?? 0) - s.time)}.`
              : ''}{' '}
            {s.depth?.dockCheckIns ?? 0}/{DEPTH.dockCheckInNeed} for the side yard.
          </p>
          {(() => {
            // One tap: send the truck to the aisle with the least back stock.
            const stockOf = (cat: string) =>
              s.backroom.filter((b) => b.cat === cat).reduce((n, b) => n + b.qty, 0) +
              s.shelf.filter((b) => b.cat === cat).reduce((n, b) => n + b.qty, 0)
            const pick = unlocked
              .filter((aisle) => can(s, { type: 'dockCheckIn', aisle }).ok)
              .sort((a, b) => stockOf(a) - stockOf(b))[0]
            return pick && unlocked.length > 1 ? (
              <Button tone="primary" feedback onClick={() => dispatch({ type: 'dockCheckIn', aisle: pick })}>
                Check in to {CATEGORIES[pick].name} (lowest stock)
              </Button>
            ) : null
          })()}
          <div className="p6-stack">
            {unlocked.map((aisle) => {
              const full = can(s, { type: 'dockCheckIn', aisle })
              const short = can(s, { type: 'dockCheckIn', aisle, short: true })
              return (
                full.ok || short.ok ? (
                <div key={aisle} className="p6-dockrow">
                  <strong>{CATEGORIES[aisle].name}</strong>
                  {full.ok ? <Button
                    tone="free"
                    size="sm"
                    onClick={() => dispatch({ type: 'dockCheckIn', aisle })}
                  >
                    Full crate
                  </Button> : null}
                  {short.ok ? <Button
                    tone="secondary"
                    size="sm"
                    onClick={() => dispatch({ type: 'dockCheckIn', aisle, short: true })}
                  >
                    Short crate
                  </Button> : null}
                </div>
                ) : null
              )
            })}
          </div>
        </div>
      </Sheet>
      <Sheet open onClose={() => {}} title="Auto-restock">
        <div className="p6-stack" data-coach-id="suppliers-autorestock">
          {autoOn ? (
            <>
              <Toggle
                checked={!!s.autoRestock?.enabled}
                onChange={(enabled) => dispatch({ type: 'setAutoRestock', enabled })}
              >
                {s.autoRestock?.enabled ? 'Reordering for you' : 'Off'}
              </Toggle>
              <p className="p6-copy">
                Fills the backroom at today’s price, emptiest aisle first. You can still order by hand.
              </p>
            </>
          ) : (
            <p className="p6-copy">Buy the Auto-order memo and the desk will reorder for you.</p>
          )}
        </div>
      </Sheet>
          </>
        }
        tray={{
          primary: {
                label: `Buy ${crates > 1 ? `${crates} crates` : 'crate'}${qtyPick === 'fill' ? ' (fill)' : ''}`,
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
          failReason: buyCheck.reason,
          failAction:
            !buyCheck.ok && openInvoices.length > 0 && /invoice/i.test(buyCheck.reason ?? '')
              ? {
                  label: 'Pay an invoice',
                  onClick: () =>
                    document
                      .querySelector('.pf-desk--invoices')
                      ?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' }),
                }
              : undefined,        }}
      >
        <div className="p6-row">
          <Badge tone={mood.label === 'Low' ? 'success' : mood.label === 'High' ? 'warn' : 'muted'}>
            <span data-coach-id="wholesale-index">
              Prices {mood.label.toLowerCase()}
              {lockLeft > 0 ? ` · locked ${lockLeft}s` : ''}
            </span>
          </Badge>
          {orders.length > 0 ? <Badge tone="muted">{orders.length} on the road</Badge> : null}
        </div>

        <FieldSet title="Your order">
          <Field
            label="Crates"
            note={`${crates} × ${qty(eachUnits)} = ${qty(units)} units · ${money(cost, numberFormat)}`}
          >
            <SegmentedControl
              aria-label="Crates per order"
              value={qtyPick === 'fill' ? 'fill' : String(crates)}
              onChange={(v) => setQtyPick(v === 'fill' ? 'fill' : Number(v))}
              options={[
                ...qtySteps.map((n) => ({ value: String(n), label: `×${n}` })),
                {
                  value: 'fill',
                  label: `Fill (${fillCrates})`,
                  title: `As many crates as your cash covers, up to the room left in the backroom (${fillCrates})`,
                },
              ]}
            />
          </Field>
          {unlocked.length > 1 ? (
            <Field label="Aisle">
              <SegmentedControl
                aria-label="Aisle to order for"
                value={cat}
                onChange={(c) => dispatch({ type: 'setOrderCat', cat: c })}
                options={unlocked.map((c) => ({ value: c, label: CATEGORIES[c].name, title: CATEGORIES[c].name }))}
              />
            </Field>
          ) : null}
          <Field
            label="Supplier"
            note={hasB ? 'Budget is cheaper, slower and sometimes short.' : 'Budget unlocks with the Second Wholesaler memo.'}
          >
            {!hasB ? (
              <p className="pf-field__static">Express · {money(expressCost, numberFormat)}</p>
            ) : (
            <SegmentedControl
              aria-label="Supplier"
              value={supplier === 'b' ? 'b' : 'a'}
              onChange={(v) => dispatch({ type: 'setSupplier', supplier: v })}
              options={[
                { value: 'a', label: `Express · ${money(expressCost, numberFormat)}` },
                {
                  value: 'b',
                  label: hasB ? `Budget · ${money(budgetCost, numberFormat)}` : 'Budget · locked',
                  disabled: !hasB,
                  title: hasB ? 'Cheaper, slower, sometimes short' : 'Unlock with the Second Wholesaler memo',
                },
              ]}
            />
            )}
            {coopOn ? (
              <Button
                tone="secondary"
                size="sm"
                disabled={!!coopCheck}
                title={coopCheck ?? 'Co-op truck'}
                onClick={() => dispatch({ type: 'coopOrder', cat })}
              >
                Co-op · {money(coopCost, numberFormat)}
              </Button>
            ) : null}
          </Field>
          {s.memos['price-lock'] ? (
            <Field label="Price lock" note={`Freeze today's wholesale price for ${PRICE_LOCK.durationSec}s.`}>
              {lockLeft > 0 ? (
                <span className="p6-copy">Locked for {lockLeft}s</span>
              ) : lockCheck.ok ? (
                <Button tone="secondary" size="sm" onClick={() => dispatch({ type: 'lockWholesalePrice' })}>
                  Lock price
                </Button>
              ) : (
                <span className="p6-copy">{lockCheck.reason}</span>
              )}
            </Field>
          ) : null}
        </FieldSet>
        {backroomTight ? (
          <FailReason action={{ label: 'Open Build', onClick: () => setActiveMenu('build') }}>
            Backroom can’t hold this order — extra crates are refused at the door.
          </FailReason>
        ) : null}

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

        {/* Restock priority lives on Backroom, where unpacking happens; one home, no duplicate desk. */}
      </PlayFrame>

    </section>
  )
}

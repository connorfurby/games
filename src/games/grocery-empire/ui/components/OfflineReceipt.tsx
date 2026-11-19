import type { OfflineReceipt as Receipt } from '../../sim/state'
import type { MenuId } from '../../content/menus'
import type { Suggestion } from '../../sim/suggestions'
import { can } from '../../sim/commands'
import { useGame } from '../GameContext'
import { money, qty } from '../format'
import { Btn } from './Btn'
import { Line } from './Line'

/** A front-page line from the numbers — the moment you come back to. */
function pocketQty(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (n < 10) return n.toFixed(1)
  return qty(n)
}

function headline(r: Receipt): string {
  const hours = r.cappedSeconds / 3600
  const when = hours >= 6 ? 'overnight' : hours >= 1 ? `in ${Math.floor(hours)} hour${hours >= 2 ? 's' : ''}` : 'while you stepped out'
  if (r.sold <= 0) return `Quiet aisles ${when}: the doors stayed open, nobody bought`
  const base = `Store sells ${qty(r.sold)} baskets ${when}, takes ${money(r.revenue)}`
  if (r.spoiled > r.sold * 0.1) return `${base} — ${qty(r.spoiled)} items go bad`
  return base
}

export function OfflineReceiptModal({
  receipt,
  reducedMotion: _reducedMotion,
  onDismiss,
  followUp,
  onFollowUp,
  nudge,
  onNudge,
}: {
  receipt: Receipt
  reducedMotion: boolean
  onDismiss: () => void
  /** Top next-best suggestion — one tap to jump there after filing the receipt. */
  followUp?: Suggestion | null
  onFollowUp?: (s: Suggestion) => void
  /** Department nudge (e.g. Floor unpack / Backroom) — closes the receipt and jumps. */
  nudge?: { menu: MenuId; label: string; hint?: string } | null
  onNudge?: (menu: MenuId) => void
}) {
  const { state: s, dispatch } = useGame()
  // "Do the obvious": everything that piled up while you were gone, in one tap.
  const tillCash = Object.values(s.ventures).reduce((n, v) => n + (v?.stored ?? 0), 0)
  const owed = (s.depth?.invoices ?? []).filter((i) => !i.paid).length
  const chores: string[] = []
  if (tillCash > 0) chores.push(`collect ${money(tillCash)} from tills`)
  if (owed > 0 && can(s, { type: 'payAllInvoices' }).ok) chores.push(`pay ${owed} invoice${owed === 1 ? '' : 's'}`)
  const tidy = () => {
    if (tillCash > 0) dispatch({ type: 'collectAllVentures' })
    if (owed > 0) dispatch({ type: 'payAllInvoices' })
    onDismiss()
  }
  return (
    <div className="ge-modal" role="dialog" aria-labelledby="ge-offline-title">
      {/* Prints in via CSS (g2-print in shell.css). */}
      <div className="ge-receipt-paper">
        <div className="ge-receipt-paper__perf" />
        <p className="ge-receipt-paper__epigraph">While you were away</p>
        <h3 id="ge-offline-title" className="ge-receipt-headline">
          {headline(receipt)}
        </h3>
        <p className="ge-muted">
          {awayLabel(receipt.seconds)}
          {receipt.seconds > receipt.cappedSeconds ? '. The store keeps going for up to 8 hours.' : '.'}
        </p>
        <div className="ge-receipt-lines">
          <Line left="Sold" right={qty(receipt.sold)} />
          <Line left="Revenue" right={money(receipt.revenue)} />
          {receipt.spoiled > 0 ? <Line left="Spoiled" right={qty(receipt.spoiled)} muted /> : null}
          <Line left="Wages" right={money(-receipt.wages)} muted />
          <Line left="Rent" right={money(-receipt.rent)} muted />
          {receipt.ventures > 0 ? <Line left="Ventures" right={money(receipt.ventures)} /> : null}
          {receipt.interest > 0 ? <Line left="Interest" right={money(receipt.interest)} /> : null}
          {receipt.attention > 0 ? <Line left="Attention" right={`+${qty(receipt.attention)}`} /> : null}
          {(receipt.survey ?? 0) > 0 ? <Line left="Survey" right={`+${pocketQty(receipt.survey)}`} /> : null}
          {(receipt.freight ?? 0) > 0 ? <Line left="Freight" right={`+${pocketQty(receipt.freight)}`} /> : null}
          {(receipt.seed ?? 0) > 0 ? <Line left="Seed" right={`+${pocketQty(receipt.seed)}`} /> : null}
          {(receipt.signal ?? 0) > 0 ? <Line left="Signal" right={`+${pocketQty(receipt.signal)}`} /> : null}
          {(receipt.seal ?? 0) > 0 ? <Line left="Seal" right={`+${pocketQty(receipt.seal)}`} /> : null}
        </div>
        <div className="ge-chip-row ge-receipt-actions">
          {chores.length > 0 ? (
            <Btn tone="primary" onClick={tidy} title={`One tap: ${chores.join(', ')}.`}>
              Catch up: {chores.join(' · ')}
            </Btn>
          ) : null}
          <Btn tone={chores.length > 0 ? 'secondary' : 'primary'} onClick={onDismiss}>
            Back to work
          </Btn>
          {nudge && onNudge && followUp?.channel !== nudge.menu ? (
            <Btn
              tone="secondary"
              title={nudge.hint}
              onClick={() => {
                onDismiss()
                onNudge(nudge.menu)
              }}
            >
              {nudge.label}
            </Btn>
          ) : null}
          {followUp && onFollowUp ? (
            <Btn
              tone="secondary"
              title={followUp.blurb}
              onClick={() => {
                onDismiss()
                onFollowUp(followUp)
              }}
            >
              Next: {followUp.title}
            </Btn>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** "You were away 8 hours" / "25 minutes": plain time, no simulation talk. */
function awayLabel(sec: number): string {
  const min = Math.max(1, Math.round(sec / 60))
  if (min < 60) return `You were away ${min} minute${min === 1 ? '' : 's'}`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `You were away ${h} hour${h === 1 ? '' : 's'}${m ? ` ${m} min` : ''}`
}

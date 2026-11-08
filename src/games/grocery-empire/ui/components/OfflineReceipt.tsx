import { motion } from 'motion/react'
import type { OfflineReceipt as Receipt } from '../../sim/state'
import type { MenuId } from '../../content/menus'
import type { Suggestion } from '../../sim/suggestions'
import { money, qty } from '../format'
import { Btn } from './Btn'
import { Line } from './Line'

export function OfflineReceiptModal({
  receipt,
  reducedMotion,
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
  return (
    <div className="ge-modal" role="dialog" aria-labelledby="ge-offline-title">
      <motion.div
        className="ge-receipt-paper"
        initial={reducedMotion ? false : { y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.35, ease: 'easeOut' }}
      >
        <div className="ge-receipt-paper__perf" />
        <h3 id="ge-offline-title">While you were away</h3>
        <p className="ge-receipt-paper__epigraph">
          The aisle kept walking. Here is what the tape remembered.
        </p>
        <p className="ge-muted">
          {Math.floor(receipt.cappedSeconds / 60)} min simulated
          {receipt.seconds > receipt.cappedSeconds ? ' (capped at 8h)' : ''}
        </p>
        <div className="ge-receipt-lines">
          <Line left="Sold" right={qty(receipt.sold)} />
          <Line left="Revenue" right={money(receipt.revenue)} />
          <Line left="Spoiled" right={qty(receipt.spoiled)} muted />
          <Line left="Wages" right={money(-receipt.wages)} muted />
          <Line left="Rent" right={money(-receipt.rent)} muted />
          {receipt.ventures > 0 ? <Line left="Ventures" right={money(receipt.ventures)} /> : null}
          {receipt.interest > 0 ? <Line left="Interest" right={money(receipt.interest)} /> : null}
          {receipt.attention > 0 ? <Line left="Attention" right={`+${qty(receipt.attention)}`} /> : null}
        </div>
        <p className="ge-muted" style={{ marginTop: '0.75rem' }}>
          Stamp this first — the floor tour waits underneath.
        </p>
        <div className="ge-chip-row">
          <Btn tone="primary" onClick={onDismiss}>
            Stamp &amp; file
          </Btn>
          {nudge && onNudge && followUp?.channel !== nudge.menu ? (
            <Btn
              tone="ghost"
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
              tone="ghost"
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
      </motion.div>
    </div>
  )
}

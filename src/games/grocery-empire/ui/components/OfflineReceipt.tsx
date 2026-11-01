import { motion } from 'motion/react'
import type { OfflineReceipt as Receipt } from '../../sim/state'
import { money, qty } from '../format'
import { Btn } from './Btn'
import { Line } from './Line'

export function OfflineReceiptModal({
  receipt,
  reducedMotion,
  onDismiss,
}: {
  receipt: Receipt
  reducedMotion: boolean
  onDismiss: () => void
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
        <Btn tone="primary" onClick={onDismiss}>
          Stamp &amp; file
        </Btn>
      </motion.div>
    </div>
  )
}

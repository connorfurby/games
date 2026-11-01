import { useState } from 'react'
import { LEDGER_SKINS } from '@/cosmetics/packs'
import { useMeta } from '@/shell/MetaContext'
import type { GameState, LedgerKind } from '../../sim/state'
import { clock } from '../format'

const KIND_CLASS: Record<LedgerKind, string> = {
  info: '',
  good: 'ge-ledger__row--good',
  warn: 'ge-ledger__row--warn',
  memo: 'ge-ledger__row--memo',
  recovery: 'ge-ledger__row--recovery',
  era: 'ge-ledger__row--era',
  staff: 'ge-ledger__row--staff',
  sale: 'ge-ledger__row--sale',
  story: 'ge-ledger__row--story',
}

const KIND_OPTS: { value: 'all' | LedgerKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'info', label: 'Info' },
  { value: 'good', label: 'Good' },
  { value: 'warn', label: 'Warn' },
  { value: 'memo', label: 'Memo' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'era', label: 'Era' },
  { value: 'staff', label: 'Staff' },
  { value: 'sale', label: 'Sale' },
  { value: 'story', label: 'Story' },
]

export function Ledger({ state, limit = 12 }: { state: GameState; limit?: number }) {
  const { meta } = useMeta()
  const [kind, setKind] = useState<'all' | LedgerKind>('all')
  const skin =
    LEDGER_SKINS.find((s) => s.id === meta.equippedLedgerSkin) ?? LEDGER_SKINS[0]
  const skinClass = skin.cssClass
  const filtered =
    kind === 'all'
      ? state.ledger ?? []
      : (state.ledger ?? []).filter((e) => e.kind === kind)
  const rows = filtered.slice(-limit).reverse()
  if (!rows.length) {
    return (
      <div className={`ge-ledger ge-ledger--empty ${skinClass}`} data-coach-id="ledger">
        <div className="ge-ledger__toolbar">
          <label className="ge-ledger__filter">
            <span className="ge-sr-only">Ledger kind</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as 'all' | LedgerKind)}
              aria-label="Filter ledger by kind"
            >
              {KIND_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <span>{kind === 'all' ? 'Ledger blank. Sales will write themselves here.' : 'No entries for this kind.'}</span>
      </div>
    )
  }
  return (
    <div className={`ge-ledger ${skinClass}`} data-coach-id="ledger">
      <div className="ge-ledger__toolbar">
        <label className="ge-ledger__filter">
          <span className="ge-sr-only">Ledger kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as 'all' | LedgerKind)}
            aria-label="Filter ledger by kind"
          >
            {KIND_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {rows.map((e) => (
        <div key={e.id} className={`ge-ledger__row ${KIND_CLASS[e.kind] ?? ''}`.trim()}>
          <span className="ge-ledger__t">{clock(e.t)}</span>
          <span className="ge-ledger__text">{e.text}</span>
        </div>
      ))}
    </div>
  )
}

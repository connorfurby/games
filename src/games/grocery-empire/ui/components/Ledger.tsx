import { useMemo, useState } from 'react'
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

const CHIP_OPTS: { value: 'all' | LedgerKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'warn', label: 'Warn' },
  { value: 'memo', label: 'Memo' },
  { value: 'staff', label: 'Staff' },
  { value: 'story', label: 'Story' },
  { value: 'era', label: 'Era' },
]

export function Ledger({
  state,
  limit = 10,
  hideStory = false,
  inline = false,
}: {
  state: GameState
  limit?: number
  /** When StoryBanner is showing the latest story beat, skip duplicating it here. */
  hideStory?: boolean
  /** Its own tab (e.g. the Memos drawer): always open, no toggle. */
  inline?: boolean
}) {
  const { meta } = useMeta()
  const [kind, setKind] = useState<'all' | LedgerKind>('all')
  const [openState, setOpen] = useState(false)
  const open = inline || openState
  const skin =
    LEDGER_SKINS.find((s) => s.id === meta.equippedLedgerSkin) ?? LEDGER_SKINS[0]
  const skinClass = skin.cssClass

  const filtered = useMemo(() => {
    let rows = state.ledger ?? []
    if (hideStory) rows = rows.filter((e) => e.kind !== 'story')
    if (kind !== 'all') rows = rows.filter((e) => e.kind === kind)
    return rows
  }, [state.ledger, state.nextLedgerId, kind, hideStory])

  const rows = filtered.slice(-limit).reverse()
  const latest = filtered[filtered.length - 1]
  const warnWaiting = (state.ledger ?? []).some(
    (e) => e.kind === 'warn' || e.kind === 'recovery',
  )

  return (
    <div
      className={`ge-ledger ${skinClass}${open ? ' is-open' : ' is-collapsed'}`.trim()}
      data-coach-id="ledger"
    >
      {open ? (
        <div id="ge-ledger-drawer" className="ge-ledger__drawer" role="region" aria-label="Ledger">
          <div className="ge-ledger__toolbar">
            {inline ? null : <span className="ge-ledger__title">Ledger</span>}
            <div className="ge-ledger__chips" role="tablist" aria-label="Filter ledger">
              {CHIP_OPTS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="tab"
                  aria-selected={kind === o.value}
                  className={`ge-ledger__chip${kind === o.value ? ' is-on' : ''}`}
                  onClick={() => setKind(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {!rows.length ? (
            <p className="ge-ledger--empty">
              {kind === 'all'
                ? 'Ledger blank. Sales will write themselves here.'
                : 'No entries for this filter.'}
            </p>
          ) : (
            <div className="ge-ledger__list">
              {rows.map((e) => (
                <div key={e.id} className={`ge-ledger__row ${KIND_CLASS[e.kind] ?? ''}`.trim()}>
                  <span className="ge-ledger__t">{clock(e.t)}</span>
                  <span className="ge-ledger__kind" aria-hidden>
                    {e.kind}
                  </span>
                  <span className="ge-ledger__text">{e.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {inline ? null : (
      <button
        type="button"
        className={`ge-ledger__tab${warnWaiting && !open ? ' has-warn' : ''}`.trim()}
        aria-expanded={open}
        aria-controls="ge-ledger-drawer"
        title={open ? 'Hide ledger' : latest ? `Ledger · ${latest.text}` : 'Open ledger'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ge-ledger__tab-label">Ledger</span>
        <span className="ge-ledger__chevron" aria-hidden>
          {open ? '▾' : '▴'}
        </span>
      </button>
      )}
    </div>
  )
}

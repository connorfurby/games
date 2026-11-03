import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import type { NumberFormat } from '@/shared/bn'
import { playMemoFx } from '@/shared/audio'
import { useMeta } from '@/shell/MetaContext'
import { MEMOS, type MemoDef } from '../../content/memos'
import { attentionCap } from '../../sim/formulas'
import { useGame } from '../GameContext'
import { money, qty } from '../format'
import { Btn } from '../components/Btn'
import { Line } from '../components/Line'
import { Meter } from '../components/Meter'
import { Section } from '../components/Section'
import { Icon } from '../icons/Icon'

function costLabel(def: MemoDef, s: Parameters<MemoDef['cost']>[0], fmt: NumberFormat) {
  let c: { cash?: number; attention?: number; ideas?: number } = {}
  try {
    c = def.cost(s)
  } catch {
    return '—'
  }
  const parts: string[] = []
  if (c.cash) parts.push(money(c.cash, fmt))
  if (c.attention) parts.push(`${qty(c.attention)} Att`)
  if (c.ideas) parts.push(`${qty(c.ideas)} Ide`)
  return parts.join(' · ') || 'Free'
}

function canAfford(def: MemoDef, s: Parameters<MemoDef['cost']>[0]) {
  try {
    const c = def.cost(s)
    if ((c.cash ?? 0) > s.cash) return false
    if ((c.attention ?? 0) > s.compute.attention) return false
    if ((c.ideas ?? 0) > s.compute.ideas) return false
    if (def.blocked?.(s)) return false
    return true
  } catch {
    return false
  }
}

export function MemosPanel({ compact }: { compact?: boolean }) {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const { meta } = useMeta()
  const [q, setQ] = useState('')
  const [affordableOnly, setAffordableOnly] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)

  const visible = MEMOS.filter((m) => {
    const bought = (s.memos[m.id] ?? 0) > 0
    if (bought && !m.repeatable) return false
    if (s.memoSeen?.[m.id]) return true
    try {
      return m.visible(s)
    } catch {
      return false
    }
  }).filter((m) => {
    if (affordableOnly && !canAfford(m, s)) return false
    const needle = q.trim().toLowerCase()
    if (!needle) return true
    const hay = `${m.name} ${m.voice} ${m.effect}`.toLowerCase()
    return hay.includes(needle)
  })

  const jumpAffordable = () => {
    const first = visible.find((m) => canAfford(m, s))
    if (!first) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-memo-id="${first.id}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
    el.focus()
  }

  return (
    <div className={`ge-memos ${compact ? 'ge-memos--rail' : ''}`.trim()} data-coach-id="floor-memos">
      {!compact ? (
        <header className="ge-panel__head">
          <h2 className="ge-panel__title">
            <Icon name="memo" size={18} /> Memos
          </h2>
          <p className="ge-panel__purpose">Projects that open the next door.</p>
        </header>
      ) : (
        <div className="ge-memos__rail-head">
          <div className="ge-memos__rail-title">
            <Icon name="memo" size={16} /> Memos
          </div>
          <p className="ge-memos__rail-blurb">Voice first, cost second.</p>
        </div>
      )}

      {s.compute?.unlocked ? (
        <Section label="Back office">
          <div data-coach-id="compute-attention">
            <Meter
              value={s.compute.attention}
              max={Math.max(1, attentionCap(s))}
              label={`Att ${qty(s.compute.attention)} / ${qty(attentionCap(s))}`}
            />
          </div>
          {s.compute.ideasUnlocked ? (
            <div data-coach-id="compute-ideas">
              <Line left="Ideas" right={qty(s.compute.ideas)} />
            </div>
          ) : null}
          <div data-coach-id="compute-reputation">
            <Line left="Reputation" right={String(s.compute.reputation)} muted />
          </div>
          <div className="ge-chip-row">
            <Btn
              coachId="hire-analyst"
              disabled={s.compute.reputation < 1}
              onClick={() => dispatch({ type: 'buyAnalyst' })}
            >
              Analyst
            </Btn>
            <Btn
              coachId="buy-archive"
              disabled={s.compute.reputation < 1}
              onClick={() => dispatch({ type: 'buyArchive' })}
            >
              Archive
            </Btn>
            {s.compute.ideasUnlocked ? (
              <Btn onClick={() => dispatch({ type: 'toggleIdeas' })}>
                Ideas {s.compute.ideasOn ? 'on' : 'off'}
              </Btn>
            ) : null}
          </div>
        </Section>
      ) : null}

      <div className="ge-filter-bar">
        <input
          type="search"
          className="ge-filter-bar__input"
          placeholder="Search memos…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search memos"
        />
        <label className="ge-check ge-filter-bar__check">
          <input
            type="checkbox"
            checked={affordableOnly}
            onChange={(e) => setAffordableOnly(e.target.checked)}
          />
          Affordable
        </label>
        <Btn tone="ghost" onClick={jumpAffordable}>
          Jump to affordable
        </Btn>
      </div>

      {visible.length === 0 ? <p className="ge-empty">No memos on the desk.</p> : null}

      <ul className="ge-memo-list" ref={listRef}>
        {visible.map((m) => {
          const affordable = canAfford(m, s)
          const fav = !!s.memoFavorites?.[m.id]
          const cost = costLabel(m, s, numberFormat)
          return (
            <motion.li
              key={m.id}
              data-memo-id={m.id}
              tabIndex={0}
              className={`ge-memo ${affordable ? 'ge-memo--ready' : ''}`.trim()}
              layout={!reducedMotion}
              animate={
                affordable && !reducedMotion
                  ? { filter: ['brightness(1)', 'brightness(1.12)', 'brightness(1)'] }
                  : undefined
              }
              transition={
                affordable && !reducedMotion
                  ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                  : undefined
              }
              whileTap={reducedMotion ? undefined : { scale: 0.98 }}
            >
              <div className="ge-memo__top">
                <span className="ge-memo__icon" aria-hidden>
                  <Icon name="memo" size={15} tone="accent" />
                </span>
                <strong>{m.name}</strong>
                <button
                  type="button"
                  className="ge-memo__star"
                  aria-label={fav ? 'Unfavorite' : 'Favorite'}
                  onClick={() => dispatch({ type: 'toggleFavoriteMemo', id: m.id })}
                >
                  {fav ? '★' : '☆'}
                </button>
              </div>
              <p className="ge-memo__voice">{m.voice}</p>
              <span className="ge-memo__effect" title={m.effect}>
                {m.effect}
              </span>
              <Btn
                tone={affordable ? 'primary' : 'ghost'}
                coachId={`memo-${m.id}`}
                disabled={!affordable}
                onClick={(e) => {
                  playMemoFx(meta.settings.muted)
                  const row = (e.currentTarget as HTMLElement).closest('.ge-memo')
                  if (row && !reducedMotion) {
                    row.classList.add('ge-memo--stamped')
                    window.setTimeout(() => row.classList.remove('ge-memo--stamped'), 480)
                  }
                  dispatch({ type: 'buyMemo', id: m.id })
                }}
              >
                {cost}
              </Btn>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}

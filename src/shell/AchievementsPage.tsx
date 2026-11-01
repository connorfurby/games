import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ACHIEVEMENTS, type AchievementDef } from '@/achievements/registry'
import { createInitialState, type GameState } from '@/games/grocery-empire/sim/state'
import { loadGame } from '@/shared/save'
import { downloadAchievementGallery, downloadAchievementShareCard } from './achievementShareCard'
import { useMeta } from './MetaContext'

type TierFilter = 'all' | AchievementDef['tier']

const TIERS: TierFilter[] = ['all', 'bronze', 'silver', 'gold', 'mythic']

export function AchievementsPage() {
  const { meta } = useMeta()
  const [tier, setTier] = useState<TierFilter>('all')
  const [selected, setSelected] = useState<string[]>([])
  const game = useMemo(() => loadGame<GameState>('grocery-empire') ?? createInitialState(1), [])

  const unlocked = Object.keys(meta.achievements).length
  const tokenEarned = ACHIEVEMENTS.reduce(
    (n, a) => n + (meta.achievements[a.id] ? a.tokens : 0),
    0,
  )
  const tokenPossible = ACHIEVEMENTS.reduce((n, a) => n + a.tokens, 0)

  const list = ACHIEVEMENTS.filter((a) => tier === 'all' || a.tier === tier)

  const toggleSelect = (id: string) => {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id)
      if (cur.length >= 4) return [...cur.slice(1), id]
      return [...cur, id]
    })
  }

  const shareSelected = () => {
    const cards = selected
      .map((id) => {
        const a = ACHIEVEMENTS.find((x) => x.id === id)
        const entry = meta.achievements[id]
        if (!a || !entry) return null
        return { a, unlockedAt: entry.unlockedAt }
      })
      .filter((c): c is NonNullable<typeof c> => c != null)
    downloadAchievementGallery(cards)
  }

  return (
    <div className="ach-page">
      <Link to="/">← Shelf</Link>
      <h1 className="brand">Achievements</h1>
      <p className="tokens">
        {unlocked} / {ACHIEVEMENTS.length} unlocked · {tokenEarned} tokens earned · {meta.shelfTokens}{' '}
        held · {tokenPossible} possible
      </p>

      <div className="ach-filters" role="tablist" aria-label="Tier filter">
        {TIERS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tier === t}
            className={tier === t ? 'active' : ''}
            onClick={() => setTier(t)}
          >
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      <div className="ach-gallery-bar">
        <button type="button" className="ach-share" disabled={selected.length === 0} onClick={shareSelected}>
          Share selected{selected.length ? ` (${selected.length})` : ''}
        </button>
        <span className="muted">Select up to 4 unlocked · collage PNG</span>
        {selected.length > 0 ? (
          <button type="button" className="ach-share" onClick={() => setSelected([])}>
            Clear
          </button>
        ) : null}
      </div>

      <div className="ach-grid">
        {list.map((a) => {
          const entry = meta.achievements[a.id]
          const got = !!entry
          const mystery = !!a.hidden && !got
          const raw =
            !got && a.progress && a.progressMax ? a.progress(game, meta) : got ? a.progressMax ?? 0 : 0
          const prog = a.progressMax != null ? Math.min(a.progressMax, Math.max(0, raw)) : null
          const pct = prog !== null && a.progressMax ? Math.round((prog / a.progressMax) * 100) : got ? 100 : 0
          const checked = selected.includes(a.id)

          return (
            <article
              key={a.id}
              className={`ach-card ${got ? 'got' : ''} ${a.tier} ${mystery ? 'mystery' : ''} ${
                checked ? 'ach-card--picked' : ''
              }`.trim()}
            >
              {got ? (
                <label className="ach-pick">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelect(a.id)}
                    aria-label={`Select ${a.name} for gallery`}
                  />
                  Select
                </label>
              ) : null}
              <h3>{mystery ? '???' : a.name}</h3>
              <p>{mystery ? 'Hidden until unlocked.' : a.blurb}</p>
              {!mystery && a.progressMax ? (
                <div
                  className={`ach-progress ${got ? 'ach-progress--done' : ''}`}
                  aria-label={`Progress ${prog ?? 0} of ${a.progressMax}`}
                >
                  <div className="ach-progress__bar" style={{ width: `${pct}%` }} />
                  <span>
                    {got
                      ? 'Complete'
                      : `${Math.floor(prog ?? 0).toLocaleString()} / ${a.progressMax.toLocaleString()}`}
                  </span>
                </div>
              ) : null}
              <em>
                {mystery ? 'hidden' : a.tier} · {a.tokens} tokens
                {got ? ' · unlocked' : ''}
              </em>
              {got && entry ? (
                <button
                  type="button"
                  className="ach-share"
                  onClick={() => downloadAchievementShareCard(a, entry.unlockedAt)}
                >
                  Share card
                </button>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { ACHIEVEMENTS, type AchievementDef } from '@/achievements/registry'
import { createInitialState, type GameState } from '@/games/grocery-empire/sim/state'
import { qty } from '@/games/grocery-empire/ui/format'
import { loadGame } from '@/shared/save'
import { downloadAchievementGallery, downloadAchievementShareCard } from './achievementShareCard'
import { Button } from '@/games/grocery-empire/ui/kit'
import { useMeta } from './MetaContext'
import { ShellFrame } from './ShellFrame'

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
    <ShellFrame title="Awards">
    <div className="sd-page ach-page">
      <header className="ach-hero">
        <div>
          <p className="sd-eyebrow sd-eyebrow--tag">Awards · each one pays shelf tokens</p>
          <h1 className="sd-title">The wall.</h1>
          <p className="sd-lede">Every award earned in any run stays on the wall and pays tokens for the Shop.</p>
        </div>
        <div className="sd-stats ach-stats">
          <div className="sd-stat">
            <span>Earned</span>
            <strong>
              {unlocked}/{ACHIEVEMENTS.length}
            </strong>
          </div>
          <div className="sd-stat">
            <span>Tokens won</span>
            <strong>
              {tokenEarned}/{tokenPossible}
            </strong>
          </div>
          <div className="sd-stat">
            <span>Held</span>
            <strong>{meta.shelfTokens}</strong>
          </div>
        </div>
      </header>

      <nav className="sd-tabs ach-tabs" role="tablist" aria-label="Tier filter">
        {TIERS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tier === t}
            className={`sd-tab${tier === t ? ' is-on' : ''}`}
            onClick={() => setTier(t)}
          >
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            <span className="sd-tab__n">
              {ACHIEVEMENTS.filter((a) => (t === 'all' || a.tier === t) && meta.achievements[a.id]).length}/
              {ACHIEVEMENTS.filter((a) => t === 'all' || a.tier === t).length}
            </span>
          </button>
        ))}
      </nav>

      <div className="ach-gallery-bar">
        <Button size="sm" tone="secondary" disabled={selected.length === 0} onClick={shareSelected}>
          Share selected{selected.length ? ` (${selected.length})` : ''}
        </Button>
        <span className="muted">Pick up to four earned awards for a collage PNG.</span>
        {selected.length > 0 ? (
          <Button size="sm" tone="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
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
                      : `${qty(Math.floor(prog ?? 0), 'named')} / ${qty(a.progressMax, 'named')}`}
                  </span>
                </div>
              ) : null}
              <em>
                {mystery ? 'hidden' : a.tier} · {a.tokens} token{a.tokens === 1 ? '' : 's'}
                {got ? ' · unlocked' : ''}
              </em>
              {got && entry ? (
                <Button size="sm" tone="ghost" onClick={() => downloadAchievementShareCard(a, entry.unlockedAt)}>
                  Share card
                </Button>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
    </ShellFrame>
  )
}

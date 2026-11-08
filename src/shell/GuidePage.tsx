import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GUIDE_SECTIONS, GUIDE_TOPICS } from '@/games/grocery-empire/content/guide'
import { loadGame } from '@/shared/save'
import { useMeta } from './MetaContext'

function playEraFromSave(): number {
  const s = loadGame<{ era?: number }>('grocery-empire')
  const era = typeof s?.era === 'number' && Number.isFinite(s.era) ? Math.floor(s.era) : 0
  return Math.max(0, era)
}

export function GuidePage() {
  const { meta, updateSettings } = useMeta()
  const playEra = useMemo(() => playEraFromSave(), [meta.settings.showSpoilers])
  const maxOpen = meta.settings.showSpoilers ? 99 : Math.max(1, playEra)
  const sections = useMemo(
    () => GUIDE_SECTIONS.filter((g) => g.era <= maxOpen),
    [maxOpen],
  )

  const [q, setQ] = useState('')
  const [activeId, setActiveId] = useState('start-what')

  const needle = q.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!needle) return sections
    return sections.filter((g) =>
      `${g.title} ${g.blurb} ${g.body} ${g.topic}`.toLowerCase().includes(needle),
    )
  }, [sections, needle])

  useEffect(() => {
    if (filtered.some((g) => g.id === activeId)) return
    if (filtered[0]) setActiveId(filtered[0].id)
  }, [filtered, activeId])

  const activeIdx = filtered.findIndex((g) => g.id === activeId)
  const active = activeIdx >= 0 ? filtered[activeIdx] : filtered[0] ?? null
  const prev = activeIdx > 0 ? filtered[activeIdx - 1] : null
  const next = activeIdx >= 0 && activeIdx < filtered.length - 1 ? filtered[activeIdx + 1] : null

  const byTopic = useMemo(() => {
    return GUIDE_TOPICS.map((topic) => ({
      ...topic,
      items: filtered.filter((g) => g.topic === topic.id),
    })).filter((t) => t.items.length > 0)
  }, [filtered])

  return (
    <div className="guide-page shell-subpage">
      <p className="shell-subpage__nav">
        <Link to="/">Home</Link>
        <Link to="/play/grocery-empire">Play</Link>
        <Link to="/shop">Shop</Link>
      </p>

      <header className="guide-hero">
        <h1 className="brand brand--page">Ops Wiki</h1>
        <p className="guide-lore">
          Full walkthroughs, system docs, and stuck answers. Never required to finish a basket —
          open when the aisle feels loud.
        </p>
        <div className="guide-hero__meta">
          <label className="guide-spoiler">
            <input
              type="checkbox"
              checked={meta.settings.showSpoilers}
              onChange={(e) => updateSettings({ showSpoilers: e.target.checked })}
            />{' '}
            Show spoilers
          </label>
          <span className="tokens">
            Save era {playEra} · {filtered.length} articles
            {needle ? ` matching “${q.trim()}”` : ` · ${sections.length} unlocked`}
          </span>
        </div>
        <input
          className="guide-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search — attention, walkthrough, reputation, cold…"
          aria-label="Search guide"
        />
      </header>

      {filtered.length === 0 ? (
        <p className="muted">No articles match. Clear search or enable spoilers for later eras.</p>
      ) : (
        <div className="guide-wiki">
          <nav className="guide-toc" aria-label="Guide topics">
            {byTopic.map((topic) => (
              <div key={topic.id} className="guide-toc__group">
                <h2>{topic.label}</h2>
                <ul>
                  {topic.items.map((g) => {
                    const on = active?.id === g.id
                    return (
                      <li key={g.id}>
                        <button
                          type="button"
                          className={`guide-toc__link${on ? ' is-on' : ''}`.trim()}
                          aria-current={on ? 'page' : undefined}
                          onClick={() => setActiveId(g.id)}
                        >
                          <strong>{g.title}</strong>
                          <span>{g.blurb}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {active ? (
            <article className="guide-article" key={active.id}>
              <header className="guide-article__head">
                <span className="guide-era">E{active.era}+</span>
                <h2>{active.title}</h2>
                <p>{active.blurb}</p>
              </header>
              <pre className="guide-article__body">{active.body}</pre>
              <footer className="guide-article__nav">
                <button
                  type="button"
                  className="guide-article__nav-btn"
                  disabled={!prev}
                  onClick={() => prev && setActiveId(prev.id)}
                >
                  {prev ? `← ${prev.title}` : '—'}
                </button>
                <button
                  type="button"
                  className="guide-article__nav-btn"
                  disabled={!next}
                  onClick={() => next && setActiveId(next.id)}
                >
                  {next ? `${next.title} →` : '—'}
                </button>
              </footer>
            </article>
          ) : null}
        </div>
      )}
    </div>
  )
}

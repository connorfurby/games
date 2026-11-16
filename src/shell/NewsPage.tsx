import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  GAME_VERSION,
  NEWS,
  NEWS_BANDS,
  latestNews,
  newsById,
  type NewsBand,
} from '@/games/grocery-empire/content/news'
import { ShellFrame } from './ShellFrame'

type BandFilter = 'all' | NewsBand

function ArticleView({ id }: { id: string }) {
  const article = newsById(id) ?? NEWS[0]!
  return (
    <article className="news-article" key={article.id}>
      <p className="news-article__meta">
        <time dateTime={article.date}>{article.date}</time>
        <span className="news-chip">v{article.version}</span>
      </p>
      <h2>{article.headline}</h2>
      <p className="news-article__dek">{article.dek}</p>
      {article.body.map((p) => (
        <p key={p.slice(0, 24)}>{p}</p>
      ))}
    </article>
  )
}

export function NewsPage() {
  const { id } = useParams<{ id?: string }>()
  const [band, setBand] = useState<BandFilter>('all')
  // /news opens the newest receipt; /news/:id opens that one. The list sits below either way.
  const open = (id ? newsById(id) : null) ?? latestNews()
  const list = NEWS.filter((a) => band === 'all' || a.bands.includes(band))

  return (
    <ShellFrame title="News">
      <div className="news-page shell-subpage">
        <div className="news-paper">
          <header className="news-hero">
            <h1 className="news-hero__title">Bulletin</h1>
            <p className="news-hero__sub">
              Short receipts when the aisle changes. Newest first · v{GAME_VERSION}
            </p>
          </header>

          <ArticleView id={open.id} />

          <div className="news-filters" role="tablist" aria-label="Era band">
            {[{ id: 'all' as const, label: 'All' }, ...NEWS_BANDS].map((b) => (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={band === b.id}
                className={`news-filter${band === b.id ? ' is-on' : ''}`}
                onClick={() => setBand(b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="news-empty">Nothing filed for this band yet.</p>
          ) : (
            <ul className="news-list">
              {list.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/news/${a.id}`}
                    className={`news-list__row${a.id === open.id ? ' is-open' : ''}`}
                    aria-current={a.id === open.id ? 'true' : undefined}
                  >
                    <span className="news-list__meta">
                      <time dateTime={a.date}>{a.date}</time>
                      <span className="news-chip">v{a.version}</span>
                    </span>
                    <strong className="news-list__headline">{a.headline}</strong>
                    <span className="news-list__dek">{a.dek}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ShellFrame>
  )
}

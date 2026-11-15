import { Link, useParams } from 'react-router-dom'
import { GAME_VERSION, NEWS, newsById } from '@/games/grocery-empire/content/news'
import { ShellFrame } from './ShellFrame'

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
      <p className="news-back">
        <Link to="/news">All bulletins</Link>
      </p>
    </article>
  )
}

export function NewsPage() {
  const { id } = useParams<{ id?: string }>()
  const focus = id ? newsById(id) : null

  return (
    <ShellFrame title="News">
      <div className="news-page shell-subpage">
        <div className="news-paper">
          <header className="news-hero">
            <h1 className="news-hero__title">News</h1>
            <p className="news-hero__sub">
              Short bulletins when the aisle changes. Newest first · v{GAME_VERSION}
            </p>
          </header>

          {focus ? (
            <ArticleView id={focus.id} />
          ) : (
            <ul className="news-list">
              {NEWS.map((a) => (
                <li key={a.id}>
                  <Link to={`/news/${a.id}`} className="news-list__row">
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

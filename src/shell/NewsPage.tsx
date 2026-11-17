import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CAST, PLATES } from '@/games/grocery-empire/art/cast'
import {
  GAME_VERSION,
  NEWS,
  NEWS_BANDS,
  latestNews,
  newsArt,
  newsById,
  type NewsArticle,
  type NewsBand,
} from '@/games/grocery-empire/content/news'
import { WIKI_BY_ID } from '@/games/grocery-empire/content/wiki/articles'
import { LinkButton } from '@/games/grocery-empire/ui/kit'
import { ShellFrame } from './ShellFrame'
import './news.css'

type BandFilter = 'all' | NewsBand

const BAND_HUE: Record<NewsBand, number> = { e01: 18, e23: 38, e46: 195, e712: 265, meta: 140 }
const BAND_SHORT: Record<NewsBand, string> = { e01: '0–1', e23: '2–3', e46: '4–6', e712: '7–12', meta: 'Desk' }

function longDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function shortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Bold the first sentence of a paragraph when it is a short lead-in. */
function Para({ text, first }: { text: string; first: boolean }) {
  const m = /^(.{8,80}?[.!?:])\s+(.*)$/s.exec(text)
  const lead = m && m[1]!.split(' ').length <= 12 ? m[1] : null
  return (
    <p className={first ? 'nw-dropcap' : undefined}>
      {lead ? (
        <>
          <strong>{lead}</strong> {m![2]}
        </>
      ) : (
        text
      )}
    </p>
  )
}

function Art({ a, size = 'lead' }: { a: NewsArticle; size?: 'lead' | 'thumb' }) {
  const art = newsArt(a)
  const plate = art === 'worlds' || art === 'desk' ? null : PLATES[art]
  return (
    <div className={`nw-art nw-art--${art} nw-art--${size}`} style={plate ? { backgroundImage: `url(${plate})` } : undefined} aria-hidden>
      {art === 'worlds' ? (
        <>
          <i className="nw-art__planet" />
          <i className="nw-art__ring" />
        </>
      ) : null}
      {art === 'desk' ? (
        <>
          <i className="nw-art__pin" />
          <i className="nw-art__slip" />
          <i className="nw-art__slip nw-art__slip--2" />
        </>
      ) : null}
    </div>
  )
}

function Bands({ bands }: { bands: NewsBand[] }) {
  return (
    <span className="nw-bands">
      {bands.map((b) => (
        <span key={b} className="nw-band" style={{ ['--h' as string]: BAND_HUE[b] }} title={NEWS_BANDS.find((x) => x.id === b)?.label}>
          {b === 'meta' ? 'Desk' : `Eras ${BAND_SHORT[b]}`}
        </span>
      ))}
    </span>
  )
}

function Lead({ a }: { a: NewsArticle }) {
  const by = CAST[a.by ?? 'operations']
  const idx = NEWS.findIndex((x) => x.id === a.id)
  const newer = idx > 0 ? NEWS[idx - 1] : null
  const older = idx >= 0 && idx < NEWS.length - 1 ? NEWS[idx + 1] : null
  const wiki = (a.wiki ?? []).map((id) => WIKI_BY_ID[id]).filter(Boolean)
  return (
    <article className="nw-lead" key={a.id}>
      <Art a={a} />
      <div className="nw-lead__head">
        <p className="nw-kicker">
          <span>{a.kicker ?? 'Bulletin'}</span>
          <span className="nw-ver">v{a.version}</span>
        </p>
        <h2>{a.headline}</h2>
        <p className="nw-dek">{a.dek}</p>
        <div className="nw-byline">
          <img src={by.portrait} alt="" />
          <span>
            Filed by <b>{by.name}</b> · {by.role}
            <br />
            <time dateTime={a.date}>{longDate(a.date)}</time>
          </span>
          <Bands bands={a.bands} />
        </div>
      </div>

      {a.highlights?.length ? (
        <section className="nw-highlights" aria-label="In this edition">
          <h3>In this edition</h3>
          <ul>
            {a.highlights.map((h) => {
              const w = h.wiki ? WIKI_BY_ID[h.wiki] : undefined
              return (
                <li key={h.label} style={{ ['--h' as string]: h.band ? BAND_HUE[h.band] : 30 }}>
                  <span className="nw-highlights__band">{h.band ? (h.band === 'meta' ? 'Desk' : `Eras ${BAND_SHORT[h.band]}`) : ''}</span>
                  <strong>{h.label}</strong>
                  <p>{h.text}</p>
                  {w ? <Link to={`/guide/grocery-empire/a/${w.id}`}>How it works →</Link> : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <div className="nw-body">
        {a.body.map((p, i) => (
          <Para key={i} text={p} first={i === 0} />
        ))}
      </div>

      {wiki.length ? (
        <aside className="nw-wiki">
          <span>Read more in the Ops Wiki</span>
          <div>
            {wiki.map((w) => (
              <Link key={w!.id} to={`/guide/grocery-empire/a/${w!.id}`}>
                <strong>{w!.title}</strong>
                <em>{w!.blurb}</em>
              </Link>
            ))}
          </div>
        </aside>
      ) : null}

      <footer className="nw-pager">
        {older ? (
          <Link to={`/news/${older.id}`} className="nw-pager__btn">
            <span>← Older edition</span>
            <strong>{older.headline}</strong>
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link to={`/news/${newer.id}`} className="nw-pager__btn is-newer">
            <span>Newer edition →</span>
            <strong>{newer.headline}</strong>
          </Link>
        ) : null}
      </footer>
    </article>
  )
}

export function NewsPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [band, setBand] = useState<BandFilter>('all')
  const open = (id ? newsById(id) : null) ?? latestNews()
  const list = useMemo(() => NEWS.filter((a) => band === 'all' || a.bands.includes(band)), [band])
  const latest = latestNews()
  const edition = NEWS.length - NEWS.findIndex((a) => a.id === open.id)

  return (
    <ShellFrame title="News">
      <div className="nw-page">
        <div className="nw-paper">
          <header className="nw-mast">
            <div className="nw-mast__top">
              <span>Vol. {GAME_VERSION.split('.')[0]}</span>
              <span>No. {edition}</span>
              <span>{longDate(open.date)}</span>
              <span className="nw-mast__price">Free with every basket</span>
            </div>
            <h1>
              The Block <span>Bulletin</span>
            </h1>
            <p className="nw-mast__sub">What changed at the corner store, filed the night it changed.</p>
            <nav className="nw-sections" aria-label="Era band">
              {[{ id: 'all' as const, label: 'Front page' }, ...NEWS_BANDS].map((b) => {
                const n = b.id === 'all' ? NEWS.length : NEWS.filter((a) => a.bands.includes(b.id as NewsBand)).length
                return (
                  <button
                    key={b.id}
                    type="button"
                    aria-pressed={band === b.id}
                    className={band === b.id ? 'is-on' : ''}
                    onClick={() => {
                      setBand(b.id)
                      const first = NEWS.find((a) => b.id === 'all' || a.bands.includes(b.id as NewsBand))
                      if (first && first.id !== open.id && b.id !== 'all') navigate(`/news/${first.id}`)
                    }}
                  >
                    {b.label}
                    <i>{n}</i>
                  </button>
                )
              })}
            </nav>
          </header>

          <div className="nw-grid">
            <Lead a={open} />

            <aside className="nw-rail">
              <section className="nw-editions">
                <h3>
                  {band === 'all' ? 'Every edition' : NEWS_BANDS.find((b) => b.id === band)?.label}
                  <span>{list.length}</span>
                </h3>
                {list.length === 0 ? (
                  <p className="nw-empty">Nothing here yet.</p>
                ) : (
                  <ol>
                    {list.map((a) => (
                      <li key={a.id}>
                        <Link to={`/news/${a.id}`} className={a.id === open.id ? 'is-open' : ''} aria-current={a.id === open.id ? 'true' : undefined}>
                          <Art a={a} size="thumb" />
                          <span className="nw-editions__meta">
                            <time dateTime={a.date}>{shortDate(a.date)}</time>
                            <span>v{a.version}</span>
                            {a.id === latest.id ? <b>New</b> : null}
                          </span>
                          <strong>{a.headline}</strong>
                          <em>{a.dek}</em>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="nw-box">
                <h3>At the counter</h3>
                <p>Your run is where you left it.</p>
                <div className="nw-box__acts">
                  <LinkButton to="/play/grocery-empire" tone="free" size="sm">
                    Play
                  </LinkButton>
                  <LinkButton to="/guide/grocery-empire" tone="secondary" size="sm">
                    Ops Wiki
                  </LinkButton>
                </div>
              </section>

              <section className="nw-versions" aria-label="Version history">
                <h3>Version history</h3>
                <ol>
                  {Array.from(new Set(NEWS.map((a) => a.version))).map((v) => {
                    const first = NEWS.find((a) => a.version === v)!
                    return (
                      <li key={v}>
                        <Link to={`/news/${first.id}`}>
                          <b>v{v}</b>
                          <span>{first.headline}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ol>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </ShellFrame>
  )
}

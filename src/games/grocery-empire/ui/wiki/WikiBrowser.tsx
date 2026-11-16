import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ATLAS, BAND_INFO, type AtlasEra } from '../../content/wiki/atlas'
import { GLOSSARY, GLOSS_KIND, type GlossKind } from '../../content/wiki/glossary'
import { LESSON_COUNT, LESSON_TRACKS, nextLesson } from '../../content/wiki/lessons'
import { WIKI_BY_ID, WIKI_TOPICS, searchArticles, visibleArticles, type WikiArticle } from '../../content/wiki/articles'
import { MENUS, MENU_IDS, type MenuId } from '../../content/menus'
import { MENU_LORE } from '../../content/lore'
import type { TutorialDef } from '../../content/tutorials'
import { PLATES } from '../../art/cast'
import { Icon } from '../icons/Icon'
import { EraRibbon, HubMap } from './figures'
import { WikiBlocks } from './WikiBlocks'
import { slug, type WikiNav, type WikiView } from './nav'
import './wiki.css'

export interface WikiBrowserProps {
  nav: WikiNav
  go: (n: WikiNav) => void
  /** Era of the player's save (0 with no save). */
  playEra: number
  spoilers: boolean
  onSpoilers?: (v: boolean) => void
  lessonsDone: Record<string, boolean>
  /** Opens a department: a link on the site, a dispatch inside play. */
  renderOpenMenu: (menu: MenuId, label: string) => ReactNode
  /** Starts a Coach lesson. */
  renderPlayLesson: (lesson: TutorialDef, label?: string) => ReactNode
  /** Drawer layout inside play: one column, no hero. */
  compact?: boolean
}

const TABS: { view: WikiView; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { view: 'home', label: 'Home', icon: 'help' },
  { view: 'learn', label: 'Lessons', icon: 'coach' },
  { view: 'atlas', label: 'Era atlas', icon: 'map' },
  { view: 'hubs', label: 'Hubs', icon: 'floor' },
  { view: 'glossary', label: 'Glossary', icon: 'memo' },
]

function eraLabel(era: number) {
  return era <= 0 ? 'Any era' : `Era ${era}+`
}

export function WikiBrowser(props: WikiBrowserProps) {
  const { nav, go, playEra, spoilers, onSpoilers, compact } = props
  const maxEra = spoilers ? 12 : Math.max(1, playEra)
  const articles = useMemo(() => visibleArticles(maxEra), [maxEra])
  const [draft, setDraft] = useState('')
  const q = nav.view === 'search' ? (nav.q ?? '') : draft
  const top = useRef<HTMLDivElement>(null)

  // New page → back to the top of the wiki (drawer or window).
  useEffect(() => {
    if (compact) top.current?.scrollIntoView({ block: 'start' })
    else window.scrollTo({ top: 0 })
  }, [nav.view, nav.id, compact])

  const tabOn = (v: WikiView) =>
    nav.view === v || (v === 'home' && (nav.view === 'article' || nav.view === 'topic' || nav.view === 'search'))

  return (
    <div className={`wk${compact ? ' wk--compact' : ''}`} ref={top}>
      <div className="wk-bar">
        <nav className="wk-tabs sd-tabs" aria-label="Wiki sections">
          {TABS.map((t) => (
            <button
              key={t.view}
              type="button"
              className={`sd-tab${tabOn(t.view) ? ' is-on' : ''}`}
              aria-current={tabOn(t.view) ? 'page' : undefined}
              onClick={() => go({ view: t.view })}
            >
              <Icon name={t.icon} size={15} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <form
          className="wk-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            go({ view: 'search', q })
          }}
        >
          <Icon name="help" size={16} />
          <input
            type="search"
            value={q}
            placeholder="Search the wiki — attention, regulars, cold…"
            aria-label="Search the wiki"
            onChange={(e) => {
              setDraft(e.target.value)
              if (nav.view === 'search' || e.target.value.length > 1) go({ view: 'search', q: e.target.value })
            }}
          />
        </form>
      </div>

      {nav.view === 'home' ? <HomeView {...props} articles={articles} maxEra={maxEra} /> : null}
      {nav.view === 'article' ? <ArticleView {...props} articles={articles} maxEra={maxEra} /> : null}
      {nav.view === 'topic' ? <TopicView {...props} articles={articles} maxEra={maxEra} /> : null}
      {nav.view === 'search' ? <SearchView {...props} articles={articles} maxEra={maxEra} q={nav.q ?? ''} /> : null}
      {nav.view === 'learn' ? <LessonsView {...props} articles={articles} maxEra={maxEra} /> : null}
      {nav.view === 'atlas' ? <AtlasView {...props} articles={articles} maxEra={maxEra} /> : null}
      {nav.view === 'glossary' ? <GlossaryView {...props} articles={articles} maxEra={maxEra} /> : null}
      {nav.view === 'hubs' ? <HubsView {...props} articles={articles} maxEra={maxEra} /> : null}

      <footer className="wk-foot">
        <label className="wk-spoil">
          <input type="checkbox" checked={spoilers} onChange={(e) => onSpoilers?.(e.target.checked)} disabled={!onSpoilers} />
          <span>Show spoilers</span>
        </label>
        <span className="wk-foot__note">
          {spoilers ? 'Every era is open.' : `Showing what your save has reached (Era ${playEra}). Later eras stay sealed.`}
        </span>
      </footer>
    </div>
  )
}

type ViewProps = WikiBrowserProps & { articles: WikiArticle[]; maxEra: number }

/* ── Home ─────────────────────────────────────────────────────────── */

function HomeView({ go, articles, maxEra, playEra, lessonsDone, renderPlayLesson, compact }: ViewProps) {
  const start = ['start-what', 'start-controls', 'start-first-hour'].map((id) => WIKI_BY_ID[id]).filter(Boolean) as WikiArticle[]
  const lesson = nextLesson(Math.max(0, playEra), lessonsDone)
  const done = Object.values(lessonsDone).filter(Boolean).length
  const here = ATLAS.find((e) => e.era === playEra) ?? ATLAS[0]!
  const walk = here.article ? WIKI_BY_ID[here.article] : undefined
  return (
    <div className="wk-home">
      {!compact ? (
        <header className="wk-hero">
          <div className="wk-hero__copy">
            <p className="sd-eyebrow sd-eyebrow--tomato">Grocery Empire · Ops Wiki</p>
            <h1 className="sd-title">Everything the night supervisor knows.</h1>
            <p className="sd-lede">
              Walkthroughs for every era, short answers for when you are stuck, every fork explained, and {LESSON_COUNT} lessons that
              spotlight the exact button in the game.
            </p>
          </div>
          <HeroShelf onTopic={(id) => go({ view: 'topic', id })} articles={articles} />
        </header>
      ) : null}

      <section className="wk-now">
        <div className="wk-now__era" style={{ ['--h' as string]: BAND_INFO[here.band].hue }}>
          <span className="sd-eyebrow">Your save</span>
          <strong>
            Era {here.era} · {here.title}
          </strong>
          <p>{here.focus}</p>
          <div className="wk-now__acts">
            {walk ? (
              <button type="button" className="gk-btn gk-btn--secondary gk-btn--sm" onClick={() => go({ view: 'article', id: walk.id })}>
                Walkthrough
              </button>
            ) : null}
            <button type="button" className="gk-btn gk-btn--ghost gk-btn--sm" onClick={() => go({ view: 'atlas', id: String(here.era) })}>
              The door out
            </button>
          </div>
        </div>
        <div className="wk-now__lesson">
          <span className="sd-eyebrow">Next lesson</span>
          {lesson ? (
            <>
              <strong>{lesson.name}</strong>
              <p>{lesson.steps[0]?.body}</p>
              <div className="wk-now__acts">
                {renderPlayLesson(lesson)}
                <button type="button" className="gk-btn gk-btn--ghost gk-btn--sm" onClick={() => go({ view: 'learn', id: lesson.id })}>
                  Read it
                </button>
              </div>
            </>
          ) : (
            <>
              <strong>All caught up</strong>
              <p>Every lesson for your era is done. Replay any of them from Lessons.</p>
            </>
          )}
          <span className="wk-now__meter" aria-label={`${done} of ${LESSON_COUNT} lessons done`}>
            <i style={{ width: `${(done / LESSON_COUNT) * 100}%` }} />
          </span>
          <em>
            {done}/{LESSON_COUNT} lessons done
          </em>
        </div>
      </section>

      <section>
        <div className="sd-section-head">
          <h2>Start here</h2>
          <p>Three short reads, in order.</p>
        </div>
        <ol className="wk-start">
          {start.map((a, i) => (
            <li key={a.id}>
              <button type="button" className="wk-start__card" onClick={() => go({ view: 'article', id: a.id })}>
                <span className="wk-start__n">{i + 1}</span>
                <strong>{a.title}</strong>
                <span>{a.blurb}</span>
                <em>{a.minutes} min read</em>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="sd-section-head">
          <h2>The road</h2>
          <button type="button" className="wk-more" onClick={() => go({ view: 'atlas' })}>
            Open the era atlas →
          </button>
        </div>
        <EraRibbon current={playEra} maxOpen={maxEra} onPick={(era) => go({ view: 'atlas', id: String(era) })} />
      </section>

      <section>
        <div className="sd-section-head">
          <h2>Binders</h2>
          <p>{articles.length} articles open at your era.</p>
        </div>
        <div className="wk-topics">
          {WIKI_TOPICS.map((t) => {
            const list = articles.filter((a) => a.topic === t.id)
            if (!list.length) return null
            return (
              <button key={t.id} type="button" className="wk-topic" style={{ ['--h' as string]: t.hue }} onClick={() => go({ view: 'topic', id: t.id })}>
                <span className="wk-topic__ico">
                  <Icon name={t.icon} size={20} />
                </span>
                <strong>{t.label}</strong>
                <span>{t.about}</span>
                <em>
                  {list.length} article{list.length === 1 ? '' : 's'}
                </em>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <div className="sd-section-head">
          <h2>Words you will see</h2>
          <button type="button" className="wk-more" onClick={() => go({ view: 'glossary' })}>
            Full glossary →
          </button>
        </div>
        <div className="wk-gloss-mini">
          {GLOSSARY.filter((g) => g.era <= maxEra)
            .slice(0, 8)
            .map((g) => (
              <button key={g.id} type="button" onClick={() => go({ view: 'glossary', id: g.id })} style={{ ['--h' as string]: GLOSS_KIND[g.kind].hue }}>
                <Icon name={g.icon} size={16} />
                <strong>{g.term}</strong>
                <span>{g.short}</span>
              </button>
            ))}
        </div>
      </section>
    </div>
  )
}

/** Binder spines on a shelf: one per topic. */
function HeroShelf({ onTopic, articles }: { onTopic: (id: string) => void; articles: WikiArticle[] }) {
  return (
    <div className="wk-shelf" aria-label="Topics">
      <div className="wk-shelf__row">
        {WIKI_TOPICS.map((t, i) => {
          const n = articles.filter((a) => a.topic === t.id).length
          return (
            <button
              key={t.id}
              type="button"
              className={`wk-spine${n ? '' : ' is-sealed'}`}
              disabled={!n}
              style={{ ['--h' as string]: t.hue, ['--tilt' as string]: `${i % 3 === 1 ? -2 : i % 4 === 3 ? 2 : 0}deg`, ['--hgt' as string]: `${78 + ((i * 37) % 22)}%` }}
              onClick={() => onTopic(t.id)}
              title={n ? `${t.label} · ${n} articles` : `${t.label} · sealed until a later era`}
            >
              <Icon name={t.icon} size={14} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>
      <div className="wk-shelf__board" aria-hidden />
      <span className="wk-shelf__tag" aria-hidden>
        OPS
      </span>
    </div>
  )
}

/* ── Article ──────────────────────────────────────────────────────── */

function ArticleView({ nav, go, articles, maxEra, renderOpenMenu, renderPlayLesson, compact }: ViewProps) {
  const a = nav.id ? WIKI_BY_ID[nav.id] : undefined
  if (!a) return <p className="wk-empty">That page is not in the wiki.</p>
  if (a.era > maxEra) {
    return (
      <div className="wk-sealed">
        <Icon name="help" size={28} />
        <h2>Sealed until Era {a.era}</h2>
        <p>This page talks about things your save has not reached. Turn on spoilers below to read it anyway.</p>
      </div>
    )
  }
  const topic = WIKI_TOPICS.find((t) => t.id === a.topic)
  const siblings = articles.filter((x) => x.topic === a.topic)
  const idx = siblings.findIndex((x) => x.id === a.id)
  const prev = idx > 0 ? siblings[idx - 1] : null
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null
  const heads = a.blocks.filter((b) => b.type === 'h') as { type: 'h'; text: string }[]
  const lesson = a.lesson ? LESSON_TRACKS.flatMap((t) => t.lessons).find((l) => l.id === a.lesson) : undefined
  const menus = a.menus.filter((m) => MENU_IDS.includes(m))

  return (
    <div className="wk-article" style={{ ['--h' as string]: topic?.hue ?? 30 }}>
      <div className="wk-article__main">
        <nav className="wk-crumbs" aria-label="Breadcrumb">
          <button type="button" onClick={() => go({ view: 'home' })}>
            Wiki
          </button>
          <span aria-hidden>›</span>
          {topic ? (
            <button type="button" onClick={() => go({ view: 'topic', id: topic.id })}>
              {topic.label}
            </button>
          ) : null}
        </nav>
        <header className="wk-article__head">
          <div className="wk-article__chips">
            <span className="sd-chip sd-chip--quiet">{eraLabel(a.era)}</span>
            <span className="sd-chip sd-chip--quiet">{a.minutes} min read</span>
          </div>
          <h1>{a.title}</h1>
          <p className="wk-article__blurb">{a.blurb}</p>
          {menus.length || lesson ? (
            <div className="wk-article__acts">
              {lesson ? renderPlayLesson(lesson, `Lesson: ${lesson.name}`) : null}
              {menus.slice(0, 3).map((m) => (
                <span key={m}>{renderOpenMenu(m, `Open ${MENUS[m].name}`)}</span>
              ))}
            </div>
          ) : null}
        </header>
        <WikiBlocks blocks={a.blocks} articleId={a.id} go={go} maxEra={maxEra} />
        <footer className="wk-article__nav">
          {prev ? (
            <button type="button" className="wk-pn" onClick={() => go({ view: 'article', id: prev.id })}>
              <span>← Previous</span>
              <strong>{prev.title}</strong>
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button type="button" className="wk-pn is-next" onClick={() => go({ view: 'article', id: next.id })}>
              <span>Next →</span>
              <strong>{next.title}</strong>
            </button>
          ) : null}
        </footer>
      </div>
      {!compact ? (
        <aside className="wk-toc" aria-label="On this page">
          {heads.length > 1 ? (
            <>
              <span className="sd-eyebrow">On this page</span>
              <ul>
                {heads.map((h) => (
                  <li key={h.text}>
                    <a
                      href={`#wk-${slug(h.text)}`}
                      onClick={(e) => {
                        e.preventDefault()
                        document.getElementById(`wk-${slug(h.text)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {siblings.length > 1 ? (
            <div className="wk-toc__binder">
              <span className="sd-eyebrow">In {topic?.label ?? 'this binder'}</span>
              <ul>
                {siblings.map((x) => (
                  <li key={x.id}>
                    <button type="button" className={x.id === a.id ? 'is-on' : ''} onClick={() => go({ view: 'article', id: x.id })}>
                      {x.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      ) : null}
    </div>
  )
}

/* ── Topic & search ───────────────────────────────────────────────── */

function ArticleList({ list, go }: { list: WikiArticle[]; go: (n: WikiNav) => void }) {
  return (
    <ul className="wk-alist">
      {list.map((a) => {
        const t = WIKI_TOPICS.find((x) => x.id === a.topic)
        return (
          <li key={a.id}>
            <button type="button" onClick={() => go({ view: 'article', id: a.id })} style={{ ['--h' as string]: t?.hue ?? 30 }}>
              <span className="wk-alist__ico">
                <Icon name={t?.icon ?? 'help'} size={16} />
              </span>
              <span className="wk-alist__body">
                <strong>{a.title}</strong>
                <span>{a.blurb}</span>
              </span>
              <em>{eraLabel(a.era)}</em>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function TopicView({ nav, go, articles }: ViewProps) {
  const t = WIKI_TOPICS.find((x) => x.id === nav.id)
  const list = articles.filter((a) => a.topic === nav.id)
  return (
    <div className="wk-topicpage" style={{ ['--h' as string]: t?.hue ?? 30 }}>
      <header className="wk-pagehead">
        <span className="wk-pagehead__ico">
          <Icon name={t?.icon ?? 'help'} size={22} />
        </span>
        <div>
          <h1>{t?.label ?? 'Topic'}</h1>
          <p>{t?.about}</p>
        </div>
      </header>
      {list.length ? <ArticleList list={list} go={go} /> : <p className="wk-empty">Nothing open here yet at your era.</p>}
    </div>
  )
}

function SearchView({ go, articles, q }: ViewProps & { q: string }) {
  const list = searchArticles(articles, q)
  const terms = q.trim().length > 1 ? GLOSSARY.filter((g) => `${g.term} ${g.short}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 4) : []
  return (
    <div className="wk-searchpage">
      <header className="wk-pagehead">
        <div>
          <h1>{q.trim() ? `“${q.trim()}”` : 'Search'}</h1>
          <p>
            {list.length} article{list.length === 1 ? '' : 's'}
            {terms.length ? ` · ${terms.length} glossary word${terms.length === 1 ? '' : 's'}` : ''}
          </p>
        </div>
      </header>
      {terms.length ? (
        <div className="wk-gloss-mini">
          {terms.map((g) => (
            <button key={g.id} type="button" onClick={() => go({ view: 'glossary', id: g.id })} style={{ ['--h' as string]: GLOSS_KIND[g.kind].hue }}>
              <Icon name={g.icon} size={16} />
              <strong>{g.term}</strong>
              <span>{g.short}</span>
            </button>
          ))}
        </div>
      ) : null}
      {list.length ? <ArticleList list={list} go={go} /> : <p className="wk-empty">No page matches. Try a shorter word, or turn on spoilers for later eras.</p>}
    </div>
  )
}

/* ── Lessons ──────────────────────────────────────────────────────── */

function LessonsView({ nav, go, maxEra, lessonsDone, renderPlayLesson, playEra }: ViewProps) {
  const openId = nav.id
  useEffect(() => {
    if (nav.id) document.getElementById(`wk-lesson-${nav.id}`)?.scrollIntoView({ block: 'center' })
  }, [nav.id])
  const total = LESSON_TRACKS.reduce((n, t) => n + t.lessons.length, 0)
  const done = Object.values(lessonsDone).filter(Boolean).length
  return (
    <div className="wk-lessons">
      <header className="wk-pagehead">
        <span className="wk-pagehead__ico">
          <Icon name="coach" size={22} />
        </span>
        <div>
          <h1>Lessons</h1>
          <p>
            Each lesson opens the game and spotlights the exact button. {done}/{total} done.
          </p>
        </div>
      </header>
      {LESSON_TRACKS.filter((track) => track.era <= maxEra).map((track) => {
        const sealed = track.era > maxEra
        const band = BAND_INFO[ATLAS.find((e) => e.era === track.era)?.band ?? 'store']
        const trackDone = track.lessons.filter((l) => lessonsDone[l.id]).length
        return (
          <section key={track.era} className={`wk-track${sealed ? ' is-sealed' : ''}`} style={{ ['--h' as string]: band.hue }}>
            <header>
              <span className="wk-track__era">Era {track.era}</span>
              <h2>{sealed ? 'Sealed' : track.title}</h2>
              <span className="wk-track__count">
                {sealed ? `${track.lessons.length} lessons` : `${trackDone}/${track.lessons.length}`}
              </span>
              {track.era === playEra ? <span className="sd-chip sd-chip--tomato">You are here</span> : null}
            </header>
            {sealed ? (
              <p className="wk-track__sealed">Reach Era {track.era} (or show spoilers) to open these lessons.</p>
            ) : (
              <ul className="wk-lessonlist">
                {track.lessons.map((l) => {
                  const isOpen = openId === l.id
                  const isDone = !!lessonsDone[l.id]
                  return (
                    <li key={l.id} id={`wk-lesson-${l.id}`} className={`wk-lesson${isOpen ? ' is-open' : ''}${isDone ? ' is-done' : ''}`}>
                      <button
                        type="button"
                        className="wk-lesson__head"
                        aria-expanded={isOpen}
                        onClick={() => go({ view: 'learn', id: isOpen ? undefined : l.id })}
                      >
                        <span className="wk-lesson__tick" aria-label={isDone ? 'Done' : 'Not done'}>
                          {isDone ? '✓' : ''}
                        </span>
                        <strong>{l.name}</strong>
                        <em>
                          {l.steps.length} step{l.steps.length === 1 ? '' : 's'}
                        </em>
                        <span className="wk-lesson__chev" aria-hidden>
                          ▾
                        </span>
                      </button>
                      {isOpen ? (
                        <div className="wk-lesson__body">
                          <ol>
                            {l.steps.map((st, i) => (
                              <li key={st.id}>
                                <span className="wk-steps__n">{i + 1}</span>
                                <div>
                                  <strong>{st.title}</strong>
                                  <p>{st.body}</p>
                                  <small>If it goes wrong: {st.recovery}</small>
                                </div>
                              </li>
                            ))}
                          </ol>
                          <div className="wk-lesson__acts">{renderPlayLesson(l, isDone ? 'Replay in game' : 'Play this lesson')}</div>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
      {(() => {
        const sealed = LESSON_TRACKS.filter((t) => t.era > maxEra)
        if (!sealed.length) return null
        const n = sealed.reduce((k, t) => k + t.lessons.length, 0)
        return (
          <section className="wk-track is-sealed">
            <header>
              <span className="wk-track__era">
                Era {sealed[0]!.era}–{sealed[sealed.length - 1]!.era}
              </span>
              <h2>Sealed</h2>
              <span className="wk-track__count">{n} lessons</span>
            </header>
            <p className="wk-track__sealed">These open as your save reaches each era — or show spoilers below.</p>
          </section>
        )
      })()}
    </div>
  )
}

/* ── Atlas ────────────────────────────────────────────────────────── */

function AtlasCard({ e, open, here, go, renderOpenMenu }: { e: AtlasEra; open: boolean; here: boolean; go: (n: WikiNav) => void; renderOpenMenu: WikiBrowserProps['renderOpenMenu'] }) {
  const band = BAND_INFO[e.band]
  const plateId = e.plate ?? band.plate
  const plate = plateId ? PLATES[plateId] : null
  return (
    <article id={`wk-era-${e.era}`} className={`wk-era${open ? '' : ' is-sealed'}${here ? ' is-here' : ''}`} style={{ ['--h' as string]: band.hue }}>
      <div className="wk-era__rail" aria-hidden>
        <span>{e.era}</span>
      </div>
      <div className="wk-era__card">
        <div className={`wk-era__art${plate ? '' : ' is-space'}`} style={plate && open ? { backgroundImage: `url(${plate})` } : undefined}>
          <span className="wk-era__band">{band.label}</span>
          {here ? <span className="sd-chip sd-chip--tomato">You are here</span> : null}
          <h2>{open ? e.title : `Era ${e.era}`}</h2>
          {open ? <p className="wk-era__epi">“{e.epigraph}”</p> : null}
        </div>
        {open ? (
          <div className="wk-era__body">
            <p className="wk-era__focus">{e.focus}</p>
            <div className="wk-era__cols">
              <div>
                <span className="sd-eyebrow">The door out</span>
                <ul className="wk-era__door">
                  {e.door.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              {e.opens.length ? (
                <div>
                  <span className="sd-eyebrow">Departments you meet</span>
                  <ul className="wk-era__menus">
                    {e.opens.map((m) => (
                      <li key={m} title={MENU_LORE[m] ?? MENUS[m].purpose}>
                        <Icon name={m} size={14} />
                        {MENUS[m].name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            {e.pressure ? (
              <aside className="wk-callout is-warn">
                <span className="wk-callout__ico" aria-hidden>
                  <Icon name="rivals" size={18} />
                </span>
                <div>
                  <strong>Pressure</strong>
                  <p>{e.pressure}</p>
                </div>
              </aside>
            ) : null}
            <div className="wk-era__acts">
              {e.article && WIKI_BY_ID[e.article] ? (
                <button type="button" className="gk-btn gk-btn--secondary gk-btn--sm" onClick={() => go({ view: 'article', id: e.article })}>
                  Read the walkthrough
                </button>
              ) : null}
              {here && e.opens[0] ? renderOpenMenu(e.opens[0], `Open ${MENUS[e.opens[0]].name}`) : null}
            </div>
          </div>
        ) : (
          <div className="wk-era__body">
            <p className="wk-era__focus">Sealed. Reach this era — or show spoilers — to read what waits here.</p>
          </div>
        )}
      </div>
    </article>
  )
}

function AtlasView({ nav, go, maxEra, playEra, renderOpenMenu }: ViewProps) {
  useEffect(() => {
    if (nav.id) document.getElementById(`wk-era-${nav.id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [nav.id])
  return (
    <div className="wk-atlas">
      <header className="wk-pagehead">
        <span className="wk-pagehead__ico">
          <Icon name="map" size={22} />
        </span>
        <div>
          <h1>Era atlas</h1>
          <p>Thirteen eras, from a counter to the last aisle. Each card lists the door out — the things the game actually checks.</p>
        </div>
      </header>
      <EraRibbon current={playEra} maxOpen={maxEra} onPick={(era) => go({ view: 'atlas', id: String(era) })} />
      <div className="wk-atlas__list">
        {ATLAS.map((e) => (
          <AtlasCard key={e.era} e={e} open={e.era <= maxEra} here={e.era === playEra} go={go} renderOpenMenu={renderOpenMenu} />
        ))}
      </div>
    </div>
  )
}

/* ── Glossary ─────────────────────────────────────────────────────── */

function GlossaryView({ nav, go, maxEra }: ViewProps) {
  const [kind, setKind] = useState<GlossKind | 'all'>('all')
  useEffect(() => {
    if (nav.id) document.getElementById(`wk-gl-${nav.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [nav.id])
  const all = GLOSSARY.filter((g) => kind === 'all' || g.kind === kind).sort((a, b) => a.term.localeCompare(b.term))
  const list = all.filter((g) => g.era <= maxEra)
  const sealedCount = all.length - list.length
  return (
    <div className="wk-glossary">
      <header className="wk-pagehead">
        <span className="wk-pagehead__ico">
          <Icon name="memo" size={22} />
        </span>
        <div>
          <h1>Glossary</h1>
          <p>Every currency, meter and word the game uses, in one line each.</p>
        </div>
      </header>
      <div className="wk-chips" role="group" aria-label="Filter">
        <button type="button" className={`sd-chip${kind === 'all' ? ' sd-chip--tomato' : ''}`} onClick={() => setKind('all')}>
          All
        </button>
        {(Object.keys(GLOSS_KIND) as GlossKind[]).map((k) => (
          <button key={k} type="button" className={`sd-chip${kind === k ? ' sd-chip--tomato' : ''}`} onClick={() => setKind(k)}>
            {GLOSS_KIND[k].label}
          </button>
        ))}
      </div>
      <dl className="wk-gloss">
        {list.map((g) => {
          const sealed = g.era > maxEra
          return (
            <div
              key={g.id}
              id={`wk-gl-${g.id}`}
              className={`wk-gl${sealed ? ' is-sealed' : ''}${nav.id === g.id ? ' is-hit' : ''}`}
              style={{ ['--h' as string]: GLOSS_KIND[g.kind].hue }}
            >
              <span className="wk-gl__ico" aria-hidden>
                <Icon name={g.icon} size={18} />
              </span>
              <dt>
                {sealed ? 'Sealed' : g.term}
                <span>{GLOSS_KIND[g.kind].label}</span>
              </dt>
              <dd>
                {sealed ? (
                  `Appears in Era ${g.era}.`
                ) : (
                  <>
                    {g.short}
                    {g.more ? <small>{g.more}</small> : null}
                    {g.see && WIKI_BY_ID[g.see] && WIKI_BY_ID[g.see]!.era <= maxEra ? (
                      <button type="button" className="wk-more" onClick={() => go({ view: 'article', id: g.see })}>
                        {WIKI_BY_ID[g.see]!.title} →
                      </button>
                    ) : null}
                  </>
                )}
              </dd>
            </div>
          )
        })}
      </dl>
      {sealedCount > 0 ? (
        <p className="wk-sealednote">
          {sealedCount} more word{sealedCount === 1 ? '' : 's'} appear in later eras. Show spoilers to read them now.
        </p>
      ) : null}
    </div>
  )
}

/* ── Hubs ─────────────────────────────────────────────────────────── */

function HubsView({ renderOpenMenu, maxEra }: ViewProps) {
  const unlocked = new Set(ATLAS.filter((e) => e.era <= maxEra).flatMap((e) => e.opens))
  return (
    <div className="wk-hubspage">
      <header className="wk-pagehead">
        <span className="wk-pagehead__ico">
          <Icon name="floor" size={22} />
        </span>
        <div>
          <h1>Hubs & departments</h1>
          <p>Where every department lives. A hub only shows the departments you have unlocked.</p>
        </div>
      </header>
      <HubMap />
      <div className="sd-section-head">
        <h2>Departments</h2>
        <p>One sentence each — the same sentence the game shows on the page.</p>
      </div>
      <ul className="wk-menus">
        {MENU_IDS.filter((m) => m !== 'more' && m !== 'coach' && unlocked.has(m)).map((m) => (
          <li key={m}>
            <span className="wk-menus__ico">
              <Icon name={m} size={18} />
            </span>
            <div>
              <strong>{MENUS[m].name}</strong>
              <p>{MENUS[m].purpose}</p>
              {MENU_LORE[m] ? <em>{MENU_LORE[m]!.replace(/^[^—]*—\s*/, '')}</em> : null}
            </div>
            <span className="wk-menus__go">{renderOpenMenu(m, 'Open')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

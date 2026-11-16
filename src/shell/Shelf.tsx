import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ACHIEVEMENTS } from '@/achievements/registry'
import { TEXTURE_PACKS } from '@/cosmetics/packs'
import { GAMES } from '@/games/registry'
import { GE_COVER, PLATES } from '@/games/grocery-empire/art/cast'
import { ERA_STORY } from '@/games/grocery-empire/content/lore'
import { latestNews, newsArt } from '@/games/grocery-empire/content/news'
import { LESSON_COUNT, nextLesson } from '@/games/grocery-empire/content/wiki/lessons'
import { Button, LinkButton } from '@/games/grocery-empire/ui/kit'
import { qty } from '@/games/grocery-empire/ui/format'
import { engine } from '@/games/grocery-empire/sim/engine'
import { PRIMARY_SAVE_ID, setActiveSaveId } from '@/games/grocery-empire/sim/saveKey'
import { loadGame } from '@/shared/save'
import {
  clearDailyPending,
  deactivateDailyChallenge,
  hasPrimaryGrocerySave,
  loadDailyChallenge,
  prepareDailyChallengeStart,
  todaysChallenge,
} from './dailyChallenge'
import { localDayKey } from './dailyStamp'
import { useMeta } from './MetaContext'
import { ShellFrame } from './ShellFrame'
import './home.css'

interface SaveGlance {
  lastSavedAt?: number
  baskets?: number
  era?: number
  cash?: number
  stats?: { sold?: number; playSec?: number }
  rates?: { soldPerSec?: number }
  tutorials?: { done?: Record<string, boolean> }
}

function formatAge(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000))
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 48) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function playTime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function Shelf() {
  const { meta, dailyStampLine } = useMeta()
  const reduce = useReducedMotion() || meta.settings.reducedMotion
  const [selected, setSelected] = useState(GAMES[0].id)
  const [now, setNow] = useState(Date.now())
  const [burst, setBurst] = useState(false)
  const nav = useNavigate()
  const game = GAMES.find((g) => g.id === selected) ?? GAMES[0]
  const playable = game.status === 'playable'
  const save = playable ? loadGame<SaveGlance>('grocery-empire') : null
  const bulletin = latestNews()

  const continuePlay = useCallback(() => {
    if (!reduce) {
      setBurst(true)
      window.setTimeout(() => setBurst(false), 700)
      window.setTimeout(() => nav(`/play/${game.id}`), 180)
      return
    }
    nav(`/play/${game.id}`)
  }, [game.id, nav, reduce])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const selectByOffset = useCallback((delta: number) => {
    setSelected((cur) => {
      const i = GAMES.findIndex((g) => g.id === cur)
      return GAMES[(i + delta + GAMES.length) % GAMES.length].id
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'Escape') {
        e.preventDefault()
        ;(document.activeElement as HTMLElement | null)?.blur?.()
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        selectByOffset(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        selectByOffset(-1)
      } else if (e.key === 'Enter' && playable) {
        // Let focused buttons and links handle their own Enter.
        if (t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return
        e.preventDefault()
        continuePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [continuePlay, playable, selectByOffset])

  const age = save && typeof save.lastSavedAt === 'number' && save.lastSavedAt > 0 ? formatAge(now - save.lastSavedAt) : null
  const era = typeof save?.era === 'number' ? Math.max(0, Math.floor(save.era)) : null
  const eraTitle = era != null ? ERA_STORY[era]?.title : null
  const baskets = typeof save?.baskets === 'number' ? Math.floor(save.baskets) : null
  const soldRate = save?.rates?.soldPerSec
  const rateText = typeof soldRate === 'number' && Number.isFinite(soldRate) ? `${soldRate < 100 ? soldRate.toFixed(1) : qty(soldRate, 'named')}/s` : '—'
  const playSec = save?.stats?.playSec ?? 0
  const lesson = nextLesson(era ?? 0, save?.tutorials?.done ?? {})
  const lessonsDone = Object.values(save?.tutorials?.done ?? {}).filter(Boolean).length
  const awards = Object.keys(meta.achievements).length
  const pack = TEXTURE_PACKS.find((p) => p.id === meta.equippedPack) ?? TEXTURE_PACKS[0]
  const affordablePacks = TEXTURE_PACKS.filter((p) => !meta.unlockedPacks.includes(p.id) && p.tokenCost <= meta.shelfTokens).length

  const newGame = () => {
    if (save && !window.confirm('Start a new Grocery Empire? This wipes the current local save.')) return
    deactivateDailyChallenge()
    clearDailyPending()
    setActiveSaveId(PRIMARY_SAVE_ID)
    // Wipe disk AND the live engine singleton (clearGameSave alone is not enough).
    engine.newGame()
    nav(`/play/${game.id}`)
  }

  const today = localDayKey()
  const dailyBlob = loadDailyChallenge()
  const dailyToday = todaysChallenge()
  const dailyActive = !!dailyBlob?.active && dailyBlob.day === today
  const bestToday = meta.dailyChallengeBest?.day === today ? meta.dailyChallengeBest : null

  const startDaily = () => {
    if (!playable) return
    const hasSave = hasPrimaryGrocerySave()
    if (hasSave) {
      const ok = window.confirm("Start Today's corner? Your current save will be copied to slot 3, then replaced with a fresh seeded Era-0 run.")
      if (!ok) return
    }
    prepareDailyChallengeStart({ stashToSlot3: hasSave })
    nav(`/play/${game.id}`)
  }

  const cover = game.id === 'grocery-empire' ? GE_COVER : null
  const bulletinArt = newsArt(bulletin)
  const bulletinPlate = bulletinArt === 'worlds' || bulletinArt === 'desk' ? null : PLATES[bulletinArt]

  return (
    <ShellFrame variant="overlay" title="Home">
      <div className="hm" style={{ ['--hm-accent' as string]: game.accent }}>
        <section className="hm-stage" style={cover ? { ['--hm-cover' as string]: `url(${cover})` } : undefined}>
          <div className="hm-stage__bg" aria-hidden />
          <div className="hm-stage__inner">
            <motion.div
              className="hm-marquee"
              key={game.id}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <p className="sd-eyebrow sd-eyebrow--tag">
                <span className="hm-dot" aria-hidden />
                GAMES · long games on one shelf
              </p>
              <h1 className="hm-title">{game.title}</h1>
              <p className="hm-tag">{game.tagline}</p>

              {playable ? (
                <>
                  <div className={`hm-acts${burst ? ' is-burst' : ''}`}>
                    <Button tone="free" size="lg" className="hm-play" onClick={continuePlay}>
                      {save ? 'Continue' : 'Start'}
                    </Button>
                    <Button tone="secondary" size="lg" onClick={startDaily} title={save ? `Seed ${dailyToday.seed} · parks this run in slot 3` : `Seed ${dailyToday.seed}`}>
                      Today&apos;s corner
                    </Button>
                    {save ? (
                      <Button tone="ghost" size="lg" onClick={newGame}>
                        New game
                      </Button>
                    ) : null}
                    {burst ? (
                      <span className="shelf-scrap-burst" aria-hidden>
                        {Array.from({ length: 8 }, (_, i) => (
                          <i key={i} className={`shelf-scrap shelf-scrap--${i + 1}`} />
                        ))}
                      </span>
                    ) : null}
                  </div>

                  {save ? (
                    <div className="hm-save" aria-label="Your run">
                      <div className="hm-save__era">
                        <span className="hm-save__n">{era ?? 0}</span>
                        <div>
                          <span className="sd-eyebrow">Your run{age ? ` · saved ${age}` : ''}</span>
                          <strong>{eraTitle ?? 'The Counter'}</strong>
                        </div>
                      </div>
                      <div className="sd-stats">
                        <div className="sd-stat">
                          <span>Baskets</span>
                          <strong title={baskets != null ? String(baskets) : undefined}>{baskets != null ? qty(baskets, 'named') : '—'}</strong>
                        </div>
                        <div className="sd-stat">
                          <span>Selling</span>
                          <strong>{rateText}</strong>
                        </div>
                        <div className="sd-stat">
                          <span>Played</span>
                          <strong>{playTime(playSec)}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="hm-first">
                      A neighbourhood shelf, one price and a stack of crates. About an hour to the corner store; forty to the last aisle.
                    </p>
                  )}
                  <p className="hm-note">
                    Today&apos;s corner is a seeded Era-0 run{save ? ' — it parks your current run in slot 3.' : '.'}
                    {dailyActive ? ` Seed ${dailyBlob?.seed ?? dailyToday.seed} is running${bestToday ? `, best ${qty(bestToday.baskets, 'named')} baskets` : ''}.` : bestToday ? ` Today's best: ${qty(bestToday.baskets, 'named')} baskets.` : ''}
                  </p>
                </>
              ) : (
                <p className="hm-first">This spine is empty for now. Check back later.</p>
              )}
            </motion.div>

            <div className="hm-shelf">
              <motion.div
                className="hm-shelf__row"
                role="listbox"
                aria-label="Games"
                aria-activedescendant={`game-${selected}`}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, duration: 0.4 }}
              >
                {GAMES.map((g) => (
                  <motion.button
                    key={g.id}
                    id={`game-${g.id}`}
                    type="button"
                    role="option"
                    aria-selected={selected === g.id}
                    className={`hm-spine ${selected === g.id ? 'is-on' : ''} is-${g.status}`}
                    style={{ ['--card-accent' as string]: g.accent }}
                    whileHover={reduce || g.status !== 'playable' ? undefined : { y: -10, rotate: -1 }}
                    whileTap={reduce || g.status !== 'playable' ? undefined : { scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    onClick={() => setSelected(g.id)}
                  >
                    {g.id === 'grocery-empire' ? <span className="hm-spine__cover" style={{ backgroundImage: `url(${GE_COVER})` }} aria-hidden /> : null}
                    <span className="hm-spine__band" aria-hidden />
                    <span className="hm-spine__title">{g.title}</span>
                    <span className="hm-spine__status">{g.status === 'playable' ? 'Playable' : 'Coming soon'}</span>
                  </motion.button>
                ))}
              </motion.div>
              <div className="hm-shelf__board" aria-hidden />
            </div>
          </div>
        </section>

        <section className="hm-desk" aria-label="Around the shop">
          <Link to={`/news/${bulletin.id}`} className="hm-card hm-card--news">
            <span className="hm-card__art" style={bulletinPlate ? { backgroundImage: `url(${bulletinPlate})` } : undefined} aria-hidden />
            <span className="sd-eyebrow sd-eyebrow--tomato">The Block Bulletin · v{bulletin.version}</span>
            <strong>{bulletin.headline}</strong>
            <em>{bulletin.dek}</em>
            <span className="hm-card__go">Read the edition →</span>
          </Link>

          <Link to={lesson ? `/guide/grocery-empire/learn/${lesson.id}` : '/guide/grocery-empire'} className="hm-card hm-card--wiki">
            <span className="hm-card__ico" aria-hidden>
              ?
            </span>
            <span className="sd-eyebrow">Ops Wiki</span>
            <strong>{lesson ? `Next lesson: ${lesson.name}` : 'Walkthroughs for every era'}</strong>
            <em>{lesson ? lesson.steps[0]?.body : 'Atlas, glossary and every fork explained.'}</em>
            <span className="hm-meter" aria-label={`${lessonsDone} of ${LESSON_COUNT} lessons`}>
              <i style={{ width: `${(lessonsDone / LESSON_COUNT) * 100}%` }} />
            </span>
            <span className="hm-card__go">
              {lessonsDone}/{LESSON_COUNT} lessons · open the wiki →
            </span>
          </Link>

          <Link to="/achievements" className="hm-card hm-card--awards">
            <span className="hm-card__ico hm-card__ico--medal" aria-hidden>
              ★
            </span>
            <span className="sd-eyebrow">Awards</span>
            <strong>
              {awards} of {ACHIEVEMENTS.length} earned
            </strong>
            <em>Each award pays shelf tokens for the shop.</em>
            <span className="hm-meter">
              <i style={{ width: `${(awards / Math.max(1, ACHIEVEMENTS.length)) * 100}%` }} />
            </span>
            <span className="hm-card__go">See the wall →</span>
          </Link>

          <Link to="/shop" className="hm-card hm-card--shop" style={{ ['--pk-bg' as string]: pack.vars['--bg'], ['--pk-accent' as string]: pack.vars['--accent'] }}>
            <span className="hm-card__swatch" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className="sd-eyebrow">Shop</span>
            <strong>
              <span className="sd-coin">¢</span> {meta.shelfTokens} token{meta.shelfTokens === 1 ? '' : 's'}
            </strong>
            <em>
              Wearing {pack.name}.{' '}
              {affordablePacks ? `${affordablePacks} pack${affordablePacks === 1 ? '' : 's'} in reach.` : 'Packs change paper and light, never the math.'}
            </em>
            <span className="hm-card__go">Dress the counter →</span>
          </Link>
        </section>

        <footer className="hm-foot">
          {dailyStampLine || (meta.dailyStreak ?? 0) > 0 ? <span>{dailyStampLine ?? `Daily streak · day ${meta.dailyStreak}`}</span> : null}
          <span className="hm-keys">
            <kbd>←</kbd>
            <kbd>→</kbd> pick a spine · <kbd>Enter</kbd> play · <kbd>?</kbd> keys
          </span>
          {import.meta.env.DEV ? (
            <LinkButton to="/play/grocery-empire/dev" tone="ghost" size="sm">
              DevMode
            </LinkButton>
          ) : null}
        </footer>
      </div>
    </ShellFrame>
  )
}

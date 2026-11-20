import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ACHIEVEMENTS } from '@/achievements/registry'
import { TEXTURE_PACKS } from '@/cosmetics/packs'
import { GAMES } from '@/games/registry'
import { GE_COVER, PLATES } from '@/games/grocery-empire/art/cast'
import { SD_COVER } from '@/games/signal-decay/art/cast'
import { ERA_TITLES as SD_ERA_TITLES } from '@/games/signal-decay/sim/balance'
import { PRIMARY_SAVE_ID as SD_PRIMARY_SAVE_ID } from '@/games/signal-decay/sim/saveKey'
import { ERA_STORY } from '@/games/grocery-empire/content/lore'
import { latestNews, newsArt } from '@/games/grocery-empire/content/news'
import { LESSON_COUNT, nextLesson } from '@/games/grocery-empire/content/wiki/lessons'
import { Button, LinkButton } from '@/games/grocery-empire/ui/kit'
import { qty } from '@/games/grocery-empire/ui/format'
import { engine } from '@/games/grocery-empire/sim/engine'

import { loadGame } from '@/shared/save'
import {
  hasPrimaryGrocerySave,
  loadDailyChallenge,
  prepareDailyChallengeStart,
  todaysChallenge,
} from './dailyChallenge'
import { dailyTheme, localDayKey, streakWeek } from './dailyStamp'
import { NewGameDialog } from './NewGameDialog'
import { ShellConfirm } from './SaveSlots'
import { museumStore } from '@/games/grocery-empire/ui/museum/store'
import { useAuth } from './AuthContext'
import { useMeta } from './MetaContext'
import { ShellFrame } from './ShellFrame'
import { fetchProfilesByIds, listFriendships } from './social/api'
import './home.css'

interface SaveGlance {
  lastSavedAt?: number
  baskets?: number
  era?: number
  cash?: number
  stats?: { sold?: number; playSec?: number }
  rates?: { soldPerSec?: number; revenuePerSec?: number }
  tutorials?: { done?: Record<string, boolean> }
  depth?: { stars?: number; cleanLogsLifetime?: number }
  time?: number
}

function coverForGame(id: string): string | null {
  if (id === 'grocery-empire') return GE_COVER
  if (id === 'signal-decay') return SD_COVER
  return null
}

function loadGlance(gameId: string): SaveGlance | null {
  if (gameId === 'grocery-empire') return loadGame<SaveGlance>('grocery-empire')
  if (gameId === 'signal-decay') return loadGame<SaveGlance>(SD_PRIMARY_SAVE_ID)
  return null
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
  const { user, profile, savesReady, hydrating, signInWithGoogle } = useAuth()
  const locked = !user
  const readyToPlay = !!user && savesReady
  const reduce = useReducedMotion() || meta.settings.reducedMotion
  const [selected, setSelected] = useState(GAMES[0].id)
  const [now, setNow] = useState(Date.now())
  const [burst, setBurst] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authErr, setAuthErr] = useState<string | null>(null)
  const [friendsLive, setFriendsLive] = useState(0)
  const nav = useNavigate()
  const game = GAMES.find((g) => g.id === selected) ?? GAMES[0]
  const playable = game.status === 'playable'
  const isGe = game.id === 'grocery-empire'
  const isSd = game.id === 'signal-decay'
  const save = readyToPlay && playable ? loadGlance(game.id) : null
  const bulletin = latestNews()

  const askSignIn = useCallback(async () => {
    setAuthBusy(true)
    setAuthErr(null)
    const { error } = await signInWithGoogle()
    if (error) setAuthErr(error)
    setAuthBusy(false)
  }, [signInWithGoogle])

  const continuePlay = useCallback(() => {
    if (locked) {
      void askSignIn()
      return
    }
    if (!readyToPlay) return
    if (!reduce) {
      setBurst(true)
      window.setTimeout(() => setBurst(false), 700)
      window.setTimeout(() => nav(`/play/${game.id}`), 180)
      return
    }
    nav(`/play/${game.id}`)
  }, [askSignIn, game.id, locked, nav, readyToPlay, reduce])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!user || !savesReady) {
      setFriendsLive(0)
      return
    }
    let cancelled = false
    const load = async () => {
      const fs = await listFriendships(user.id)
      const accepted = fs.filter((f) => f.status === 'accepted')
      const ids = accepted.map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id))
      const profiles = await fetchProfilesByIds(ids)
      if (cancelled) return
      let live = 0
      for (const p of profiles.values()) {
        if (p.playing_game || (p.last_seen_at && Date.now() - new Date(p.last_seen_at).getTime() < 2 * 60_000)) {
          live += 1
        }
      }
      setFriendsLive(live)
    }
    void load()
    const id = window.setInterval(() => void load(), 60_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [user, savesReady])

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
  const eraTitle =
    era != null ? (isSd ? SD_ERA_TITLES[era] : ERA_STORY[era]?.title) : null
  const baskets = typeof save?.baskets === 'number' ? Math.floor(save.baskets) : null
  const cash = typeof save?.cash === 'number' ? save.cash : null
  const stars = typeof save?.depth?.stars === 'number' ? save.depth.stars : null
  const soldRate = isSd ? save?.rates?.revenuePerSec : save?.rates?.soldPerSec
  const rateText =
    typeof soldRate === 'number' && Number.isFinite(soldRate)
      ? `${soldRate < 100 ? soldRate.toFixed(1) : qty(soldRate, 'named')}/s`
      : '—'
  const playSec = isSd
    ? Math.floor(typeof save?.time === 'number' ? save.time : 0)
    : (save?.stats?.playSec ?? 0)
  const lesson = isGe ? nextLesson(era ?? 0, save?.tutorials?.done ?? {}) : null
  const lessonsDone = isGe
    ? Object.values(save?.tutorials?.done ?? {}).filter(Boolean).length
    : 0
  const awards = Object.keys(meta.achievements).length
  const relicCount = Object.keys(museumStore.get().relics ?? {}).length
  const pack = TEXTURE_PACKS.find((p) => p.id === meta.equippedPack) ?? TEXTURE_PACKS[0]
  const affordablePacks = TEXTURE_PACKS.filter((p) => !meta.unlockedPacks.includes(p.id) && p.tokenCost <= meta.shelfTokens).length

  const [newGameOpen, setNewGameOpen] = useState(false)
  const [dailyAsk, setDailyAsk] = useState(false)
  const newGame = () => {
    if (locked) {
      void askSignIn()
      return
    }
    if (!readyToPlay) return
    if (isSd) {
      if (save && !window.confirm('Start a new Signal Decay? This wipes the current save on your account.')) return
      import('@/games/signal-decay/sim/engine').then(({ getSignalEngine }) => {
        getSignalEngine().newGame()
        nav(`/play/${game.id}`)
      })
      return
    }
    if (!save && relicCount === 0 && awards === 0) {
      // Nothing to lose and nothing to keep: just start.
      engine.newGame()
      nav(`/play/${game.id}`)
      return
    }
    setNewGameOpen(true)
  }

  const today = localDayKey()
  const dailyBlob = loadDailyChallenge()
  const dailyToday = todaysChallenge()
  const dailyActive = !!dailyBlob?.active && dailyBlob.day === today
  const bestToday = meta.dailyChallengeBest?.day === today ? meta.dailyChallengeBest : null

  const beginDaily = () => {
    prepareDailyChallengeStart({ stashToSlot3: hasPrimaryGrocerySave() })
    nav(`/play/${game.id}`)
  }
  const startDaily = () => {
    if (!playable) return
    if (locked) {
      void askSignIn()
      return
    }
    if (!readyToPlay) return
    if (hasPrimaryGrocerySave()) setDailyAsk(true)
    else beginDaily()
  }

  const cover = coverForGame(game.id)
  const bulletinArt = newsArt(bulletin)
  const bulletinPlate = bulletinArt === 'worlds' || bulletinArt === 'desk' ? null : PLATES[bulletinArt]

  return (
    <ShellFrame variant="overlay" title="Home">
      <NewGameDialog
        open={newGameOpen}
        onClose={() => setNewGameOpen(false)}
        onStarted={() => nav(`/play/${game.id}`)}
        relics={relicCount}
        awards={awards}
        tokens={meta.shelfTokens}
      />
      <ShellConfirm
        spec={
          dailyAsk
            ? {
                title: "Start today's corner?",
                body: 'Your current run is copied to save slot 3 first, then today’s run starts from the first counter.',
                confirmLabel: 'Start today’s corner',
                onConfirm: beginDaily,
              }
            : null
        }
        onClose={() => setDailyAsk(false)}
      />
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
              {!locked && profile ? (
                <Link to="/social" className="hm-presence">
                  {friendsLive > 0
                    ? `${friendsLive} friend${friendsLive === 1 ? '' : 's'} on the floor · you’re @${profile.handle}`
                    : `You’re @${profile.handle} · open the floor`}
                </Link>
              ) : null}

              {playable ? (
                <>
                  {locked ? (
                    <p className="hm-lock" role="status">
                      Sign in to unlock play, saves, Social, Shop and Awards. Browse the shelf anytime.
                    </p>
                  ) : null}
                  {authErr ? (
                    <p className="hm-lock hm-lock--err" role="alert">
                      {authErr}
                    </p>
                  ) : null}
                  <div className={`hm-acts${burst ? ' is-burst' : ''}${locked ? ' is-locked' : ''}`}>
                    <Button
                      tone="free"
                      size="lg"
                      className="hm-play"
                      disabled={authBusy || (!!user && !readyToPlay)}
                      onClick={continuePlay}
                    >
                      {locked
                        ? authBusy
                          ? 'Signing in…'
                          : 'Sign in to play'
                        : hydrating || !readyToPlay
                          ? 'Opening shelf…'
                          : save
                            ? 'Continue'
                            : 'Start'}
                    </Button>
                    {isGe ? (
                      <Button
                        tone="secondary"
                        size="lg"
                        disabled={authBusy || locked || !readyToPlay}
                        onClick={startDaily}
                        title={
                          locked
                            ? 'Sign in to play today’s corner'
                            : save
                              ? 'A fresh start shared by everyone today. Your run is kept in save slot 3.'
                              : 'A fresh start shared by everyone today.'
                        }
                      >
                        Today&apos;s corner
                      </Button>
                    ) : null}
                    {readyToPlay && save ? (
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

                  {readyToPlay && save ? (
                    <div className="hm-save" aria-label="Your run">
                      <div className="hm-save__era">
                        <span className="hm-save__n">{era ?? 0}</span>
                        <div>
                          <span className="sd-eyebrow">Your run{age ? ` · saved ${age}` : ''}</span>
                          <strong>{eraTitle ?? (isSd ? 'The Shack' : 'The Counter')}</strong>
                        </div>
                      </div>
                      <div className="sd-stats">
                        {isSd ? (
                          <>
                            <div className="sd-stat">
                              <span>Cash</span>
                              <strong>{cash != null ? `$${Math.floor(cash)}` : '—'}</strong>
                            </div>
                            <div className="sd-stat">
                              <span>Air</span>
                              <strong>{rateText}</strong>
                            </div>
                            <div className="sd-stat">
                              <span>Stars</span>
                              <strong>{stars != null ? stars.toFixed(1) : '—'}</strong>
                            </div>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="hm-first">
                      {isSd
                        ? 'One dial in a basement. Hold the lock, log a clean copy, and grow a Net that is already dying.'
                        : 'A neighbourhood shelf, one price and a stack of crates. See how far one counter can go.'}
                    </p>
                  )}
                  {readyToPlay && isGe ? (
                    <>
                      <div className="hm-daily" aria-label="Today's corner">
                        <div className="hm-daily__copy">
                          <strong>Today&apos;s corner · {dailyTheme(dailyToday.seed)}</strong>
                          <span>
                            {bestToday ? `Best today: ${qty(bestToday.baskets, 'named')} baskets.` : 'No run yet today.'}{' '}
                            {(meta.dailyStreak ?? 0) > 0 ? `Streak: ${meta.dailyStreak} day${meta.dailyStreak === 1 ? '' : 's'}.` : 'Play any day to start a streak.'}
                          </span>
                        </div>
                        <ol className="hm-week" aria-label="This week">
                          {streakWeek(meta.lastDailyStamp ?? null, meta.dailyStreak ?? 0).map((d) => (
                            <li
                              key={d.day}
                              className={`hm-week__day${d.stamped ? ' is-on' : ''}${d.today ? ' is-today' : ''}${d.future ? ' is-future' : ''}`}
                              title={`${d.day}${d.stamped ? ' · played' : d.future ? '' : ' · missed'}`}
                            >
                              <span>{d.letter}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <p className="hm-note">
                        Today&apos;s corner is the same fresh start for everyone, new each day.{save ? ' Your current run waits safely in save slot 3.' : ''}
                        {dailyActive ? ' You are playing it now.' : ''}
                      </p>
                    </>
                  ) : readyToPlay && isSd ? (
                    <p className="hm-note">Clarity decays. Antenna raises the window. The Next Goal strip never strands you.</p>
                  ) : null}
                </>
              ) : (
                <p className="hm-first">This game is not ready yet. Check back later.</p>
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
                    {coverForGame(g.id) ? (
                      <span
                        className="hm-spine__cover"
                        style={{ backgroundImage: `url(${coverForGame(g.id)})` }}
                        aria-hidden
                      />
                    ) : null}
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

          {locked ? (
            <button type="button" className="hm-card hm-card--social" onClick={() => void askSignIn()}>
              <span className="hm-card__ico" aria-hidden>
                ⌂
              </span>
              <span className="sd-eyebrow">Social</span>
              <strong>Locked until sign-in</strong>
              <em>Floor · Boards · Friends — run cards and presence on your account.</em>
              <span className="hm-card__go">Sign in →</span>
            </button>
          ) : (
            <Link to="/social" className="hm-card hm-card--social">
              <span className="hm-card__ico" aria-hidden>
                ⌂
              </span>
              <span className="sd-eyebrow">Social</span>
              <strong>Floor · Boards · Friends</strong>
              <em>
                {friendsLive > 0
                  ? `${friendsLive} friend${friendsLive === 1 ? '' : 's'} around right now.`
                  : 'Post a run card, climb the podium, or add a friend by code.'}
              </em>
              <span className="hm-card__go">Open Social →</span>
            </Link>
          )}

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

          {locked ? (
            <button type="button" className="hm-card hm-card--awards" onClick={() => void askSignIn()}>
              <span className="hm-card__ico hm-card__ico--medal" aria-hidden>
                ★
              </span>
              <span className="sd-eyebrow">Awards</span>
              <strong>Locked until sign-in</strong>
              <em>Earn awards on your account and spend them in the shop.</em>
              <span className="hm-card__go">Sign in →</span>
            </button>
          ) : (
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
          )}

          {locked ? (
            <button
              type="button"
              className="hm-card hm-card--shop"
              style={{ ['--pk-bg' as string]: pack.vars['--bg'], ['--pk-accent' as string]: pack.vars['--accent'] }}
              onClick={() => void askSignIn()}
            >
              <span className="hm-card__swatch" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="sd-eyebrow">Shop</span>
              <strong>Locked until sign-in</strong>
              <em>Packs and ornaments live on your account.</em>
              <span className="hm-card__go">Sign in →</span>
            </button>
          ) : (
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
          )}
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

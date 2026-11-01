import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GAMES } from '@/games/registry'
import { clearGameSave, loadGame } from '@/shared/save'
import {
  deactivateDailyChallenge,
  hasPrimaryGrocerySave,
  loadDailyChallenge,
  prepareDailyChallengeStart,
  todaysChallenge,
} from './dailyChallenge'
import { localDayKey } from './dailyStamp'
import { useMeta } from './MetaContext'

interface SaveGlance {
  lastSavedAt?: number
  baskets?: number
  era?: number
  time?: number
  lifetimeRevenue?: number
  stats?: { sold?: number; playSec?: number }
}

function formatAge(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 48) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

export function Shelf() {
  const { meta, dailyStampLine } = useMeta()
  const reduce = useReducedMotion() || meta.settings.reducedMotion
  const [selected, setSelected] = useState(GAMES[0].id)
  const [now, setNow] = useState(Date.now())
  const [burst, setBurst] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const nav = useNavigate()
  const game = GAMES.find((g) => g.id === selected) ?? GAMES[0]
  const save = game.status === 'playable' ? loadGame<SaveGlance>('grocery-empire') : null
  const playSec = save?.stats?.playSec ?? 0

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
      const next = (i + delta + GAMES.length) % GAMES.length
      return GAMES[next].id
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
      } else if (e.key === 'Enter' && game.status === 'playable') {
        e.preventDefault()
        continuePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [continuePlay, game.status, selectByOffset])

  const age =
    save && typeof save.lastSavedAt === 'number' && save.lastSavedAt > 0
      ? formatAge(now - save.lastSavedAt)
      : null
  const baskets = typeof save?.baskets === 'number' ? Math.floor(save.baskets) : null
  const lifetimeSold =
    typeof save?.stats?.sold === 'number' ? Math.floor(save.stats.sold) : null

  const newGame = () => {
    if (save && !window.confirm('Start a new Grocery Empire? This wipes the current local save.')) return
    deactivateDailyChallenge()
    clearGameSave('grocery-empire')
    nav(`/play/${game.id}`)
  }

  const today = localDayKey()
  const dailyBlob = loadDailyChallenge()
  const dailyToday = todaysChallenge()
  const dailyActive = !!dailyBlob?.active && dailyBlob.day === today
  const bestToday =
    meta.dailyChallengeBest?.day === today ? meta.dailyChallengeBest : null

  const startDaily = () => {
    if (game.status !== 'playable') return
    const hasSave = hasPrimaryGrocerySave()
    if (hasSave) {
      const ok = window.confirm(
        "Start Today's corner? Your current save will be copied to slot 3, then replaced with a fresh seeded Era-0 run.",
      )
      if (!ok) return
    }
    prepareDailyChallengeStart({ stashToSlot3: hasSave })
    nav(`/play/${game.id}`)
  }

  return (
    <div className="shelf-page">
      <div className="shelf-hero">
        <motion.h1
          layoutId="brand"
          className="brand"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          GAMES
        </motion.h1>
        <motion.p
          className="shelf-sub"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          A shelf of long games. Pull one down.
        </motion.p>
        <motion.p
          className="shelf-lore"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
        >
          Grocery Empire starts as one counter and grows into cold plants, fleets, and a hungry
          universe. Baskets are the score. You cannot lose — only arrive later.
        </motion.p>
      </div>

      <div className="shelf-wood">
        <motion.div
          className="shelf-row"
          role="listbox"
          aria-label="Games"
          aria-activedescendant={`game-${selected}`}
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
        >
          {GAMES.map((g, i) => (
            <motion.button
              key={g.id}
              id={`game-${g.id}`}
              type="button"
              role="option"
              aria-selected={selected === g.id}
              className={`game-card ${selected === g.id ? 'selected' : ''} ${g.status}`}
              style={{ ['--card-accent' as string]: g.accent }}
              whileHover={reduce ? undefined : { y: -8, rotate: selected === g.id ? -1.5 : -0.5 }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={() => setSelected(g.id)}
              layoutId={`card-${g.id}`}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              custom={i}
            >
              <div className="card-spine" />
              <div className="card-body">
                <h2>{g.title}</h2>
                <p>{g.status === 'playable' ? 'Playable' : 'Coming soon'}</p>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <motion.aside
        className="shelf-detail"
        layout
        key={game.id}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 style={{ color: game.accent }}>{game.title}</h2>
        <p>{game.tagline}</p>
        {save ? (
          <p className="muted">
            Save found
            {age ? ` · last saved ${age}` : ''}
            {baskets !== null ? ` · ${baskets.toLocaleString()} lifetime baskets` : ''}
            {lifetimeSold !== null ? ` · ${lifetimeSold.toLocaleString()} sold` : ''}
            {typeof save.era === 'number' ? ` · era ${save.era}` : ''}
          </p>
        ) : (
          <p className="muted">No save yet</p>
        )}
        <div className={`detail-actions ${burst ? 'detail-actions--burst' : ''}`.trim()}>
          {game.status === 'playable' ? (
            <>
              <button type="button" className="primary shelf-continue" onClick={continuePlay}>
                {save ? 'Continue' : 'New game'}
              </button>
              {save ? (
                <button type="button" onClick={newGame}>
                  New game
                </button>
              ) : null}
              <button type="button" onClick={startDaily} title={`Seed ${dailyToday.seed}`}>
                Today&apos;s corner
              </button>
              <Link to="/play/grocery-empire/dev" className="shelf-dev-link">
                DevMode
              </Link>
              <Link to="/guide/grocery-empire">Guide</Link>
              <Link to="/achievements">Achievements</Link>
              <Link to="/shop">Cosmetics</Link>
            </>
          ) : (
            <p className="muted">This spine is empty for now.</p>
          )}
          {burst ? (
            <span className="shelf-scrap-burst" aria-hidden>
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} className={`shelf-scrap shelf-scrap--${i + 1}`} />
              ))}
            </span>
          ) : null}
        </div>
        <p className="tokens">Shelf Tokens: {meta.shelfTokens}</p>
        <div className="shelf-profile">
          <button type="button" className="shelf-profile__btn" onClick={() => setProfileOpen((v) => !v)}>
            {profileOpen ? 'Hide profile' : 'Profile'}
          </button>
          {profileOpen ? (
            <ul className="shelf-profile__list">
              <li>Tokens · {meta.shelfTokens}</li>
              <li>Universes · {meta.groceryUniverses ?? 0}</li>
              <li>Lifetime XP · {meta.lifetimeXp ?? 0}</li>
              <li>
                Play · {Math.floor(playSec / 3600)}h {Math.floor((playSec % 3600) / 60)}m
              </li>
            </ul>
          ) : null}
        </div>
        {dailyStampLine || (meta.dailyStreak ?? 0) > 0 ? (
          <p className="muted shelf-daily-stamp" style={{ fontSize: 12 }}>
            {dailyStampLine ?? `Daily streak · day ${meta.dailyStreak}`}
          </p>
        ) : null}
        {game.status === 'playable' && dailyActive ? (
          <p className="muted shelf-daily-stamp" style={{ fontSize: 12 }}>
            Today&apos;s corner · seed {dailyBlob?.seed ?? dailyToday.seed}
            {bestToday ? ` · best ${bestToday.baskets.toLocaleString()} baskets` : ''}
          </p>
        ) : game.status === 'playable' && bestToday ? (
          <p className="muted shelf-daily-stamp" style={{ fontSize: 12 }}>
            Today&apos;s corner best · {bestToday.baskets.toLocaleString()} baskets · seed{' '}
            {bestToday.seed}
          </p>
        ) : null}
        <p className="muted" style={{ fontSize: 12 }}>
          Arrow keys move · Enter continues · Esc clears focus · ? hotkeys
        </p>
      </motion.aside>
    </div>
  )
}

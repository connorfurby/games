import { AnimatePresence, LayoutGroup, motion, MotionConfig } from 'motion/react'
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { applyAchievements } from '@/achievements/registry'
import { onAchievementToast } from '@/achievements/toastBus'
import { playAchievementFanfare } from '@/shared/audio'
import {
  consumeDailyPending,
  loadDailyChallenge,
  maybeRecordDailyBest,
} from '@/shell/dailyChallenge'
import { useMeta } from '@/shell/MetaContext'
import { MENUS, MENU_IDS, type MenuId } from '../content/menus'
import { pendingTip } from '../content/tips'
import { ERA_STORY } from '../content/lore'
import { PRICE } from '../sim/balance'
import type { Command } from '../sim/commands'
import { enterDevSandbox, ensurePrimarySandbox, leaveDevSandbox } from '../sim/devMode'
import { engine } from '../sim/engine'
import { canUndo } from '../sim/undo'
import { GameProvider } from './GameContext'
import { money, qty } from './format'
import { ChapterCard } from './components/ChapterCard'
import { CoachOverlay } from './components/Coach'
import { DevModeBar } from './components/DevModeBar'
import { Ledger } from './components/Ledger'
import { HungryLawsModal } from './components/HungryLaws'
import { IntroCutscene } from './components/IntroCutscene'
import { StoryBanner } from './components/StoryBanner'
import { OfflineReceiptModal } from './components/OfflineReceipt'
import { PopLayer, useSalePops } from './components/Pop'
import { Btn } from './components/Btn'
import { BackroomPanel } from './panels/BackroomPanel'
import { BooksPanel } from './panels/BooksPanel'
import { BuildPanel } from './panels/BuildPanel'
import { CoachPanel } from './panels/CoachPanel'
import { ColdPanel } from './panels/ColdPanel'
import { EmpirePanel } from './panels/EmpirePanel'
import { FleetPanel } from './panels/FleetPanel'
import { FloorPanel } from './panels/FloorPanel'
import { InvestPanel } from './panels/InvestPanel'
import { LandPanel } from './panels/LandPanel'
import { LogisticsPanel } from './panels/LogisticsPanel'
import { MarketingPanel } from './panels/MarketingPanel'
import { MemosPanel } from './panels/MemosPanel'
import { MorePanel } from './panels/MorePanel'
import { PoliticsPanel } from './panels/PoliticsPanel'
import { StaffPanel } from './panels/StaffPanel'
import { StrategyPanel } from './panels/StrategyPanel'
import { SuppliersPanel } from './panels/SuppliersPanel'
import { UpgradesPanel } from './panels/UpgradesPanel'
import { VenturesPanel } from './panels/VenturesPanel'
import './grocery.css'

/** Complete map — EmptyMenu is unreachable for any MenuId. */
const PANEL: Record<MenuId, () => ReactNode> = {
  floor: () => <FloorPanel />,
  backroom: () => <BackroomPanel />,
  suppliers: () => <SuppliersPanel />,
  staff: () => <StaffPanel />,
  marketing: () => <MarketingPanel />,
  books: () => <BooksPanel />,
  invest: () => <InvestPanel />,
  build: () => <BuildPanel />,
  upgrades: () => <UpgradesPanel />,
  ventures: () => <VenturesPanel />,
  land: () => <LandPanel />,
  empire: () => <EmpirePanel />,
  strategy: () => <StrategyPanel />,
  cold: () => <ColdPanel />,
  politics: () => <PoliticsPanel />,
  logistics: () => <LogisticsPanel />,
  fleet: () => <FleetPanel />,
  coach: () => <CoachPanel />,
  more: () => <MorePanel />,
}

const MENU_COACH: Partial<Record<MenuId, string>> = {
  staff: 'menu-staff',
  build: 'menu-build',
  upgrades: 'menu-upgrades',
  ventures: 'menu-ventures',
  suppliers: 'menu-suppliers',
  land: 'menu-land',
  empire: 'menu-empire',
  strategy: 'menu-strategy',
  cold: 'menu-cold',
  politics: 'menu-politics',
  logistics: 'menu-logistics',
  fleet: 'menu-fleet',
}

export function GroceryEmpireApp({ devMode = false }: { devMode?: boolean }) {
  const { meta, metaRef, replaceMeta, updateSettings } = useMeta()
  // Snapshot wrapper identity must change every tick (see engine.bump) or React
  // skips re-renders because GameState is mutated in place.
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
  const state = snap.state
  const pinned = meta.settings.pinnedMenu
  const [menu, setMenu] = useState<MenuId>(() =>
    pinned && MENU_IDS.includes(pinned as MenuId) ? (pinned as MenuId) : 'floor',
  )
  const [recentMenus, setRecentMenus] = useState<MenuId[]>([])
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])
  const [photoMode, setPhotoMode] = useState(false)
  const reducedMotion = meta.settings.reducedMotion
  const numberFormat = meta.settings.numberFormat
  const pops = useSalePops(state.baskets, reducedMotion, meta.settings.muted)

  const notifySig = useRef({ intervention: state.recovery?.lastInterventionAt ?? 0, brownouts: state.cold?.brownouts ?? 0 })
  const lastEraRef = useRef(state.era)
  const escDownAt = useRef<number | null>(null)
  const holdingEsc = useRef(false)
  const photoModeRef = useRef(photoMode)
  photoModeRef.current = photoMode
  const softPauseTutorialsRef = useRef(meta.settings.softPauseTutorials)
  softPauseTutorialsRef.current = meta.settings.softPauseTutorials
  const menuRef = useRef(menu)
  menuRef.current = menu

  useEffect(() => {
    if (devMode) enterDevSandbox()
    else ensurePrimarySandbox()
    engine.start()
    return () => {
      engine.setSoftPauseMul(1)
      engine.stop()
      if (devMode) leaveDevSandbox()
    }
  }, [devMode])

  // Shelf "Today's corner" — never apply to DevMode sandbox.
  useEffect(() => {
    if (devMode) return
    if (!consumeDailyPending()) return
    const daily = loadDailyChallenge()
    if (!daily?.active) return
    engine.newGame(daily.seed)
  }, [devMode])

  // Local daily leaderboard: best baskets for today's seeded run.
  useEffect(() => {
    if (devMode) return
    const next = maybeRecordDailyBest(metaRef.current, state.baskets, state.seed)
    if (next !== metaRef.current) replaceMeta(next)
  }, [state.baskets, state.seed, metaRef, replaceMeta, devMode])

  // Keep last 3 menus for the Recent chip row (skip no-ops when already current).
  useEffect(() => {
    setRecentMenus((prev) => {
      if (prev[0] === menu) return prev
      return [menu, ...prev.filter((x) => x !== menu)].slice(0, 3)
    })
  }, [menu])

  // Finishing eras earns Shelf Tokens (plan C3) — never from DevMode.
  useEffect(() => {
    const prev = lastEraRef.current
    if (state.era <= prev) return
    const gained = state.era - prev
    lastEraRef.current = state.era
    if (devMode) return
    replaceMeta({
      ...metaRef.current,
      shelfTokens: (metaRef.current.shelfTokens ?? 0) + gained,
    })
  }, [state.era, metaRef, replaceMeta, devMode])

  const restoreSoftPauseMul = () => {
    if (photoModeRef.current || holdingEsc.current) {
      engine.setSoftPauseMul(0)
      return
    }
    // Freeze the world during the opening cutscene so the story can be read.
    if (!engine.getState().introSeen) {
      engine.setSoftPauseMul(0)
      return
    }
    const soft =
      softPauseTutorialsRef.current && engine.getState().tutorials.active ? 0.25 : 1
    engine.setSoftPauseMul(soft)
  }

  // Soft-pause: intro / photo / Esc-hold freeze; coach soft-pauses (plan O1 / R).
  useEffect(() => {
    restoreSoftPauseMul()
  }, [meta.settings.softPauseTutorials, state.tutorials.active, state.introSeen, photoMode])

  useEffect(() => {
    if (devMode) return
    try {
      const next = applyAchievements(state, metaRef.current)
      if (next !== metaRef.current) replaceMeta(next)
    } catch {
      /* Achievements registry may lag GameState shape; never crash play. */
    }
    // snap.v — GameState is mutated in place; depend on version so we re-check each tick.
  }, [snap.v, state, metaRef, replaceMeta, devMode])

  // Accept ending: bump groceryUniverses once; Hungry laws modal clears pendingAccept.
  const acceptHandled = useRef(false)
  useEffect(() => {
    if (devMode) return
    if (!state.pendingAccept) {
      acceptHandled.current = false
      return
    }
    if (acceptHandled.current) return
    acceptHandled.current = true
    replaceMeta({
      ...metaRef.current,
      groceryUniverses: (metaRef.current.groceryUniverses ?? 0) + 1,
      groceryEnding: 'accept',
      lifetimeXp: metaRef.current.lifetimeXp + 50,
    })
  }, [state.pendingAccept, metaRef, replaceMeta, devMode])

  useEffect(() => {
    return onAchievementToast((message) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t.slice(-4), { id, text: message }])
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
      playAchievementFanfare(meta.settings.muted)
    })
  }, [meta.settings.muted])

  useEffect(() => {
    if (state.menus[menu]) return
    const pin = meta.settings.pinnedMenu
    if (pin && MENU_IDS.includes(pin as MenuId) && state.menus[pin as MenuId]) {
      setMenu(pin as MenuId)
      return
    }
    const first = MENU_IDS.find((id) => state.menus[id]) ?? 'floor'
    setMenu(first)
  }, [state.menus, menu, meta.settings.pinnedMenu])

  // Hidden-tab notices for high-signal recovery / cold events.
  useEffect(() => {
    const prev = notifySig.current
    const intervention = state.recovery?.lastInterventionAt ?? 0
    const brownouts = state.cold?.brownouts ?? 0
    const enabled = meta.settings.notifyEnabled
    const hidden = typeof document !== 'undefined' && document.visibilityState !== 'visible'
    const fire = (title: string, body: string) => {
      if (!enabled || !hidden) return
      try {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
        new Notification(title, { body, silent: true })
      } catch {
        /* never required */
      }
    }
    if (intervention > prev.intervention) fire('Grocery Empire', 'Operations intervened — recovery kicked in.')
    if (brownouts > prev.brownouts) fire('Grocery Empire', 'Cold brownout — check Freshness.')
    notifySig.current = { intervention, brownouts }
  }, [
    state.recovery?.lastInterventionAt,
    state.cold?.brownouts,
    meta.settings.notifyEnabled,
  ])

  const dispatch = (cmd: Command) => {
    engine.dispatch(cmd)
  }

  const menuPinned = meta.settings.pinnedMenu === menu
  const togglePin = () => {
    updateSettings({ pinnedMenu: menuPinned ? null : menu })
  }

  const unlockedMenus = MENU_IDS.filter((id) => {
    try {
      return !!state.menus[id]
    } catch {
      return false
    }
  })

  // Engine ticks re-render this tree; canUndo() is time-gated (5s).
  const undoGate = canUndo()

  useEffect(() => {
    const typingTarget = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false
      return (
        t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.tagName === 'SELECT' ||
        t.isContentEditable
      )
    }

    const restoreSoftPause = () => {
      if (photoModeRef.current || holdingEsc.current) {
        engine.setSoftPauseMul(0)
        return
      }
      const live = engine.getState()
      const soft =
        softPauseTutorialsRef.current && live.tutorials.active ? 0.25 : 1
      engine.setSoftPauseMul(soft)
    }

    const onKey = (e: KeyboardEvent) => {
      if (typingTarget(e.target)) return
      // HotkeyOverlay owns ? / Shift+/
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) return

      if (e.key === 'Escape') {
        e.preventDefault()
        if (escDownAt.current == null) {
          escDownAt.current = performance.now()
          holdingEsc.current = true
          engine.setSoftPauseMul(0)
        }
        return
      }

      // Ctrl/Cmd+Z → undo last spend only while undoGate.ok (5s window). Leave bare U for Unpack.
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (canUndo().ok) engine.undo()
        return
      }

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        setPhotoMode((v) => {
          if (!v) setMenu('floor')
          return !v
        })
        return
      }

      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault()
        dispatch({ type: 'unpack' })
        return
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        dispatch({ type: 'setPaused', paused: !engine.getState().paused })
        return
      }

      if (e.key === '[' || e.key === '-') {
        e.preventDefault()
        const cur = engine.getState().price
        dispatch({ type: 'setPrice', price: Math.max(PRICE.min, Math.round((cur - 0.1) * 100) / 100) })
        return
      }
      if (e.key === ']' || e.key === '=' || e.key === '+') {
        e.preventDefault()
        const cur = engine.getState().price
        dispatch({ type: 'setPrice', price: Math.min(PRICE.max, Math.round((cur + 0.1) * 100) / 100) })
        return
      }

      // Digits 1–9 → unlocked menus; skip while coach tour is active.
      if (!engine.getState().tutorials.active && e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1
        const ids = MENU_IDS.filter((id) => !!engine.getState().menus[id])
        const next = ids[idx]
        if (next) {
          e.preventDefault()
          setMenu(next)
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const down = escDownAt.current
      escDownAt.current = null
      holdingEsc.current = false
      restoreSoftPause()
      if (down == null) return
      const held = performance.now() - down
      if (held >= 350) return // hold = soft-pause only
      e.preventDefault()
      const live = engine.getState()
      if (live.offlineReceipt) {
        engine.dispatch({ type: 'dismissOfflineReceipt' })
        return
      }
      if (live.chapterQueue[0] != null) {
        engine.dispatch({ type: 'acceptChapter' })
        return
      }
      if (live.tutorials.active) {
        engine.dispatch({ type: 'skipTutorial' })
        return
      }
      if (photoModeRef.current) {
        setPhotoMode(false)
        return
      }
      if (menuRef.current !== 'floor' && live.menus.floor) {
        setMenu('floor')
        return
      }
      if (!live.paused) {
        engine.dispatch({ type: 'setPaused', paused: true })
      }
      // Floor + already paused: do not navigate to Shelf (Space pauses; Link is separate).
    }

    const onBlur = () => {
      // Lost keyup (alt-tab mid Esc-hold) must not leave softPauseMul at 0 forever.
      if (!holdingEsc.current) return
      holdingEsc.current = false
      escDownAt.current = null
      restoreSoftPause()
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  const speeds = meta.settings.speedUnlock ? [1, 2, 4, 8] : [1, 2]
  const chapterEra = state.chapterQueue[0]
  const Active = PANEL[menu]!
  const tip = pendingTip(state)

  const setPhotoModeUi = (on: boolean) => {
    setPhotoMode(on)
    if (on) setMenu('floor')
  }

  const ctx = {
    state,
    dispatch,
    reducedMotion,
    numberFormat,
    activeMenu: menu,
    setActiveMenu: (id: string) => {
      if (MENU_IDS.includes(id as MenuId) && state.menus[id as MenuId]) setMenu(id as MenuId)
    },
    photoMode,
    setPhotoMode: setPhotoModeUi,
  }

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <GameProvider value={ctx}>
        <div
          className={`ge-root ge-root--${meta.settings.presentation}${
            state.paused ? ' ge-root--paused' : ''
          }${photoMode ? ' ge-root--photo' : ''}${devMode ? ' ge-root--dev' : ''}`.trim()}
        >
          {devMode ? <DevModeBar /> : null}
          <header className="ge-top">
            <div className="ge-baskets" data-coach-id="floor-baskets">
              <span className="ge-baskets__label">Baskets</span>
              {qty(state.baskets, numberFormat)}
              {state.era < 1 && state.baskets < 40 ? (
                <span className="ge-baskets__hint">Score · never spends</span>
              ) : null}
              <PopLayer pops={pops} />
            </div>
            <div className="ge-top__cash">
              <span className="ge-top__cash-label">Cash</span>
              {money(state.cash, numberFormat)}
            </div>
            <span
              className="ge-top__era"
              title={ERA_STORY[state.era]?.epigraph ?? `Era ${state.era}`}
            >
              {ERA_STORY[state.era]?.title ?? `Era ${state.era}`}
            </span>
            <span
              className={`ge-live${state.paused ? ' is-paused' : ''}`}
              title={state.paused ? 'Paused' : `Live · tick ${snap.v}`}
              aria-label={state.paused ? 'Paused' : 'Live'}
            >
              {state.paused ? 'Paused' : 'Live'}
            </span>
            <Btn
              tone={state.paused ? 'primary' : 'ghost'}
              onClick={() => dispatch({ type: 'setPaused', paused: !state.paused })}
            >
              {state.paused ? 'Resume' : 'Pause'}
            </Btn>
            <Btn
              tone="ghost"
              disabled={!engine.canUndo()}
              title={
                undoGate.ok
                  ? `Undo ${undoGate.label ?? 'last action'} (Ctrl+Z · 5s)`
                  : 'Nothing to undo (Ctrl+Z · 5s)'
              }
              onClick={() => engine.undo()}
            >
              Undo
            </Btn>
            <div className="ge-chip-row" style={{ margin: 0 }}>
              {speeds.map((sp) => (
                <Btn
                  key={sp}
                  tone={state.speed === sp ? 'primary' : 'ghost'}
                  onClick={() => dispatch({ type: 'setSpeed', speed: sp })}
                >
                  {sp}×
                </Btn>
              ))}
            </div>
            <div className="ge-top__spacer" />
            <Link className="ge-top__link" to="/" data-coach-id="meta-shelf">
              ← Shelf
            </Link>
          </header>

          <nav className="ge-rail" aria-label="Departments">
            <LayoutGroup>
              {unlockedMenus.map((id) => {
                const def = MENUS[id]
                if (!def) return null
                const active = menu === id
                const isPinned = meta.settings.pinnedMenu === id
                return (
                  <button
                    key={id}
                    type="button"
                    className={`ge-rail__btn ${active ? 'is-active' : ''} ${isPinned ? 'is-pinned' : ''}`.trim()}
                    data-coach-id={MENU_COACH[id]}
                    onClick={() => setMenu(id)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      updateSettings({
                        pinnedMenu: isPinned ? null : id,
                      })
                    }}
                    title={`${def.purpose}${isPinned ? ' · pinned' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {active ? (
                      <motion.span
                        className="ge-rail__indicator"
                        layoutId="ge-rail-indicator"
                        style={{ position: 'absolute' }}
                        transition={
                          reducedMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 460, damping: 36, mass: 0.7 }
                        }
                      />
                    ) : null}
                    <span className="ge-rail__glyph">{def.glyph}</span>
                    <span>{def.name}</span>
                  </button>
                )
              })}
            </LayoutGroup>
          </nav>

          <main className="ge-main">
            <div className="ge-main__chrome">
              <Btn
                tone={menuPinned ? 'primary' : 'ghost'}
                onClick={togglePin}
                title={menuPinned ? 'Unpin this panel' : 'Pin this panel (restore on load)'}
              >
                {menuPinned ? 'Pinned' : 'Pin'}
              </Btn>
              {recentMenus.length > 0 ? (
                <div className="ge-recent" aria-label="Recently used menus">
                  <span className="ge-recent__label">Recent</span>
                  {recentMenus.map((id) => {
                    const def = MENUS[id]
                    if (!def || !state.menus[id]) return null
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`ge-recent__chip ${menu === id ? 'is-active' : ''}`.trim()}
                        onClick={() => setMenu(id)}
                      >
                        {def.name}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={menu}
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0.4, scale: 0.98 }}
                transition={{ duration: reducedMotion ? 0 : 0.22, ease: 'easeOut' }}
              >
                {Active()}
              </motion.div>
            </AnimatePresence>
          </main>

          <aside className="ge-memos-col">
            <MemosPanel compact />
          </aside>

          <footer className="ge-ledger-strip">
            <StoryBanner state={state} />
            <Ledger state={state} />
          </footer>

          {state.offlineReceipt ? (
            <OfflineReceiptModal
              receipt={state.offlineReceipt}
              reducedMotion={reducedMotion}
              onDismiss={() => dispatch({ type: 'dismissOfflineReceipt' })}
            />
          ) : null}

          {!state.offlineReceipt && !state.introSeen ? (
            <IntroCutscene
              reducedMotion={reducedMotion}
              onBeat={(index) => dispatch({ type: 'introBeat', index })}
              onFinish={() => dispatch({ type: 'finishIntro' })}
            />
          ) : null}

          {!state.offlineReceipt && state.introSeen && state.pendingAccept ? (
            <HungryLawsModal
              onConfirm={(mutators) => {
                replaceMeta({
                  ...metaRef.current,
                  hungryLaws: mutators,
                })
                dispatch({ type: 'confirmHungryLaws', mutators })
              }}
            />
          ) : null}

          {/* Chapter / coach wait until intro + offline receipt are clear. */}
          {!state.offlineReceipt &&
          state.introSeen &&
          !state.pendingAccept &&
          chapterEra != null ? (
            <ChapterCard
              era={chapterEra}
              reducedMotion={reducedMotion}
              onAccept={() => dispatch({ type: 'acceptChapter' })}
            />
          ) : null}

          {!state.offlineReceipt &&
          state.introSeen &&
          !state.pendingAccept &&
          !chapterEra &&
          state.tutorials.active ? (
            <CoachOverlay active={state.tutorials.active} />
          ) : null}

          {tip ? (
            <div className="ge-tip-whisper" role="status" aria-live="polite">
              <p className="ge-tip-whisper__text">{tip.text}</p>
              <Btn tone="ghost" onClick={() => dispatch({ type: 'dismissTip', id: tip.id })}>
                Got it
              </Btn>
            </div>
          ) : null}

          <div className="ge-toasts" aria-live="polite">
            <AnimatePresence>
              {toasts.map((t) => (
                <motion.div
                  key={t.id}
                  className="ge-toast"
                  initial={reducedMotion ? false : { opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {t.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </GameProvider>
    </MotionConfig>
  )
}

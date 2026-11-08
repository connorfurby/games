import { AnimatePresence, LayoutGroup, motion, MotionConfig } from 'motion/react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
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
import { MEMOS } from '../content/memos'
import { DIALOGUE_BY_ID } from '../content/dialogue'
import { can } from '../sim/commands'
import { pendingTip } from '../content/tips'
import { PRICE } from '../sim/balance'
import type { Command } from '../sim/commands'
import { enterDevSandbox, ensurePrimarySandbox, leaveDevSandbox } from '../sim/devMode'
import { engine } from '../sim/engine'
import {
  getSuggestions,
  suggestedChannels,
  type Suggestion,
} from '../sim/suggestions'
import { sumQty } from '../sim/helpers'
import { canUndo } from '../sim/undo'
import { GameProvider } from './GameContext'
import { ChapterCard } from './components/ChapterCard'
import { CoachOverlay } from './components/Coach'
import { DevModeBar } from './components/DevModeBar'
import { DialogueStrip } from './components/DialogueStrip'
import { Ledger } from './components/Ledger'
import { HungryLawsModal } from './components/HungryLaws'
import { IntroCutscene } from './components/IntroCutscene'
import { OfflineReceiptModal } from './components/OfflineReceipt'
import { useSalePops } from './components/Pop'
import { Btn } from './components/Btn'
import { channelToMenu, SuggestTip } from './components/SuggestTip'
import { Hud } from './shell/Hud'
import { HUBS, HUB_BY_ID, hubOf, type HubId } from './shell/hubs'
import { StoreScene } from './scene/StoreScene'
import './shell/g2.css'
import { useFxDeltas } from './hooks/useFxDeltas'
import { Icon } from './icons/Icon'
import { BackroomPanel } from './panels/BackroomPanel'
import { BooksPanel } from './panels/BooksPanel'
import { BuildPanel } from './panels/BuildPanel'
import { CoachPanel } from './panels/CoachPanel'
import { ColdPanel } from './panels/ColdPanel'
import { EmpireBoard } from './panels/EmpireBoard'
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
import { UpgradesBoard } from './panels/UpgradesBoard'
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
  upgrades: () => <UpgradesBoard />,
  ventures: () => <VenturesPanel />,
  land: () => <LandPanel />,
  empire: () => <EmpireBoard />,
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
  const { meta, metaRef, replaceMeta } = useMeta()
  // Snapshot wrapper identity must change every tick (see engine.bump) or React
  // skips re-renders because GameState is mutated in place.
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
  const state = snap.state
  const pinned = meta.settings.pinnedMenu
  const [menu, setMenu] = useState<MenuId>(() =>
    pinned && MENU_IDS.includes(pinned as MenuId) ? (pinned as MenuId) : 'floor',
  )
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])
  const [photoMode, setPhotoMode] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [inboxTab, setInboxTab] = useState<'memos' | 'ledger'>('memos')
  const lastInHub = useRef<Partial<Record<HubId, MenuId>>>({})
  const [focusNonce, setFocusNonce] = useState(0)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  const reducedMotion = meta.settings.reducedMotion
  const numberFormat = meta.settings.numberFormat
  const pops = useSalePops(state.baskets, reducedMotion, meta.settings.muted)
  const fx = useFxDeltas(state, reducedMotion)

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
    if (devMode) {
      enterDevSandbox()
    } else {
      ensurePrimarySandbox()
      // Disk is source of truth when (re)entering Play from the shelf.
      // Without this, the module singleton keeps the previous run in memory and
      // New Game (localStorage wipe only) looks like it "never works".
      engine.reloadFromDisk()
    }
    engine.start()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.classList.add('ge-playing')
    return () => {
      engine.setSoftPauseMul(1)
      engine.stop()
      if (devMode) leaveDevSandbox()
      document.body.style.overflow = prevOverflow
      document.documentElement.classList.remove('ge-playing')
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
    const check = engine.dispatch(cmd)
    if (!check.ok && check.reason) {
      const id = Date.now() + Math.random()
      const text = check.reason
      setToasts((t) => [...t.slice(-4), { id, text }])
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800)
    }
  }

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

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        setInboxOpen((v) => !v)
        return
      }

      // Digits 1–5 → hubs; skip while a coach tour is active.
      if (!engine.getState().tutorials.active && e.key >= '1' && e.key <= '5') {
        const h = HUBS[Number(e.key) - 1]
        const live = engine.getState()
        const ms = h ? h.menus.filter((id) => !!live.menus[id]) : []
        if (h && ms.length) {
          e.preventDefault()
          const last = lastInHub.current[h.id]
          setMenu(last && ms.includes(last) ? last : ms[0]!)
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
  // Memos you could file right now (Inbox badge).
  const inboxCount = useMemo(() => {
    let n = 0
    for (const m of MEMOS) {
      if (m.standing || m.fork) continue
      if ((state.memos[m.id] ?? 0) > 0 && !m.repeatable) continue
      if (!state.memoSeen[m.id]) continue
      if (can(state, { type: 'buyMemo', id: m.id }).ok) n++
    }
    return n
    // snap.v: state mutates in place
  }, [snap.v, state])

  // Each department opens at the top (the store scene lives there).
  const mainRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [menu])

  // Story lines read themselves out and move on; clicking still skips ahead.
  const lineId = state.dialogueQueue[0]
  useEffect(() => {
    if (!lineId || !state.introSeen || state.tutorials.active || state.chapterQueue[0] != null) return
    const words = (DIALOGUE_BY_ID[lineId]?.text ?? '').split(/\s+/).length
    const ms = Math.max(4500, words * 330)
    const t = window.setTimeout(() => engine.dispatch({ type: 'advanceDialogue' }), ms)
    return () => window.clearTimeout(t)
  }, [lineId, state.introSeen, state.tutorials.active, state.chapterQueue])
  const chapterEra = state.chapterQueue[0]
  const Active = PANEL[menu]!
  const tip = pendingTip(state)

  const suggestOn = !!meta.settings.suggestNext
  const suggestions = useMemo(
    () => (suggestOn ? getSuggestions(state, 10) : []),
    [snap.v, state, suggestOn],
  )
  const suggestChannels = useMemo(() => suggestedChannels(suggestions), [suggestions])
  const topSuggest = suggestions[0] ?? null

  const focusSuggestion = (s: Suggestion) => {
    if (s.channel === 'memos') setInboxOpen(true)
    const dest = channelToMenu(s.channel)
    if (dest && state.menus[dest]) setMenu(dest)
    setFocusTarget(s.target ?? null)
    setFocusNonce((n) => n + 1)
    // Double rAF so tab panels can remount the target before we scroll.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const sel = s.target
          ? `[data-suggest-id="${CSS.escape(s.target)}"], [data-coach-id="${CSS.escape(s.target)}"]`
          : null
        if (!sel) {
          if (s.channel === 'memos') {
            document.querySelector('.ge-memos-col')?.scrollIntoView({ block: 'nearest' })
          }
          return
        }
        const el = document.querySelector(sel)
        if (el instanceof HTMLElement) {
          el.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
          el.classList.add('ge-suggest-flash')
          window.setTimeout(() => el.classList.remove('ge-suggest-flash'), 1400)
        }
      })
    })
  }

  const setPhotoModeUi = (on: boolean) => {
    setPhotoMode(on)
    if (on) setMenu('floor')
  }

  const ctx = {
    state,
    tick: snap.v,
    dispatch,
    reducedMotion,
    numberFormat,
    activeMenu: menu,
    setActiveMenu: (id: string) => {
      if (MENU_IDS.includes(id as MenuId) && state.menus[id as MenuId]) setMenu(id as MenuId)
    },
    suggestions,
    focusSuggestion,
    focusNonce,
    focusTarget,
    photoMode,
    setPhotoMode: setPhotoModeUi,
  }

  const hub = hubOf(menu)
  const hubMenus = (h: HubId) => HUB_BY_ID[h].menus.filter((id) => !!state.menus[id])
  const openHub = (h: HubId) => {
    const ms = hubMenus(h)
    if (ms.length === 0) return
    const last = lastInHub.current[h]
    setMenu(last && ms.includes(last) ? last : ms[0]!)
  }
  if (hub) lastInHub.current[hub] = menu

  const showDialogue =
    !state.offlineReceipt &&
    state.introSeen &&
    !state.pendingAccept &&
    !chapterEra &&
    !state.tutorials.active &&
    !!state.dialogueQueue[0]

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <GameProvider value={ctx}>
        <div
          className={`ge-root g2-root ge-root--${meta.settings.presentation}${
            state.paused ? ' ge-root--paused' : ''
          }${photoMode ? ' ge-root--photo' : ''}${devMode ? ' ge-root--dev g2-root--dev' : ''}${
            fx.spoilWilt ? ' ge-root--spoil-wilt' : ''
          }${fx.bargeBirth ? ' ge-root--barge-birth' : ''}${inboxOpen ? ' g2-root--inbox' : ''}`.trim()}
          data-era={state.era}
        >
          {devMode ? <DevModeBar /> : null}
          <Hud
            state={state}
            pops={pops}
            speeds={speeds}
            numberFormat={numberFormat}
            dispatch={dispatch}
            onMenu={(id) => {
              if (state.menus[id]) setMenu(id)
            }}
            inboxCount={inboxCount}
            inboxOpen={inboxOpen}
            onInbox={() => setInboxOpen((v) => !v)}
          />

          <nav className="g2-hubs" aria-label="Departments">
            <LayoutGroup>
              {HUBS.map((h, i) => {
                const ms = hubMenus(h.id)
                if (ms.length === 0) return null
                const active = hub === h.id
                const hit = ms.some((m) => suggestChannels.has(m))
                return (
                  <button
                    key={h.id}
                    type="button"
                    className={`g2-hub${active ? ' is-active' : ''}${hit ? ' is-suggest' : ''}`}
                    onClick={() => openHub(h.id)}
                    title={`${h.purpose} (${i + 1})`}
                    aria-current={active ? 'page' : undefined}
                    data-coach-id={ms.map((m) => MENU_COACH[m]).find(Boolean)}
                  >
                    {active ? (
                      <motion.span
                        className="g2-hub__indicator"
                        layoutId="g2-hub-indicator"
                        transition={
                          reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 36, mass: 0.7 }
                        }
                      />
                    ) : null}
                    <Icon name={h.icon} size={20} />
                    <span className="g2-hub__name">{h.name}</span>
                    {hit ? <span className="g2-hub__dot" aria-label="Suggested" /> : null}
                  </button>
                )
              })}
            </LayoutGroup>
          </nav>

          <main className="g2-main" ref={mainRef}>
            {hub === 'store' && !photoMode ? <StoreScene state={state} /> : null}
            {photoMode ? <StoreScene state={state} /> : null}
            {hub && hubMenus(hub).length > 1 ? (
              <div className="g2-subtabs" role="tablist" aria-label={HUB_BY_ID[hub].name}>
                {hubMenus(hub).map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={menu === id}
                    className={`g2-subtab${menu === id ? ' is-active' : ''}${
                      suggestChannels.has(id) ? ' is-suggest' : ''
                    }`}
                    data-coach-id={MENU_COACH[id]}
                    onClick={() => setMenu(id)}
                    title={MENUS[id].purpose}
                  >
                    <Icon name={id} size={15} />
                    {MENUS[id].name}
                  </button>
                ))}
              </div>
            ) : null}
            {suggestOn && !photoMode && !state.offlineReceipt && state.introSeen ? (
              <SuggestTip
                tip={topSuggest}
                reducedMotion={reducedMotion}
                onGo={(sg) => focusSuggestion(sg)}
                onDo={(cmd) => {
                  dispatch(cmd)
                }}
              />
            ) : null}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={menu}
                className="ge-main__panel g2-panel"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: reducedMotion ? 0 : 0.16, ease: 'easeOut' }}
              >
                {Active()}
              </motion.div>
            </AnimatePresence>
          </main>

          <AnimatePresence>
            {inboxOpen ? (
              <motion.aside
                key="inbox"
                className={`g2-inbox ge-memos-col${suggestChannels.has('memos') ? ' ge-memos-col--suggest' : ''}`}
                aria-label="Memos and ledger"
                initial={reducedMotion ? false : { x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reducedMotion ? undefined : { x: 40, opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.18, ease: 'easeOut' }}
              >
                <div className="g2-inbox__head">
                  <div className="g2-inbox__tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={inboxTab === 'memos'}
                      className={`g2-subtab${inboxTab === 'memos' ? ' is-active' : ''}`}
                      onClick={() => setInboxTab('memos')}
                    >
                      Memos
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={inboxTab === 'ledger'}
                      className={`g2-subtab${inboxTab === 'ledger' ? ' is-active' : ''}`}
                      onClick={() => setInboxTab('ledger')}
                    >
                      Ledger
                    </button>
                  </div>
                  <button type="button" className="g2-icon-btn" onClick={() => setInboxOpen(false)} title="Close (M)">
                    ✕
                  </button>
                </div>
                <div className="g2-inbox__body">
                  {inboxTab === 'memos' ? <MemosPanel compact /> : <Ledger state={state} limit={60} />}
                </div>
              </motion.aside>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {showDialogue ? (
              <div className="g2-dialogue" key={state.dialogueQueue[0]}>
                <DialogueStrip
                  lineId={state.dialogueQueue[0]!}
                  reducedMotion={reducedMotion}
                  onNext={() => dispatch({ type: 'advanceDialogue' })}
                  onSkip={() => dispatch({ type: 'advanceDialogue' })}
                />
              </div>
            ) : null}
          </AnimatePresence>

          {state.offlineReceipt ? (
            <OfflineReceiptModal
              receipt={state.offlineReceipt}
              reducedMotion={reducedMotion}
              onDismiss={() => dispatch({ type: 'dismissOfflineReceipt' })}
              followUp={topSuggest}
              onFollowUp={focusSuggestion}
              nudge={(() => {
                const r = state.offlineReceipt
                const back = sumQty(state.backroom)
                if (r.spoiled > 0 && state.menus.backroom) {
                  return { menu: 'backroom' as const, label: 'Check Backroom', hint: 'Spoilage hit while you were away.' }
                }
                if (back > 0) {
                  return { menu: 'floor' as const, label: 'Unpack on Floor', hint: `${Math.floor(back)} waiting in the back.` }
                }
                if (state.menus.suppliers) {
                  return { menu: 'suppliers' as const, label: 'Restock via Suppliers', hint: 'The shelf may be thin.' }
                }
                return null
              })()}
              onNudge={(id) => {
                if (state.menus[id]) setMenu(id)
              }}
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

          {!state.offlineReceipt && state.introSeen && !state.pendingAccept && chapterEra != null ? (
            <ChapterCard
              era={chapterEra}
              reducedMotion={reducedMotion}
              onAccept={() => dispatch({ type: 'acceptChapter' })}
            />
          ) : null}

          {!state.offlineReceipt && state.introSeen && !state.pendingAccept && !chapterEra && state.tutorials.active ? (
            <CoachOverlay active={state.tutorials.active} />
          ) : null}

          {tip && state.introSeen && !state.offlineReceipt && !state.pendingAccept && !chapterEra && !showDialogue ? (
            <div className="ge-tip-whisper g2-whisper" role="status" aria-live="polite">
              <p className="ge-tip-whisper__text">{tip.text}</p>
              <Btn tone="ghost" onClick={() => dispatch({ type: 'dismissTip', id: tip.id })}>
                Got it
              </Btn>
            </div>
          ) : null}

          <div className="ge-toasts g2-toasts" aria-live="polite">
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

import './design/layers.css'
import './design/tokens.css'
import './design/sceneTokens.css'
import './shell/shell.css'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useSearchParams } from 'react-router-dom'
import {
  useCallback,
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
import { PRICE } from '../sim/balance'
import type { Command } from '../sim/commands'
import { enterDevSandbox, ensurePrimarySandbox, leaveDevSandbox } from '../sim/devMode'
import { engine } from '../sim/engine'
import {
  getSuggestions,
  suggestedChannels,
  type Suggestion,
} from '../sim/suggestions'
import { GameProvider, type GameCtxValue } from './GameContext'
import { FxLayer, useMilestones } from './fx'
import { DevModeBar } from './components/DevModeBar'
import { Ledger } from './components/Ledger'
import { useSalePops } from './components/Pop'
import { channelToMenu } from './components/SuggestTip'
import { Hud } from './shell/Hud'
import { useStable } from './useStable'
import { isDevSave } from '../sim/saveKey'
import { ToolsDrawer, type ToolsTab } from './shell/ToolsDrawer'
import { TUTORIAL_BY_ID } from '../content/tutorials'
import { HUBS, HUB_BY_ID, MENU_COACH, hubOf, type HubId } from './shell/hubs'
import { StoreScene } from './scene/StoreScene'
import { SceneStrip, useScenePref } from './shell/SceneStrip'
import { HubNav } from './shell/HubNav'
import { OverlayManager } from './shell/OverlayManager'
import { CommandPalette } from './shell/CommandPalette'
import { onInboxRequest, onWikiRequest } from './shell/uiBus'
import { setWikiLanding } from './wiki/wikiLanding'
import { computeHudAlert } from './shell/hudAlert'
import { onToastRequest, performUndo } from './shell/undoAction'
import { Button, ConfirmProvider, ToastProvider } from './kit'
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
import { RivalsPanel } from './panels/RivalsPanel'
import { EmpireMap } from './panels/EmpireMap'
import { MuseumPanel } from './museum/MuseumPanel'
import { useMuseumEarning } from './museum/useMuseumEarning'
import { useMuseum } from './museum/store'
import { StaffPanel } from './panels/StaffPanel'
import { StrategyPanel } from './panels/StrategyPanel'
import { SuppliersPanel } from './panels/SuppliersPanel'
import { UpgradesBoard } from './panels/UpgradesBoard'
import { VenturesPanel } from './panels/VenturesPanel'
import { PlanetsPanel } from './panels/PlanetsPanel'
import { ExchangePanel } from './panels/ExchangePanel'
import { CultivarPanel } from './panels/CultivarPanel'
import { SignalPanel } from './panels/SignalPanel'
import { CharterPanel } from './panels/CharterPanel'
import { LastAislePanel } from './panels/LastAislePanel'
/* grocery.css + g2.css load via design/layers.css @import layer(legacy) */

/** Complete map — EmptyMenu is unreachable for any MenuId. */
const PANEL: Record<MenuId, () => ReactNode> = {
  floor: () => <FloorPanel />,
  backroom: () => <BackroomPanel />,
  suppliers: () => <SuppliersPanel />,
  staff: () => <StaffPanel />,
  marketing: () => <MarketingPanel />,
  rivals: () => <RivalsPanel />,
  map: () => <EmpireMap />,
  relics: () => <MuseumPanel />,
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
  planets: () => <PlanetsPanel />,
  exchange: () => <ExchangePanel />,
  cultivars: () => <CultivarPanel />,
  signal: () => <SignalPanel />,
  charter: () => <CharterPanel />,
  lastaisle: () => <LastAislePanel />,
  coach: () => <CoachPanel />,
  more: () => <MorePanel />,
}

export function GroceryEmpireApp({ devMode = false }: { devMode?: boolean }) {
  const { meta, metaRef, replaceMeta } = useMeta()
  // Snapshot wrapper identity must change every tick (see engine.bump) or React
  // skips re-renders because GameState is mutated in place.
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
  const state = snap.state
  const pinned = meta.settings.pinnedMenu
  // ?m=<menu> restores where you were (reload, shared link); locked menus fall back below.
  const [searchParams, setSearchParams] = useSearchParams()
  const [menu, setMenu] = useState<MenuId>(() => {
    const m = searchParams.get('m')
    if (m && m !== 'more' && MENU_IDS.includes(m as MenuId)) return m as MenuId
    return pinned && MENU_IDS.includes(pinned as MenuId) ? (pinned as MenuId) : 'floor'
  })
  const setSearchParamsRef = useRef(setSearchParams)
  setSearchParamsRef.current = setSearchParams
  useEffect(() => {
    if (menu === 'more') return
    setSearchParamsRef.current(
      (prev) => {
        if (prev.get('m') === menu && !prev.has('tour')) return prev
        const next = new URLSearchParams(prev)
        next.set('m', menu)
        // ?tour= is consumed on mount (below); never write it back.
        next.delete('tour')
        return next
      },
      { replace: true },
    )
  }, [menu])
  // Phones scroll the hub's tab row: keep the active department in view (1.0 P0-07).
  useEffect(() => {
    const row = document.querySelector<HTMLElement>('.g2-hubhead .g2-subtabs')
    const tab = row?.querySelector<HTMLElement>('.g2-subtab.is-active')
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return
    const left = tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2
    row.scrollTo({ left: Math.max(0, left), behavior: 'auto' })
  }, [menu])
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])
  const [photoMode, setPhotoMode] = useState(false)
  const [sceneOpen, setSceneOpen] = useScenePref(menu)
  const [inboxOpen, setInboxOpenRaw] = useState(false)
  const setInboxOpen = (v: boolean | ((p: boolean) => boolean)) =>
    setInboxOpenRaw((prev) => {
      const next = typeof v === 'function' ? v(prev) : v
      if (next) setToolsOpenRaw(false)
      return next
    })
  const [inboxTab, setInboxTab] = useState<'memos' | 'ledger'>('memos')
  // Coach / Next goal ask for the drawer through the shell bus.
  const openInboxRef = useRef<(tab: 'memos' | 'ledger') => void>(() => {})
  openInboxRef.current = (tab) => {
    setInboxTab(tab)
    setInboxOpen(true)
  }
  useEffect(() => onInboxRequest((tab) => openInboxRef.current(tab)), [])
  const [toolsOpen, setToolsOpenRaw] = useState(false)
  const [toolsTab, setToolsTab] = useState<ToolsTab>(() => (isDevSave() ? 'dev' : 'run'))
  // One drawer at a time: Memos or Menu.
  const setToolsOpen = (v: boolean | ((p: boolean) => boolean)) =>
    setToolsOpenRaw((prev) => {
      const next = typeof v === 'function' ? v(prev) : v
      if (next) setInboxOpenRaw(false)
      return next
    })
  const lastInHub = useRef<Partial<Record<HubId, MenuId>>>({})
  const toolsOpenRef = useRef(false)
  const toolsTabPicked = useRef(false)
  toolsOpenRef.current = toolsOpen
  // The old "More" menu now lives in the Menu drawer.
  useEffect(() => {
    if (menu !== 'more') return
    setToolsTab('run')
    setToolsOpen(true)
    setMenu('floor')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu])
  // A department's `?` opens the Menu drawer on its wiki page.
  const [wikiNonce, setWikiNonce] = useState(0)
  useEffect(
    () =>
      onWikiRequest((id) => {
        setWikiLanding({ view: 'article', id })
        toolsTabPicked.current = true
        setToolsTab('wiki')
        setWikiNonce((n) => n + 1)
        setToolsOpen(true)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [focusNonce, setFocusNonce] = useState(0)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  const reducedMotion = meta.settings.reducedMotion
  const numberFormat = meta.settings.numberFormat
  const pops = useSalePops(state.baskets, reducedMotion, meta.settings.muted)
  const fx = useFxDeltas(state, reducedMotion)
  useMilestones({ muted: meta.settings.muted, enabled: !devMode })

  const notifySig = useRef<{ intervention: number; brownouts: number; alert: string }>({
    intervention: state.recovery?.lastInterventionAt ?? 0,
    brownouts: state.cold?.brownouts ?? 0,
    alert: '',
  })
  const alertSince = useRef(0)
  const alertFired = useRef('')
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

  // ?tour=<lesson> (from the Ops Wiki) starts that Coach lesson once, then leaves the URL clean.
  // Declared after the boot effect: that one reloads the run from disk, which would drop the lesson.
  useEffect(() => {
    const tour = searchParams.get('tour')
    if (!tour) return
    if (TUTORIAL_BY_ID[tour]) engine.dispatch({ type: 'startTutorial', id: tour })
    setSearchParamsRef.current(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('tour')
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    // Same condition that drives the HUD banner (bottleneck / board waiting / drifting store).
    // Fire once per onset, not every pulse; a cleared alert re-arms it. Offline receipts never notify.
    const hudAlert = computeHudAlert(state)
    const alertKey = hudAlert ? hudAlert.kind : ''
    const nowMs = Date.now()
    if (alertKey !== prev.alert) alertSince.current = nowMs
    // Bottlenecks flap with every crate: only notify once the same alert has held for a few seconds.
    if (hudAlert && alertKey !== alertFired.current && nowMs - alertSince.current >= 6000) {
      alertFired.current = alertKey
      fire('Grocery Empire', hudAlert.text)
    }
    if (!hudAlert) alertFired.current = ''
    notifySig.current = { intervention, brownouts, alert: alertKey }
  }, [
    snap,
    state.recovery?.lastInterventionAt,
    state.cold?.brownouts,
    meta.settings.notifyEnabled,
  ])

  const pushToast = (text: string, ms = 3600) => {
    // One guidance channel: mute ambient toasts while a coach tour is live.
    if (engine.getState().tutorials.active) return
    const id = Date.now() + Math.random()
    setToasts((t) => {
      const last = t[t.length - 1]
      if (last && last.text === text) return t
      return [...t.slice(-1), { id, text }]
    })
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms)
  }
  useMuseumEarning(pushToast)
  // Undo (HUD, Tools, Ctrl+Z) confirms through the shell bus; works even when the icon label is hidden.
  const pushToastRef = useRef(pushToast)
  pushToastRef.current = pushToast
  useEffect(() => onToastRequest((text) => pushToastRef.current(text, 2400)), [])
  const museum = useMuseum()

  // Stable identity so the GameContext value only rebuilds when the sim (or a UI field) changes.
  const dispatch = useCallback((cmd: Command) => {
    const check = engine.dispatch(cmd)
    if (!check.ok && check.reason) {
      if (engine.getState().tutorials.active) return
      const id = Date.now() + Math.random()
      const text = check.reason
      setToasts((t) => {
        const last = t[t.length - 1]
        if (last && last.text === text) return t
        return [...t.slice(-1), { id, text }]
      })
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800)
    }
  }, [])

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
        // Kit sheets / modals and the palette own Esc while they're open.
        if (document.querySelector('.gk-sheet-root, .gk-modal-root, .g2-palette')) return
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
        performUndo()
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

      if (e.key === ',') {
        e.preventDefault()
        setToolsOpen((v) => !v)
        return
      }

      // Digits 1–7 → hubs (Museum is 7); skip while a coach tour is active.
      if (!engine.getState().tutorials.active && e.key >= '1' && e.key <= '7') {
        const h = HUBS[Number(e.key) - 1]
        const live = engine.getState()
        const ms = h ? h.menus.filter((id) => !!live.menus[id]) : []
        if (h && ms.length) {
          e.preventDefault()
          const last = lastInHub.current[h.id]
          const pick = last && ms.includes(last) ? last : ms[0]!
          setMenu(pick)
          engine.dispatch({ type: 'noteMenu', id: pick })
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
      if (toolsOpenRef.current) {
        setToolsOpen(false)
        return
      }
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
        engine.dispatch({ type: 'noteMenu', id: 'floor' })
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
  }, [dispatch])

  const speeds = meta.settings.speedUnlock ? [1, 2, 4, 8] : [1, 2]
  // Memos you could file right now (Inbox badge).
  const inboxCountRaw = useMemo(() => {
    let n = 0
    for (const m of MEMOS) {
      if (m.standing || m.fork || m.again) continue
      if ((state.memos[m.id] ?? 0) > 0 && !m.repeatable) continue
      if (!state.memoSeen[m.id]) continue
      if (can(state, { type: 'buyMemo', id: m.id }).ok) n++
    }
    return n
    // snap.v: state mutates in place
  }, [snap.v, state])
  // The badge counts memos you can afford right now; don't let it blink as cash dips.
  const inboxCount = useStable(inboxCountRaw, String, 1500, 4000)

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
  const Active = PANEL[menu]!

  const suggestOn = !!meta.settings.suggestNext
  const suggestionsRaw = useMemo(
    () => (suggestOn ? getSuggestions(state, 10) : []),
    [snap.v, state, suggestOn],
  )
  // Keep the top pick steady: a new #1 must hold ~2s, and a shown pick stays ≥6s.
  const suggestions = useStable(suggestionsRaw, (l) => l[0]?.id ?? '', 2000, 6000)
  const suggestChannels = useMemo(() => suggestedChannels(suggestions), [suggestions])
  const topSuggest = suggestions[0] ?? null

  const reducedMotionRef = useRef(reducedMotion)
  reducedMotionRef.current = reducedMotion
  const focusSuggestion = useCallback((s: Suggestion) => {
    if (s.channel === 'memos') setInboxOpen(true)
    const dest = channelToMenu(s.channel)
    if (dest && engine.getState().menus[dest]) {
      setMenu(dest)
      engine.dispatch({ type: 'noteMenu', id: dest })
    }
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
          el.scrollIntoView({ block: 'nearest', behavior: reducedMotionRef.current ? 'auto' : 'smooth' })
          el.classList.add('ge-suggest-flash')
          window.setTimeout(() => el.classList.remove('ge-suggest-flash'), 1400)
        }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setPhotoModeUi = useCallback((on: boolean) => {
    setPhotoMode(on)
    if (on) setMenu('floor')
  }, [])

  const setActiveMenu = useCallback((id: string) => {
    if (MENU_IDS.includes(id as MenuId) && engine.getState().menus[id as MenuId]) setMenu(id as MenuId)
  }, [])

  // GameState mutates in place, so `state` identity never changes: `snap.v` is what makes
  // the value new each pulse. Everything else is stable, so unrelated re-renders (toasts,
  // drawers) reuse the same context object and don't re-render consumers.
  const ctx = useMemo<GameCtxValue>(
    () => ({
      state,
      tick: snap.v,
      dispatch,
      reducedMotion,
      numberFormat,
      activeMenu: menu,
      setActiveMenu,
      suggestions,
      focusSuggestion,
      focusNonce,
      focusTarget,
      photoMode,
      setPhotoMode: setPhotoModeUi,
    }),
    [
      state,
      snap.v,
      dispatch,
      reducedMotion,
      numberFormat,
      menu,
      setActiveMenu,
      suggestions,
      focusSuggestion,
      focusNonce,
      focusTarget,
      photoMode,
      setPhotoModeUi,
    ],
  )

  const hub = hubOf(menu)
  const hubMenus = (h: HubId) => HUB_BY_ID[h].menus.filter((id) => !!state.menus[id])
  const openHub = (h: HubId) => {
    const ms = hubMenus(h)
    if (ms.length === 0) return
    const last = lastInHub.current[h]
    const pick = last && ms.includes(last) ? last : ms[0]!
    setMenu(pick)
    engine.dispatch({ type: 'noteMenu', id: pick })
  }
  if (hub) lastInHub.current[hub] = menu

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
         {/* Kit providers live inside .ge-root so their toasts / dialogs pick up the design tokens. */}
         <ToastProvider>
          <ConfirmProvider>
          {devMode ? (
            <DevModeBar
              onTools={() => {
                setToolsTab('dev')
                setToolsOpen(true)
              }}
            />
          ) : null}
          <Hud
            state={state}
            pops={pops}
            speeds={speeds}
            numberFormat={numberFormat}
            dispatch={dispatch}
            onMenu={(id) => {
              if (state.menus[id]) {
                setMenu(id)
                engine.dispatch({ type: 'noteMenu', id })
              }
            }}
            inboxCount={inboxCount}
            inboxOpen={inboxOpen}
            onInbox={() => setInboxOpen((v) => !v)}
            toolsOpen={toolsOpen}
            reducedMotion={reducedMotion}
            activeMenu={menu}
            onTools={() => {
              if (!toolsTabPicked.current) setToolsTab(isDevSave() ? 'dev' : 'run')
              setToolsOpen((v) => !v)
            }}
          />

          <HubNav
            state={state}
            hub={hub}
            chests={museum.chests.length}
            suggestChannels={suggestChannels}
            reducedMotion={reducedMotion}
            onOpenHub={openHub}
          />

          <main className="g2-main" ref={mainRef}>
            {hub === 'store' && !photoMode ? (
              <SceneStrip
                state={state}
                museumOpen={museum.unlocked}
                reducedMotion={reducedMotion}
                expanded={sceneOpen}
                onToggle={setSceneOpen}
              />
            ) : null}
            {photoMode ? <StoreScene state={state} museumOpen={museum.unlocked} reducedMotion={reducedMotion} /> : null}
            {hub ? (
              <div className="g2-hubhead">
                <div className="g2-hubhead__title">
                  <h1>{HUB_BY_ID[hub].name}</h1>
                  {hubMenus(hub).length > 1 && MENUS[menu] && hubMenus(hub).includes(menu) ? (
                    <p className="g2-hubhead__dept" aria-hidden="true">
                      {MENUS[menu].name}
                    </p>
                  ) : null}
                </div>
                {hubMenus(hub).length > 1 ? (
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
                        onClick={() => {
                          setMenu(id)
                          engine.dispatch({ type: 'noteMenu', id })
                        }}
                        title={MENUS[id].purpose}
                      >
                        <Icon name={id} size={15} />
                        {MENUS[id].name}
                        {menu === id ? (
                          <motion.span
                            className="g2-subtab__ink"
                            layoutId={`g2-subtab-ink-${hub}`}
                            transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
                          />
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
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
                  {inboxTab === 'memos' ? <MemosPanel compact /> : <Ledger state={state} limit={120} inline />}
                </div>
              </motion.aside>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {toolsOpen ? (
              <ToolsDrawer
                key={`tools-${wikiNonce}`}
                tab={toolsTab}
                onTab={(t) => {
                  toolsTabPicked.current = true
                  setToolsTab(t)
                }}
                onClose={() => setToolsOpen(false)}
                reducedMotion={reducedMotion}
                onOpenMenu={(m) => {
                  setActiveMenu(m)
                  setToolsOpen(false)
                }}
                onPlayLesson={(id, m) => {
                  if (m) setActiveMenu(m)
                  dispatch({ type: 'startTutorial', id })
                  setToolsOpen(false)
                }}
              />
            ) : null}
          </AnimatePresence>

          <OverlayManager
            state={state}
            toasts={toasts}
            reducedMotion={reducedMotion}
            dispatch={dispatch}
            followUp={topSuggest}
            onFollowUp={focusSuggestion}
            onNudge={(id) => {
              setMenu(id)
              engine.dispatch({ type: 'noteMenu', id })
            }}
            onHungryConfirm={(mutators) => {
              replaceMeta({
                ...metaRef.current,
                hungryLaws: mutators,
              })
              dispatch({ type: 'confirmHungryLaws', mutators })
            }}
          />
          <CommandPalette
            state={state}
            onMenu={(id) => {
              if (state.menus[id]) {
                setMenu(id)
                engine.dispatch({ type: 'noteMenu', id })
              }
            }}
            dispatch={dispatch}
            onInbox={() => setInboxOpen(true)}
            onTools={() => setToolsOpen(true)}
          />
          <FxLayer />
          </ConfirmProvider>
         </ToastProvider>
        </div>
      </GameProvider>
    </MotionConfig>
  )
}

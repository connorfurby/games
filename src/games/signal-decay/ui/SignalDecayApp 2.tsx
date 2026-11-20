import './design/layers.css'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { DEPTH, DIAL, ERA_TITLES } from '../sim/balance'
import { type Command } from '../sim/commands'
import { getSignalEngine } from '../sim/engine'
import { DEV_SAVE_ID, PRIMARY_SAVE_ID, setActiveSaveId } from '../sim/saveKey'
import { Coach } from './coach/Coach'
import { ChapterCard } from './story/ChapterCard'
import { celebrate, FxLayer } from './fx'
import { ConfirmProvider, ToastProvider, useToast } from './kit'
import { GameProvider, type GameCtxValue } from './GameContext'
import { AirPanel } from './panels/AirPanel'
import { BooksPanel } from './panels/BooksPanel'
import { CrewPanel } from './panels/CrewPanel'
import { NetworkPanel } from './panels/NetworkPanel'
import { PlantPanel } from './panels/PlantPanel'
import { Hud } from './shell/Hud'
import { HubHead } from './shell/HubHead'
import { HubNav } from './shell/HubNav'
import { defaultSub, type HubId, type HubSub } from './shell/hubs'
import { MoreSheet } from './shell/MoreSheet'
import { WhisperToast } from './shell/WhisperToast'
import './design/tokens.css'
import './signal.css'

const DEV_STAGES: { id: string; label: string; patch: (s: import('../sim/state').GameState) => void }[] = [
  {
    id: 'opening',
    label: 'Opening',
    patch: (s) => {
      s.era = 0
      s.cash = 40
      s.introSeen = true
    },
  },
  {
    id: 'era2',
    label: 'Era 2',
    patch: (s) => {
      s.era = 2
      s.cash = 400
      s.antenna = 2
      s.introSeen = true
      s.depth.cleanLogsLifetime = 300
      s.depth.callersServed = 20
      s.depth.checkIns = 30
      s.depth.stars = 4
      s.depth.featuredFormat = 'talk'
      s.depth.shifts.dawn = 'dev'
      s.depth.dawnDays = 20
      s.rivals.pirate = { stores: 3, frozenUntil: 0 }
      s.rivals.metrowave = { stores: 2, frozenUntil: 0 }
    },
  },
  {
    id: 'quiet',
    label: 'Quiet',
    patch: (s) => {
      s.era = 6
      s.cash = 2000
      s.antenna = 4
      s.introSeen = true
      s.depth.quietStamps = DEPTH.quietStampNeed
      s.birds = 1
      s.skips = 1
      s.regions = 1
    },
  },
  {
    id: 'dial',
    label: 'Dial',
    patch: (s) => {
      s.era = 10
      s.cash = 8000
      s.introSeen = true
      s.antenna = 6
      s.towers = [
        { id: 't1', trait: 'night', policy: null },
        { id: 't2', trait: 'storm', policy: null },
      ]
      s.depth.guestEars = 8
      s.dial.credited = { reel: 10, route: 8, season: 7 }
      s.rivals.choir = { stores: 0, frozenUntil: 0 }
    },
  },
  {
    id: 'last',
    label: 'Last Carrier',
    patch: (s) => {
      s.era = 12
      s.cash = 50000
      s.introSeen = true
      s.antenna = 8
      s.depth.clauseSeats = DEPTH.clauseSeatNeed
      s.depth.seatedClauses = ['clause-1', 'clause-2', 'clause-3', 'clause-4']
      s.depth.charterFork = 'public'
      s.depth.hearingSession = DIAL.hearingSessions
      s.dial.listLines = ['carrier', 'relay', 'hymn', null, null]
      s.dial.listMean = 3 / 5
      s.rivals.choir = { stores: 0, frozenUntil: 0 }
    },
  },
]

export function SignalDecayApp({ devMode = false }: { devMode?: boolean }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <SignalDecayInner devMode={devMode} />
      </ConfirmProvider>
    </ToastProvider>
  )
}

function SignalDecayInner({ devMode }: { devMode: boolean }) {
  const engine = getSignalEngine()
  const { push: pushToast } = useToast()
  const [menu, setMenu] = useState<HubId>('air')
  const [subs, setSubs] = useState<Record<HubId, HubSub>>({
    air: 'loop',
    plant: 'mast',
    crew: 'shifts',
    books: 'ledger',
    network: 'map',
  })
  const [moreOpen, setMoreOpen] = useState(false)
  const activeSub = subs[menu] ?? defaultSub(menu)

  useEffect(() => {
    setActiveSaveId(devMode ? DEV_SAVE_ID : PRIMARY_SAVE_ID)
    engine.reloadFromDisk()
    engine.start()
    return () => {
      engine.stop()
      setActiveSaveId(PRIMARY_SAVE_ID)
    }
  }, [devMode, engine])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const hubs: HubId[] = ['air', 'plant', 'crew', 'books', 'network']
      const n = Number(e.key)
      if (n >= 1 && n <= hubs.length) {
        e.preventDefault()
        setMenu(hubs[n - 1]!)
      }
      if (e.key === ' ') {
        e.preventDefault()
        engine.dispatch({ type: 'setPaused', paused: !engine.getSnapshot().state.paused })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [engine])

  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
  const state = snap.state

  const readyHubs = useMemo(() => {
    const set = new Set<string>()
    if (state.air.cleanLogs > 0 && state.time >= state.air.airReadyAt) set.add('air')
    if (state.air.logFill >= 1) set.add('air')
    if ((state.upgrades['crystal-gain'] ?? 0) < 1 && state.cash >= 8) set.add('plant')
    if (state.era >= 1 && state.crew.length === 0 && state.cash >= 18) set.add('crew')
    if (state.depth.invoices.some((i) => !i.paid)) set.add('books')
    if (state.era >= 2 && state.towers.length < 2) set.add('network')
    return set
  }, [state])

  const readySubs = useMemo(() => {
    const set = new Set<string>()
    if ((state.upgrades['crystal-gain'] ?? 0) < 1 && state.cash >= 8) set.add('mast')
    if (state.era >= 3 && state.air.heat >= 1) set.add('desks')
    if (state.era >= 1 && state.crew.length === 0) set.add('shifts')
    if (state.depth.invoices.some((i) => !i.paid)) set.add('ledger')
    if (state.era >= 2 && state.towers.length < 2) set.add('map')
    if (state.era >= 7 && (state.dial.credited.reel ?? 0) < 1) set.add('dial')
    return set
  }, [state])

  const setActiveMenu = useCallback((id: string) => {
    if (id === 'air' || id === 'plant' || id === 'crew' || id === 'books' || id === 'network') {
      setMenu(id)
    }
  }, [])

  const setActiveSub = useCallback(
    (id: HubSub) => {
      setSubs((prev) => ({ ...prev, [menu]: id }))
    },
    [menu],
  )

  const openHub = useCallback((id: HubId) => {
    setMenu(id)
  }, [])

  const dispatch = useCallback(
    (cmd: Command) => {
      const check = engine.dispatch(cmd)
      if (!check.ok) {
        pushToast(check.reason, { tone: 'warn', ms: 2200 })
      } else if (cmd.type === 'buyAntenna') {
        const n = cmd.qty ?? 1
        pushToast(n > 1 ? `${n} antenna sections up.` : 'Antenna up — look out the window.', { tone: 'good' })
        celebrate('small')
      } else if (cmd.type === 'buyUpgrade') {
        if (cmd.id === 'crystal-gain') {
          pushToast('Crystal warmer. Carrier stronger.', { tone: 'good', ms: 2200 })
        }
        celebrate('small')
      } else if (cmd.type === 'air') {
        celebrate('small')
      } else if (cmd.type === 'log') {
        celebrate('small')
      } else if (cmd.type === 'hire') {
        pushToast('Board op hired.', { tone: 'good', ms: 1600 })
        celebrate('small')
      } else if (cmd.type === 'setEra') {
        const title = ERA_TITLES[cmd.era]
        pushToast(`Era ${cmd.era}: ${title}`, { tone: 'good', ms: 2800 })
        celebrate('era', title)
      } else if (cmd.type === 'buyoutRival') {
        pushToast('Buyout sealed — archive the call letters.', { tone: 'good' })
        celebrate('milestone')
      } else if (cmd.type === 'undo') {
        pushToast('Undone.', { ms: 1400 })
      }
    },
    [engine, pushToast],
  )

  const reducedMotion =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const ctx = useMemo<GameCtxValue>(
    () => ({
      state,
      tick: snap.v,
      dispatch,
      reducedMotion,
      numberFormat: 'named',
      activeMenu: menu,
      setActiveMenu,
      activeSub,
      setActiveSub,
    }),
    [state, snap.v, dispatch, reducedMotion, menu, setActiveMenu, activeSub, setActiveSub],
  )

  return (
    <GameProvider value={ctx}>
      <div className={`sd-root sd-app${devMode ? ' sd-app--dev' : ''}`}>
        {devMode ? (
          <div className="sd-devbar">
            {DEV_STAGES.map((st) => (
              <button
                key={st.id}
                type="button"
                className="sd-btn sd-btn--ghost sd-btn--sm"
                onClick={() => {
                  const next = structuredClone(state)
                  st.patch(next)
                  next.chapterSeen = next.era
                  engine.replaceState(next)
                  pushToast(`Stage: ${st.label}`, { ms: 1600 })
                }}
              >
                {st.label}
              </button>
            ))}
            <button
              type="button"
              className="sd-btn sd-btn--ghost sd-btn--sm"
              onClick={() => dispatch({ type: 'buyBestUpgrade' })}
            >
              Buy Best
            </button>
          </div>
        ) : null}

        <Hud onMore={() => setMoreOpen(true)} />

        <HubNav hub={menu} onOpenHub={openHub} ready={readyHubs} />

        <main className="sd-main">
          {state.awayReceipt && (
            <div className="sd-panel sd-panel--away">
              <h2>Overnight log</h2>
              <p className="purpose">
                Away {Math.floor(state.awayReceipt.elapsed / 60)}m · earned $
                {state.awayReceipt.earned.toFixed(0)}
              </p>
              <button type="button" className="sd-btn sd-btn--free" onClick={() => dispatch({ type: 'dismissAway' })}>
                Back on air
              </button>
            </div>
          )}

          <HubHead hub={menu} sub={activeSub} onSub={setActiveSub} suggest={readySubs} />

          <div className="sd-panel-stage" key={`${menu}:${activeSub}`}>
            {menu === 'air' && <AirPanel />}
            {menu === 'plant' && <PlantPanel />}
            {menu === 'crew' && <CrewPanel />}
            {menu === 'books' && <BooksPanel />}
            {menu === 'network' && <NetworkPanel />}
          </div>
        </main>

        <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
        <ChapterCard />
        <Coach />
        <WhisperToast />
        <FxLayer />
      </div>
    </GameProvider>
  )
}

import { useState } from 'react'
import { GAME_VERSION } from '../../sim/balance'
import { Button } from '../kit/Button'
import { Sheet } from '../kit/Sheet'
import { useGame } from '../GameContext'
import { MuseumPanel } from '../museum/MuseumPanel'
import { WikiBrowser } from '../wiki/WikiBrowser'
import '../panels/panels.css'

type View = 'menu' | 'wiki' | 'museum' | 'settings'

const TITLES: Record<View, string> = {
  menu: 'More',
  wiki: 'Wiki',
  museum: 'Museum',
  settings: 'Settings',
}

const SPEEDS = [1, 2, 4, 8]

export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state: s, dispatch } = useGame()
  const [view, setView] = useState<View>('menu')

  const close = () => {
    setView('menu')
    onClose()
  }

  return (
    <Sheet open={open} title={TITLES[view]} onClose={close}>
      {view !== 'menu' ? (
        <div className="sd-wrap">
          <Button tone="ghost" size="sm" onClick={() => setView('menu')}>
            ← More
          </Button>
        </div>
      ) : null}

      {view === 'menu' ? (
        <div className="sd-more-grid">
          <button type="button" className="sd-more-tile" onClick={() => setView('wiki')}>
            <strong>Wiki</strong>
            <span>Guide, terms, lessons, tours and memos.</span>
          </button>
          <button type="button" className="sd-more-tile" onClick={() => setView('museum')}>
            <strong>Museum</strong>
            <span>Relics, rivals and facings you have kept.</span>
          </button>
          <button type="button" className="sd-more-tile" onClick={() => setView('settings')}>
            <strong>Settings</strong>
            <span>Pause, speed, buy-best, undo.</span>
          </button>
          <div className="sd-more-tile sd-more-tile--static">
            <strong>Keys</strong>
            <span>1–5 hubs · Space pause</span>
          </div>
          <p className="sd-act__fact sd-more-ver">Signal Decay v{GAME_VERSION}</p>
        </div>
      ) : null}

      {view === 'wiki' ? <WikiBrowser /> : null}
      {view === 'museum' ? <MuseumPanel /> : null}

      {view === 'settings' ? (
        <div className="sd-stack">
          <div className="sd-act sd-act--row">
            <div className="sd-act__text">
              <strong>{s.paused ? 'Paused' : 'Running'}</strong>
              <span className="sd-act__fact">The sim stops while paused.</span>
            </div>
            <Button
              tone={s.paused ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => dispatch({ type: 'setPaused', paused: !s.paused })}
            >
              {s.paused ? 'Resume' : 'Pause'}
            </Button>
          </div>
          <div className="sd-act">
            <div className="sd-act__text">
              <strong>Speed ×{s.speed}</strong>
              <span className="sd-act__fact">Faster time, same rules.</span>
            </div>
            <div className="sd-wrap">
              {SPEEDS.map((sp) => (
                <Button
                  key={sp}
                  size="sm"
                  tone={s.speed === sp ? 'primary' : 'ghost'}
                  onClick={() => dispatch({ type: 'setSpeed', speed: sp })}
                >
                  ×{sp}
                </Button>
              ))}
            </div>
          </div>
          <div className="sd-act sd-act--row">
            <div className="sd-act__text">
              <strong>Buy Best</strong>
              <span className="sd-act__fact">Cheapest affordable upgrade node.</span>
            </div>
            <Button tone="primary" size="sm" onClick={() => dispatch({ type: 'buyBestUpgrade' })}>
              Buy
            </Button>
          </div>
          <div className="sd-act sd-act--row">
            <div className="sd-act__text">
              <strong>Undo</strong>
              <span className="sd-act__fact">5s window after a spend.</span>
            </div>
            <Button tone="ghost" size="sm" onClick={() => dispatch({ type: 'undo' })}>
              Undo
            </Button>
          </div>
        </div>
      ) : null}
    </Sheet>
  )
}

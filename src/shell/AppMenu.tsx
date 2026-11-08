import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loadGame } from '@/shared/save'
import { SettingsModal } from './SettingsModal'

const OPEN_HOTKEYS = 'games:open-hotkeys'

export function openHotkeyMap() {
  window.dispatchEvent(new CustomEvent(OPEN_HOTKEYS))
}

export function subscribeHotkeyOpen(handler: () => void) {
  const fn = () => handler()
  window.addEventListener(OPEN_HOTKEYS, fn)
  return () => window.removeEventListener(OPEN_HOTKEYS, fn)
}

type MenuItem =
  | { id: string; label: string; hint: string; to: string; accent?: boolean }
  | { id: string; label: string; hint: string; action: 'settings' | 'hotkeys' | 'play' }

const ITEMS: MenuItem[] = [
  { id: 'home', label: 'Home', hint: 'Shelf', to: '/' },
  { id: 'play', label: 'Play', hint: 'Grocery Empire', action: 'play', accent: true },
  { id: 'shop', label: 'Shop', hint: 'Cosmetics', to: '/shop' },
  { id: 'guide', label: 'Guide', hint: 'Strategy', to: '/guide/grocery-empire' },
  { id: 'awards', label: 'Awards', hint: 'Achievements', to: '/achievements' },
  { id: 'settings', label: 'Settings', hint: 'Saves & prefs', action: 'settings' },
  { id: 'hotkeys', label: 'Keys', hint: 'Hotkey map', action: 'hotkeys' },
  { id: 'dev', label: 'Dev', hint: 'Sandbox', to: '/play/grocery-empire/dev' },
]

function WaffleIcon() {
  return (
    <svg className="waffle__glyph" viewBox="0 0 18 18" width="18" height="18" aria-hidden>
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={1 + col * 6}
            y={1 + row * 6}
            width="4"
            height="4"
            rx="0.6"
            fill="currentColor"
          />
        )),
      )}
    </svg>
  )
}

export function AppMenu({
  className = '',
  placement = 'fixed',
}: {
  className?: string
  /** fixed = corner chrome; inline = sits in a header */
  placement?: 'fixed' | 'inline'
}) {
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const loc = useLocation()
  const nav = useNavigate()
  const labelId = useId()
  const hasSave = !!loadGame('grocery-empire')
  const inPlay = loc.pathname.startsWith('/play/')

  useEffect(() => {
    setOpen(false)
  }, [loc.pathname])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = (item: MenuItem) => {
    if ('to' in item) {
      setOpen(false)
      nav(item.to)
      return
    }
    if (item.action === 'settings') {
      setOpen(false)
      setSettingsOpen(true)
      return
    }
    if (item.action === 'hotkeys') {
      setOpen(false)
      openHotkeyMap()
      return
    }
    if (item.action === 'play') {
      setOpen(false)
      nav(inPlay ? loc.pathname : '/play/grocery-empire')
    }
  }

  return (
    <>
      <div className={`waffle waffle--${placement} ${className}`.trim()}>
        <button
          ref={btnRef}
          type="button"
          className={`waffle__btn${open ? ' is-open' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? labelId : undefined}
          aria-label="App menu"
          title="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <WaffleIcon />
        </button>

        {open ? (
          <div
            ref={panelRef}
            id={labelId}
            className="waffle__panel"
            role="dialog"
            aria-label="App menu"
          >
            <p className="waffle__title">Go</p>
            <div className="waffle__grid">
              {ITEMS.map((item) => {
                const playLabel =
                  item.id === 'play' ? (inPlay ? 'Floor' : hasSave ? 'Continue' : 'Play') : item.label
                const playHint =
                  item.id === 'play'
                    ? inPlay
                      ? 'Back to run'
                      : hasSave
                        ? 'Resume save'
                        : 'New counter'
                    : item.hint
                const accent = 'accent' in item && item.accent
                if ('to' in item) {
                  return (
                    <Link
                      key={item.id}
                      to={item.to}
                      className={`waffle__cell${accent ? ' waffle__cell--accent' : ''}`}
                      onClick={() => setOpen(false)}
                    >
                      <span className="waffle__cell-label">{item.label}</span>
                      <span className="waffle__cell-hint">{item.hint}</span>
                    </Link>
                  )
                }
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`waffle__cell${accent ? ' waffle__cell--accent' : ''}`}
                    onClick={() => run(item)}
                  >
                    <span className="waffle__cell-label">{playLabel}</span>
                    <span className="waffle__cell-hint">{playHint}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

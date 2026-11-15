import { useEffect, useState } from 'react'
import { subscribeHotkeyOpen } from './AppMenu'

const ROWS: { keys: string; action: string }[] = [
  { keys: 'U', action: 'Unpack (in-game)' },
  { keys: '[ ] or − +', action: 'Nudge price' },
  { keys: 'Space', action: 'Pause / resume' },
  { keys: 'Ctrl/Cmd+Z', action: 'Undo last action (5s window)' },
  { keys: '1–7', action: 'Jump to a hub: Store, Supply, Team, Money, Empire, Worlds, Museum (skipped during coach)' },
  { keys: 'M', action: 'Memos and ledger drawer' },
  { keys: ',', action: 'Menu drawer (saves, settings, tools)' },
  { keys: 'K or /', action: 'Command palette: jump to any menu or action' },
  {
    keys: 'Esc',
    action: 'Tap: dismiss overlays → Floor → pause. Hold: soft-pause (no Shelf leave)',
  },
  { keys: 'P', action: 'Photo mode: store scene on the Floor, toasts and tips hidden' },
  { keys: '?', action: 'Toggle this hotkey map' },
  { keys: 'Arrows', action: 'Shelf: move selection' },
  { keys: 'Enter', action: 'Shelf: continue selected game' },
]

export function HotkeyOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => subscribeHotkeyOpen(() => setOpen(true)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || t.tagName === 'SELECT'))
        return
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div className="hotkey-overlay" role="dialog" aria-label="Hotkey map" onClick={() => setOpen(false)}>
      <div className="hotkey-panel" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Hotkeys</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close">
            Esc
          </button>
        </header>
        <ul>
          {ROWS.map((r) => (
            <li key={r.keys}>
              <kbd>{r.keys}</kbd>
              <span>{r.action}</span>
            </li>
          ))}
        </ul>
        <p className="muted">Press ? again to close. In-game keys apply when Grocery Empire has focus.</p>
      </div>
    </div>
  )
}

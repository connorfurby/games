import { useEffect, useState } from 'react'

const ROWS: { keys: string; action: string }[] = [
  { keys: 'U', action: 'Unpack (in-game)' },
  { keys: '[ ] or − +', action: 'Nudge price' },
  { keys: 'Space', action: 'Pause / resume' },
  { keys: '1–9', action: 'Jump unlocked menus (skipped during coach)' },
  {
    keys: 'Esc',
    action: 'Tap: dismiss overlays → Floor → pause. Hold: soft-pause (no Shelf leave)',
  },
  { keys: 'P', action: 'Photo mode (hide rail / ledger / toasts)' },
  { keys: '?', action: 'Toggle this hotkey map' },
  { keys: 'Arrows', action: 'Shelf: move selection' },
  { keys: 'Enter', action: 'Shelf: continue selected game' },
]

export function HotkeyOverlay() {
  const [open, setOpen] = useState(false)

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

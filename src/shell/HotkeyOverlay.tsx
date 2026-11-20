import { useEffect, useState } from 'react'
import { subscribeHotkeyOpen } from './AppMenu'

const ROWS: { keys: string; action: string }[] = [
  { keys: 'U', action: 'Unpack' },
  { keys: '[ ] or − +', action: 'Nudge price' },
  { keys: 'Space', action: 'Pause or resume. A clock offers Resume if you stay paused.' },
  { keys: 'Ctrl/Cmd+Z', action: 'Undo your last action (within 5 seconds)' },
  { keys: '1–7', action: 'Jump to Store, Supply, Team, Money, Empire, Worlds or Museum' },
  { keys: 'M', action: 'Open Memos' },
  { keys: ',', action: 'Open the Menu (saves, settings, guide)' },
  { keys: 'K or /', action: 'Search: jump to any room or action' },
  {
    keys: 'Esc',
    action: 'Close what is open, then go to the Floor, then pause',
  },
  { keys: 'P', action: 'Photo mode: just your storefront' },
  { keys: '?', action: 'Show or hide this list' },
  { keys: 'Arrows', action: 'Home: pick a game' },
  { keys: 'Enter', action: 'Home: continue the picked game' },
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
        <p className="muted">Press ? again to close.</p>
      </div>
    </div>
  )
}

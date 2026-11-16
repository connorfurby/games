import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/games/grocery-empire/ui/kit'
import { Link } from 'react-router-dom'
import type { NumberFormat } from '@/shared/bn'
import { deserializeState, exportSave, importSave, loadGame, loadMeta } from '@/shared/save'
import { DEFAULT_META, type MetaSave } from '@/shared/types'
import { GAME_VERSION } from '@/games/grocery-empire/content/news'
import { engine } from '@/games/grocery-empire/sim/engine'
import { migrate } from '@/games/grocery-empire/sim/migrate'
import { PRIMARY_SAVE_ID, setActiveSaveId } from '@/games/grocery-empire/sim/saveKey'
import { clearDailyPending, deactivateDailyChallenge } from './dailyChallenge'
import { useMeta } from './MetaContext'
import { SaveSlots, ShellConfirm } from './SaveSlots'

interface GroceryPlayGlance {
  stats?: { playSec?: number }
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { meta, updateSettings, replaceMeta } = useMeta()
  const [msg, setMsg] = useState('')
  const [resetDraft, setResetDraft] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [, bump] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const grocery = loadGame<GroceryPlayGlance>('grocery-empire')
  const playSec = typeof grocery?.stats?.playSec === 'number' ? grocery.stats.playSec : 0

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) setMsg('')
  }, [open])

  if (!open) return null

  const downloadBlob = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportGrocery = () => {
    engine.save()
    const raw = exportSave('grocery-empire')
    if (!raw) {
      setMsg('No grocery save to export.')
      return
    }
    downloadBlob(`grocery-empire-${Date.now()}.json`, raw)
    setMsg('Exported grocery save.')
  }

  const exportMetaSave = () => {
    const raw = exportSave('meta') || JSON.stringify(meta)
    downloadBlob(`games-meta-${Date.now()}.json`, raw)
    setMsg('Exported cosmetics / meta.')
  }

  const onImportFile = async (file: File | null, kind: 'grocery-empire' | 'meta') => {
    if (!file) return
    try {
      const text = await file.text()
      if (!text.trim()) {
        setMsg('Empty file.')
        return
      }
      const parsed = deserializeState<unknown>(text)
      if (parsed == null) {
        setMsg('Could not parse save JSON.')
        return
      }
      if (kind === 'meta') {
        importSave('meta', text)
        const next = loadMeta(DEFAULT_META) as MetaSave
        replaceMeta({ ...DEFAULT_META, ...next, settings: { ...DEFAULT_META.settings, ...next.settings } })
        setMsg('Imported meta.')
        return
      }
      importSave('grocery-empire', text)
      engine.replaceState(migrate(parsed))
      setMsg('Loaded save into play.')
      bump((n) => n + 1)
    } catch {
      setMsg('Import failed.')
    }
  }

  const onNotifyToggle = async (enabled: boolean) => {
    if (!enabled) {
      updateSettings({ notifyEnabled: false })
      return
    }
    try {
      if (typeof Notification === 'undefined') {
        setMsg('Notifications unavailable here.')
        updateSettings({ notifyEnabled: false })
        return
      }
      let perm = Notification.permission
      if (perm === 'default') perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setMsg('Notification permission denied.')
        updateSettings({ notifyEnabled: false })
        return
      }
      updateSettings({ notifyEnabled: true })
      setMsg('Notices on when the tab is hidden.')
    } catch {
      updateSettings({ notifyEnabled: false })
      setMsg('Could not enable notifications.')
    }
  }

  const hardReset = () => {
    if (resetDraft.trim() !== 'RESET') {
      setMsg('Type RESET exactly to confirm.')
      return
    }
    deactivateDailyChallenge()
    clearDailyPending()
    setActiveSaveId(PRIMARY_SAVE_ID)
    engine.newGame()
    setResetDraft('')
    setMsg('Wiped. Reloading…')
    window.location.assign('/')
  }

  return (
    <div className="app-modal" role="presentation" onClick={onClose}>
      <div
        className="app-modal__panel settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="app-modal__head">
          <div>
            <p className="app-modal__kicker">Shelf</p>
            <h2 id={titleId}>Settings</h2>
          </div>
          <button type="button" className="app-modal__close" onClick={onClose} aria-label="Close settings">
            Esc
          </button>
        </header>

        <div className="settings-modal__grid">
          <section className="settings-block">
            <h3>Look &amp; feel</h3>
            <label className="settings-field">
              <span>Number format</span>
              <select
                value={meta.settings.numberFormat}
                onChange={(e) => updateSettings({ numberFormat: e.target.value as NumberFormat })}
              >
                <option value="named">Named</option>
                <option value="scientific">Scientific</option>
                <option value="engineering">Engineering</option>
                <option value="full">Full</option>
              </select>
              <small className="muted">
                Named = short labels on HUD, Shelf, and crowded chips. Full still shows in Books detail and tooltips.
              </small>
            </label>
            <label className="settings-field">
              <span>Presentation</span>
              <select
                value={meta.settings.presentation}
                onChange={(e) =>
                  updateSettings({
                    presentation: e.target.value as 'dense' | 'atmospheric' | 'map',
                  })
                }
              >
                <option value="atmospheric">Atmospheric</option>
                <option value="dense">Dense</option>
                <option value="map">Map</option>
              </select>
            </label>
            <label className="settings-field">
              <span>Animation</span>
              <select
                value={meta.settings.animationDensity}
                onChange={(e) =>
                  updateSettings({
                    animationDensity: e.target.value as 'full' | 'tasteful' | 'minimal',
                  })
                }
              >
                <option value="full">Full</option>
                <option value="tasteful">Tasteful</option>
                <option value="minimal">Minimal</option>
              </select>
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={meta.settings.reducedMotion}
                onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
              />
              Reduced motion
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={!!meta.settings.colorblind}
                onChange={(e) => updateSettings({ colorblind: e.target.checked })}
              />
              Colorblind accent set
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={meta.settings.muted}
                onChange={(e) => updateSettings({ muted: e.target.checked })}
              />
              Mute sound
            </label>
          </section>

          <section className="settings-block">
            <h3>Play</h3>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={meta.settings.notifyEnabled}
                onChange={(e) => void onNotifyToggle(e.target.checked)}
              />
              Notify when tab is hidden
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={meta.settings.softPauseTutorials}
                onChange={(e) => updateSettings({ softPauseTutorials: e.target.checked })}
              />
              Soft-pause during tutorials
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={!!meta.settings.suggestNext}
                onChange={(e) => updateSettings({ suggestNext: e.target.checked })}
              />
              Mark the suggested next buy on tabs (Grocery Empire)
            </label>
            <div className="settings-profile-card">
              <p className="settings-profile-card__title">Profile</p>
              <ul>
                <li>
                  <span>Tokens</span>
                  <strong>{meta.shelfTokens}</strong>
                </li>
                <li>
                  <span>Universes</span>
                  <strong>{meta.groceryUniverses ?? 0}</strong>
                </li>
                <li>
                  <span>Lifetime XP</span>
                  <strong>{meta.lifetimeXp ?? 0}</strong>
                </li>
                <li>
                  <span>Play</span>
                  <strong>
                    {Math.floor(playSec / 3600)}h {Math.floor((playSec % 3600) / 60)}m
                  </strong>
                </li>
              </ul>
            </div>
            <p className="muted settings-hint">
              Press ? anytime for the hotkey map. <Link to="/news">Bulletin · v{GAME_VERSION}</Link>
            </p>
          </section>

          <section className="settings-block settings-block--wide">
            <h3>Saves</h3>
            <p className="muted settings-hint">Autosave is always on. Slots are manual copies.</p>
            <SaveSlots
              variant="shell"
              reducedMotion={meta.settings.reducedMotion}
              onNote={(m) => {
                setMsg(m)
                bump((n) => n + 1)
              }}
            />
            <div className="settings-io-row">
              <Button tone="secondary" onClick={exportGrocery}>
                Download save…
              </Button>
              <Button tone="ghost" onClick={() => fileRef.current?.click()}>
                Load save…
              </Button>
              <Button tone="ghost" onClick={exportMetaSave}>
                Download meta…
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                e.target.value = ''
                if (!file) return
                setPendingFile(file)
              }}
            />
            <ShellConfirm
              spec={
                pendingFile
                  ? {
                      title: 'Load this file as your run?',
                      body: 'Replace the current Grocery Empire run with this file, or import cosmetics / meta only.',
                      confirmLabel: 'Load as run',
                      tone: 'danger',
                      onConfirm: () => void onImportFile(pendingFile, 'grocery-empire'),
                    }
                  : null
              }
              alt={pendingFile ? { label: 'Meta only', onClick: () => void onImportFile(pendingFile, 'meta') } : undefined}
              onClose={() => setPendingFile(null)}
            />
            {msg ? (
              <p className="settings-msg" role="status">
                {msg}
              </p>
            ) : null}
          </section>

          <section className="settings-block settings-block--danger">
            <h3>Danger</h3>
            <label className="settings-field">
              <span>Hard reset run (type RESET)</span>
              <input
                type="text"
                value={resetDraft}
                onChange={(e) => setResetDraft(e.target.value)}
                placeholder="RESET"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <Button tone="danger" disabled={resetDraft.trim() !== 'RESET'} onClick={hardReset}>
              Wipe grocery save
            </Button>
          </section>
        </div>
      </div>
    </div>
  )
}

import { useRef, useState } from 'react'
import type { NumberFormat } from '@/shared/bn'
import { clearGameSave, deserializeState, exportSave, importSave, loadGame, loadMeta } from '@/shared/save'
import { DEFAULT_META, type MetaSave } from '@/shared/types'
import { engine } from '@/games/grocery-empire/sim/engine'
import { migrate } from '@/games/grocery-empire/sim/migrate'
import { useMeta } from './MetaContext'

interface GroceryPlayGlance {
  stats?: { playSec?: number }
}

type Slot = 1 | 2 | 3
const SLOTS: Slot[] = [1, 2, 3]

export function SettingsFab() {
  const { meta, updateSettings, replaceMeta } = useMeta()
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [resetDraft, setResetDraft] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [, bump] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const grocery = loadGame<GroceryPlayGlance>('grocery-empire')
  const playSec = typeof grocery?.stats?.playSec === 'number' ? grocery.stats.playSec : 0

  if (!open) {
    return (
      <button type="button" className="settings-fab" onClick={() => setOpen(true)} aria-label="Settings">
        ⚙
      </button>
    )
  }

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
    setMsg('Exported grocery save file.')
  }

  const exportMetaSave = () => {
    const raw = exportSave('meta') || JSON.stringify(meta)
    downloadBlob(`games-meta-${Date.now()}.json`, raw)
    setMsg('Exported meta save.')
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
      if (!window.confirm('Load this save file into the current Grocery Empire run?')) return
      importSave('grocery-empire', text)
      engine.replaceState(migrate(parsed))
      setMsg('Loaded save file into play.')
      bump((n) => n + 1)
    } catch {
      setMsg('Import failed.')
    }
  }

  const saveSlot = (slot: Slot) => {
    if (!engine.saveToSlot(slot)) {
      setMsg(`Could not write slot ${slot}.`)
      return
    }
    setMsg(`Saved to slot ${slot}.`)
    bump((n) => n + 1)
  }

  const loadSlot = (slot: Slot) => {
    if (!engine.hasSlot(slot)) {
      setMsg(`Slot ${slot} is empty.`)
      return
    }
    if (!window.confirm(`Load slot ${slot}? Current unsaved progress in the live run will be overwritten.`)) {
      return
    }
    if (!engine.loadFromSlot(slot)) {
      setMsg(`Failed to load slot ${slot}.`)
      return
    }
    setMsg(`Loaded slot ${slot}.`)
    bump((n) => n + 1)
  }

  const onNotifyToggle = async (enabled: boolean) => {
    if (!enabled) {
      updateSettings({ notifyEnabled: false })
      return
    }
    try {
      if (typeof Notification === 'undefined') {
        setMsg('Notifications unavailable in this browser.')
        updateSettings({ notifyEnabled: false })
        return
      }
      let perm = Notification.permission
      if (perm === 'default') {
        perm = await Notification.requestPermission()
      }
      if (perm !== 'granted') {
        setMsg('Notification permission denied.')
        updateSettings({ notifyEnabled: false })
        return
      }
      updateSettings({ notifyEnabled: true })
      setMsg('Desktop notices on when the tab is hidden.')
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
    clearGameSave('grocery-empire')
    setResetDraft('')
    setMsg('Wiped. Reloading…')
    window.location.reload()
  }

  return (
    <div className="settings-panel">
      <h3>Settings</h3>

      <fieldset className="settings-io">
        <legend>Save files</legend>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Autosave is always on. Slots are manual copies you can reload anytime.
        </p>
        <div className="settings-slots">
          {SLOTS.map((slot) => {
            const filled = engine.hasSlot(slot)
            return (
              <div key={slot} className="settings-slots__row">
                <span>Slot {slot}{filled ? '' : ' · empty'}</span>
                <button type="button" onClick={() => saveSlot(slot)}>
                  Save
                </button>
                <button type="button" disabled={!filled} onClick={() => loadSlot(slot)}>
                  Load
                </button>
              </div>
            )
          })}
        </div>
        <button type="button" className="primary" onClick={exportGrocery}>
          Download save file…
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Load save file…
        </button>
        <button type="button" onClick={exportMetaSave}>
          Download cosmetics/meta…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null
            e.target.value = ''
            if (!file) return
            const kind = window.confirm(
              'OK = load as Grocery Empire run.\nCancel = import cosmetics/meta only.',
            )
              ? 'grocery-empire'
              : 'meta'
            void onImportFile(file, kind)
          }}
        />
        <label>
          Hard reset run (type RESET)
          <input
            type="text"
            value={resetDraft}
            onChange={(e) => setResetDraft(e.target.value)}
            placeholder="RESET"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button type="button" disabled={resetDraft.trim() !== 'RESET'} onClick={hardReset}>
          Wipe grocery save
        </button>
        {msg ? <p className="muted">{msg}</p> : null}
      </fieldset>

      <div className="settings-profile">
        <button type="button" onClick={() => setProfileOpen((v) => !v)}>
          {profileOpen ? 'Hide profile' : 'Profile'}
        </button>
        {profileOpen ? (
          <ul className="settings-profile__list">
            <li>Tokens · {meta.shelfTokens}</li>
            <li>Universes · {meta.groceryUniverses ?? 0}</li>
            <li>Lifetime XP · {meta.lifetimeXp ?? 0}</li>
            <li>
              Play · {Math.floor(playSec / 3600)}h {Math.floor((playSec % 3600) / 60)}m
            </li>
          </ul>
        ) : null}
      </div>
      <label>
        Number format
        <select
          value={meta.settings.numberFormat}
          onChange={(e) => updateSettings({ numberFormat: e.target.value as NumberFormat })}
        >
          <option value="named">Named</option>
          <option value="scientific">Scientific</option>
          <option value="engineering">Engineering</option>
          <option value="full">Full</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={meta.settings.reducedMotion}
          onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
        />{' '}
        Reduced motion
      </label>
      <label>
        <input
          type="checkbox"
          checked={!!meta.settings.colorblind}
          onChange={(e) => updateSettings({ colorblind: e.target.checked })}
        />{' '}
        Colorblind accent set
      </label>
      <label>
        <input
          type="checkbox"
          checked={meta.settings.muted}
          onChange={(e) => updateSettings({ muted: e.target.checked })}
        />{' '}
        Mute sound (optional beeps; muted by default)
      </label>
      <label>
        Animation
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
      <label>
        <input
          type="checkbox"
          checked={meta.settings.notifyEnabled}
          onChange={(e) => void onNotifyToggle(e.target.checked)}
        />{' '}
        Notify when tab is hidden (critical events)
      </label>
      <label>
        <input
          type="checkbox"
          checked={meta.settings.softPauseTutorials}
          onChange={(e) => updateSettings({ softPauseTutorials: e.target.checked })}
        />{' '}
        Soft-pause during tutorials
      </label>
      <label>
        Presentation
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

      <p className="muted" style={{ fontSize: 12 }}>
        Press ? for the hotkey map.
      </p>
      <button type="button" onClick={() => setOpen(false)}>
        Close
      </button>
    </div>
  )
}

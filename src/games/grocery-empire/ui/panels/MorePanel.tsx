import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { NumberFormat } from '@/shared/bn'
import { clearGameSave, deserializeState, exportSave, importSave } from '@/shared/save'
import {
  deactivateDailyChallenge,
  hasPrimaryGrocerySave,
  isDailyRunActive,
  loadDailyChallenge,
  saveDailyChallenge,
  todaysChallenge,
} from '@/shell/dailyChallenge'
import { localDayKey } from '@/shell/dailyStamp'
import { useMeta } from '@/shell/MetaContext'
import { PLAYER_CHECKLIST } from '../../content/checklist'
import { engine } from '../../sim/engine'
import { migrate } from '../../sim/migrate'
import { canUndo } from '../../sim/undo'
import { isDevSave } from '../../sim/saveKey'
import { useGame } from '../GameContext'
import { clock, qty } from '../format'
import { Btn } from '../components/Btn'
import { DevModePanel } from '../components/DevModePanel'
import { Line } from '../components/Line'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'
import { Sparkline } from '../components/Sparkline'

export function MorePanel() {
  const { state: s, dispatch, photoMode, setPhotoMode } = useGame()
  const { meta, updateSettings } = useMeta()
  const inDev = isDevSave()
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [ioMsg, setIoMsg] = useState('')
  const [resetDraft, setResetDraft] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const undoGate = canUndo()

  const checklist = useMemo(() => {
    const visible = PLAYER_CHECKLIST.filter((c) => c.era <= Math.max(1, s.era))
    const done = visible.filter((c) => c.test(s)).length
    return { visible, done, total: visible.length }
  }, [s])

  const newGame = () => {
    if (inDev) {
      if (!window.confirm('Reset DevMode sandbox only? Your campaign save is untouched.')) return
      engine.newGame()
      return
    }
    if (!window.confirm('Wipe this Grocery Empire save and start over?')) return
    deactivateDailyChallenge()
    engine.newGame()
  }

  const startDaily = () => {
    if (inDev) {
      setIoMsg("Today's corner is campaign-only — exit DevMode first.")
      return
    }
    const today = todaysChallenge()
    const hasSave = hasPrimaryGrocerySave()
    if (hasSave) {
      const ok = window.confirm(
        "Start Today's corner? Your current save will be copied to slot 3, then replaced with a fresh seeded Era-0 run.",
      )
      if (!ok) return
      engine.saveToSlot(3)
    }
    saveDailyChallenge({ day: today.day, seed: today.seed, active: true })
    engine.newGame(today.seed)
    setIoMsg(`Today's corner · seed ${today.seed}`)
  }

  const dailyBlob = loadDailyChallenge()
  const dailyActive = isDailyRunActive(s.seed)
  const bestToday =
    meta.dailyChallengeBest?.day === localDayKey() ? meta.dailyChallengeBest : null

  const saveId = inDev ? 'grocery-empire-dev' : 'grocery-empire'

  const exportRun = () => {
    const raw = exportSave(saveId)
    if (!raw) {
      setIoMsg('Nothing to export yet.')
      return
    }
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${saveId}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setIoMsg(inDev ? 'Exported DevMode sandbox.' : 'Exported run save.')
  }

  const copySave = async () => {
    const raw = exportSave(saveId)
    if (!raw) {
      setIoMsg('Nothing to copy yet.')
      return
    }
    try {
      await navigator.clipboard.writeText(raw)
      setIoMsg('Save JSON copied to clipboard.')
    } catch {
      setIoMsg('Clipboard copy failed.')
    }
  }

  const onImport = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      if (deserializeState(text) == null) {
        setIoMsg('Invalid save JSON.')
        return
      }
      if (
        !window.confirm(
          inDev
            ? 'Replace the DevMode sandbox with this file? Campaign save stays safe.'
            : 'Replace the current grocery save with this file?',
        )
      )
        return
      const parsed = deserializeState<unknown>(text)
      if (parsed == null) {
        setIoMsg('Invalid save JSON.')
        return
      }
      importSave(saveId, text)
      engine.replaceState(migrate(parsed))
      setIoMsg(inDev ? 'Loaded into DevMode sandbox.' : 'Loaded save file into play.')
    } catch {
      setIoMsg('Import failed.')
    }
  }

  return (
    <Panel title="More" purpose="Shop, achievements, guide, checklist, settings." lore="more">
      {inDev ? <DevModePanel /> : null}
      <Section label="Library">
        <div className="ge-chip-row">
          <Link className="ge-btn ge-btn--ghost" to="/">
            Shelf
          </Link>
          <Link className="ge-btn ge-btn--ghost" to="/shop">
            Shop
          </Link>
          <Link className="ge-btn ge-btn--ghost" to="/achievements">
            Achievements
          </Link>
          <Link className="ge-btn ge-btn--ghost" to="/guide/grocery-empire">
            Guide
          </Link>
        </div>
      </Section>

      <Section label="Checklist">
        <Line left="Progress" right={`${checklist.done} / ${checklist.total}`} />
        <Btn tone="ghost" onClick={() => setChecklistOpen((v) => !v)}>
          {checklistOpen ? 'Hide checklist' : 'Show checklist'}
        </Btn>
        {checklistOpen ? (
          <ul className="ge-checklist">
            {checklist.visible.map((c) => {
              const ok = c.test(s)
              return (
                <li key={c.id} className={ok ? 'done' : ''}>
                  <span aria-hidden>{ok ? '✓' : '○'}</span>
                  <span>
                    <em>E{c.era}</em> {c.label}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : null}
      </Section>

      <Section label="Save files">
        <p className="ge-muted">
          {inDev
            ? 'DevMode autosave uses games.v1.grocery-empire-dev (+ its own slots). Campaign save is untouched.'
            : 'Autosave is on. Slots are manual copies. Download/load JSON anytime.'}
        </p>
        <div className="ge-chip-row">
          {([1, 2, 3] as const).map((slot) => (
            <span key={slot} className="ge-chip-row" style={{ gap: '0.25rem' }}>
              <Btn
                tone="ghost"
                onClick={() => {
                  engine.saveToSlot(slot)
                  setIoMsg(`Saved slot ${slot}.`)
                }}
              >
                Save {slot}
              </Btn>
              <Btn
                tone="ghost"
                disabled={!engine.hasSlot(slot)}
                onClick={() => {
                  if (!window.confirm(`Load slot ${slot}?`)) return
                  if (engine.loadFromSlot(slot)) setIoMsg(`Loaded slot ${slot}.`)
                  else setIoMsg(`Slot ${slot} failed.`)
                }}
              >
                Load {slot}
              </Btn>
            </span>
          ))}
        </div>
        <div className="ge-chip-row">
          <Btn tone="ghost" onClick={exportRun}>
            Download save…
          </Btn>
          <Btn tone="ghost" onClick={() => void copySave()}>
            Copy save JSON
          </Btn>
          <Btn tone="ghost" onClick={() => fileRef.current?.click()}>
            Load save file…
          </Btn>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              e.target.value = ''
              void onImport(f)
            }}
          />
        </div>
        {ioMsg ? <p className="ge-muted">{ioMsg}</p> : null}
      </Section>

      <Section label="History">
        <Sparkline values={s.history?.cash ?? []} label="Cash" width={200} height={36} />
        <Sparkline values={s.history?.revenue ?? []} label="Revenue" width={200} height={36} />
      </Section>

      <Section label="Museum of Spoiled Goods">
        <p className="ge-muted">Top spoil events this run — gallery pride, not punishment.</p>
        {(s.museum?.exhibits ?? []).length === 0 ? (
          <p className="ge-empty">No exhibits yet. Produce will donate eventually.</p>
        ) : (
          <ul className="ge-checklist">
            {s.museum.exhibits.map((ex, i) => (
              <li key={`${ex.t}-${ex.qty}-${i}`}>
                <span aria-hidden>◇</span>
                <span>
                  <em>{clock(ex.t)}</em> · {qty(ex.qty)} units
                  {ex.note ? ` — ${ex.note}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="Run">
        <Line left="Era" right={String(s.era)} />
        <Line left="Play time" right={`${Math.floor((s.stats?.playSec ?? 0) / 60)} min`} muted />
        <Line left="Seed" right={String(s.seed)} muted />
        {dailyActive ? (
          <p className="ge-muted">
            Today&apos;s corner active · seed {dailyBlob?.seed ?? s.seed}
            {bestToday ? ` · best ${bestToday.baskets.toLocaleString()} baskets` : ''}
          </p>
        ) : bestToday ? (
          <p className="ge-muted">
            Today&apos;s best · {bestToday.baskets.toLocaleString()} baskets · seed {bestToday.seed}
          </p>
        ) : null}
        <div className="ge-chip-row">
          <Btn tone="ghost" onClick={startDaily} title={`Seed ${todaysChallenge().seed}`}>
            Today&apos;s corner
          </Btn>
          <Btn tone="danger" coachId="new-game" onClick={newGame}>
            {inDev ? 'Reset sandbox' : 'New Game'}
          </Btn>
        </div>
        {!inDev ? (
          <>
            <label className="ge-check" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              Hard reset (type RESET)
              <input
                type="text"
                className="ge-filter-bar__input"
                value={resetDraft}
                onChange={(e) => setResetDraft(e.target.value)}
                placeholder="RESET"
                autoComplete="off"
                spellCheck={false}
                aria-label="Type RESET to confirm hard reset"
              />
            </label>
            <Btn
              tone="danger"
              disabled={resetDraft.trim() !== 'RESET'}
              onClick={() => {
                if (resetDraft.trim() !== 'RESET') return
                clearGameSave('grocery-empire')
                window.location.reload()
              }}
            >
              Wipe save & reload
            </Btn>
          </>
        ) : null}
      </Section>

      <Section label="Presentation">
        <label className="ge-check" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          Number format
          <select
            value={meta.settings.numberFormat}
            onChange={(e) => updateSettings({ numberFormat: e.target.value as NumberFormat })}
            aria-label="Number format"
          >
            <option value="named">Named</option>
            <option value="scientific">Scientific</option>
            <option value="engineering">Engineering</option>
            <option value="full">Full</option>
          </select>
        </label>
        <label className="ge-check">
          <input
            type="checkbox"
            checked={meta.settings.reducedMotion}
            onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
          />
          Reduced motion
        </label>
        <label className="ge-check">
          <input
            type="checkbox"
            checked={meta.settings.softPauseTutorials}
            onChange={(e) => updateSettings({ softPauseTutorials: e.target.checked })}
          />
          Soft-pause during tutorials
        </label>
        <label className="ge-check">
          Speed unlock
          <select
            value={String(meta.settings.speedUnlock)}
            onChange={(e) => updateSettings({ speedUnlock: e.target.value === 'true' })}
          >
            <option value="false">1×–2×</option>
            <option value="true">Up to 8×</option>
          </select>
        </label>
        <p className="ge-muted">
          Press ? for hotkeys (U unpack · [ ] price · Space pause · Hold Esc soft-pause · P photo · 1–9
          menus).
        </p>
      </Section>

      <Section label="Sim">
        <div className="ge-chip-row">
          <Btn
            tone={s.paused ? 'primary' : 'ghost'}
            onClick={() => dispatch({ type: 'setPaused', paused: !s.paused })}
          >
            {s.paused ? 'Resume' : 'Pause'}
          </Btn>
          <Btn
            tone={photoMode ? 'primary' : 'ghost'}
            title="Hide rail, ledger, and toasts (P). Soft-pauses while on."
            onClick={() => setPhotoMode(!photoMode)}
          >
            Photo mode
          </Btn>
          <Btn
            tone="ghost"
            disabled={!undoGate.ok}
            title={
              undoGate.ok
                ? `Undo ${undoGate.label ?? 'last action'} (5s)`
                : 'Nothing to undo (5s window)'
            }
            onClick={() => engine.undo()}
          >
            Undo{undoGate.ok && undoGate.label ? ` · ${undoGate.label}` : ''}
          </Btn>
        </div>
      </Section>
    </Panel>
  )
}

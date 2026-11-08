import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { NumberFormat } from '@/shared/bn'
import { deserializeState, exportSave, importSave } from '@/shared/save'
import {
  clearDailyPending,
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
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { DevModePanel } from '../components/DevModePanel'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import { Sparkline } from '../components/Sparkline'

export function MorePanel() {
  const { state: s, tick, dispatch, photoMode, setPhotoMode, reducedMotion } = useGame()
  const { meta, updateSettings } = useMeta()
  const inDev = isDevSave()
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [ioMsg, setIoMsg] = useState('')
  const [resetDraft, setResetDraft] = useState('')
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const pendingImport = useRef<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const undoGate = canUndo()

  const checklist = useMemo(() => {
    // Current era only — never preview later-era goals.
    const visible = PLAYER_CHECKLIST.filter((c) => c.era <= s.era)
    const done = visible.filter((c) => c.test(s)).length
    return { visible, done, total: visible.length }
  }, [tick, s])

  const newGame = () => {
    if (inDev) {
      setConfirm({
        title: 'Reset DevMode sandbox?',
        body: 'Only the sandbox wipe. Your campaign save stays untouched.',
        confirmLabel: 'Reset sandbox',
        tone: 'danger',
        onConfirm: () => engine.newGame(),
      })
      return
    }
    setConfirm({
      title: 'Start a new game?',
      body: 'Wipe this Grocery Empire save and start over from Era 0.',
      confirmLabel: 'New Game',
      tone: 'danger',
      onConfirm: () => {
        deactivateDailyChallenge()
        clearDailyPending()
        engine.newGame()
      },
    })
  }

  const startDaily = () => {
    if (inDev) {
      setIoMsg("Today's corner is campaign-only — exit DevMode first.")
      return
    }
    const today = todaysChallenge()
    const hasSave = hasPrimaryGrocerySave()
    const run = () => {
      if (hasSave) engine.saveToSlot(3)
      saveDailyChallenge({ day: today.day, seed: today.seed, active: true })
      engine.newGame(today.seed)
      setIoMsg(`Today's corner · seed ${today.seed}`)
    }
    if (hasSave) {
      setConfirm({
        title: "Start Today's corner?",
        body: 'Your current save will be copied to slot 3, then replaced with a fresh seeded Era-0 run.',
        confirmLabel: 'Start corner',
        tone: 'danger',
        onConfirm: run,
      })
      return
    }
    run()
  }

  const dailyBlob = loadDailyChallenge()
  const dailyActive = isDailyRunActive(s.seed)
  const bestToday =
    meta.dailyChallengeBest?.day === localDayKey() ? meta.dailyChallengeBest : null
  const saveId = inDev ? 'grocery-empire-dev' : 'grocery-empire'
  const playMin = Math.floor((s.stats?.playSec ?? 0) / 60)

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

  const applyImport = (text: string) => {
    const parsed = deserializeState<unknown>(text)
    if (parsed == null) {
      setIoMsg('Invalid save JSON.')
      return
    }
    importSave(saveId, text)
    engine.replaceState(migrate(parsed))
    setIoMsg(inDev ? 'Loaded into DevMode sandbox.' : 'Loaded save file into play.')
  }

  const onImport = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      if (deserializeState(text) == null) {
        setIoMsg('Invalid save JSON.')
        return
      }
      pendingImport.current = text
      setConfirm({
        title: inDev ? 'Replace DevMode sandbox?' : 'Replace current save?',
        body: inDev
          ? 'Load this file into the sandbox. Campaign save stays safe.'
          : 'Replace the current grocery save with this file.',
        confirmLabel: 'Load file',
        tone: 'danger',
        onConfirm: () => {
          const raw = pendingImport.current
          pendingImport.current = null
          if (raw) applyImport(raw)
        },
      })
    } catch {
      setIoMsg('Import failed.')
    }
  }

  return (
    <Panel title="More" purpose="Saves, settings, and run tools." lore="more">
      {inDev ? <DevModePanel /> : null}

      <div className="ge-more">
        <section className="ge-more-block">
          <header className="ge-more-block__head">
            <h3>This run</h3>
            <p>
              Era {s.era} · {playMin} min · seed {s.seed}
              {dailyActive ? ` · Today's corner` : ''}
            </p>
          </header>
          <div className="ge-more-actions">
            <Btn
              tone={s.paused ? 'primary' : 'ghost'}
              onClick={() => dispatch({ type: 'setPaused', paused: !s.paused })}
            >
              {s.paused ? 'Resume' : 'Pause'}
            </Btn>
            <Btn
              tone={photoMode ? 'primary' : 'ghost'}
              title="Hide chrome for screenshots (P)"
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
          <div className="ge-more-sparks">
            <Sparkline values={s.history?.cash ?? []} label="Cash" width={160} height={28} />
            <Sparkline values={s.history?.revenue ?? []} label="Rev" width={160} height={28} />
          </div>
          <div className="ge-more-actions">
            <Btn tone="ghost" onClick={startDaily} title={`Seed ${todaysChallenge().seed}`}>
              Today&apos;s corner
            </Btn>
            <Btn tone="danger" coachId="new-game" onClick={newGame}>
              {inDev ? 'Reset sandbox' : 'New Game'}
            </Btn>
          </div>
          {dailyActive || bestToday ? (
            <p className="ge-muted">
              {dailyActive
                ? `Corner active · seed ${dailyBlob?.seed ?? s.seed}`
                : null}
              {bestToday
                ? `${dailyActive ? ' · ' : ''}Best today ${bestToday.baskets.toLocaleString()} baskets`
                : null}
            </p>
          ) : null}
        </section>

        <section className="ge-more-block">
          <header className="ge-more-block__head">
            <h3>Settings</h3>
            <p>How numbers and motion feel.</p>
          </header>
          <div className="ge-more-fields">
            <label className="ge-more-field">
              <span>Numbers</span>
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
            <label className="ge-more-field">
              <span>Speed</span>
              <select
                value={String(meta.settings.speedUnlock)}
                onChange={(e) => updateSettings({ speedUnlock: e.target.value === 'true' })}
              >
                <option value="false">1×–2×</option>
                <option value="true">1× · 2× · 4× · 8×</option>
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
              Soft-pause tutorials
            </label>
            <label className="ge-check">
              <input
                type="checkbox"
                checked={!!meta.settings.suggestNext}
                onChange={(e) => updateSettings({ suggestNext: e.target.checked })}
              />
              Suggested next buy
            </label>
          </div>
          <p className="ge-muted">
            Hotkeys · U unpack · [ ] price · Space pause · Ctrl/Cmd+Z undo · Hold Esc soft-pause · P
            photo · 1–9 menus · ? list
          </p>
        </section>

        <section className="ge-more-block ge-more-block--wide">
          <header className="ge-more-block__head">
            <h3>Saves</h3>
            <p>
              {inDev
                ? 'DevMode uses its own save id. Campaign stays untouched.'
                : 'Autosave is on. Slots are manual copies.'}
            </p>
          </header>
          <div className="ge-more-slots">
            {([1, 2, 3] as const).map((slot) => (
              <div key={slot} className="ge-more-slot">
                <span>Slot {slot}</span>
                <Btn
                  tone="ghost"
                  onClick={() => {
                    engine.saveToSlot(slot)
                    setIoMsg(`Saved slot ${slot}.`)
                  }}
                >
                  Save
                </Btn>
                <Btn
                  tone="ghost"
                  disabled={!engine.hasSlot(slot)}
                  onClick={() =>
                    setConfirm({
                      title: `Load slot ${slot}?`,
                      body: 'Replace the current run with the copy in this slot.',
                      confirmLabel: `Load slot ${slot}`,
                      tone: 'danger',
                      onConfirm: () => {
                        if (engine.loadFromSlot(slot)) setIoMsg(`Loaded slot ${slot}.`)
                        else setIoMsg(`Slot ${slot} failed.`)
                      },
                    })
                  }
                >
                  Load
                </Btn>
              </div>
            ))}
          </div>
          <div className="ge-more-actions">
            <Btn tone="ghost" onClick={exportRun}>
              Download JSON
            </Btn>
            <Btn tone="ghost" onClick={() => void copySave()}>
              Copy JSON
            </Btn>
            <Btn tone="ghost" onClick={() => fileRef.current?.click()}>
              Load file…
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
          {!inDev ? (
            <div className="ge-more-danger">
              <label className="ge-more-field">
                <span>Hard reset · type RESET</span>
                <input
                  type="text"
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
                  deactivateDailyChallenge()
                  clearDailyPending()
                  engine.newGame()
                  window.location.assign('/')
                }}
              >
                Wipe & reload
              </Btn>
            </div>
          ) : null}
        </section>

        <section className="ge-more-block">
          <header className="ge-more-block__head">
            <h3>Progress</h3>
            <p>
              Checklist {checklist.done}/{checklist.total}
            </p>
          </header>
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
          {(s.museum?.exhibits ?? []).length > 0 ? (
            <>
              <header className="ge-more-block__head" style={{ marginTop: '0.85rem' }}>
                <h3>Museum</h3>
                <p>Spoiled goods this run.</p>
              </header>
              <ul className="ge-checklist">
                {s.museum.exhibits.slice(0, 6).map((ex, i) => (
                  <li key={`${ex.t}-${ex.qty}-${i}`}>
                    <span aria-hidden>◇</span>
                    <span>
                      <em>{clock(ex.t)}</em> · {qty(ex.qty)}
                      {ex.note ? ` — ${ex.note}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section className="ge-more-block">
          <header className="ge-more-block__head">
            <h3>Library</h3>
            <p>Leave the aisle when you need meta tools.</p>
          </header>
          <div className="ge-more-links">
            <Link className="ge-more-link" to="/">
              Shelf
            </Link>
            <Link className="ge-more-link" to="/shop">
              Shop
            </Link>
            <Link className="ge-more-link" to="/achievements">
              Achievements
            </Link>
            <Link className="ge-more-link" to="/guide/grocery-empire">
              Ops Wiki
            </Link>
          </div>
        </section>
      </div>

      <HelpCard title="Soft edges of the run">
        Saves, settings, and the guide live here. Export a save before big experiments; toggle
        Suggested next if the tip strip feels loud.
      </HelpCard>

      <ConfirmModal
        open={!!confirm}
        spec={confirm}
        reducedMotion={reducedMotion}
        onClose={() => {
          pendingImport.current = null
          setConfirm(null)
        }}
      />
    </Panel>
  )
}

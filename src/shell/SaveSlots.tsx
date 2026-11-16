import { useId, useMemo, useState } from 'react'
import { cashLabel } from '@/shared/bn'
import { loadGame } from '@/shared/save'
import { ERA_STORY } from '@/games/grocery-empire/content/lore'
import { ConfirmModal, type ConfirmSpec } from '@/games/grocery-empire/ui/components/ConfirmModal'
import { Btn } from '@/games/grocery-empire/ui/components/Btn'
import { engine } from '@/games/grocery-empire/sim/engine'
import { getActiveSaveId } from '@/games/grocery-empire/sim/saveKey'

type Slot = 1 | 2 | 3
const SLOTS: Slot[] = [1, 2, 3]

interface SlotGlance {
  era?: number
  cash?: number
  lastSavedAt?: number
}

/** Short relative age for a save timestamp ("just now", "5m ago", "3d ago"). */
export function slotAge(at: number | undefined, now = Date.now()): string {
  if (!at || !Number.isFinite(at)) return 'unknown age'
  const sec = Math.max(0, Math.floor((now - at) / 1000))
  if (sec < 45) return 'just now'
  if (sec < 3600) return `${Math.max(1, Math.round(sec / 60))}m ago`
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`
  return `${Math.round(sec / 86400)}d ago`
}

/** "Slot 2 · The Counter · $1.20K · 5m ago" — or the empty state. */
export function slotSummary(slot: number, glance: SlotGlance | null, now = Date.now()): string {
  if (!glance) return `Slot ${slot} · empty`
  const era = typeof glance.era === 'number' ? (ERA_STORY[glance.era]?.title ?? `Era ${glance.era}`) : 'Era ?'
  const cash = typeof glance.cash === 'number' ? cashLabel(glance.cash) : '$—'
  return `Slot ${slot} · ${era} · ${cash} · ${slotAge(glance.lastSavedAt, now)}`
}

/**
 * Three manual save slots, shared by the Shelf settings modal and the in-game Tools drawer.
 * Overwrite and load both confirm in a modal (never window.confirm).
 */
export function SaveSlots({
  variant,
  reducedMotion = false,
  onNote,
}: {
  /** `shell` = Shelf settings look; `ge` = in-game look. */
  variant: 'shell' | 'ge'
  reducedMotion?: boolean
  onNote?: (msg: string) => void
}) {
  const [rev, setRev] = useState(0)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)

  const glances = useMemo(() => {
    const id = getActiveSaveId()
    const now = Date.now()
    return SLOTS.map((slot) => {
      if (!engine.hasSlot(slot)) return { slot, glance: null as SlotGlance | null, now }
      const blob = loadGame<SlotGlance>(`${id}-slot-${slot}`)
      return { slot, glance: blob ?? ({} as SlotGlance), now }
    })
    // rev bumps after save/load; the drawer re-renders often enough for the age to stay fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev])

  const note = (msg: string) => onNote?.(msg)

  const doSave = (slot: Slot) => {
    if (!engine.saveToSlot(slot)) note(`Could not write slot ${slot}.`)
    else note(`Saved to slot ${slot}.`)
    setRev((n) => n + 1)
  }

  const doLoad = (slot: Slot) => {
    if (!engine.loadFromSlot(slot)) note(`Failed to load slot ${slot}.`)
    else note(`Loaded slot ${slot}.`)
    setRev((n) => n + 1)
  }

  const askSave = (slot: Slot, filled: boolean) => {
    if (!filled) {
      doSave(slot)
      return
    }
    setConfirm({
      title: `Overwrite slot ${slot}?`,
      body: 'Replace this slot with your current run.',
      confirmLabel: `Overwrite slot ${slot}`,
      tone: 'danger',
      onConfirm: () => doSave(slot),
    })
  }

  const askLoad = (slot: Slot) => {
    if (!engine.hasSlot(slot)) {
      note(`Slot ${slot} is empty.`)
      return
    }
    setConfirm({
      title: `Load slot ${slot}?`,
      body: 'Live progress will be overwritten by the copy in this slot.',
      confirmLabel: `Load slot ${slot}`,
      tone: 'danger',
      onConfirm: () => doLoad(slot),
    })
  }

  const listClass = variant === 'ge' ? 'ge-more-slots' : 'settings-slots'
  const rowClass = variant === 'ge' ? 'ge-more-slot' : 'settings-slots__row'

  const action = (label: string, onClick: () => void, disabled = false) =>
    variant === 'ge' ? (
      <Btn tone="ghost" disabled={disabled} onClick={onClick}>
        {label}
      </Btn>
    ) : (
      <button type="button" disabled={disabled} onClick={onClick}>
        {label}
      </button>
    )

  return (
    <>
      <div className={listClass}>
        {glances.map(({ slot, glance, now }) => {
          const filled = glance != null
          return (
            <div key={slot} className={rowClass}>
              <span>
                {slotSummary(slot, glance, now)}
                {slot === 3 ? (
                  <small style={{ display: 'block', opacity: 0.7 }}>holds your run during Today&apos;s corner</small>
                ) : null}
              </span>
              {action('Save', () => askSave(slot, filled))}
              {action('Load', () => askLoad(slot), !filled)}
            </div>
          )
        })}
      </div>
      {variant === 'ge' ? (
        <ConfirmModal open={!!confirm} spec={confirm} reducedMotion={reducedMotion} onClose={() => setConfirm(null)} />
      ) : (
        <ShellConfirm spec={confirm} onClose={() => setConfirm(null)} />
      )}
    </>
  )
}

/** Shelf-styled confirm (the in-game ConfirmModal needs the game's stylesheet). Never window.confirm. */
export function ShellConfirm({
  spec,
  onClose,
  alt,
}: {
  spec: ConfirmSpec | null
  onClose: () => void
  /** Optional third choice (e.g. "Meta only") that runs and closes. */
  alt?: { label: string; onClick: () => void }
}) {
  const titleId = useId()
  if (!spec) return null
  return (
    <div
      className="app-modal"
      style={{ zIndex: 100 }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="app-modal__panel settings-modal" onClick={(e) => e.stopPropagation()}>
        <h3 id={titleId} style={{ margin: 0 }}>
          {spec.title}
        </h3>
        <p>{spec.body}</p>
        <div className="settings-io-row">
          <button type="button" className="settings-btn" onClick={onClose}>
            {spec.cancelLabel ?? 'Cancel'}
          </button>
          {alt ? (
            <button
              type="button"
              className="settings-btn"
              onClick={() => {
                onClose()
                alt.onClick()
              }}
            >
              {alt.label}
            </button>
          ) : null}
          <button
            type="button"
            autoFocus
            className={`settings-btn${spec.tone === 'danger' ? ' settings-btn--danger' : ' settings-btn--accent'}`}
            onClick={() => {
              onClose()
              spec.onConfirm()
            }}
          >
            {spec.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { requestAutopilot, requestRoadAhead } from './uiBus'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MENUS, type MenuId } from '../../content/menus'
import { MEMOS } from '../../content/memos'
import { ROLES, ROLE_IDS } from '../../content/staff'
import { UPGRADES } from '../../content/upgrades'
import { can, type Command } from '../../sim/commands'
import type { GameState } from '../../sim/state'
import { fuzzyScore } from './fuzzy'
import { HUBS } from './hubs'

interface Item {
  id: string
  label: string
  hint: string
  run: () => void
}

/** Show only the best fuzzy matches so a broad query doesn't dump hundreds of rows. */
const MAX_RESULTS = 40

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)

/** `K` or `/` opens a quick jump list: every unlocked menu, plus a few common actions. */
export function CommandPalette({
  state,
  onMenu,
  dispatch,
  onInbox,
  onTools,
}: {
  state: GameState
  onMenu: (id: MenuId) => void
  dispatch: (cmd: Command) => void
  onInbox: () => void
  onTools: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key
      if (k === 'k' || k === 'K' || (k === '/' && !e.shiftKey)) {
        e.preventDefault()
        setQuery('')
        setCursor(0)
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  const items = useMemo<Item[]>(() => {
    const list: Item[] = []
    for (const h of HUBS) {
      for (const id of h.menus) {
        if (!state.menus[id]) continue
        list.push({ id: `go-${id}`, label: `Go to ${MENUS[id].name}`, hint: h.name, run: () => onMenu(id) })
      }
    }
    // Coach lives outside the hubs (SIDE_MENUS), so it needs its own entry.
    if (state.menus.coach) {
      list.push({ id: 'go-coach', label: `Go to ${MENUS.coach.name}`, hint: 'Side', run: () => onMenu('coach') })
    }
    list.push(
      { id: 'unpack', label: 'Unpack a crate', hint: 'U', run: () => dispatch({ type: 'unpack' }) },
      { id: 'pause', label: state.paused ? 'Resume time' : 'Pause time', hint: 'Space', run: () => dispatch({ type: 'setPaused', paused: !state.paused }) },
      { id: 'memos', label: 'Open memos', hint: 'M', run: onInbox },
      { id: 'tools', label: 'Open menu (saves, settings)', hint: ',', run: onTools },
      { id: 'road', label: 'Road ahead: goals to the next era', hint: '', run: requestRoadAhead },
      { id: 'autopilot', label: 'Autopilot: chores that run themselves', hint: '', run: () => requestAutopilot() },
    )
    return list
    // state mutates in place; paused is the only live field read here.
  }, [state.menus, state.paused, onMenu, dispatch, onInbox, onTools])

  // Upgrades, memos and roles are only indexed while searching, so the empty palette stays short.
  const shown = useMemo(() => {
    if (!query.trim()) return items
    const pool: Item[] = [...items]
    if (open) {
      if (state.menus.upgrades) {
        for (const def of UPGRADES) {
          const owned = (state.upgrades[def.id] ?? 0) > 0
          if (!owned && !can(state, { type: 'buyUpgrade', id: def.id }).ok) continue
          pool.push({ id: `up-${def.id}`, label: `Upgrade: ${def.name}`, hint: 'Upgrades', run: () => onMenu('upgrades') })
        }
      }
      for (const m of MEMOS) {
        if (m.era > state.era) continue
        let seen = (state.memos[m.id] ?? 0) > 0 || !!state.memoSeen[m.id]
        if (!seen) {
          try {
            seen = m.visible(state)
          } catch {
            seen = false
          }
        }
        if (seen) pool.push({ id: `memo-${m.id}`, label: `Memo: ${m.name}`, hint: 'Memos', run: onInbox })
      }
      if (state.menus.staff) {
        for (const id of ROLE_IDS) {
          const role = ROLES[id]
          if (!role || (role.era ?? 0) > state.era || id === 'shiftLead') continue
          pool.push({ id: `hire-${id}`, label: `Hire: ${role.name}`, hint: 'Staff', run: () => onMenu('staff') })
        }
      }
    }
    return pool
      .map((it) => ({ it, s: Math.max(fuzzyScore(query, it.label), fuzzyScore(query, `${it.hint} ${it.label}`)) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, MAX_RESULTS)
      .map((r) => r.it)
  }, [items, query, open, state, onMenu, onInbox])

  if (!open) return null

  const close = () => setOpen(false)
  const pick = (it: Item | undefined) => {
    if (!it) return
    close()
    it.run()
  }
  const at = Math.min(cursor, Math.max(0, shown.length - 1))

  return (
    <div className="g2-palette" role="dialog" aria-modal="true" aria-label="Command palette" onClick={close}>
      <div className="g2-palette__box" onClick={(e) => e.stopPropagation()}>
        <input
          ref={input}
          className="g2-palette__input"
          value={query}
          placeholder="Jump to a menu or do something…"
          aria-label="Search commands"
          onChange={(e) => {
            setQuery(e.target.value)
            setCursor(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              close()
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setCursor(Math.min(shown.length - 1, at + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setCursor(Math.max(0, at - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              pick(shown[at])
            }
          }}
        />
        <ul className="g2-palette__list" role="listbox">
          {shown.length === 0 ? <li className="g2-palette__empty">Nothing matches.</li> : null}
          {shown.map((it, i) => (
            <li key={it.id} role="option" aria-selected={i === at}>
              <button
                type="button"
                className={`g2-palette__row${i === at ? ' is-active' : ''}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(it)}
              >
                <span>{it.label}</span>
                <kbd>{it.hint}</kbd>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

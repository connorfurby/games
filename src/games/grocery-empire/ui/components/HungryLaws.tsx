import { useState } from 'react'
import { HUNGRY_MUTATORS, type HungryMutatorId } from '../../content/lateEras'
import { HUNGRY_LAWS } from '../../sim/balance'
import { Btn } from './Btn'

export function HungryLawsBoard({
  title = 'Hungry laws',
  initial = [],
  onConfirm,
  compact = false,
}: {
  title?: string
  initial?: readonly HungryMutatorId[]
  onConfirm: (mutators: HungryMutatorId[]) => void
  compact?: boolean
}) {
  const [picked, setPicked] = useState<HungryMutatorId[]>(() => [...initial].slice(0, HUNGRY_LAWS.maxMutators))

  const toggle = (id: HungryMutatorId) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= HUNGRY_LAWS.maxMutators) return prev
      return [...prev, id]
    })
  }

  return (
    <div className={compact ? 'ge-hungry-laws ge-hungry-laws--compact' : 'ge-hungry-laws'}>
      <h3 id="ge-hungry-laws-title">{title}</h3>
      <p className="ge-hungry-laws__epigraph">
        “The hungry universe continues. You only choose which mild laws it remembers.”
      </p>
      <p className="ge-muted">
        Pick up to {HUNGRY_LAWS.maxMutators} mild laws for this universe. None is fine — Confirm anytime.
      </p>
      <ul className="ge-hungry-laws__list">
        {HUNGRY_MUTATORS.map((m) => {
          const on = picked.includes(m.id)
          const blocked = !on && picked.length >= HUNGRY_LAWS.maxMutators
          return (
            <li key={m.id}>
              <label className={`ge-hungry-laws__row${blocked ? ' is-blocked' : ''}`.trim()}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={blocked}
                  onChange={() => toggle(m.id)}
                />
                <span>
                  <strong>{m.name}</strong>
                  <span className="ge-muted"> — {m.blurb}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      <Btn tone="primary" onClick={() => onConfirm(picked)}>
        Confirm{picked.length === 0 ? ' (none)' : ` (${picked.length})`}
      </Btn>
    </div>
  )
}

export function HungryLawsModal({
  onConfirm,
}: {
  onConfirm: (mutators: HungryMutatorId[]) => void
}) {
  return (
    <div className="ge-modal" role="dialog" aria-labelledby="ge-hungry-laws-title">
      <div className="ge-hungry-laws-paper">
        <HungryLawsBoard onConfirm={onConfirm} />
      </div>
    </div>
  )
}

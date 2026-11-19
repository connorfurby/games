import { DOCTRINE_BY_ID } from '../../content/doctrines'
import { PROGRAM_BY_ID } from '../../content/programs'
import type { GameState } from '../../sim/state'
import { Button } from '../kit/Button'
import { useGame } from '../GameContext'

/** One carry: a doctrine you own, or a show you have slotted. Choosing one clears the other. */
export function CarryPicker({
  value,
  onChange,
}: {
  value: GameState['prestigeCarry']
  onChange: (next: GameState['prestigeCarry']) => void
}) {
  const { state: s } = useGame()
  const shows = Object.values(s.depth.programs)
    .map((id) => (id ? PROGRAM_BY_ID[id] : undefined))
    .filter((p): p is NonNullable<typeof p> => !!p)
  const docs = s.doctrines.map((id) => DOCTRINE_BY_ID[id]).filter((d): d is NonNullable<typeof d> => !!d)

  const pickDoctrine = (id: string) =>
    onChange(value?.type === 'doctrine' && value.id === id ? null : { type: 'doctrine', id })
  const pickShow = (id: string) =>
    onChange(value?.type === 'facing' && value.id === id ? null : { type: 'facing', id })

  if (docs.length === 0 && shows.length === 0) {
    return (
      <p className="purpose">
        Slot a show on Air, or buy a doctrine under Calls, to carry one thing forward.
      </p>
    )
  }

  return (
    <div className="sd-stack">
      <p className="purpose">Carry one doctrine or one show. The other stays behind.</p>
      {docs.length > 0 ? (
        <div className="sd-wrap">
          {docs.map((d) => (
            <Button
              key={d.id}
              size="sm"
              tone={value?.type === 'doctrine' && value.id === d.id ? 'primary' : 'ghost'}
              onClick={() => pickDoctrine(d.id)}
            >
              {d.name}
            </Button>
          ))}
        </div>
      ) : null}
      {shows.length > 0 ? (
        <div className="sd-wrap">
          {shows.map((p) => (
            <Button
              key={p.id}
              size="sm"
              tone={value?.type === 'facing' && value.id === p.id ? 'primary' : 'ghost'}
              onClick={() => pickShow(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

import { TREES, type TreeId } from '../../../content/upgrades'
import { Hit, Person, RoomScene, Sign } from '../room'

export interface UpgradesHallTree {
  id: TreeId
  ranks: number
  /** Nodes you can afford one rank of right now. */
  ready: number
}

const PER_ROW = 7
const PLAQUE_H = 46

/**
 * Upgrades hall: one plaque per tree on the wall, night case like Rank Hall.
 * Plaques are the same tap as the Trees control below; the tree itself stays body.
 * Tag yellow marks a tree you can spend in (spend language, never tomato).
 */
export function UpgradesHallScene({
  trees,
  activeId,
  mastery,
  totalReady,
  onPick,
}: {
  trees: UpgradesHallTree[]
  activeId: TreeId
  mastery: number
  totalReady: number
  onPick: (id: TreeId) => void
}) {
  const cols = Math.min(PER_ROW, Math.max(1, trees.length))
  const rows = Math.max(1, Math.ceil(trees.length / PER_ROW))
  const w = Math.min(124, Math.floor((960 - 24 - 8 * (cols - 1)) / cols))
  const x0 = Math.round((960 - (cols * w + (cols - 1) * 8)) / 2)
  const height = 58 + rows * (PLAQUE_H + 8) + 70
  const totalRanks = trees.reduce((n, t) => n + t.ranks, 0)

  return (
    <RoomScene
      label={`Upgrades hall. ${trees.length} trees · ${totalRanks} ranks · ${totalReady} ready.`}
      className="uh"
      chips={[
        { label: 'Trees', value: String(trees.length) },
        { label: 'Ranks', value: String(totalRanks) },
        { label: 'Ready', value: String(totalReady), rate: totalReady > 0 ? 'spend' : undefined },
        { label: TREES[activeId].name, value: `×${mastery.toFixed(1)}` },
      ]}
      skyTop="var(--sc-night-top)"
      skyBottom="var(--sc-night-bottom)"
      height={height}
    >
      {trees.map((t, i) => {
        const col = i % PER_ROW
        const row = Math.floor(i / PER_ROW)
        const x = x0 + col * (w + 8)
        const y = 58 + row * (PLAQUE_H + 8)
        const on = t.id === activeId
        const name = TREES[t.id].name
        return (
          <Hit
            key={t.id}
            x={x}
            y={y}
            w={w}
            h={PLAQUE_H}
            label={`${name} tree, ${t.ranks} ranks${t.ready > 0 ? `, ${t.ready} ready` : ''}`}
            onActivate={() => onPick(t.id)}
          >
            <rect
              className={`uh-plaque${on ? ' is-active' : ''}${t.ready > 0 ? ' is-ready' : ''}`}
              x={x}
              y={y}
              width={w}
              height={PLAQUE_H}
              rx="6"
            />
            <Sign x={x + 8} y={y + 19} text={name} small={w < 100} />
            <Sign x={x + 8} y={y + 36} text={`${t.ranks} ranks`} small />
            {t.ready > 0 ? <circle className="uh-ready" cx={x + w - 12} cy={y + 12} r="4.5" /> : null}
          </Hit>
        )
      })}

      <Person x={820} y={height - 62} tint="#c9a15a" delay={0.2} />
      <Person x={872} y={height - 62} tint="#8fb6e0" delay={0.5} />
    </RoomScene>
  )
}

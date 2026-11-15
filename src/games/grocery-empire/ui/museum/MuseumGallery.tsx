import { RELIC_BY_ID, RARITY_INFO } from '../../content/relics'
import type { MuseumSave } from '../../sim/museum'
import { RelicIcon, ChestArt } from './RelicIcon'

/** Gallery strip: recent pedestals, chest alcove, dust — CSS grid, no absolute overlaps. */
export function MuseumGallery({
  m,
  onOpenChests,
  onSelect,
}: {
  m: MuseumSave
  onOpenChests: () => void
  onSelect: (id: string) => void
}) {
  const recent = Object.entries(m.relics)
    .map(([id, got]) => ({ id, at: got.at, n: got.n }))
    .sort((a, b) => b.at - a.at)
    .slice(0, 5)
  const owned = Object.keys(m.relics).length

  return (
    <figure className="mu-gallery" aria-label="Museum gallery">
      <div className="mu-gallery__hud">
        <span>
          Relics <strong>{owned}</strong>
        </span>
        <span>
          Dust <strong>{m.dust}</strong>
        </span>
        <span>
          Chests <strong>{m.chests.length}</strong>
        </span>
      </div>

      <ol className="mu-gallery__peds">
        {recent.length === 0 ? (
          <li className="mu-gallery__empty">Open a chest — pedestals wait</li>
        ) : (
          recent.map((row) => {
            const def = RELIC_BY_ID[row.id]
            if (!def) return null
            return (
              <li key={row.id}>
                <button type="button" className="mu-gallery__ped" onClick={() => onSelect(row.id)} title={def.name}>
                  <RelicIcon
                    id={row.id}
                    size={56}
                    level={m.relics[row.id]?.level ?? 0}
                    socketed={m.sockets.includes(row.id)}
                  />
                  <span className="mu-gallery__plinth" />
                  <em>{RARITY_INFO[def.rarity].label}</em>
                </button>
              </li>
            )
          })
        )}
      </ol>

      <button type="button" className="mu-gallery__alcove" onClick={onOpenChests} data-coach-id="museum-chests">
        <ChestArt rarity={m.chests[0]?.rarity ?? 'common'} size={56} />
        <span>{m.chests.length ? `${m.chests.length} waiting` : 'Chest alcove'}</span>
      </button>

      <div className="mu-gallery__plaque" aria-label="Dust plaque">
        <span>Dust plaque</span>
        <strong>{m.dust}</strong>
        <small>Duplicates → dust</small>
      </div>
    </figure>
  )
}

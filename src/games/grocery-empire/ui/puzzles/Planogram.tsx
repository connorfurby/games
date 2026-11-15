import { PLANET_SKUS, SKU_BY_ID, type PlanetDef } from '../../content/horizon'

function slotHit(wanted: readonly string[], skuId: string): boolean {
  const sku = SKU_BY_ID[skuId]
  if (!sku) return false
  const set = new Set(wanted)
  return sku.tags.some((tag) => set.has(tag))
}

/** Six slots + twelve chips. Tags and match/miss are always visible. */
export function Planogram({
  planet,
  slots,
  onClear,
  onPlace,
}: {
  planet: PlanetDef
  slots: readonly string[]
  onClear: (index: number) => void
  onPlace: (skuId: string) => void
}) {
  const full = slots.every((id) => id && SKU_BY_ID[id])
  const matched = slots.reduce((n, id) => n + (slotHit(planet.wanted, id) ? 1 : 0), 0)

  return (
    <div className="hz-planogram" data-coach-id="planets-shelf-note">
      <p className="hz-wants" aria-label="Wanted tags">
        <span>Wants</span>
        {planet.wanted.map((tag) => (
          <em key={tag} className="hz-want">
            {tag}
          </em>
        ))}
        <strong>
          {matched} of 6 tags
        </strong>
      </p>
      <div className="hz-slots" role="list" aria-label="Shelf slots">
        {slots.map((id, i) => {
          const sku = SKU_BY_ID[id]
          const hit = sku ? slotHit(planet.wanted, id) : false
          return (
            <button
              key={i}
              type="button"
              className={`hz-slot${sku ? ' is-on' : ''}${sku ? (hit ? ' is-hit' : ' is-miss') : ''}`}
              onClick={() => onClear(i)}
              title={sku ? 'Clear this slot' : 'Empty slot'}
            >
              <span>{i + 1}</span>
              <strong>{sku ? sku.name : 'Empty'}</strong>
              {sku ? (
                <em className="hz-slot__tags">
                  {sku.tags.join(' · ')}
                  {hit ? ' · match' : ' · miss'}
                </em>
              ) : (
                <em className="hz-slot__tags">Tap a good below</em>
              )}
            </button>
          )
        })}
      </div>
      <div className="hz-chips hz-chips--sku" role="list" aria-label="Goods">
        {PLANET_SKUS.map((sku) => {
          const hit = sku.tags.some((tag) => planet.wanted.includes(tag))
          return (
            <button
              key={sku.id}
              type="button"
              className={`hz-chip hz-chip--sku${hit ? ' is-want' : ''}`}
              disabled={full}
              title={full ? 'Shelf is full. Clear a slot.' : sku.tags.join(', ')}
              onClick={() => onPlace(sku.id)}
            >
              <strong>{sku.name}</strong>
              <em>{sku.tags.join(' · ')}</em>
            </button>
          )
        })}
      </div>
    </div>
  )
}

import { SKU_BY_ID } from '../../content/horizon'
import {
  bayCaps,
  convoyCapacity,
  convoyScore,
  offerCrates,
  packFits,
  packToken,
  planetDef,
  type ConvoyCrate,
} from '../../sim/systems/horizon'
import type { GameState } from '../../sim/state'
import { pct } from '../format'

export function tokensFromOffers(offers: readonly ConvoyCrate[], selectedIds: readonly string[]): string[] {
  const byId = new Map(offers.map((c) => [c.id, c]))
  const out: string[] = []
  for (const id of selectedIds) {
    const crate = byId.get(id)
    if (crate) out.push(packToken(crate.sku, crate.size))
  }
  return out
}

export function liveConvoyScore(
  s: GameState,
  origin: string,
  dest: string,
  good: string,
  offers: readonly ConvoyCrate[],
  selectedIds: readonly string[],
): number {
  if (!origin || !dest || !good) return 0
  return convoyScore(origin, dest, good, tokensFromOffers(offers, selectedIds), convoyCapacity(s))
}

function destWants(dest: string, skuId: string): boolean {
  const sku = SKU_BY_ID[skuId]
  const def = planetDef(dest)
  if (!sku || !def) return false
  const wanted = new Set(def.wanted)
  return sku.tags.some((tag) => wanted.has(tag))
}

/** Five bays + eight crates. Selected crates must fit bay capacities. */
export function Convoy({
  state: s,
  origin,
  dest,
  good,
  circuitIndex,
  selectedIds,
  onChange,
}: {
  state: GameState
  origin: string
  dest: string
  good: string
  circuitIndex: number
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const offers = offerCrates(s, origin || 'pantry', dest || 'orchard', Math.max(0, circuitIndex))
  const caps = bayCaps(s)
  const capacity = convoyCapacity(s)
  const tokens = tokensFromOffers(offers, selectedIds)
  const used = tokens.reduce((n, token) => {
    const at = token.indexOf('@')
    return n + (at >= 0 ? Number(token.slice(at + 1)) || 0 : 1)
  }, 0)
  const score = liveConvoyScore(s, origin, dest, good, offers, selectedIds)
  const selected = new Set(selectedIds)

  function toggle(id: string) {
    if (selected.has(id)) {
      onChange(selectedIds.filter((x) => x !== id))
      return
    }
    const next = [...selectedIds, id]
    if (!packFits(s, tokensFromOffers(offers, next))) return
    onChange(next)
  }

  return (
    <div className="hz-convoy">
      <p className="hz-wants">
        <span>Bays</span>
        {caps.map((cap, i) => (
          <em key={i} className="hz-want">
            {cap}
          </em>
        ))}
        <strong>
          {used}/{capacity} · {pct(score)}
        </strong>
      </p>
      <div className="hz-bays" aria-hidden>
        {caps.map((cap, i) => (
          <div key={i} className="hz-bay" style={{ flex: cap }}>
            <span>{cap}</span>
          </div>
        ))}
      </div>
      <div className="hz-chips hz-chips--sku" role="list" aria-label="Crates">
        {offers.map((crate) => {
          const on = selected.has(crate.id)
          const sku = SKU_BY_ID[crate.sku]
          const trial = on ? selectedIds.filter((x) => x !== crate.id) : [...selectedIds, crate.id]
          const canAdd = on || packFits(s, tokensFromOffers(offers, trial))
          const want = destWants(dest, crate.sku)
          return (
            <button
              key={crate.id}
              type="button"
              className={`hz-chip hz-chip--sku${on ? ' is-on' : ''}${want ? ' is-want' : ''}`}
              disabled={!on && !canAdd}
              onClick={() => toggle(crate.id)}
              title={`${sku?.name ?? crate.sku} · size ${crate.size}`}
            >
              <strong>
                {sku?.name ?? crate.sku} · {crate.size}
              </strong>
              <em>{sku?.tags.join(' · ')}</em>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { offerCrates }

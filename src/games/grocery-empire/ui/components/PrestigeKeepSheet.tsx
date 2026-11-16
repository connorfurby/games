import { HUNGRY_MUTATORS } from '../../content/lateEras'
import { HUNGRY_LAWS } from '../../sim/balance'
import { carryOptions, pendingGoodwill, type RebrandCarry } from '../../sim/systems/prestige'
import type { GameState } from '../../sim/state'
import { Btn } from './Btn'

function same(a: RebrandCarry, b: RebrandCarry): boolean {
  if (!a || !b) return a === b
  if (a.type !== b.type) return false
  return a.type === 'doctrine' ? a.id === (b as typeof a).id : a.variantId === (b as typeof a).variantId
}

/**
 * "What you keep" — one sheet for Rebrand and the Era 6 Accept ending, so both prestiges read as the
 * same game: the standing keep-list, the Hungry laws, and the one doctrine OR facing you carry over.
 */
export function PrestigeKeepSheet({
  state: s,
  mode,
  carry,
  onCarry,
}: {
  state: GameState
  mode: 'rebrand' | 'accept'
  carry: RebrandCarry
  onCarry: (next: RebrandCarry) => void
}) {
  const { doctrines, facings } = carryOptions(s)
  const gain = pendingGoodwill(s)
  const kept = s.prestigeCarry.mutators ?? []
  const lawName = (id: string) => HUNGRY_MUTATORS.find((m) => m.id === id)?.name ?? id
  const pick = (next: RebrandCarry) => onCarry(same(carry, next) ? null : next)
  const empty = doctrines.length === 0 && facings.length === 0

  return (
    <div className="ge-keep" data-testid="prestige-keep-sheet">
      <h4 className="ge-keep__head">What you keep</h4>
      <ul className="ge-keep__list">
        <li>
          Empire {s.empire.level}, trait points, the museum, and Goodwill
          {gain > 0 ? ` (+${gain} now, ${s.rebrand.goodwill + gain} total)` : ''}.
        </li>
        <li>
          Hungry laws:{' '}
          {mode === 'accept'
            ? `the board reopens — pick 0–${HUNGRY_LAWS.maxMutators} of ${HUNGRY_MUTATORS.map((m) => m.name).join(', ')}.`
            : kept.length > 0
              ? `${kept.map(lawName).join(', ')} stay on.`
              : 'none are on; they come back with Accept.'}
        </li>
      </ul>

      <h4 className="ge-keep__head">Carry one thing across</h4>
      <p className="ge-keep__note">One doctrine OR one facing, not both. A carried facing sleeps until you rebuild its tier.</p>
      {empty ? (
        <p className="ge-keep__note">No doctrine or facing yet — nothing extra to carry.</p>
      ) : (
        <>
          <div className="ge-keep__group" role="group" aria-label="Carry a doctrine">
            {doctrines.map((o) => (
              <Btn
                key={`d-${(o.carry as { id: string }).id}`}
                tone={same(carry, o.carry) ? 'secondary' : 'ghost'}
                aria-pressed={same(carry, o.carry)}
                title={o.blurb}
                onClick={() => pick(o.carry)}
              >
                Doctrine · {o.name}
              </Btn>
            ))}
          </div>
          <div className="ge-keep__group" role="group" aria-label="Carry a facing">
            {facings.map((o) => (
              <Btn
                key={`f-${(o.carry as { variantId: string }).variantId}`}
                tone={same(carry, o.carry) ? 'secondary' : 'ghost'}
                aria-pressed={same(carry, o.carry)}
                title={o.blurb}
                onClick={() => pick(o.carry)}
              >
                Facing · {o.name}
              </Btn>
            ))}
          </div>
        </>
      )}
      <p className="ge-keep__note" aria-live="polite">
        {carry ? `Carrying: ${carry.type === 'doctrine' ? 'doctrine' : 'facing'} chosen.` : 'Carrying nothing extra.'}
      </p>
    </div>
  )
}

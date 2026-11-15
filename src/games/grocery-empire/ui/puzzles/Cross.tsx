import { SEASON_WANTS, crossTraits, type TraitId } from '../../content/horizon'

const TRAITS: TraitId[] = ['sweet', 'sturdy', 'pretty', 'lasting', 'rich', 'quiet']

/** Parent A/B pickers with a live child preview before plant. */
export function Cross({
  a,
  b,
  season,
  onA,
  onB,
}: {
  a: TraitId | ''
  b: TraitId | ''
  season: number
  onA: (t: TraitId) => void
  onB: (t: TraitId) => void
}) {
  const wants = SEASON_WANTS[season] ?? SEASON_WANTS[0]!
  const child = a && b ? crossTraits(a, b) : null
  const intense = child?.length === 1
  return (
    <div className="hz-cross" data-coach-id="cultivars-bed">
      <p className="hz-wants" aria-label="Season wants">
        <span>Season wants</span>
        {wants.map((trait) => (
          <em key={trait} className="hz-want is-on">
            {trait}
          </em>
        ))}
      </p>
      <div className="hz-chips" role="group" aria-label="Parent A">
        {TRAITS.map((trait) => (
          <button
            key={`a-${trait}`}
            type="button"
            className={`hz-chip${a === trait ? ' is-on' : ''}${wants.includes(trait) ? ' is-want' : ''}`}
            aria-pressed={a === trait}
            onClick={() => onA(trait)}
          >
            A · {trait}
          </button>
        ))}
      </div>
      <div className="hz-chips" role="group" aria-label="Parent B">
        {TRAITS.map((trait) => (
          <button
            key={`b-${trait}`}
            type="button"
            className={`hz-chip${b === trait ? ' is-on' : ''}${wants.includes(trait) ? ' is-want' : ''}`}
            aria-pressed={b === trait}
            onClick={() => onB(trait)}
          >
            B · {trait}
          </button>
        ))}
      </div>
      <div className="hz-child-preview" aria-live="polite">
        {child ? (
          <>
            <strong>Child</strong>
            <span>{child.join(' + ')}</span>
            <em className={`hz-badge${intense ? ' is-on' : ''}`}>{intense ? 'Intense' : 'Mixed'}</em>
          </>
        ) : (
          <span className="hz-note">Pick both parents to preview the child.</span>
        )}
      </div>
    </div>
  )
}

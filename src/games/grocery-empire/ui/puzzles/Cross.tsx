import { SegmentedControl } from '../kit'
import { Field } from '../play'
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
      {(
        [
          ['First parent', a, onA],
          ['Second parent', b, onB],
        ] as const
      ).map(([label, value, set]) => (
        <Field key={label} label={label}>
          <SegmentedControl
            aria-label={label}
            value={value ?? ''}
            onChange={(v) => set(v as typeof TRAITS[number])}
            options={TRAITS.map((trait) => ({
              value: trait,
              label: wants.includes(trait) ? `${trait} ★` : trait,
              title: wants.includes(trait) ? 'This season wants it' : undefined,
            }))}
          />
        </Field>
      ))}
      <div className="hz-child-preview" aria-live="polite">
        {child ? (
          <>
            <strong>Child</strong>
            <span>{child.join(' + ')}</span>
            <em className={`hz-badge${intense ? ' is-on' : ''}`}>{intense ? 'Intense' : 'Mixed'}</em>
          </>
        ) : (
          <span className="hz-note">Pick a trait from each parent to see the child. ★ marks what this season wants.</span>
        )}
      </div>
    </div>
  )
}

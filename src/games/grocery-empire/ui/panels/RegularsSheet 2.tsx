import { CATEGORIES } from '../../content/categories'
import { FACING_BY_ID } from '../../content/depth/facings'
import { REGULARS } from '../../content/depth/regulars'
import { useGame } from '../GameContext'
import { Button, EmptyState, Sheet } from '../kit'

/** How well the store knows someone, in words. */
export function regularStanding(visits: number): string {
  if (visits >= 12) return 'Friend of the store'
  if (visits >= 5) return 'Regular'
  if (visits >= 2) return 'Getting to know you'
  return 'New face'
}

/**
 * Regulars: everyone who has come through the door, how often, and what they come for.
 * Reads the visit counts the sim already keeps; it changes nothing.
 */
export function RegularsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state: s, reducedMotion } = useGame()
  const seen = s.depth?.regulars?.seen ?? {}
  const met = REGULARS.filter((r) => (seen[r.id] ?? 0) > 0).sort((a, b) => (seen[b.id] ?? 0) - (seen[a.id] ?? 0))
  const unmet = REGULARS.length - met.length
  const activeId = s.depth?.regulars?.activeId
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Regulars"
      reducedMotion={reducedMotion}
      footer={<Button onClick={onClose}>Done</Button>}
    >
      {met.length === 0 ? (
        <EmptyState title="Nobody yet" body="Regulars start dropping in once the shelf is stocked. Serve one and they show up here." />
      ) : (
        <>
          <p className="rg-lede">
            {met.length} met{unmet > 0 ? `, ${unmet} still to meet` : ', the whole neighbourhood'}. Serve someone often and
            the store gets to know them.
          </p>
          <ul className="rg-list">
            {met.map((r) => {
              const visits = seen[r.id] ?? 0
              const facing = r.facingId ? FACING_BY_ID[r.facingId] : null
              return (
                <li key={r.id} className={`rg-card${activeId === r.id ? ' is-here' : ''}`}>
                  <span className="rg-card__face" aria-hidden="true">
                    {r.name.slice(0, 1)}
                  </span>
                  <span className="rg-card__main">
                    <strong>
                      {r.name}
                      {activeId === r.id ? <em> · at the door now</em> : null}
                    </strong>
                    <span>
                      Comes for {r.wants.map((c) => CATEGORIES[c]?.name ?? c).join(' and ')}
                      {facing ? `; notices ${facing.name}` : ''}.
                    </span>
                  </span>
                  <span className="rg-card__visits">
                    <b>{visits}</b>
                    <small>visit{visits === 1 ? '' : 's'}</small>
                  </span>
                  <span className="rg-card__standing">{regularStanding(visits)}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Sheet>
  )
}

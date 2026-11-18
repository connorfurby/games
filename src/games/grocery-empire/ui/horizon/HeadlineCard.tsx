import { HEADLINE_BY_ID, SEASON_NAMES, SEASON_WANTS, type HeadlineDef } from '../../content/horizon'
import { can } from '../../sim/commands'
import { useGame } from '../GameContext'
import { Btn } from '../components/Btn'
import { HorizonBust } from './HorizonBust'
import type { HorizonCastId } from '../../art/cast'

function speakerFor(id: string): HorizonCastId {
  if (id.includes('keel')) return 'maris'
  if (id.includes('ivo')) return 'ivo'
  if (id.includes('season')) return 'edda'
  if (id.includes('orchard') || id.includes('bruise')) return 'grower'
  return 'nia'
}

function helpBlurb(def: HeadlineDef, season: number): string {
  if (def.id === 'hl-season-telegraph') {
    const next = SEASON_WANTS[(season + 1) % 4]
    const name = SEASON_NAMES[(season + 1) % 4] ?? 'next'
    return next ? `${name} wants ${next[0]} and ${next[1]}.` : 'The next two traits are on the wire.'
  }
  if (/freeze keel/i.test(def.helpEffect)) return 'Keel holds still for ten minutes.'
  if (/\+1 legacy/i.test(def.helpEffect)) return 'Grants 1 Legacy if a fleet is still out.'
  if (/layer ×1\.1/i.test(def.helpEffect)) return 'That world’s sales bonus runs ×1.1 until the season turns.'
  if (/day tag ×0\.95/i.test(def.helpEffect)) return 'Night tags ×1.1 and day tags ×0.95 until the season turns.'
  const tagged = def.helpEffect.match(/([A-Za-z]+)-tagged/)
  const goods = def.helpEffect.match(/([A-Za-z]+) goods match/)
  const tag = tagged?.[1] ?? goods?.[1]
  if (tag && /×1\.1/.test(def.helpEffect)) return `${tag} matches ×1.1 until the season turns.`
  return 'Clears the wire. Nothing else moves.'
}

function costLabel(def: HeadlineDef): string {
  const cost = def.helpCost
  if (!cost) return 'Help'
  if (cost.currency === 'cash') return 'Help · 1% cash'
  return `Help · ${cost.amount} ${cost.currency}`
}

export function HeadlineCard({ reducedMotion }: { reducedMotion: boolean }) {
  const { state: s, dispatch } = useGame()
  const id = s.horizon.headlineId
  const def = id ? HEADLINE_BY_ID[id] : undefined
  if (!def) return null
  const hideHelp = def.helpCost?.currency === 'seed' && s.era < 9
  const help = can(s, { type: 'helpHeadline' })
  const left = Math.max(0, (s.horizon.headlineUntil ?? 0) - s.time)
  const span = Math.max(left, 360)
  const ignore = can(s, { type: 'ignoreHeadline' })
  return (
    // Not a modal: a headline arrives every few minutes and expires on its own, so it waits in the
    // corner instead of dimming the game. The bar shows how long it stays on the wire.
    <aside className="hz-wire" role="status" aria-labelledby="hz-headline-title">
      <div
        className="hz-headline__card"
        style={reducedMotion ? undefined : { animation: 'hz-rise 220ms ease-out' }}
      >
        {left > 0 ? (
          <span className="hz-wire__life" aria-hidden>
            <i style={{ transform: `scaleX(${Math.min(1, left / Math.max(1, span))})` }} />
          </span>
        ) : null}
        <HorizonBust id={speakerFor(def.id)} />
        <p className="hz-note">Headline</p>
        <h2 id="hz-headline-title" className="hz-wire__title">{def.text}</h2>
        <p>{helpBlurb(def, s.horizon.season)}</p>
        <div className="ge-chip-row">
          {hideHelp ? null : (
            <Btn tone="spend" disabled={!help.ok} title={help.ok ? costLabel(def) : help.reason} onClick={() => dispatch({ type: 'helpHeadline' })}>
              {costLabel(def)}
            </Btn>
          )}
          <Btn
            tone="ghost"
            disabled={!ignore.ok}
            title={def.id === 'hl-ash-flour' && s.era >= 8 ? 'Keel gains a convoy.' : ignore.ok ? 'Set the headline aside.' : ignore.reason}
            onClick={() => dispatch({ type: 'ignoreHeadline' })}
          >
            Ignore
          </Btn>
        </div>
      </div>
    </aside>
  )
}

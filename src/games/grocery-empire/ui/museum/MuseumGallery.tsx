import { RARITY_INFO, RELIC_BY_ID, type RelicDef } from '../../content/relics'
import { relicLevelPower, relicPerk } from '../../content/relicPerks'
import { STAT_INFO } from '../../content/upgrades/stats'
import type { MuseumSave } from '../../sim/museum'
import { Button } from '../kit'
import { RelicIcon } from './RelicIcon'

function pctText(n: number) {
  return `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`
}

/** "+1.2% shoppers": a relic's main perk at its level, optionally boosted by a case. */
export function mainPerk(def: RelicDef, level: number, boost = 1): string {
  const p = relicPerk(def)
  const info = STAT_INFO[p.stat]
  const word = info.kind === 'cut' ? `cheaper ${info.label}` : info.label
  return `+${pctText(p.per * relicLevelPower(level) * boost)} ${word}`
}

/**
 * The museum's room: a row of lit display cases. A relic in a case (a "socket" in the sim)
 * works harder. Empty cases say what to do; one tap fills them with the strongest relics.
 */
export function MuseumGallery({
  m,
  cap,
  boost,
  onSelect,
  onFill,
  nextCaseEra,
}: {
  m: MuseumSave
  cap: number
  /** The era that opens the next case, if any. */
  nextCaseEra?: number | null
  /** Case multiplier, e.g. 1.35. */
  boost: number
  onSelect: (id: string) => void
  /** Present only when filling would change something. */
  onFill?: () => void
}) {
  const slots = Array.from({ length: cap }, (_, i) => m.sockets[i] ?? null)
  const extra = Math.round((boost - 1) * 100)
  const owned = Object.keys(m.relics).length

  return (
    <figure className="mu-case" aria-label="Showcase">
      <figcaption className="mu-case__head">
        <span className="mu-case__title">Showcase</span>
        <span className="mu-case__rule">
          A relic in a case gives <strong>+{extra}%</strong> more. {m.sockets.length}/{cap} cases filled.
        </span>
        {onFill ? (
          <Button tone="free" size="sm" onClick={onFill} title="Puts your strongest relics in the cases">
            Fill with my best
          </Button>
        ) : null}
      </figcaption>

      <ol className="mu-case__row">
        {slots.map((id, i) => {
          const def = id ? RELIC_BY_ID[id] : null
          if (!id || !def) {
            return (
              <li key={`empty-${i}`} className="mu-case__slot is-empty">
                <span className="mu-case__glass" aria-hidden />
                <span className="mu-case__name">Empty case</span>
                <span className="mu-case__perk">
                  {owned === 0 ? 'Open a chest to find a relic.' : 'Pick a relic below and put it here.'}
                </span>
              </li>
            )
          }
          const level = m.relics[id]?.level ?? 1
          return (
            <li key={id} className={`mu-case__slot is-full mu-case__slot--${def.rarity}`}>
              <button
                type="button"
                className="mu-case__btn"
                style={{ '--rc': RARITY_INFO[def.rarity].color } as React.CSSProperties}
                onClick={() => onSelect(id)}
                title={`${def.name}: open details`}
              >
                <span className="mu-case__light" aria-hidden />
                <RelicIcon id={id} size={64} level={level} socketed />
                <span className="mu-case__name">{def.name}</span>
                <span className="mu-case__perk">
                  <s>{mainPerk(def, level)}</s> {mainPerk(def, level, boost)}
                </span>
              </button>
            </li>
          )
        })}
        {nextCaseEra != null ? (
          <li className="mu-case__slot is-locked">
            <span className="mu-case__glass" aria-hidden>
              🔒
            </span>
            <span className="mu-case__name">Another case</span>
            <span className="mu-case__perk">Opens in Era {nextCaseEra}.</span>
          </li>
        ) : null}
      </ol>
    </figure>
  )
}

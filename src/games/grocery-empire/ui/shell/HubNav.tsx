import { companyAttention } from '../../sim/corp/tick'
import { LayoutGroup, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { doctrinesAtEra } from '../../content/era2'
import { MENUS, type MenuId } from '../../content/menus'
import { can } from '../../sim/commands'
import type { GameState } from '../../sim/state'
import { Icon } from '../icons/Icon'
import { Sheet, usePhone } from '../kit'
import { HUBS, HUB_BY_ID, MENU_COACH, overflowHubs, phoneBarHubs, type HubDef, type HubId } from './hubs'

/** Empire: a doctrine (or the tournament) is affordable right now. A handful of cheap `can()` calls. */
function empireReady(s: GameState): boolean {
  if (!s.menus.strategy) return false
  if (can(s, { type: 'runTournament' }).ok) return true
  return doctrinesAtEra(s.era).some((d) => can(s, { type: 'buyDoctrine', id: d.id }).ok)
}

/** Worlds: some filing / service is ready to commit (Eras 7+). */
function worldsReady(s: GameState): boolean {
  if (s.era < 7 || !s.horizon) return false
  const h = s.horizon
  if (s.menus.exchange) {
    if (can(s, { type: 'settleStop' }).ok) return true
  }
  if (s.menus.planets) {
    if (can(s, { type: 'serveClimateNeighbor' }).ok) return true
    if (h.planets.some((p) => p.revealed && !p.stocked && can(s, { type: 'fileStandardPlanogram', planetId: p.id }).ok)) {
      return true
    }
  }
  if (s.era >= 9 && s.menus.cultivars) {
    const chore = (['water', 'cover', 'harvest', 'rest'] as const)[h.season % 4]!
    if (can(s, { type: 'doSeasonChore', chore }).ok) return true
  }
  if (s.menus.charter && can(s, { type: 'seatClause' }).ok) return true
  return false
}

/**
 * The hub rail (desktop) / bottom bar (phone). On phones Store, Supply, Team and
 * Money stay in the bar; Empire / Worlds / Museum sit behind a "Hubs" sheet.
 * Hotkeys 1-7 jump to every hub regardless of this layout.
 */
export function HubNav({
  state,
  hub,
  chests,
  suggestChannels,
  reducedMotion,
  onOpenHub,
}: {
  state: GameState
  hub: HubId | null
  /** Museum chests waiting to be opened. */
  chests: number
  suggestChannels: ReadonlySet<string>
  reducedMotion: boolean
  onOpenHub: (id: HubId) => void
}) {
  const phone = usePhone()
  const [moreOpen, setMoreOpen] = useState(false)
  // Coach tours spotlight hub buttons by id, so keep the whole rail visible during a tour.
  const collapse = phone && !state.tutorials.active

  const unlocked = (h: HubDef): MenuId[] => h.menus.filter((id) => !!state.menus[id])

  // Cheap readiness checks, once per render, only for hubs the player has open.
  const readyHubs = new Set<HubId>()
  if (HUB_BY_ID.empire.menus.some((m) => state.menus[m]) && empireReady(state)) readyHubs.add('empire')
  if (HUB_BY_ID.worlds.menus.some((m) => state.menus[m]) && worldsReady(state)) readyHubs.add('worlds')

  const companyNeeds = companyAttention(state)
  const badgeFor = (h: HubDef, hit: boolean): ReactNode => {
    if (h.id === 'company' && companyNeeds.count > 0) {
      return (
        <span className="g2-hub__badge" aria-label={companyNeeds.lines.join(', ')} title={companyNeeds.lines.join(' · ')}>
          {companyNeeds.count}
        </span>
      )
    }
    if (h.id === 'museum' && chests > 0) {
      return (
        <span className="g2-hub__badge" aria-label={`${chests} chests to open`}>
          {chests}
        </span>
      )
    }
    // The season clock lives on the Cultivars page; a minutes badge here read like an unread count.
    if (readyHubs.has(h.id)) {
      return (
        <span
          className="g2-hub__dot"
          aria-label={h.id === 'empire' ? 'A strategy is affordable' : 'A filing is ready'}
          title={h.id === 'empire' ? 'A strategy is affordable' : 'A filing is ready'}
        />
      )
    }
    return hit ? <span className="g2-hub__dot" aria-label="Suggested" /> : null
  }

  const rows = HUBS.map((h, i) => {
    const ms = unlocked(h)
    return { h, i, ms, hit: ms.some((m) => suggestChannels.has(m)) }
  }).filter((r) => r.ms.length > 0)

  const unlockedIds = rows.map((r) => r.h.id)
  const barIds = collapse ? phoneBarHubs(unlockedIds) : unlockedIds
  const overflowIds = collapse ? new Set(overflowHubs(unlockedIds)) : new Set<HubId>()
  const barSet = new Set(barIds)
  const primary = collapse ? rows.filter((r) => barSet.has(r.h.id)) : rows
  const overflow = collapse ? rows.filter((r) => overflowIds.has(r.h.id) || !barSet.has(r.h.id)) : []
  const overflowActive = overflow.some((r) => r.h.id === hub)
  const overflowHit = overflow.some(
    (r) => r.hit || (r.h.id === 'museum' && chests > 0) || readyHubs.has(r.h.id),
  )

  return (
    <nav className="g2-hubs" aria-label="Departments">
      <LayoutGroup>
        {primary.map(({ h, i, ms, hit }) => {
          const active = hub === h.id
          return (
            <button
              key={h.id}
              type="button"
              className={`g2-hub${active ? ' is-active' : ''}${hit ? ' is-suggest' : ''}`}
              onClick={() => onOpenHub(h.id)}
              title={`${h.purpose} (${i + 1})`}
              aria-current={active ? 'page' : undefined}
              data-coach-id={ms.map((m) => MENU_COACH[m]).find(Boolean)}
            >
              {active ? (
                <motion.span
                  className="g2-hub__indicator"
                  layoutId="g2-hub-indicator"
                  transition={
                    reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 36, mass: 0.7 }
                  }
                />
              ) : null}
              <Icon name={h.icon} size={20} />
              <span className="g2-hub__name">{h.name}</span>
              {badgeFor(h, hit)}
            </button>
          )
        })}
        {overflow.length > 0 ? (
          <button
            type="button"
            className={`g2-hub g2-hub--more${overflowActive ? ' is-active' : ''}${overflowHit ? ' is-suggest' : ''}`}
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            title={overflow.map((r) => `${r.h.name} (${r.i + 1})`).join(' · ')}
          >
            {overflowActive ? <span className="g2-hub__indicator g2-hub__indicator--static" /> : null}
            <Icon name="more" size={20} />
            <span className="g2-hub__name">Hubs</span>
            {overflowHit ? <span className="g2-hub__dot" aria-label="Something needs you" /> : null}
          </button>
        ) : null}
      </LayoutGroup>

      <Sheet open={collapse && moreOpen} onClose={() => setMoreOpen(false)} title="Hubs" reducedMotion={reducedMotion}>
        <ul className="g2-more">
          {overflow.map(({ h, i, ms, hit }) => (
            <li key={h.id}>
              <button
                type="button"
                className={`g2-more__item${hub === h.id ? ' is-active' : ''}`}
                data-hub={h.id}
                onClick={() => {
                  setMoreOpen(false)
                  onOpenHub(h.id)
                }}
              >
                <Icon name={h.icon} size={22} />
                <span className="g2-more__copy">
                  <strong>
                    {HUB_BY_ID[h.id].name} <kbd>{i + 1}</kbd>
                  </strong>
                  <span>{h.purpose}</span>
                  <span className="g2-more__menus">
                    {ms.map((m) => (
                      <span key={m} className="g2-more__menu" title={MENUS[m].purpose}>
                        <b>{MENUS[m].name}</b> — {MENUS[m].purpose}
                      </span>
                    ))}
                  </span>
                </span>
                {badgeFor(h, hit)}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </nav>
  )
}

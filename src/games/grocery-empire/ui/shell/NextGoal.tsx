import { requestRoadAhead } from './uiBus'
import { goalNeeds, nextGoal, type GoalChoice } from '../../content/goals'
import { DEPTH } from '../../sim/balance'
import { useSticky } from '../useStable'
import { can } from '../../sim/commands'
import type { GameState } from '../../sim/state'
import type { Command } from '../../sim/commands'
import type { NumberFormat } from '@/shared/bn'
import { celebrate } from '../fx'
import { money, qty } from '../format'
import { MENUS, type MenuId } from '../../content/menus'
import { goalDest } from './goalTarget'
import { requestInbox } from './uiBus'

/** Seconds until `need` cash at the current net rate, or null if not earning. */
function etaSec(s: GameState, need: number): number | null {
  const net = s.rates.revenuePerSec - s.rates.costPerSec
  if (need <= s.cash) return 0
  if (net <= 0.001) return null
  return (need - s.cash) / net
}

function eta(sec: number | null): string | null {
  if (sec == null) return null
  if (sec <= 0) return 'ready'
  if (sec < 60) return `about ${Math.ceil(sec)}s`
  if (sec < 3600) return `about ${Math.ceil(sec / 60)} min`
  return `about ${(sec / 3600).toFixed(1)} h`
}

/** Short line for the command Next Goal would fire — not the whole door checklist. */
function clauseHint(act: Command | null, fallback: string): string {
  if (!act) return fallback
  switch (act.type) {
    case 'unpack':
      return 'Press Unpack on the Floor.'
    case 'setFacing':
      return 'Store → Floor → Regulars.'
    case 'buyWholesale':
      return 'Store → Floor → Restock, on a low price.'
    case 'serveRegular':
      return 'A regular is waiting: serve them.'
    case 'dockCheckIn':
      return 'Supply → Suppliers → Dock check-in.'
    case 'hire':
      return 'Team → Staff → Hire.'
    case 'assignShift':
      return 'Team → Staff → Shifts & hours.'
    case 'buyMemo':
      return fallback.includes(',') ? `Buy the next memo in Memos.` : fallback
    case 'buyBuild':
      return 'Store → Build.'
    case 'openStore':
      return 'Empire → Land.'
    case 'buyPlant':
      return 'Supply → Cold.'
    case 'signCoolerLog':
      return 'Sign the cooler log.'
    case 'setManifest':
    case 'setManifestStance':
      return 'Supply → Logistics → Dispatch.'
    case 'openLane':
      return 'Supply → Logistics.'
    case 'dispatchHauler':
      return 'Empire → Fleet.'
    case 'launchBarge':
      return 'Launch the next barge.'
    case 'printFlyerWeek':
      return 'Team → Marketing → Weekly flyer.'
    case 'fileFlagshipPlanogram':
    case 'fileStandardPlanogram':
      return 'Store → Floor → Regulars.'
    case 'toggleClause':
      return 'Keep the next charter clause.'
    case 'setCharter':
      return 'Choose which charter to sign.'
    case 'answerHearing':
      return 'Answer the hearing on the clause you kept.'
    case 'fileStandardPhrase':
      return 'Send a phrase so an agent can take it on.'
    case 'setAgentHabit':
      return 'Give an agent that phrase’s habit.'
    case 'seatClause':
      return 'Keep this clause once the seal dries.'
    case 'rehearseAccept':
      return 'Practise the list. A miss crosses out a line.'
    case 'fileStandardList':
      return 'Fill the list.'
    default:
      return fallback.includes(',') ? fallback.split(',')[0]!.trim() + '.' : fallback
  }
}

/**
 * Campaign spine: one goal, one meter, one CTA.
 * Free verbs use tomato chrome (no shelf-tag punch hole). Paid uses the yellow tag.
 */
export function NextGoal({
  state: s,
  numberFormat,
  dispatch,
  activeMenu,
  onMenu,
}: {
  state: GameState
  numberFormat: NumberFormat
  dispatch: (cmd: Command) => void
  activeMenu?: MenuId
  onMenu?: (id: MenuId) => void
}) {
  const g = nextGoal(s)
  const act0 = g?.action?.(s) ?? null
  const readyCalm = useSticky(!!act0 && can(s, act0).ok, 2500)
  if (!g) {
    // After the story: endless worlds get a running milestone so there is always a next thing.
    const h = s.horizon
    const worlds = h?.endless ? (h.endlessPlanets ?? 0) : 0
    const steps = [5, 10, 25, 50, 100, 250, 500, 1000]
    const target = steps.find((n) => n > worlds) ?? Math.ceil((worlds + 1) / 1000) * 1000
    const prev = [...steps].reverse().find((n) => n <= worlds) ?? 0
    const frac = target > prev ? (worlds - prev) / (target - prev) : 0
    return (
      <div className="g2-goal is-done" role="group" aria-label="After the story">
        <div className="g2-goal__copy">
          <span className="g2-goal__eyebrow">{h?.endless ? 'Endless worlds' : 'The story is told'}</span>
          <span className="g2-goal__title">
            <span className="g2-goal__title-text">
              {h?.endless ? `Reach ${target} endless worlds` : 'Every era is behind you'}
            </span>
          </span>
          <span className="g2-goal__hint">
            {h?.endless
              ? `${worlds} past the named eight so far. Keep launching probes and stocking shelves.`
              : 'The store keeps running. Chase awards, fill the museum, or start a new game.'}
          </span>
        </div>
        {h?.endless ? (
          <>
            <div className="g2-goal__meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(frac * 100)} aria-label="Endless worlds progress">
              <span style={{ transform: `scaleX(${frac})` }} />
            </div>
            {onMenu ? (
              <div className="g2-goal__acts">
                <button type="button" className="g2-goal__do g2-goal__do--free" onClick={() => onMenu('planets' as MenuId)}>
                  Show me
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    )
  }
  let progress = 0
  try {
    progress = Math.max(0, Math.min(1, g.progress(s)))
  } catch {
    progress = 0
  }
  const needs = goalNeeds(s, g)
  const act = act0
  const ready = readyCalm
  const t = needs.cash > 0 && !ready ? eta(etaSec(s, needs.cash)) : null
  const also: string[] = []
  if (needs.attention > 0) also.push(`${qty(needs.attention, numberFormat)} Attention`)
  if (needs.ideas > 0) also.push(`${qty(needs.ideas, numberFormat)} Ideas`)
  const dest = goalDest(act)
  const showGo = !!dest && !!onMenu && (dest === 'memos' || dest !== activeMenu) && (dest === 'memos' || !!s.menus[dest])
  const go = (el?: HTMLElement | null) => {
    if (el) celebrate('small', el)
    if (dest === 'memos') requestInbox('memos')
    else if (dest && onMenu) onMenu(dest)
  }
  const whereTitle = dest === 'memos' ? 'opens Memos' : dest ? `opens ${MENUS[dest].name}` : ''
  const isFree = needs.cash <= 0 && also.length === 0
  const price = needs.cash > 0 ? money(needs.cash, numberFormat) : also.length ? also[0]! : 'Free'
  let choices: GoalChoice[] | null = null
  let counts = ''
  try {
    choices = g.choices?.(s) ?? null
    counts = g.counts?.(s) ?? ''
  } catch {
    /* never break the HUD */
  }
  const hint = choices ? g.hint : clauseHint(act, g.hint)

  const stars = s.depth?.stars ?? DEPTH.starsStart
  const starsLocked =
    s.era >= 6 &&
    (s.depth?.rationWeekUntil ?? 0) > 0 &&
    s.time < (s.depth?.rationWeekUntil ?? 0)
  const starsTitle = starsLocked
    ? `Star Board ${stars.toFixed(1)}★ · frozen during ration week`
    : `Star Board ${stars.toFixed(1)}★ — soft-caps demand and franchise loyalty`
  const pct = Math.round(progress * 100)

  return (
    <div className={`g2-goal${ready ? ' is-ready' : ''}`} role="group" aria-label={`Next goal: ${g.title}`}>
      <div className="g2-goal__copy">
        <button type="button" className="g2-goal__eyebrow g2-goal__road" onClick={requestRoadAhead} title="See every step to the next era">
          Next goal · road ahead ›
        </button>
        <span className="g2-goal__title" title={starsTitle}>
          <span className="g2-goal__title-text">{g.title}</span>
        </span>
        <span className="g2-goal__hint" title={typeof hint === 'string' ? hint : undefined}>
          {hint}
          {also.length > (isFree ? 0 : 1) ? (
            <span className="g2-goal__eta"> Also needs {also.slice(isFree ? 0 : 1).join(' and ')}.</span>
          ) : null}
          {t ? <span className="g2-goal__eta"> Ready in {t}.</span> : null}
        </span>
        {counts ? <span className="g2-goal__counts">{counts}</span> : null}
      </div>
      <div
        className="g2-goal__meter"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${g.title} progress · ${starsTitle}`}
      >
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      {choices ? (
        <div className="g2-goal__forks" role="group" aria-label={`${g.title} choices`}>
          {choices.map((c) => {
            const check = can(s, c.action)
            return (
              <button
                key={c.id}
                type="button"
                className="g2-goal__fork"
                disabled={!check.ok}
                onClick={() => dispatch(c.action)}
                title={check.ok ? `${c.label}: ${c.line}` : (check.reason ?? 'Not yet')}
              >
                <strong>{c.label}</strong>
                <span>{c.line}</span>
              </button>
            )
          })}
        </div>
      ) : act ? (
        <div className="g2-goal__acts">
          {isFree ? (
            <button
              type="button"
              className="g2-goal__do g2-goal__do--free"
              disabled={!ready && !showGo}
              onClick={(e) => (ready ? dispatch(act) : go(e.currentTarget))}
              title={ready ? 'Do it now' : showGo ? `${can(s, act).reason ?? 'Not yet'} · ${whereTitle}` : (can(s, act).reason ?? 'Not yet')}
            >
              {ready ? 'Do it' : showGo ? 'Show me' : 'Do it'}
            </button>
          ) : (
            <button
              type="button"
              className={`g2-tag${!ready && showGo ? ' is-saving' : ''}`}
              disabled={!ready && !showGo}
              onClick={(e) => (ready ? dispatch(act) : go(e.currentTarget))}
              title={ready ? 'Do it now' : showGo ? `${can(s, act).reason ?? 'Not yet'} · ${whereTitle}` : (can(s, act).reason ?? 'Not yet')}
            >
              <span className="g2-tag__price">{price}</span>
              <span className="g2-tag__label">{ready ? 'Do it' : showGo ? 'Show me' : 'Saving'}</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

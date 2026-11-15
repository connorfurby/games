import { goalNeeds, nextGoal } from '../../content/goals'
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
      return 'Unpack a crate onto the shelf.'
    case 'setFacing':
      return 'Feature a can facing on the Floor.'
    case 'buyWholesale':
      return 'Order on a wholesale dip.'
    case 'serveRegular':
      return 'Serve the layaway before patience runs out.'
    case 'dockCheckIn':
      return 'Stamp the dock with a receiver on shift.'
    case 'hire':
      return 'Hire staff for the Open shift.'
    case 'assignShift':
      return 'Put someone on the Open shift.'
    case 'buyMemo':
      return fallback.includes(',') ? `File the next memo on the desk.` : fallback
    case 'buyBuild':
      return 'Buy the next build on the site.'
    case 'openStore':
      return 'Open the next door on Land.'
    case 'buyPlant':
      return 'Build the next cold plant.'
    case 'signCoolerLog':
      return 'Sign the cooler log.'
    case 'setManifest':
      return 'Lock a matching manifest.'
    case 'openLane':
      return 'Open a logistics lane.'
    case 'dispatchHauler':
      return 'Send a Hauler on a Pocket Ops trip.'
    case 'launchBarge':
      return 'Launch the next barge.'
    case 'printFlyerWeek':
      return 'Print a flyer week.'
    case 'fileFlagshipPlanogram':
    case 'fileStandardPlanogram':
      return 'File the flagship planogram.'
    case 'toggleClause':
      return 'Keep the next charter clause.'
    case 'setCharter':
      return 'Sign the charter fork.'
    case 'answerHearing':
      return 'Answer the hearing docket.'
    default:
      return fallback.includes(',') ? fallback.split(',')[0]!.trim() + '.' : fallback
  }
}

/**
 * The campaign spine as one shelf tag: what to do next, how far along you are,
 * and a button that does it when it's affordable.
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
  /** Current menu, so "Go" hides when you're already where the goal lives. */
  activeMenu?: MenuId
  /** Jump to a menu (the shell checks it's unlocked). */
  onMenu?: (id: MenuId) => void
}) {
  const g = nextGoal(s)
  const act0 = g?.action?.(s) ?? null
  // "Do it" lights at once, but only falls back to "Saving" after a couple of quiet seconds.
  const readyCalm = useSticky(!!act0 && can(s, act0).ok, 2500)
  if (!g) {
    return (
      <div className="g2-goal is-done" role="status">
        <span className="g2-goal__title">Every era is behind you.</span>
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
  const price = needs.cash > 0 ? money(needs.cash, numberFormat) : also.length ? also.shift()! : 'Free'
  const hint = clauseHint(act, g.hint)

  const stars = s.depth?.stars ?? DEPTH.starsStart
  const starsLocked =
    s.era >= 6 &&
    (s.depth?.rationWeekUntil ?? 0) > 0 &&
    s.time < (s.depth?.rationWeekUntil ?? 0)
  const pct = Math.round(progress * 100)
  return (
    <div className={`g2-goal${ready ? ' is-ready' : ''}`} role="group" aria-label={`Next goal: ${g.title}`}>
      <div className="g2-goal__copy">
        <span className="g2-goal__title">
          {g.title}
          <span
            className="g2-goal__stars"
            title={
              starsLocked
                ? 'Star Board frozen during ration week'
                : 'Star Board — soft-caps demand and franchise loyalty'
            }
          >
            {stars.toFixed(1)}★{starsLocked ? ' lock' : ''}
          </span>
        </span>
        <span className="g2-goal__hint">
          {hint}
          {also.length ? <span className="g2-goal__eta"> Also needs {also.join(' and ')}.</span> : null}
          {t ? <span className="g2-goal__eta"> Ready in {t}.</span> : null}
        </span>
      </div>
      <div
        className="g2-goal__meter"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${g.title} progress`}
      >
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      {act ? (
        <div className="g2-goal__acts">
          {showGo ? (
            <button
              type="button"
              className="g2-goal__go"
              onClick={(e) => go(e.currentTarget)}
              title={dest === 'memos' ? 'Open Memos' : `Go to ${MENUS[dest].name}`}
            >
              Go
            </button>
          ) : null}
          <button
            type="button"
            className="g2-tag"
            disabled={!ready}
            onClick={() => dispatch(act)}
            title={ready ? 'Do it now' : (act ? can(s, act).reason : undefined) ?? 'Not yet'}
          >
            <span className="g2-tag__price">{price}</span>
            <span className="g2-tag__label">{ready ? 'Do it' : 'Saving'}</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}

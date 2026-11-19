import { nextGoal } from '../../content/goals'
import { CHAPTER_BY_ERA } from '../../content/story'
import { DEPTH } from '../../sim/balance'
import { can } from '../../sim/commands'
import type { GameState } from '../../sim/state'
import { useGame } from '../GameContext'
import type { HubId } from './hubs'
import { suggestAside } from './suggest'

function jumpMenu(id: string): HubId {
  if (/antenna|heat|exam|manifest|haul|quiet|crystal/.test(id)) return 'plant'
  if (/hire|dawn|promo|format/.test(id)) return 'crew'
  if (/invoice|ear|guest|settle|tourney/.test(id)) return 'books'
  if (/tower|ring|net|dial|credit|phrase|charter|accept|list|rehearse|skip|region|bird/.test(id))
    return 'network'
  return 'air'
}

/** Lightweight progress for the shelf-tag meter — never throws. */
function goalProgress(s: GameState, id: string): number {
  try {
    switch (id) {
      case 'first-tune':
        return s.air.tuned ? 1 : 0
      case 'first-hold':
        return Math.min(1, s.air.logFill || (s.air.lastHoldAt > 0 ? 1 : 0))
      case 'first-logs':
        return Math.min(1, s.depth.cleanLogsLifetime / 3)
      case 'first-crystal':
        return (s.upgrades['crystal-gain'] ?? 0) >= 1 ? 1 : Math.min(1, s.cash / 8)
      case 'first-antenna':
        return s.antenna >= 1 ? 1 : Math.min(1, s.cash / 25)
      case 'log-pile':
        return Math.min(1, s.depth.cleanLogsLifetime / 40)
      case 'neighborhood':
        return Math.min(1, s.depth.cleanLogsLifetime / DEPTH.era0CleanLogs)
      case 'callers':
        return Math.min(1, s.depth.callersServed / 10)
      case 'check-ins':
        return Math.min(1, s.depth.checkIns / 20)
      case 'staff-dawn':
        return s.depth.shifts.dawn ? 1 : 0
      case 'raise-tower':
      case 'second-tower':
        return Math.min(1, s.towers.length / 2)
      case 'heat-logs':
        return Math.min(1, s.depth.heatLogs / 5)
      case 'quiet-stamps':
        return Math.min(1, s.depth.quietStamps / DEPTH.quietStampNeed)
      default: {
        if (s.air.logFill > 0.05) return Math.min(0.85, s.air.logFill)
        return 0.12
      }
    }
  } catch {
    return 0
  }
}

function openForCmd(cmdType: string): HubId | null {
  if (cmdType === 'buyTower' || cmdType === 'buySkip' || cmdType === 'buyRegion' || cmdType === 'buyBird')
    return 'network'
  if (cmdType === 'buyAntenna' || cmdType === 'buyUpgrade' || cmdType === 'signHeatLog') return 'plant'
  if (cmdType === 'hire' || cmdType === 'assignShift' || cmdType === 'printPromo') return 'crew'
  if (cmdType === 'payInvoice' || cmdType === 'runTournament') return 'books'
  return null
}

export function NextGoal() {
  const { state, dispatch, setActiveMenu, activeMenu } = useGame()
  const g = nextGoal(state)

  if (!g) {
    return (
      <div className="sd-goal is-done" role="status">
        <span className="sd-goal__title">All quiet on the dial.</span>
      </div>
    )
  }

  const dest = jumpMenu(g.id)
  const cmd = g.action?.(state) ?? null
  const ready = !!cmd && can(state, cmd).ok
  const showGo = dest !== activeMenu
  const progress = goalProgress(state, g.id)
  const aside = suggestAside(state, g)
  const line = aside ?? g.hint ?? CHAPTER_BY_ERA[state.era]?.mission
  const isFree =
    !cmd ||
    cmd.type === 'tune' ||
    cmd.type === 'hold' ||
    cmd.type === 'log' ||
    cmd.type === 'air' ||
    cmd.type === 'setHolding'

  return (
    <div
      className={`sd-goal${ready ? ' is-ready' : ''}`}
      data-coach-id="next-goal"
      role="group"
      aria-label={`Next goal: ${g.title}`}
    >
      <div className="sd-goal__copy">
        <span className="sd-goal__kicker">Next</span>
        <span className="sd-goal__title">
          <span className="sd-goal__title-text">{g.title}</span>
        </span>
        {line ? <span className="sd-goal__hint">{line}</span> : null}
      </div>
      <div
        className="sd-goal__meter"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      <div className="sd-goal__acts">
        {showGo ? (
          <button type="button" className="sd-goal__go" onClick={() => setActiveMenu(dest)}>
            Go
          </button>
        ) : null}
        {cmd ? (
          <button
            type="button"
            className={`sd-goal__do${isFree ? ' sd-goal__do--free' : ''}`}
            data-coach-id="next-goal-act"
            disabled={!ready && !showGo}
            onClick={() => {
              if (ready) {
                const jump = openForCmd(cmd.type)
                if (jump) setActiveMenu(jump)
                if (cmd.type === 'hold' || cmd.type === 'setHolding') {
                  setActiveMenu('air')
                  dispatch({ type: 'hold' })
                  return
                }
                dispatch(cmd)
              } else if (showGo) {
                setActiveMenu(dest)
              }
            }}
          >
            {ready ? (cmd.type === 'hold' || cmd.type === 'setHolding' ? 'Hold' : 'Do it') : showGo ? 'Show me' : 'Do it'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { DEPTH, DIAL } from '../../sim/balance'
import { can, type Command } from '../../sim/commands'
import { affordableQty, towerBundleCost } from '../../sim/formulas'
import type { GameState, TowerPolicy } from '../../sim/state'
import { Button } from '../kit/Button'
import { Sheet } from '../kit/Sheet'
import { StatusChip } from '../kit/StatusChip'
import { Stepper } from '../kit/Stepper'
import { PlayFrame } from '../play/PlayFrame'
import type { VerbSecondary } from '../play/VerbTray'
import { money, qty } from '../format'
import { useGame } from '../GameContext'
import { DepartmentPlate } from '../scenes/DepartmentPlate'
import { BOARDS, BoardBody, type BoardId } from './DialBoards'
import { ActionRow, clock } from './panelBits'

const CX = 160
const CY = 100
const RINGS = { block: 32, county: 64, horizon: 94 } as const

type RingId = keyof typeof RINGS

function ringNodes(ring: RingId, count: number, cap: number, offset = 0) {
  const shown = Math.min(count, cap)
  return Array.from({ length: shown }, (_, i) => {
    const a = (i / Math.max(shown, 1)) * Math.PI * 2 - Math.PI / 2 + offset
    return { x: CX + Math.cos(a) * RINGS[ring], y: CY + Math.sin(a) * RINGS[ring] }
  })
}

/** Block → county → horizon, lit as the Net grows. */
function MapRings({ s }: { s: GameState }) {
  const blockOpen = s.era >= 2
  const countyOpen = s.era >= 3
  const horizonOpen = s.era >= 5
  const block = ringNodes('block', s.towers.length, 10)
  const county = ringNodes('county', s.regions + s.skips, 14, 0.3)
  const horizon = ringNodes('horizon', s.birds + s.subcarriers, 16, 0.15)
  return (
    <div className="sd-rings">
      <svg viewBox="0 0 320 200" role="img" aria-label="Network rings: block, county, horizon">
        <circle className={`sd-rings__ring${horizonOpen ? ' is-open' : ''}`} cx={CX} cy={CY} r={RINGS.horizon} />
        <circle className={`sd-rings__ring${countyOpen ? ' is-open' : ''}`} cx={CX} cy={CY} r={RINGS.county} />
        <circle className={`sd-rings__ring${blockOpen ? ' is-open' : ''}`} cx={CX} cy={CY} r={RINGS.block} />
        <circle className="sd-rings__shack" cx={CX} cy={CY} r={6} />
        {block.map((p, i) => (
          <circle key={`b${i}`} className="sd-rings__node" cx={p.x} cy={p.y} r={4.5} />
        ))}
        {county.map((p, i) => (
          <circle key={`c${i}`} className="sd-rings__node sd-rings__node--county" cx={p.x} cy={p.y} r={4} />
        ))}
        {horizon.map((p, i) => (
          <circle key={`h${i}`} className="sd-rings__node sd-rings__node--horizon" cx={p.x} cy={p.y} r={3.5} />
        ))}
        <text className="sd-rings__label" x={CX} y={CY - RINGS.block - 4} textAnchor="middle">
          block
        </text>
        <text className="sd-rings__label" x={CX} y={CY - RINGS.county - 4} textAnchor="middle">
          county
        </text>
        <text className="sd-rings__label" x={CX} y={CY - RINGS.horizon - 4} textAnchor="middle">
          horizon
        </text>
      </svg>
      <div className="sd-rings__chips">
        <StatusChip tone={blockOpen ? 'accent' : 'default'}>Towers {s.towers.length}</StatusChip>
        {countyOpen ? <StatusChip>Skip/Region {s.skips + s.regions}</StatusChip> : null}
        {horizonOpen ? <StatusChip>Birds {s.birds}</StatusChip> : null}
        <StatusChip>Net ×{qty(s.rates.netMul, 2)}</StatusChip>
      </div>
    </div>
  )
}

function boardFact(s: GameState, id: BoardId): string {
  switch (id) {
    case 'reel':
      return `${s.dial.credited.reel ?? 0} credited · ears ${s.depth.guestEars}`
    case 'route':
      return `${s.dial.credited.route ?? 0} credited · settles ${s.depth.settles}`
    case 'season':
      return `${s.dial.credited.season ?? 0} credited · chores ${s.depth.yieldHauls}`
    case 'phrase':
      return `${s.dial.credited.phrase ?? 0} credited · watches ${s.depth.habitWatches}`
    case 'charter':
      return s.depth.charterFork ? `Signed ${s.depth.charterFork}` : `seats ${s.depth.clauseSeats}`
    case 'last':
      return s.dial.accepted ? 'Accepted' : `mean ${qty(s.dial.listMean, 2)}`
  }
}

/** One status chip per board so the list shows what each desk wants before you open it. */
function boardChip(s: GameState, id: BoardId): { tone: 'default' | 'accent' | 'warn'; text: string } {
  const desk = Math.max(0, Math.ceil(s.dial.deskReadyAt - s.time))
  switch (id) {
    case 'reel':
    case 'route':
    case 'season':
    case 'phrase': {
      const practicing = (s.dial.practice[id] ?? 0) < DIAL.practicePerLayer
      if (desk > 0) return { tone: 'warn', text: `Desk ${clock(desk)}` }
      return practicing ? { tone: 'default', text: 'Practice' } : { tone: 'accent', text: 'File ready' }
    }
    case 'charter':
      return s.depth.charterFork
        ? { tone: 'accent', text: 'Signed' }
        : { tone: 'default', text: `${s.depth.seatedClauses.length}/${DEPTH.clauseSeatNeed} seated` }
    case 'last':
      if (s.dial.accepted) return { tone: 'accent', text: 'Accepted' }
      if (s.dial.rejected) return { tone: 'warn', text: `Refused ${s.dial.rejected}×` }
      return { tone: 'default', text: `${s.dial.listLines.filter(Boolean).length}/${s.dial.listLines.length} lines` }
  }
}

function MapView() {
  const { state: s, dispatch } = useGame()
  const [count, setCount] = useState(1)
  const cap = affordableQty(
    s.cash,
    (i) => towerBundleCost({ ...s, towers: Array.from({ length: s.towers.length + i }) as GameState['towers'] }, 1),
    DEPTH.buyQtyMax,
  )
  const towerQty = cap > 0 ? Math.min(count, cap) : 1
  const towerCmd: Command = { type: 'buyTower', qty: towerQty }
  const towerGate = can(s, towerCmd)
  const cost = towerBundleCost(s, towerQty)

  const buyable: { key: string; label: string; cmd: Command; fact: string; era: number }[] = [
    { key: 'skip', label: 'Skip', cmd: { type: 'buySkip' }, fact: `${s.skips} owned`, era: 3 },
    { key: 'region', label: 'Region', cmd: { type: 'buyRegion' }, fact: `${s.regions} owned`, era: 4 },
    { key: 'bird', label: 'Bird', cmd: { type: 'buyBird' }, fact: `${s.birds} owned`, era: 5 },
    { key: 'sub', label: 'Subcarrier', cmd: { type: 'buySubcarrier' }, fact: `${s.subcarriers} owned`, era: 7 },
  ]
  const secondaries: VerbSecondary[] = buyable
    .filter((b) => s.era >= b.era)
    .map((b) => {
      const gate = can(s, b.cmd)
      return {
        key: b.key,
        label: b.label,
        fact: b.fact,
        disabled: !gate.ok,
        title: gate.ok ? undefined : gate.reason,
        onClick: () => dispatch(b.cmd),
      }
    })

  return (
    <PlayFrame
      helpMenu="network"
      purpose="Relays copy your flagship carrier at margin — block, then county, then horizon."
      room={
        <DepartmentPlate plate="net" dim={0.45}>
          <MapRings s={s} />
          {s.era >= 2 ? (
            <div className="sd-qty">
              <Stepper
                label="Towers to raise"
                value={Math.min(count, Math.max(cap, 1))}
                min={1}
                max={Math.max(1, cap)}
                onChange={setCount}
              />
            </div>
          ) : null}
        </DepartmentPlate>
      }
      tray={{
        primary: {
          label: towerQty > 1 ? `Raise ${towerQty} towers` : 'Raise tower',
          tone: 'primary',
          cost: money(cost),
          disabled: !towerGate.ok,
          onClick: () => dispatch(towerCmd),
        },
        failReason: !towerGate.ok ? towerGate.reason : null,
        secondaries,
        hint:
          s.era < 2
            ? 'License the Net from the campaign spine first.'
            : s.towers.length === 0
              ? 'First tower lights the block ring.'
              : `Net ×${qty(s.rates.netMul, 2)}`,
      }}
    >
      {s.towers.length >= 4 && !s.hasDepot ? (
        <ActionRow
          cmd={{ type: 'buyDepot' }}
          label="Build a depot"
          fact="Lifts the no-depot relay penalty"
          action="Build"
          tone="primary"
        />
      ) : null}

      <h3 className="sd-section-title">Relays</h3>
      {s.towers.length > 0 ? (
        <p className="purpose">Match pays when the trait is hot. Push is louder and dirtier. Quiet is cleaner and thinner.</p>
      ) : null}
      {s.towers.length === 0 ? (
        <p className="sd-act__fact">No towers yet.</p>
      ) : (
        <ul className="sd-list sd-list--relays">
          {s.towers.map((t) => (
            <li key={t.id}>
              <span>
                {t.id}
                <span className="sd-act__fact"> · {t.trait}</span>
              </span>
              <span className="sd-tower-policies">
                {(['match', 'push', 'quiet'] as TowerPolicy[]).map((policy) => (
                  <Button
                    key={policy}
                    size="sm"
                    tone={t.policy === policy ? 'primary' : 'ghost'}
                    onClick={() =>
                      dispatch({
                        type: 'setTowerPolicy',
                        id: t.id,
                        policy: t.policy === policy ? null : policy,
                      })
                    }
                  >
                    {policy}
                  </Button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PlayFrame>
  )
}

function DialView() {
  const { state: s } = useGame()
  const [board, setBoard] = useState<BoardId | null>(null)
  const active = BOARDS.find((b) => b.id === board)

  if (s.era < 7) {
    return (
      <PlayFrame helpMenu="network" purpose="Dial boards open in Subcarrier (Era 7+).">
        <p className="purpose">Keep growing the Net. The Dial desks arrive after the Quiet.</p>
      </PlayFrame>
    )
  }

  return (
    <>
      <PlayFrame helpMenu="network" purpose="Boards that credit the format — practice, file, seal.">
        <p className="sd-act__fact">
          Tape {qty(s.dial.tape, 1)} · Packet {qty(s.dial.packet, 1)} · Season {qty(s.dial.season, 1)} · Phrase{' '}
          {qty(s.dial.phrase, 1)} · Seal {qty(s.dial.seal, 1)}
        </p>
        <div className="sd-stack">
          {BOARDS.map((b) => {
            const open = s.era >= b.era
            const chip = boardChip(s, b.id)
            return (
              <div key={b.id} className={`sd-act sd-act--row${open ? '' : ' is-locked'}`}>
                <div className="sd-act__text">
                  <strong>{b.title}</strong>
                  <span className="sd-act__fact">{b.blurb}</span>
                  <span className="sd-act__fact">{open ? boardFact(s, b.id) : `Opens in era ${b.era}`}</span>
                </div>
                {open ? <StatusChip tone={chip.tone}>{chip.text}</StatusChip> : <StatusChip>Era {b.era}</StatusChip>}
                <Button tone="secondary" size="sm" disabled={!open} onClick={() => setBoard(b.id)}>
                  Open
                </Button>
              </div>
            )
          })}
        </div>
      </PlayFrame>

      <Sheet open={!!active} title={active?.title ?? 'Dial'} onClose={() => setBoard(null)}>
        {active ? (
          <div className="sd-board">
            <p className="purpose">{active.blurb}</p>
            <BoardBody id={active.id} />
          </div>
        ) : null}
      </Sheet>
    </>
  )
}

export function NetworkPanel() {
  const { activeSub } = useGame()
  if (activeSub === 'dial') return <DialView />
  return <MapView />
}

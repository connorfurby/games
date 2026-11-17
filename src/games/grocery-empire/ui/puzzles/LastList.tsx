import { CLAUSE_BY_ID, SKU_BY_ID, type LastLine, type LastLineKind } from '../../content/horizon'
import type { GameState } from '../../sim/state'
import { can } from '../../sim/commands'
import { planetDef } from '../../sim/systems/horizon'
import { Btn } from '../components/Btn'
import { gateTitle } from './PuzzleFrame'
import { pct } from '../format'

const KIND: Record<LastLineKind, string> = {
  shelf: 'Shelf',
  route: 'Route',
  crop: 'Crop',
  phrase: 'Phrase',
  clause: 'Clause',
}

function titleCase(word: string): string {
  if (!word) return '—'
  return word.charAt(0).toUpperCase() + word.slice(1)
}

export function wantLabel(kind: LastLineKind, want: string): string {
  if (kind === 'shelf') {
    const [planet, score] = want.split('@')
    return `${planetDef(planet ?? '')?.name ?? titleCase(planet ?? '')} at ${score || '0.8'}`
  }
  if (kind === 'route') {
    const [good, dest] = want.split('@')
    return `${SKU_BY_ID[good ?? '']?.name ?? titleCase(good ?? '')} to ${planetDef(dest ?? '')?.name ?? titleCase(dest ?? '')}`
  }
  if (kind === 'clause') return want ? (CLAUSE_BY_ID[want]?.name ?? want) : 'Score only'
  if (kind === 'phrase' || kind === 'crop') return titleCase(want)
  return want || '—'
}

function fillValue(s: GameState, line: LastLine): string {
  if (line.kind === 'shelf') {
    const planetId = line.want.split('@')[0] ?? ''
    const planet = s.horizon.planets.find((p) => p.id === planetId)
    return planet?.stocked ? 'stocked' : ''
  }
  if (line.kind === 'route') {
    const [good, dest] = line.want.split('@')
    const hit = s.horizon.circuits.find((c) => c.good === good && c.dest === dest)
    return hit ? 'routed' : ''
  }
  if (line.kind === 'crop') {
    return s.horizon.plots.some((p) => p.child.includes(line.want as 'sweet' | 'sturdy' | 'pretty' | 'lasting'))
      ? line.want
      : ''
  }
  if (line.kind === 'phrase') return line.want || 'cleared'
  if (line.kind === 'clause') return line.want && s.horizon.clauses.includes(line.want) ? line.want : line.want || 'kept'
  return ''
}

function tip(kind: LastLineKind): string {
  if (kind === 'shelf') return 'Stock that world on Planets, then fill.'
  if (kind === 'route') return 'File that good to that dest on Exchange, then fill.'
  if (kind === 'crop') return 'Plant that trait on Cultivars, then fill.'
  if (kind === 'phrase') return 'Clear a phrase on Signal, then fill.'
  return 'Keep that clause on Charter, then fill.'
}

/** Actionable last-aisle lines — each Fill writes via fillLastLine. */
export function LastList({
  state: s,
  lines,
  onFill,
}: {
  state: GameState
  lines: LastLine[]
  onFill: (index: number, filled: string) => void
}) {
  return (
    <ul className="hz-list" data-coach-id="lastaisle-list">
      {lines.map((line, i) => {
        const done = line.filled.length > 0 || line.score > 0
        const value = fillValue(s, line)
        const check = can(s, { type: 'fillLastLine', index: i, filled: value || tip(line.kind) })
        const ready = Boolean(value) && check.ok
        return (
          <li key={`${line.kind}-${i}`} className={`hz-status${done ? ' is-on' : ''}`}>
            <span className="hz-status__kind">{KIND[line.kind]}</span>
            <span className="hz-status__want">{wantLabel(line.kind, line.want)}</span>
            <em className="hz-badge">{pct(line.score)}</em>
            <Btn
              tone={done ? 'ghost' : ready ? 'primary' : 'ghost'}
              disabled={!ready && !done}
              title={done ? 'Already filled' : ready ? gateTitle(check, tip(line.kind)) : tip(line.kind)}
              onClick={() => {
                if (!value) return
                onFill(i, value)
              }}
            >
              {done ? 'Filled' : ready ? 'Fill' : 'Needs work'}
            </Btn>
          </li>
        )
      })}
    </ul>
  )
}

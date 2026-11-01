import { useState } from 'react'
import { BUILD_TRACKS, buildLevel, type BuildFilter } from '../../content/builds'
import { ENDCAP } from '../../sim/balance'
import type { Command } from '../../sim/commands'
import { engine } from '../../sim/engine'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { Line } from '../components/Line'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

/** Convenience one-click: early builds in order, skip any that aren't affordable. */
const STARTER_CORNER: Command[] = [
  { type: 'buyBuild', id: 'storefront' },
  { type: 'buyBuild', id: 'storage' },
  { type: 'buyEndcap' },
  { type: 'buyBuild', id: 'transit' },
  { type: 'buyBuild', id: 'civic' },
  { type: 'buyBuild', id: 'cold' },
]

function runBestEffort(cmds: Command[]) {
  for (const cmd of cmds) {
    if (engine.can(cmd).ok) engine.dispatch(cmd)
  }
}

export function BuildPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const [filter, setFilter] = useState<BuildFilter | 'all'>('all')
  const tracks = BUILD_TRACKS.filter((t) => {
    try {
      return t.visible(s)
    } catch {
      return false
    }
  }).filter((t) => filter === 'all' || t.id === filter)

  const endcapCost = Math.ceil(ENDCAP.base * Math.pow(ENDCAP.growth, s.endcaps))
  const starterAny = STARTER_CORNER.some((cmd) => engine.can(cmd).ok)

  return (
    <Panel title="Build" purpose="Storefront, storage, cold, transit, civic." lore="build">
      <Section label="Convenience">
        <p className="ge-muted">One-click helper — not a new system. Buys affordable early tiers only.</p>
        <Btn tone="ghost" disabled={!starterAny} onClick={() => runBestEffort(STARTER_CORNER)}>
          Starter Corner
        </Btn>
      </Section>

      <div className="ge-chip-row">
        <Btn tone={filter === 'all' ? 'primary' : 'ghost'} onClick={() => setFilter('all')}>
          All
        </Btn>
        {BUILD_TRACKS.map((t) => (
          <Btn key={t.id} tone={filter === t.id ? 'primary' : 'ghost'} onClick={() => setFilter(t.id)}>
            {t.name}
          </Btn>
        ))}
      </div>

      {tracks.length === 0 ? <p className="ge-empty">No build tracks unlocked.</p> : null}

      {tracks.map((track) => {
        const lvl = buildLevel(s, track.id)
        const next = track.tiers[lvl + 1]
        const current = track.tiers[lvl]
        return (
          <Section key={track.id} label={track.name}>
            <p className="ge-muted">{track.blurb}</p>
            <Line left="Now" right={current?.name ?? '—'} />
            {current?.effect ? <Line left="Effect" right={current.effect} muted /> : null}
            {next ? (
              <>
                <Line left="Next" right={`${next.name} · era ${next.era}`} />
                <Line left="Effect" right={next.effect || '—'} muted />
                <Btn
                  tone="primary"
                  coachId={track.id === 'storefront' ? 'menu-build' : `build-${track.id}`}
                  disabled={s.cash < next.cost || s.era < next.era}
                  onClick={() => dispatch({ type: 'buyBuild', id: track.id })}
                >
                  Build · {money(next.cost, numberFormat)}
                </Btn>
                {lvl > 0 ? (
                  <Btn tone="ghost" onClick={() => dispatch({ type: 'sellBuild', id: track.id })}>
                    Sell back
                  </Btn>
                ) : null}
              </>
            ) : (
              <p className="ge-muted">Max tier.</p>
            )}
          </Section>
        )
      })}

      <Section label="Endcaps">
        <Line left="Owned" right={String(s.endcaps)} />
        <Btn
          tone="primary"
          disabled={s.endcaps >= ENDCAP.max || s.cash < endcapCost}
          onClick={() => dispatch({ type: 'buyEndcap' })}
        >
          Buy endcap · {money(endcapCost, numberFormat)}
        </Btn>
        <Btn tone="ghost" disabled={s.endcaps <= 0} onClick={() => dispatch({ type: 'sellEndcap' })}>
          Sell endcap
        </Btn>
      </Section>
    </Panel>
  )
}

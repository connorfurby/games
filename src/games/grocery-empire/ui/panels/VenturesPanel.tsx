import { VENTURES, ventureIncome, ventureLevelCost } from '../../content/ventures'
import { useGame } from '../GameContext'
import { money, rate } from '../format'
import { Btn } from '../components/Btn'
import { Line } from '../components/Line'
import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

export function VenturesPanel() {
  const { state: s, dispatch, numberFormat } = useGame()

  const rows = VENTURES.map((def) => {
    let available = false
    try {
      available = def.available(s)
    } catch {
      available = false
    }
    const vs = s.ventures[def.id]
    return { def, available, vs }
  })

  const open = rows.filter((r) => r.available || (r.vs && r.vs.level > 0))
  const teasers = rows.filter((r) => !r.available && !(r.vs && r.vs.level > 0))

  const claimable = open.filter(({ vs }) => (vs?.stored ?? 0) > 0)

  return (
    <Panel title="Ventures" purpose="Side businesses beside the main store." lore="ventures">
      {claimable.length > 0 ? (
        <div className="ge-chip-row">
          <Btn
            tone="primary"
            onClick={() => {
              for (const { def } of claimable) dispatch({ type: 'collectVenture', id: def.id })
            }}
          >
            Claim all ({claimable.length})
          </Btn>
        </div>
      ) : null}
      {open.length === 0 ? <p className="ge-empty">No ventures open. Watch the memos.</p> : null}

      {open.map(({ def, vs }) => {
        const level = vs?.level ?? 0
        const opened = level > 0
        const storeCap = ventureIncome(def, Math.max(1, level)) * def.storeSec
        const stored = vs?.stored ?? 0
        const nextCost = opened ? ventureLevelCost(def, level + 1) : def.openCost
        const atMax = level >= def.maxLevel
        return (
          <Section key={def.id} label={def.name}>
            <p className="ge-muted">{def.blurb}</p>
            {def.loop ? <p className="ge-muted">{def.loop}</p> : null}
            {opened ? (
              <>
                <Line left="Level" right={`${level} / ${def.maxLevel}`} />
                <Line left="Income" right={rate(ventureIncome(def, level))} />
                <Meter value={stored} max={Math.max(1, storeCap)} label={money(stored, numberFormat)} />
                <div className="ge-chip-row">
                  <Btn
                    tone="primary"
                    coachId={`venture-collect-${def.id}`}
                    disabled={stored <= 0}
                    onClick={() => dispatch({ type: 'collectVenture', id: def.id })}
                  >
                    Collect
                  </Btn>
                  <Btn
                    disabled={atMax || s.cash < nextCost}
                    onClick={() => dispatch({ type: 'levelVenture', id: def.id })}
                  >
                    Level · {money(nextCost, numberFormat)}
                  </Btn>
                </div>
              </>
            ) : (
              <Btn
                tone="primary"
                coachId={def.id === 'coffee' ? 'ventures-coffee' : `venture-open-${def.id}`}
                disabled={s.cash < def.openCost}
                onClick={() => dispatch({ type: 'openVenture', id: def.id })}
              >
                Open · {money(def.openCost, numberFormat)}
              </Btn>
            )}
          </Section>
        )
      })}

      {teasers.length > 0 ? (
        <Section label="Coming later">
          {teasers.slice(0, 6).map(({ def }) => (
            <Line key={def.id} left={def.name} right={def.opensAt} muted />
          ))}
        </Section>
      ) : null}
    </Panel>
  )
}

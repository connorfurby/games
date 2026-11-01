import { useState } from 'react'
import { TREE_IDS, TREES, UPGRADES, type TreeId } from '../../content/upgrades'
import { maxAffordableUpgrades, up, upgradeBulkCost } from '../../sim/formulas'
import { useGame } from '../GameContext'
import { money, rate } from '../format'
import { Btn } from '../components/Btn'
import { Line } from '../components/Line'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

/** Short title hint: Next effect + optional sold/demand pace. */
function nextImpactTitle(per: string, soldPerSec: number, demandPerSec: number): string {
  const pace =
    soldPerSec > 0.05
      ? ` · ~${rate(soldPerSec)} sold`
      : demandPerSec > 0.05
        ? ` · ~${rate(demandPerSec)} demand`
        : ''
  return `Next: ${per}${pace}`
}

export function UpgradesPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const [tree, setTree] = useState<TreeId | 'all'>('all')

  const list = UPGRADES.filter((u) => {
    if (tree !== 'all' && u.tree !== tree) return false
    if (u.visible) {
      try {
        return u.visible(s)
      } catch {
        return false
      }
    }
    return true
  })

  return (
    <Panel title="Upgrades" purpose="Leveled trees. Always something to buy." lore="upgrades">
      <div className="ge-chip-row">
        <Btn tone={tree === 'all' ? 'primary' : 'ghost'} onClick={() => setTree('all')}>
          All
        </Btn>
        {TREE_IDS.map((id) => (
          <Btn key={id} tone={tree === id ? 'primary' : 'ghost'} onClick={() => setTree(id)}>
            {TREES[id]?.name ?? id}
          </Btn>
        ))}
      </div>

      {list.length === 0 ? <p className="ge-empty">No upgrades visible yet.</p> : null}

      {list.map((u) => {
        const lvl = up(s, u.id)
        const maxed = lvl >= u.max
        const room = Math.max(0, u.max - lvl)
        const n1 = Math.min(1, room)
        const n10 = Math.min(10, room)
        const nMax = maxAffordableUpgrades(s, u.id)
        const cost1 = n1 > 0 ? upgradeBulkCost(s, u.id, n1) : 0
        const cost10 = n10 > 0 ? upgradeBulkCost(s, u.id, n10) : 0
        const costMax = nMax > 0 ? upgradeBulkCost(s, u.id, nMax) : 0
        return (
          <Section key={u.id} label={`${u.name} · ${TREES[u.tree]?.name ?? u.tree}`}>
            <p className="ge-muted">{u.blurb}</p>
            <Line left="Level" right={`${lvl} / ${u.max}`} />
            <div title={nextImpactTitle(u.per, s.rates.soldPerSec, s.rates.demandPerSec)}>
              <Line left="Next" right={maxed ? '—' : u.per} muted />
            </div>
            {maxed ? (
              <Btn tone="primary" disabled>
                Maxed
              </Btn>
            ) : (
              <div className="ge-chip-row">
                <Btn
                  tone="primary"
                  coachId={u.tree === 'floor' ? 'upgrades-floor' : `upgrade-${u.id}`}
                  disabled={n1 < 1 || s.cash < cost1}
                  onClick={() => dispatch({ type: 'buyUpgrade', id: u.id, count: n1 })}
                >
                  +1 · {money(cost1, numberFormat)}
                </Btn>
                <Btn
                  tone="primary"
                  disabled={n10 < 1 || s.cash < cost10}
                  onClick={() => dispatch({ type: 'buyUpgrade', id: u.id, count: n10 })}
                >
                  +{n10} · {money(cost10, numberFormat)}
                </Btn>
                <Btn
                  tone="ghost"
                  disabled={nMax < 1}
                  onClick={() => dispatch({ type: 'buyUpgrade', id: u.id, count: nMax })}
                >
                  Max ×{nMax} · {money(costMax, numberFormat)}
                </Btn>
              </div>
            )}
          </Section>
        )
      })}
    </Panel>
  )
}

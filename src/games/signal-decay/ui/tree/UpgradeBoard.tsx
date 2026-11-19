import { useState } from 'react'
import { money } from '../format'
import { useGame } from '../GameContext'
import { Button } from '../kit/Button'
import { UPGRADE_BY_ID } from '../../content/upgrades'
import { TREE_ORDER, statLine, upgradeTree, type UpgradeNode } from '../../content/upgradeTree'
import { SkillTree, type TreeNode } from './SkillTree'

function toNode(n: UpgradeNode): TreeNode {
  return {
    id: n.id,
    name: n.hidden ? '???' : n.name,
    tier: n.tier,
    requires: n.requires,
    lvl: n.lvl,
    ring: n.ring,
    state: n.state,
    sub: n.hidden ? undefined : n.lvl > 0 ? `r${n.lvl}` : undefined,
    coachId: n.id === 'crystal-gain' ? 'buy-crystal' : undefined,
  }
}

function NodeDetail({ node }: { node: UpgradeNode }) {
  const { dispatch } = useGame()
  const def = UPGRADE_BY_ID[node.id]
  if (node.hidden || !def) {
    return (
      <>
        <h3>Ahead</h3>
        <p>This rank opens with a later era. The line shows where the tree is going.</p>
      </>
    )
  }
  return (
    <>
      <h3>{def.name}</h3>
      <p>
        {statLine(def.stat)} Rank {node.lvl}. Next rank {money(node.cost)}.
      </p>
      <Button
        tone="primary"
        cost={money(node.cost)}
        affordable={node.affordable}
        onClick={() => dispatch({ type: 'buyUpgrade', id: node.id })}
      >
        Buy rank
      </Button>
    </>
  )
}

/** One family at a time. The path is a guide; the buy stays open. */
export function UpgradeBoard() {
  const { state: s, reducedMotion } = useGame()
  const [tree, setTree] = useState(TREE_ORDER[0]!.id)
  const [sel, setSel] = useState<string | null>(null)
  const built = upgradeTree(tree, s)
  const meta = TREE_ORDER.find((t) => t.id === tree) ?? TREE_ORDER[0]!
  const readyByTree = new Map(TREE_ORDER.map((t) => [t.id, upgradeTree(t.id, s).nodes.filter((n) => n.state === 'ready').length]))
  const ready = readyByTree.get(tree) ?? 0

  return (
    <div className="sd-tree">
      <div className="sd-tree__tabs" role="tablist" aria-label="Upgrade trees">
        {TREE_ORDER.map((t) => {
          const nReady = readyByTree.get(t.id) ?? 0
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tree === t.id}
              className={tree === t.id ? 'is-on' : ''}
              onClick={() => {
                setTree(t.id)
                setSel(null)
              }}
            >
              {t.label}
              {nReady > 0 ? ` ${nReady}` : ''}
            </button>
          )
        })}
      </div>
      <p className="purpose">
        {meta.blurb} {ready > 0 ? `${ready} ready.` : 'Drag the board. Links light when you own the rank above.'}
      </p>
      <SkillTree
        nodes={built.nodes.map(toNode)}
        tiers={built.tiers}
        selected={sel && built.nodes.some((n) => n.id === sel) ? sel : null}
        onSelect={setSel}
        reducedMotion={reducedMotion}
        renderDetail={(id) => {
          const node = built.nodes.find((n) => n.id === id)
          return node ? <NodeDetail node={node} /> : null
        }}
      />
    </div>
  )
}

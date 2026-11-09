import { useMemo, useState } from 'react'
import {
  BAND_IDS,
  BAND_LABELS,
  TREE_IDS,
  TREES,
  UPGRADES,
  UPGRADE_BY_ID,
  bandOf,
  empireLevelForNextBandRank,
  forkBlockedBy,
  isUpgradeSilhouette,
  isUpgradeVisible,
  requirementsMet,
  type TreeId,
  type UpgradeBand,
  type UpgradeDef,
} from '../../content/upgrades'
import { MASTERY, MILESTONES, STAT_INFO, effectiveRank, masteryMul, milestoneMul, nextMilestone } from '../../content/upgrades/stats'
import { SkillTree, type TreeNode, type TreeNodeState } from '../tree/SkillTree'
import { StatGlyph } from '../tree/StatGlyph'
import { UPGRADE_RANKS } from '../../sim/balance'
import { can } from '../../sim/commands'
import { upgradeBulkCost, upgradeRankCap } from '../../sim/formulas'
import type { GameState } from '../../sim/state'
import { treeRanks } from '../../sim/systems/stats'
import { useGame } from '../GameContext'
import { money } from '../format'

type NodeView = {
  def: UpgradeDef
  lvl: number
  cap: number
  shown: boolean
  locked: string | null
  cost1: number
  costMax: number
  maxCount: number
  can1: boolean
  canMax: boolean
}

function nodeView(s: GameState, def: UpgradeDef): NodeView {
  const lvl = s.upgrades[def.id] ?? 0
  const cap = Math.min(def.max, upgradeRankCap(s, def.id))
  const visible = isUpgradeVisible(s, def)
  const shown = visible || isUpgradeSilhouette(s, def) || lvl > 0
  let locked: string | null = null
  const fork = forkBlockedBy(s, def)
  if (fork) locked = `You chose ${fork.name}`
  else if (!visible) locked = 'Not in this era yet'
  else if (!requirementsMet(s, def)) {
    const r = def.requires!.find((q) => (s.upgrades[q.id] ?? 0) < q.level)!
    locked = `Needs ${UPGRADE_BY_ID[r.id]?.name ?? r.id} ${r.level}`
  } else if (lvl >= def.max) locked = null
  else if (lvl >= cap) {
    const at = empireLevelForNextBandRank(s, def)
    locked = at ? `Empire ${at} opens rank ${lvl + 1}` : 'Rank cap'
  }
  const maxCount = Math.max(0, cap - lvl)
  return {
    def,
    lvl,
    cap,
    shown,
    locked,
    cost1: upgradeBulkCost(s, def.id, 1),
    costMax: upgradeBulkCost(s, def.id, maxCount),
    maxCount,
    can1: can(s, { type: 'buyUpgrade', id: def.id }).ok,
    canMax: maxCount > 1 && can(s, { type: 'buyUpgrade', id: def.id, count: maxCount }).ok,
  }
}

/** How many ranks of this node the player could afford right now (≤ room). */
function affordableCount(s: GameState, v: NodeView): number {
  let n = 0
  while (n < v.maxCount && upgradeBulkCost(s, v.def.id, n + 1) <= s.cash) n++
  return n
}

function Pips({ lvl }: { lvl: number }) {
  return (
    <span className="u2-pips" aria-label="Milestones">
      {MILESTONES.map((m) => (
        <span key={m} className={`u2-pip${lvl >= m ? ' is-hit' : ''}`} title={`Rank ${m}: effect doubles`}>
          {m}
        </span>
      ))}
    </span>
  )
}

function NodeCard({ v, s, fmt, onBuy }: { v: NodeView; s: GameState; fmt: Parameters<typeof money>[1]; onBuy: (n: number) => void }) {
  const { def, lvl } = v
  const maxed = lvl >= def.max
  const capstone = !!def.fork && bandOf(def) === 3
  const mm = milestoneMul(lvl)
  const nm = nextMilestone(lvl)
  const afford = !maxed && !v.locked ? affordableCount(s, v) : 0
  return (
    <article
      className={`u2-node${maxed ? ' is-max' : ''}${v.locked ? ' is-locked' : ''}${v.can1 ? ' is-ready' : ''}${
        capstone ? ' is-capstone' : ''
      }`}
      data-upgrade-id={def.id}
      data-suggest-id={`upgrade-${def.id}`}
    >
      <header className="u2-node__head">
        <h4 className="u2-node__name">{def.name}</h4>
        <span className="u2-node__rank" title={`Rank ${lvl} of ${def.max}`}>
          {lvl}
          <small>/{def.max}</small>
        </span>
      </header>
      <p className="u2-node__effect">
        {def.per}
        {mm > 1 ? <span className="u2-node__mm"> ×{mm} from milestones</span> : null}
      </p>
      <p className="u2-node__blurb">{def.blurb}</p>
      <div className="u2-node__meter" aria-hidden>
        <span style={{ transform: `scaleX(${Math.min(1, lvl / def.max)})` }} />
      </div>
      <footer className="u2-node__foot">
        {def.effects?.length ? <Pips lvl={lvl} /> : <span />}
        {maxed ? (
          <span className="u2-node__status">Maxed</span>
        ) : v.locked ? (
          <span className="u2-node__status">{v.locked}</span>
        ) : (
          <span className="u2-node__buy">
            {afford > 1 ? (
              <button
                type="button"
                className="u2-more"
                onClick={() => onBuy(afford)}
                title={`Buy ${afford} ranks for ${money(upgradeBulkCost(s, def.id, afford), fmt)}`}
              >
                +{afford}
              </button>
            ) : null}
            <button type="button" className="g2-tag g2-tag--small" disabled={!v.can1} onClick={() => onBuy(1)}>
              <span className="g2-tag__price">{money(v.cost1, fmt)}</span>
            </button>
          </span>
        )}
      </footer>
      {nm && def.effects?.length && !maxed ? <span className="u2-node__next">Doubles at rank {nm}</span> : null}
    </article>
  )
}

const TREE_TINT: Record<TreeId, string> = {
  floor: '#f2c14e',
  people: '#7fd3a0',
  supply: '#8fb6e0',
  brand: '#ff8a7a',
  automation: '#9be3d8',
  capital: '#d4b06a',
  lab: '#b79cf0',
  fresh: '#8fe39a',
  logistics: '#6fb0e8',
  space: '#c3aaf0',
}

function toTreeNode(v: NodeView, fmt: Parameters<typeof money>[1]): TreeNode {
  const { def, lvl } = v
  const state: TreeNodeState = !v.shown
    ? 'unknown'
    : lvl >= def.max
      ? 'max'
      : v.can1
        ? 'ready'
        : v.locked
          ? lvl > 0
            ? 'owned'
            : 'locked'
          : lvl > 0
            ? 'owned'
            : 'open'
  return {
    id: def.id,
    name: def.name,
    tier: bandOf(def),
    requires: def.requires ?? [],
    fork: def.fork,
    lvl,
    max: def.max,
    state,
    stat: def.effects?.[0]?.stat,
    sub: lvl >= def.max || !v.shown ? undefined : v.locked ? undefined : money(v.cost1, fmt),
  }
}

function UpgradeDetail({
  v,
  s,
  fmt,
  mastery,
  onBuy,
  onJump,
}: {
  v: NodeView
  s: GameState
  fmt: Parameters<typeof money>[1]
  mastery: number
  onBuy: (n: number) => void
  onJump: (id: string) => void
}) {
  const { def, lvl } = v
  const maxed = lvl >= def.max
  const afford = !maxed && !v.locked ? affordableCount(s, v) : 0
  const children = UPGRADES.filter((u) => u.requires?.some((r) => r.id === def.id))
  const eff = effectiveRank(lvl) * mastery
  const nm = nextMilestone(lvl)
  return (
    <div className="sd">
      <div className="sd-head">
        <span className="sd-icon">
          <StatGlyph stat={def.effects?.[0]?.stat} size={24} />
        </span>
        <div>
          <h3>{def.name}</h3>
          <small>
            Rank {lvl} of {def.max}
            {v.cap < def.max ? ` · cap ${v.cap} now` : ''}
          </small>
        </div>
      </div>
      <p className="sd-blurb">{def.blurb}</p>
      <ul className="sd-rows">
        <li>
          <span>Each rank</span>
          <strong>{def.per}</strong>
        </li>
        {def.effects?.map((e) => (
          <li key={e.stat}>
            <span>Now: {STAT_INFO[e.stat].label}</span>
            <strong>
              {STAT_INFO[e.stat].kind === 'cut' ? '−' : '+'}
              {(e.per * eff * 100).toFixed(1)}%
            </strong>
          </li>
        ))}
        {nm && def.effects?.length ? (
          <li>
            <span>Milestone</span>
            <strong>doubles at rank {nm}</strong>
          </li>
        ) : null}
        {v.locked && !maxed ? (
          <li className="is-bad">
            <span>Locked</span>
            <strong>{v.locked}</strong>
          </li>
        ) : null}
      </ul>
      {!maxed && !v.locked ? (
        <div className="sd-buy">
          <button type="button" className="g2-tag" disabled={!v.can1} onClick={() => onBuy(1)}>
            <span className="g2-tag__price">{money(v.cost1, fmt)}</span>
            <span className="g2-tag__label">+1 rank</span>
          </button>
          {afford > 1 ? (
            <button type="button" className="g2-tag g2-tag--small" onClick={() => onBuy(afford)}>
              <span className="g2-tag__price">{money(upgradeBulkCost(s, def.id, afford), fmt)}</span>
              <span className="g2-tag__label">+{afford} ranks</span>
            </button>
          ) : null}
        </div>
      ) : maxed ? (
        <p className="sd-links">Maxed. Every rank counts toward tree mastery.</p>
      ) : null}
      {def.requires?.length ? (
        <p className="sd-links">
          Needs:{' '}
          {def.requires.map((r, i) => (
            <span key={r.id}>
              {i ? ', ' : ''}
              <button type="button" onClick={() => onJump(r.id)}>
                {UPGRADE_BY_ID[r.id]?.name ?? r.id}
              </button>{' '}
              {r.level}
            </span>
          ))}
        </p>
      ) : null}
      {children.length ? (
        <p className="sd-links">
          Unlocks:{' '}
          {children.map((c, i) => (
            <span key={c.id}>
              {i ? ', ' : ''}
              <button type="button" onClick={() => onJump(c.id)}>
                {c.name}
              </button>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  )
}

export function UpgradesBoard() {
  const { state: s, tick, dispatch, numberFormat, reducedMotion } = useGame()
  const [tree, setTree] = useState<TreeId>('floor')
  const [affordOnly, setAffordOnly] = useState(false)
  const [view, setView] = useState<'tree' | 'list'>('tree')
  const [sel, setSel] = useState<string | null>(null)

  const ranks = useMemo(() => treeRanks(s), [tick, s])

  const trees = useMemo(
    () =>
      TREE_IDS.map((id) => {
        const defs = UPGRADES.filter((u) => u.tree === id)
        const views = defs.map((d) => nodeView(s, d))
        const shown = views.filter((v) => v.shown)
        return {
          id,
          views,
          shown: shown.length,
          ready: shown.filter((v) => v.can1).length,
          ranks: ranks[id] ?? 0,
        }
      }).filter((t) => t.shown > 0),
    [tick, s, ranks],
  )

  const active = trees.find((t) => t.id === tree) ?? trees[0]
  if (!active) {
    return (
      <section className="ge-panel u2">
        <p className="ge-muted">Upgrades open in the Corner Store era.</p>
      </section>
    )
  }
  const tr = active.ranks
  const nextMastery = (Math.floor(tr / MASTERY.ranksPerStep) + 1) * MASTERY.ranksPerStep
  const mastery = masteryMul(tr)

  return (
    <section className="ge-panel u2" aria-label="Upgrades">
      <header className="u2-head">
        <div>
          <h2 className="ge-panel__title">Upgrades</h2>
          <p className="ge-panel__purpose">
            Every rank multiplies something real. Ranks 10 and 25 double a node; every {MASTERY.ranksPerStep} ranks in a
            tree adds {Math.round(MASTERY.perStep * 100)}% to all of it.
          </p>
        </div>
        <div className="u2-tools">
          <div className="u2-viewswitch" role="tablist" aria-label="View">
            {(['tree', 'list'] as const).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => setView(v)}>
                {v === 'tree' ? 'Tree' : 'List'}
              </button>
            ))}
          </div>
          {view === 'list' ? (
            <label className="u2-toggle">
              <input type="checkbox" checked={affordOnly} onChange={(e) => setAffordOnly(e.target.checked)} />
              Only what I can buy
            </label>
          ) : null}
        </div>
      </header>

      <nav className="u2-trees" aria-label="Trees">
        {trees.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`u2-tree${t.id === active.id ? ' is-active' : ''}`}
            onClick={() => setTree(t.id)}
            aria-pressed={t.id === active.id}
          >
            <span className="u2-tree__name">{TREES[t.id].name}</span>
            <span className="u2-tree__meta">{t.ranks} ranks</span>
            {t.ready > 0 ? <span className="g2-badge">{t.ready}</span> : null}
          </button>
        ))}
      </nav>

      <div className="u2-tree-head">
        <p className="u2-tree-blurb">{TREES[active.id].blurb}</p>
        <div className="u2-mastery" title="Tree mastery">
          <span>
            Mastery ×{mastery.toFixed(1)} · next at {nextMastery} ranks
          </span>
          <div className="u2-mastery__bar">
            <span style={{ transform: `scaleX(${(tr % MASTERY.ranksPerStep) / MASTERY.ranksPerStep})` }} />
          </div>
        </div>
      </div>

      {view === 'tree' ? (
        <SkillTree
          nodes={active.views.map((v) => toTreeNode(v, numberFormat))}
          tiers={BAND_IDS.map((b) => {
            const open = UPGRADE_RANKS.bands[b].empireOpen
            return {
              label: BAND_LABELS[b],
              note: s.empire.level >= open ? (b === 3 ? 'capstones: pick one' : 'open') : `opens at Empire ${open}`,
            }
          })}
          tint={TREE_TINT[active.id]}
          selected={sel && UPGRADE_BY_ID[sel]?.tree === active.id ? sel : null}
          onSelect={setSel}
          reducedMotion={reducedMotion}
          renderDetail={(id) => (
            <UpgradeDetail
              v={active.views.find((x) => x.def.id === id)!}
              s={s}
              fmt={numberFormat}
              mastery={mastery}
              onBuy={(n) => dispatch({ type: 'buyUpgrade', id, count: n })}
              onJump={setSel}
            />
          )}
        />
      ) : null}

      {view === 'list' && BAND_IDS.map((band) => {
        const views = active.views.filter(
          (v) => bandOf(v.def) === (band as UpgradeBand) && v.shown && (!affordOnly || v.can1),
        )
        if (views.length === 0) return null
        const open = UPGRADE_RANKS.bands[band].empireOpen
        const isOpen = s.empire.level >= open
        return (
          <section key={band} className={`u2-band${isOpen ? '' : ' is-closed'}`}>
            <h3 className="u2-band__title">
              {BAND_LABELS[band]}
              <span>{isOpen ? (band === 3 ? 'Capstones: pick one per tree' : 'Open') : `Opens at Empire ${open}`}</span>
            </h3>
            <div className="u2-grid">
              {views.map((v) => (
                <NodeCard
                  key={v.def.id}
                  v={v}
                  s={s}
                  fmt={numberFormat}
                  onBuy={(n) => dispatch({ type: 'buyUpgrade', id: v.def.id, count: n })}
                />
              ))}
            </div>
          </section>
        )
      })}
    </section>
  )
}

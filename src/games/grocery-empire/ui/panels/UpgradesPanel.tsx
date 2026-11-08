import { useEffect, useMemo, useState } from 'react'
import {
  BAND_IDS,
  BAND_LABELS,
  TREE_IDS,
  TREES,
  UPGRADES,
  UPGRADE_BY_ID,
  bandOf,
  childrenOf,
  empireLevelForNextBandRank,
  forkBlockedBy,
  isUpgradeSilhouette,
  isUpgradeVisible,
  nextBreakpoint,
  requirementsMet,
  type TreeId,
  type UpgradeBand,
  type UpgradeDef,
} from '../../content/upgrades'
import {
  maxAffordableUpgrades,
  up,
  upgradeBulkCost,
  upgradeMagnitude,
  upgradeMagnitudeAt,
  upgradeRankCap,
} from '../../sim/formulas'
import type { GameState } from '../../sim/state'
import { useGame, useIsSuggested } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { GrowthStrip } from '../components/GrowthStrip'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'

type FilterMode = 'all' | 'affordable' | 'band' | 'unlocked'

type NodeView = {
  def: UpgradeDef
  lvl: number
  maxed: boolean
  rankLocked: boolean
  prereqLocked: boolean
  forkBlocked: UpgradeDef | null
  silhouette: boolean
  buyable: boolean
  fill: number
  n1: number
  nBreak: number
  nMax: number
  cost1: number
  costBreak: number
  can1: boolean
  rankCap: number
  nextEmpire: number | null
  nowMag: number
  nextMag: number
}

function buildNode(s: GameState, def: UpgradeDef): NodeView {
  const lvl = up(s, def.id)
  const rankCap = upgradeRankCap(s, def.id)
  const maxed = lvl >= def.max
  const rankLocked = !maxed && lvl >= rankCap
  const prereqLocked = !requirementsMet(s, def)
  const forkBlocked = forkBlockedBy(s, def)
  const visible = isUpgradeVisible(s, def)
  const silhouette = isUpgradeSilhouette(s, def)
  const room = Math.max(0, Math.min(def.max, rankCap) - lvl)
  const n1 = Math.min(1, room)
  const nextBp = nextBreakpoint(def, lvl)
  const nBreak = nextBp != null ? Math.min(room, Math.max(0, nextBp - lvl)) : 0
  const nMax = maxAffordableUpgrades(s, def.id)
  const cost1 = n1 > 0 ? upgradeBulkCost(s, def.id, n1) : 0
  const costBreak = nBreak > 0 ? upgradeBulkCost(s, def.id, nBreak) : 0
  const buyable =
    visible && !prereqLocked && !forkBlocked && !maxed && !rankLocked && n1 > 0 && s.cash >= cost1
  return {
    def,
    lvl,
    maxed,
    rankLocked,
    prereqLocked,
    forkBlocked,
    silhouette,
    buyable,
    fill: def.max <= 0 ? 0 : lvl / def.max,
    n1,
    nBreak,
    nMax,
    cost1,
    costBreak,
    can1: buyable,
    rankCap,
    nextEmpire: empireLevelForNextBandRank(s, def),
    nowMag: upgradeMagnitude(s, def.id),
    nextMag: upgradeMagnitudeAt(s, def.id, Math.min(def.max, lvl + 1)),
  }
}

function magLabel(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '0'
  if (Math.abs(n) >= 10) return n.toFixed(1)
  if (Math.abs(n) >= 1) return n.toFixed(2)
  return n.toFixed(3)
}

function NodeCard({
  node,
  selected,
  compact,
  cash,
  numberFormat,
  onSelect,
  onBuy,
}: {
  node: NodeView
  selected: boolean
  compact: boolean
  cash: number
  numberFormat: Parameters<typeof money>[1]
  onSelect: () => void
  onBuy: (id: string, count: number) => void
}) {
  const sid = `upgrade-${node.def.id}`
  const suggested = useIsSuggested(sid)
  const ring = `conic-gradient(var(--ge-accent) ${node.fill * 360}deg, color-mix(in srgb, var(--ge-ink) 12%, transparent) 0)`
  const locked =
    node.prereqLocked || node.rankLocked || !!node.forkBlocked || (!node.silhouette && !node.buyable)
  const cls = [
    'ge-up-card',
    selected ? 'is-selected' : '',
    node.can1 ? 'is-ready' : '',
    node.maxed ? 'is-max' : '',
    node.prereqLocked || node.forkBlocked ? 'is-silhouette' : '',
    suggested ? 'is-suggested' : '',
    compact ? 'is-compact' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      data-suggest-id={sid}
      data-upgrade-id={node.def.id}
      className={cls}
      style={{ gridColumn: (node.def.col ?? 0) + 1, gridRow: (node.def.row ?? 0) + 1 }}
      onClick={onSelect}
    >
      <div className="ge-up-card__ring" style={{ background: ring }} aria-hidden>
        <span>{node.lvl}</span>
      </div>
      <div className="ge-up-card__body">
        <strong className={node.forkBlocked ? 'is-struck' : undefined}>{node.def.name}</strong>
        {!compact ? <span className="ge-up-card__per">{node.def.per}</span> : null}
        {node.forkBlocked ? (
          <span className="ge-up-card__lock">Other path: {node.forkBlocked.name}</span>
        ) : node.prereqLocked ? (
          <span className="ge-up-card__lock">
            {(node.def.requires ?? [])
              .map((r) => `${UPGRADE_BY_ID[r.id]?.name ?? r.id} ${r.level}`)
              .join(' · ')}
          </span>
        ) : node.rankLocked ? (
          <span className="ge-up-card__lock">Empire {node.nextEmpire ?? '↑'}</span>
        ) : null}
      </div>
      {!compact && !locked && !node.maxed ? (
        <div className="ge-up-card__buys" onClick={(e) => e.stopPropagation()}>
          <Btn
            tone={node.can1 ? 'primary' : 'ghost'}
            coachId={node.def.tree === 'floor' && bandOf(node.def) === 0 ? 'upgrades-floor' : sid}
            disabled={!node.can1}
            onClick={() => onBuy(node.def.id, node.n1)}
          >
            +1 · {money(node.cost1, numberFormat)}
          </Btn>
        </div>
      ) : node.maxed ? (
        <span className="ge-up-card__stamp">Max</span>
      ) : null}
      {compact && node.can1 ? (
        <Btn
          tone="primary"
          disabled={!node.can1 || cash < node.cost1}
          onClick={(e) => {
            e.stopPropagation()
            onBuy(node.def.id, node.n1)
          }}
        >
          +1
        </Btn>
      ) : null}
    </article>
  )
}

function Inspector({
  node,
  s,
  numberFormat,
  onBuy,
  onFocus,
}: {
  node: NodeView | null
  s: GameState
  numberFormat: Parameters<typeof money>[1]
  onBuy: (id: string, count: number) => void
  onFocus: (id: string) => void
}) {
  if (!node) {
    return (
      <aside className="ge-up-inspector">
        <p className="ge-muted">Select a node on the board.</p>
      </aside>
    )
  }
  const def = node.def
  const kids = childrenOf(def.id)
  const sparks = [1, 5, 10, 20, def.max].map((lv) => ({
    lv,
    mag: upgradeMagnitudeAt(s, def.id, Math.min(def.max, lv)),
  }))
  const maxSpark = Math.max(1e-9, ...sparks.map((x) => x.mag))
  const syn =
    def.synergy && (s.empire.perks[def.synergy.perk] ?? 0) > 0
      ? `${def.synergy.perk} ×${def.synergy.mul}`
      : def.synergy
        ? `Needs ${def.synergy.perk}`
        : null

  return (
    <aside className="ge-up-inspector">
      <header>
        <h3>{def.name}</h3>
        <p>{def.blurb}</p>
      </header>
      <div className="ge-up-inspector__mag">
        <span>
          now <strong>{magLabel(node.nowMag)}</strong>
        </span>
        <span aria-hidden>→</span>
        <span>
          next <strong>{magLabel(node.nextMag)}</strong>
        </span>
      </div>
      <div className="ge-up-spark" aria-label="Magnitude curve">
        {sparks.map((x) => (
          <div key={x.lv} className="ge-up-spark__col">
            <i style={{ height: `${(x.mag / maxSpark) * 100}%` }} />
            <em>{x.lv}</em>
          </div>
        ))}
      </div>
      <p className="ge-up-inspector__meta ge-muted">
        {node.lvl}/{def.max}
        {node.rankCap < def.max ? ` · open ${node.rankCap}` : ''}
        {node.nextEmpire != null ? ` · Empire ${node.nextEmpire}` : ''}
        {syn ? ` · ${syn}` : ''}
      </p>
      {def.requires?.length ? (
        <div className="ge-chip-row">
          {def.requires.map((r) => (
            <button key={r.id} type="button" className="ge-up-chip" onClick={() => onFocus(r.id)}>
              {UPGRADE_BY_ID[r.id]?.name ?? r.id} {r.level}
            </button>
          ))}
        </div>
      ) : null}
      {kids.length ? (
        <div className="ge-chip-row">
          {kids.map((k) => (
            <button key={k.id} type="button" className="ge-up-chip" onClick={() => onFocus(k.id)}>
              → {k.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="ge-up-inspector__buys">
        {node.maxed ? (
          <Btn tone="ghost" disabled>
            Maxed
          </Btn>
        ) : node.forkBlocked ? (
          <Btn tone="ghost" disabled>
            Fork locked
          </Btn>
        ) : node.prereqLocked || node.rankLocked ? (
          <Btn tone="ghost" disabled>
            Locked
          </Btn>
        ) : (
          <>
            <Btn
              tone={node.can1 ? 'primary' : 'ghost'}
              disabled={!node.can1}
              onClick={() => onBuy(def.id, node.n1)}
            >
              +1 · {money(node.cost1, numberFormat)}
            </Btn>
            {node.nBreak > 1 ? (
              <Btn
                tone="ghost"
                disabled={s.cash < node.costBreak}
                onClick={() => onBuy(def.id, node.nBreak)}
              >
                +{node.nBreak} break · {money(node.costBreak, numberFormat)}
              </Btn>
            ) : null}
            <Btn tone="ghost" disabled={node.nMax < 1} onClick={() => onBuy(def.id, node.nMax)}>
              Fill · {node.nMax}
            </Btn>
          </>
        )}
      </div>
    </aside>
  )
}

function Connectors({ nodes }: { nodes: NodeView[] }) {
  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.def.id, n])), [nodes])
  const lines: { key: string; x1: number; y1: number; x2: number; y2: number }[] = []
  for (const n of nodes) {
    for (const r of n.def.requires ?? []) {
      const parent = byId[r.id]
      if (!parent) continue
      if (bandOf(parent.def) !== bandOf(n.def)) continue
      const x1 = (parent.def.col ?? 0) * 20 + 10
      const y1 = (parent.def.row ?? 0) * 28 + 24
      const x2 = (n.def.col ?? 0) * 20 + 10
      const y2 = (n.def.row ?? 0) * 28 + 4
      lines.push({ key: `${parent.def.id}-${n.def.id}`, x1, y1, x2, y2 })
    }
  }
  if (!lines.length) return null
  return (
    <svg className="ge-up-connectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {lines.map((l) => (
        <path
          key={l.key}
          d={`M ${l.x1} ${l.y1} V ${(l.y1 + l.y2) / 2} H ${l.x2} V ${l.y2}`}
          fill="none"
          stroke="color-mix(in srgb, var(--ge-ink) 22%, transparent)"
          strokeWidth="0.6"
        />
      ))}
    </svg>
  )
}

export function UpgradesPanel() {
  const { state: s, tick, dispatch, numberFormat, suggestions, focusNonce, focusTarget, reducedMotion } =
    useGame()
  const [tree, setTree] = useState<TreeId>('floor')
  const [bandFilter, setBandFilter] = useState<UpgradeBand | 'all'>('all')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compact, setCompact] = useState(() => {
    try {
      return sessionStorage.getItem('ge-up-compact') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem('ge-up-compact', compact ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [compact])

  const branches = useMemo(() => {
    return TREE_IDS.map((id) => {
      const defs = UPGRADES.filter((u) => u.tree === id && isUpgradeSilhouette(s, u))
      const nodes = defs.map((d) => buildNode(s, d))
      const byBand = BAND_IDS.map((b) => {
        const list = nodes.filter((n) => bandOf(n.def) === b)
        const invested = list.reduce((n, r) => n + r.lvl, 0)
        const capacity = list.reduce((n, r) => n + r.def.max, 0)
        return { band: b, invested, capacity, ready: list.filter((n) => n.can1).length }
      })
      return {
        id,
        name: TREES[id].name,
        blurb: TREES[id].blurb,
        tint: TREES[id].tint,
        nodes,
        invested: nodes.reduce((n, r) => n + r.lvl, 0),
        capacity: nodes.reduce((n, r) => n + r.def.max, 0),
        ready: nodes.filter((n) => n.can1).length,
        byBand,
      }
    }).filter((b) => b.nodes.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, s])

  const active = branches.find((b) => b.id === tree) ?? branches[0] ?? null
  const activeId = active?.id ?? null

  const visibleNodes = useMemo(() => {
    if (!active) return []
    let rows = active.nodes
    if (bandFilter !== 'all') {
      rows = rows.filter((n) => bandOf(n.def) === bandFilter || bandOf(n.def) < bandFilter)
    }
    if (filter === 'affordable') rows = rows.filter((n) => n.can1)
    if (filter === 'unlocked') rows = rows.filter((n) => !n.prereqLocked && isUpgradeVisible(s, n.def))
    if (filter === 'band' && bandFilter !== 'all') {
      rows = rows.filter((n) => bandOf(n.def) === bandFilter)
    }
    return rows
  }, [active, bandFilter, filter, s])

  const selected =
    visibleNodes.find((n) => n.def.id === selectedId) ??
    active?.nodes.find((n) => n.def.id === selectedId) ??
    null

  useEffect(() => {
    if (!focusTarget?.startsWith('upgrade-')) return
    const id = focusTarget.replace(/^upgrade-/, '')
    const def = UPGRADE_BY_ID[id]
    if (!def) return
    if (branches.some((b) => b.id === def.tree)) setTree(def.tree)
    setSelectedId(id)
    setBandFilter(bandOf(def))
  }, [focusNonce, focusTarget, branches])

  const treeHasSuggest = (treeId: TreeId) => {
    const g = suggestions[0]
    if (!g?.target?.startsWith('upgrade-')) return false
    const id = g.target.replace(/^upgrade-/, '')
    return UPGRADE_BY_ID[id]?.tree === treeId
  }

  const onBuy = (id: string, count: number) => {
    dispatch({ type: 'buyUpgrade', id, count })
    if (!reducedMotion) {
      const el = document.querySelector(`[data-upgrade-id="${id}"]`)
      el?.classList.add('ge-up-card--stamped')
      window.setTimeout(() => el?.classList.remove('ge-up-card--stamped'), 480)
    }
  }

  return (
    <Panel
      title="Upgrades"
      purpose="Spend cash on layered trees. Empire rank opens the next band."
      lore="upgrades"
    >
      <GrowthStrip mode="habits" />
      <HelpCard title="Cash trees — layered boards">
        Pay cash here for repeatable ranks across Counter → Aisle → Chain → Institution. Empire rank
        opens the next layer; exclusive capstones pick a shape until Retraining. Empire trait points
        live on the doctrine board — separate from these cash trees.
      </HelpCard>

      <div className={`ge-up ge-up--workshop ge-up--${active?.tint ?? 'accent'}`}>
        <nav className="ge-up-nav" aria-label="Upgrade trees">
          {branches.map((b) => {
            const fill = b.capacity <= 0 ? 0 : b.invested / b.capacity
            const on = b.id === activeId
            return (
              <button
                key={b.id}
                type="button"
                className={`ge-up-nav__btn${on ? ' is-on' : ''}${b.ready > 0 ? ' is-hot' : ''}${
                  treeHasSuggest(b.id) ? ' is-suggested' : ''
                }`.trim()}
                aria-current={on ? 'page' : undefined}
                onClick={() => {
                  setTree(b.id)
                  setSelectedId(null)
                }}
              >
                <span className="ge-up-nav__name">
                  <strong>{b.name}</strong>
                  {b.ready > 0 ? <em>{b.ready}</em> : null}
                </span>
                <span className="ge-up-nav__bar" aria-hidden>
                  <i style={{ width: `${fill * 100}%` }} />
                </span>
                <span className="ge-up-nav__pips" aria-hidden>
                  {b.byBand.map((bb) => (
                    <i
                      key={bb.band}
                      className={
                        bb.capacity <= 0
                          ? undefined
                          : bb.invested <= 0
                            ? undefined
                            : bb.invested >= bb.capacity
                              ? 'is-full'
                              : 'is-partial'
                      }
                    />
                  ))}
                </span>
                <span className="ge-up-nav__lvl">
                  {b.invested}/{b.capacity}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="ge-up-pane">
          {!active ? (
            <p className="ge-empty">No upgrade trees unlocked yet.</p>
          ) : (
            <>
              <header className="ge-up-pane__head">
                <div>
                  <h3>{active.name}</h3>
                  <p>{active.blurb}</p>
                </div>
                <div className="ge-up-pane__tools">
                  <label className="ge-check ge-up-ready">
                    <input
                      type="checkbox"
                      checked={compact}
                      onChange={(e) => setCompact(e.target.checked)}
                    />
                    Compact
                  </label>
                  <label className="ge-check ge-up-ready">
                    <input
                      type="checkbox"
                      checked={filter === 'affordable'}
                      onChange={(e) => setFilter(e.target.checked ? 'affordable' : 'all')}
                    />
                    Affordable
                  </label>
                </div>
              </header>

              <div className="ge-up-bands" role="tablist" aria-label="Bands">
                <button
                  type="button"
                  role="tab"
                  className={`ge-up-band${bandFilter === 'all' ? ' is-on' : ''}`}
                  onClick={() => setBandFilter('all')}
                >
                  All
                </button>
                {BAND_IDS.map((b) => {
                  const info = active.byBand.find((x) => x.band === b)!
                  const openAt = [0, 4, 8, 16][b]!
                  const locked = b > 0 && s.empire.level < openAt
                  return (
                    <button
                      key={b}
                      type="button"
                      role="tab"
                      className={`ge-up-band${bandFilter === b ? ' is-on' : ''}${
                        locked ? ' is-locked' : ''
                      }${info.ready > 0 ? ' is-hot' : ''}`.trim()}
                      onClick={() => setBandFilter(b)}
                    >
                      <strong>{BAND_LABELS[b]}</strong>
                      <span>
                        {locked
                          ? `Empire ${openAt}`
                          : `${info.invested}/${info.capacity || '—'}`}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="ge-up-workshop">
                <div className="ge-up-canvas">
                  <Connectors nodes={visibleNodes} />
                  <div className="ge-up-grid">
                    {visibleNodes.map((node) => (
                      <NodeCard
                        key={node.def.id}
                        node={node}
                        selected={selected?.def.id === node.def.id}
                        compact={compact}
                        cash={s.cash}
                        numberFormat={numberFormat}
                        onSelect={() => setSelectedId(node.def.id)}
                        onBuy={onBuy}
                      />
                    ))}
                  </div>
                  {visibleNodes.length === 0 ? (
                    <p className="ge-empty">Nothing in this filter.</p>
                  ) : null}
                </div>
                <Inspector
                  node={selected}
                  s={s}
                  numberFormat={numberFormat}
                  onBuy={onBuy}
                  onFocus={(id) => {
                    const def = UPGRADE_BY_ID[id]
                    if (!def) return
                    setTree(def.tree)
                    setSelectedId(id)
                    setBandFilter(bandOf(def))
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Panel>
  )
}

import { useMemo, useState } from 'react'
import { useMeta } from '@/shell/MetaContext'
import { HUNGRY_MUTATORS } from '../../content/lateEras'
import {
  PERKS,
  PERK_BRANCHES,
  PERK_BY_ID,
  type PerkBranch,
  type PerkDef,
} from '../../content/perks'
import { PERK_RESPEC } from '../../sim/balance'
import { canReleaseAutonomous } from '../../sim/systems/capital'
import { useGame } from '../GameContext'
import { qty } from '../format'
import { HungryLawsBoard } from '../components/HungryLaws'
import { can } from '../../sim/commands'
import type { GameState } from '../../sim/state'
import { STAT_INFO } from '../../content/upgrades/stats'
import { SkillTree, type TreeNode, type TreeNodeState } from '../tree/SkillTree'
import { StatGlyph } from '../tree/StatGlyph'
import { Button, Sheet, useConfirm } from '../kit'

const BRANCHES: PerkBranch[] = ['floorcraft', 'ledger', 'charter', 'frontier', 'legacy', 'horizon']

function perkVisible(s: Parameters<NonNullable<PerkDef['visible']>>[0], p: PerkDef) {
  if (!p.visible) return true
  try {
    return !!p.visible(s)
  } catch {
    return false
  }
}

const BRANCH_TINT: Record<PerkBranch, string> = {
  floorcraft: '#f2c14e',
  ledger: '#8fb6e0',
  charter: '#ff8a7a',
  frontier: '#7fd3a0',
  legacy: '#c3aaf0',
  horizon: '#e0b15a',
}

/** Exclusive doctrine already taken by a sibling, if any. */
function exclusiveTaken(s: GameState, p: PerkDef): PerkDef | null {
  if (!p.exclusive) return null
  for (const other of PERKS) {
    if (other.id !== p.id && other.exclusive === p.exclusive && (s.empire.perks[other.id] ?? 0) > 0) return other
  }
  return null
}

function perkNode(s: GameState, p: PerkDef): TreeNode {
  const lvl = s.empire.perks[p.id] ?? 0
  const visible = perkVisible(s, p)
  const ok = can(s, { type: 'buyPerk', id: p.id }).ok
  const reqOk = !p.requires?.length || p.requires.every((r) => (s.empire.perks[r.id] ?? 0) >= r.level)
  const state: TreeNodeState = !visible
    ? 'unknown'
    : lvl >= p.max
      ? 'max'
      : ok
        ? 'ready'
        : lvl > 0
          ? 'owned'
          : !reqOk || exclusiveTaken(s, p)
            ? 'locked'
            : 'open'
  return {
    id: p.id,
    name: p.name,
    tier: p.band ?? 0,
    requires: p.requires ?? [],
    fork: p.exclusive,
    lvl,
    max: p.max,
    state,
    stat: p.effects?.[0]?.stat,
    sub: lvl >= p.max ? undefined : `${p.cost} pt${p.cost === 1 ? '' : 's'}`,
  }
}

function PerkDetail({ p, onBuy, onJump }: { p: PerkDef; onBuy: () => void; onJump: (id: string) => void }) {
  const { state: s } = useGame()
  const lvl = s.empire.perks[p.id] ?? 0
  const check = can(s, { type: 'buyPerk', id: p.id })
  const taken = exclusiveTaken(s, p)
  const unlocks = PERKS.filter((x) => x.requires?.some((r) => r.id === p.id))
  return (
    <div className="sd">
      <div className="sd-head">
        <span className="sd-icon">
          <StatGlyph stat={p.effects?.[0]?.stat} size={24} />
        </span>
        <div>
          <h3>{p.name}</h3>
          <small>
            {PERK_BRANCHES[p.branch].name} · {lvl}/{p.max}
          </small>
        </div>
      </div>
      <ul className="sd-rows">
        <li>
          <span>Each point</span>
          <strong>{p.per}</strong>
        </li>
        {p.effects?.map((e) => (
          <li key={e.stat}>
            <span>Now: {STAT_INFO[e.stat].label}</span>
            <strong>+{(e.per * lvl * 100).toFixed(1)}%</strong>
          </li>
        ))}
        {lvl < p.max
          ? p.effects?.map((e) => (
              <li key={`next-${e.stat}`}>
                <span>Next: {STAT_INFO[e.stat].label}</span>
                <strong>+{(e.per * (lvl + 1) * 100).toFixed(1)}%</strong>
              </li>
            ))
          : null}
        <li>
          <span>Cost</span>
          <strong>
            {p.cost} trait point{p.cost === 1 ? '' : 's'} · you have {s.empire.points}
          </strong>
        </li>
        {taken ? (
          <li className="is-bad">
            <span>Choose one</span>
            <strong>You took {taken.name}</strong>
          </li>
        ) : null}
      </ul>
      {lvl < p.max ? (
        <div className="sd-buy">
          <button type="button" className="g2-tag" disabled={!check.ok} title={check.ok ? undefined : check.reason} onClick={onBuy}>
            <span className="g2-tag__price">
              {p.cost} pt{p.cost === 1 ? '' : 's'}
            </span>
            <span className="g2-tag__label">{check.ok ? 'Take it' : check.reason}</span>
          </button>
        </div>
      ) : (
        <p className="sd-links">Maxed.</p>
      )}
      {p.requires?.length ? (
        <p className="sd-links">
          Needs:{' '}
          {p.requires.map((r, i) => (
            <span key={r.id}>
              {i ? ', ' : ''}
              <button type="button" onClick={() => onJump(r.id)}>
                {PERK_BY_ID[r.id]?.name ?? r.id}
              </button>{' '}
              {r.level}
            </span>
          ))}
        </p>
      ) : null}
      {unlocks.length ? (
        <p className="sd-links">
          Unlocks:{' '}
          {unlocks.map((u, i) => (
            <span key={u.id}>
              {i ? ', ' : ''}
              <button type="button" onClick={() => onJump(u.id)}>
                {u.name}
              </button>
            </span>
          ))}
        </p>
      ) : null}
      {p.touches ? <p className="sd-links">Boosts the cash upgrade “{p.touches}”.</p> : null}
    </div>
  )
}

/**
 * Unique Empire sections (Hungry Laws, Autonomous, doctrines) for EmpireBoard.
 * No second "Empire" panel header — the board already owns rank/XP hero copy.
 */
export function EmpireSections({
  doctrineOpen,
  autoOpen,
  onDoctrineClose,
  onAutoClose,
}: {
  doctrineOpen: boolean
  autoOpen: boolean
  onDoctrineClose: () => void
  onAutoClose: () => void
}) {
  const { state: s, dispatch, reducedMotion } = useGame()
  const { metaRef, replaceMeta } = useMeta()
  const confirm = useConfirm()
  const autoBlock = canReleaseAutonomous(s)
  const activeLaws = s.prestigeCarry.mutators ?? []
  const showLaws =
    s.pendingAccept || s.prestigeCarry.universeIndex > 0 || activeLaws.length > 0
  const points = s.empire.points
  const [focusId, setFocusId] = useState<string | null>(null)
  const [branch, setBranch] = useState<PerkBranch>('floorcraft')

  const spent = useMemo(
    () =>
      Object.entries(s.empire.perks).reduce(
        (n, [id, v]) => n + (v ?? 0) * (PERK_BY_ID[id]?.cost ?? 1),
        0,
      ),
    [s.empire.perks],
  )

  const respecCost = Math.ceil(
    PERK_RESPEC.ideas * Math.pow(PERK_RESPEC.growth, s.compute.perkRespecs ?? 0),
  )
  const canRespec = spent > 0 && s.compute.ideas >= respecCost

  const focus = focusId ? PERK_BY_ID[focusId] : null

  return (
    <>
      {showLaws ? (
        <section className="pf-desk pf-desk--wide ge-empire-block">
          <h3 className="pf-desk__title">Hungry laws</h3>
          <p className="ge-muted">Extra rules this universe plays by. You choose them after you Accept.</p>
          {s.pendingAccept ? (
            <HungryLawsBoard
              compact
              onConfirm={(mutators) => {
                replaceMeta({ ...metaRef.current, hungryLaws: mutators })
                dispatch({ type: 'confirmHungryLaws', mutators })
              }}
            />
          ) : activeLaws.length > 0 ? (
            <ul className="ge-empire-laws">
              {activeLaws.map((id) => {
                const def = HUNGRY_MUTATORS.find((m) => m.id === id)
                return (
                  <li key={id}>
                    <strong>{def?.name ?? id}</strong>
                    {def ? <span>{def.blurb}</span> : null}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="ge-muted">No laws this universe — default physics.</p>
          )}
        </section>
      ) : null}

      <Sheet
        open={doctrineOpen}
        onClose={onDoctrineClose}
        title={points > 0 ? `Perks · ${points} trait point${points > 1 ? 's' : ''} to spend` : 'Perks'}
        reducedMotion={reducedMotion}
        className="pf-desk--wide pf-desk--doctrine"
      >
        <header className="ge-empire-block__head">
          <p className="ge-muted">
            Every rank gives a trait point. Spend them on permanent perks below; tap a perk to see it. In some pairs you
            can only pick one.
          </p>
          {spent > 0 ? (
            <div className="ge-chip-row" style={{ marginTop: '0.35rem' }}>
              {canRespec ? <Button
                tone="secondary"
                title={
                  canRespec
                    ? `Refund all trait points for ${qty(respecCost)} Ideas`
                    : `Need ${qty(respecCost)} Ideas`
                }
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Refund every perk?',
                    body: `Spend ${qty(respecCost)} Ideas to refund every perk and get your trait points back. Exclusive forks clear. Archives already granted stay.`,
                    confirmLabel: `Refund · ${qty(respecCost)} Ideas`,
                  })
                  if (ok) dispatch({ type: 'respecPerks' })
                }}
              >
                Refund all points · {qty(respecCost)} Ideas
              </Button> : <span className="ge-muted">Refunding points costs {qty(respecCost)} Ideas.</span>}
            </div>
          ) : null}
        </header>

        <nav className="dt-branches" aria-label="Perk branches">
          {BRANCHES.map((b) => {
            const list = PERKS.filter((p) => p.branch === b && perkVisible(s, p))
            const owned = list.reduce((n, p) => n + (s.empire.perks[p.id] ?? 0), 0)
            const ready = list.filter((p) => can(s, { type: 'buyPerk', id: p.id }).ok).length
            if (list.length === 0) return null
            return (
              <button
                key={b}
                type="button"
                className={`dt-branch${branch === b ? ' is-on' : ''}`}
                onClick={() => setBranch(b)}
                style={{ '--bt': BRANCH_TINT[b] } as React.CSSProperties}
              >
                <strong>{PERK_BRANCHES[b].name}</strong>
                <small>{owned} spent</small>
                {ready > 0 ? <span className="g2-badge">{ready}</span> : null}
              </button>
            )
          })}
        </nav>
        <p className="ge-muted" style={{ margin: '0 0 0.6rem', fontSize: 'var(--t-sm)' }}>
          {PERK_BRANCHES[branch].blurb}
        </p>
        <SkillTree
          nodes={PERKS.filter((p) => p.branch === branch).map((p) => perkNode(s, p))}
          tiers={[{ label: 'Basics' }, { label: 'Deeper' }, { label: 'Signature', note: 'some pairs: pick one' }]}
          tint={BRANCH_TINT[branch]}
          selected={focusId && PERK_BY_ID[focusId]?.branch === branch ? focusId : null}
          onSelect={setFocusId}
          reducedMotion={reducedMotion}
          emptyText="Level up once to earn a trait point."
          renderDetail={(id) => (
            <PerkDetail p={PERK_BY_ID[id]!} onBuy={() => dispatch({ type: 'buyPerk', id })} onJump={setFocusId} />
          )}
        />

        {focus?.touches ? (
          <p className="ge-muted" style={{ marginTop: '0.55rem', fontSize: 'var(--t-xs)' }}>
            {focus.name} synergizes cash node <strong>{focus.touches}</strong>.
          </p>
        ) : null}
      </Sheet>

      <Sheet
        open={autoOpen}
        onClose={onAutoClose}
        title="Autonomous"
        reducedMotion={reducedMotion}
        deskHidden={s.era < 2 || !!s.autonomous}
      >
        <p className="ge-muted">Let the store run its own habits from Books, so you can focus on growing.</p>
        {autoBlock ? (
          <p className="ge-muted" data-coach-id="empire-autonomous">Not yet: {autoBlock}</p>
        ) : (
          <Button
            tone="free"
            coachId="empire-autonomous"
            onClick={() => {
              dispatch({ type: 'releaseAutonomous' })
              onAutoClose()
            }}
          >
            Hand over the chain
          </Button>
        )}
      </Sheet>

    </>
  )
}

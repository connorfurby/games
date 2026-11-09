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
import { CAPITAL, PERK_RESPEC } from '../../sim/balance'
import { empireXpToNext } from '../../sim/formulas'
import { canReleaseAutonomous } from '../../sim/systems/capital'
import { useGame } from '../GameContext'
import { pct, qty } from '../format'
import { Btn } from '../components/Btn'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HelpCard } from '../components/HelpCard'
import { HungryLawsBoard } from '../components/HungryLaws'
import { Panel } from '../components/Panel'
import { can } from '../../sim/commands'
import type { GameState } from '../../sim/state'
import { STAT_INFO } from '../../content/upgrades/stats'
import { SkillTree, type TreeNode, type TreeNodeState } from '../tree/SkillTree'
import { StatGlyph } from '../tree/StatGlyph'

const BRANCHES: PerkBranch[] = ['floorcraft', 'ledger', 'charter', 'frontier', 'legacy']

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

export function EmpirePanel() {
  const { state: s, dispatch, setActiveMenu, reducedMotion } = useGame()
  const { metaRef, replaceMeta } = useMeta()
  const need = Math.max(1, empireXpToNext(s.empire.level))
  const xp = s.empire.xp
  const fill = Math.max(0, Math.min(1, xp / need))
  const autoBlock = canReleaseAutonomous(s)
  const activeLaws = s.prestigeCarry.mutators ?? []
  const showLaws =
    s.pendingAccept || s.prestigeCarry.universeIndex > 0 || activeLaws.length > 0
  const points = s.empire.points
  const ring = `conic-gradient(var(--ge-accent) ${fill * 360}deg, color-mix(in srgb, var(--ge-ink) 12%, transparent) 0)`
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
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
    <Panel
      title="Empire"
      purpose="Baskets raise rank. Rank unlocks upgrade bands and invest caps."
      lore="empire"
    >
      <div className="ge-empire-hero">
        <div className="ge-empire-hero__ring" style={{ background: ring }} aria-hidden>
          <div className="ge-empire-hero__core">
            <span className="ge-empire-hero__lv-label">Rank</span>
            <strong className="ge-empire-hero__lv">{s.empire.level}</strong>
          </div>
        </div>
        <div className="ge-empire-hero__copy">
          <div className="ge-empire-hero__title">Run rank from baskets</div>
          <p className="ge-empire-hero__blurb">
            Baskets raise rank. Rank opens deeper cash-upgrade bands and a bigger invest park —
            separate from buying Upgrade trees with cash. Trait points buy doctrines below.
          </p>
          <div className="ge-empire-hero__meters" role="group" aria-label="Empire progress">
            <div className="ge-empire-stat">
              <span>XP</span>
              <strong>
                {Math.floor(xp)}
                <em> / {need}</em>
              </strong>
              <div className="ge-empire-stat__bar" aria-hidden>
                <i style={{ width: pct(fill) }} />
              </div>
            </div>
            <div className={`ge-empire-stat${points > 0 ? ' is-hot' : ''}`.trim()}>
              <span>Trait pts</span>
              <strong>{points}</strong>
              <div className="ge-empire-stat__hint">
                {points > 0 ? 'Spend on doctrines below' : `Spent ${spent} · earn one per level-up`}
              </div>
            </div>
            {s.prestigeCarry.universeIndex > 0 ? (
              <div className="ge-empire-stat">
                <span>Universe</span>
                <strong>#{s.prestigeCarry.universeIndex}</strong>
              </div>
            ) : null}
          </div>
          <div className="ge-chip-row" style={{ marginTop: '0.55rem' }}>
            <Btn tone="ghost" onClick={() => setActiveMenu('upgrades')}>
              Open Upgrades (cash trees)
            </Btn>
          </div>
        </div>
      </div>

      {showLaws ? (
        <section className="ge-empire-block">
          <header className="ge-empire-block__head">
            <h3>Hungry laws</h3>
            <p>NG+ physics this universe remembers — pick after Accept.</p>
          </header>
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

      {s.era >= 2 ? (
        <section className={`ge-empire-auto${s.autonomous ? ' is-live' : ''}`.trim()}>
          <div className="ge-empire-auto__copy">
            <h3>{s.autonomous ? 'Autonomous live' : 'Release Autonomous'}</h3>
            <p>
              Late Era 2 gate: depot online, bank {CAPITAL.autonomousReadNeed} Read on Strategy, and
              spend ~{CAPITAL.autonomousRepSpentNeed} Reputation on Analysts/Archives.
              {s.autonomous
                ? ' Habits run from Books.'
                : ` Progress — depot ${s.depot ? 'yes' : 'no'} · Read ${Math.floor(s.read)}/${CAPITAL.autonomousReadNeed} · Rep spent ${s.repSpent}/${CAPITAL.autonomousRepSpentNeed}.`}
            </p>
          </div>
          <Btn
            tone="primary"
            coachId="empire-autonomous"
            disabled={!!autoBlock || s.autonomous}
            title={s.autonomous ? 'Already running' : (autoBlock ?? undefined)}
            onClick={() => dispatch({ type: 'releaseAutonomous' })}
          >
            {s.autonomous ? 'Running' : autoBlock ?? 'Release'}
          </Btn>
        </section>
      ) : null}

      <section className="ge-empire-block">
        <header className="ge-empire-block__head">
          <h3>Doctrine board</h3>
          <p>
            Floorcraft, Ledger, and Charter — mild permanent picks with trait points. Exclusive pairs
            give the run a shape.
            {points > 0 ? ` ${points} ready.` : ''}
          </p>
          {spent > 0 ? (
            <div className="ge-chip-row" style={{ marginTop: '0.35rem' }}>
              <Btn
                tone="ghost"
                disabled={!canRespec}
                title={
                  canRespec
                    ? `Refund all trait points for ${qty(respecCost)} Ideas`
                    : `Need ${qty(respecCost)} Ideas`
                }
                onClick={() =>
                  setConfirm({
                    title: 'Rewrite the Charter',
                    body: `Spend ${qty(respecCost)} Ideas to refund every doctrine and restore trait points.`,
                    detail: 'Exclusive forks clear. Archives already granted stay.',
                    confirmLabel: `Rewrite · ${qty(respecCost)} Ide`,
                    onConfirm: () => dispatch({ type: 'respecPerks' }),
                  })
                }
              >
                Rewrite the Charter · {qty(respecCost)} Ide
              </Btn>
            </div>
          ) : null}
        </header>

        <nav className="dt-branches" aria-label="Doctrine branches">
          {BRANCHES.map((b) => {
            const list = PERKS.filter((p) => p.branch === b && perkVisible(s, p))
            const owned = list.reduce((n, p) => n + (s.empire.perks[p.id] ?? 0), 0)
            const ready = list.filter((p) => can(s, { type: 'buyPerk', id: p.id }).ok).length
            if (list.length === 0) return null
            return (
              <button key={b} type="button" className={`dt-branch${branch === b ? ' is-on' : ''}`} onClick={() => setBranch(b)} style={{ '--bt': BRANCH_TINT[b] } as React.CSSProperties}>
                <strong>{PERK_BRANCHES[b].name}</strong>
                <small>{owned} pts in</small>
                {ready > 0 ? <span className="g2-badge">{ready}</span> : null}
              </button>
            )
          })}
        </nav>
        <p className="ge-muted" style={{ margin: '0 0 0.6rem', fontSize: '0.8rem' }}>
          {PERK_BRANCHES[branch].blurb}
        </p>
        <SkillTree
          nodes={PERKS.filter((p) => p.branch === branch).map((p) => perkNode(s, p))}
          tiers={[{ label: 'Basics' }, { label: 'Deeper' }, { label: 'Signature', note: 'some are choose-one' }]}
          tint={BRANCH_TINT[branch]}
          selected={focusId && PERK_BY_ID[focusId]?.branch === branch ? focusId : null}
          onSelect={setFocusId}
          reducedMotion={reducedMotion}
          emptyText="Level up once to earn a trait point."
          renderDetail={(id) => <PerkDetail p={PERK_BY_ID[id]!} onBuy={() => dispatch({ type: 'buyPerk', id })} onJump={setFocusId} />}
        />

        {focus?.touches ? (
          <p className="ge-muted" style={{ marginTop: '0.55rem', fontSize: '0.72rem' }}>
            {focus.name} synergizes cash node <strong>{focus.touches}</strong>.
          </p>
        ) : null}
      </section>

      <HelpCard title="Empire ≠ Upgrades">
        <strong>Empire</strong> ranks from baskets and spends trait points on the doctrine board.{' '}
        <strong>Upgrades</strong> spends cash on layered trees. Rank opens the next upgrade band —
        stocking the shelf is still what scores baskets.
      </HelpCard>

      <ConfirmModal
        open={!!confirm}
        spec={confirm}
        reducedMotion={reducedMotion}
        onClose={() => setConfirm(null)}
      />
    </Panel>
  )
}

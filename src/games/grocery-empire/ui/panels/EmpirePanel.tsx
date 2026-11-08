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
import { GrowthStrip } from '../components/GrowthStrip'
import { HelpCard } from '../components/HelpCard'
import { HungryLawsBoard } from '../components/HungryLaws'
import { Panel } from '../components/Panel'

const BRANCHES: PerkBranch[] = ['floorcraft', 'ledger', 'charter']

function perkVisible(s: Parameters<NonNullable<PerkDef['visible']>>[0], p: PerkDef) {
  if (!p.visible) return true
  try {
    return !!p.visible(s)
  } catch {
    return false
  }
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
      <GrowthStrip mode="memory" />
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

        {points > 0 || spent > 0 ? (
          <div className="ge-doctrine-board">
            {BRANCHES.map((branch) => {
              const meta = PERK_BRANCHES[branch]
              const list = PERKS.filter((p) => p.branch === branch && perkVisible(s, p))
              return (
                <div key={branch} className="ge-doctrine-col">
                  <header className="ge-doctrine-col__head">
                    <h4>{meta.name}</h4>
                    <p>{meta.blurb}</p>
                  </header>
                  {list.map((p) => {
                    const lvl = s.empire.perks[p.id] ?? 0
                    const maxed = lvl >= p.max
                    const reqOk =
                      !p.requires?.length ||
                      p.requires.every((r) => (s.empire.perks[r.id] ?? 0) >= r.level)
                    let exclusiveBlock: string | null = null
                    if (p.exclusive) {
                      for (const other of PERKS) {
                        if (other.id === p.id || other.exclusive !== p.exclusive) continue
                        if ((s.empire.perks[other.id] ?? 0) > 0) {
                          exclusiveBlock = other.name
                          break
                        }
                      }
                    }
                    const canBuy = !maxed && points >= p.cost && reqOk && !exclusiveBlock
                    const locked = !reqOk || !!exclusiveBlock
                    return (
                      <article
                        key={p.id}
                        className={`ge-perk-card${canBuy ? ' is-ready' : ''}${
                          maxed ? ' is-max' : ''
                        }${locked && !maxed ? ' is-locked' : ''}`.trim()}
                        onClick={() => setFocusId(p.id)}
                      >
                        <div className="ge-perk-card__top">
                          <strong>{p.name}</strong>
                          <span className="ge-perk-card__lvl">
                            {lvl}/{p.max}
                          </span>
                        </div>
                        <p>{p.per}</p>
                        {exclusiveBlock ? (
                          <p className="ge-muted" style={{ fontSize: '0.65rem', margin: 0 }}>
                            Other path: {exclusiveBlock}
                          </p>
                        ) : !reqOk ? (
                          <p className="ge-muted" style={{ fontSize: '0.65rem', margin: 0 }}>
                            Needs{' '}
                            {(p.requires ?? [])
                              .map((r) => `${PERK_BY_ID[r.id]?.name ?? r.id} ${r.level}`)
                              .join(', ')}
                          </p>
                        ) : null}
                        <div className="ge-perk-card__pips" aria-hidden>
                          {Array.from({ length: p.max }, (_, i) => (
                            <i key={i} className={i < lvl ? 'is-on' : undefined} />
                          ))}
                        </div>
                        <Btn
                          tone={canBuy ? 'primary' : 'ghost'}
                          coachId={`perk-${p.id}`}
                          disabled={!canBuy}
                          onClick={(e) => {
                            e.stopPropagation()
                            dispatch({ type: 'buyPerk', id: p.id })
                          }}
                        >
                          {maxed ? 'Maxed' : exclusiveBlock ? 'Forked' : `${p.cost} trait pt`}
                        </Btn>
                      </article>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="ge-muted">Level up once to earn a trait point.</p>
        )}

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

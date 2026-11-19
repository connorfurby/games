import { useMemo, useState } from 'react'
import { EMPIRE_REWARDS, empireUnlocked, nextEmpireReward } from '../../content/empireRewards'
import { PROJECTS } from '../../content/projects'
import { STAT_IDS, STAT_INFO } from '../../content/upgrades/stats'
import { REBRAND } from '../../sim/balance'
import { can } from '../../sim/commands'
import { withCurtain } from '../components/curtainBus'
import { engine } from '../../sim/engine'
import { empireXpToNext } from '../../sim/formulas'
import { canCarry, canRebrand, pendingGoodwill, type RebrandCarry } from '../../sim/systems/prestige'
import { statSources, statTable } from '../../sim/systems/stats'
import { ConfirmModal } from '../components/ConfirmModal'
import { PrestigeKeepSheet } from '../components/PrestigeKeepSheet'
import { useGame } from '../GameContext'
import { clock, money, qty } from '../format'
import { Button, Meter, SegmentedControl, Sheet } from '../kit'
import { PlayFrame, StatusChip } from '../play'
import { RankHallScene } from '../scenes/live'
import { EmpireSections } from './EmpirePanel'

function mulText(n: number) {
  if (n >= 100) return `×${qty(n)}`
  return `×${n.toFixed(n >= 10 ? 1 : 2)}`
}

type BoardTab = 'rewards' | 'projects' | 'totals'

export function EmpireBoard() {
  const { state: s, tick, dispatch, numberFormat, reducedMotion } = useGame()
  const lv = s.empire.level
  const need = Math.max(1, empireXpToNext(lv))
  const next = nextEmpireReward(lv)
  const xpLeft = Math.max(0, need - s.empire.xp)
  const table = useMemo(() => statTable(s), [tick, s])
  const sourceCount = useMemo(() => statSources(s).length, [tick, s])
  const projectsOpen = empireUnlocked(lv, 'projects')
  const crews = empireUnlocked(lv, 'second-project') ? 2 : 1
  const boosted = STAT_IDS.filter((k) => (table[k] ?? 1) > 1.0001)
  const gain = pendingGoodwill(s)
  const rebrandBlock = canRebrand(s)
  const points = s.empire.points
  const showRebrand = s.era >= REBRAND.minEra || s.rebrand.count > 0
  const [confirm, setConfirm] = useState(false)
  const [carry, setCarry] = useState<RebrandCarry>(null)
  const [boardTab, setBoardTab] = useState<BoardTab>('rewards')

  const eraProjects = PROJECTS.filter((p) => {
    const owned = !!s.projects.done[p.id] || s.projects.active.some((a) => a.id === p.id)
    return p.era === s.era || owned
  })

  // Primary verb: put cash to work on a project if the board is open, otherwise go spend it on Upgrades.
  const openProjects = projectsOpen
    ? eraProjects.filter((p) => !s.projects.done[p.id] && !s.projects.active.some((a) => a.id === p.id))
    : []
  const projectPick =
    openProjects.find((p) => can(s, { type: 'startProject', id: p.id }).ok) ?? openProjects[0] ?? null
  const projectCheck = projectPick ? can(s, { type: 'startProject', id: projectPick.id }) : null

  const goDoctrine = () =>
    document
      .querySelector('.pf-desk--doctrine')
      ?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' })
  const primary = points > 0
    ? {
        label: `Spend ${points} trait point${points > 1 ? 's' : ''}`,
        tone: 'free' as const,
        size: 'lg' as const,
        coachId: 'empire-doctrine',
        onClick: goDoctrine,
      }
    : projectPick
    ? {
        label: `Start ${projectPick.name}`,
        tone: projectCheck?.ok ? ('free' as const) : ('primary' as const),
        size: 'lg' as const,
        feedback: true,
        affordable: !!projectCheck?.ok,
        cost: money(projectPick.cash, numberFormat),
        disabled: !projectCheck?.ok,
        title: projectCheck?.ok ? `${clock(projectPick.seconds)} build` : projectCheck?.reason,
        onClick: () => {
          setBoardTab('projects')
          dispatch({ type: 'startProject', id: projectPick.id })
        },
      }
    : null

  return (
    <section className="e2">
      <PlayFrame
        purpose="Baskets earn the next rank."
        department="Empire"
        room={
          <div data-coach-id="empire-rank">
            <RankHallScene />
          </div>
        }
        tray={
          primary
            ? {
                primary,
                failReason: points <= 0 && projectPick && !projectCheck?.ok ? projectCheck?.reason : undefined,
              }
            : undefined
        }
        desks={
          <>
            <EmpireSections
              doctrineOpen
              autoOpen
              onDoctrineClose={() => {}}
              onAutoClose={() => {}}
            />
            <Sheet open onClose={() => {}} title="Rebrand" deskHidden={!showRebrand}>
              <p className="ge-muted">
                Start the store over for Goodwill. Each point adds {Math.round(REBRAND.valuePerGoodwill * 100)}% to
                every basket, for good.
              </p>
              {rebrandBlock ? (
                <p className="ge-muted">Not yet: {rebrandBlock}</p>
              ) : (
                <Button tone="danger" onClick={() => setConfirm(true)}>
                  Rebrand{gain > 0 ? ` · +${gain} Goodwill` : ''}
                </Button>
              )}
            </Sheet>
          </>
        }
      >
        <div className="p6-stack">
          {s.autonomous ? (
            <div data-coach-id="empire-autonomous">
              <StatusChip tone="ready" title="Habits run from Books.">
                Autonomous live
              </StatusChip>
            </div>
          ) : null}

          <SegmentedControl
            aria-label="Empire board"
            value={boardTab}
            onChange={(v) => setBoardTab(v as BoardTab)}
            options={[
              { value: 'rewards', label: 'Rewards' },
              { value: 'projects', label: 'Projects', badge: eraProjects.length || undefined },
              { value: 'totals', label: 'Totals' },
            ]}
          />

          {boardTab === 'rewards' ? (
            <section className="p6-stack" aria-label="Rank rewards">
              <Meter
                value={s.empire.xp}
                max={need}
                tone="accent"
                label={next ? `Rank ${lv} → ${lv + 1}` : `Rank ${lv}`}
                eta={`${xpLeft < 1000 ? Math.ceil(xpLeft) : qty(xpLeft)} XP`}
              />
              {/* The rank hall above already names the last and next reward; here, just what the next one does. */}
              {next?.blurb ? (
                <p className="ge-muted">
                  At rank {next.level}: {next.blurb}
                </p>
              ) : null}
              <details>
                <summary className="e2-summary">See all {EMPIRE_REWARDS.length} rewards</summary>
                <ol className="e2-track">
                  {EMPIRE_REWARDS.map((r) => {
                    const got = lv >= r.level
                    return (
                      <li
                        key={r.level}
                        className={`e2-reward${got ? ' is-got' : ''}${next?.level === r.level ? ' is-next' : ''}`}
                        title={r.blurb}
                      >
                        <span className="e2-reward__lv">{r.level}</span>
                        <span className="e2-reward__name">{r.name}</span>
                      </li>
                    )
                  })}
                </ol>
              </details>
            </section>
          ) : null}

          {boardTab === 'projects' ? (
            <section className="p6-stack" aria-label="Projects">
              <p className="ge-muted">
                {projectsOpen
                  ? `${crews} crew${crews > 1 ? 's' : ''} on this era's builds.`
                  : 'The Projects board opens at Empire 15.'}
              </p>
              <div className="e2-project-grid">
                {eraProjects.map((p) => {
                  const done = !!s.projects.done[p.id]
                  const active = s.projects.active.find((a) => a.id === p.id)
                  const check = can(s, { type: 'startProject', id: p.id })
                  const left = active ? Math.max(0, active.endsAt - s.time) : 0
                  const prog = active ? 1 - left / p.seconds : done ? 1 : 0
                  return (
                    <article
                      key={p.id}
                      className={`e2-project${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
                    >
                      <h4>{p.name}</h4>
                      <p className="e2-project__blurb">{p.blurb}</p>
                      <p className="e2-project__fx">
                        {p.effects.map((e) => `+${Math.round(e.per * 100)}% ${STAT_INFO[e.stat].label}`).join(', ')}
                      </p>
                      <div className="u2-node__meter">
                        <span style={{ transform: `scaleX(${prog})` }} />
                      </div>
                      <footer className="e2-project__foot">
                        {done ? (
                          <span className="u2-node__status">Built</span>
                        ) : active ? (
                          <span className="u2-node__status">{clock(left)} left</span>
                        ) : (
                          <>
                            <span className="u2-node__status">{clock(p.seconds)}</span>
                            <Button
                              tone="secondary"
                              size="sm"
                              disabled={!check.ok}
                              title={check.ok ? 'Start building' : check.reason}
                              cost={money(p.cash, numberFormat)}
                              onClick={() => dispatch({ type: 'startProject', id: p.id })}
                            >
                              Start
                            </Button>
                          </>
                        )}
                      </footer>
                    </article>
                  )
                })}
              </div>
            </section>
          ) : null}

          {boardTab === 'totals' ? (
            <section className="p6-stack" aria-label="Your multipliers">
              <p className="ge-muted" title="Upgrades, doctrines, rewards, and projects.">
                {sourceCount} sources feed these multipliers.
              </p>
              {boosted.length === 0 ? (
                <p className="ge-muted">Buy an upgrade rank and it shows up here.</p>
              ) : (
                <dl className="e2-statlist">
                  {boosted.map((k) => (
                    <div key={k} className="e2-stat">
                      <dt>{STAT_INFO[k].kind === 'cut' ? `Cheaper ${STAT_INFO[k].label}` : STAT_INFO[k].label}</dt>
                      <dd>{STAT_INFO[k].kind === 'cut' ? `÷${(table[k] ?? 1).toFixed(2)}` : mulText(table[k] ?? 1)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ) : null}

        </div>
      </PlayFrame>

      <ConfirmModal
        open={confirm}
        reducedMotion={reducedMotion}
        spec={{
          title: 'Rebrand the store?',
          body: `You'll start a fresh store with ${s.rebrand.goodwill + gain} Goodwill and keep Empire ${lv}.`,
          detail: 'Cash, stores, upgrades, memos and projects reset. This can’t be undone.',
          sheet: <PrestigeKeepSheet state={s} mode="rebrand" carry={carry} onCarry={setCarry} />,
          confirmLabel: 'Rebrand',
          tone: 'danger',
          onConfirm: () => {
            const keep = canCarry(s, carry) ? null : carry
            setCarry(null)
            withCurtain('Under new management', () => engine.rebrand(keep), `Goodwill ${s.rebrand.goodwill + gain}`)
          },
        }}
        onClose={() => setConfirm(false)}
      />
    </section>
  )
}

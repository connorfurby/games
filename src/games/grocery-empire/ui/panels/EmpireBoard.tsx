import { useMemo, useState } from 'react'
import { engine } from '../../sim/engine'
import { canRebrand, pendingGoodwill } from '../../sim/systems/prestige'
import { ConfirmModal } from '../components/ConfirmModal'
import { EMPIRE_REWARDS, empireUnlocked, nextEmpireReward } from '../../content/empireRewards'
import { PROJECTS } from '../../content/projects'
import { STAT_IDS, STAT_INFO } from '../../content/upgrades/stats'
import { EMPIRE, REBRAND } from '../../sim/balance'
import { can } from '../../sim/commands'
import { empireXpToNext } from '../../sim/formulas'
import { statSources, statTable } from '../../sim/systems/stats'
import { HubStage } from '../components/HubStage'
import { useGame } from '../GameContext'
import { useTween } from '../fx'
import { clock, money, qty } from '../format'
import { Button, ScreenHeader, Stat, Tabs } from '../kit'
import { RankHallScene } from '../scenes/live/RankHallScene'
import { EmpireSections } from './EmpirePanel'

function mulText(n: number) {
  if (n >= 100) return `×${qty(n)}`
  return `×${n.toFixed(n >= 10 ? 1 : 2)}`
}

export function EmpireBoard() {
  const { state: s, tick, dispatch, numberFormat, reducedMotion } = useGame()
  const lv = s.empire.level
  const need = Math.max(1, empireXpToNext(lv))
  const fillRaw = Math.max(0, Math.min(1, s.empire.xp / need))
  const fill = useTween(fillRaw, { duration: reducedMotion ? 0 : 480, reducedMotion })
  const next = nextEmpireReward(lv)
  const last = [...EMPIRE_REWARDS].reverse().find((r) => lv >= r.level) ?? null
  const xpLeft = Math.max(0, need - s.empire.xp)
  const table = useMemo(() => statTable(s), [tick, s])
  const sourceCount = useMemo(() => statSources(s).length, [tick, s])
  const projectsOpen = empireUnlocked(lv, 'projects')
  const crews = empireUnlocked(lv, 'second-project') ? 2 : 1
  const boosted = STAT_IDS.filter((k) => (table[k] ?? 1) > 1.0001)
  const gain = pendingGoodwill(s)
  const rebrandBlock = canRebrand(s)
  const [confirm, setConfirm] = useState(false)
  const [boardTab, setBoardTab] = useState<'rewards' | 'projects' | 'totals'>('rewards')
  const showRebrand = s.era >= REBRAND.minEra || s.rebrand.count > 0
  const eraProjects = PROJECTS.filter((p) => {
    const owned = !!s.projects.done[p.id] || s.projects.active.some((a) => a.id === p.id)
    return p.era === s.era || owned
  })

  return (
    <div className="e2">
      <section className="ge-panel e2-hero">
        <ScreenHeader
          hub
          title="Empire"
          purpose="Baskets earn the next rank."
          stats={
            <>
              <Stat
                size="sm"
                label="Rank"
                value={`${lv}/${EMPIRE.maxLevel}`}
                title={`${Math.round(fillRaw * 100)}% to next${xpLeft > 0 ? ` · ${xpLeft < 1000 ? Math.ceil(xpLeft) : qty(xpLeft)} XP left` : ''}`}
              />
              <Stat size="sm" label="Points" value={s.empire.points} title="Trait points for doctrines" />
            </>
          }
          actions={
            showRebrand ? (
              <Button
                tone="primary"
                size="sm"
                disabled={!!rebrandBlock}
                title={
                  rebrandBlock ??
                  `Start over with Goodwill. Each point adds ${Math.round(REBRAND.valuePerGoodwill * 100)}% basket value${gain > 0 ? ` · +${gain} now` : ''}.`
                }
                cost={gain > 0 ? `+${gain}` : undefined}
                onClick={() => setConfirm(true)}
              >
                {rebrandBlock ? 'Not yet' : 'Rebrand'}
              </Button>
            ) : null
          }
        />
        <HubStage
          className="e2-hero__stage"
          scene={<RankHallScene />}
          primary={
            <aside className="e2-hero__side" aria-label="Rank actions">
              <div className="e2-hero__copy" data-coach-id="empire-rank">
                <div className="e2-xp" aria-label="Progress to next rank">
                  <span style={{ transform: `scaleX(${fill})` }} />
                </div>
                <p className="e2-hero__next" title={next?.blurb}>
                  {next ? `Next: Empire ${next.level}, ${next.name}.` : 'Every reward is yours.'}
                  {last ? ` Last was ${last.name}.` : ''}
                </p>
              </div>
            </aside>
          }
        />
        <ConfirmModal
          open={confirm}
          reducedMotion={reducedMotion}
          spec={{
            title: 'Rebrand the store?',
            body: `You'll start a fresh store with ${s.rebrand.goodwill + gain} Goodwill and keep Empire ${lv}.`,
            detail: 'Cash, stores, upgrades, memos and projects reset. This can’t be undone.',
            confirmLabel: 'Rebrand',
            tone: 'danger',
            onConfirm: () => {
              engine.rebrand()
            },
          }}
          onClose={() => setConfirm(false)}
        />
      </section>

      <Tabs
        aria-label="Empire board"
        value={boardTab}
        onChange={setBoardTab}
        options={[
          { value: 'rewards', label: 'Rewards' },
          { value: 'projects', label: 'Projects', badge: eraProjects.length || undefined },
          { value: 'totals', label: 'Totals' },
        ]}
      />

      {boardTab === 'rewards' ? (
      <section className="ge-panel e2-rewards" aria-label="Rank rewards">
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
      </section>
      ) : null}

      {boardTab === 'projects' ? (
      <section className="ge-panel e2-projects" aria-label="Projects">
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
              <article key={p.id} className={`e2-project${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}>
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
      <section className="ge-panel e2-stats" aria-label="Your multipliers">
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

      <EmpireSections />
    </div>
  )
}

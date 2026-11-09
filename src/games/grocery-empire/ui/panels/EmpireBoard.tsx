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
import { useGame } from '../GameContext'
import { clock, money, qty } from '../format'
import { EmpirePanel } from './EmpirePanel'

function mulText(n: number) {
  if (n >= 100) return `×${qty(n)}`
  return `×${n.toFixed(n >= 10 ? 1 : 2)}`
}

export function EmpireBoard() {
  const { state: s, tick, dispatch, numberFormat, reducedMotion } = useGame()
  const lv = s.empire.level
  const need = Math.max(1, empireXpToNext(lv))
  const fill = Math.max(0, Math.min(1, s.empire.xp / need))
  const next = nextEmpireReward(lv)
  const table = useMemo(() => statTable(s), [tick, s])
  const sourceCount = useMemo(() => statSources(s).length, [tick, s])
  const projectsOpen = empireUnlocked(lv, 'projects')
  const crews = empireUnlocked(lv, 'second-project') ? 2 : 1
  const boosted = STAT_IDS.filter((k) => (table[k] ?? 1) > 1.0001)
  const gain = pendingGoodwill(s)
  const rebrandBlock = canRebrand(s)
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="e2">
      <section className="ge-panel e2-hero">
        <div className="e2-rank" style={{ ['--fill' as string]: String(fill) }}>
          <span className="e2-rank__label">Empire</span>
          <strong className="e2-rank__num">{lv}</strong>
          <span className="e2-rank__of">of {EMPIRE.maxLevel}</span>
        </div>
        <div className="e2-hero__copy">
          <h2 className="ge-panel__title">Your empire</h2>
          <p className="ge-panel__purpose">
            Baskets earn rank. Every level gives a trait point; every fifth level gives a lasting reward.
          </p>
          <div className="e2-xp" aria-label="Progress to next rank">
            <span style={{ transform: `scaleX(${fill})` }} />
          </div>
          <p className="e2-hero__next">
            {next ? (
              <>
                <strong>Empire {next.level}: {next.name}.</strong> {next.blurb}
              </>
            ) : (
              'Every reward is yours.'
            )}
          </p>
          <p className="e2-hero__points">
            {s.empire.points > 0 ? `${s.empire.points} trait points to spend below.` : 'No trait points waiting.'}
          </p>
        </div>
      </section>

      {s.era >= REBRAND.minEra || s.rebrand.count > 0 ? (
        <section className="ge-panel e2-rebrand" aria-label="Rebrand">
          <div>
            <h3 className="e2-h3">Rebrand</h3>
            <p className="ge-muted">
              Start a fresh store under a new sign. You keep your Empire rank, trait points and doctrines; the store,
              chain, upgrades and cash start over. Goodwill makes every basket worth more, forever.
            </p>
            <p className="e2-rebrand__now">
              Goodwill {s.rebrand.goodwill}
              {gain > 0 ? ` → ${s.rebrand.goodwill + gain} if you rebrand now (+${gain})` : ''}. Each point adds{' '}
              {Math.round(REBRAND.valuePerGoodwill * 100)}% basket value and {Math.round(REBRAND.demandPerGoodwill * 100)}%
              shoppers.
            </p>
          </div>
          <button
            type="button"
            className="g2-tag"
            disabled={!!rebrandBlock}
            title={rebrandBlock ?? 'Start over with Goodwill'}
            onClick={() => setConfirm(true)}
          >
            <span className="g2-tag__price">+{gain} Goodwill</span>
            <span className="g2-tag__label">{rebrandBlock ? 'Not yet' : 'Rebrand'}</span>
          </button>
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
      ) : null}

      <section className="ge-panel e2-rewards" aria-label="Rank rewards">
        <h3 className="e2-h3">Rank rewards</h3>
        <ol className="e2-track">
          {EMPIRE_REWARDS.map((r) => {
            const got = lv >= r.level
            return (
              <li key={r.level} className={`e2-reward${got ? ' is-got' : ''}${next?.level === r.level ? ' is-next' : ''}`} title={r.blurb}>
                <span className="e2-reward__lv">{r.level}</span>
                <span className="e2-reward__name">{r.name}</span>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="ge-panel e2-projects" aria-label="Projects">
        <header className="e2-section-head">
          <h3 className="e2-h3">Projects</h3>
          <p className="ge-muted">
            {projectsOpen
              ? `Long builds that keep running while you're away. ${crews} crew${crews > 1 ? 's' : ''}.`
              : 'The Projects board opens at Empire 15.'}
          </p>
        </header>
        <div className="e2-project-grid">
          {PROJECTS.filter((p) => p.era <= s.era + 1).map((p) => {
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
                      <button
                        type="button"
                        className="g2-tag g2-tag--small"
                        disabled={!check.ok}
                        title={check.ok ? 'Start building' : check.reason}
                        onClick={() => dispatch({ type: 'startProject', id: p.id })}
                      >
                        <span className="g2-tag__price">{money(p.cash, numberFormat)}</span>
                      </button>
                    </>
                  )}
                </footer>
              </article>
            )
          })}
        </div>
      </section>

      <section className="ge-panel e2-stats" aria-label="Your multipliers">
        <header className="e2-section-head">
          <h3 className="e2-h3">What everything adds up to</h3>
          <p className="ge-muted">
            {sourceCount} upgrades, doctrines, rewards and projects feed these multipliers.
          </p>
        </header>
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

      <div className="e2-legacy">
        <EmpirePanel />
      </div>
    </div>
  )
}

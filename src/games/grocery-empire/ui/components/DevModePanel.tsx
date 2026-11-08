import { useState } from 'react'
import {
  applyDevStage,
  devGrantAttention,
  devGrantBaskets,
  devGrantCash,
  devGrantIncome,
  devSkipIntroAndCoach,
  devSkipTime,
  devUnlockAllMenus,
  wipeDevSandbox,
} from '../../sim/devMode'
import { listDevStages } from '../../sim/devStages'
import { emptyMuseum } from '../../sim/museum'
import { RARITIES, RELICS } from '../../content/relics'
import { museumStore } from '../museum/store'
import { useGame } from '../GameContext'
import { money } from '../format'

/** DevMode sandbox tools: stage jumps, time skips, grants. Only shown on the dev save. */
export function DevModePanel() {
  const { state: s, numberFormat } = useGame()
  const [msg, setMsg] = useState('')
  const stages = listDevStages()
  const act = (label: string, fn: () => void) => () => {
    fn()
    setMsg(label)
  }

  return (
    <div className="dv">
      <p className="dv-note">Separate save. Nothing here touches your campaign, tokens or awards.</p>

      <section className="dv-block">
        <h4>Jump to a stage</h4>
        <div className="dv-stages">
          {stages.map((st) => (
            <button
              key={st.id}
              type="button"
              className="ge-dev-stage dv-stage"
              title={st.blurb}
              onClick={() => setMsg(applyDevStage(st.id) ? `Loaded ${st.label}` : 'Stage failed.')}
            >
              <strong>{st.label}</strong>
              <span>{st.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="dv-block">
        <h4>Skip time</h4>
        <div className="dv-row">
          {[
            ['+1 min', 60],
            ['+10 min', 600],
            ['+1 h', 3600],
            ['+8 h', 8 * 3600],
          ].map(([label, sec]) => (
            <button key={label} type="button" className="dv-btn" onClick={act(`Skipped ${label}`, () => devSkipTime(sec as number))}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="dv-block">
        <h4>Grant</h4>
        <div className="dv-row">
          <button type="button" className="dv-btn" onClick={act('+$1,000', () => devGrantCash(1000))}>
            +$1k
          </button>
          <button
            type="button"
            className="dv-btn"
            title={`About ${money(Math.max(1000, s.rates.revenuePerSec * 600), numberFormat)} right now`}
            onClick={act('+10 min of income', () => devGrantIncome(10))}
          >
            +10 min income
          </button>
          <button
            type="button"
            className="dv-btn"
            title={`About ${money(Math.max(1000, s.rates.revenuePerSec * 3600), numberFormat)} right now`}
            onClick={act('+1 h of income', () => devGrantIncome(60))}
          >
            +1 h income
          </button>
          <button type="button" className="dv-btn" onClick={act('+1,000 baskets', () => devGrantBaskets(1000))}>
            +1k baskets
          </button>
          <button type="button" className="dv-btn" onClick={act('Attention filled', devGrantAttention)}>
            Fill Attention
          </button>
        </div>
      </section>

      <section className="dv-block">
        <h4>Museum (sandbox copy)</h4>
        <div className="dv-row">
          <button
            type="button"
            className="dv-btn"
            onClick={act('One chest of each rarity', () =>
              museumStore.update((m) => {
                m.unlocked = true
                for (const r of RARITIES) m.chests.push({ id: `c${m.nextChestId++}`, rarity: r, wing: null, source: 'DevMode', at: Date.now() })
              }),
            )}
          >
            +1 chest each rarity
          </button>
          <button
            type="button"
            className="dv-btn"
            onClick={act('+10 rare chests', () =>
              museumStore.update((m) => {
                m.unlocked = true
                for (let i = 0; i < 10; i++) m.chests.push({ id: `c${m.nextChestId++}`, rarity: 'rare', wing: null, source: 'DevMode', at: Date.now() })
              }),
            )}
          >
            +10 rare chests
          </button>
          <button
            type="button"
            className="dv-btn"
            onClick={act('Every relic revealed (sandbox only)', () =>
              museumStore.update((m) => {
                m.unlocked = true
                for (const r of RELICS) m.relics[r.id] ??= { at: Date.now(), n: 1 }
              }),
            )}
          >
            Reveal all relics
          </button>
          <button type="button" className="dv-btn" onClick={act('+500 dust', () => museumStore.update((m) => void (m.dust += 500)))}>
            +500 dust
          </button>
          <button type="button" className="dv-btn dv-btn--danger" onClick={act('Museum reset', () => museumStore.update((m) => void Object.assign(m, emptyMuseum())))}>
            Reset museum
          </button>
        </div>
      </section>

      <section className="dv-block">
        <h4>Sandbox</h4>
        <div className="dv-row">
          <button type="button" className="dv-btn" onClick={act('Menus unlocked', devUnlockAllMenus)}>
            Unlock all menus
          </button>
          <button type="button" className="dv-btn" onClick={act('Intro and coach cleared', devSkipIntroAndCoach)}>
            Skip intro and coach
          </button>
          <button
            type="button"
            className="dv-btn dv-btn--danger"
            onClick={() => {
              if (!window.confirm('Wipe the DevMode sandbox? Your campaign save is untouched.')) return
              wipeDevSandbox()
              setMsg('Sandbox wiped')
            }}
          >
            Wipe sandbox
          </button>
        </div>
      </section>

      {msg ? (
        <p className="dv-msg" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  )
}

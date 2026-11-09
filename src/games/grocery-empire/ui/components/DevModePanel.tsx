import { useState, useSyncExternalStore } from 'react'
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
import { money, qty } from '../format'
import { nextGoal } from '../../content/goals'
import { TREE_IDS, TREES } from '../../content/upgrades/types'
import { STAT_IDS, STAT_INFO } from '../../content/upgrades/stats'
import { DEV_FIELDS, devChain, devLoop, devRivals, devSet, devSetEra, devUpgrades, fastForward, type FFResult } from '../../sim/devTools'
import { demandBreakdown, salesBottleneck } from '../../sim/formulas'
import { networkBreakdown, valueBreakdown } from '../../sim/systems/network'
import { statTable } from '../../sim/systems/stats'

/** DevMode sandbox tools: stage jumps, time skips, grants. Only shown on the dev save. */
function DevPlay() {
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

      <DevAutopilot />

      <section className="dv-block">
        <h4>Skip time (offline rules, no bot)</h4>
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


// ── Autopilot, turbo and fast-forward ───────────────────────────────────────

function useDevLoop() {
  useSyncExternalStore(devLoop.subscribe, devLoop.version, devLoop.version)
  return devLoop.get()
}

function DevAutopilot() {
  const loop = useDevLoop()
  const { state: s, numberFormat } = useGame()
  const [ff, setFF] = useState<{ p: number; cancel: () => void } | null>(null)
  const [res, setRes] = useState<FFResult | null>(null)
  const [useBot, setUseBot] = useState(true)
  const goal = nextGoal(s)

  const go = (sec: number) => {
    setRes(null)
    const cancel = fastForward(sec, {
      bot: useBot,
      onProgress: (p) => setFF((f) => (f ? { ...f, p } : f)),
      onDone: (r) => {
        setFF(null)
        setRes(r)
      },
    })
    setFF({ p: 0, cancel })
  }

  return (
    <section className="dv-block dv-auto">
      <h4>Autopilot & time</h4>
      <div className="dv-row">
        <button type="button" className={`dv-btn${loop.autopilot ? ' is-on' : ''}`} onClick={() => devLoop.setAutopilot(!loop.autopilot)}>
          {loop.autopilot ? '■ Stop autopilot' : '▶ Autopilot'}
        </button>
        {[0, 8, 32, 128, 512].map((x) => (
          <button key={x} type="button" className={`dv-btn${loop.turbo === x ? ' is-on' : ''}`} onClick={() => devLoop.setTurbo(x)}>
            {x === 0 ? 'Turbo off' : `+${x}×`}
          </button>
        ))}
      </div>
      <p className="dv-note">
        {loop.autopilot ? `Bot is playing: ${loop.actions} actions, last “${loop.lastAction || '—'}”. ` : 'The campaign bot plays your sandbox, chasing the Next goal. '}
        Goal: {goal?.title ?? 'done'} · {money(s.rates.revenuePerSec, numberFormat)}/s
      </p>

      <h4>Fast-forward (headless)</h4>
      <div className="dv-row">
        <label className="dv-check">
          <input type="checkbox" checked={useBot} onChange={(e) => setUseBot(e.target.checked)} /> with bot
        </label>
        {[
          ['10 min', 600],
          ['1 h', 3600],
          ['4 h', 4 * 3600],
          ['12 h', 12 * 3600],
        ].map(([label, sec]) => (
          <button key={label} type="button" className="dv-btn" disabled={!!ff} onClick={() => go(sec as number)}>
            {label}
          </button>
        ))}
        {ff ? (
          <button type="button" className="dv-btn dv-btn--danger" onClick={() => (ff.cancel(), setFF(null))}>
            Cancel
          </button>
        ) : null}
      </div>
      {ff ? (
        <div className="dv-progress">
          <i style={{ transform: `scaleX(${ff.p})` }} />
        </div>
      ) : null}
      {res ? <FFChart r={res} /> : null}
    </section>
  )
}

/** Income (log scale) over the fast-forward, with era changes marked. */
function FFChart({ r }: { r: FFResult }) {
  const W = 400
  const H = 120
  const pts = r.samples
  if (pts.length < 2) return null
  const ys = pts.map((p) => Math.log10(Math.max(1, p.rev)))
  const lo = Math.min(...ys)
  const hi = Math.max(lo + 1, ...ys)
  const x = (t: number) => (t / r.seconds) * W
  const y = (v: number) => H - 14 - ((v - lo) / (hi - lo)) * (H - 26)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(ys[i]!).toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]!
  return (
    <figure className="dv-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Income over the fast-forward">
        {Object.entries(r.eraAt)
          .filter(([, t]) => t > 0)
          .map(([e, t]) => (
            <g key={e}>
              <line x1={x(t)} x2={x(t)} y1={0} y2={H - 12} stroke="var(--g2-tag)" strokeDasharray="3 3" opacity={0.6} />
              <text x={x(t) + 3} y={10} className="dv-chart__era">
                E{e}
              </text>
            </g>
          ))}
        <path d={d} fill="none" stroke="#7fd3a0" strokeWidth={2} />
        <text x={2} y={H - 2} className="dv-chart__axis">
          $10^{lo.toFixed(0)}/s
        </text>
        <text x={W - 2} y={H - 2} textAnchor="end" className="dv-chart__axis">
          {(r.seconds / 3600).toFixed(1)} h · $10^{hi.toFixed(1)}/s
        </text>
      </svg>
      <figcaption>
        Ran {(r.seconds / 60).toFixed(0)} min in {(r.ms / 1000).toFixed(1)} s · ends Era {last.era}, rank {last.empire} · next: {last.goal}
        {Object.keys(r.eraAt).length > 1
          ? ` · eras at ${Object.entries(r.eraAt)
              .filter(([, t]) => t > 0)
              .map(([e, t]) => `E${e} ${(t / 60).toFixed(0)}m`)
              .join(', ')}`
          : ''}
      </figcaption>
    </figure>
  )
}

// ── Edit ────────────────────────────────────────────────────────────────────

function DevEdit() {
  const { state: s, numberFormat } = useGame()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [tree, setTree] = useState<string>('')
  return (
    <div className="dv">
      <section className="dv-block">
        <h4>Era</h4>
        <div className="dv-row">
          {[0, 1, 2, 3, 4, 5, 6].map((e) => (
            <button key={e} type="button" className={`dv-btn${s.era === e ? ' is-on' : ''}`} onClick={() => devSetEra(e)}>
              Era {e}
            </button>
          ))}
        </div>
      </section>
      <section className="dv-block">
        <h4>Values</h4>
        <div className="dv-fields">
          {DEV_FIELDS.map((f) => (
            <form
              key={f.id}
              className="dv-field"
              onSubmit={(e) => {
                e.preventDefault()
                const raw = drafts[f.id]
                if (raw == null || raw === '') return
                devSet(f.id, Number(raw))
                setDrafts((d) => ({ ...d, [f.id]: '' }))
              }}
            >
              <label>
                <span>{f.label}</span>
                <small>{f.id === 'brand' ? f.get(s).toFixed(2) : qty(f.get(s), numberFormat)}</small>
              </label>
              <input
                inputMode="decimal"
                placeholder="1e9"
                value={drafts[f.id] ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
              />
              <button type="submit" className="dv-btn">
                Set
              </button>
            </form>
          ))}
        </div>
      </section>
      <section className="dv-block">
        <h4>Upgrades</h4>
        <div className="dv-row">
          <select className="dv-select" value={tree} onChange={(e) => setTree(e.target.value)}>
            <option value="">All trees</option>
            {TREE_IDS.map((t) => (
              <option key={t} value={t}>
                {TREES[t].name}
              </option>
            ))}
          </select>
          <button type="button" className="dv-btn" onClick={() => devUpgrades('max', tree || undefined)}>
            Max
          </button>
          <button type="button" className="dv-btn" onClick={() => devUpgrades('half', tree || undefined)}>
            Half
          </button>
          <button type="button" className="dv-btn dv-btn--danger" onClick={() => devUpgrades('reset', tree || undefined)}>
            Reset
          </button>
        </div>
      </section>
      <section className="dv-block">
        <h4>Chain & rivals</h4>
        <div className="dv-row">
          {[1, 4, 8, 12].map((n) => (
            <button key={n} type="button" className={`dv-btn${s.stores.length === n ? ' is-on' : ''}`} onClick={() => devChain(n)}>
              {n} store{n === 1 ? '' : 's'}
            </button>
          ))}
          <button type="button" className="dv-btn" onClick={() => devRivals('open')}>
            Open all rivals
          </button>
          <button type="button" className="dv-btn" onClick={() => devRivals('buy')}>
            Buy all rivals
          </button>
          <button type="button" className="dv-btn dv-btn--danger" onClick={() => devRivals('reset')}>
            Clear rivals
          </button>
        </div>
      </section>
    </div>
  )
}

// ── Inspect ─────────────────────────────────────────────────────────────────

function Breakdown({ title, parts, total }: { title: string; parts: Record<string, number>; total: number }) {
  const rows = Object.entries(parts).filter(([, v]) => Math.abs(v - 1) > 1e-4)
  return (
    <section className="dv-block">
      <h4>
        {title} <b className="dv-total">×{fmtMul(total)}</b>
      </h4>
      <ul className="dv-table">
        {rows.length === 0 ? <li className="dv-note">All ×1</li> : null}
        {rows
          .sort((a, b) => Math.abs(Math.log(b[1])) - Math.abs(Math.log(a[1])))
          .map(([k, v]) => (
            <li key={k} className={v < 1 ? 'is-down' : ''}>
              <span>{k}</span>
              <strong>×{fmtMul(v)}</strong>
            </li>
          ))}
      </ul>
    </section>
  )
}

function fmtMul(v: number) {
  return v >= 100 ? qty(v) : v.toFixed(v >= 10 ? 1 : 3)
}

function DevInspect() {
  const { state: s, numberFormat } = useGame()
  const table = statTable(s)
  const d = demandBreakdown(s)
  const n = networkBreakdown(s)
  const v = valueBreakdown(s)
  const goal = nextGoal(s)
  return (
    <div className="dv">
      <section className="dv-block">
        <h4>Economy now</h4>
        <ul className="dv-table">
          <li>
            <span>Revenue</span>
            <strong>{money(s.rates.revenuePerSec, numberFormat)}/s</strong>
          </li>
          <li>
            <span>Costs</span>
            <strong>{money(s.rates.costPerSec, numberFormat)}/s</strong>
          </li>
          <li>
            <span>Sold</span>
            <strong>{qty(s.rates.soldPerSec, numberFormat)}/s</strong>
          </li>
          <li>
            <span>Bottleneck</span>
            <strong>{salesBottleneck(s).kind}</strong>
          </li>
          <li>
            <span>Next goal</span>
            <strong>{goal?.title ?? 'done'}</strong>
          </li>
          <li>
            <span>Play time</span>
            <strong>{((s.stats.playSec ?? 0) / 3600).toFixed(2)} h</strong>
          </li>
        </ul>
      </section>
      <Breakdown title="Network (copies of the flagship)" parts={n.parts} total={n.total} />
      <Breakdown title="Basket value" parts={v.parts} total={v.total} />
      <Breakdown title="Demand" parts={d.parts} total={d.total} />
      <section className="dv-block">
        <h4>Stat engine (after soft cap)</h4>
        <ul className="dv-table dv-table--2">
          {STAT_IDS.map((id) => (
            <li key={id} className={Math.abs(table[id] - 1) < 1e-4 ? 'is-flat' : ''}>
              <span>{STAT_INFO[id].label}</span>
              <strong>×{table[id].toFixed(3)}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const TABS = [
  ['play', 'Play'],
  ['edit', 'Edit'],
  ['inspect', 'Inspect'],
] as const

export function DevModePanel() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('play')
  return (
    <div className="dv-wrap">
      <div className="dv-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`dv-tab${tab === id ? ' is-on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'play' ? <DevPlay /> : tab === 'edit' ? <DevEdit /> : <DevInspect />}
    </div>
  )
}

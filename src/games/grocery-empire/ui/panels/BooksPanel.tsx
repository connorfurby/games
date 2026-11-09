import { useState } from 'react'
import { CATEGORIES, CATEGORY_IDS } from '../../content/categories'
import { CAPITAL, CHAIN, DEBT, RECOVERY } from '../../sim/balance'
import {
  demandBreakdown,
  rentPerSec,
  reputationEtaSec,
  salesBottleneck,
  unitCost,
  up,
  wagesPerSec,
} from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import { canResolveBoard } from '../../sim/systems/capital'
import type { BoardAgenda } from '../../sim/state'
import type { GameState, SalesBottleneck } from '../../sim/state'
import { useGame } from '../GameContext'
import { money, qty, rate } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Line } from '../components/Line'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'
import { Sparkline } from '../components/Sparkline'
import { StatusBand } from '../components/StatusBand'

const BOARD_AGENDAS: { id: BoardAgenda; label: string; tip: string }[] = [
  { id: 'expand', label: 'Expand', tip: 'The next store costs 10% less. A little equity is set aside.' },
  { id: 'dividend', label: 'Dividend', tip: 'Turn some equity into cash. Brand takes a nick.' },
  { id: 'rnd', label: 'Shelf R&D', tip: 'Perishables last longer until the next meeting. Costs up to $400.' },
  { id: 'hours', label: 'Cut hours', tip: 'Hours snap to 1× for a short stretch. Wages ease and demand softens.' },
]

function etaLabel(sec: number): string {
  if (!Number.isFinite(sec)) return '—'
  if (sec <= 0) return 'ready'
  if (sec < 60) return `~${Math.ceil(sec)}s`
  if (sec < 3600) return `~${Math.ceil(sec / 60)} min`
  return `~${(sec / 3600).toFixed(1)} hr`
}

/** Where to send the player for each kind of bottleneck (only menus already unlocked). */
function bottleneckTarget(
  s: GameState,
  kind: SalesBottleneck,
): { menu: string; label: string } | null {
  const pick = (menu: string, label: string) => (s.menus[menu as keyof GameState['menus']] ? { menu, label } : null)
  switch (kind) {
    case 'shelf':
      return sumQty(s.backroom) > 0
        ? pick('floor', 'Go to Floor · Unpack')
        : (pick('suppliers', 'Go to Suppliers · buy a crate') ?? pick('floor', 'Go to Floor · buy a crate'))
    case 'unpack':
      return pick('staff', 'Go to Staff · hire a clerk') ?? pick('floor', 'Go to Floor · Unpack')
    case 'checkout':
      return pick('staff', 'Go to Staff · hire cashiers') ?? pick('floor', 'Go to Floor')
    case 'demand':
      return pick('floor', 'Go to Floor · price') ?? null
    default:
      return null
  }
}

/** Per-sec Attention the chain drains (mirrors tickChain). */
function chainAttentionDrain(s: GameState): number {
  if (s.era < 2 || !s.compute.unlocked || s.stores.length < 1) return 0
  const allocated = s.stores.reduce((a, st) => a + st.attentionShare, 0)
  const metroMul = s.expansions['metro-slot'] ? CHAIN.metroAttDrainMul : 1
  const softcap = !s.depot && s.stores.length >= 5 ? 1.5 : 1
  return (
    CHAIN.attentionDrainPerSec *
    allocated *
    Math.min(1.5, 0.6 + s.stores.length * 0.15) *
    metroMul *
    softcap
  )
}

export function BooksPanel() {
  const { state: s, dispatch, numberFormat, setActiveMenu } = useGame()
  // New players (first ten minutes) get the demand explainer open once.
  const [demandOpen, setDemandOpen] = useState(() => (s.stats.playSec ?? 0) < 600)
  const demand = demandBreakdown(s)
  const cashHist = s.history?.cash ?? []
  const soldHist = s.history?.sold ?? []
  const revHist = s.history?.revenue ?? []
  const meetingDue = !canResolveBoard(s)
  const nextMeetingInSec = Math.max(0, Math.ceil(s.board.nextMeetingAt - s.time))
  const rent = rentPerSec(s)
  const wages = wagesPerSec(s)
  const burn = s.rates.costPerSec
  const peak = Math.max(80, s.stats.peakCash || 80)
  const bottleneck = salesBottleneck(s)
  const repEta = reputationEtaSec(s)
  const storeRev = Math.max(0, s.rates.revenuePerSec)
  const ventureRate = s.rates.venturePerSec ?? 0
  const investYield = s.rates.investYieldPerSec ?? 0
  const incorporateBlocked =
    s.incorporated
      ? 'Already incorporated'
      : s.cash < CAPITAL.incorporateCash
        ? `Need $${CAPITAL.incorporateCash}`
        : s.compute.reputation < CAPITAL.incorporateRep
          ? `Need ${CAPITAL.incorporateRep} Rep`
          : null

  // Runway follows the till (cashPerSec), not sales minus rent alone.
  const income = storeRev + ventureRate + Math.max(0, investYield)
  const trackedNet = s.rates.cashPerSec
  const liveTill = (s.rateAvg?.cash?.length ?? 0) > 0 || Math.abs(trackedNet) >= 0.01
  const net = liveTill ? trackedNet : income - burn
  const runwaySec = net < -1e-6 ? s.cash / -net : Number.POSITIVE_INFINITY
  const arrearsPayRate = storeRev * RECOVERY.arrearsRevenueShare
  const arrearsEta =
    s.arrears > 0.005 ? (arrearsPayRate > 1e-6 ? s.arrears / arrearsPayRate : Number.POSITIVE_INFINITY) : 0
  const debtOwed = s.debt?.owed ?? 0
  const debtShare = DEBT.revenueShare * (1 + up(s, 'debt-plan') * DEBT.planBonusPerLevel)

  const target = bottleneckTarget(s, bottleneck.kind)

  const aisles = CATEGORY_IDS.filter(
    (c) => s.categories[c] || (s.stats.soldByCat?.[c] ?? 0) > 0,
  ).map((c) => {
    const sold = s.stats.soldByCat?.[c] ?? 0
    const rev = s.stats.revenueByCat?.[c] ?? 0
    const spoiled = s.stats.spoiledByCat?.[c] ?? 0
    const uc = unitCost(s, c)
    const cogs = uc * sold
    const spoilLoss = uc * spoiled
    return { id: c, name: CATEGORIES[c].name, sold, rev, spoiled, cogs, spoilLoss, margin: rev - cogs - spoilLoss }
  })

  const alerts: { tone: 'danger' | 'warn' | 'info'; text: string }[] = []
  if (storeRev > 0.01 && wages / storeRev > 0.4) {
    alerts.push({
      tone: 'danger',
      text: `Wages are ${Math.round((wages / storeRev) * 100)}% of store revenue (over 40%). Cut hours or hold off hiring.`,
    })
  }
  const spoilShare =
    (s.stats.sold ?? 0) + (s.stats.spoiled ?? 0) > 0
      ? (s.stats.spoiled ?? 0) / ((s.stats.sold ?? 0) + (s.stats.spoiled ?? 0))
      : 0
  if ((s.stats.spoiled ?? 0) >= 10 && spoilShare > 0.1) {
    alerts.push({
      tone: 'warn',
      text: `${qty(s.stats.spoiled)} units spoiled (${Math.round(spoilShare * 100)}% of throughput). Order smaller mixes, cool the aisle, or dump early.`,
    })
  }
  const attDrain = chainAttentionDrain(s)
  if (s.era >= 2 && s.stores.length > 1 && attDrain > 0) {
    alerts.push({
      tone: 'info',
      text: `${s.stores.length} stores drain ~${attDrain.toFixed(2)} Att/s. Keep Analysts and Archives ahead of it.`,
    })
  }
  if (Number.isFinite(runwaySec) && runwaySec < 300) {
    alerts.push({
      tone: 'danger',
      text: `Cash runway ${etaLabel(runwaySec)} at the current burn. Sales are not covering the bill.`,
    })
  }

  const exhibits = [...(s.museum?.exhibits ?? [])].sort((a, b) => b.qty - a.qty).slice(0, 4)

  return (
    <Panel
      title="Books"
      purpose="Read the tape. Fix the bottleneck elsewhere."
      lore="books"
    >
      <StatusBand
        items={[
          {
            label: 'Limit',
            value: bottleneck.kind,
            tone: bottleneck.kind === 'demand' ? 'muted' : 'danger',
            hint: bottleneck.label,
          },
          {
            label: 'Rep ETA',
            value: etaLabel(repEta),
            tone: 'accent',
            hint: `Next +1 @ ${qty(s.compute.nextRepAt)} baskets`,
          },
          {
            label: 'Burn',
            value: rate(burn),
            tone: 'muted',
            hint: 'Cost + rent + wages',
          },
          {
            label: 'Arrears',
            value: money(s.arrears, numberFormat),
            tone: s.arrears > 0 ? 'danger' : 'muted',
          },
        ]}
      />

      {target ? (
        <div className="ge-dept-callout" role="status">
          <div className="ge-dept-callout__copy">
            <h3>{bottleneck.kind}</h3>
            <p>{bottleneck.label}</p>
          </div>
          <Btn
            tone={bottleneck.kind !== 'demand' ? 'primary' : 'ghost'}
            onClick={() => setActiveMenu(target.menu)}
          >
            {target.label} →
          </Btn>
        </div>
      ) : null}

      {alerts.length > 0 ? (
        <ul className="ge-alerts" role="status" style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0' }}>
          {alerts.map((a, i) => (
            <li
              key={i}
              className={`ge-muted ge-alert ge-alert--${a.tone}`}
              style={{
                margin: '0.2rem 0',
                fontSize: '0.78rem',
                color: a.tone === 'danger' ? 'var(--ge-danger, #d9534f)' : a.tone === 'warn' ? 'var(--ge-warn, #e09f3e)' : undefined,
              }}
            >
              {a.tone === 'info' ? 'ℹ' : '⚠'} {a.text}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="ge-dept-split">
        <article className="ge-card">
          <header className="ge-empire-block__head">
            <h3>Cashflow split</h3>
            <p>Store sales vs side tills vs parked yield.</p>
          </header>
          <div className="ge-card__meta">
            <div className="ge-card__meta-row">
              <span>Store revenue</span>
              <strong>{rate(storeRev)}</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Venture fill</span>
              <strong>{rate(ventureRate)}</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Invest yield</span>
              <strong>{rate(investYield)}</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Burn</span>
              <strong>{rate(burn)}</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Rent</span>
              <strong>{rate(rent)}</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Wages</span>
              <strong>{rate(wages)}</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Net</span>
              <strong>{rate(net)}</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Cash runway</span>
              <strong title="Cash ÷ net loss per second; 'steady' when income covers the bill">
                {net >= -1e-6 ? 'steady' : etaLabel(runwaySec)}
              </strong>
            </div>
            {s.arrears > 0.005 ? (
              <div className="ge-card__meta-row">
                <span>Arrears payoff</span>
                <strong title={`${Math.round(RECOVERY.arrearsRevenueShare * 100)}% of store sales go to arrears`}>
                  {etaLabel(arrearsEta)}
                </strong>
              </div>
            ) : null}
            <div className="ge-card__meta-row">
              <span>Debt</span>
              <strong>
                {money(debtOwed, numberFormat)}
                {debtOwed > 0.005 && storeRev > 1e-6
                  ? ` · ${etaLabel(debtOwed / (storeRev * debtShare))}`
                  : ''}
              </strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Peak cash</span>
              <strong>{money(peak, numberFormat)}</strong>
            </div>
          </div>
        </article>

        <article className="ge-card">
          <header className="ge-empire-block__head">
            <h3>History</h3>
            <p>
              {cashHist.length < 2
                ? 'Sparklines fill after a few minutes.'
                : `${cashHist.length} samples`}
            </p>
          </header>
          <div className="ge-spark-stack" data-coach-id="books-history">
            <Sparkline values={cashHist} label="Cash" width={280} height={40} />
            <Sparkline values={soldHist} label="Sold" width={280} height={32} />
            <Sparkline values={revHist} label="Revenue" width={280} height={32} />
          </div>
        </article>
      </div>

      <Section label="Tally">
        <div className="ge-stat-strip">
          <div className="ge-stat-strip__item">
            <span>Sold</span>
            <strong>{qty(s.stats?.sold ?? 0)}</strong>
          </div>
          <div className="ge-stat-strip__item">
            <span>Spoiled</span>
            <strong>{qty(s.stats?.spoiled ?? 0)}</strong>
          </div>
          <div className="ge-stat-strip__item">
            <span>Shrink</span>
            <strong>{qty(s.stats?.shrunk ?? 0)}</strong>
          </div>
          <div className="ge-stat-strip__item">
            <span>Demand</span>
            <strong>×{demand.total.toFixed(2)}</strong>
          </div>
        </div>
      </Section>

      {aisles.length > 0 ? (
        <Section label="Aisle P&L">
          <div className="ge-card__meta" data-coach-id="books-aisles">
            {aisles.map((a) => (
              <div key={a.id} className="ge-card__meta-row">
                <span>
                  {a.name} · {qty(a.sold)} sold
                  {a.spoiled > 0 ? ` · ${qty(a.spoiled)} spoiled` : ''}
                </span>
                <strong
                  style={{ color: a.margin < 0 ? 'var(--ge-danger, #d9534f)' : undefined }}
                  title={`Revenue ${money(a.rev, numberFormat)} − est. COGS ${money(a.cogs, numberFormat)} − spoil write-off ${money(a.spoilLoss, numberFormat)}`}
                >
                  {a.margin < 0 ? '−' : '+'}
                  {money(Math.abs(a.margin), numberFormat)}
                </strong>
              </div>
            ))}
          </div>
          <p className="ge-muted" style={{ fontSize: '0.7rem' }}>
            Estimate: cost = sold × today’s unit cost, so a lucky dip buy reads a little low.
          </p>
        </Section>
      ) : null}

      {exhibits.length > 0 ? (
        <Section label="Museum of spoilage">
          {exhibits.map((e) => (
            <Line key={`${e.t}-${e.note}`} left={e.note} right={`×${qty(e.qty)}`} muted />
          ))}
        </Section>
      ) : null}

      {s.era >= 2 ? (
        <Section label="Capital">
          <Line left="Incorporated" right={s.incorporated ? 'Yes' : 'No'} />
          <Line left="Equity" right={money(s.equity, numberFormat)} muted />
          <Line
            left="Read bank"
            right={
              s.read > 0
                ? `${Math.floor(s.read * 10) / 10} · spend on Strategy`
                : 'Earn via Strategy tournaments'
            }
            muted
          />
          <div className="ge-chip-row">
            <Btn
              tone="primary"
              coachId="books-incorporate"
              disabled={!!incorporateBlocked}
              title={incorporateBlocked ?? undefined}
              onClick={() => dispatch({ type: 'incorporate' })}
            >
              {s.incorporated
                ? 'Incorporated'
                : `Incorporate · $${CAPITAL.incorporateCash} + ${CAPITAL.incorporateRep} Rep`}
            </Btn>
          </div>
          {s.incorporated ? (
            <div className="bk-board" data-coach-id="books-board">
              <header className="bk-board__head">
                <h3>Board meeting</h3>
                <p>
                  {meetingDue
                    ? 'One choice. The others wait until the next meeting.'
                    : `Next meeting ${etaLabel(nextMeetingInSec)}.`}
                </p>
              </header>
              <ul className="bk-board__list">
                {BOARD_AGENDAS.map((a) => (
                  <li key={a.id} className={meetingDue ? 'is-due' : ''}>
                    <div>
                      <strong>{a.label}</strong>
                      <span>{a.tip}</span>
                    </div>
                    <Btn
                      tone={meetingDue ? 'primary' : 'ghost'}
                      disabled={!meetingDue}
                      title={meetingDue ? a.tip : `Next meeting ${etaLabel(nextMeetingInSec)}`}
                      onClick={() => dispatch({ type: 'resolveBoard', agenda: a.id })}
                    >
                      {meetingDue ? 'Choose' : 'Waiting'}
                    </Btn>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="ge-muted" style={{ fontSize: '0.78rem' }} data-coach-id="books-board">
              Board agenda opens after you incorporate.
            </p>
          )}
          {s.autonomous ? (
            <>
              <p className="ge-muted" style={{ fontSize: '0.78rem', margin: '0.75rem 0 0.25rem' }}>
                Autonomous habit — pick what the ticker emphasizes.
              </p>
              <div className="ge-chip-row">
                {(
                  [
                    ['balanced', 'Balanced'],
                    ['price', 'Price'],
                    ['attention', 'Attention'],
                    ['collect', 'Collect'],
                  ] as const
                ).map(([id, label]) => (
                  <Btn
                    key={id}
                    tone={(s.autonomousHabit ?? 'balanced') === id ? 'primary' : 'ghost'}
                    onClick={() => dispatch({ type: 'setAutonomousHabit', habit: id })}
                  >
                    {label}
                  </Btn>
                ))}
              </div>
            </>
          ) : null}
        </Section>
      ) : null}

      <details
        className="ge-details"
        open={demandOpen}
        onToggle={(e) => setDemandOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>Demand multipliers</summary>
        <div className="ge-details__body">
          {Object.entries(demand.parts).map(([k, v]) => (
            <Line key={k} left={k} right={`×${v.toFixed(2)}`} muted />
          ))}
          <Line left="Total" right={`×${demand.total.toFixed(2)}`} />
        </div>
      </details>

      <HelpCard title="The tape">
        Baskets come from the aisle. Ventures and the book are side cash. When progress stalls, read
        the bottleneck line — then hire, Unpack, or open a managed door.
      </HelpCard>
    </Panel>
  )
}

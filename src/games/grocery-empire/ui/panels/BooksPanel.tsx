import { corpCashFlow } from '../../sim/corp/effects'
import { memo, useState } from 'react'
import { BUILD_TRACKS } from '../../content/builds'
import { MENUS } from '../../content/menus'
import { CATEGORIES, CATEGORY_IDS } from '../../content/categories'
import { CAPITAL, DEBT, RECOVERY } from '../../sim/balance'
import {
  demandBreakdown,
  rentPerSec,
  reputationEtaSec,
  unitCost,
  up,
  upkeepPerSec,
  wagesPerSec,
} from '../../sim/formulas'
import { StatusChip, type VerbTrayProps } from '../play'
import { canResolveBoard } from '../../sim/systems/capital'
import { useGame } from '../GameContext'
import { money, qty } from '../format'
import { Button, Card, DataTable, Disclosure, Meter, Sparkline, Stat, Tabs } from '../kit'
import type { Column } from '../kit'
import { LedgerScene } from '../scenes/live/LedgerScene'
import { HubCallout, LateHubShell, Rows } from './LateHubShell'
import { CurrencyFlowTable, IncomeWaterfall } from './BooksLate'


function etaLabel(sec: number): string {
  if (!Number.isFinite(sec)) return '—'
  if (sec <= 0) return 'ready'
  if (sec < 60) return `~${Math.ceil(sec)}s`
  if (sec < 3600) return `~${Math.ceil(sec / 60)} min`
  return `~${(sec / 3600).toFixed(1)} hr`
}


/** Memoized: re-renders from its own context reads, not from unrelated parent renders. */
export const BooksPanel = memo(BooksPanelInner)

function BooksPanelInner() {
  const { state: s, dispatch, numberFormat, setActiveMenu } = useGame()
  const [tape, setTape] = useState<'flow' | 'history'>('flow')
  // New players (first ten minutes) get the demand explainer open once.
  const [demandOpen, setDemandOpen] = useState(false)
  const demand = demandBreakdown(s)
  const cashHist = s.history?.cash ?? []
  const soldHist = s.history?.sold ?? []
  const revHist = s.history?.revenue ?? []
  const meetingDue = canResolveBoard(s) === null
  const rent = rentPerSec(s)
  const wages = wagesPerSec(s)
  const burn = s.rates.costPerSec
  const peak = Math.max(80, s.stats.peakCash || 80)
  const buildUpkeepSec = upkeepPerSec(s, BUILD_TRACKS)
  const buildUpkeepMin = buildUpkeepSec * 60
  const upkeepWarn = buildUpkeepSec > 0 && (s.rates.cashPerSec ?? 0) + 1e-9 < buildUpkeepSec
  const repEta = reputationEtaSec(s)
  const storeRev = Math.max(0, s.rates.revenuePerSec)
  const ventureRate = s.rates.venturePerSec ?? 0
  const investYield = s.rates.investYieldPerSec ?? 0
  const companyFlow = corpCashFlow(s).reduce((a, r) => a + r.perMin, 0) / 60
  const incorporateBlocked =
    s.incorporated
      ? 'Already incorporated'
      : s.cash < CAPITAL.incorporateCash
        ? `Need ${money(CAPITAL.incorporateCash, numberFormat)}`
        : s.compute.reputation < CAPITAL.incorporateRep
          ? `Need ${CAPITAL.incorporateRep} Reputation`
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

  const spoilShare =
    (s.stats.sold ?? 0) + (s.stats.spoiled ?? 0) > 0
      ? (s.stats.spoiled ?? 0) / ((s.stats.sold ?? 0) + (s.stats.spoiled ?? 0))
      : 0

  const exhibits = [...(s.museum?.exhibits ?? [])].sort((a, b) => b.qty - a.qty).slice(0, 4)

  // The HUD raises the same alert (Hud.tsx): when the board is waiting, it leads the panel.
  const boardLifted = s.era >= 2 && s.incorporated && meetingDue


  type FlowRow = { key: string; label: string; value: string; title?: string; neg?: boolean }
  const flowRows: FlowRow[] = [
    { key: 'store', label: 'Sales', value: `${money(storeRev, numberFormat)}/s` },
    ...(ventureRate > 0 ? [{ key: 'venture', label: 'Ventures', value: `${money(ventureRate, numberFormat)}/s` }] : []),
    ...(investYield > 0 ? [{ key: 'invest', label: 'Investments', value: `${money(investYield, numberFormat)}/s` }] : []),
    ...(Math.abs(companyFlow) > 1e-6
      ? [
          {
            key: 'company',
            label: 'Company and town',
            value: `${companyFlow < 0 ? '−' : ''}${money(Math.abs(companyFlow), numberFormat)}/s`,
            title: 'Dividends, rent, royalties, owners’ share, salaries, premiums and bonds. Line by line in Treasury.',
            neg: companyFlow < 0,
          },
        ]
      : []),
    { key: 'rent', label: 'Rent', value: `−${money(rent, numberFormat)}/s`, neg: true },
    { key: 'wages', label: 'Wages', value: `−${money(wages, numberFormat)}/s`, neg: true },
    { key: 'burn', label: 'All costs', value: `−${money(burn, numberFormat)}/s`, title: 'Stock, rent and wages together', neg: true },
    { key: 'net', label: 'You keep', value: `${money(net, numberFormat)}/s`, neg: net < 0 },
  ]
  const flowCols: Column<FlowRow>[] = [
    { key: 'line', header: '', render: (r) => (r.key === 'net' ? <strong>{r.label}</strong> : r.label) },
    {
      key: 'val',
      header: 'Per second',
      align: 'end',
      render: (r) => (
        <span className={r.neg ? 'lh-neg' : undefined} title={r.title}>
          {r.key === 'net' ? <strong>{r.value}</strong> : r.value}
        </span>
      ),
    },
  ]

  const aisleCols: Column<(typeof aisles)[number]>[] = [
    { key: 'aisle', header: 'Aisle', render: (a) => a.name },
    { key: 'sold', header: 'Sold', align: 'end', render: (a) => qty(a.sold) },
    { key: 'spoiled', header: 'Spoiled', align: 'end', render: (a) => (a.spoiled > 0 ? qty(a.spoiled) : '—') },
    {
      key: 'margin',
      header: 'Margin',
      align: 'end',
      render: (a) => (
        <strong
          className={a.margin < 0 ? 'lh-neg' : undefined}
          title={`Revenue ${money(a.rev, numberFormat)} − est. COGS ${money(a.cogs, numberFormat)} − spoil write-off ${money(a.spoilLoss, numberFormat)}`}
        >
          {a.margin < 0 ? '−' : '+'}
          {money(Math.abs(a.margin), numberFormat)}
        </strong>
      ),
    },
  ]

  const wageShare = storeRev > 0.01 ? wages / storeRev : 0

  const kpiChips =
    net < -1e-6 ? (
      <div className="lh-chips" data-coach-id="books-kpis">
        <StatusChip tone="warn" title="Cash ÷ net loss per second.">
          Losing money · cash lasts {etaLabel(runwaySec)}
        </StatusChip>
      </div>
    ) : (
      <div data-coach-id="books-kpis" hidden />
    )

  // The tray primary is the bottleneck jump; with no bottleneck it falls back to the next free move.
  const incorporateOpen = s.era >= 2 && !s.incorporated
  const incorporateCost = `${money(CAPITAL.incorporateCash, numberFormat)} + ${CAPITAL.incorporateRep} Reputation`
  // A real action only: incorporating when it is possible. The sales limit lives in the HUD tab.
  const tray: VerbTrayProps | undefined =
    incorporateOpen && !incorporateBlocked
      ? {
          primary: {
            label: `Incorporate · ${incorporateCost}`,
            tone: 'primary',
            coachId: 'books-incorporate',
            size: 'lg',
            onClick: () => dispatch({ type: 'incorporate' }),
          },
        }
      : undefined

  return (
    <LateHubShell
      title={MENUS.books.name}
      purpose={MENUS.books.purpose}
      scene={<LedgerScene />}
      tray={tray}
    >
      {kpiChips}


      {boardLifted ? (
        <HubCallout
          title="The directors are waiting on an agenda."
          tone="warn"
          coachId="books-board"
          action={
            <Button tone="primary" onClick={() => setActiveMenu('boardroom')}>
              Open the Boardroom
            </Button>
          }
        />
      ) : null}

      {buildUpkeepSec > 0 ? (
        <StatusChip tone={upkeepWarn ? 'warn' : 'ready'} title="Building upkeep">
          {upkeepWarn ? (
            <>Building upkeep {money(buildUpkeepMin, numberFormat)}/min is more than you earn</>
          ) : (
            <>Building upkeep {money(buildUpkeepMin, numberFormat)}/min</>
          )}
        </StatusChip>
      ) : null}

      <Tabs
        aria-label="Books tape"
        value={tape}
        onChange={setTape}
        options={[
          { value: 'flow', label: 'Cashflow' },
          { value: 'history', label: 'History' },
        ]}
      />
      {tape === 'flow' ? (
        <div className="lh-stack">
          <DataTable columns={flowCols} rows={flowRows} rowKey={(r) => r.key} caption="Cashflow split" />
          {storeRev > 0.01 ? (
            <Meter
              tone={wageShare > 0.4 ? 'danger' : wageShare > 0.3 ? 'warn' : 'success'}
              value={wageShare}
              max={0.4}
              label="Wages / sales"
              eta={`${Math.round(wageShare * 100)}%`}
            />
          ) : null}
          {(s.stats.sold ?? 0) + (s.stats.spoiled ?? 0) > 0 ? (
            <Meter
              tone={spoilShare > 0.1 ? 'danger' : spoilShare > 0.05 ? 'warn' : 'success'}
              value={spoilShare}
              max={0.1}
              label="Spoilage"
              eta={`${Math.round(spoilShare * 100)}%`}
            />
          ) : null}
          <Rows
            rows={[
              { label: 'Next Reputation', value: etaLabel(repEta), title: `+1 Reputation at ${qty(s.compute.nextRepAt)} baskets` },
              ...(s.arrears > 0.005
                ? [
                    {
                      label: 'Unpaid rent',
                      value: `${money(s.arrears, numberFormat)} · ${etaLabel(arrearsEta)}`,
                      title: `${Math.round(RECOVERY.arrearsRevenueShare * 100)}% of store sales go to arrears`,
                    },
                  ]
                : []),
              {
                label: 'Debt',
                value: `${money(debtOwed, numberFormat)}${
                  debtOwed > 0.005 && storeRev > 1e-6 ? ` · ${etaLabel(debtOwed / (storeRev * debtShare))}` : ''
                }`,
              },
              { label: 'Peak cash', value: money(peak, numberFormat) },
            ]}
          />
        </div>
      ) : (
        <div className="lh-stack">
          <div className="lh-spark" data-coach-id="books-history">
            <Sparkline values={cashHist} label="Cash" width={280} height={40} />
            <Sparkline values={soldHist} label="Sold" width={280} height={32} />
            <Sparkline values={revHist} label="Revenue" width={280} height={32} />
          </div>
          <p className="lh-note">
            {cashHist.length < 2 ? 'Sparklines fill after a few minutes.' : `${cashHist.length} samples`}
          </p>
          <div className="lh-actions">
            <Stat size="sm" label="Sold" value={qty(s.stats?.sold ?? 0)} />
            <Stat size="sm" label="Spoiled" value={qty(s.stats?.spoiled ?? 0)} />
            <Stat size="sm" label="Shrink" value={qty(s.stats?.shrunk ?? 0)} />
            <Stat size="sm" label="Demand" value={`×${demand.total.toFixed(2)}`} />
          </div>
        </div>
      )}

      {s.era >= 7 ? (
        <Disclosure title="Worlds income">
          <div className="lh-split">
            <IncomeWaterfall s={s} />
            <CurrencyFlowTable s={s} />
          </div>
        </Disclosure>
      ) : null}

      {aisles.length > 0 ? (
        <Disclosure title="Aisle P&L" count={aisles.length}>
          <div className="lh-stack" data-coach-id="books-aisles">
            <DataTable columns={aisleCols} rows={aisles} rowKey={(a) => a.id} caption="Aisle profit and loss" />
            <p className="lh-note">
              Estimate: cost = sold × today’s unit cost, so a lucky dip buy reads a little low.
            </p>
          </div>
        </Disclosure>
      ) : null}

      {s.era >= 2 ? (
        <Card
          header={
            <div className="lh-card-title">
              <strong>Capital</strong>
              <span>{s.incorporated ? 'Incorporated' : 'Not incorporated'}</span>
            </div>
          }
        >
          <div className="lh-stack">
            <Rows
              rows={[
                { label: 'Equity', value: money(s.equity, numberFormat) },
                {
                  label: 'Read bank',
                  value:
                    s.read > 0
                      ? `${Math.floor(s.read * 10) / 10} · spend on Strategy`
                      : 'Earn via Strategy tournaments',
                  muted: s.read <= 0,
                },
              ]}
            />
            <div className="lh-actions">
              {s.incorporated ? (
                <p className="lh-note">Incorporated.</p>
              ) : incorporateBlocked ? (
                <p className="lh-note" data-coach-id="books-incorporate">
                  Incorporating costs {incorporateCost}. {incorporateBlocked}
                </p>
              ) : (
                // The tray at the top already holds the Incorporate button; don't draw a second one.
                <p className="lh-note">
                  Ready: use Incorporate at the top of this page.
                </p>
              )}
            </div>
            {s.incorporated ? (
              <p className="lh-note">The directors meet in the Boardroom.</p>
            ) : (
              <p className="lh-note" data-coach-id="books-board">
                Board agenda opens after you incorporate.
              </p>
            )}
            {s.autonomous ? (
              <>
                <p className="lh-note">Autonomous habit — pick what the ticker emphasizes.</p>
                <div className="lh-actions">
                  {(
                    [
                      ['balanced', 'Balanced'],
                      ['price', 'Price'],
                      ['attention', 'Attention'],
                      ['collect', 'Collect'],
                    ] as const
                  ).map(([id, label]) => (
                    <Button
                      key={id}
                      size="sm"
                      tone={(s.autonomousHabit ?? 'balanced') === id ? 'primary' : 'ghost'}
                      onClick={() => dispatch({ type: 'setAutonomousHabit', habit: id })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}

      {exhibits.length > 0 ? (
        <Disclosure title="Spoilage log" count={exhibits.length}>
          <Rows rows={exhibits.map((e) => ({ label: e.note, value: `×${qty(e.qty)}`, muted: true }))} />
        </Disclosure>
      ) : null}

      <Disclosure title="Demand multipliers" open={demandOpen} onOpenChange={setDemandOpen}>
        <Rows
          rows={[
            ...Object.entries(demand.parts)
              .filter(([, v]) => Math.abs(v - 1) > 0.005)
              .map(([k, v]) => ({ label: demandPartLabel(k), value: `×${v.toFixed(2)}`, muted: true })),
            { label: 'Total', value: `×${demand.total.toFixed(2)}` },
          ]}
        />
      </Disclosure>
    </LateHubShell>
  )
}

/** Plain names for the demand multipliers (no code words on screen). */
const DEMAND_PART_LABELS: Record<string, string> = {
  ads: 'Ads',
  reputation: 'Reputation',
  hours: 'Opening hours',
  weather: 'Weather',
  storefront: 'Storefront',
  civic: 'Civic builds',
  signage: 'Signage',
  loyalty: 'Loyalty cards',
  memos: 'Memos',
  upgrades: 'Upgrades',
  inspection: 'Inspection',
  alley: 'Back alley',
  couponWar: 'Coupon war',
  rival: 'Rival move',
  celebrity: 'Celebrity endcap',
  brand: 'Brand',
  morale: 'Crew morale',
  crew: 'Greeters',
  empire: 'Empire',
  expansions: 'Expansions',
  marketing: 'Marketing',
  ventures: 'Ventures',
  wordOfMouth: 'Word of mouth',
  rivals: 'Rival stores',
  trees: 'Talents and projects',
  open: 'Open or closed',
  early: 'Getting started',
  stars: 'Star rating',
  counterFlyer: 'Penny’s flyer',
  regularMiss: 'Missed regular',
  openShift: 'Open shift',
  produceGrade: 'Produce grade',
  chainPolicy: 'Chain policy',
  rationWeek: 'Ration week',
  buildFacing: 'Build styles',
  endcaps: 'Endcaps',
}

function demandPartLabel(k: string): string {
  return DEMAND_PART_LABELS[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

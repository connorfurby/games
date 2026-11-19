import { MENUS } from '../../content/menus'
import { POLICIES } from '../../content/corp/legal'
import { CREDIT } from '../../sim/balance'
import { can } from '../../sim/commands'
import { corpCashFlow } from '../../sim/corp/effects'
import { salesRate } from '../../sim/corp/core'
import './ledger.css'
import { bondPrincipal, bondRate, couponOf, creditBand, earlyPayoff, premiumPerMin } from '../../sim/corp/treasury'
import { useGame } from '../GameContext'
import { clock, money } from '../format'
import { HubStage } from '../components/HubStage'
import { Button } from '../kit'
import { ROOM_GROUND, RoomScene } from '../scenes/room'
import { HowItWorks } from './HowItWorks'
import './corp.css'
import './treasury.css'

const G = ROOM_GROUND

function TreasuryScene() {
  const { state: s, numberFormat } = useGame()
  const c = s.corp
  const t = (c.credit - CREDIT.min) / (CREDIT.max - CREDIT.min)
  const ang = Math.PI * (1 - t)
  const cx = 300
  const cy = G - 30
  const r = 150
  const nx = cx + Math.cos(ang) * (r - 24)
  const ny = cy - Math.sin(ang) * (r - 24)
  const debt = c.bonds.reduce((a, b) => a + b.principal, 0)
  const bands = ['#e8583c', '#f2994e', '#f2c14e', '#a8d65a', '#5fd38a']
  return (
    <RoomScene
      label={`Treasury: credit ${Math.round(c.credit)}, ${c.bonds.length} bonds`}
      chips={[
        { label: 'Credit', value: `${Math.round(c.credit)} · ${creditBand(c.credit)}` },
        { label: 'Bonds owed', value: money(debt, numberFormat) },
        { label: 'Arrears', value: c.arrears > 0 ? money(c.arrears, numberFormat) : 'none' },
      ]}
      skyTop="#141a22"
      skyBottom="#232a33"
      phoneChipsOnly
      className="tr-room"
    >
      {/* Credit dial */}
      {bands.map((col, i) => {
        const a0 = Math.PI * (1 - i / 5)
        const a1 = Math.PI * (1 - (i + 1) / 5)
        const p = (a: number, rr: number) => `${cx + Math.cos(a) * rr},${cy - Math.sin(a) * rr}`
        return <path key={col} d={`M${p(a0, r)} A${r},${r} 0 0 1 ${p(a1, r)} L${p(a1, r - 22)} A${r - 22},${r - 22} 0 0 0 ${p(a0, r - 22)} Z`} fill={col} opacity="0.85" />
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#efe6cf" strokeWidth="5" strokeLinecap="round" className="tr-needle" />
      <circle cx={cx} cy={cy} r="10" fill="#efe6cf" />
      <rect x={cx - 56} y={cy - 78} width="112" height="66" rx="12" fill="#141a22" opacity="0.92" />
      <text x={cx} y={cy - 40} textAnchor="middle" fontSize="34" fontWeight="900" fill="#efe6cf">
        {Math.round(c.credit)}
      </text>
      <text x={cx} y={cy - 18} textAnchor="middle" fontSize="13" fontWeight="700" fill="#b9b2a2">
        {creditBand(c.credit)}
      </text>
      {/* Vault door */}
      <circle cx="720" cy={G - 110} r="96" fill="#4a4f5c" stroke="#2a2d36" strokeWidth="10" />
      <circle cx="720" cy={G - 110} r="64" fill="#5d6372" />
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1="720" y1={G - 110} x2={720 + Math.cos((i * Math.PI) / 3) * 58} y2={G - 110 + Math.sin((i * Math.PI) / 3) * 58} stroke="#2a2d36" strokeWidth="6" className="tr-wheel" />
      ))}
      <circle cx="720" cy={G - 110} r="14" fill="#2a2d36" />
      {/* Bond certificates */}
      {c.bonds.map((b, i) => (
        <g key={b.id} transform={`translate(${520 + i * 18} ${G - 210 + i * 10}) rotate(${-6 + i * 5})`}>
          <rect width="80" height="54" rx="3" fill="#efe6cf" stroke="#b9a36a" strokeWidth="3" />
          <text x="40" y="22" textAnchor="middle" fontSize="10" fontWeight="800" fill="#6b4f2a">
            BOND
          </text>
          <text x="40" y="40" textAnchor="middle" fontSize="9" fill="#6b4f2a">
            {clock(Math.max(0, b.dueAt - s.time))}
          </text>
        </g>
      ))}
      {/* Umbrellas for policies */}
      {Object.keys(c.policies).map((id, i) => (
        <g key={id} transform={`translate(${860} ${G - 220 + i * 46})`}>
          <path d="M-22 0 A22 22 0 0 1 22 0 Z" fill={['#5b8fd9', '#5fd38a', '#f2c14e', '#e8583c'][i % 4]} />
          <line x1="0" y1="0" x2="0" y2="22" stroke="#efe6cf" strokeWidth="2" />
        </g>
      ))}
    </RoomScene>
  )
}

function CashFlow() {
  const { state: s, numberFormat, setActiveMenu } = useGame()
  const rows = corpCashFlow(s)
  if (!rows.length) return null
  const net = rows.reduce((a, r) => a + r.perMin, 0)
  const m = (n: number) => money(Math.abs(n), numberFormat)
  return (
    <section className="lg" aria-label="Company cash flow">
      <h3 className="lg-h">Company money, per minute</h3>
      <ul className="lg-list">
        {rows.map((r) => (
          <li key={r.label} className={r.perMin >= 0 ? 'is-good' : 'is-bad'}>
            <span className="lg-src">{r.label}</span>
            <span className={`lg-text ${r.perMin >= 0 ? 'is-up' : 'is-down'}`}>
              {r.perMin >= 0 ? '+' : '−'}
              {m(r.perMin)}
            </span>
            <Button size="sm" tone="ghost" onClick={() => setActiveMenu(r.menu)}>
              Open
            </Button>
          </li>
        ))}
      </ul>
      <p className={`lg-note ${net >= 0 ? 'is-up' : 'is-down'}`}>
        Net {net >= 0 ? '+' : '−'}
        {m(net)} a minute ({Math.round((Math.abs(net) / Math.max(1e-9, salesRate(s) * 60)) * 1000) / 10}% of sales {net >= 0 ? 'on top' : 'out'}).
      </p>
    </section>
  )
}

export function TreasuryPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const c = s.corp
  const m = (n: number) => money(n, numberFormat)
  const mid = CREDIT.bondMins[1]
  const issue = can(s, { type: 'issueBond', mins: mid })
  const tray = {
    primary: {
      label: `Borrow ${m(bondPrincipal(s, mid))} (a ${mid}-minute bond)`,
      tone: 'primary' as const,
      size: 'lg' as const,
      disabled: !issue.ok,
      onClick: () => dispatch({ type: 'issueBond', mins: mid }),
    },
    failReason: issue.ok ? undefined : issue.reason,
    hint: `You pay back ${Math.round(bondRate(s) * 100)}% on top over ${CREDIT.bondTermSec / 60} minutes. Better credit, cheaper money.`,
  }
  return (
    <section className="ge-panel tr-panel">
      <HubStage purpose={MENUS.treasury.purpose} department={MENUS.treasury.name} scene={<TreasuryScene />} tray={tray}>
        <HowItWorks menu="treasury" />
        {c.arrears > 0 ? (
          <article className="tr-alert">
            <strong>In arrears: {m(c.arrears)}</strong>
            <span>Creditors take {Math.round(CREDIT.garnishShare * 100)}% of sales until it’s paid. No new bonds until then.</span>
          </article>
        ) : null}
        <CashFlow />
        <div className="tr-grid">
          <article className="tr-card">
            <h3>Credit score</h3>
            <p className="tr-big">
              {Math.round(c.credit)} <span>{creditBand(c.credit)}</span>
            </p>
            <ul className="tr-list">
              <li>Climbs while you carry a bond and pay on time; every repaid bond adds {CREDIT.onTimeBonus}.</li>
              <li>A missed payment costs {CREDIT.missedHit}; a default costs {CREDIT.defaultHit}.</li>
              <li className={c.credit >= CREDIT.primeAt ? 'is-up' : ''}>
                Prime ({CREDIT.primeAt}+): crates cost {Math.round((1 - CREDIT.primeCrateMul) * 100)}% less{c.credit >= CREDIT.primeAt ? ' — active' : ''}.
              </li>
            </ul>
            <p className="bd-muted">
              Repaid {c.bondsRepaid} · missed {c.missed}
            </p>
          </article>
          <article className="tr-card">
            <h3>Issue a bond</h3>
            <p className="bd-muted">Cash now; coupons every {CREDIT.couponEverySec / 60} minutes, the rest at the end. Rate today: {Math.round(bondRate(s) * 100)}% over the term.</p>
            <div className="bd-acts">
              {CREDIT.bondMins.map((mins) => {
                const ok = can(s, { type: 'issueBond', mins })
                return (
                  <Button key={mins} tone="ghost" disabled={!ok.ok} title={ok.reason} onClick={() => dispatch({ type: 'issueBond', mins })}>
                    {m(bondPrincipal(s, mins))}
                  </Button>
                )
              })}
            </div>
            {c.bonds.length ? (
              <ul className="tr-bonds">
                {c.bonds.map((b) => (
                  <li key={b.id}>
                    <div>
                      <strong>{m(b.principal)}</strong>
                      <span>
                        coupon {m(couponOf(b))} · next {clock(Math.max(0, b.nextCouponAt - s.time))} · due {clock(Math.max(0, b.dueAt - s.time))}
                      </span>
                    </div>
                    <Button size="sm" tone="ghost" cost={m(earlyPayoff(b))} disabled={!can(s, { type: 'repayBond', id: b.id }).ok} onClick={() => dispatch({ type: 'repayBond', id: b.id })}>
                      Repay early
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            {s.era < CREDIT.bondEra ? <p className="bd-muted">Bonds open in Era {CREDIT.bondEra}.</p> : null}
          </article>
        </div>

        <h3 className="mk-h">Insurance</h3>
        <p className="mk-note">
          Premiums come out every minute; each claim makes that premium a little dearer for a while. Paid {m(c.premiumsPaid)} · claims {m(c.claimsPaid)}.
        </p>
        <div className="tr-policies">
          {POLICIES.filter((p) => s.era >= p.era).map((p) => {
            const on = !!c.policies[p.id]
            const buy = can(s, { type: 'buyPolicy', id: p.id })
            return (
              <article key={p.id} className={`tr-policy${on ? ' is-on' : ''}`}>
                <h4>{p.name}</h4>
                <p>{p.covers}</p>
                <p className="bd-muted">{m(premiumPerMin(s, p.id))} a minute{on && (c.policies[p.id]?.bump ?? 0) > 0 ? ` (+${Math.round((c.policies[p.id]?.bump ?? 0) * 100)}% after claims)` : ''}</p>
                {on ? (
                  <Button size="sm" tone="ghost" onClick={() => dispatch({ type: 'dropPolicy', id: p.id })}>
                    Cancel cover
                  </Button>
                ) : (
                  <Button size="sm" tone="primary" disabled={!buy.ok} onClick={() => dispatch({ type: 'buyPolicy', id: p.id })}>
                    Take out cover
                  </Button>
                )}
              </article>
            )
          })}
        </div>
      </HubStage>
    </section>
  )
}

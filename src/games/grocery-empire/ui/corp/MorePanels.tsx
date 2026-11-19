import { MENUS } from '../../content/menus'
import { EXEC_ROLES, EXEC_TRAITS, FRANCHISE_TRAITS, INVENTIONS, LOTS, TENANTS } from '../../content/corp/more'
import { EXEC, FRANCHISE, LAB } from '../../sim/balance'
import { can } from '../../sim/commands'
import { salesRate } from '../../sim/corp/core'
import {
  execPower,
  execSalary,
  franchiseCap,
  franchiseFee,
  inventionShare,
  labLevelCost,
  labSpeed,
  lotPrice,
  patentCost,
  propertyDemand,
  rentPerMin,
} from '../../sim/corp/more'
import { useGame } from '../GameContext'
import { clock, money } from '../format'
import { HubStage } from '../components/HubStage'
import { Button } from '../kit'
import { ROOM_GROUND, RoomScene } from '../scenes/room'
import { initialsOf } from './ownerLook'
import { HowItWorks } from './HowItWorks'
import './corp.css'
import './boardroom.css'
import './town.css'

const G = ROOM_GROUND
const pctS = (n: number) => `${n >= 0 ? '+' : '−'}${Math.round(Math.abs(n) * 1000) / 10}%`
const LEVER_TEXT: Record<string, (v: number) => string> = {
  demand: (v) => `shoppers ${pctS(v)}`,
  wages: (v) => `wages ${pctS(v)}`,
  crates: (v) => `crates ${pctS(v)}`,
  ventures: (v) => `venture tills ${pctS(v)}`,
  spoil: (v) => `food keeps ${Math.round(v * 100)}% longer`,
}

// ── Executives ───────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = { cfo: '#5fd38a', cmo: '#e85aa0', coo: '#f2c14e', counsel: '#5b8fd9', research: '#9b7ad9', hr: '#e8a25a' }

export function ExecsPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const m = (n: number) => money(n, numberFormat)
  const more = s.corp.more
  const first = more.pool.findIndex((c) => !more.execs[c.role])
  const hire = first >= 0 ? can(s, { type: 'hireExec', idx: first }) : null
  const cand = first >= 0 ? more.pool[first] : null
  const tray = cand
    ? {
        primary: {
          label: `Hire ${cand.name} as ${EXEC_ROLES.find((r) => r.id === cand.role)?.title}`,
          tone: 'primary' as const,
          size: 'lg' as const,
          disabled: !hire?.ok,
          onClick: () => dispatch({ type: 'hireExec', idx: first }),
        },
        failReason: hire?.ok ? undefined : hire?.reason,
        hint: `Paid ${m(execSalary(s, cand.trait))} a minute. They get better the longer they stay.`,
      }
    : undefined
  const describe = (role: string) => {
    const p = execPower(s, role as never)
    switch (role) {
      case 'cfo':
        return `Bonds ${Math.round(p * 100)}% cheaper, trading fees halved`
      case 'cmo':
        return `Shoppers ${pctS(p)}, the press recovers faster, crises go better`
      case 'coo':
        return `Crates and wages ${pctS(-p)}`
      case 'counsel':
        return `Court odds +${Math.round(p * 100)} points`
      case 'research':
        return `Lab ${Math.round(p * 100)}% faster`
      default:
        return `${Math.round(p * 100)}% chance to talk down a strike`
    }
  }
  return (
    <section className="ge-panel tw-panel">
      <HubStage
        purpose={MENUS.execs.purpose}
        department={MENUS.execs.name}
        tray={tray}
        scene={
          <RoomScene
            label="Executive floor"
            chips={[
              { label: 'Chairs filled', value: `${Object.keys(more.execs).length} of ${EXEC_ROLES.length}` },
              { label: 'Salaries', value: `${m(Object.values(more.execs).reduce((a, e) => a + (e ? execSalary(s, e.trait) : 0), 0))}/min` },
            ]}
            skyTop="#1b2233"
            skyBottom="#3a4458"
            phoneChipsOnly
            className="tw-room"
          >
            <rect x="0" y={G} width="960" height="52" fill="#2a2d36" />
            {EXEC_ROLES.map((r, i) => {
              const e = more.execs[r.id]
              const x = 90 + i * 150
              return (
                <g key={r.id}>
                  <rect x={x - 50} y={G - 70} width="100" height="10" fill="#6b4434" />
                  <rect x={x - 46} y={G - 60} width="6" height="60" fill="#4a2f26" />
                  <rect x={x + 40} y={G - 60} width="6" height="60" fill="#4a2f26" />
                  {e ? (
                    <g>
                      <circle cx={x} cy={G - 108} r="16" fill="#efe6cf" />
                      <rect x={x - 18} y={G - 92} width="36" height="26" rx="6" fill={ROLE_COLOR[r.id]} />
                      <text x={x} y={G - 74} textAnchor="middle" fontSize="10" fontWeight="900" fill="#14110d">
                        {initialsOf(e.name)}
                      </text>
                    </g>
                  ) : (
                    <rect x={x - 16} y={G - 100} width="32" height="30" rx="6" fill="none" stroke="#6b6a62" strokeDasharray="4 3" />
                  )}
                  <text x={x} y={G + 20} textAnchor="middle" fontSize="11" fontWeight="800" fill="#d9d4c7">
                    {r.id.toUpperCase()}
                  </text>
                </g>
              )
            })}
          </RoomScene>
        }
      >
        <HowItWorks menu="execs" />
        <div className="tw-grid">
          {EXEC_ROLES.map((r) => {
            const e = more.execs[r.id]
            const trait = e ? EXEC_TRAITS.find((t) => t.id === e.trait) : null
            return (
              <article key={r.id} className={`tw-card${e ? ' is-on' : ''}`}>
                <h4>
                  <i className="tw-dot" style={{ background: ROLE_COLOR[r.id] }} />
                  {r.title}
                </h4>
                <p className="bd-who">{r.does}</p>
                {e ? (
                  <>
                    <p className="tw-perk">
                      <strong>{e.name}</strong> · {trait?.name} · level {e.level}
                    </p>
                    <p className="tw-perk is-up">{describe(r.id)}</p>
                    <p className="bd-muted">
                      {trait?.blurb} {m(execSalary(s, e.trait))} a minute.
                    </p>
                    <Button size="sm" tone="ghost" onClick={() => dispatch({ type: 'fireExec', role: r.id })}>
                      Let them go
                    </Button>
                  </>
                ) : (
                  <p className="bd-muted">Empty chair.</p>
                )}
              </article>
            )
          })}
        </div>
        <h3 className="mk-h">Candidates</h3>
        {s.era < EXEC.era ? (
          <p className="mk-note">Executives join from Era {EXEC.era}.</p>
        ) : more.pool.length ? (
          <div className="tw-grid">
            {more.pool.map((c, i) => {
              const trait = EXEC_TRAITS.find((t) => t.id === c.trait)
              const ok = can(s, { type: 'hireExec', idx: i })
              return (
                <article key={`${c.name}-${i}`} className="tw-card">
                  <h4>
                    {c.name} <span>{EXEC_ROLES.find((r) => r.id === c.role)?.title}</span>
                  </h4>
                  <p className="tw-perk">
                    {trait?.name}: {trait?.blurb}
                  </p>
                  <p className="bd-muted">{m(execSalary(s, c.trait))} a minute</p>
                  <Button size="sm" tone="primary" disabled={!ok.ok} title={ok.reason} onClick={() => dispatch({ type: 'hireExec', idx: i })}>
                    Hire
                  </Button>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="mk-note">The recruiters come back in {clock(Math.max(0, more.nextPoolAt - s.time))}.</p>
        )}
      </HubStage>
    </section>
  )
}

// ── Lab ──────────────────────────────────────────────────────────────────

export function LabPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const m = (n: number) => money(n, numberFormat)
  const lab = s.corp.more.lab
  const open = INVENTIONS.filter((x) => s.era >= x.era)
  const next = open.find((x) => !lab.invented[x.id])
  const proj = lab.project ? INVENTIONS.find((x) => x.id === lab.project) : null
  const start = next ? can(s, { type: 'startResearch', id: next.id }) : null
  const tray =
    !proj && next
      ? {
          primary: {
            label: `Research ${next.name}`,
            tone: 'primary' as const,
            size: 'lg' as const,
            cost: m(salesRate(s) * next.costSec),
            disabled: !start?.ok,
            onClick: () => dispatch({ type: 'startResearch', id: next.id }),
          },
          failReason: start?.ok ? undefined : start?.reason,
          hint: `${next.blurb} When done: ${LEVER_TEXT[next.lever]?.(next.size)}.`,
        }
      : undefined
  const pct = proj ? Math.min(1, lab.progress / proj.sec) : 0
  return (
    <section className="ge-panel tw-panel">
      <HubStage
        purpose={MENUS.lab.purpose}
        department={MENUS.lab.name}
        tray={tray}
        scene={
          <RoomScene
            label="Lab"
            chips={[
              { label: 'Lab level', value: String(lab.level) },
              { label: 'Invented', value: String(Object.keys(lab.invented).length) },
              { label: 'Working on', value: proj ? `${Math.round(pct * 100)}%` : 'nothing' },
            ]}
            skyTop="#0f1a1f"
            skyBottom="#1d2e33"
            phoneChipsOnly
            className="tw-room"
          >
            <rect x="0" y={G} width="960" height="52" fill="#d9d4c7" opacity="0.2" />
            <rect x="100" y={G - 60} width="760" height="14" fill="#9aa4ad" />
            {Array.from({ length: 6 }, (_, i) => {
              const x = 150 + i * 120
              const lit = proj && i < Math.ceil(pct * 6)
              return (
                <g key={i}>
                  <path d={`M${x - 10} ${G - 120} v30 l-18 30 h56 l-18 -30 v-30 z`} fill={lit ? ['#5fd38a', '#9b7ad9', '#5b8fd9', '#f2c14e', '#e85aa0', '#5ac8c8'][i] : '#2a3a40'} opacity="0.85" stroke="#9aa4ad" />
                  {lit ? <circle cx={x} cy={G - 74} r="4" fill="#fff" className="tw-heart" style={{ animationDelay: `${i * 0.3}s` }} /> : null}
                </g>
              )
            })}
            {proj ? (
              <g>
                <rect x="300" y="40" width="360" height="40" rx="6" fill="#0a1214" stroke="#2a3a40" />
                <rect x="306" y="46" width={348 * pct} height="28" rx="4" fill="#5fd38a" opacity="0.7" />
                <text x="480" y="66" textAnchor="middle" fontSize="13" fontWeight="800" fill="#efe6cf">
                  {proj.name}
                </text>
              </g>
            ) : null}
          </RoomScene>
        }
      >
        <HowItWorks menu="lab" />
        <div className="bd-acts">
          <Button
            tone="ghost"
            cost={lab.level < LAB.levelMax ? m(labLevelCost(s)) : undefined}
            disabled={!can(s, { type: 'upgradeLab' }).ok}
            onClick={() => dispatch({ type: 'upgradeLab' })}
          >
            {lab.level < LAB.levelMax ? `Expand the lab to level ${lab.level + 1}` : 'Lab fully built'}
          </Button>
          <span className="bd-muted">Research speed ×{labSpeed(s).toFixed(2)}</span>
        </div>
        {proj ? (
          <p className="mk-note">
            {proj.name}: {clock(Math.max(0, (proj.sec - lab.progress) / labSpeed(s)))} to go.
          </p>
        ) : null}
        <div className="tw-grid">
          {open.map((x) => {
            const inv = lab.invented[x.id]
            const share = inventionShare(s, x.id)
            return (
              <article key={x.id} className={`tw-card${inv ? ' is-on' : ''}`}>
                <h4>{x.name}</h4>
                <p className="bd-who">{x.blurb}</p>
                <p className={inv ? 'tw-perk is-up' : 'tw-perk'}>{LEVER_TEXT[x.lever]?.(x.size * (inv ? share : 1))}</p>
                {inv ? (
                  <>
                    <p className="bd-muted">
                      {inv.patented ? 'Patented' : inv.copied ? 'Copied by rivals: counts for half' : `Unpatented: rivals copy it in ${clock(Math.max(0, inv.at + LAB.copyAfterSec - s.time))}`}
                      {inv.licensed ? ` · licensed: ${m(salesRate(s) * x.royaltySec)} a minute` : ''}
                    </p>
                    <div className="bd-acts">
                      {!inv.patented && !inv.copied ? (
                        <Button size="sm" tone="primary" cost={m(patentCost(s))} disabled={!can(s, { type: 'patentInvention', id: x.id }).ok} onClick={() => dispatch({ type: 'patentInvention', id: x.id })}>
                          Patent it
                        </Button>
                      ) : null}
                      {inv.patented ? (
                        <Button size="sm" tone="ghost" onClick={() => dispatch({ type: 'licenseInvention', id: x.id })}>
                          {inv.licensed ? 'Keep it exclusive' : 'License it to rivals'}
                        </Button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <Button
                    size="sm"
                    tone="ghost"
                    cost={m(salesRate(s) * x.costSec)}
                    disabled={!can(s, { type: 'startResearch', id: x.id }).ok}
                    onClick={() => dispatch({ type: 'startResearch', id: x.id })}
                  >
                    Research ({clock(x.sec / labSpeed(s))})
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

// ── Property ─────────────────────────────────────────────────────────────

export function PropertyPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const m = (n: number) => money(n, numberFormat)
  const more = s.corp.more
  const open = LOTS.filter((x) => s.era >= x.era)
  const next = open.find((x) => !more.lots[x.id])
  const buy = next ? can(s, { type: 'buyLot', id: next.id }) : null
  const tray = next
    ? {
        primary: {
          label: `Buy ${next.name}`,
          tone: 'primary' as const,
          size: 'lg' as const,
          cost: m(lotPrice(s, next.id)),
          disabled: !buy?.ok,
          onClick: () => dispatch({ type: 'buyLot', id: next.id }),
        },
        failReason: buy?.ok ? undefined : buy?.reason,
        hint: 'Property gains value over time (faster with a good name) and can be let for rent.',
      }
    : undefined
  const totalValue = Object.values(more.lots).reduce((a, l) => a + l.value, 0)
  return (
    <section className="ge-panel tw-panel">
      <HubStage
        purpose={MENUS.property.purpose}
        department={MENUS.property.name}
        tray={tray}
        scene={
          <RoomScene
            label="Property"
            chips={[
              { label: 'Portfolio', value: m(totalValue) },
              { label: 'Rent earned', value: m(more.rentEarned) },
              { label: 'Shoppers', value: pctS(propertyDemand(s)) },
            ]}
            skyTop="#2a3a52"
            skyBottom="#7a8aa2"
            phoneChipsOnly
            className="tw-room"
          >
            <rect x="0" y={G} width="960" height="52" fill="#4a4f5c" />
            {open.map((x, i) => {
              const own = more.lots[x.id]
              const h = 50 + i * 22
              const px = 30 + i * 115
              return (
                <g key={x.id}>
                  <rect x={px} y={G - h} width="96" height={h} fill={own ? '#d9b48a' : '#3a4050'} stroke={own ? '#f2c14e' : '#2a2d36'} strokeWidth="2" />
                  {Array.from({ length: Math.floor(h / 22) }, (_, k) => (
                    <rect key={k} x={px + 12} y={G - h + 10 + k * 22} width="72" height="8" fill={own ? '#fff3c4' : '#2a2d36'} opacity="0.8" />
                  ))}
                  {own ? (
                    <rect x={px + 28} y={G - h - 16} width="40" height="14" rx="3" fill="#f2c14e" />
                  ) : (
                    <text x={px + 48} y={G - h - 6} textAnchor="middle" fontSize="10" fontWeight="800" fill="#e8583c">
                      FOR SALE
                    </text>
                  )}
                </g>
              )
            })}
          </RoomScene>
        }
      >
        <HowItWorks menu="property" />
        <div className="tw-grid">
          {open.map((x) => {
            const own = more.lots[x.id]
            return (
              <article key={x.id} className={`tw-card${own ? ' is-on' : ''}`}>
                <h4>{x.name}</h4>
                <p className="bd-who">{x.blurb}</p>
                {own ? (
                  <>
                    <p className="tw-perk">
                      Worth {m(own.value)} · paid {m(own.paid)}{' '}
                      <span className={own.value >= own.paid ? 'is-up' : 'is-down'}>{pctS(own.value / Math.max(1e-9, own.paid) - 1)}</span>
                    </p>
                    <p className="bd-muted">{own.tenant ? `Rent ${m(rentPerMin(s, x.id))} a minute` : 'Empty'}</p>
                    <div className="bd-acts">
                      {TENANTS.map((t) => (
                        <Button key={t.id} size="sm" tone={own.tenant === t.id ? 'primary' : 'ghost'} title={t.note} onClick={() => dispatch({ type: 'setTenant', id: x.id, tenant: own.tenant === t.id ? null : t.id })}>
                          {t.name}
                        </Button>
                      ))}
                    </div>
                    <Button size="sm" tone="ghost" onClick={() => dispatch({ type: 'sellLot', id: x.id })}>
                      Sell for {m(own.value * 0.95)}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" tone="ghost" cost={m(lotPrice(s, x.id))} disabled={!can(s, { type: 'buyLot', id: x.id }).ok} onClick={() => dispatch({ type: 'buyLot', id: x.id })}>
                    Buy it
                  </Button>
                )}
              </article>
            )
          })}
        </div>
        <p className="mk-note">Every lot you own near the store brings a few shoppers. Let one to a rival for top rent, at a price.</p>
      </HubStage>
    </section>
  )
}

// ── Franchising ──────────────────────────────────────────────────────────

export function FranchisePanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const m = (n: number) => money(n, numberFormat)
  const more = s.corp.more
  const sell = can(s, { type: 'sellFranchise' })
  const tray = {
    primary: {
      label: `Sell a franchise for ${m(franchiseFee(s))}`,
      tone: 'primary' as const,
      size: 'lg' as const,
      disabled: !sell.ok,
      onClick: () => dispatch({ type: 'sellFranchise' }),
    },
    failReason: sell.ok ? undefined : sell.reason,
    hint: 'Each franchisee pays a fee now and royalties every minute, by how well they run it.',
  }
  return (
    <section className="ge-panel tw-panel">
      <HubStage
        purpose={MENUS.franchise.purpose}
        department={MENUS.franchise.name}
        tray={tray}
        scene={
          <RoomScene
            label="Franchises"
            chips={[
              { label: 'Franchises', value: `${more.franchises.length} of ${franchiseCap(s)}` },
              { label: 'Royalties', value: m(more.royalties) },
            ]}
            skyTop="#2a3a52"
            skyBottom="#c9a87a"
            phoneChipsOnly
            className="tw-room"
          >
            <rect x="0" y={G} width="960" height="52" fill="#4a5a3a" />
            {more.franchises.slice(0, 8).map((f, i) => {
              const px = 30 + i * 115
              const q = f.quality / 100
              return (
                <g key={f.id}>
                  <rect x={px} y={G - 80} width="96" height="80" fill={`rgb(${Math.round(200 - 100 * q)} ${Math.round(80 + 100 * q)} 80)`} opacity="0.85" />
                  <rect x={px - 4} y={G - 92} width="104" height="16" fill="#f2c14e" />
                  <rect x={px + 36} y={G - 40} width="24" height="40" fill="#4a2f26" />
                  <text x={px + 48} y={G - 80} textAnchor="middle" fontSize="9" fontWeight="900" fill="#14110d">
                    {Math.round(f.quality)}%
                  </text>
                </g>
              )
            })}
            {more.franchises.length === 0 ? (
              <text x="480" y={G - 60} textAnchor="middle" fontSize="16" fontWeight="800" fill="#efe6cf">
                Your name, on other people’s stores.
              </text>
            ) : null}
          </RoomScene>
        }
      >
        <HowItWorks menu="franchise" />
        {s.era < FRANCHISE.era ? <p className="mk-note">Franchising opens in Era {FRANCHISE.era}.</p> : null}
        <div className="tw-grid">
          {more.franchises.map((f) => {
            const trait = FRANCHISE_TRAITS.find((t) => t.id === f.trait)
            return (
              <article key={f.id} className={`tw-card${f.quality >= FRANCHISE.badBelow ? '' : ' is-bad'}`}>
                <h4>
                  {f.name} <span>{trait?.name}</span>
                </h4>
                <p className="bd-who">{trait?.blurb}</p>
                <div className="tw-meter">
                  <span>Quality</span>
                  <div>
                    <i style={{ width: `${f.quality}%` }} />
                  </div>
                  <b>{Math.round(f.quality)}</b>
                </div>
                <p className="bd-muted">
                  Paid you {m(f.paid)} · {f.quality < FRANCHISE.badBelow ? 'hurting your brand' : 'doing fine'}
                </p>
                <div className="bd-acts">
                  <Button
                    size="sm"
                    tone="ghost"
                    cost={m(salesRate(s) * FRANCHISE.inspectCostSec)}
                    disabled={!can(s, { type: 'inspectFranchise', id: f.id }).ok}
                    onClick={() => dispatch({ type: 'inspectFranchise', id: f.id })}
                  >
                    Inspect
                  </Button>
                  <Button size="sm" tone="ghost" onClick={() => dispatch({ type: 'pullLicense', id: f.id })}>
                    Pull the licence
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      </HubStage>
    </section>
  )
}

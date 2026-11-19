import { useState } from 'react'
import { MENUS } from '../../content/menus'
import { CAUSES, FAVORS, OFFICE_BY_ID, OFFICES, OUTLETS, SEGMENTS, SPINS, UNION_DEMANDS } from '../../content/corp/town'
import { RIVALS } from '../../content/rivals'
import { TICKERS } from '../../content/corp/tickers'
import { TOWN } from '../../sim/balance'
import { can } from '../../sim/commands'
import { salesRate } from '../../sim/corp/core'
import { rivalActive } from '../../sim/corp/rivalry'
import {
  goodwillDemand,
  levelThreshold,
  openSegments,
  outletCost,
  pressReach,
  segmentDemand,
  segmentFit,
  segmentShares,
  voteShare,
} from '../../sim/corp/town'
import { useGame } from '../GameContext'
import { clock, money } from '../format'
import { HubStage } from '../components/HubStage'
import { Button } from '../kit'
import { ROOM_GROUND, RoomScene } from '../scenes/room'
import './corp.css'
import './boardroom.css'
import './town.css'

const G = ROOM_GROUND
const SEG_COLOR: Record<string, string> = {
  students: '#5b8fd9',
  families: '#5fd38a',
  seniors: '#e8a25a',
  foodies: '#e85aa0',
  nightowls: '#9b7ad9',
  colonists: '#5ac8c8',
  synthetics: '#b9b2a2',
}
const pctS = (n: number) => `${n >= 0 ? '+' : '−'}${Math.round(Math.abs(n) * 1000) / 10}%`

// ── Foundation ───────────────────────────────────────────────────────────

export function FoundationPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const t = s.corp.town
  const m = (n: number) => money(n, numberFormat)
  const open = CAUSES.filter((c) => s.era >= c.era)
  const best = open[0]
  const mid = TOWN.donateSec[1]
  const give = best ? can(s, { type: 'donate', cause: best.id, sec: mid }) : null
  const tray = best
    ? {
        primary: {
          label: `Give to ${best.name}`,
          tone: 'primary' as const,
          size: 'lg' as const,
          cost: m(salesRate(s) * mid),
          disabled: !give?.ok,
          onClick: () => dispatch({ type: 'donate', cause: best.id, sec: mid }),
        },
        failReason: give?.ok ? undefined : give?.reason,
        hint: `Goodwill brings shoppers (now ${pctS(goodwillDemand(s))}) and ${TOWN.witnessCost} of it softens a sentence.`,
      }
    : undefined
  return (
    <section className="ge-panel tw-panel">
      <HubStage
        purpose={MENUS.foundation.purpose}
        department={MENUS.foundation.name}
        tray={tray}
        scene={
          <RoomScene
            label={`Foundation: goodwill ${Math.round(t.goodwill)}`}
            chips={[
              { label: 'Goodwill', value: String(Math.round(t.goodwill)) },
              { label: 'Given', value: m(t.donated) },
              { label: 'Awards', value: String(t.awards) },
            ]}
            skyTop="#2a3a52"
            skyBottom="#e8b48a"
            phoneChipsOnly
            className="tw-room"
          >
            <rect x="0" y={G} width="960" height="52" fill="#4a5a3a" />
            <rect x="380" y={G - 150} width="200" height="150" fill="#d9d4c7" />
            <path d={`M370 ${G - 150} L480 ${G - 200} L590 ${G - 150} Z`} fill="#b9b2a2" />
            <rect x="455" y={G - 70} width="50" height="70" fill="#6b4434" />
            <text x="480" y={G - 118} textAnchor="middle" fontSize="14" fontWeight="900" fill="#6b4434">
              FOUNDATION
            </text>
            {open.map((c, i) => {
              const lvl = t.causes[c.id] ?? 0
              const x = i < 4 ? 40 + i * 82 : 620 + (i - 4) * 82
              return (
                <g key={c.id}>
                  <rect x={x} y={G - 40} width="64" height="40" fill="#efe6cf" />
                  <path d={`M${x - 4} ${G - 40} h72 l-8 -14 h-56 z`} fill={['#e8583c', '#5fd38a', '#5b8fd9', '#f2c14e'][i % 4]} />
                  <line x1={x + 32} y1={G - 54} x2={x + 32} y2={G - 54 - 16 - lvl * 14} stroke="#6b6a62" strokeWidth="2" />
                  {lvl > 0 ? <rect x={x + 32} y={G - 54 - 16 - lvl * 14} width="22" height="12" fill="#f2c14e" className="tw-flag" /> : null}
                  <text x={x + 32} y={G - 14} textAnchor="middle" fontSize="9" fontWeight="800" fill="#4a3a2a">
                    L{lvl}
                  </text>
                </g>
              )
            })}
            {Array.from({ length: Math.min(12, Math.ceil(t.goodwill / 10)) }, (_, i) => (
              <text key={i} x={400 + (i * 47) % 160} y={G - 210 - (i % 3) * 18} fontSize="16" className="tw-heart" style={{ animationDelay: `${i * 0.35}s` }}>
                ♥
              </text>
            ))}
          </RoomScene>
        }
      >
        <div className="tw-grid">
          {open.map((c) => {
            const lvl = t.causes[c.id] ?? 0
            const given = t.causeGiven[c.id] ?? 0
            const next = levelThreshold(s, lvl + 1)
            const prev = levelThreshold(s, lvl)
            const pct = lvl >= TOWN.causeMax ? 1 : Math.max(0, Math.min(1, (given - prev) / Math.max(1e-9, next - prev)))
            return (
              <article key={c.id} className={`tw-card${lvl >= TOWN.perkAt ? ' is-on' : ''}`}>
                <h4>
                  {c.name} <span>L{lvl}</span>
                </h4>
                <p className="bd-who">{c.blurb}</p>
                <div className="tw-bar">
                  <i style={{ width: `${pct * 100}%` }} />
                </div>
                <p className={lvl >= TOWN.perkAt ? 'is-up tw-perk' : 'tw-perk bd-muted'}>
                  {lvl >= TOWN.perkAt ? '✓ ' : `At level ${TOWN.perkAt}: `}
                  {c.perkText}
                </p>
                <div className="bd-acts">
                  {TOWN.donateSec.map((sec) => {
                    const ok = can(s, { type: 'donate', cause: c.id, sec }).ok
                    return (
                      <Button key={sec} size="sm" tone="ghost" disabled={!ok} onClick={() => dispatch({ type: 'donate', cause: c.id, sec })}>
                        Give {m(salesRate(s) * sec)}
                      </Button>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
        <p className="mk-note">
          Goodwill fades slowly. Hold {TOWN.awardGoodwill}+ when the judges meet (every {TOWN.awardEverySec / 60} minutes) to win the Golden Basket. Witnesses called: {t.witnesses}.
        </p>
      </HubStage>
    </section>
  )
}

// ── City Hall ────────────────────────────────────────────────────────────

export function CityHallPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const t = s.corp.town
  const m = (n: number) => money(n, numberFormat)
  const e = t.election
  const office = e ? OFFICE_BY_ID[e.office] : null
  const share = voteShare(s)
  const openRace = can(s, { type: 'openCampaign' })
  const tray = e
    ? undefined
    : {
        primary: {
          label: 'Follow the next election',
          tone: 'primary' as const,
          size: 'lg' as const,
          disabled: !openRace.ok,
          onClick: () => dispatch({ type: 'openCampaign' }),
        },
        failReason: openRace.ok ? undefined : openRace.reason,
        hint: 'Back a candidate with cash; if they win, they owe you favours and their platform becomes the law.',
      }
  const holders = Object.entries(t.officeHolders).filter(([, h]) => h.until > s.time)
  return (
    <section className="ge-panel tw-panel">
      <HubStage
        purpose={MENUS.cityhall.purpose}
        department={MENUS.cityhall.name}
        tray={tray}
        scene={
          <RoomScene
            label="City Hall"
            chips={[
              { label: 'In office', value: String(holders.length) },
              { label: 'Favours owed', value: String(t.favors) },
              { label: 'Election', value: e ? clock(Math.max(0, e.dayAt - s.time)) : 'none' },
            ]}
            skyTop="#4a6a92"
            skyBottom="#c9d6e8"
            phoneChipsOnly
            className="tw-room"
          >
            <rect x="0" y={G} width="960" height="52" fill="#8a8f99" />
            <rect x="300" y={G - 130} width="360" height="130" fill="#e8e2d2" />
            <path d={`M280 ${G - 130} L480 ${G - 200} L680 ${G - 130} Z`} fill="#d9d4c7" />
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} x={320 + i * 50} y={G - 122} width="16" height="112" fill="#c9c2b2" />
            ))}
            <circle cx="480" cy={G - 222} r="18" fill="#b9a36a" />
            {office
              ? office.candidates.map((c, i) => {
                  const h = 40 + (share[c.id] ?? 0) * 160
                  const x = i === 0 ? 70 : i === 1 ? 170 : 780
                  return (
                    <g key={c.id}>
                      <rect x={x} y={G - h} width="80" height={h} fill={['#5b8fd9', '#5fd38a', '#e8583c'][i]} opacity="0.9" />
                      <text x={x + 40} y={G - h + 18} textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">
                        {Math.round((share[c.id] ?? 0) * 100)}%
                      </text>
                      <text x={x + 40} y={G + 20} textAnchor="middle" fontSize="11" fontWeight="800" fill="#1a1a1e">
                        {c.name.split(' ').slice(-1)[0]}
                      </text>
                    </g>
                  )
                })
              : null}
            {office ? (
              <g>
                <rect x="390" y={G - 172} width="180" height="24" rx="4" fill="#e8583c" />
                <text x="480" y={G - 155} textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">
                  VOTE · {office.title.toUpperCase()}
                </text>
              </g>
            ) : null}
          </RoomScene>
        }
      >
        {e && office ? (
          <article className="bd-decide">
            <div className="bd-decide__body">
              <p className="bd-k">
                The race for {office.title} · election day in {clock(Math.max(0, e.dayAt - s.time))}
              </p>
              <div className="tw-cands">
                {office.candidates.map((c) => (
                  <div key={c.id} className="tw-cand">
                    <h4>
                      {c.name} <span>{Math.round((share[c.id] ?? 0) * 100)}%</span>
                    </h4>
                    <p className="bd-says">“{c.platform}”</p>
                    <p className="tw-perk">{leverText(c.levers)}</p>
                    <div className="bd-acts">
                      {[1, 5].map((mins) => (
                        <Button key={mins} size="sm" tone="ghost" disabled={!can(s, { type: 'backCandidate', cand: c.id, mins }).ok} onClick={() => dispatch({ type: 'backCandidate', cand: c.id, mins })}>
                          Donate {m(salesRate(s) * 60 * mins)}
                        </Button>
                      ))}
                    </div>
                    {(e.backed[c.id] ?? 0) > 0 ? <p className="bd-muted">You gave {m(e.backed[c.id] ?? 0)}</p> : null}
                  </div>
                ))}
              </div>
              <p className="bd-muted">Back the winner and they owe you {TOWN.favorsPerWin} favours. Back the loser and they remember (Heat +{TOWN.loserGrudgeHeat}).</p>
            </div>
          </article>
        ) : null}
        <h3 className="mk-h">In office</h3>
        {holders.length ? (
          <ul className="tw-list">
            {holders.map(([office, h]) => {
              const c = OFFICE_BY_ID[office]?.candidates.find((x) => x.id === h.cand)
              return (
                <li key={office}>
                  <strong>
                    {OFFICE_BY_ID[office]?.title}: {c?.name}
                  </strong>
                  <span>
                    {leverText(c?.levers ?? {})} · term ends in {clock(h.until - s.time)}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mk-note">Nobody you know holds office. Seats open: {OFFICES.filter((o) => s.era >= o.era).map((o) => o.title).join(', ') || 'none yet'}.</p>
        )}
        {t.favors > 0 ? (
          <>
            <h3 className="mk-h">Favours owed ({t.favors})</h3>
            <div className="bd-acts">
              {FAVORS.map((f) => (
                <Button key={f.id} tone="ghost" onClick={() => dispatch({ type: 'useFavor', id: f.id })} title={f.text}>
                  {f.name} · {f.text}
                </Button>
              ))}
            </div>
          </>
        ) : null}
      </HubStage>
    </section>
  )
}

function leverText(l: Partial<Record<string, number>>): string {
  const out: string[] = []
  if (l.demand) out.push(`shoppers ${pctS(l.demand)}`)
  if (l.wages) out.push(`wages ${pctS(l.wages)}`)
  if (l.crates) out.push(`crates ${pctS(l.crates)}`)
  if (l.ventures) out.push(`ventures ${pctS(l.ventures)}`)
  if (l.heat) out.push(l.heat > 0 ? 'Heat cools faster' : 'Heat cools slower')
  return out.join(' · ')
}

// ── Union ────────────────────────────────────────────────────────────────

export function UnionPanel() {
  const { state: s, dispatch } = useGame()
  const u = s.corp.town.union
  const d = u.demand ? UNION_DEMANDS.find((x) => x.id === u.demand!.id) : null
  const striking = u.strikeUntil > s.time
  const tray = striking
    ? {
        primary: { label: 'Give in on pay to end the strike', tone: 'primary' as const, size: 'lg' as const, onClick: () => dispatch({ type: 'endStrike' }) },
        hint: `Or wait it out: ${clock(u.strikeUntil - s.time)} left at half the shoppers.`,
      }
    : d
      ? {
          primary: { label: `Sign: ${d.title}`, tone: 'primary' as const, size: 'lg' as const, onClick: () => dispatch({ type: 'answerUnion', accept: true }) },
          hint: d.yes,
        }
      : undefined
  return (
    <section className="ge-panel tw-panel">
      <HubStage
        purpose={MENUS.union.purpose}
        department={MENUS.union.name}
        tray={tray}
        scene={
          <RoomScene
            label="Union Hall"
            chips={[
              { label: 'Pay', value: `Level ${u.pay}` },
              { label: 'Benefits', value: `Level ${u.benefits}` },
              { label: 'Four-day week', value: u.hours ? `Level ${u.hours}` : 'no' },
            ]}
            skyTop="#3a2a2a"
            skyBottom="#6b4434"
            phoneChipsOnly
            className="tw-room"
          >
            <rect x="0" y={G} width="960" height="52" fill="#3a3a40" />
            <rect x="200" y={G - 160} width="560" height="160" fill="#7a3a2e" />
            <rect x="380" y={G - 150} width="200" height="30" fill="#efe6cf" />
            <text x="480" y={G - 129} textAnchor="middle" fontSize="15" fontWeight="900" fill="#7a3a2e">
              LOCAL 88
            </text>
            {Array.from({ length: striking ? 9 : 6 }, (_, i) => {
              const x = (striking ? 80 : 260) + i * (striking ? 95 : 85)
              return (
                <g key={i} className={striking ? 'tw-picket' : undefined} style={{ animationDelay: `${i * 0.2}s` }}>
                  <circle cx={x} cy={G - 44} r="9" fill="#efe6cf" />
                  <rect x={x - 9} y={G - 34} width="18" height="30" rx="4" fill={['#5b8fd9', '#e8583c', '#5fd38a', '#f2c14e'][i % 4]} />
                  {striking ? (
                    <g>
                      <line x1={x + 12} y1={G - 30} x2={x + 12} y2={G - 76} stroke="#8a6a4a" strokeWidth="3" />
                      <rect x={x - 6} y={G - 98} width="40" height="24" fill="#efe6cf" />
                      <text x={x + 14} y={G - 82} textAnchor="middle" fontSize="9" fontWeight="900" fill="#c2463a">
                        STRIKE
                      </text>
                    </g>
                  ) : null}
                </g>
              )
            })}
          </RoomScene>
        }
      >
        {d && !striking ? (
          <article className="bd-decide">
            <div className="bd-decide__body">
              <p className="bd-k">The union’s demand · {clock(Math.max(0, u.demand!.until - s.time))}</p>
              <h3>{d.title}</h3>
              <p className="bd-says">{d.ask}</p>
              <p className="bd-effects">If you sign: {d.yes}</p>
              <div className="bd-acts">
                <Button tone="primary" onClick={() => dispatch({ type: 'answerUnion', accept: true })}>
                  Sign it
                </Button>
                <Button tone="ghost" onClick={() => dispatch({ type: 'answerUnion', accept: false })}>
                  Refuse {u.refusals + 1 >= TOWN.strikeAfterRefusals ? '(they will strike)' : ''}
                </Button>
              </div>
              <p className="bd-muted">Leave it and it goes back in the drawer; nothing changes. Refuse {TOWN.strikeAfterRefusals} in a row and they walk out.</p>
            </div>
          </article>
        ) : null}
        <h3 className="mk-h">The contract</h3>
        <ul className="tw-list">
          {UNION_DEMANDS.map((x) => (
            <li key={x.id}>
              <strong>
                {x.title}: level {u[x.id]}
              </strong>
              <span>{x.yes} per level</span>
            </li>
          ))}
        </ul>
        {!d && !striking ? <p className="mk-note">No demands on the table. The union meets every {TOWN.demandGapSec / 60} minutes or so.</p> : null}
      </HubStage>
    </section>
  )
}

// ── Press ────────────────────────────────────────────────────────────────

export function PressPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const t = s.corp.town
  const m = (n: number) => money(n, numberFormat)
  const [target, setTarget] = useState<string>('')
  const forSale = OUTLETS.filter((o) => s.era >= o.era && !t.outlets.includes(o.id))
  const next = forSale[0]
  const buy = next ? can(s, { type: 'buyOutlet', id: next.id }) : null
  const tray = next
    ? {
        primary: {
          label: `Buy ${next.name}`,
          tone: 'primary' as const,
          size: 'lg' as const,
          cost: m(outletCost(s, next.id)),
          disabled: !buy?.ok,
          onClick: () => dispatch({ type: 'buyOutlet', id: next.id }),
        },
        failReason: buy?.ok ? undefined : buy?.reason,
        hint: `Each outlet brings +${Math.round(next.reach * 100)}% shoppers on its own, and makes every story louder.`,
      }
    : undefined
  const rivals = RIVALS.filter((r) => rivalActive(s, r.id))
  const listed = TICKERS.filter((x) => s.corp.tickers[x.id]?.listed)
  const last = s.corp.tape.at(-1)
  return (
    <section className="ge-panel tw-panel">
      <HubStage
        purpose={MENUS.press.purpose}
        department={MENUS.press.name}
        tray={tray}
        scene={
          <RoomScene
            label="Press"
            chips={[
              { label: 'Outlets', value: String(t.outlets.length) },
              { label: 'Credibility', value: `${Math.round(t.cred)}%` },
              { label: 'Reach', value: pctS(pressReach(s)) },
            ]}
            skyTop="#1a1d24"
            skyBottom="#2a2d36"
            phoneChipsOnly
            className="tw-room"
          >
            <rect x="0" y={G} width="960" height="52" fill="#2a2d36" />
            <g transform={`translate(330 ${G - 210})`}>
              <rect width="300" height="200" fill="#efe9dc" />
              <rect x="12" y="12" width="276" height="30" fill="#1a1a1e" />
              <text x="150" y="33" textAnchor="middle" fontSize="16" fontWeight="900" fill="#efe9dc">
                THE CORNER GAZETTE
              </text>
              <text x="150" y="70" textAnchor="middle" fontSize="13" fontWeight="900" fill="#1a1a1e">
                {(last?.text ?? 'Nothing happened today.').slice(0, 40)}
              </text>
              {Array.from({ length: 6 }, (_, i) => (
                <rect key={i} x="16" y={90 + i * 16} width={i % 2 ? 120 : 268} height="6" fill="#b9b2a2" />
              ))}
              <rect x="150" y="122" width="130" height="64" fill="#c9c2b2" />
            </g>
            {t.outlets.includes('radio') ? (
              <g>
                <line x1="120" y1={G} x2="150" y2={G - 200} stroke="#b9b2a2" strokeWidth="3" />
                <line x1="180" y1={G} x2="150" y2={G - 200} stroke="#b9b2a2" strokeWidth="3" />
                <circle cx="150" cy={G - 204} r="6" fill="#e8583c" className="tw-blink" />
              </g>
            ) : null}
            {t.outlets.includes('ch9') ? (
              <g transform={`translate(760 ${G - 120})`}>
                <rect x="-50" y="0" width="100" height="120" fill="#4a4f5c" />
                <ellipse cx="0" cy="-20" rx="36" ry="14" fill="#d9d4c7" transform="rotate(-20)" />
                <text x="0" y="60" textAnchor="middle" fontSize="20" fontWeight="900" fill="#f2c14e">
                  9
                </text>
              </g>
            ) : null}
            {t.outlets.includes('orbital') || t.outlets.includes('galnet') ? (
              <circle cx="880" cy="50" r="10" fill="#8fc4e0" className="tw-blink" />
            ) : null}
          </RoomScene>
        }
      >
        <div className="tw-grid">
          {OUTLETS.filter((o) => s.era >= o.era).map((o) => (
            <article key={o.id} className={`tw-card${t.outlets.includes(o.id) ? ' is-on' : ''}`}>
              <h4>
                {o.name} <span>{o.kind}</span>
              </h4>
              <p className="tw-perk">+{Math.round(o.reach * 100)}% shoppers while you own it</p>
              {t.outlets.includes(o.id) ? (
                <p className="is-up tw-perk">✓ Yours</p>
              ) : (
                <Button size="sm" tone="ghost" cost={m(outletCost(s, o.id))} disabled={!can(s, { type: 'buyOutlet', id: o.id }).ok} onClick={() => dispatch({ type: 'buyOutlet', id: o.id })}>
                  Buy it
                </Button>
              )}
            </article>
          ))}
        </div>
        {t.outlets.length ? (
          <>
            <h3 className="mk-h">The newsroom</h3>
            <div className="tw-cred">
              <div>
                <i style={{ width: `${t.cred}%` }} />
              </div>
              <span>
                Credibility {Math.round(t.cred)}% — every story spends some; it comes back over time. Low credibility, weaker stories.
                {t.spinReadyAt > s.time ? ` Next story in ${clock(t.spinReadyAt - s.time)}.` : ''}
              </span>
            </div>
            <label className="tw-target">
              Target
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Pick a rival, stock or candidate…</option>
                <optgroup label="Rivals">
                  {rivals.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Stocks">
                  {listed.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.sym} · {x.name}
                    </option>
                  ))}
                </optgroup>
                {t.election ? (
                  <optgroup label="Candidates">
                    {OFFICE_BY_ID[t.election.office]?.candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>
            <div className="tw-spins">
              {SPINS.map((sp) => {
                const needs = sp.id === 'attack' || sp.id === 'pump' || sp.id === 'endorse'
                const check = can(s, { type: 'spin', kind: sp.id, target: needs ? target || undefined : undefined })
                return (
                  <div key={sp.id} className="tw-spin">
                    <Button tone="ghost" disabled={!check.ok} onClick={() => dispatch({ type: 'spin', kind: sp.id, target: needs ? target : undefined })}>
                      {sp.name}
                    </Button>
                    <span>{check.ok ? sp.text : check.reason}</span>
                  </div>
                )
              })}
            </div>
          </>
        ) : null}
      </HubStage>
    </section>
  )
}

// ── Customers ────────────────────────────────────────────────────────────

export function CustomersPanel() {
  const { state: s, dispatch } = useGame()
  const t = s.corp.town
  const open = openSegments(s)
  const share = segmentShares(s)
  const fits = Object.fromEntries(open.map((x) => [x.id, segmentFit(s, x.id)]))
  const bestFit = [...open].sort((a, b) => (fits[b.id] ?? 0) - (fits[a.id] ?? 0))[0]
  const tray =
    !t.focus && bestFit
      ? {
          primary: { label: `Court ${bestFit.name}`, tone: 'primary' as const, size: 'lg' as const, onClick: () => dispatch({ type: 'setFocus', id: bestFit.id }) },
          hint: 'Courting a group wins their loyalty faster and brings more of them in.',
        }
      : undefined
  // Where each group's crowd starts in the scene.
  const starts: number[] = []
  open.reduce((a, x, i) => ((starts[i] = a), a + Math.max(1, Math.round((share[x.id] ?? 0) * 40))), 0)
  return (
    <section className="ge-panel tw-panel">
      <HubStage
        purpose={MENUS.customers.purpose}
        department={MENUS.customers.name}
        tray={tray}
        scene={
          <RoomScene
            label="Customers"
            chips={[
              { label: 'Courting', value: t.focus ? (SEGMENTS.find((x) => x.id === t.focus)?.name ?? '—') : 'nobody yet' },
              { label: 'Shoppers from loyalty', value: pctS(segmentDemand(s)) },
            ]}
            skyTop="#2c3a4a"
            skyBottom="#4a5a6a"
            phoneChipsOnly
            className="tw-room"
          >
            <rect x="0" y={G} width="960" height="52" fill="#3b3a40" />
            {open.flatMap((x, xi) => {
              const n = Math.max(1, Math.round((share[x.id] ?? 0) * 40))
              const out = Array.from({ length: n }, (_, i) => {
                const k = (starts[xi] ?? 0) + i
                const px = 30 + ((k * 37) % 900)
                const py = G - 8 - ((k * 13) % 3) * 22
                const loyal = (t.loyalty[x.id] ?? TOWN.loyaltyStart) / 100
                return (
                  <g key={`${x.id}-${i}`} opacity={0.35 + loyal * 0.65} className="tw-shopper" style={{ animationDelay: `${(k % 7) * 0.3}s` }}>
                    <circle cx={px} cy={py - 18} r="6" fill="#efe6cf" />
                    <rect x={px - 6} y={py - 12} width="12" height="16" rx="3" fill={SEG_COLOR[x.id]} />
                  </g>
                )
              })
              return out
            })}
          </RoomScene>
        }
      >
        <div className="tw-grid">
          {open.map((x) => {
            const loyal = Math.round(t.loyalty[x.id] ?? TOWN.loyaltyStart)
            const fit = Math.round(fits[x.id] ?? 0)
            return (
              <article key={x.id} className={`tw-card${t.focus === x.id ? ' is-on' : ''}`}>
                <h4>
                  <i className="tw-dot" style={{ background: SEG_COLOR[x.id] }} />
                  {x.name} <span>{Math.round((share[x.id] ?? 0) * 100)}% of shoppers</span>
                </h4>
                <p className="bd-who">Likes: {x.likes}</p>
                <div className="tw-meter">
                  <span>Loyalty</span>
                  <div>
                    <i style={{ width: `${loyal}%` }} />
                  </div>
                  <b>{loyal}</b>
                </div>
                <div className="tw-meter">
                  <span>How well you fit</span>
                  <div>
                    <i className="is-fit" style={{ width: `${fit}%` }} />
                  </div>
                  <b>{fit}</b>
                </div>
                {t.focus === x.id ? (
                  <Button size="sm" tone="ghost" onClick={() => dispatch({ type: 'setFocus', id: null })}>
                    Stop courting
                  </Button>
                ) : (
                  <Button size="sm" tone="ghost" onClick={() => dispatch({ type: 'setFocus', id: x.id })}>
                    Court {x.name}
                  </Button>
                )}
              </article>
            )
          })}
        </div>
        <p className="mk-note">
          Loyalty drifts toward how well you fit each group: your prices, your aisles, your hours, your causes. Loyal groups bring more shoppers; unhappy ones bring fewer.
        </p>
      </HubStage>
    </section>
  )
}

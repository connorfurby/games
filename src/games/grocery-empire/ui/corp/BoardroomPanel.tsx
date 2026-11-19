import { MENUS } from '../../content/menus'
import { OWNER_BY_ID, PROPOSAL_BY_ID, type ProposalEffect } from '../../content/corp/owners'
import { CO, CORP } from '../../sim/balance'
import { can } from '../../sim/commands'
import {
  buybackCost,
  goPrivateCost,
  ipoProceeds,
  issueProceeds,
  lobbyCost,
  meetingCost,
  ownerBuyoutCost,
  payoutPerSec,
  sellableShares,
  tally,
  valuation,
  type MeetingChoice,
} from '../../sim/corp/company'
import { useGame } from '../GameContext'
import { clock, money } from '../format'
import { HubStage } from '../components/HubStage'
import { Button } from '../kit'
import { BoardroomScene } from './BoardroomScene'
import { OWNER_COLOR, initialsOf } from './ownerLook'
import { Spark } from './Spark'
import { HowItWorks } from './HowItWorks'
import { CompanyLedger } from './CompanyLedger'
import './corp.css'
import './boardroom.css'

const pct = (n: number) => `${Math.round((n / CORP.sharesPerCompany) * 1000) / 10}%`

function effectLine(e: ProposalEffect): string {
  switch (e.kind) {
    case 'demand':
      return `${e.v >= 1 ? '+' : '−'}${Math.round(Math.abs(e.v - 1) * 100)}% shoppers for ${clock(e.sec ?? 600)}`
    case 'wages':
      return `wages ${e.v >= 1 ? '+' : '−'}${Math.round(Math.abs(e.v - 1) * 100)}% for ${clock(e.sec ?? 600)}`
    case 'ventures':
      return `venture tills +${Math.round((e.v - 1) * 100)}% for ${clock(e.sec ?? 600)}`
    case 'cash':
      return `costs ${Math.abs(e.v)}s of sales`
    case 'brand':
      return `brand ${e.v >= 0 ? 'up' : 'down'}`
    case 'price':
      return `share price ${e.v >= 1 ? 'up' : 'down'}`
    case 'heat':
      return `Heat ${e.v >= 0 ? '+' : '−'}${Math.abs(e.v)}`
    case 'action':
      return e.act === 'lab' ? 'the lab jumps ahead' : e.act === 'execPool' ? 'fresh executive candidates' : 'goodwill +15'
  }
}

const MEETING: { id: MeetingChoice; label: string; hint: string }[] = [
  { id: 'cuts', label: 'Announce cost cuts', hint: 'Wages −10% for 10 min · brand down · price up' },
  { id: 'buyback', label: 'Buy back shares', hint: 'Spend 2% of the company’s value · price up' },
  { id: 'promise', label: 'Promise a bigger quarter', hint: 'Next target +5% · price up a little' },
  { id: 'apology', label: 'Apologise', hint: 'Brand down a little · price steadies' },
]

export function BoardroomPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const co = s.corp.co
  const m = (n: number) => money(n, numberFormat)
  const val = valuation(s)

  // Ownership ring.
  const slices: { id: string; name: string; n: number }[] = [{ id: 'you', name: 'You', n: co.you }]
  for (const [id, n] of Object.entries(co.owners)) if (n > 0) slices.push({ id, name: OWNER_BY_ID[id]?.name ?? id, n })
  if (co.float > 0) slices.push({ id: 'public', name: 'The public', n: co.float })
  let acc = 0
  const ring = slices.map((sl) => {
    const a0 = (acc / CORP.sharesPerCompany) * Math.PI * 2
    acc += sl.n
    const a1 = (acc / CORP.sharesPerCompany) * Math.PI * 2
    const large = a1 - a0 > Math.PI ? 1 : 0
    const p = (a: number, r: number) => `${50 + r * Math.sin(a)},${50 - r * Math.cos(a)}`
    const d =
      sl.n >= CORP.sharesPerCompany
        ? 'M50,8 A42,42 0 1 1 49.99,8 Z M50,26 A24,24 0 1 0 50.01,26 Z'
        : `M${p(a0, 42)} A42,42 0 ${large} 1 ${p(a1, 42)} L${p(a1, 24)} A24,24 0 ${large} 0 ${p(a0, 24)} Z`
    return { ...sl, d }
  })

  // The tray's primary: the most pressing decision, else the listing move.
  const offer = co.offer && co.offer.until > s.time ? co.offer : null
  const offerDef = offer ? OWNER_BY_ID[offer.owner] : null
  const ipoPct = CO.ipoFloats[1]
  const ipo = can(s, { type: 'goPublic', pct: ipoPct })
  const tray = co.listed
    ? {
        primary: {
          label: 'Buy back 5% of the shares',
          tone: 'primary' as const,
          size: 'lg' as const,
          cost: m(buybackCost(s)),
          disabled: !can(s, { type: 'buyback' }).ok,
          onClick: () => dispatch({ type: 'buyback' }),
        },
        failReason: can(s, { type: 'buyback' }).reason,
        hint: 'Owning more means the board listens to you.',
      }
    : {
        primary: {
          label: `Go public: sell ${Math.round(ipoPct * 100)}% for ${m(ipoProceeds(s, ipoPct))}`,
          tone: 'primary' as const,
          size: 'lg' as const,
          disabled: !ipo.ok,
          onClick: () => dispatch({ type: 'goPublic', pct: ipoPct }),
        },
        failReason: ipo.ok ? undefined : ipo.reason,
        hint: 'A listing raises a lot of cash, but every quarter you must beat a sales target.',
      }

  const vote = co.vote ? PROPOSAL_BY_ID[co.vote.id] : null
  const preview = vote ? tally(s, true) : null
  const previewNo = vote ? tally(s, false) : null

  return (
    <section className="ge-panel bd-panel">
      <HubStage purpose={MENUS.boardroom.purpose} department={MENUS.boardroom.name} scene={<BoardroomScene />} tray={tray}>
        <HowItWorks menu="boardroom" />
        {/* Decisions first: they expire. */}
        {offer && offerDef ? (
          <article className="bd-decide bd-decide--offer">
            <span className="bd-avatar" style={{ background: OWNER_COLOR[offerDef.id] }}>
              {initialsOf(offerDef.name)}
            </span>
            <div className="bd-decide__body">
              <p className="bd-k">An investor wants in · {clock(offer.until - s.time)}</p>
              <h3>
                {offerDef.name} offers {m(offer.shares * offer.price)} for {pct(offer.shares)}
              </h3>
              <p className="bd-who">{offerDef.who}</p>
              <p className="bd-says">{offerDef.says}</p>
              <ul className="bd-pc">
                <li className="is-up">＋ {offerDef.perk}</li>
                <li className="is-down">－ {offerDef.catch}</li>
                <li className="is-down">
                  － From then on they take {Math.round((offer.shares / CORP.sharesPerCompany) * CO.payoutShare * 1000) / 10}% of sales as their dividend
                </li>
              </ul>
              <div className="bd-acts">
                <Button tone="primary" disabled={!can(s, { type: 'answerOffer', accept: true }).ok} onClick={() => dispatch({ type: 'answerOffer', accept: true })}>
                  Sell them {pct(Math.min(offer.shares, sellableShares(s)))}
                </Button>
                <Button tone="ghost" onClick={() => dispatch({ type: 'answerOffer', accept: false })}>
                  Not today
                </Button>
              </div>
            </div>
          </article>
        ) : null}

        {co.meeting ? (
          <article className="bd-decide bd-decide--meeting">
            <div className="bd-decide__body">
              <p className="bd-k">Shareholder meeting · the price sags until you answer</p>
              <h3>
                You missed the quarter: {m(co.meeting.got)}/s against {m(co.meeting.target)}/s
              </h3>
              <div className="bd-choices">
                {MEETING.map((c) => {
                  const ok = can(s, { type: 'resolveMeeting', choice: c.id }).ok
                  const cost = meetingCost(s, c.id)
                  return (
                    <div key={c.id} className="bd-choice">
                      <Button tone="ghost" disabled={!ok} cost={cost > 0 ? m(cost) : undefined} onClick={() => dispatch({ type: 'resolveMeeting', choice: c.id })}>
                        {c.label}
                      </Button>
                      <span>{c.hint}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </article>
        ) : null}

        {vote && preview && previewNo ? (
          <article className="bd-decide bd-decide--vote">
            <div className="bd-decide__body">
              <p className="bd-k">Board vote · {clock(co.vote!.until - s.time)} · the board decides without you if you wait</p>
              <h3>{vote.title}</h3>
              <p className="bd-says">{vote.pitch}</p>
              <p className="bd-effects">If it passes: {vote.yes.map(effectLine).join(' · ')}</p>
              <ul className="bd-tally">
                {preview.rows.map((r) => (
                  <li key={r.who}>
                    <span>{r.who}</span>
                    <span>{pct(r.shares)}</span>
                    <span className={r.who === 'You' ? 'bd-muted' : r.yes ? 'is-up' : 'is-down'}>
                      {r.who === 'You' ? 'your call' : r.yes ? 'yes' : 'no'}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="bd-acts">
                <Button tone="primary" onClick={() => dispatch({ type: 'castVote', yes: true })}>
                  Vote yes {preview.pass ? '· passes' : '· fails'}
                </Button>
                <Button tone="ghost" onClick={() => dispatch({ type: 'castVote', yes: false })}>
                  Vote no {previewNo.pass ? '· still passes' : '· fails'}
                </Button>
              </div>
              {Object.entries(co.owners).filter(([, n]) => n > 0).length ? (
                <div className="bd-lobby">
                  <span className="bd-muted">Win someone over over lunch ({m(lobbyCost(s))}):</span>
                  {Object.entries(co.owners)
                    .filter(([id, n]) => n > 0 && !co.vote!.lobbied.includes(id))
                    .map(([id]) => (
                      <Button key={id} size="sm" tone="ghost" disabled={!can(s, { type: 'lobbyOwner', owner: id }).ok} onClick={() => dispatch({ type: 'lobbyOwner', owner: id })}>
                        {OWNER_BY_ID[id]?.name ?? id}
                      </Button>
                    ))}
                </div>
              ) : null}
            </div>
          </article>
        ) : null}

        <CompanyLedger />

        <div className="bd-grid">
          <article className="bd-card">
            <h3>Who owns the company</h3>
            <div className="bd-own">
              <svg viewBox="0 0 100 100" className="bd-ring" aria-hidden>
                {ring.map((r) => (
                  <path key={r.id} d={r.d} fill={OWNER_COLOR[r.id] ?? '#8a8f99'} fillRule="evenodd" />
                ))}
                <text x="50" y="54" textAnchor="middle" fontSize="13" fontWeight="800" fill="currentColor">
                  {pct(co.you)}
                </text>
              </svg>
              <ul className="bd-legend">
                {slices.map((sl) => (
                  <li key={sl.id}>
                    <i style={{ background: OWNER_COLOR[sl.id] ?? '#8a8f99' }} />
                    <span>{sl.name}</span>
                    <strong>{pct(sl.n)}</strong>
                  </li>
                ))}
              </ul>
            </div>
            {co.you < CORP.sharesPerCompany ? (
              <p className="bd-payout">
                Outside owners take <strong>{m(payoutPerSec(s) * 60)}</strong> a minute ({Math.round((1 - co.you / CORP.sharesPerCompany) * CO.payoutShare * 1000) / 10}% of
                sales). Paid so far {m(co.paidOut)}.
              </p>
            ) : null}
            <p className="bd-muted">
              {co.you > CORP.sharesPerCompany / 2
                ? 'You hold a majority: every board vote goes your way.'
                : 'You no longer hold a majority. The board can overrule you.'}
            </p>
          </article>

          <article className="bd-card">
            <h3>{co.listed ? 'On the exchange' : 'A private company'}</h3>
            <div className="bd-price">
              <div>
                <span>Worth</span>
                <strong>{m(val)}</strong>
              </div>
              <div>
                <span>Per share</span>
                <strong>{m(val / CORP.sharesPerCompany)}</strong>
              </div>
              <Spark data={co.hist.slice(-45)} w={140} h={36} />
            </div>
            {co.listed ? (
              <>
                <div className="bd-quarter">
                  <div className="bd-quarter__bar">
                    <i
                      style={{
                        width: `${Math.min(100, (co.quarter.samples ? co.quarter.sum / co.quarter.samples / Math.max(1e-9, co.quarter.target) : 0) * 100)}%`,
                      }}
                    />
                  </div>
                  <p>
                    Quarter {co.quarter.n}: averaging {m(co.quarter.samples ? co.quarter.sum / co.quarter.samples : 0)}/s · target {m(co.quarter.target)}/s ·{' '}
                    {clock(Math.max(0, co.quarter.endsAt - s.time))} left
                  </p>
                  <p className="bd-muted">
                    Streak {co.streak} · beat {co.beats} · missed {co.misses}
                  </p>
                </div>
                <div className="bd-acts">
                  <Button tone="ghost" cost={m(issueProceeds(s))} disabled={!can(s, { type: 'issueShares' }).ok} onClick={() => dispatch({ type: 'issueShares' })}>
                    Sell 5% more to the public
                  </Button>
                  <Button tone="ghost" cost={m(goPrivateCost(s))} disabled={!can(s, { type: 'goPrivate' }).ok} onClick={() => dispatch({ type: 'goPrivate' })}>
                    Take it private
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="bd-muted">
                  Selling 25% means {Math.round(0.25 * CO.payoutShare * 1000) / 10}% of every sale goes to the public as dividends. Going public sells a slice to everyone at once. Big cash, but each {CO.quarterSec / 60}-minute quarter you must beat last quarter’s sales by about {Math.round(CO.targetGrowth * 100)}%.
                </p>
                <div className="bd-acts">
                  {CO.ipoFloats.map((p) => {
                    const ok = can(s, { type: 'goPublic', pct: p })
                    return (
                      <Button key={p} tone="ghost" disabled={!ok.ok} title={ok.reason} onClick={() => dispatch({ type: 'goPublic', pct: p })}>
                        Sell {Math.round(p * 100)}% · {m(ipoProceeds(s, p))}
                      </Button>
                    )
                  })}
                </div>
                {s.era < CO.ipoEra ? <p className="bd-muted">Listing opens in Era {CO.ipoEra}.</p> : null}
              </>
            )}
          </article>
        </div>

        <h3 className="mk-h">Owners</h3>
        {Object.entries(co.owners).filter(([, n]) => n > 0).length === 0 ? (
          <p className="mk-note">Nobody else owns a slice yet. Investors will knock once the store is earning; each one changes how the company runs.</p>
        ) : (
          <div className="bd-owners">
            {Object.entries(co.owners)
              .filter(([, n]) => n > 0)
              .map(([id, n]) => {
                const def = OWNER_BY_ID[id]
                if (!def) return null
                const cost = ownerBuyoutCost(s, id)
                return (
                  <article key={id} className="bd-owner">
                    <span className="bd-avatar" style={{ background: OWNER_COLOR[id] }}>
                      {initialsOf(def.name)}
                    </span>
                    <div>
                      <h4>
                        {def.name} · {pct(n)}
                      </h4>
                      <p className="bd-who">{def.who}</p>
                      <ul className="bd-pc">
                        <li className="is-up">＋ {def.perk}</li>
                        <li className="is-down">－ {def.catch}</li>
                      </ul>
                      <Button size="sm" tone="ghost" cost={m(cost)} disabled={!can(s, { type: 'buyOutOwner', owner: id }).ok} onClick={() => dispatch({ type: 'buyOutOwner', owner: id })}>
                        Buy them out
                      </Button>
                    </div>
                  </article>
                )
              })}
          </div>
        )}
        <p className="mk-note">
          Raised so far {m(co.raised)} · board votes won {co.votesWon}, lost {co.votesLost}
        </p>
      </HubStage>
    </section>
  )
}

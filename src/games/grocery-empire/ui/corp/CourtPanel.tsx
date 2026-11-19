import { MENUS } from '../../content/menus'
import { JUDGE_BY_ID, LAWYERS } from '../../content/corp/legal'
import { RIVALS } from '../../content/rivals'
import { can } from '../../sim/commands'
import { byName, lawyerCost, settleCost, suitKind, trialOdds } from '../../sim/corp/court'
import { rivalActive } from '../../sim/corp/rivalry'
import { useGame } from '../GameContext'
import { clock, money } from '../format'
import { HubStage } from '../components/HubStage'
import { Button } from '../kit'
import { ROOM_GROUND, RoomScene } from '../scenes/room'
import { HowItWorks } from './HowItWorks'
import './corp.css'
import './treasury.css'

const G = ROOM_GROUND

function CourtScene() {
  const { state: s } = useGame()
  const c = s.corp
  const top = c.suits[0]
  const judge = top ? JUDGE_BY_ID[top.judge] : null
  return (
    <RoomScene
      label={`Courthouse: ${c.suits.length} open cases`}
      chips={[
        { label: 'Open cases', value: String(c.suits.length) },
        { label: 'Won', value: String(c.suitsWon) },
        { label: 'Lost', value: String(c.suitsLost) },
      ]}
      skyTop="#1c1712"
      skyBottom="#2a2219"
      phoneChipsOnly
      className="ct-room"
    >
      {/* Wood panelling and the seal */}
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 80} y="0" width="76" height={G} fill="#3a2a1d" opacity={i % 2 ? 0.6 : 0.4} />
      ))}
      <circle cx="150" cy="80" r="34" fill="#b9a36a" opacity="0.8" />
      <text x="150" y="86" textAnchor="middle" fontSize="16" fontWeight="900" fill="#3a2a1d">
        ⚖
      </text>
      {/* The bench */}
      <rect x="340" y={G - 140} width="280" height="100" fill="#5b3a26" />
      <rect x="330" y={G - 150} width="300" height="16" fill="#6b4434" />
      <circle cx="480" cy={G - 168} r="18" fill={judge ? '#efe6cf' : '#5b3a26'} />
      {judge ? <rect x="458" y={G - 152} width="44" height="30" rx="6" fill="#1a1a1e" /> : null}
      <text x="480" y={G - 100} textAnchor="middle" fontSize="13" fontWeight="800" fill="#efe6cf">
        {judge ? judge.name : 'Court is not in session'}
      </text>
      {/* Gavel */}
      <g className={top ? 'ct-gavel' : undefined} transform={`translate(590 ${G - 160})`}>
        <rect x="-4" y="-2" width="34" height="5" fill="#8a6a4a" />
        <rect x="-10" y="-10" width="14" height="20" rx="3" fill="#6b4434" />
      </g>
      {/* Tables */}
      <rect x="120" y={G - 40} width="200" height="40" fill="#4a2f26" />
      <rect x="640" y={G - 40} width="200" height="40" fill="#4a2f26" />
      <text x="220" y={G - 16} textAnchor="middle" fontSize="12" fontWeight="800" fill="#f2c14e">
        YOU
      </text>
      <text x="740" y={G - 16} textAnchor="middle" fontSize="12" fontWeight="800" fill="#ff9a80">
        {top ? byName(top.by).toUpperCase().slice(0, 18) : '—'}
      </text>
    </RoomScene>
  )
}

export function CourtPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const c = s.corp
  const m = (n: number) => money(n, numberFormat)
  const angry = RIVALS.filter((r) => rivalActive(s, r.id) && can(s, { type: 'sueRival', id: r.id }).ok)
  const first = c.suits.find((x) => !x.yours)
  const tray = first
    ? {
        primary: {
          label: `Settle “${suitKind(first.kind)?.title}”`,
          tone: 'primary' as const,
          size: 'lg' as const,
          cost: m(settleCost(s, first.id)),
          disabled: !can(s, { type: 'settleSuit', suit: first.id }).ok,
          onClick: () => dispatch({ type: 'settleSuit', suit: first.id }),
        },
        hint: 'Settling pays half the claim and ends it. Or lawyer up and go to trial below.',
      }
    : undefined
  return (
    <section className="ge-panel ct-panel">
      <HubStage purpose={MENUS.court.purpose} department={MENUS.court.name} scene={<CourtScene />} tray={tray}>
        <HowItWorks menu="court" />
        {c.suits.length === 0 ? <p className="mk-note">No open cases. Keep it that way, or go looking for one.</p> : null}
        <div className="ct-cases">
          {c.suits.map((suit) => {
            const kind = suitKind(suit.kind)
            const judge = JUDGE_BY_ID[suit.judge]
            const odds = Math.round(trialOdds(s, suit) * 100)
            const next = suit.lawyer + 1
            return (
              <article key={suit.id} className={`ct-case${suit.yours ? ' is-yours' : ''}`}>
                <p className="bd-k">
                  {suit.yours ? `You v. ${byName(suit.by)}` : `${byName(suit.by)} v. You`} · {clock(Math.max(0, suit.answerBy - s.time))}{' '}
                  {suit.yours ? 'to trial' : 'to answer'}
                </p>
                <h3>{kind?.title}</h3>
                <p className="bd-says">{kind?.blurb}</p>
                <div className="ct-facts">
                  <span>
                    Claim <strong>{m(suit.claim)}</strong>
                  </span>
                  <span>
                    {judge?.name}: <em>{judge?.quirk}</em>
                  </span>
                  <span>
                    Your lawyer: <strong>{LAWYERS[suit.lawyer]?.name}</strong>
                  </span>
                </div>
                <div className="ct-odds">
                  <div>
                    <i style={{ width: `${odds}%` }} />
                  </div>
                  <span>{odds}% to win at trial</span>
                </div>
                <div className="bd-acts">
                  {next < LAWYERS.length ? (
                    <Button size="sm" tone="ghost" cost={m(lawyerCost(s, next))} disabled={!can(s, { type: 'hireLawyer', suit: suit.id, tier: next }).ok} onClick={() => dispatch({ type: 'hireLawyer', suit: suit.id, tier: next })}>
                      Hire {LAWYERS[next]?.name}
                    </Button>
                  ) : null}
                  <Button size="sm" tone="primary" onClick={() => dispatch({ type: 'goToTrial', suit: suit.id })}>
                    Go to trial
                  </Button>
                  {!suit.yours ? (
                    <Button size="sm" tone="ghost" cost={m(settleCost(s, suit.id))} disabled={!can(s, { type: 'settleSuit', suit: suit.id }).ok} onClick={() => dispatch({ type: 'settleSuit', suit: suit.id })}>
                      Settle
                    </Button>
                  ) : (
                    <Button size="sm" tone="ghost" onClick={() => dispatch({ type: 'settleSuit', suit: suit.id })}>
                      Accept their settlement
                    </Button>
                  )}
                </div>
                {!suit.yours ? <p className="bd-muted">Ignore it and you lose by default, paying half again on top.</p> : null}
              </article>
            )
          })}
        </div>

        <h3 className="mk-h">Sue a rival</h3>
        {angry.length ? (
          <div className="bd-acts">
            {angry.map((r) => (
              <Button key={r.id} tone="ghost" onClick={() => dispatch({ type: 'sueRival', id: r.id })}>
                Sue {r.name}
              </Button>
            ))}
          </div>
        ) : (
          <p className="mk-note">You can sue a rival who has turned on you (their grudge is 40 or more). Win and they pay the claim; lose and you pay the court’s costs.</p>
        )}
        <p className="mk-note">
          Won {c.suitsWon} · lost {c.suitsLost} · settled {c.settled}
        </p>
      </HubStage>
    </section>
  )
}

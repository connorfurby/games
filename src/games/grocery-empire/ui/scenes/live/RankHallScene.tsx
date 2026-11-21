import { EMPIRE_REWARDS, nextEmpireReward } from '../../../content/empireRewards'
import { empireXpToNext } from '../../../sim/formulas'
import { useGame } from '../../GameContext'
import { qty } from '../../format'
import { usePhone } from '../../kit/hooks'
import { Badge, Hit, Person, RoomScene, Sign } from '../room'
import { TweenXpRing } from './TweenRing'

/** Empire rank hall: XP ring, last/next reward plaques, trait lectern, a hung banner. */
export function RankHallScene() {
  const { state: s, reducedMotion } = useGame()
  const lv = s.empire.level
  const need = Math.max(1, empireXpToNext(lv))
  const rawFill = Math.max(0, Math.min(1, s.empire.xp / need))
  const next = nextEmpireReward(lv)
  const last = [...EMPIRE_REWARDS].reverse().find((r) => lv >= r.level) ?? null
  const xpLeft = Math.max(0, need - s.empire.xp)
  const xpLeftLabel = xpLeft < 1000 ? String(Math.ceil(xpLeft)) : qty(xpLeft)
  const points = s.empire.points
  const c = 2 * Math.PI * 48
  const phone = usePhone()

  // Phone: a portrait hall with the ring, the rank and what comes next, all readable.
  if (phone) {
    const chips = [
      { label: 'XP', value: `${Math.round(rawFill * 100)}%` },
      { label: 'Points', value: String(points), rate: points > 0 ? 'spend' : undefined },
      next ? { label: 'Next', value: `${xpLeftLabel} XP` } : { label: 'Next', value: 'Done' },
    ]
    return (
      <RoomScene
        label={`Empire rank ${lv}. ${points} trait points. ${next ? `Next ${next.name}` : 'All rewards claimed'}.`}
        chips={chips}
        skyTop="var(--sc-night-top)"
        skyBottom="var(--sc-night-bottom)"
        portrait={{ w: 360, h: 170 }}
      >
        <circle cx="76" cy="86" r="58" fill="#0f131a" stroke="#3a4458" strokeWidth="2" />
        <circle cx="76" cy="86" r="50" fill="none" stroke="#3d4a62" strokeWidth="9" />
        <TweenXpRing
          fill={rawFill}
          reducedMotion={reducedMotion}
          cx={76}
          cy={86}
          r={50}
          circumference={2 * Math.PI * 50}
        />
        <text x="76" y="72" textAnchor="middle" className="rm-sign" style={{ fontSize: 12 }}>
          Rank
        </text>
        <text x="76" y="104" textAnchor="middle" className="rm-sign" style={{ fontSize: 34, fontWeight: 700 }}>
          {lv}
        </text>
        <g transform="translate(152 30)">
          <rect width="196" height="58" rx="8" fill="#121820" stroke="#d9a441" strokeOpacity="0.5" />
          <text x="12" y="22" className="rm-sign" style={{ fontSize: 11, opacity: 0.75 }}>
            {next ? `Next · rank ${next.level}` : 'Every reward claimed'}
          </text>
          <text x="12" y="42" className="rm-sign" style={{ fontSize: 14, fontWeight: 700 }}>
            {next ? (next.name.length > 22 ? `${next.name.slice(0, 21)}…` : next.name) : 'Well done'}
          </text>
        </g>
        <g transform="translate(152 98)">
          <rect width="196" height="44" rx="8" fill="#121820" stroke={points > 0 ? '#7fbf7a' : '#3a4458'} />
          <text x="12" y="27" className="rm-sign" style={{ fontSize: 13, fontWeight: 600 }}>
            {points > 0 ? `${points} trait point${points > 1 ? 's' : ''} to spend` : 'One trait point per rank'}
          </text>
        </g>
      </RoomScene>
    )
  }

  return (
    <RoomScene
      label={`Empire rank ${lv}. ${points} trait points. ${next ? `Next ${next.name}` : 'All rewards claimed'}.`}
      chips={[
        { label: 'XP', value: `${Math.round(rawFill * 100)}%` },
        { label: 'Points', value: String(points), rate: points > 0 ? 'spend' : undefined },
        next ? { label: 'Next', value: `${xpLeftLabel} XP` } : { label: 'Next', value: 'Done' },
      ]}
      skyTop="var(--sc-night-top)"
      skyBottom="var(--sc-night-bottom)"
      height={260}
    >
      {/* Rank ring */}
      <Hit x={36} y={56} w={180} h={176} label="Empire rank ring" menu="empire" coachId="empire-rank">
        <circle cx="126" cy="142" r="54" fill="#0f131a" stroke="#3a4458" strokeWidth="2" />
        <circle cx="126" cy="142" r="48" fill="none" stroke="#3d4a62" strokeWidth="9" />
        <TweenXpRing fill={rawFill} reducedMotion={reducedMotion} cx={126} cy={142} r={48} circumference={c} />
        <Sign x={126} y={122} text="Rank" small anchor="middle" />
        <text x="126" y="156" textAnchor="middle" className="rm-sign" style={{ fontSize: 34, fontWeight: 700 }}>
          {lv}
        </text>
      </Hit>

      {/* Last reward plaque */}
      <g transform="translate(246 62)">
        <rect width="280" height="72" rx="8" fill="#121820" stroke="#3a4458" />
        <Sign x={14} y={24} text="Last reward" small />
        <Sign x={14} y={48} text={last ? last.name.slice(0, 22) : 'No reward yet'} />
        {last ? <Badge x={206} y={30} text={`Lv ${last.level}`} w={52} /> : null}
      </g>

      {/* Next reward plaque */}
      <Hit x={246} y={146} w={280} h={64} label={next ? `Next: ${next.name}` : 'All rewards'} menu="empire">
        <rect x="246" y="146" width="280" height="64" rx="8" fill="#121820" stroke="#d9a441" strokeOpacity="0.55" />
        <Sign x={260} y={170} text={next ? `Next · rank ${next.level}` : 'Hall complete'} />
        <Sign
          x={260}
          y={192}
          text={next ? `${next.name.slice(0, 18)} · ${xpLeftLabel} XP` : 'Every reward is yours.'}
          small
        />
      </Hit>

      {/* Trait lectern */}
      <Hit x={556} y={62} w={170} h={148} label={`Trait points: ${points}`} menu="empire" coachId="empire-doctrine">
        <rect x="556" y="62" width="170" height="148" rx="8" fill="#0f131a" stroke="#4a5a72" strokeWidth="2" />
        <rect x="570" y="76" width="142" height="64" rx="4" fill="#1a2433" stroke="#d9a441" strokeOpacity="0.45" />
        <Sign x={641} y={96} text="Trait points" small anchor="middle" />
        <text x="641" y="128" textAnchor="middle" className="rm-sign" style={{ fontSize: 30, fontWeight: 700 }}>
          {points}
        </text>
        {points > 0 ? <circle cx="700" cy="86" r="5" fill="#7cc47f" className="rm-pulse" /> : null}
        <Sign x={641} y={170} text={points > 0 ? 'Spend below' : 'One per rank'} small anchor="middle" />
      </Hit>

      {/* Hung banner */}
      <g transform="translate(760 58)" aria-hidden>
        <rect x="-3" y="-4" width="102" height="6" rx="2" fill="#4a5a72" />
        <path d="M0 2 H96 V108 L48 92 L0 108 Z" fill="#7a2f3a" stroke="#d9a441" strokeOpacity="0.6" />
        <Sign x={48} y={34} text="Empire" small anchor="middle" />
        <text x="48" y="68" textAnchor="middle" className="rm-sign" style={{ fontSize: 28, fontWeight: 700 }}>
          {lv}
        </text>
      </g>

      <Person x={800} y={214} tint="#c9a15a" working={rawFill > 0.85} delay={0.2} />
      <Person x={856} y={214} tint="#8fb6e0" delay={0.45} />
      <Person x={912} y={214} tint="#a8c090" delay={0.7} />
    </RoomScene>
  )
}

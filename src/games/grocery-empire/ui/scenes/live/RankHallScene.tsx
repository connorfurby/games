import { EMPIRE_REWARDS, nextEmpireReward } from '../../../content/empireRewards'
import { EMPIRE } from '../../../sim/balance'
import { empireXpToNext } from '../../../sim/formulas'
import { useGame } from '../../GameContext'
import { useTween } from '../../fx'
import { qty } from '../../format'
import { Badge, Hit, Person, RoomScene, Sign } from '../room'

/** Compact empire rank hall — meant to sit in a HubStage rail beside the hero copy. */
export function RankHallScene() {
  const { state: s, reducedMotion } = useGame()
  const lv = s.empire.level
  const need = Math.max(1, empireXpToNext(lv))
  const rawFill = Math.max(0, Math.min(1, s.empire.xp / need))
  const fill = useTween(rawFill, { duration: reducedMotion ? 0 : 520, reducedMotion })
  const next = nextEmpireReward(lv)
  const last = [...EMPIRE_REWARDS].reverse().find((r) => lv >= r.level) ?? null
  const xpLeft = Math.max(0, need - s.empire.xp)
  const c = 2 * Math.PI * 48
  const ring = Math.max(0.02, fill)

  return (
    <RoomScene
      label={`Empire rank ${lv}. ${next ? `Next ${next.name}` : 'All rewards claimed'}.`}
      chips={[
        { label: 'Rank', value: `${lv}` },
        { label: 'XP', value: `${Math.round(fill * 100)}%` },
        ...(last ? [{ label: 'Last', value: last.name.slice(0, 14) }] : []),
        ...(next
          ? [{ label: 'Next', value: `${xpLeft < 1000 ? Math.ceil(xpLeft) : qty(xpLeft)} XP` }]
          : [{ label: 'Next', value: 'Done' }]),
      ]}
      skyTop="#1a2030"
      skyBottom="#2a3348"
      height={260}
    >
      <Hit x={36} y={52} w={180} h={180} label="Empire rank ring" menu="empire" coachId="empire-rank">
        <circle cx="126" cy="142" r="54" fill="#0f131a" stroke="#3a4458" strokeWidth="2" />
        <circle cx="126" cy="142" r="48" fill="none" stroke="#3d4a62" strokeWidth="9" />
        <circle
          cx="126"
          cy="142"
          r="48"
          fill="none"
          stroke="#d9a441"
          strokeWidth="9"
          strokeDasharray={`${c * ring} ${c}`}
          transform="rotate(-90 126 142)"
          strokeLinecap="round"
        />
        <Sign x={126} y={134} text="Empire" small anchor="middle" />
        <text x="126" y="164" textAnchor="middle" className="rm-sign" style={{ fontSize: 26, fontWeight: 700 }}>
          {lv}
        </text>
        <Sign x={126} y={184} text={`of ${EMPIRE.maxLevel}`} small anchor="middle" />
      </Hit>

      <g transform="translate(250 62)">
        <rect width="280" height="72" rx="8" fill="#121820" stroke="#3a4458" />
        <Sign x={14} y={24} text="Last reward" small />
        <Sign x={14} y={48} text={last ? last.name.slice(0, 22) : 'No reward yet'} />
        {last ? <Badge x={200} y={34} text={`Lv ${last.level}`} w={52} /> : null}
      </g>

      <Hit x={250} y={148} w={280} h={64} label={next ? `Next: ${next.name}` : 'All rewards'} menu="empire">
        <rect x="250" y="148" width="280" height="64" rx="8" fill="#121820" stroke="#d9a441" strokeOpacity="0.55" />
        <Sign x={264} y={172} text={next ? `Next · Empire ${next.level}` : 'Hall complete'} />
        <Sign
          x={264}
          y={194}
          text={
            next
              ? `${next.name.slice(0, 18)} · ${xpLeft < 1000 ? Math.ceil(xpLeft) : qty(xpLeft)} XP`
              : 'Every reward is yours.'
          }
          small
        />
      </Hit>

      <Person x={620} y={210} tint="#c9a15a" working={fill > 0.85} delay={0.2} />
      <Person x={700} y={210} tint="#8fb6e0" delay={0.45} />
      <Person x={780} y={210} tint="#a8c090" delay={0.7} />
    </RoomScene>
  )
}

import { DOCTRINES, doctrinesAtEra } from '../../../content/era2'
import { CAPITAL } from '../../../sim/balance'
import { attentionCap } from '../../../sim/formulas'
import { doctrineCost, tournamentReadPayout } from '../../../sim/systems/capital'
import { useGame } from '../../GameContext'
import { useTween } from '../../fx'
import { qty } from '../../format'
import { Badge, Hit, Person, RoomScene, Sign } from '../room'

/** Strategy hall: Read bank, Att meter, doctrine plaques — RankHall-quality composition. */
export function StrategyHallScene() {
  const { state: s, reducedMotion } = useGame()
  const owned = DOCTRINES.filter((d) => (s.doctrines[d.id] ?? 0) > 0).length
  const nextCost = doctrineCost(s, owned)
  const payout = tournamentReadPayout(s)
  const coolLeft = Math.max(0, Math.ceil((s.compute.nextTournamentAt ?? 0) - s.time))
  const readBank = Math.floor(s.read * 10) / 10
  const attCap = Math.max(1, attentionCap(s))
  const attFill = Math.max(0, Math.min(1, s.compute.attention / attCap))
  const attTween = useTween(attFill, { duration: reducedMotion ? 0 : 480, reducedMotion })
  const visible = doctrinesAtEra(s.era).slice(0, 8)
  const tournyReady = coolLeft <= 0 && s.compute.attention >= CAPITAL.tournamentAttention

  return (
    <RoomScene
      label={`Strategy hall. ${owned} doctrines · Read bank ${readBank}.`}
      chips={[
        { label: 'Read', value: qty(readBank, 'named') },
        { label: 'Next', value: `${nextCost} Read` },
        { label: 'Tourny', value: coolLeft > 0 ? `${coolLeft}s` : `+${payout}`, neg: coolLeft > 0 && !tournyReady },
        { label: 'Att', value: `${Math.floor(s.compute.attention)}/${Math.floor(attCap)}` },
      ]}
      skyTop="var(--sc-night-top)"
      skyBottom="var(--sc-night-bottom)"
      height={260}
    >
      {/* Read bank pedestal */}
      <Hit x={28} y={48} w={160} h={170} label="Read bank" menu="strategy" coachId="strategy-tournament">
        <rect x="40" y="58" width="136" height="150" rx="8" fill="#0f131a" stroke="#4a5a72" strokeWidth="2" />
        <rect x="52" y="70" width="112" height="48" rx="4" fill="#1a2433" stroke="#d9a441" strokeOpacity="0.5" />
        <Sign x={108} y={90} text="Read bank" small anchor="middle" />
        <text x="108" y="112" textAnchor="middle" className="rm-sign" style={{ fontSize: 22, fontWeight: 700 }}>
          {qty(readBank, 'named')}
        </text>
        <Sign x={108} y={148} text={coolLeft > 0 ? `Cool ${coolLeft}s` : `Tourny +${payout}`} small anchor="middle" />
        <Badge x={58} y={168} text={`−${CAPITAL.tournamentAttention} Att`} w={100} />
        {tournyReady ? (
          <circle cx="148" cy="78" r="5" fill="#7cc47f" className="ls-blink is-on" />
        ) : null}
      </Hit>

      {/* Attention meter column */}
      <g transform="translate(200 58)">
        <rect width="56" height="150" rx="6" fill="#121820" stroke="#3a4458" />
        <Sign x={28} y={18} text="Att" small anchor="middle" />
        <rect x="16" y="28" width="24" height="100" rx="4" fill="#1e2836" />
        <rect
          x="16"
          y={28 + 100 * (1 - attTween)}
          width="24"
          height={100 * attTween}
          rx="4"
          fill={attTween >= 0.98 ? '#7cc47f' : '#5a8ab8'}
        />
        <Sign x={28} y={144} text={`${Math.round(attTween * 100)}%`} small anchor="middle" />
      </g>

      {/* Doctrine board with plaques */}
      <Hit x={280} y={48} w={360} h={170} label="Doctrine board" menu="strategy">
        <rect x="280" y="48" width="360" height="170" rx="8" fill="#121820" stroke="#4a5a72" strokeWidth="2" />
        <Sign x={296} y={72} text="Doctrine board" />
        {visible.map((d, i) => {
          const have = (s.doctrines[d.id] ?? 0) > 0
          const isNext = !have && d.order === owned
          const col = i % 2
          const row = Math.floor(i / 2)
          const x = 296 + col * 168
          const y = 88 + row * 30
          return (
            <g key={d.id} transform={`translate(${x} ${y})`}>
              <rect
                width="156"
                height="24"
                rx="4"
                fill={have ? '#2a4a38' : isNext ? '#3a4e68' : '#1a222e'}
                stroke={have ? '#5a9a6e' : isNext ? '#d9a441' : '#2a3444'}
                strokeWidth="1.5"
                opacity={have || isNext ? 1 : 0.55}
              />
              <text x="8" y="16" fontSize="10" fill={have || isNext ? '#efe9dc' : '#7a8796'} fontWeight="600">
                {d.name.slice(0, 18)}
              </text>
            </g>
          )
        })}
      </Hit>

      <g transform="translate(660 58)">
        <rect width="140" height="72" rx="8" fill="#121820" stroke="#3a4458" />
        <Sign x={14} y={24} text="Next doctrine" small />
        <Sign x={14} y={48} text={`${nextCost} Read`} />
      </g>

      <Person x={700} y={210} tint="#c9a15a" working={tournyReady} delay={0.2} />
      <Person x={760} y={210} tint="#8fb6e0" delay={0.5} />
      <Person x={820} y={210} tint="#a8c090" delay={0.8} />
    </RoomScene>
  )
}

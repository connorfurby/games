import { wireAdActive } from '../../../sim/systems/late'
import { useGame } from '../../GameContext'
import { clock } from '../../format'
import { Badge, Hit, Person, RoomScene, Sign } from '../room'
import { Beam, Blink, TickerTape } from './primitives'

const POSTURE_TINT = { neighborhood: '#c9a15a', circular: '#d9665b', houseBrand: '#8a6fb8' } as const

const CLIMATE_BEAM: Record<string, string> = {
  quiet: '#7cc47f',
  heat: '#e0a64a',
  orchard: '#6a9a55',
  tide: '#6ea8c9',
  night: '#8d84c4',
  ash: '#a09080',
  ice: '#9fd4e4',
  market: '#c9a15a',
}

/** Marketing room: ad count, celebrity timer, war banner, tappable billboard / dish / wire. */
export function BillboardScene() {
  const { state: s } = useGame()
  const ads = Math.max(0, s.ads)
  const lamps = Math.min(8, ads)
  const traffic = Math.max(1, Math.min(6, 1 + Math.floor(ads / 3)))
  const celebLeft = Math.max(0, (s.campaigns?.celebrityUntil ?? 0) - s.time)
  const celebrity = celebLeft > 0
  const war = !!s.events?.couponWar?.active
  const warLeft = war ? Math.max(0, Math.ceil((s.events?.couponWar?.endsAt ?? 0) - s.time)) : 0
  const rival = s.events?.rival?.kind ?? null
  const posture = s.marketingPosture ?? 'neighborhood'
  const tint = POSTURE_TINT[posture] ?? POSTURE_TINT.neighborhood
  const air = Object.keys(s.late?.broadcasts ?? {}).filter((k) => (s.late?.broadcasts?.[k] ?? 0) > 0)
  const wire = s.era >= 10 && wireAdActive(s)
  const dish = s.era >= 7
  const flyerLive = s.era >= 2 && (s.depth?.flyer?.until ?? 0) > s.time
  const flyerCool = s.era >= 2 && !flyerLive && (s.depth?.flyer?.cooldownUntil ?? 0) > s.time
  const flyerWeeks = s.depth?.flyerWeeks ?? 0
  const loyal = s.loyalty.tier > 0 || !!s.memos['punch-card']

  return (
    <RoomScene
      phoneChipsOnly
      label={`Billboard, ad level ${ads}${celebrity ? `, celebrity ${clock(celebLeft)}` : ''}${
        war ? ', coupon war' : ''
      }${air.length ? `, broadcasting to ${air.join(' and ')}` : ''}${wire ? ', wire ad running' : ''}`}
      chips={[
        { label: 'Ads', value: `Lv ${ads}` },
        // Timed effects only take a slot while they are running.
        ...(celebrity ? [{ label: 'Celebrity', value: clock(celebLeft) }] : []),
        ...(war ? [{ label: 'Price war', value: clock(warLeft), neg: true }] : []),
        s.era >= 7
          ? { label: 'On air', value: air.length ? String(air.length) : '0' }
          : s.era >= 2
            ? { label: 'Flyer', value: flyerLive ? 'live' : flyerCool ? 'cooling' : `${flyerWeeks} wk` }
            : { label: 'Loyalty', value: loyal ? `Level ${s.loyalty.tier}` : 'not yet' },
      ]}
      skyTop="#201a2e"
      skyBottom="#3a3330"
    >
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={30 + i * 96} y="248" width="48" height="4" rx="2" fill="#efe9dc" opacity="0.22" />
      ))}

      <Hit x={300} y={56} w={360} h={160} label="Buy an ad" menu="marketing" coachId="marketing-ads">
        <g transform="translate(320 56)">
          <rect x="76" y="110" width="12" height="40" fill="#4a423a" />
          <rect x="236" y="110" width="12" height="40" fill="#4a423a" />
          <rect x="0" y="0" width="320" height="110" rx="6" fill="#171210" stroke="#6a5c4a" strokeWidth="3" />
          <rect x="10" y="10" width="300" height="90" rx="3" fill={tint} opacity="0.9" />
          <text x="160" y="52" textAnchor="middle" fontSize="26" fontWeight="800" fill="#1c1410" letterSpacing="3">
            {posture === 'circular' ? 'SALE' : posture === 'houseBrand' ? 'HOUSE BRAND' : 'OPEN'}
          </text>
          <text x="160" y="78" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1c1410" opacity="0.75">
            AD LEVEL {ads}
          </text>
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i} transform={`translate(${28 + i * 38} -8)`}>
              <path d="M0 0 V8" stroke="#6a5c4a" strokeWidth="2" />
              <Blink x={0} y={-2} on={i < lamps} color={i < lamps ? '#ffd98c' : '#4a4036'} />
            </g>
          ))}
          {rival || war ? (
            <g transform="translate(200 74)">
              <rect width="110" height="26" rx="2" fill="#2a2420" stroke="#d9665b" />
              <text x="55" y="17" textAnchor="middle" fontSize="10" fontWeight="700" fill="#e8a79e">
                {war ? `COUPON WAR ${clock(warLeft)}` : (rival ?? '').toUpperCase()}
              </text>
            </g>
          ) : null}
        </g>
        <Badge x={330} y={200} text={`${ads} ads`} w={56} />
        {celebrity ? <Badge x={400} y={200} text={`Celeb ${clock(celebLeft)}`} w={100} /> : null}
      </Hit>

      {Array.from({ length: traffic }, (_, i) => (
        <Person
          key={i}
          x={80 + i * 48}
          y={236}
          tint={['#c9a15a', '#7fa3c9', '#7cc47f', '#c9a0d4', '#e0a060', '#d7c4a1'][i % 6]}
          delay={i * 0.35}
          scale={0.9}
          working={ads > 0}
        />
      ))}

      {celebrity ? (
        <Hit x={250} y={190} w={80} h={70} label="Celebrity endcap" menu="marketing" coachId="marketing-ads">
          <Person x={290} y={236} tint="#f2c14e" delay={0.2} scale={1.1} working />
          <path d="M290 200 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="#f2c14e" opacity="0.9" />
          <Sign x={290} y={188} text={clock(celebLeft)} small anchor="middle" />
        </Hit>
      ) : null}

      {s.era >= 2 ? (
        <Hit x={684} y={150} w={76} h={100} label="Flyer rack" menu="marketing" coachId="marketing-flyer-band">
          <g transform="translate(692 156)">
            <rect x="26" y="40" width="6" height="42" fill="#4a423a" />
            <rect x="8" y="80" width="42" height="6" rx="2" fill="#4a423a" />
            <rect x="0" y="0" width="58" height="42" rx="3" fill="#171210" stroke="#6a5c4a" strokeWidth="2" />
            {[0, 1, 2].map((i) => (
              <rect
                key={i}
                x={6 + i * 17}
                y={7}
                width="13"
                height="28"
                rx="1"
                fill={flyerLive ? '#ffd98c' : '#efe9dc'}
                opacity={flyerLive ? 0.95 - i * 0.1 : 0.35}
              />
            ))}
            <Sign x={29} y={98} text={flyerLive ? 'FLYERS' : `${flyerWeeks} WK`} small anchor="middle" />
          </g>
        </Hit>
      ) : null}

      {loyal ? (
        <Hit x={130} y={96} w={60} h={70} label="Loyalty card" menu="marketing" coachId="marketing-loyalty">
          <g transform="translate(138 106)">
            <rect width="44" height="28" rx="4" fill="#2a2420" stroke="#c9a15a" strokeWidth="2" />
            {[0, 1, 2, 3].map((i) => (
              <circle key={i} cx={9 + i * 9} cy="14" r="3" fill={i < s.loyalty.tier ? '#ffd98c' : '#4a4036'} />
            ))}
            <Sign x={22} y={46} text={`TIER ${s.loyalty.tier}`} small anchor="middle" />
          </g>
        </Hit>
      ) : null}

      {dish ? (
        <Hit x={780} y={100} w={140} h={140} label="Broadcast dish" menu="marketing" coachId="marketing-broadcast">
          <g transform="translate(810 120)">
            <rect x="22" y="22" width="8" height="30" fill="#5a6570" />
            <path d="M0 26 Q26 -2 52 26 Z" fill="#8a96a2" />
            <circle cx="26" cy="14" r="3" fill="#ffd98c" />
            {air.slice(0, 4).map((k, i) => (
              <Beam key={k} x={26 + (i - 1.5) * 10} y={8} h={70 + i * 6} color={CLIMATE_BEAM[k] ?? '#9fd4e4'} />
            ))}
            <Sign x={26} y={68} text={air.length ? `ON AIR · ${air.length}` : 'DISH'} small anchor="middle" />
          </g>
        </Hit>
      ) : null}

      {wire ? (
        <Hit x={300} y={48} w={360} h={24} label="Wire ad" menu="marketing" coachId="marketing-wire-ad">
          <TickerTape x={330} y={48} text="WIRE AD · BUY BUY BUY · WIRE AD" />
        </Hit>
      ) : null}
    </RoomScene>
  )
}

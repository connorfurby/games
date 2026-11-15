import { SEASON_NAMES } from '../../content/horizon'
import { Hit, Person, RoomScene, Sign } from '../scenes/room'

const SKY = ['#8eafc4', '#e2b06a', '#c46a3a', '#1a2140']
const GROUND = ['#d5e2ea', '#6e8f52', '#7a4a2c', '#12182c']

/** Season sky, beds, live Seed chip — Hit to cultivars commit / greenhouse. */
export function GreenhouseScene({
  season,
  seasonT,
  seasonSec,
  beds,
  seed,
  reducedMotion: _reducedMotion,
  onPlant,
}: {
  season: number
  seasonT: number
  seasonSec: number
  beds: readonly boolean[]
  seed?: number
  reducedMotion: boolean
  onPlant?: () => void
}) {
  const sky = SKY[season] ?? SKY[0]
  const ground = GROUND[season] ?? GROUND[0]
  const frac = seasonSec > 0 ? Math.max(0, Math.min(1, seasonT / seasonSec)) : 0
  const name = SEASON_NAMES[season] ?? 'Season'
  const shown = beds.slice(0, 8)
  const gap = shown.length > 0 ? Math.min(100, 720 / Math.max(1, shown.length)) : 100
  const planted = shown.filter(Boolean).length

  return (
    <RoomScene
      label={`${name}. Season ${Math.round(frac * 100)} percent through. ${shown.length} beds.`}
      chips={[
        { label: 'Season', value: name },
        { label: 'Turn', value: `${Math.round(frac * 100)}%` },
        { label: 'Beds', value: `${planted}/${shown.length || 0}` },
        ...(seed != null ? [{ label: 'Seed', value: seed < 10 ? seed.toFixed(1) : String(Math.floor(seed)) }] : []),
      ]}
      skyTop={sky}
      skyBottom={sky}
      ground={ground}
      floor="#1c1916"
      height={240}
    >
      <path d="M80 90 L480 40 L880 90" fill="none" stroke="#1c1916" strokeOpacity="0.25" strokeWidth="2" />
      <rect x="36" y="56" width="520" height="8" rx="4" fill="#1c1916" opacity="0.25" />
      <rect x="36" y="56" width={520 * frac} height="8" rx="4" fill="#1c1916" opacity="0.7" />

      <Hit
        x={60}
        y={100}
        w={820}
        h={120}
        label={shown.length === 0 ? 'Buy greenhouse' : 'Plant beds'}
        menu="cultivars"
        coachId={shown.length === 0 ? 'cultivars-greenhouse' : 'cultivars-standard'}
        onActivate={onPlant}
      >
        {shown.map((filled, i) => {
          const x = 80 + i * gap
          const w = Math.max(36, gap - 16)
          return (
            <g key={i} transform={`translate(${x} 108)`}>
              <rect width={w} height="52" rx="4" fill={filled ? '#3f6b3a' : '#efe9dc'} opacity={filled ? 1 : 0.55} />
              {filled ? (
                <path
                  d={`M${w / 2} 40 C${w / 2} 22 ${w - 6} 18 ${w / 2} 8 C6 18 ${w / 2} 22 ${w / 2} 40 Z`}
                  fill="#d7efc4"
                />
              ) : (
                <Sign x={w / 2} y={32} text={String(i + 1)} small anchor="middle" />
              )}
            </g>
          )
        })}
        {shown.length === 0 ? (
          <Sign x={480} y={160} text="Buy a greenhouse — plant the beds" anchor="middle" />
        ) : null}
      </Hit>

      <Person x={880} y={220} tint="#6e8f52" name="Edda" working={planted > 0} scale={0.9} />
    </RoomScene>
  )
}

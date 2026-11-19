import { BUILD_TRACKS, buildLevel, type BuildFilter } from '../../../content/builds'
import { upkeepPerSec } from '../../../sim/formulas'
import { useGame } from '../../GameContext'
import { cashLabel } from '@/shared/bn'
import { Hit, ROOM_GROUND, RoomScene, Sign } from '../room'

const G = ROOM_GROUND

/**
 * The Build room: your lot, drawn from what you've built. The store grows taller and wider with
 * each storefront tier; storage, coolers, the garden, the vehicle at the curb and the plaza all
 * appear and grow with their own tracks. Empty lots are dashed outlines. Tap a building to jump
 * to its card.
 */
export function BuildStreetScene({ selected, onPick }: { selected: BuildFilter; onPick: (t: BuildFilter) => void }) {
  const { state: s } = useGame()
  const lv = (id: BuildFilter) => buildLevel(s, id)
  const vis = (id: BuildFilter) => {
    const t = BUILD_TRACKS.find((x) => x.id === id)
    try {
      return !!t?.visible(s)
    } catch {
      return false
    }
  }
  const name = (id: BuildFilter) => BUILD_TRACKS.find((x) => x.id === id)?.tiers[lv(id)]?.name ?? ''
  // Same figure as the upkeep strip below (multipliers included).
  const upkeepMin = upkeepPerSec(s, BUILD_TRACKS) * 60
  const built = BUILD_TRACKS.reduce((n, t) => n + lv(t.id), 0)

  const sel = (id: BuildFilter) => (selected === id ? ' bs-sel' : '')

  // Storefront: grows with tier.
  const sf = Math.max(1, lv('storefront'))
  const sfW = 150 + Math.min(10, sf) * 14
  const sfH = 60 + Math.min(10, sf) * 13
  const sfX = 480 - sfW / 2
  const floors = Math.min(5, Math.max(1, Math.ceil(sf / 2)))

  return (
    <RoomScene
      label={`Your lot: ${built} building levels, upkeep ${cashLabel(upkeepMin)} a minute`}
      chips={[
        { label: 'Levels built', value: String(built) },
        { label: 'Upkeep', value: upkeepMin > 0 ? `${cashLabel(upkeepMin)}/min` : 'none' },
      ]}
      skyTop="#1a2236"
      skyBottom="#3a3348"
      className="bs"
    >
      {/* Far skyline */}
      <g opacity="0.35">
        {[30, 110, 250, 700, 820, 900].map((x, i) => (
          <rect key={x} x={x} y={G - 70 - (i % 3) * 22} width={46 + (i % 2) * 20} height={70 + (i % 3) * 22} fill="#232737" />
        ))}
      </g>
      {/* Pavement + road */}
      <rect x="0" y={G} width="960" height="12" fill="#3b3a40" />
      <rect x="0" y={G + 12} width="960" height="40" fill="#24252b" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={20 + i * 80} y={G + 30} width="36" height="3" fill="#6c6a62" opacity="0.6" />
      ))}

      {/* Production: garden → farm → greenhouse */}
      {vis('production') ? (
        <Hit x={30} y={G - 90} w={150} h={90} label={`Production: ${name('production')}`} onActivate={() => onPick('production')}>
          <g className={`bs-part${sel('production')}`}>
            {lv('production') === 0 ? (
              <rect x="40" y={G - 40} width="130" height="38" rx="4" className="bs-empty" />
            ) : lv('production') <= 2 ? (
              <g>
                <rect x="40" y={G - 22} width="130" height="20" fill="#3d2f22" />
                {Array.from({ length: 6 }, (_, i) => (
                  <g key={i}>
                    <rect x={46 + i * 21} y={G - 22} width="14" height="20" fill="#2c4a2a" />
                    <circle cx={53 + i * 21} cy={G - 26} r={5 + lv('production')} fill="#5aa85a" />
                  </g>
                ))}
              </g>
            ) : (
              <g>
                <path d={`M40 ${G} V${G - 50} Q105 ${G - 100} 170 ${G - 50} V${G} Z`} fill="#9fd6c4" opacity="0.35" stroke="#cfeee4" />
                {Array.from({ length: 5 }, (_, i) => (
                  <line key={i} x1={58 + i * 24} y1={G} x2={58 + i * 24} y2={G - 70 + Math.abs(2 - i) * 8} stroke="#cfeee4" opacity="0.5" />
                ))}
                {Array.from({ length: 6 }, (_, i) => (
                  <circle key={i} cx={52 + i * 21} cy={G - 12} r="7" fill="#5aa85a" />
                ))}
              </g>
            )}
            <Sign x={105} y={G + 22} text={lv('production') ? name('production') : 'Empty plot'} small anchor="middle" />
          </g>
        </Hit>
      ) : null}

      {/* Storage: shelf → stockroom → warehouse → DC */}
      <Hit x={200} y={G - 130} w={150} h={130} label={`Storage: ${name('storage')}`} onActivate={() => onPick('storage')}>
        <g className={`bs-part${sel('storage')}`}>
          {(() => {
            const l = lv('storage')
            const h = 40 + Math.min(7, l) * 14
            return (
              <g>
                <rect x="215" y={G - h} width="120" height={h} fill="#4a4f5c" />
                <path d={`M210 ${G - h} L275 ${G - h - 18} L340 ${G - h} Z`} fill="#5a6070" />
                <rect x="240" y={G - Math.min(h - 10, 46)} width="70" height={Math.min(h - 10, 46)} fill="#2d313a" />
                {Array.from({ length: 6 }, (_, i) => (
                  <rect key={i} x="240" y={G - Math.min(h - 10, 46) + i * 8} width="70" height="1.5" fill="#545a68" />
                ))}
              </g>
            )
          })()}
          <Sign x={275} y={G + 22} text={name('storage')} small anchor="middle" />
        </g>
      </Hit>

      {/* Storefront */}
      <Hit x={sfX} y={G - sfH - 30} w={sfW} h={sfH + 30} label={`Storefront: ${name('storefront')}`} onActivate={() => onPick('storefront')}>
        <g className={`bs-part bs-store${sel('storefront')}`}>
          <rect x={sfX} y={G - sfH} width={sfW} height={sfH} fill="#6b3f2f" />
          {/* Upper floors */}
          {Array.from({ length: floors - 1 }, (_, f) =>
            Array.from({ length: Math.floor(sfW / 34) }, (_, i) => (
              <rect
                key={`${f}-${i}`}
                x={sfX + 10 + i * 34}
                y={G - sfH + 10 + f * 26}
                width="22"
                height="14"
                fill="#f2c14e"
                opacity={((i + f) % 3 === 0 ? 0.5 : 0.85)}
                className="bs-win"
              />
            )),
          )}
          {/* Awning */}
          {Array.from({ length: Math.ceil((sfW + 16) / 18) }, (_, i) => (
            <rect key={i} x={sfX - 8 + i * 18} y={G - 62} width="18" height="14" fill={i % 2 ? '#efe6cf' : '#e8583c'} />
          ))}
          {/* Shop window and door */}
          <rect x={sfX + 14} y={G - 44} width={sfW * 0.55} height="34" fill="#f2c14e" opacity="0.85" className="bs-win" />
          <rect x={sfX + sfW - 46} y={G - 46} width="30" height="46" fill="#2a1d18" />
          <rect x={sfX + sfW / 2 - 50} y={G - sfH - 22} width="100" height="18" rx="3" fill="#2a1d18" />
          <text x={sfX + sfW / 2} y={G - sfH - 9} textAnchor="middle" fontSize="11" fontWeight="700" fill="#f2c14e">
            {name('storefront').toUpperCase().slice(0, 16)}
          </text>
        </g>
      </Hit>

      {/* Cold: coolers by the side door */}
      {vis('cold') ? (
        <Hit x={sfX + sfW + 10} y={G - 80} w={110} h={80} label={`Cold: ${name('cold')}`} onActivate={() => onPick('cold')}>
          <g className={`bs-part${sel('cold')}`}>
            {lv('cold') === 0 ? (
              <rect x={sfX + sfW + 16} y={G - 44} width="80" height="42" rx="4" className="bs-empty" />
            ) : (
              Array.from({ length: Math.min(4, lv('cold')) }, (_, i) => (
                <g key={i}>
                  <rect x={sfX + sfW + 16 + i * 24} y={G - 36 - (lv('cold') >= 3 ? 18 : 0)} width="20" height={36 + (lv('cold') >= 3 ? 18 : 0)} rx="2" fill="#dfe8ee" />
                  <rect x={sfX + sfW + 19 + i * 24} y={G - 30 - (lv('cold') >= 3 ? 18 : 0)} width="14" height="10" fill="#8fc4e0" className="bs-frost" />
                </g>
              ))
            )}
            <Sign x={sfX + sfW + 56} y={G + 22} text={lv('cold') ? name('cold') : 'No cooler'} small anchor="middle" />
          </g>
        </Hit>
      ) : null}

      {/* Civic: parking → plaza → HQ */}
      {vis('civic') ? (
        <Hit x={790} y={G - 150} w={160} h={150} label={`Civic: ${name('civic')}`} onActivate={() => onPick('civic')}>
          <g className={`bs-part${sel('civic')}`}>
            {lv('civic') === 0 ? (
              <rect x="800" y={G - 40} width="140" height="38" rx="4" className="bs-empty" />
            ) : (
              <g>
                {Array.from({ length: 5 }, (_, i) => (
                  <rect key={i} x={804 + i * 28} y={G - 4} width="2" height="4" fill="#efe6cf" />
                ))}
                {lv('civic') >= 2 ? (
                  <g>
                    <rect x="830" y={G - 38} width="6" height="34" fill="#4a3a2a" />
                    <circle cx="833" cy={G - 46} r="18" fill="#3f7a4a" />
                    <rect x="860" y={G - 14} width="34" height="5" fill="#8a6a4a" />
                  </g>
                ) : null}
                {lv('civic') >= 3 ? (
                  <g>
                    <rect x="900" y={G - 40 - lv('civic') * 16} width="44" height={40 + lv('civic') * 16} fill="#3c4660" />
                    {Array.from({ length: lv('civic') + 1 }, (_, i) => (
                      <rect key={i} x="906" y={G - 30 - i * 16} width="32" height="8" fill="#9ec0e8" opacity="0.6" className="bs-win" />
                    ))}
                  </g>
                ) : null}
              </g>
            )}
            <Sign x={870} y={G + 22} text={lv('civic') ? name('civic') : 'Empty lot'} small anchor="middle" />
          </g>
        </Hit>
      ) : null}

      {/* Transit: the vehicle at the curb */}
      {vis('transit') ? (
        <Hit x={360} y={G + 4} w={130} h={46} label={`Transit: ${name('transit')}`} onActivate={() => onPick('transit')}>
          <g className={`bs-part bs-ride${sel('transit')}`}>
            {lv('transit') <= 0 ? (
              <rect x="370" y={G + 14} width="80" height="26" rx="4" className="bs-empty" />
            ) : lv('transit') === 1 ? (
              <g>
                <circle cx="388" cy={G + 34} r="8" fill="none" stroke="#efe6cf" strokeWidth="2.5" />
                <circle cx="420" cy={G + 34} r="8" fill="none" stroke="#efe6cf" strokeWidth="2.5" />
                <rect x="396" y={G + 18} width="22" height="12" fill="#e8583c" />
              </g>
            ) : (
              <g>
                <rect x="370" y={G + 14} width={lv('transit') >= 3 ? 104 : 74} height="24" rx="4" fill={lv('transit') >= 3 ? '#d9d4c7' : '#e8583c'} />
                <rect x={lv('transit') >= 3 ? 452 : 424} y={G + 18} width="18" height="10" fill="#8fc4e0" />
                <circle cx="388" cy={G + 40} r="6" fill="#1a1a1e" />
                <circle cx={lv('transit') >= 3 ? 456 : 428} cy={G + 40} r="6" fill="#1a1a1e" />
              </g>
            )}
          </g>
        </Hit>
      ) : null}
    </RoomScene>
  )
}

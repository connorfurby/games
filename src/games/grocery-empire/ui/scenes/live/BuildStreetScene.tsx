import { useEffect, useRef, useState } from 'react'
import { BUILD_TRACKS, buildLevel, type BuildFilter } from '../../../content/builds'
import { upkeepPerSec } from '../../../sim/formulas'
import { useGame } from '../../GameContext'
import { usePhone } from '../../kit/hooks'
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
  const { state: s, reducedMotion } = useGame()
  // A new level gets its moment: confetti and a sign over the building that grew.
  const levelKey = BUILD_TRACKS.map((t) => buildLevel(s, t.id)).join(',')
  const prevKey = useRef<string | null>(null)
  const [burst, setBurst] = useState<{
    id: BuildFilter
    name: string
    n: number
  } | null>(null)
  useEffect(() => {
    const prev = prevKey.current?.split(',').map(Number)
    prevKey.current = levelKey
    if (!prev) return
    const now = levelKey.split(',').map(Number)
    const i = now.findIndex((n, k) => n > (prev[k] ?? 0))
    if (i < 0) return
    const track = BUILD_TRACKS[i]
    setBurst({
      id: track.id,
      name: track.tiers[now[i]]?.name ?? track.name,
      n: Date.now(),
    })
  }, [levelKey])
  useEffect(() => {
    if (!burst) return
    const tm = window.setTimeout(() => setBurst(null), 2800)
    return () => window.clearTimeout(tm)
  }, [burst])
  const phone = usePhone()
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

  const stars = (
    <>
      {/* Late eras: the street sits under open sky, with the worlds you reached. */}
      {s.era >= 7 ? (
        <g aria-hidden>
          {Array.from({ length: 40 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 211) % 960}
              cy={8 + ((i * 97) % (G - 120))}
              r={i % 5 === 0 ? 1.6 : 0.9}
              fill="#efe6cf"
              opacity={0.35 + (i % 4) * 0.15}
              className={i % 3 === 0 ? 'bs-twinkle' : undefined}
              style={{ animationDelay: `${(i % 7) * 0.4}s` }}
            />
          ))}
          {Array.from({ length: Math.min(4, Math.max(1, s.era - 6)) }, (_, i) => (
            <circle
              key={`p${i}`}
              cx={120 + i * 230}
              cy={30 + (i % 2) * 22}
              r={6 + (i % 3) * 3}
              fill={['#c98b5e', '#7fb0c9', '#b5a1d9', '#9fc98b'][i]}
              opacity="0.7"
            />
          ))}
        </g>
      ) : null}
    </>
  )
  const skyline = (
    <>
      {/* Far skyline */}
      <g opacity="0.35">
        {[30, 110, 250, 700, 820, 900].map((x, i) => (
          <rect key={x} x={x} y={G - 70 - (i % 3) * 22} width={46 + (i % 2) * 20} height={70 + (i % 3) * 22} fill="#232737" />
        ))}
      </g>
    </>
  )
  const road = (
    <>
      {/* Pavement + road */}
      <rect x="0" y={G} width="960" height="12" fill="#3b3a40" />
      <rect x="0" y={G + 12} width="960" height="40" fill="#24252b" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={20 + i * 80} y={G + 30} width="36" height="3" fill="#6c6a62" opacity="0.6" />
      ))}
    </>
  )
  const walkers = (
    <>
      {/* Shoppers on the pavement: more as the storefront grows. */}
      <g aria-hidden>
        {Array.from({ length: Math.min(8, 1 + sf) }, (_, i) => (
          <g
            key={i}
            className="bs-walker"
            style={{
              animationDelay: `${-i * 2.3}s`,
              animationDuration: `${14 + (i % 3) * 4}s`,
            }}
          >
            <circle cx="0" cy={G - 2 - 13} r="3" fill="#efe6cf" />
            <rect x="-3" y={G - 2 - 10} width="6" height="10" rx="2" fill={['#e8583c', '#5aa85a', '#8fc4e0', '#f2c14e'][i % 4]} />
          </g>
        ))}
      </g>
    </>
  )
  const productionArt = (
    <>
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
                {lv('production') >= 6 ? (
                  <g>
                    <path
                      d={`M100 ${G - 74} L105 ${G - (lv('production') >= 8 ? 150 : 110)} L110 ${G - 74} Z`}
                      fill="#cfeee4"
                      opacity="0.8"
                    />
                    <circle cx="105" cy={G - (lv('production') >= 8 ? 152 : 112)} r="4" fill="#9fd6c4" className="bs-beacon" />
                  </g>
                ) : null}
              </g>
            )}
            <Sign x={105} y={G + 22} text={lv('production') ? name('production') : 'Empty plot'} small anchor="middle" />
          </g>
        </Hit>
      ) : null}
    </>
  )
  const storageArt = (
    <>
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
                {l >= 7 ? <rect x="322" y={G - h - 30} width="18" height={h + 30} rx="8" fill="#6a7086" /> : null}
                {l >= 8 ? (
                  <g>
                    <path
                      d={`M215 ${G - h - 14} Q275 ${G - h - 70} 335 ${G - h - 14} Z`}
                      fill="#2d3550"
                      stroke="#9ec0e8"
                      strokeOpacity="0.6"
                    />
                    <circle cx="275" cy={G - h - 40} r="5" fill="#f2c14e" className="bs-beacon" />
                  </g>
                ) : null}
              </g>
            )
          })()}
          <Sign x={275} y={G + 22} text={name('storage')} small anchor="middle" />
        </g>
      </Hit>
    </>
  )
  const storefrontArt = (
    <>
      {/* Storefront */}
      <Hit
        x={sfX}
        y={G - sfH - 30}
        w={sfW}
        h={sfH + 30}
        label={`Storefront: ${name('storefront')}`}
        onActivate={() => onPick('storefront')}
      >
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
                opacity={(i + f) % 3 === 0 ? 0.5 : 0.85}
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
          {sf >= 8 ? (
            <g>
              <rect x={sfX + sfW / 2 - 2} y={G - sfH - 60} width="4" height="38" fill="#9a8f7a" />
              <circle cx={sfX + sfW / 2} cy={G - sfH - 62} r="5" fill="#f2c14e" className="bs-beacon" />
            </g>
          ) : null}
          <rect x={sfX + sfW / 2 - 50} y={G - sfH - 22} width="100" height="18" rx="3" fill="#2a1d18" />
          <text x={sfX + sfW / 2} y={G - sfH - 9} textAnchor="middle" fontSize="11" fontWeight="700" fill="#f2c14e">
            {name('storefront').toUpperCase().slice(0, 16)}
          </text>
        </g>
      </Hit>
    </>
  )
  const coldArt = (
    <>
      {/* Cold: coolers by the side door */}
      {vis('cold') ? (
        <Hit x={sfX + sfW + 10} y={G - 80} w={110} h={80} label={`Cold: ${name('cold')}`} onActivate={() => onPick('cold')}>
          <g className={`bs-part${sel('cold')}`}>
            {lv('cold') === 0 ? (
              <rect x={sfX + sfW + 16} y={G - 44} width="80" height="42" rx="4" className="bs-empty" />
            ) : (
              Array.from({ length: Math.min(4, lv('cold')) }, (_, i) => (
                <g key={i}>
                  <rect
                    x={sfX + sfW + 16 + i * 24}
                    y={G - 36 - (lv('cold') >= 3 ? 18 : 0)}
                    width="20"
                    height={36 + (lv('cold') >= 3 ? 18 : 0)}
                    rx="2"
                    fill="#dfe8ee"
                  />
                  <rect
                    x={sfX + sfW + 19 + i * 24}
                    y={G - 30 - (lv('cold') >= 3 ? 18 : 0)}
                    width="14"
                    height="10"
                    fill="#8fc4e0"
                    className="bs-frost"
                  />
                </g>
              ))
            )}
            {lv('cold') >= 6 ? (
              <ellipse
                cx={sfX + sfW + 62}
                cy={G - 70}
                rx={lv('cold') >= 7 ? 48 : 34}
                ry="9"
                fill="none"
                stroke="#8fc4e0"
                strokeWidth={lv('cold') >= 7 ? 3 : 2}
                className="bs-ring"
              />
            ) : null}
            <Sign x={sfX + sfW + 56} y={G + 22} text={lv('cold') ? name('cold') : 'No cooler'} small anchor="middle" />
          </g>
        </Hit>
      ) : null}
    </>
  )
  const civicArt = (
    <>
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
                {lv('civic') >= 5 ? (
                  <g>
                    <rect x="846" y={G - 46} width="48" height="30" fill="#d9d4c7" />
                    <path d={`M842 ${G - 46} L870 ${G - 64} L898 ${G - 46} Z`} fill="#efe6cf" />
                    {[852, 864, 876, 888].map((x) => (
                      <rect key={x} x={x - 2} y={G - 44} width="4" height="26" fill="#b9b2a2" />
                    ))}
                    {lv('civic') >= 7 ? <rect x="860" y={G - 16} width="20" height="8" fill="#f2c14e" className="bs-beacon" /> : null}
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
    </>
  )
  const transitArt = (
    <>
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
                <rect
                  x="370"
                  y={G + 14}
                  width={lv('transit') >= 3 ? 104 : 74}
                  height="24"
                  rx="4"
                  fill={lv('transit') >= 3 ? '#d9d4c7' : '#e8583c'}
                />
                <rect x={lv('transit') >= 3 ? 452 : 424} y={G + 18} width="18" height="10" fill="#8fc4e0" />
                <circle cx="388" cy={G + 40} r="6" fill="#1a1a1e" />
                <circle cx={lv('transit') >= 3 ? 456 : 428} cy={G + 40} r="6" fill="#1a1a1e" />
                {lv('transit') >= 9 ? (
                  <path d={`M420 ${G + 12} L420 ${G - 40} L470 ${G + 6} Z`} fill="#f2c14e" opacity="0.55" className="bs-sail" />
                ) : null}
              </g>
            )}
          </g>
        </Hit>
      ) : null}
    </>
  )

  const anchor: Record<BuildFilter, [number, number]> = {
    production: [105, G - (lv('production') >= 6 ? 170 : lv('production') >= 3 ? 110 : 50)],
    storage: [275, G - (40 + Math.min(7, lv('storage')) * 14) - (lv('storage') >= 8 ? 80 : 30)],
    storefront: [480, G - sfH - 30],
    cold: [sfX + sfW + 60, G - 70],
    civic: [870, G - 90],
    transit: [420, G - 4],
    signage: [sfX + sfW * 0.3, G - sfH - (lv('signage') >= 4 ? 110 : 70)],
  }
  const burstAt = (id: BuildFilter) => {
    if (!burst || burst.id !== id) return null
    const [x, y] = anchor[id]
    const label = id === 'storefront' ? 'Grand opening!' : 'Built!'
    return (
      <g key={burst.n} className="bs-burst" transform={`translate(${x} ${y})`} aria-hidden>
        {reducedMotion
          ? null
          : Array.from({ length: 18 }, (_, i) => (
              <g key={i} transform={`rotate(${(i / 18) * 360})`}>
                <rect
                  className={`bs-confetti bs-confetti--${i % 3}`}
                  x="-3"
                  y="-3"
                  width="6"
                  height="6"
                  rx="1"
                  fill={['#f2c14e', '#e8583c', '#8fc4e0', '#5aa85a', '#efe6cf'][i % 5]}
                  style={{ animationDelay: `${(i % 4) * 0.03}s` }}
                />
              </g>
            ))}
        <g className="bs-pop">
          <rect x="-62" y="-30" width="124" height="22" rx="11" fill="#f2c14e" />
          <text x="0" y="-15" textAnchor="middle" fontSize="11" fontWeight="800" fill="#2a1d18">
            {label}
          </text>
          <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="700" fill="#efe6cf">
            {burst.name}
          </text>
        </g>
      </g>
    )
  }
  const production = (
    <>
      {productionArt}
      {burstAt('production')}
    </>
  )
  const storage = (
    <>
      {storageArt}
      {burstAt('storage')}
    </>
  )
  const storefront = (
    <>
      {storefrontArt}
      {burstAt('storefront')}
    </>
  )
  const cold = (
    <>
      {coldArt}
      {burstAt('cold')}
    </>
  )
  const civic = (
    <>
      {civicArt}
      {burstAt('civic')}
    </>
  )
  const transit = (
    <>
      {transitArt}
      {burstAt('transit')}
    </>
  )

  // Signage: a chalkboard by the door, then boards on the roof, then the sky itself.
  const sg = lv('signage')
  const boardX = sfX + sfW * 0.28
  const boardW = sg >= 4 ? 120 : 84
  const boardH = sg >= 4 ? 40 : 22
  // Tall stores: the board mounts on the upper facade instead of floating off the top.
  const roomAbove = G - sfH - (sg >= 4 ? 74 : 56) >= 8
  // Rooftop boards sit behind the name plate; facade and pavement signs sit in front.
  const signBehind = sg >= 2 && roomAbove
  const boardY = roomAbove ? G - sfH - (sg >= 4 ? 74 : 56) : G - sfH + 8
  const signageArt = vis('signage') ? (
    <Hit
      x={sg >= 2 ? boardX - boardW / 2 : sfX + sfW - 72}
      y={sg >= 2 ? boardY - 4 : G - 26}
      w={sg >= 2 ? boardW : 26}
      h={sg >= 2 ? Math.max(boardH + 8, G - sfH - boardY + 4) : 26}
      label={`Signage: ${name('signage') || 'none yet'}`}
      onActivate={() => onPick('signage')}
    >
      <g className={`bs-part${sel('signage')}`}>
        {sg === 0 ? (
          <rect x={sfX + sfW - 70} y={G - 22} width="20" height="20" rx="3" className="bs-empty" />
        ) : sg === 1 ? (
          <g>
            <path d={`M${sfX + sfW - 70} ${G} L${sfX + sfW - 62} ${G - 22} L${sfX + sfW - 54} ${G} Z`} fill="#3a2c22" />
            <rect x={sfX + sfW - 68} y={G - 18} width="12" height="12" fill="#26302a" />
            <path d={`M${sfX + sfW - 66} ${G - 14} h8 M${sfX + sfW - 66} ${G - 10} h6`} stroke="#efe6cf" strokeWidth="1" />
          </g>
        ) : (
          <g>
            <rect
              x={boardX - boardW / 2 + 8}
              y={boardY + boardH}
              width="4"
              height={Math.max(0, G - sfH - boardY - boardH)}
              fill="#5a4a3a"
            />
            <rect
              x={boardX + boardW / 2 - 12}
              y={boardY + boardH}
              width="4"
              height={Math.max(0, G - sfH - boardY - boardH)}
              fill="#5a4a3a"
            />
            <rect
              x={boardX - boardW / 2}
              y={boardY}
              width={boardW}
              height={boardH}
              rx="3"
              fill={sg === 2 ? '#efe6cf' : '#1b1626'}
              stroke={sg >= 5 ? '#8fc4e0' : sg >= 3 ? '#e85aa0' : '#a08a6a'}
              strokeWidth={sg >= 3 ? 2 : 1}
              className={sg >= 5 ? 'bs-video' : sg >= 3 ? 'bs-neon' : undefined}
            />
            {sg >= 4 ? (
              <g className={sg >= 5 ? 'bs-video' : undefined}>
                {['#e8583c', '#f2c14e', '#5aa85a', '#8fc4e0'].map((c, i) => (
                  <rect
                    key={c}
                    x={boardX - boardW / 2 + 6 + i * ((boardW - 12) / 4)}
                    y={boardY + 6}
                    width={(boardW - 12) / 4 - 3}
                    height={boardH - 20}
                    fill={c}
                    opacity="0.8"
                  />
                ))}
              </g>
            ) : null}
            <text
              x={boardX}
              y={boardY + boardH - (sg >= 4 ? 4 : 7)}
              textAnchor="middle"
              fontSize={sg >= 4 ? 10 : 11}
              fontWeight="800"
              fill={sg === 2 ? '#6b3f2f' : sg >= 3 && sg < 5 ? '#ff8ac4' : '#efe6cf'}
              className={sg === 3 ? 'bs-neon' : undefined}
            >
              {sg >= 4 ? 'FRESH · OPEN LATE' : 'OPEN'}
            </text>
          </g>
        )}
      </g>
    </Hit>
  ) : null
  // The sky tiers sit in the far sky, behind everything.
  const skySigns =
    sg >= 6 ? (
      <g aria-hidden>
        {sg >= 7 ? (
          <path
            d="M0 70 Q160 30 320 66 T640 58 T960 62 L960 90 Q800 70 640 88 T320 92 T0 100 Z"
            fill="#5aa85a"
            opacity="0.18"
            className="bs-aurora"
          />
        ) : null}
        <g className="bs-blimp">
          <ellipse cx="700" cy="46" rx="40" ry="13" fill="#d9d4c7" />
          <rect x="690" y="57" width="20" height="6" rx="2" fill="#6c6a62" />
          <rect x="744" y="38" width="70" height="16" fill="#e8583c" />
          <text x="779" y="50" textAnchor="middle" fontSize="9" fontWeight="800" fill="#efe6cf">
            OPEN NOW
          </text>
        </g>
        {sg >= 8 ? (
          <g>
            <rect x="850" y="14" width="56" height="18" rx="2" fill="#1b1626" stroke="#f2c14e" className="bs-beacon" />
            <text x="878" y="27" textAnchor="middle" fontSize="8" fontWeight="800" fill="#f2c14e">
              GROCERY
            </text>
          </g>
        ) : null}
      </g>
    ) : null
  const signage = (
    <>
      {signageArt}
      {burstAt('signage')}
    </>
  )

  const bgPlain = (
    <>
      {stars}
      {skyline}
      {road}
    </>
  )
  const bg = (
    <>
      {skySigns}
      {stars}
      {skyline}
      {road}
    </>
  )
  // Phone: a two-row street. Top row is the storefront with its coolers and the curb;
  // the bottom row is the garden, the storage block and the civic lot.
  // Each row is cropped to its tallest building so the phone shows buildings, not sky.
  const stL = lv('storage')
  const top1 = Math.max(0, G - sfH - Math.max(sf >= 8 ? 72 : 34, sg >= 4 ? 84 : sg >= 2 ? 62 : 0) - 14)
  const top2 = Math.max(
    0,
    G -
      Math.max(
        40 + Math.min(7, stL) * 14 + (stL >= 8 ? 72 : 22),
        lv('civic') >= 3 ? 40 + lv('civic') * 16 : 70,
        lv('production') >= 8 ? 158 : lv('production') >= 6 ? 118 : 104,
      ) -
      14,
  )
  const ROW = G + 52 - top1
  const ROW2 = G + 52 - top2

  return (
    <RoomScene
      label={`Your lot: ${built} building levels, upkeep ${cashLabel(upkeepMin)} a minute`}
      chips={[
        { label: 'Levels built', value: String(built) },
        {
          label: 'Upkeep',
          value: upkeepMin > 0 ? `${cashLabel(upkeepMin)}/min` : 'none',
        },
      ]}
      skyTop={s.era >= 7 ? '#070a18' : '#1a2236'}
      skyBottom={s.era >= 7 ? '#1d1838' : '#3a3348'}
      className="bs"
      portrait={{ w: 600, h: ROW + ROW2 }}
    >
      {phone ? (
        <>
          <rect width="600" height={ROW + ROW2} fill={s.era >= 7 ? '#0c0f22' : '#252c42'} />
          <g transform={`translate(-180 ${-top1})`}>
            {bg}
            {walkers}
            {signBehind ? signage : null}
            {storefront}
            {signBehind ? null : signage}
            {cold}
            {transit}
          </g>
          <g transform={`translate(0 ${ROW - top2})`}>
            <g transform="translate(-180 0)">{bgPlain}</g>
            {production}
            {storage}
            <g transform="translate(-400 0)">{civic}</g>
          </g>
        </>
      ) : (
        <>
          {bg}
          {walkers}
          {production}
          {storage}
          {signBehind ? signage : null}
          {storefront}
          {signBehind ? null : signage}
          {cold}
          {civic}
          {transit}
        </>
      )}
    </RoomScene>
  )
}

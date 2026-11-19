import { clarity as clarityOf } from '../../sim/helpers'
import { useGame } from '../GameContext'
import { pct } from '../format'
import { StatusChip } from '../kit/StatusChip'
import { RoomHit, RoomHud } from '../scenes/room/RoomHits'

/** Dense basement shack — Hit regions + era-gated props. */
export function ShackScene({ interactive = true }: { interactive?: boolean }) {
  const { state: s, dispatch, reducedMotion } = useGame()
  const clarity = clarityOf(s)
  const airing = s.air.airingUntil > s.time
  const holding = s.air.holding
  const mast = Math.min(5, s.antenna)
  const towers = Math.min(4, s.towers.length)
  const live = !reducedMotion && !s.paused
  const crystal = s.upgrades['crystal-gain'] ?? 0
  const hire = s.crew.length > 0
  const caller = !!s.depth.activeCaller

  return (
    <figure
      className={`sd-shack${live ? ' is-live' : ''}${airing ? ' is-airing' : ''}${holding ? ' is-holding' : ''}${clarity < 0.35 ? ' is-under' : ''}`}
      aria-label="Basement shack"
    >
      <svg className="sd-shack__art" viewBox="0 0 960 300" role="img">
        <defs>
          <linearGradient id="sd-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.era >= 5 ? '#081018' : '#0a1620'} />
            <stop offset="55%" stopColor="#132430" />
            <stop offset="100%" stopColor="#1a3038" />
          </linearGradient>
          <linearGradient id="sd-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c2824" />
            <stop offset="100%" stopColor="#121a18" />
          </linearGradient>
          <linearGradient id="sd-bench" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2e22" />
            <stop offset="100%" stopColor="#2a2018" />
          </linearGradient>
          <radialGradient id="sd-glow" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={airing ? '#5dffd0' : holding ? '#2ec4b6' : crystal ? '#1a8a7e' : '#0f4a44'}
              stopOpacity="0.85"
            />
            <stop offset="100%" stopColor="#2ec4b6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="960" height="300" fill="url(#sd-sky)" />
        <rect x="0" y="210" width="960" height="90" fill="#0c1014" />
        <rect x="0" y="200" width="960" height="12" fill="#1a2220" />

        <rect x="520" y="28" width="380" height="150" rx="4" fill="#0a1218" stroke="#2a3a38" strokeWidth="6" />
        <rect x="528" y="36" width="364" height="134" fill="#0d1a22" />
        <path d="M528 150 Q620 110 710 140 T892 145 L892 170 L528 170 Z" fill="#152028" />

        {Array.from({ length: mast }, (_, i) => {
          const x = 580 + i * 55
          const h = 40 + i * 14
          return (
            <g key={`mast-${i}`}>
              <line x1={x} y1={170} x2={x} y2={170 - h} stroke="#8aa3a0" strokeWidth="3" />
              <line x1={x - 18} y1={170 - h + 8} x2={x + 18} y2={170 - h + 8} stroke="#2ec4b6" strokeWidth="2" />
              <circle cx={x} cy={170 - h} r="3" fill="#5dffd0" />
            </g>
          )
        })}
        {Array.from({ length: towers }, (_, i) => {
          const x = 760 + i * 28
          return (
            <g key={`tw-${i}`} opacity="0.85">
              <rect x={x} y="120" width="10" height="50" fill="#3a4a48" />
              <polygon points={`${x - 8},120 ${x + 5},95 ${x + 18},120`} fill="#2ec4b6" opacity="0.7" />
            </g>
          )
        })}
        {s.birds > 0 && (
          <g opacity="0.9">
            <ellipse cx="860" cy="70" rx="28" ry="10" fill="#2a3a48" />
            <circle cx="860" cy="70" r="4" fill="#5dffd0" />
          </g>
        )}
        {s.subcarriers > 0 && (
          <circle cx="900" cy="100" r="14" fill="none" stroke="#5dffd0" strokeWidth="2" opacity="0.7" />
        )}

        <rect x="0" y="0" width="500" height="300" fill="url(#sd-wall)" />
        <rect x="490" y="0" width="20" height="300" fill="#0e1412" />

        {Array.from({ length: Math.min(24, Math.floor(s.depth.cleanLogsLifetime / 8)) }, (_, i) => {
          const col = i % 6
          const row = Math.floor(i / 6)
          return (
            <rect
              key={`tape-${i}`}
              className="sd-tape"
              x={40 + col * 28}
              y={36 + row * 22}
              width="22"
              height="14"
              rx="2"
              fill={i % 3 === 0 ? '#c45c3e' : '#2ec4b6'}
              opacity="0.75"
            />
          )
        })}

        {hire && <rect x="40" y="220" width="36" height="48" rx="4" fill="#2a3834" stroke="#2ec4b6" />}
        {caller && (
          <g>
            <circle cx="460" cy="100" r="10" fill="#d46545" />
            <text x="460" y="104" textAnchor="middle" fill="#fff" fontSize="8">
              !
            </text>
          </g>
        )}

        <rect x="48" y="188" width="400" height="18" rx="2" fill="url(#sd-bench)" />
        <rect x="56" y="206" width="14" height="48" fill="#2a2018" />
        <rect x="420" y="206" width="14" height="48" fill="#2a2018" />

        <rect
          x="160"
          y="142"
          width="160"
          height="46"
          rx="6"
          fill={crystal ? '#1a3438' : '#1a2428'}
          stroke="#2ec4b6"
          strokeWidth={2 + Math.min(2, crystal)}
        />
        <circle cx="200" cy="165" r="14" fill="#0a1218" stroke="#8aa3a0" strokeWidth="2" />
        <line
          x1="200"
          y1="165"
          x2={200 + Math.cos((s.air.frequency / 108) * Math.PI) * 10}
          y2={165 + Math.sin((s.air.frequency / 108) * Math.PI) * 10}
          stroke="#5dffd0"
          strokeWidth="2"
        />
        <rect x="230" y="152" width="70" height="8" rx="2" fill="#0a1218" />
        <rect x="230" y="152" width={Math.max(4, s.air.logFill * 70)} height="8" rx="2" fill="#2ec4b6" />
        <rect x="230" y="168" width="70" height="8" rx="2" fill="#0a1218" />
        <rect
          x="230"
          y="168"
          width={Math.max(2, clarity * 70)}
          height="8"
          rx="2"
          fill={clarity < 0.35 ? '#e09f3e' : '#5dffd0'}
        />

        <ellipse cx="240" cy="200" rx="90" ry="18" fill="url(#sd-glow)" />

        <rect x="340" y="128" width="120" height="56" rx="4" fill="#0a1218" stroke="#243440" />
        <path
          className="sd-shack__wave"
          d={wavePath(clarity, s.air.noise, s.time)}
          fill="none"
          stroke={airing ? '#5dffd0' : '#2ec4b6'}
          strokeWidth="2"
          opacity={0.4 + clarity * 0.6}
        />

        <g className="sd-shack__props" aria-hidden>
          {s.era >= 1 && (
            <g>
              <circle cx="250" cy="52" r="18" fill="#0e1614" stroke="#8aa3a0" strokeWidth="2" />
              <line x1="250" y1="52" x2="250" y2="40" stroke="#5dffd0" strokeWidth="2" />
              <line
                x1="250"
                y1="52"
                x2={250 + Math.cos(s.time / 60) * 10}
                y2={52 + Math.sin(s.time / 60) * 10}
                stroke="#8aa3a0"
                strokeWidth="1.5"
              />
              <line x1="76" y1="188" x2="76" y2="160" stroke="#8aa3a0" strokeWidth="2" />
              <polygon points="62,160 90,160 82,148 70,148" fill="#e09f3e" opacity="0.85" />
            </g>
          )}
          {s.era >= 2 && (
            <g>
              <rect x="290" y="30" width="86" height="62" rx="3" fill="#2a2018" stroke="#3a2e22" strokeWidth="3" />
              {Array.from({ length: Math.min(6, s.towers.length + 1) }, (_, i) => (
                <circle key={`pin-${i}`} cx={304 + (i % 3) * 26} cy={46 + Math.floor(i / 3) * 24} r="4" fill="#d46545" />
              ))}
            </g>
          )}
          {s.era >= 3 && (
            <g>
              <rect x="326" y="168" width="10" height="20" rx="2" fill="#8aa3a0" />
              <path d="M330 164 Q333 158 336 164" fill="none" stroke="#c9d6d4" strokeWidth="1.5" opacity="0.6" />
            </g>
          )}
          {s.era >= 4 && (
            <g>
              <rect x="440" y="214" width="40" height="54" rx="3" fill="#2a3834" stroke="#3a4a48" />
              <line x1="440" y1="232" x2="480" y2="232" stroke="#3a4a48" />
              <line x1="440" y1="250" x2="480" y2="250" stroke="#3a4a48" />
              <rect x="454" y="220" width="12" height="4" fill="#8aa3a0" />
            </g>
          )}
          {s.era >= 6 && (
            <g>
              <rect x="352" y="180" width="30" height="8" rx="1" fill="#1a2a28" stroke="#2ec4b6" strokeWidth="1" />
              <rect x="388" y="172" width="4" height="16" fill="#e8dcc0" />
              <ellipse cx="390" cy="170" rx="3" ry="4" fill="#e09f3e" opacity="0.8" />
            </g>
          )}
          {s.era >= 7 && (
            <g>
              {Array.from({ length: 6 }, (_, i) => (
                <circle key={`patch-${i}`} cx={224 + i * 18} cy="112" r="4" fill="#0a1218" stroke="#5dffd0" strokeWidth="1.5" />
              ))}
              <path d="M224 112 Q250 130 278 112" fill="none" stroke="#e09f3e" strokeWidth="1.5" />
            </g>
          )}
          {s.era >= 9 && (
            <g>
              <rect x="104" y="248" width="18" height="18" rx="2" fill="#3a2e22" />
              <path d="M113 248 Q100 232 108 224 M113 248 Q126 232 118 222" fill="none" stroke="#3a8a6a" strokeWidth="3" />
            </g>
          )}
          {s.era >= 12 && (
            <polygon
              points="420,38 425,50 438,50 428,58 432,70 420,63 408,70 412,58 402,50 415,50"
              fill="#e09f3e"
              opacity="0.9"
            />
          )}
        </g>

        <circle cx="140" cy="155" r="8" fill={airing ? '#e05a4e' : '#3a2020'} />
        <text x="140" y="178" textAnchor="middle" fill="#8aa3a0" fontSize="10" fontFamily="IBM Plex Mono, monospace">
          {airing ? 'ON AIR' : 'STANDBY'}
        </text>
      </svg>

      {interactive ? (
        <div className="sd-shack__hits">
          <RoomHit
            id="hit-dial"
            label="Sweep dial"
            className="sd-hit--dial"
            onClick={() => dispatch({ type: 'tune' })}
          />
          <RoomHit
            id="hit-lock"
            label="Hold lock"
            className="sd-hit--lock"
            onPointerDown={() => {
              if (s.air.tuned) dispatch({ type: 'setHolding', on: true })
            }}
            onPointerUp={() => dispatch({ type: 'setHolding', on: false })}
            onPointerLeave={() => dispatch({ type: 'setHolding', on: false })}
          />
          <RoomHit
            id="hit-log"
            label="Log buffer"
            className="sd-hit--log"
            onClick={() => {
              if (s.air.logFill >= 1) dispatch({ type: 'log' })
            }}
          />
          <RoomHit
            id="hit-air"
            label="Air"
            className="sd-hit--air"
            onClick={() => {
              if (s.air.cleanLogs > 0) dispatch({ type: 'air' })
            }}
          />
        </div>
      ) : null}

      <RoomHud>
        {/* Sparse by rule: at most three chips. */}
        {[
          <StatusChip key="clarity" tone={clarity < 0.35 ? 'warn' : 'accent'}>
            {pct(clarity)}
          </StatusChip>,
          airing ? (
            <StatusChip key="air" tone="danger">
              ON AIR
            </StatusChip>
          ) : null,
          s.antenna > 0 ? <StatusChip key="mast">Mast {s.antenna}</StatusChip> : null,
        ]
          .filter(Boolean)
          .slice(0, 3)}
      </RoomHud>
    </figure>
  )
}

function wavePath(clarity: number, noise: number, t: number): string {
  const amp = 8 + clarity * 16
  const jag = noise * 6
  let d = 'M348 156'
  for (let i = 0; i <= 20; i++) {
    const x = 348 + i * 5.2
    const y = 156 + Math.sin(i * 0.7 + t * 2.2) * amp + Math.sin(i * 2.1 + t * 5) * jag
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

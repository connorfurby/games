import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { CatchUpInfo } from '../../sim/engine'
import { clock } from '../format'
import './catchup.css'

const LINES = [
  'Counting the till…',
  'Restocking the cans…',
  'Sweeping aisle three…',
  'Signing for deliveries…',
  'Turning the sign to OPEN…',
  'Facing the shelves…',
  'Paying the suppliers…',
  'Topping up the coolers…',
  'Reading the regulars’ notes…',
]

/**
 * Welcome back: the store catching up on the time you were away. The engine simulates the gap a
 * slice per frame; this screen shows it happening instead of a frozen page, then fades into the
 * away receipt.
 */
export function CatchUpScreen({ info, reducedMotion }: { info: CatchUpInfo | null; reducedMotion: boolean }) {
  return (
    <AnimatePresence>
      {info ? (
        <motion.div
          key="catchup"
          className="cu"
          role="status"
          aria-live="polite"
          aria-label="Catching up on the time you were away"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 1.02, transition: { duration: 0.35 } }}
        >
          <CatchUpBody info={info} reducedMotion={reducedMotion} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function CatchUpBody({ info, reducedMotion }: { info: CatchUpInfo; reducedMotion: boolean }) {
  const [line, setLine] = useState(0)
  useEffect(() => {
    if (reducedMotion) return
    const id = setInterval(() => setLine((n) => (n + 1) % LINES.length), 900)
    return () => clearInterval(id)
  }, [reducedMotion])
  const pct = Math.round(Math.max(0, Math.min(1, info.progress)) * 100)
  return (
    <div className={`cu-card${reducedMotion ? ' is-still' : ''}`}>
      <svg className="cu-store" viewBox="0 0 240 150" aria-hidden>
        <defs>
          <linearGradient id="cu-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1b2440" />
            <stop offset="1" stopColor="#2c2a3e" />
          </linearGradient>
        </defs>
        <rect width="240" height="150" rx="14" fill="url(#cu-sky)" />
        <g className="cu-stars">
          {[20, 52, 90, 140, 176, 214].map((x, i) => (
            <circle key={x} cx={x} cy={14 + ((i * 17) % 30)} r={i % 2 ? 1 : 1.4} fill="#efe6cf" />
          ))}
        </g>
        <circle className="cu-sun" cx="200" cy="34" r="12" fill="#f2c14e" />
        <rect x="0" y="122" width="240" height="28" fill="#1a1c22" />
        {/* Store */}
        <rect x="58" y="58" width="124" height="64" fill="#3a2f2a" />
        <g className="cu-awning">
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={54 + i * 16.5} y="50" width="16.5" height="14" fill={i % 2 ? '#efe6cf' : '#e8583c'} />
          ))}
        </g>
        <rect x="70" y="74" width="40" height="30" fill="#f2c14e" opacity="0.85" className="cu-window" />
        <rect x="130" y="74" width="38" height="48" fill="#251f1c" />
        <rect x="134" y="78" width="30" height="16" fill="#f2c14e" opacity="0.5" className="cu-window" />
        <text x="120" y="45" textAnchor="middle" fontSize="11" fontWeight="700" fill="#efe6cf">
          OPEN
        </text>
        {/* A cart rolling past */}
        <g className="cu-cart">
          <path d="M0 0 h20 l-3 10 h-15 z" fill="none" stroke="#efe6cf" strokeWidth="2" />
          <circle cx="4" cy="14" r="2.4" fill="#efe6cf" />
          <circle cx="15" cy="14" r="2.4" fill="#efe6cf" />
        </g>
      </svg>

      <p className="cu-kicker">Welcome back</p>
      <h2 className="cu-title">The store kept trading for {clock(info.total)}</h2>
      <div className="cu-bar" aria-hidden>
        <i style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <p className="cu-line">
        <span key={line} className="cu-line__text">
          {LINES[line]}
        </span>
        <span className="cu-pct">{pct}%</span>
      </p>
    </div>
  )
}

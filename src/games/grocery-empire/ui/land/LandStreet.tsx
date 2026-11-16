import type { GameState } from '../../sim/state'
import { Storefront } from '../art/Storefront'
import './land.css'

const AWNING = {
  local: '#c2563a',
  standard: 'var(--sc-tag)',
  premium: '#2f6d4f',
} as const

/**
 * The chain as a street you can walk. Height is the store's level,
 * the awning is its policy, and the windows dim as it drifts.
 */
export function LandStreet({
  state: s,
  onPick,
}: {
  state: GameState
  onPick: (id: string) => void
}) {
  const stores = s.stores ?? []
  return (
    <div className="ld-street" role="list" aria-label="Your stores on the block">
      {stores.map((st, i) => {
        const h = 48 + Math.min(36, st.level * 6)
        const drifting = (st.drift ?? 0) >= 0.4
        return (
          <button
            key={st.id}
            type="button"
            role="listitem"
            className={`ld-lot${i === 0 ? ' is-flag' : ''}${drifting ? ' is-drift' : ''}`}
            title={`${st.name} · ${st.policy} · ${Math.round((st.drift ?? 0) * 100)}% drift`}
            onClick={() => onPick(st.id)}
          >
            <svg viewBox={`0 0 72 ${h + 16}`} className="ld-lot__svg">
              <rect width="72" height={h + 16} fill="transparent" />
              <line x1="0" y1={h + 8} x2="72" y2={h + 8} stroke="var(--sc-curb)" strokeWidth="3" />
              <g transform={`translate(12 ${8})`}>
                <Storefront
                  w={48}
                  h={h}
                  awning={AWNING[st.policy]}
                  lit={0.3 + (st.attentionShare ?? 0) * 0.7}
                  drift={st.drift ?? 0}
                  sign={i === 0 ? 'FLAG' : undefined}
                />
              </g>
            </svg>
            <span className="ld-lot__name">{st.name}</span>
            <span className="ld-lot__meta">
              Lv {st.level}
              {drifting ? ' · drifting' : ''}
            </span>
          </button>
        )
      })}
      {s.depot ? (
        <div className="ld-lot ld-lot--depot" aria-hidden>
          <svg viewBox="0 0 72 80" className="ld-lot__svg">
            <rect x="10" y="20" width="52" height="48" fill="#3b4a5c" />
            <rect x="18" y="40" width="16" height="28" fill="#1a1612" />
            <text x="36" y="36" textAnchor="middle" fill="#efe9dc" fontSize="8">
              DEPOT
            </text>
          </svg>
          <span className="ld-lot__name">Depot</span>
          <span className="ld-lot__meta">Online</span>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Before the chain (era 1): the same street, one lit door and three lots with a lease board.
 * Reads as a place you are about to own, not a missing feature.
 */
export function EarlyLandStreet({ state: s }: { state: GameState }) {
  const tier = Math.max(1, s.builds.storefront ?? 1)
  const h = 48 + Math.min(36, tier * 6)
  const name = s.stores?.[0]?.name ?? 'Your store'
  return (
    <div className="ld-street ld-street--early" role="list" aria-label="Your block, before the chain">
      <div className="ld-lot is-flag" role="listitem" aria-label={`${name}, your only door`}>
        <svg viewBox={`0 0 72 ${h + 16}`} className="ld-lot__svg" aria-hidden>
          <line x1="0" y1={h + 8} x2="72" y2={h + 8} stroke="var(--sc-curb)" strokeWidth="3" />
          <g transform="translate(12 8)">
            <Storefront w={48} h={h} awning="var(--sc-tag)" lit={1} sign="OPEN" />
          </g>
        </svg>
        <span className="ld-lot__name">{name}</span>
        <span className="ld-lot__meta">Lv {tier} · the only door</span>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="ld-lot ld-lot--lease" role="listitem" aria-label="Empty lot, for lease">
          <svg viewBox="0 0 72 80" className="ld-lot__svg" aria-hidden>
            <line x1="0" y1="72" x2="72" y2="72" stroke="var(--sc-curb)" strokeWidth="3" />
            <rect x="12" y="30" width="48" height="42" rx="2" className="ld-lease__pad" />
            <line x1="36" y1="30" x2="36" y2="14" stroke="var(--sc-curb)" strokeWidth="2" />
            <rect x="22" y="8" width="28" height="12" rx="2" className="ld-lease__sign" />
            <text x="36" y="17" textAnchor="middle" className="ld-lease__text">
              LEASE
            </text>
          </svg>
          <span className="ld-lot__name">Lot {i + 1}</span>
          <span className="ld-lot__meta">After the corner store</span>
        </div>
      ))}
    </div>
  )
}

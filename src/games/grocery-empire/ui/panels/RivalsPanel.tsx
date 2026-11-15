import { useState, type ReactNode } from 'react'
import { RIVALS, type RivalDef } from '../../content/rivals'
import { RIVAL_CHAINS } from '../../sim/balance'
import { can } from '../../sim/commands'
import { keelDemandMul } from '../../sim/formulas'
import type { RivalState } from '../../sim/state'
import { HORIZON } from '../../sim/balance'
import { boughtRivalStores, buyoutCost, priceWarCost, rivalDemandMul } from '../../sim/systems/rivals'
import { keelBuyoutCost } from '../../sim/systems/horizon'
import { statCut } from '../../sim/systems/stats'
import '../components/screenPanel.css'
import { ConfirmModal } from '../components/ConfirmModal'
import { HubStage } from '../components/HubStage'
import { Button, ScreenHeader, Sheet } from '../kit'
import { useGame } from '../GameContext'
import { clock, money } from '../format'
import { RivalStreetScene } from '../scenes/live/RivalStreetScene'

/** What a portrait needs. Keel is not a RivalDef (it is Horizon-only), so the portrait takes this shape. */
export type PortraitDef = Pick<RivalDef, 'color' | 'accent' | 'initials' | 'founder' | 'title'>

/** Keel & Sons, drawn on the same card as a rival. Not in RIVALS: it never opens a street store. */
const KEEL_CARD: PortraitDef & { name: string; tagline: string; farewell: string } = {
  name: 'Keel & Sons',
  founder: 'Maris Keel',
  title: 'Captain, freight family',
  tagline: 'Your fonts on their manifests, and a convoy on your route every few minutes.',
  color: '#5f7a96',
  accent: '#dbe7f5',
  initials: 'MK',
  farewell: 'Maris Keel hands over the manifests: "Keep the fonts. They never looked better on a hull."',
}
const KEEL_CONVOY_ROW = 10

/** Hair by founder: eight chains in RIVALS order, then Keel. Each founder gets a different silhouette. */
function hairFor(def: PortraitDef, i: number): ReactNode {
  switch (i) {
    // Dot: a bun
    case 0:
      return (
        <g key="h">
          <circle cx="40" cy="20" r="7" fill={def.color} />
          <path d="M24 34 Q40 16 56 34 Q52 26 40 25 Q28 26 24 34 Z" fill={def.color} />
        </g>
      )
    // Ines: long hair
    case 1:
      return (
        <path key="h" d="M23 38 Q22 18 40 18 Q58 18 57 38 L58 52 L52 52 L52 34 Q40 26 28 34 L28 52 L22 52 Z" fill={def.color} />
      )
    // Conrad: swept side part
    case 2:
      return <path key="h" d="M25 34 Q26 19 41 19 Q55 19 55 32 Q46 24 34 27 Q29 29 25 34 Z" fill={def.color} />
    // Sera: visor
    case 3:
      return (
        <g key="h">
          <path d="M25 33 Q27 19 40 19 Q53 19 55 33 Z" fill={def.color} />
          <rect x="27" y="31" width="26" height="6" rx="3" fill={def.accent} opacity="0.85" />
        </g>
      )
    // Marit: leafy curls
    case 4:
      return (
        <g key="h">
          {[26, 33, 40, 47, 54].map((x, k) => (
            <circle key={x} cx={x} cy={k % 2 ? 23 : 26} r="6" fill={def.color} />
          ))}
          <path d="M26 34 Q40 24 54 34 Q40 28 26 34 Z" fill={def.color} />
        </g>
      )
    // Jonah: headphones
    case 5:
      return (
        <g key="h">
          <path d="M25 34 Q26 19 40 19 Q54 19 55 34" fill="none" stroke={def.color} strokeWidth="4" />
          <rect x="21" y="30" width="7" height="12" rx="3" fill={def.color} />
          <rect x="52" y="30" width="7" height="12" rx="3" fill={def.color} />
        </g>
      )
    // Amara: wrapped crown
    case 6:
      return (
        <g key="h">
          <path d="M25 34 Q27 17 40 17 Q53 17 55 34 Q40 25 25 34 Z" fill={def.color} />
          <path d="M28 25 Q40 20 52 27" fill="none" stroke={def.accent} strokeWidth="2" opacity="0.8" />
        </g>
      )
    // Ward: a flat cap
    case 7:
      return (
        <g key="h">
          <path d="M26 33 Q28 21 40 21 Q52 21 54 33 Z" fill={def.color} />
          <rect x="22" y="31" width="22" height="4" rx="2" fill={def.color} />
        </g>
      )
    // Maris: a captain's cap
    default:
      return (
        <g key="h">
          <path d="M26 33 Q28 19 40 19 Q52 19 54 33 Z" fill={def.color} />
          <rect x="24" y="31" width="32" height="4" rx="2" fill={def.accent} opacity="0.9" />
          <circle cx="40" cy="26" r="2.5" fill={def.accent} />
        </g>
      )
  }
}

/** A small bust drawn from the rival's colors. */
export function RivalPortrait({
  def,
  size = 72,
  muted = false,
  keel = false,
}: {
  def: PortraitDef
  size?: number
  muted?: boolean
  /** Draw Keel's captain instead of looking the founder up in RIVALS. */
  keel?: boolean
}) {
  const found = RIVALS.findIndex((r) => r.initials === def.initials && r.founder === def.founder)
  const i = keel ? RIVALS.length : found < 0 ? RIVALS.length : found
  const hair = hairFor(def, i)
  return (
    <svg
      className={`rv-portrait${muted ? ' is-muted' : ''}`}
      viewBox="0 0 80 80"
      width={size}
      height={size}
      role="img"
      aria-label={muted ? 'Unknown rival' : `${def.founder}, ${def.title}`}
    >
      <circle cx="40" cy="40" r="39" fill={muted ? 'var(--g2-raised)' : def.color} opacity={muted ? 1 : 0.22} />
      <path d="M14 78 Q16 56 40 54 Q64 56 66 78 Z" fill={muted ? 'var(--g2-line)' : def.color} />
      <circle cx="40" cy="36" r="14" fill={muted ? 'var(--g2-line)' : def.accent} />
      {muted ? (
        <text x="40" y="41" textAnchor="middle" fontSize="14" fill="var(--ge-muted)">
          ?
        </text>
      ) : (
        hair
      )}
      {!muted ? (
        <g>
          <circle cx="62" cy="62" r="11" fill="var(--g2-bg, #111)" stroke={def.accent} strokeWidth="1.5" />
          <text x="62" y="66" textAnchor="middle" fontSize="9" fontWeight="700" fill={def.accent}>
            {def.initials}
          </text>
        </g>
      ) : null}
    </svg>
  )
}

function StoreRow({ stores, max, bought }: { stores: number; max: number; bought: boolean }) {
  return (
    <div className="rv-stores" aria-label={`${stores} of ${max} stores`}>
      {Array.from({ length: max }, (_, k) => (
        <span key={k} className={`rv-store${k < stores ? ' is-open' : ''}${bought && k < stores ? ' is-ours' : ''}`} />
      ))}
    </div>
  )
}

function statusLine(s: { time: number }, def: RivalDef, st: RivalState): string {
  if (st.bought) return `Yours. ${st.boughtStores} stores now copy your flagship's sales.`
  if (st.stores >= def.maxStores) return 'At full size. It will not open more stores.'
  if (s.time < st.frozenUntil) return `Licking its wounds: no new stores for ${clock(st.frozenUntil - s.time)}.`
  return `Next store opens in ${clock(Math.max(0, st.nextGrowAt - s.time))}.`
}

export function RivalsPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const [confirm, setConfirm] = useState<RivalDef | null>(null)
  const [keelBuy, setKeelBuy] = useState(false)
  const [who, setWho] = useState<string | null>(null)
  const keelOn = s.era >= 8
  const keel = s.horizon.keel
  const cut = 1 - rivalDemandMul(s) * keelDemandMul(s)
  const owned = boughtRivalStores(s)
  const shown = RIVALS.filter((r) => r.era <= s.era + 1)
  const boughtCount = RIVALS.filter((r) => s.rivals[r.id]?.bought).length + (keelOn && keel.bought ? 1 : 0)
  const boughtTotal = RIVALS.length + (keelOn ? 1 : 0)
  const keelWar = can(s, { type: 'priceWarKeel' })
  const keelBuyCheck = can(s, { type: 'buyoutKeel' })
  const keelFrozen = Math.max(0, keel.frozenUntil - s.time)
  const keelPull = keel.bought ? 0 : 1 - keelDemandMul(s)
  const keelStatus = keel.bought
    ? `Yours. ${keel.convoys} convoys fly your flag.`
    : keelFrozen > 0
      ? `Truce: no new convoys for ${clock(keelFrozen)}.`
      : `Next convoy in ${clock(Math.max(0, s.horizon.nextKeelAt - s.time))}.`

  return (
    <div className="rv">
      <section className="ge-panel rv-summary">
        <ScreenHeader hub title="Rivals" purpose="Each rival store pulls shoppers away until you beat it back or buy it." />
        <HubStage
          scene={<RivalStreetScene />}
          primary={
            <div className="rv-summary__nums">
              <div>
                <span className="rv-summary__label">Shoppers lost</span>
                <strong className={cut > 0.001 ? 'is-bad' : ''}>
                  {cut > 0.001 ? `−${(cut * 100).toFixed(1)}%` : 'None'}
                </strong>
              </div>
              <div>
                <span className="rv-summary__label">From buyouts</span>
                <strong className={owned > 0 ? 'is-good' : ''}>
                  {owned > 0 ? `+${owned.toFixed(2)} flagships` : 'Nothing yet'}
                </strong>
              </div>
              <div>
                <span className="rv-summary__label">Bought</span>
                <strong>
                  {boughtCount} of {boughtTotal}
                </strong>
              </div>
            </div>
          }
        />
      </section>

      <div className="rv-grid">
        {keelOn ? (
          <article className={`ge-panel rv-row${keel.bought ? ' is-bought' : ''}`} data-coach-id="rival-keel">
            <button
              type="button"
              className="rv-row__open"
              onClick={() => setWho('keel')}
              aria-label={`${KEEL_CARD.name}, ${KEEL_CARD.founder}. ${keelStatus}`}
            >
              <strong className="rv-row__name">{KEEL_CARD.name}</strong>
              <span className="rv-row__status">{keel.bought ? 'Yours' : keelFrozen > 0 ? 'Paused' : 'On the route'}</span>
              <em className="rv-row__num">{keel.bought ? String(keel.convoys) : `−${(keelPull * 100).toFixed(1)}%`}</em>
            </button>
            {keel.bought ? null : (
              <>
                <Button
                  size="sm"
                  tone="secondary"
                  className="rv-war"
                  disabled={!keelWar.ok}
                  title={
                    keelWar.ok
                      ? `Freeze up to two convoys and stop new ones for ${clock(HORIZON.keelFreezeSec)}.`
                      : keelWar.reason
                  }
                  cost={money(Math.ceil(keelBuyoutCost(s) * HORIZON.keelWarCostFrac), numberFormat)}
                  onClick={() => dispatch({ type: 'priceWarKeel' })}
                >
                  Price war
                </Button>
                <Button
                  size="sm"
                  tone="primary"
                  className="rv-buy"
                  disabled={!keelBuyCheck.ok}
                  title={keelBuyCheck.ok ? 'Fold their convoys into the network.' : keelBuyCheck.reason}
                  cost={money(keelBuyoutCost(s), numberFormat)}
                  onClick={() => setKeelBuy(true)}
                >
                  Buy
                </Button>
              </>
            )}
          </article>
        ) : null}

        {shown.map((def) => {
          const st = s.rivals[def.id]
          if (!st) {
            return (
              <article key={def.id} className="ge-panel rv-row is-locked">
                <button
                  type="button"
                  className="rv-row__open"
                  onClick={() => setWho(def.id)}
                  aria-label={`${def.founder}, opens in Era ${def.era}`}
                >
                  <strong className="rv-row__name">Someone is watching</strong>
                  <span className="rv-row__status">Opens in Era {def.era}</span>
                  <em className="rv-row__num">—</em>
                </button>
              </article>
            )
          }
          const war = can(s, { type: 'priceWar', id: def.id })
          const buy = can(s, { type: 'buyoutRival', id: def.id })
          const pull = 1 - 1 / (1 + st.stores * RIVAL_CHAINS.perStore * statCut(s, 'rivalCut'))
          const rowStatus = st.bought
            ? 'Yours'
            : st.stores >= def.maxStores
              ? 'Full size'
              : s.time < st.frozenUntil
                ? 'Paused'
                : 'Growing'
          const rowNum = st.bought ? String(st.boughtStores) : `−${(pull * 100).toFixed(1)}%`
          return (
            <article key={def.id} className={`ge-panel rv-row${st.bought ? ' is-bought' : ''}`}>
              <button
                type="button"
                className="rv-row__open"
                onClick={() => setWho(def.id)}
                aria-label={`${def.name}, ${def.founder}. ${statusLine(s, def, st)}`}
              >
                <strong className="rv-row__name">{def.name}</strong>
                <span className="rv-row__status">{rowStatus}</span>
                <em className="rv-row__num">{rowNum}</em>
              </button>
              {st.bought ? null : (
                <>
                  <Button
                    size="sm"
                    tone="secondary"
                    className="rv-war"
                    disabled={!war.ok}
                    title={
                      war.ok
                        ? `Close ${RIVAL_CHAINS.warStoresClosed} of their stores and stop them opening more for ${clock(RIVAL_CHAINS.warFreezeSec)}.`
                        : war.reason
                    }
                    cost={money(priceWarCost(s, def.id), numberFormat)}
                    onClick={() => dispatch({ type: 'priceWar', id: def.id })}
                  >
                    Price war
                  </Button>
                  <Button
                    size="sm"
                    tone="primary"
                    className="rv-buy"
                    disabled={!buy.ok}
                    title={buy.ok ? `Their ${st.stores} stores join your network for good.` : buy.reason}
                    cost={money(buyoutCost(s, def.id), numberFormat)}
                    onClick={() => setConfirm(def)}
                  >
                    Buy
                  </Button>
                </>
              )}
            </article>
          )
        })}
      </div>

      <Sheet
        open={who != null}
        onClose={() => setWho(null)}
        title={who === 'keel' ? KEEL_CARD.name : (RIVALS.find((r) => r.id === who)?.name ?? 'Rival')}
        reducedMotion={reducedMotion}
        footer={
          <Button tone="primary" onClick={() => setWho(null)}>
            Done
          </Button>
        }
      >
        {who === 'keel' ? (
          <div className="p6-stack">
            <RivalPortrait def={KEEL_CARD} keel />
            <p className="p6-copy">
              {KEEL_CARD.founder} · {KEEL_CARD.title}
            </p>
            <p className="p6-muted">{KEEL_CARD.tagline}</p>
            <StoreRow
              stores={Math.min(KEEL_CONVOY_ROW, keel.convoys)}
              max={Math.max(KEEL_CONVOY_ROW, keel.convoys)}
              bought={keel.bought}
            />
            <p className="p6-copy">{keelStatus}</p>
            {keel.bought ? <p className="p6-muted">“{KEEL_CARD.farewell.split('"')[1] ?? KEEL_CARD.farewell}”</p> : null}
          </div>
        ) : (
          (() => {
            const def = RIVALS.find((r) => r.id === who)
            const st = def ? s.rivals[def.id] : undefined
            if (!def) return null
            if (!st) {
              return (
                <div className="p6-stack">
                  <RivalPortrait def={def} muted />
                  <p className="p6-muted">
                    {def.founder} · a new rival opens in Era {def.era}.
                  </p>
                </div>
              )
            }
            return (
              <div className="p6-stack">
                <RivalPortrait def={def} />
                <p className="p6-copy">
                  {def.founder} · {def.title}
                </p>
                <p className="p6-muted">{def.tagline}</p>
                <StoreRow stores={st.bought ? st.boughtStores : st.stores} max={def.maxStores} bought={st.bought} />
                <p className="p6-copy">{statusLine(s, def, st)}</p>
                {st.bought ? <p className="p6-muted">“{def.farewell.split('"')[1] ?? def.farewell}”</p> : null}
              </div>
            )
          })()
        )}
      </Sheet>

      <ConfirmModal
        open={keelBuy}
        reducedMotion={reducedMotion}
        spec={{
          title: 'Buy out Keel & Sons?',
          body: 'Their convoys join your network.',
          detail: `Costs ${money(keelBuyoutCost(s), numberFormat)}.`,
          confirmLabel: 'Buy',
          onConfirm: () => dispatch({ type: 'buyoutKeel' }),
        }}
        onClose={() => setKeelBuy(false)}
      />

      <ConfirmModal
        open={!!confirm}
        reducedMotion={reducedMotion}
        spec={
          confirm
            ? {
                title: `Buy ${confirm.name}?`,
                body: `${s.rivals[confirm.id]?.stores ?? 0} stores join your network and stop pulling shoppers.`,
                detail: `Costs ${money(buyoutCost(s, confirm.id), numberFormat)}. Fewer stores means a cheaper deal — a price war first can save money.`,
                confirmLabel: 'Buy',
                onConfirm: () => dispatch({ type: 'buyoutRival', id: confirm.id }),
              }
            : null
        }
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}

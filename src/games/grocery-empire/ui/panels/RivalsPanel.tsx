import { MENUS } from '../../content/menus'
import { useState, type ReactNode } from 'react'
import { RIVALS, type RivalDef } from '../../content/rivals'
import { RIVAL_CHAINS } from '../../sim/balance'
import { can } from '../../sim/commands'
import { keelDemandMul } from '../../sim/formulas'
import type { RivalState } from '../../sim/state'
import { boughtRivalStores, buyoutCost, priceWarCost, rivalDemandMul } from '../../sim/systems/rivals'
import { keelBuyoutCost } from '../../sim/systems/horizon'
import { statCut } from '../../sim/systems/stats'
import '../components/screenPanel.css'
import { ConfirmModal } from '../components/ConfirmModal'
import { Button, EmptyState, Sheet } from '../kit'
import { ActionRow, PlayFrame } from '../play'
import { useGame } from '../GameContext'
import { clock, money } from '../format'
import { RivalStreetScene } from '../scenes/live/RivalStreetScene'
import { RivalBosses } from '../corp/RivalBosses'

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
  const keelBuyCheck = can(s, { type: 'buyoutKeel' })
  const keelFrozen = Math.max(0, keel.frozenUntil - s.time)
  const keelPull = keel.bought ? 0 : 1 - keelDemandMul(s)
  const keelStatus = keel.bought
    ? `Yours. ${keel.convoys} convoys fly your flag.`
    : keelFrozen > 0
      ? `Truce: no new convoys for ${clock(keelFrozen)}.`
      : `Next convoy in ${clock(Math.max(0, s.horizon.nextKeelAt - s.time))}.`

  const activeRival =
    shown.find((r) => {
      const st = s.rivals[r.id]
      return st && !st.bought
    }) ?? shown[0]
  const activeSt = activeRival ? s.rivals[activeRival.id] : null
  const activeWar = activeRival ? can(s, { type: 'priceWar', id: activeRival.id }) : { ok: false }
  const activeBuy = activeRival ? can(s, { type: 'buyoutRival', id: activeRival.id }) : { ok: false }
  const activePull =
    activeSt && activeRival
      ? 1 - 1 / (1 + activeSt.stores * RIVAL_CHAINS.perStore * statCut(s, 'rivalCut'))
      : 0

  return (
    <div className="rv">
      <section className="ge-panel">
        <PlayFrame
          purpose={MENUS.rivals.purpose}
          department="Rivals"
          room={<RivalStreetScene />}
          tray={{
            primary: activeRival && activeSt && !activeSt.bought
              ? {
                  label: `Buy ${activeRival.name}`,
                  tone: 'primary',
                  size: 'lg',
                  disabled: !activeBuy.ok,
                  title: activeBuy.ok ? undefined : activeBuy.reason,
                  cost: money(buyoutCost(s, activeRival.id), numberFormat),
                  onClick: () => setConfirm(activeRival),
                }
              : keelOn && !keel.bought
                ? {
                    label: `Buy ${KEEL_CARD.name}`,
                    tone: 'primary',
                    size: 'lg',
                    disabled: !keelBuyCheck.ok,
                    cost: money(keelBuyoutCost(s), numberFormat),
                    onClick: () => setKeelBuy(true),
                  }
                : null,
            failReason:
              activeRival && activeSt && !activeSt.bought && !activeBuy.ok
                ? activeBuy.reason
                : cut > 0.001
                  ? `Rivals take ${(cut * 100).toFixed(1)}% of your shoppers`
                  : !activeRival && !keelOn
                    ? 'No rival has opened near you yet.'
                    : undefined,
            secondaries: [
              ...(activeRival && activeSt && !activeSt.bought
                ? [
                    {
                      key: 'war',
                      label: `Price war on ${activeRival.name.split(' ')[0]}`,
                      fact: `${money(priceWarCost(s, activeRival.id), numberFormat)} · closes ${Math.min(RIVAL_CHAINS.warStoresClosed, (activeSt?.stores ?? 1) - 1)} of their stores`,
                      disabled: !activeWar.ok,
                      title: activeWar.ok ? undefined : activeWar.reason,
                      onClick: () => dispatch({ type: 'priceWar', id: activeRival.id }),
                    },
                  ]
                : []),
            ],
          }}
        >
          {activeRival && activeSt ? (
            <ActionRow
              label={activeRival.name}
              fact={activeSt.bought ? 'Yours' : `Takes ${(activePull * 100).toFixed(1)}% of your shoppers · ${statusLine(s, activeRival, activeSt)}`}
              trail="Details"
              onClick={() => setWho(activeRival.id)}
            />
          ) : null}
          {!activeRival && !keelOn ? (
            <EmptyState title="Street quiet" body="No rival has opened near you yet. They show up as the store grows." />
          ) : null}
          <p className="ge-muted">
            {cut > 0.001 ? `All rivals together take ${(cut * 100).toFixed(1)}% of your shoppers.` : 'No rival is taking your shoppers right now.'}
            {owned > 0 ? ` Chains you bought add the pull of ${owned.toFixed(1)} extra flagships.` : ''}
          </p>
          <div className="p6-stack">
            {keelOn ? (
              <ActionRow
                label={KEEL_CARD.name}
                fact={
                  keel.bought
                    ? `Yours · ${keel.convoys} convoys · ${KEEL_CARD.founder}`
                    : `${KEEL_CARD.founder} · takes ${(keelPull * 100).toFixed(1)}% of your shoppers · ${keelFrozen > 0 ? 'paused' : 'on the route'}`
                }
                trail="Details"
                onClick={() => setWho('keel')}
              />
            ) : null}
            {shown
              .filter((r) => r.id !== activeRival?.id)
              .map((def) => {
                const st = s.rivals[def.id]
                if (!st) {
                  return (
                    <ActionRow
                      key={def.id}
                      label="Someone is watching"
                      fact={`A new rival arrives in Era ${def.era}`}
                      trail="Details"
                      onClick={() => setWho(def.id)}
                    />
                  )
                }
                const pull = 1 - 1 / (1 + st.stores * RIVAL_CHAINS.perStore * statCut(s, 'rivalCut'))
                return (
                  <ActionRow
                    key={def.id}
                    label={def.name}
                    fact={
                      st.bought
                        ? `Yours · ${st.boughtStores} stores`
                        : `Takes ${(pull * 100).toFixed(1)}% of your shoppers · ${s.time < st.frozenUntil ? 'paused' : 'growing'}`
                    }
                    trail="Details"
                    onClick={() => setWho(def.id)}
                  />
                )
              })}
          </div>
          <RivalBosses />
        </PlayFrame>
      </section>

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

import { motion } from 'motion/react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  LEDGER_SKINS,
  ORNAMENTS,
  SHOP_BUNDLES,
  TEXTURE_PACKS,
  UNPACK_FX,
  previewPackVars,
  type TexturePack,
} from '@/cosmetics/packs'
import { PLATES, type PlateId } from '@/games/grocery-empire/art/cast'
import { Button } from '@/games/grocery-empire/ui/kit'
import { useMeta } from './MetaContext'
import { ShellFrame } from './ShellFrame'
import './shop.css'

/** Optional plate thumbs for known pack ids (presentation only). */
const PACK_PLATES: Record<string, PlateId> = {
  'receipt-classic': 'counter',
  'receipt-1': 'counter',
  'corner-bodega': 'corner',
  'sunday-flyer': 'corner',
  'cold-room': 'cold',
  'night-shift': 'counter',
  'port-authority': 'fleet',
  'vacuum-aisle': 'fleet',
  'hungry-universe': 'fleet',
  'last-ration': 'cold',
}

/** Where each pack's look comes from, in words. */
const MOOD: Record<string, string> = {
  default: 'Starter',
  'baskets:1000': 'The first 1,000 baskets',
  'ads:5': 'Five ad buys',
  incorporated: 'Incorporating the chain',
  coldPlant: 'The first cold plant',
  nightClerk: 'The night clerk',
  investBook: 'The Trading Desk',
  ocean: 'Ocean lanes',
  barge: 'The seed barges',
  driftWar: 'The drift war',
  ending: 'The ending',
  accept: 'Accepting the ending',
}

type Tab = 'packs' | 'ledger' | 'unpack' | 'ornaments' | 'bundles'

function Price({ n }: { n: number }) {
  return (
    <span className="sd-tagprice" aria-label={`${n} tokens`}>
      {n === 0 ? 'Free' : n}
    </span>
  )
}

/** The game's HUD and shelf, painted in a pack's colours. */
function PackPreview({ pack }: { pack: TexturePack }) {
  const vars = previewPackVars(pack.id) as CSSProperties
  const plate = PACK_PLATES[pack.id]
  return (
    <div className="sp-preview" style={{ ...vars, backgroundImage: pack.pattern }} aria-label={`Preview: ${pack.name}`}>
      <div className="sp-preview__hud">
        <span className="sp-preview__brand" style={{ fontFamily: pack.fontDisplay }}>
          Grocery Empire
        </span>
        <span className="sp-preview__stat">
          <small>Cash</small>
          <b>$1.24K</b>
          <i>+$4.20/s</i>
        </span>
        <span className="sp-preview__stat">
          <small>Baskets</small>
          <b>3,870</b>
        </span>
        <span className="sp-preview__goal">
          <small>Next goal</small>
          Feature a can facing
        </span>
      </div>
      <div className="sp-preview__room" style={plate ? { backgroundImage: `linear-gradient(180deg, transparent, var(--bg) 92%), url(${PLATES[plate]})` } : undefined}>
        <div className="sp-preview__shelf">
          {['CAN', 'HSE', 'PRD'].map((a, i) => (
            <span key={a}>
              <i style={{ height: `${[86, 54, 30][i]}%` }} />
              <em>{a}</em>
            </span>
          ))}
        </div>
        <div className="sp-preview__receipt" style={{ fontFamily: pack.fontMono }}>
          <span>09:12 Sold 3 cans</span>
          <b>$4.20</b>
        </div>
      </div>
      <div className="sp-preview__tray">
        <span className="sp-preview__btn is-free">Unpack</span>
        <span className="sp-preview__btn is-spend">
          Buy crate <b>$12</b>
        </span>
        <span className="sp-preview__btn">Done</span>
      </div>
    </div>
  )
}

function Card({
  children,
  art,
  on,
  sel,
  owned,
  onSelect,
  style,
  i,
}: {
  children: ReactNode
  art: ReactNode
  on?: boolean
  sel?: boolean
  owned?: boolean
  onSelect?: () => void
  style?: CSSProperties
  i: number
}) {
  return (
    <motion.article
      className={`sp-card${on ? ' is-on' : ''}${sel ? ' is-sel' : ''}${owned ? ' is-owned' : ''}`}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 10) * 0.03 }}
      onClick={onSelect}
    >
      <div className="sp-card__art">{art}</div>
      <div className="sp-card__body">{children}</div>
    </motion.article>
  )
}

function Foot({
  owned,
  equipped,
  cost,
  tokens,
  onBuy,
  onEquip,
  equipLabel = 'Equip',
  equippedLabel = 'Equipped',
  toggle,
}: {
  owned: boolean
  equipped: boolean
  cost: number
  tokens: number
  onBuy: () => void
  onEquip: () => void
  equipLabel?: string
  equippedLabel?: string
  /** Ornaments can be worn together, so Equipped is a toggle. */
  toggle?: boolean
}) {
  const stop = (fn: () => void) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    fn()
  }
  if (owned) {
    return (
      <div className="sp-card__foot">
        <span className={`sd-chip ${equipped ? 'sd-chip--ok' : 'sd-chip--quiet'}`}>{equipped ? equippedLabel : 'Owned'}</span>
        {equipped && !toggle ? null : (
          <Button size="sm" tone={equipped ? 'ghost' : 'secondary'} onClick={stop(onEquip)}>
            {equipped ? 'Take off' : equipLabel}
          </Button>
        )}
      </div>
    )
  }
  const short = tokens < cost
  return (
    <div className="sp-card__foot">
      <Price n={cost} />
      <Button size="sm" tone="primary" affordable={!short} onClick={stop(onBuy)} title={short ? `Need ${cost - tokens} more token${cost - tokens === 1 ? '' : 's'}` : undefined}>
        {short ? `${cost - tokens} short` : 'Buy'}
      </Button>
    </div>
  )
}

export function ShopPage() {
  const {
    meta,
    metaRef,
    buyPack,
    equipPack,
    surprisePack,
    buyLedgerSkin,
    equipLedgerSkin,
    buyUnpackFx,
    equipUnpackFx,
    buyBundle,
    buyOrnament,
    toggleOrnament,
  } = useMeta()
  const [tab, setTab] = useState<Tab>('packs')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState(meta.equippedPack)

  const livePack = TEXTURE_PACKS.find((p) => p.id === (previewId ?? selectedId ?? meta.equippedPack)) ?? TEXTURE_PACKS[0]
  const unlockedOrnaments = meta.unlockedOrnaments ?? []
  const equippedOrnaments = meta.equippedOrnaments ?? []
  const tokens = meta.shelfTokens

  const counts = useMemo(
    () => ({
      packs: [meta.unlockedPacks.length, TEXTURE_PACKS.length],
      ledger: [meta.unlockedLedgerSkins.length, LEDGER_SKINS.length],
      unpack: [meta.unlockedUnpackFx.length, UNPACK_FX.length],
      ornaments: [unlockedOrnaments.length, ORNAMENTS.length],
      bundles: [SHOP_BUNDLES.filter((b) => b.packIds.every((id) => meta.unlockedPacks.includes(id))).length, SHOP_BUNDLES.length],
    }),
    [meta.unlockedPacks, meta.unlockedLedgerSkins, meta.unlockedUnpackFx, unlockedOrnaments, unlockedOrnaments.length],
  )

  const TABS: { id: Tab; label: string; where: string }[] = [
    { id: 'packs', label: 'Packs', where: 'The whole game: paper, ink, light and type.' },
    { id: 'ledger', label: 'Ledger skins', where: 'The Ledger drawer and the Books room.' },
    { id: 'unpack', label: 'Unpack FX', where: 'The Floor’s Unpack button, in the room and the verb tray.' },
    { id: 'ornaments', label: 'Ornaments', where: 'The home shelf and the Fleet harbor pier. Wear several at once.' },
    { id: 'bundles', label: 'Bundles', where: 'Several pieces for less than their parts.' },
  ]
  const tabInfo = TABS.find((t) => t.id === tab)!

  return (
    <ShellFrame title="Shop">
      <div className="sd-page sp">
        <header className="sp-hero">
          <div>
            <p className="sd-eyebrow sd-eyebrow--tag">Shelf tokens · presentation only</p>
            <h1 className="sd-title">Dress the counter.</h1>
            <p className="sd-lede">Packs change the paper and the light — never the math of a basket. Earn tokens from Awards and the daily stamp.</p>
          </div>
          <div className="sp-wallet">
            <span className="sp-wallet__coin" aria-hidden>
              ¢
            </span>
            <div>
              <span className="sd-eyebrow">Your tokens</span>
              <strong>{tokens}</strong>
            </div>
            <Link to="/achievements" className="sp-wallet__earn">
              Earn more →
            </Link>
          </div>
        </header>

        <nav className="sd-tabs sp-tabs" role="tablist" aria-label="Shop sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`sd-tab${tab === t.id ? ' is-on' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
              <span className="sd-tab__n">
                {counts[t.id][0]}/{counts[t.id][1]}
              </span>
            </button>
          ))}
        </nav>
        <p className="sp-where">Shows in: {tabInfo.where}</p>

        {tab === 'packs' ? (
          <div className="sp-packs">
            <aside className="sp-stage">
              <PackPreview pack={livePack} />
              <div className="sp-stage__info">
                <div>
                  <h2 style={{ fontFamily: livePack.fontDisplay }}>{livePack.name}</h2>
                  <p>{livePack.blurb}</p>
                  <span className="sd-chip sd-chip--quiet">{MOOD[livePack.unlock] ?? livePack.unlock}</span>
                </div>
                <div className="sp-stage__acts">
                  {meta.unlockedPacks.includes(livePack.id) ? (
                    meta.equippedPack === livePack.id ? (
                      <span className="sd-chip sd-chip--ok">Wearing it</span>
                    ) : (
                      <Button tone="secondary" onClick={() => equipPack(livePack.id)}>
                        Wear {livePack.name}
                      </Button>
                    )
                  ) : (
                    <Button tone="primary" cost={livePack.tokenCost} affordable={tokens >= livePack.tokenCost} onClick={() => buyPack(livePack.id, livePack.tokenCost)}>
                      Buy and wear
                    </Button>
                  )}
                  <Button
                    tone="ghost"
                    onClick={() => {
                      if (!surprisePack()) return
                      setSelectedId(metaRef.current.equippedPack)
                      setPreviewId(null)
                    }}
                    title="Wears a random pack you own, or buys the cheapest you can afford."
                  >
                    Surprise me
                  </Button>
                </div>
              </div>
            </aside>
            <div className="sp-grid">
              {TEXTURE_PACKS.map((p, i) => {
                const owned = meta.unlockedPacks.includes(p.id)
                const plate = PACK_PLATES[p.id]
                return (
                  <Card
                    key={p.id}
                    i={i}
                    on={meta.equippedPack === p.id}
                    sel={selectedId === p.id}
                    owned={owned}
                    onSelect={() => {
                      setSelectedId(p.id)
                      setPreviewId(null)
                    }}
                    style={{ ['--pk-accent' as string]: p.vars['--accent'], ['--pk-bg' as string]: p.vars['--bg'], ['--pk-ink' as string]: p.vars['--ink'] }}
                    art={
                      <div
                        className="sp-swatch"
                        onMouseEnter={() => setPreviewId(p.id)}
                        onMouseLeave={() => setPreviewId(null)}
                        style={{
                          backgroundImage: plate
                            ? `linear-gradient(180deg, transparent 20%, ${p.vars['--bg']} 100%), url(${PLATES[plate]})`
                            : p.pattern,
                          backgroundColor: p.vars['--bg'],
                        }}
                      >
                        <span style={{ fontFamily: p.fontDisplay, color: p.vars['--ink'] }}>{p.name}</span>
                        <span className="sp-swatch__dots">
                          <i style={{ background: p.vars['--accent'] }} />
                          <i style={{ background: p.vars['--tag'] ?? '#f2c14e' }} />
                          <i style={{ background: p.vars['--success'] }} />
                        </span>
                      </div>
                    }
                  >
                    <h3>{p.name}</h3>
                    <p>{p.blurb}</p>
                    <span className="sp-mood">{MOOD[p.unlock] ?? p.unlock}</span>
                    <Foot
                      owned={owned}
                      equipped={meta.equippedPack === p.id}
                      cost={p.tokenCost}
                      tokens={tokens}
                      onBuy={() => {
                        setSelectedId(p.id)
                        buyPack(p.id, p.tokenCost)
                      }}
                      onEquip={() => equipPack(p.id)}
                      equipLabel="Wear"
                      equippedLabel="Wearing"
                    />
                  </Card>
                )
              })}
            </div>
          </div>
        ) : null}

        {tab === 'ledger' ? (
          <div className="sp-grid sp-grid--wide">
            {LEDGER_SKINS.map((skin, i) => {
              const owned = meta.unlockedLedgerSkins.includes(skin.id)
              const equipped = meta.equippedLedgerSkin === skin.id
              return (
                <Card
                  key={skin.id}
                  i={i}
                  on={equipped}
                  owned={owned}
                  art={
                    <div className={`sp-ledger shop-ledger-demo ${skin.cssClass}`}>
                      <span>09:12</span>
                      <span>Sold 3 cans · $4.20</span>
                      <span>09:13</span>
                      <span>Truck in · 12 crates</span>
                    </div>
                  }
                >
                  <h3>{skin.name}</h3>
                  <p>{skin.blurb}</p>
                  <Foot owned={owned} equipped={equipped} cost={skin.tokenCost} tokens={tokens} onBuy={() => buyLedgerSkin(skin.id, skin.tokenCost)} onEquip={() => equipLedgerSkin(skin.id)} />
                </Card>
              )
            })}
          </div>
        ) : null}

        {tab === 'unpack' ? (
          <div className="sp-grid sp-grid--wide">
            {UNPACK_FX.map((fx, i) => {
              const owned = meta.unlockedUnpackFx.includes(fx.id)
              const equipped = meta.equippedUnpackFx === fx.id
              return (
                <Card
                  key={fx.id}
                  i={i}
                  on={equipped}
                  owned={owned}
                  art={
                    <div className="sp-fx">
                      <span className={`sp-fx__btn shop-fx-demo ${fx.cssClass}`}>Unpack</span>
                    </div>
                  }
                >
                  <h3>{fx.name}</h3>
                  <p>{fx.blurb}</p>
                  <Foot owned={owned} equipped={equipped} cost={fx.tokenCost} tokens={tokens} onBuy={() => buyUnpackFx(fx.id, fx.tokenCost)} onEquip={() => equipUnpackFx(fx.id)} />
                </Card>
              )
            })}
          </div>
        ) : null}

        {tab === 'ornaments' ? (
          <div className="sp-grid sp-grid--wide">
            {ORNAMENTS.map((orn, i) => {
              const owned = unlockedOrnaments.includes(orn.id)
              const equipped = equippedOrnaments.includes(orn.id)
              return (
                <Card
                  key={orn.id}
                  i={i}
                  on={equipped}
                  owned={owned}
                  art={
                    <div className={`sp-orn shop-ornament-demo ${orn.cssClass}`}>
                      <span className="shop-ornament-demo__shelf" />
                    </div>
                  }
                >
                  <h3>{orn.name}</h3>
                  <p>{orn.blurb}</p>
                  <Foot
                    owned={owned}
                    equipped={equipped}
                    cost={orn.tokenCost}
                    tokens={tokens}
                    onBuy={() => buyOrnament(orn.id, orn.tokenCost)}
                    onEquip={() => toggleOrnament(orn.id)}
                    equipLabel="Hang it"
                    equippedLabel="Hanging"
                    toggle
                  />
                </Card>
              )
            })}
          </div>
        ) : null}

        {tab === 'bundles' ? (
          <div className="sp-grid sp-grid--wide">
            {SHOP_BUNDLES.map((b, i) => {
              const packs = b.packIds.map((id) => TEXTURE_PACKS.find((p) => p.id === id)).filter(Boolean) as TexturePack[]
              const ledgers = (b.ledgerSkinIds ?? []).map((id) => LEDGER_SKINS.find((l) => l.id === id)).filter(Boolean)
              const fx = (b.unpackFxIds ?? []).map((id) => UNPACK_FX.find((f) => f.id === id)).filter(Boolean)
              const full = packs.reduce((n, p) => n + p.tokenCost, 0) + ledgers.reduce((n, l) => n + (l?.tokenCost ?? 0), 0) + fx.reduce((n, f) => n + (f?.tokenCost ?? 0), 0)
              const allOwned =
                b.packIds.every((id) => meta.unlockedPacks.includes(id)) &&
                (b.ledgerSkinIds ?? []).every((id) => meta.unlockedLedgerSkins.includes(id)) &&
                (b.unpackFxIds ?? []).every((id) => meta.unlockedUnpackFx.includes(id))
              const items = [...packs.map((p) => p.name), ...ledgers.map((l) => l!.name), ...fx.map((f) => f!.name)]
              return (
                <Card
                  key={b.id}
                  i={i}
                  on={allOwned}
                  owned={allOwned}
                  art={
                    <div className="sp-bundle">
                      {packs.slice(0, 3).map((p, j) => (
                        <span
                          key={p.id}
                          style={{
                            background: p.vars['--bg'],
                            borderColor: p.vars['--accent'],
                            color: p.vars['--ink'],
                            fontFamily: p.fontDisplay,
                            transform: `rotate(${(j - 1) * 6}deg) translateY(${Math.abs(j - 1) * 6}px)`,
                          }}
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  }
                >
                  <h3>{b.name}</h3>
                  <p>{b.blurb}</p>
                  <ul className="sp-bundle__items">
                    {items.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  {full > b.tokenCost ? <span className="sp-save">Saves {full - b.tokenCost} token{full - b.tokenCost === 1 ? "" : "s"}</span> : null}
                  {allOwned ? (
                    <div className="sp-card__foot">
                      <span className="sd-chip sd-chip--ok">All owned</span>
                    </div>
                  ) : (
                    <Foot owned={false} equipped={false} cost={b.tokenCost} tokens={tokens} onBuy={() => buyBundle(b.id)} onEquip={() => {}} />
                  )}
                </Card>
              )
            })}
          </div>
        ) : null}
      </div>
    </ShellFrame>
  )
}

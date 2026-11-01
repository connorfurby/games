import { motion } from 'motion/react'
import { useMemo, useState, type CSSProperties } from 'react'
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
import { useMeta } from './MetaContext'

type Tab = 'packs' | 'ledger' | 'unpack' | 'ornaments' | 'bundles'

const TABS: { id: Tab; label: string }[] = [
  { id: 'packs', label: 'Packs' },
  { id: 'ledger', label: 'Ledger skins' },
  { id: 'unpack', label: 'Unpack FX' },
  { id: 'ornaments', label: 'Ornaments' },
  { id: 'bundles', label: 'Bundles' },
]

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

  const livePackId = previewId ?? selectedId ?? meta.equippedPack
  const liveVars = useMemo(() => previewPackVars(livePackId), [livePackId])
  const livePack = TEXTURE_PACKS.find((p) => p.id === livePackId) ?? TEXTURE_PACKS[0]
  const unlockedOrnaments = meta.unlockedOrnaments ?? []
  const equippedOrnaments = meta.equippedOrnaments ?? []

  return (
    <div className="shop-page">
      <header className="shop-hero">
        <Link to="/">← Shelf</Link>
        <motion.h1 className="brand" layoutId="brand">
          SHOP
        </motion.h1>
        <p className="shop-hero__lore">
          Dress the counter. Packs change the paper and light — never the math of baskets.
        </p>
        <p>Texture packs, ledger skins, unpack FX, ornaments. Pure presentation — never balance.</p>
        <p className="tokens">Tokens: {meta.shelfTokens}</p>
      </header>

      <div className="shop-tabs" role="tablist" aria-label="Shop sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'packs' || tab === 'bundles') && (
        <div className="shop-preview" style={liveVars as CSSProperties} aria-live="polite">
          <div className="shop-preview__chrome" style={{ backgroundImage: livePack.pattern }}>
            <span className="shop-preview__label">Live preview · {livePack.name}</span>
            <div className="shop-preview__card">
              <strong style={{ fontFamily: livePack.fontDisplay, color: 'var(--ink)' }}>
                Sample receipt
              </strong>
              <p style={{ color: 'var(--muted)', margin: '0.35rem 0 0', fontSize: 13 }}>
                Baskets · Cash · Accent
              </p>
              <div className="shop-preview__swatches">
                <i style={{ background: 'var(--accent)' }} />
                <i style={{ background: 'var(--success)' }} />
                <i style={{ background: 'var(--danger)' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'packs' && (
        <>
          <div className="shop-surprise">
            <button
              type="button"
              onClick={() => {
                if (!surprisePack()) return
                setSelectedId(metaRef.current.equippedPack)
                setPreviewId(null)
              }}
            >
              Surprise me
            </button>
            <span className="muted">
              Equips a random unlocked pack, or buys the cheapest you can afford.
            </span>
          </div>
          <div className="shop-grid">
            {TEXTURE_PACKS.map((p, i) => (
              <PackCard
                key={p.id}
                pack={p}
                index={i}
                owned={meta.unlockedPacks.includes(p.id)}
                equipped={meta.equippedPack === p.id}
                selected={selectedId === p.id}
                onHover={() => setPreviewId(p.id)}
                onLeave={() => setPreviewId(null)}
                onSelect={() => {
                  setSelectedId(p.id)
                  setPreviewId(null)
                }}
                onBuy={() => buyPack(p.id, p.tokenCost)}
                onEquip={() => equipPack(p.id)}
              />
            ))}
          </div>
        </>
      )}

      {tab === 'ledger' && (
        <div className="shop-grid">
          {LEDGER_SKINS.map((skin, i) => {
            const owned = meta.unlockedLedgerSkins.includes(skin.id)
            const equipped = meta.equippedLedgerSkin === skin.id
            return (
              <motion.article
                key={skin.id}
                className={`shop-card ${equipped ? 'equipped' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className={`shop-ledger-demo ${skin.cssClass}`}>
                  <span>09:12</span>
                  <span>Sold 3 cans · $4.20</span>
                </div>
                <h3>{skin.name}</h3>
                <p>{skin.blurb}</p>
                {owned ? (
                  <button type="button" disabled={equipped} onClick={() => equipLedgerSkin(skin.id)}>
                    {equipped ? 'Equipped' : 'Equip'}
                  </button>
                ) : (
                  <button type="button" onClick={() => buyLedgerSkin(skin.id, skin.tokenCost)}>
                    Buy · {skin.tokenCost} tokens
                  </button>
                )}
              </motion.article>
            )
          })}
        </div>
      )}

      {tab === 'unpack' && (
        <div className="shop-grid">
          {UNPACK_FX.map((fx, i) => {
            const owned = meta.unlockedUnpackFx.includes(fx.id)
            const equipped = meta.equippedUnpackFx === fx.id
            return (
              <motion.article
                key={fx.id}
                className={`shop-card ${equipped ? 'equipped' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className={`shop-fx-demo ${fx.cssClass}`}>
                  <span>Unpack</span>
                </div>
                <h3>{fx.name}</h3>
                <p>{fx.blurb}</p>
                {owned ? (
                  <button type="button" disabled={equipped} onClick={() => equipUnpackFx(fx.id)}>
                    {equipped ? 'Equipped' : 'Equip'}
                  </button>
                ) : (
                  <button type="button" onClick={() => buyUnpackFx(fx.id, fx.tokenCost)}>
                    Buy · {fx.tokenCost} tokens
                  </button>
                )}
              </motion.article>
            )
          })}
        </div>
      )}

      {tab === 'ornaments' && (
        <div className="shop-grid">
          {ORNAMENTS.map((orn, i) => {
            const owned = unlockedOrnaments.includes(orn.id)
            const equipped = equippedOrnaments.includes(orn.id)
            return (
              <motion.article
                key={orn.id}
                className={`shop-card ${equipped ? 'equipped' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className={`shop-ornament-demo ${orn.cssClass}`}>
                  <span className="shop-ornament-demo__shelf" />
                </div>
                <h3>{orn.name}</h3>
                <p>{orn.blurb}</p>
                {owned ? (
                  <button type="button" onClick={() => toggleOrnament(orn.id)}>
                    {equipped ? 'Unequip' : 'Equip'}
                  </button>
                ) : (
                  <button type="button" onClick={() => buyOrnament(orn.id, orn.tokenCost)}>
                    Buy · {orn.tokenCost} tokens
                  </button>
                )}
              </motion.article>
            )
          })}
        </div>
      )}

      {tab === 'bundles' && (
        <div className="shop-grid">
          {SHOP_BUNDLES.map((b, i) => {
            const packs = b.packIds
              .map((id) => TEXTURE_PACKS.find((p) => p.id === id))
              .filter(Boolean) as TexturePack[]
            const ledgers = (b.ledgerSkinIds ?? [])
              .map((id) => LEDGER_SKINS.find((l) => l.id === id))
              .filter(Boolean)
            const fx = (b.unpackFxIds ?? [])
              .map((id) => UNPACK_FX.find((f) => f.id === id))
              .filter(Boolean)
            const full =
              packs.reduce((n, p) => n + p.tokenCost, 0) +
              ledgers.reduce((n, l) => n + (l?.tokenCost ?? 0), 0) +
              fx.reduce((n, f) => n + (f?.tokenCost ?? 0), 0)
            const allOwned =
              b.packIds.every((id) => meta.unlockedPacks.includes(id)) &&
              (b.ledgerSkinIds ?? []).every((id) => meta.unlockedLedgerSkins.includes(id)) &&
              (b.unpackFxIds ?? []).every((id) => meta.unlockedUnpackFx.includes(id))
            const extras = [
              ...ledgers.map((l) => l!.name),
              ...fx.map((f) => f!.name),
            ]
            const preview = packs[0]
            return (
              <motion.article
                key={b.id}
                className={`shop-card ${allOwned ? 'equipped' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={preview ? (preview.vars as CSSProperties) : undefined}
                onMouseEnter={() => preview && setPreviewId(preview.id)}
                onMouseLeave={() => setPreviewId(null)}
              >
                <h3>{b.name}</h3>
                <p>{b.blurb}</p>
                <p className="muted">
                  {[...packs.map((p) => p.name), ...extras].join(' · ')}
                </p>
                <p className="muted">
                  Bundle {b.tokenCost} tokens
                  {full > b.tokenCost ? ` · saves ${full - b.tokenCost}` : ''}
                </p>
                {allOwned ? (
                  <button type="button" disabled>
                    Owned
                  </button>
                ) : (
                  <button type="button" onClick={() => buyBundle(b.id)}>
                    Buy bundle · {b.tokenCost}
                  </button>
                )}
              </motion.article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PackCard({
  pack,
  index,
  owned,
  equipped,
  selected,
  onHover,
  onLeave,
  onSelect,
  onBuy,
  onEquip,
}: {
  pack: TexturePack
  index: number
  owned: boolean
  equipped: boolean
  selected: boolean
  onHover: () => void
  onLeave: () => void
  onSelect: () => void
  onBuy: () => void
  onEquip: () => void
}) {
  return (
    <motion.article
      className={`shop-card ${equipped ? 'equipped' : ''} ${selected ? 'selected' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      style={pack.vars as CSSProperties}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      onClick={onSelect}
    >
      <div
        className="swatch"
        style={{
          background: pack.vars['--bg'],
          borderColor: pack.vars['--accent'],
          backgroundImage: pack.pattern,
        }}
      >
        <span style={{ color: pack.vars['--ink'], fontFamily: pack.fontDisplay }}>{pack.name}</span>
      </div>
      <h3>{pack.name}</h3>
      <p>{pack.blurb}</p>
      <p className="muted">Unlock: {pack.unlock}</p>
      {owned ? (
        <button
          type="button"
          disabled={equipped}
          onClick={(e) => {
            e.stopPropagation()
            onEquip()
          }}
        >
          {equipped ? 'Equipped' : 'Equip'}
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onBuy()
          }}
        >
          Buy · {pack.tokenCost} tokens
        </button>
      )}
    </motion.article>
  )
}

import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import {
  RARITIES,
  RARITY_INFO,
  RELICS,
  RELIC_BY_ID,
  WINGS,
  WING_BY_ID,
  relicsInWing,
  type Rarity,
  type WingId,
} from '../../content/relics'
import { MENUS } from '../../content/menus'
import { STAT_INFO, type StatId } from '../../content/upgrades/stats'
import { perkText, relicEffects } from '../../content/relicPerks'
import {
  FEATS,
  MUSEUM,
  buyChest,
  buyHint,
  chestOdds,
  canLightWing,
  completedWings,
  darkenWing,
  dustRelic,
  hintCost,
  levelRelic,
  lightWing,
  litWingsOf,
  museumSync,
  partialName,
  relicCount,
  relicLevelCost,
  relicLevelPower,
  setAutoDust,
  socketCapFor,
  socketRelic,
  unsocketRelic,
  wingOpen,
  type Chest,
} from '../../sim/museum'
import { useGame } from '../GameContext'
import { HubStage } from '../components/HubStage'
import { Button, EmptyState, SegmentedControl, Select, Sheet, useConfirm, usePhone } from '../kit'
import type { VerbTrayProps } from '../play'
import { ChestOpener } from './ChestOpener'
import { MuseumGallery } from './MuseumGallery'
import { ChestArt, RelicIcon } from './RelicIcon'
import { museumStore, useMuseum } from './store'

function syncMuseum(dispatch: (cmd: { type: 'syncRelics' } & ReturnType<typeof museumSync>) => void) {
  dispatch({ type: 'syncRelics', ...museumSync(museumStore.get()) })
}
import './museum.css'

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

/** What the wall adds up to right now, by stat (weather, era and copies included). */
function PerkTotals() {
  const { state } = useGame()
  const rows = useMemo(() => {
    const totals: Partial<Record<StatId, number>> = {}
    for (const src of relicEffects(state, state.relics?.owned ?? {})) {
      for (const e of src.effects) totals[e.stat] = (totals[e.stat] ?? 0) + e.per * src.rank
    }
    return (Object.entries(totals) as [StatId, number][]).sort((a, b) => b[1] - a[1])
  }, [state, state.relics?.count, state.weather?.now, state.era])
  if (rows.length === 0) return <p className="mu-empty">No relics yet. Each one you find adds its own perk to every run.</p>
  return (
    <section className="mu-perks" aria-label="Perk totals">
      <h3>Relic perks, all runs</h3>
      <p>Before the soft cap every stat shares. Weather and era perks change as you play.</p>
      <ul>
        {rows.map(([stat, v]) => (
          <li key={stat}>
            <span>{STAT_INFO[stat].label}</span>
            <strong>
              {STAT_INFO[stat].kind === 'cut' ? '−' : '+'}
              {(v * 100).toFixed(1)}%
            </strong>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Wing sockets: a finished wing's bonus is on only while lit. Lighting one at full means leaving another dark. */
function WingSockets({ cap, dispatch }: { cap: number; dispatch: (cmd: { type: 'syncRelics' } & ReturnType<typeof museumSync>) => void }) {
  const m = useMuseum()
  const done = completedWings(m)
  if (done.length === 0) return null
  const lit = litWingsOf(m, cap)
  const full = lit.length >= cap
  return (
    <section className="mu-sockets" aria-label="Wing sockets" data-coach-id="museum-wing-sockets">
      <h3>
        Wing sockets · {lit.length}/{cap}
      </h3>
      <p>A finished wing pays only while it holds a socket. To light another, leave one dark.</p>
      <ul>
        {done.map((id) => {
          const on = lit.includes(id)
          const why = on ? null : canLightWing(m, id, cap)
          return (
            <li key={id} className={on ? 'is-lit' : 'is-dark'}>
              <span>{WING_BY_ID[id]?.name ?? id}</span>
              <Button
                tone={on ? 'ghost' : 'secondary'}
                size="sm"
                disabled={!on && !!why}
                title={on ? 'Leave this wing dark' : (why ?? 'Light this wing')}
                onClick={() => {
                  museumStore.update((save) => (on ? darkenWing(save, id, cap) : lightWing(save, id, cap)))
                  syncMuseum(dispatch)
                }}
              >
                {on ? 'Leave dark' : full ? 'Dark · free a socket' : 'Light'}
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function MuseumPanel() {
  const { state: gs, dispatch, reducedMotion } = useGame()
  const confirm = useConfirm()
  const phone = usePhone()
  const m = useMuseum()
  const [wing, setWing] = useState<WingId | 'all'>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [queue, setQueue] = useState<Chest[] | null>(null)
  const [shopWing, setShopWing] = useState<WingId | ''>('')
  const [showPerks, setShowPerks] = useState(false)
  const owned = relicCount(m)
  const total = RELICS.length
  const done = completedWings(m)

  const byRarity = useMemo(() => {
    const g: Partial<Record<Rarity, Chest[]>> = {}
    for (const c of m.chests) (g[c.rarity] ??= []).push(c)
    return g
  }, [m.chests])

  const wings = wing === 'all' ? WINGS : WINGS.filter((w) => w.id === wing)
  const sel = selected ? RELIC_BY_ID[selected] : null

  const firstGroup = RARITIES.map((r) => ({ r, list: byRarity[r] ?? [] })).find((g) => g.list.length > 0)
  const exploreGallery = () =>
    document.querySelector('.mu-wall')?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' })
  const openAll = () => {
    void confirm({
      title: `Open all ${m.chests.length} chests?`,
      body: 'One burst opens every chest. You see the full haul on one sheet. Duplicates still dust.',
      confirmLabel: `Open ${m.chests.length}`,
      tone: m.chests.length >= 8 ? 'danger' : 'default',
    }).then((ok) => {
      if (ok) setQueue([...m.chests])
    })
  }
  const perksSecondary = {
    key: 'perks',
    label: 'Active perks',
    fact: showPerks ? 'hide' : String(owned),
    onClick: () => setShowPerks((v) => !v),
  }
  const tray: VerbTrayProps = firstGroup
    ? {
        primary: {
          label: `Open ${firstGroup.list.length > 1 ? `${firstGroup.list.length} ` : ''}${RARITY_INFO[firstGroup.r].label} chest${firstGroup.list.length === 1 ? '' : 's'}`,
          tone: 'free',
          size: 'lg',
          onClick: () => setQueue(firstGroup.list),
        },
        secondaries: [
          ...(m.chests.length > 1
            ? [
                {
                  key: 'all',
                  label: 'Open all',
                  fact: String(m.chests.length),
                  title: `Confirm before opening all ${m.chests.length} chests`,
                  onClick: openAll,
                },
              ]
            : []),
          { key: 'gallery', label: 'Explore gallery', onClick: exploreGallery },
          perksSecondary,
        ],
      }
    : {
        primary: {
          label: 'Explore the gallery',
          tone: 'free',
          size: 'lg',
          onClick: exploreGallery,
        },
        failReason: 'No chests waiting. Feats and the dust shop below fill the shelf.',
        secondaries: [perksSecondary],
      }

  return (
    <section className="ge-panel mu" aria-label="Relic Museum">
      <HubStage
        purpose={MENUS.relics.purpose}
        department={MENUS.relics.name}
        tray={tray}
        scene={
          <MuseumGallery
            m={m}
            onOpenChests={() => {
              if (m.chests.length) setQueue([...m.chests])
              else document.querySelector('.mu-chests')?.scrollIntoView({ block: 'nearest' })
            }}
            onSelect={setSelected}
          />
        }
      >
      <section className="mu-chests" aria-label="Chests" data-coach-id="museum-chests">
        <div className="mu-chests__head">
          <h3>Chests {m.chests.length > 0 ? <span className="mu-count">{m.chests.length}</span> : null}</h3>
        </div>
        {m.chests.length === 0 ? (
          <EmptyState title="No chests waiting" body="Feats and the dust shop fill the shelf." />
        ) : (
          <div className="mu-shelf">
            {RARITIES.filter((r) => byRarity[r]?.length).map((r) => (
              <motion.button
                key={r}
                type="button"
                className={`mu-chest mu-chest--${r}`}
                onClick={() => setQueue(byRarity[r]!)}
                whileHover={reducedMotion ? undefined : { y: -4, rotate: -2 }}
                whileTap={reducedMotion ? undefined : { scale: 0.94 }}
                title={`Open ${byRarity[r]!.length} ${RARITY_INFO[r].label} chest${byRarity[r]!.length === 1 ? '' : 's'}`}
              >
                <ChestArt rarity={r} size={84} />
                <span className="mu-chest__label">{RARITY_INFO[r].label}</span>
                {byRarity[r]!.length > 1 ? <span className="mu-chest__n">×{byRarity[r]!.length}</span> : null}
              </motion.button>
            ))}
          </div>
        )}

        <details className="mu-shop">
          <summary className="e2-summary">Dust shop: buy a chest with duplicates’ dust</summary>
          <div className="mu-shop__row">
            <label className="mu-shop__lean">
              <span>Lean toward</span>
              <Select
                aria-label="Dust shop wing lean"
                value={shopWing}
                onChange={(v) => setShopWing(v as WingId | '')}
                options={[
                  { value: '' as const, label: 'Any wing' },
                  ...WINGS.filter((w) => w.id !== 'oddities' && wingOpen(m, w.id)).map((w) => ({
                    value: w.id,
                    label: w.name,
                  })),
                ]}
              />
            </label>
            {(Object.entries(MUSEUM.shop) as [Rarity, number][]).map(([r, price]) => (
              <Button
                key={r}
                tone="ghost"
                size="sm"
                disabled={m.dust < price}
                title={`Odds: ${Object.entries(chestOdds(r))
                  .map(([k, v]) => `${RARITY_INFO[k as Rarity].label} ${pct(v ?? 0)}`)
                  .join(' · ')}`}
                onClick={() => museumStore.update((mm) => buyChest(mm, r, shopWing || null) != null)}
              >
                {RARITY_INFO[r].label} · {price} dust
              </Button>
            ))}
          </div>
        </details>
      </section>
      <header className="mu-hero">
        <div className="mu-hero__title">
          <p>Relics stay on this wall through every run, Rebrand and reset.</p>
        </div>
        <div className="mu-hero__stats">
          <div className="mu-stat mu-stat--wide">
            <span>Relics</span>
            <strong>
              {owned} <small>/ {total}</small>
            </strong>
            <i className="mu-bar">
              <b style={{ transform: `scaleX(${owned / total})` }} />
            </i>
          </div>
          <div className="mu-stat">
            <span>Dust</span>
            <strong className="mu-dust">{m.dust}</strong>
          </div>
          <label className="mu-stat mu-stat--select">
            <span title="New relics at or below this rarity turn straight into dust.">Auto-dust</span>
            <Select
              aria-label="Auto-dust rarity ceiling"
              value={(m.autoDust ?? '') as '' | Rarity}
              options={[
                { value: '' as const, label: 'Off' },
                ...RARITIES.map((r) => ({
                  value: r,
                  label: `${RARITY_INFO[r].label} and below`,
                })),
              ]}
              onChange={async (next) => {
                if (!next) {
                  museumStore.update((save) => setAutoDust(save, null))
                  syncMuseum(dispatch)
                  return
                }
                const rarity = next as Rarity
                const name = RARITY_INFO[rarity].label
                const ok = await confirm({
                  title: 'Auto-dust relics?',
                  body: `Dust new ${name} relics, and anything more common?`,
                  tone: 'danger',
                  confirmLabel: 'Dust them',
                })
                if (!ok) return
                museumStore.update((save) => setAutoDust(save, rarity))
                dispatch({ type: 'setAutoDust', rarityCeiling: rarity })
                syncMuseum(dispatch)
              }}
            />
          </label>
          <div className="mu-stat">
            <span>Wings done</span>
            <strong>
              {done.length} <small>/ {WINGS.length}</small>
            </strong>
          </div>
        </div>
      </header>

      {showPerks ? <PerkTotals /> : null}

      <WingSockets
        cap={socketCapFor(!!gs.projects?.done?.['pj-fifth-socket'] || gs.horizon.socketsUnlocked >= 5)}
        dispatch={dispatch}
      />

      <div className="mu-wings-seg">
        <SegmentedControl
          aria-label="Wings"
          value={wing}
          onChange={setWing}
          reducedMotion={reducedMotion}
          options={[
            { value: 'all' as const, label: 'All' },
            ...WINGS.map((w) => {
              const list = relicsInWing(w.id)
              const have = list.filter((r) => m.relics[r.id]).length
              return {
                value: w.id as WingId | 'all',
                label: w.name,
                badge: have,
                title: `${have}/${list.length}`,
              }
            }),
          ]}
        />
      </div>

      {wing === 'all' ? (
        <div className="mu-wall mu-overview" aria-label="Wings">
          {WINGS.map((w) => {
            const list = relicsInWing(w.id)
            const have = list.filter((r) => m.relics[r.id]).length
            const complete = have === list.length
            const open = wingOpen(m, w.id)
            return (
              <button
                key={w.id}
                type="button"
                className={`mu-wingcard${complete ? ' is-complete' : ''}${!open && !complete ? ' is-sealed' : ''}`}
                style={{ '--wh': w.hue } as React.CSSProperties}
                onClick={() => setWing(w.id)}
              >
                <span className="mu-wingcard__top">
                  <strong>{w.name}</strong>
                  <span className="mu-wingcard__n">
                    {have}/{list.length}
                  </span>
                </span>
                <span className="mu-wingcard__blurb">{w.blurb}</span>
                <span className="mu-wingcard__bar" aria-hidden>
                  <i style={{ width: `${(have / list.length) * 100}%` }} />
                </span>
                <span className="mu-wingcard__bonus">
                  {complete ? '✓ ' : ''}Complete: +{Math.round(w.bonus.per * 100)}% {STAT_INFO[w.bonus.stat].label}
                  {!open && !complete ? ' · sealed until you reach its era' : ''}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
      <div className="mu-wall" hidden={wing === 'all'}>
        {(wing === 'all' ? [] : wings).map((w) => {
          const list = relicsInWing(w.id)
          const have = list.filter((r) => m.relics[r.id]).length
          const complete = have === list.length
          const open = wingOpen(m, w.id)
          return (
            <section key={w.id} className={`mu-wing${complete ? ' is-complete' : ''}`} style={{ '--wh': w.hue } as React.CSSProperties}>
              <header className="mu-wing__head">
                <div>
                  <h3>{w.name}</h3>
                  <p>{w.blurb}</p>
                </div>
                <div className="mu-wing__meta">
                  <span className={complete ? 'is-done' : ''}>
                    {complete ? '✓ ' : ''}Complete: +{Math.round(w.bonus.per * 100)}% {STAT_INFO[w.bonus.stat].label}
                  </span>
                  <span>
                    {have}/{list.length}
                  </span>
                </div>
              </header>
              {!open && !complete ? <p className="mu-locked">Chests can’t reach this wing until you’ve seen its era. {w.source}</p> : null}
              <div className="mu-grid">
                {list.map((r) => {
                  const got = m.relics[r.id]
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`mu-tile mu-tile--${r.rarity}${got ? '' : ' is-unknown'}${selected === r.id ? ' is-sel' : ''}`}
                      onClick={() => setSelected(r.id)}
                      aria-label={got ? r.name : `Unknown ${RARITY_INFO[r.rarity].label} relic`}
                      title={got ? `${r.name}: ${perkText(r)}` : undefined}
                    >
                      <RelicIcon id={r.id} shadow={!got} size={64} level={m.relics[r.id]?.level ?? 0} socketed={m.sockets.includes(r.id)} />
                      <span className="mu-tile__name">{got ? r.name : m.hints[r.id] === 2 ? partialName(r.name) : '???'}</span>
                      {got && got.n > 1 ? <span className="mu-tile__n">×{got.n}</span> : null}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {phone && sel ? (
        <Sheet
          open
          onClose={() => setSelected(null)}
          title={m.relics[sel.id] ? sel.name : 'Unknown relic'}
          reducedMotion={reducedMotion}
        >
          <div className={`mu-detail mu-detail--sheet mu-detail--${sel.rarity}`} style={{ '--rc': RARITY_INFO[sel.rarity].color } as React.CSSProperties}>
            <div className="mu-detail__art">
              <RelicIcon
                id={sel.id}
                shadow={!m.relics[sel.id]}
                size={120}
                level={m.relics[sel.id]?.level ?? 0}
                socketed={m.sockets.includes(sel.id)}
              />
            </div>
            <p className="mu-detail__rarity">
              {RARITY_INFO[sel.rarity].label} · {WING_BY_ID[sel.wing].name}
            </p>
            {m.relics[sel.id] ? (
              <>
                <p className="mu-detail__flavor">{sel.flavor}</p>
                <p className="mu-perk">
                  <span>Perk</span> {perkText(sel)}
                </p>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <Button
                    tone="primary"
                    size="sm"
                    disabled={m.relics[sel.id]!.level >= 10 || m.dust < relicLevelCost(sel.rarity, m.relics[sel.id]!.level)}
                    onClick={() => {
                      const id = sel.id
                      museumStore.update((save) => levelRelic(save, id, 1))
                      syncMuseum(dispatch)
                    }}
                  >
                    Level
                  </Button>
                  {m.sockets.includes(sel.id) ? (
                    <Button
                      tone="ghost"
                      size="sm"
                      onClick={() => {
                        const id = sel.id
                        museumStore.update((save) => unsocketRelic(save, id))
                        syncMuseum(dispatch)
                      }}
                    >
                      Unsocket
                    </Button>
                  ) : (
                    <Button
                      tone="secondary"
                      size="sm"
                      disabled={m.sockets.length >= socketCapFor(!!gs.projects?.done?.['pj-fifth-socket'])}
                      onClick={() => {
                        const id = sel.id
                        const cap = socketCapFor(!!gs.projects?.done?.['pj-fifth-socket'] || gs.horizon.socketsUnlocked >= 5)
                        museumStore.update((save) => socketRelic(save, id, cap))
                        syncMuseum(dispatch)
                      }}
                    >
                      Socket
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="mu-perk is-locked">
                <span>Perk</span> Hidden until you find it, or buy a hint.
              </p>
            )}
          </div>
        </Sheet>
      ) : null}

      <AnimatePresence>
        {!phone && sel ? (
          <motion.div
            className="mu-detail-wrap"
            onClick={() => setSelected(null)}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
          >
            <motion.aside
              className={`mu-detail mu-detail--${sel.rarity}`}
              role="dialog"
              aria-label={m.relics[sel.id] ? sel.name : 'Unknown relic'}
              onClick={(e) => e.stopPropagation()}
              initial={reducedMotion ? false : { y: 30, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              style={{ '--rc': RARITY_INFO[sel.rarity].color } as React.CSSProperties}
            >
              <button type="button" className="g2-icon-btn mu-detail__x" onClick={() => setSelected(null)} aria-label="Close">
                ✕
              </button>
              <div className="mu-detail__art">
                <RelicIcon
                  id={sel.id}
                  shadow={!m.relics[sel.id]}
                  size={160}
                  level={m.relics[sel.id]?.level ?? 0}
                  socketed={m.sockets.includes(sel.id)}
                />
              </div>
              <p className="mu-detail__rarity">
                {RARITY_INFO[sel.rarity].label} · {WING_BY_ID[sel.wing].name}
              </p>
              {m.relics[sel.id] ? (
                <>
                  <h3>{sel.name}</h3>
                  <p className="mu-detail__flavor">{sel.flavor}</p>
                  <p className="mu-perk">
                    <span>Perk</span> {perkText(sel)}
                  </p>
                  <p className="mu-detail__meta">
                    Found {new Date(m.relics[sel.id]!.at).toLocaleDateString()}
                    {m.relics[sel.id]!.n > 1 ? ` · ${m.relics[sel.id]!.n} copies` : ''}
                    {` · Lv ${m.relics[sel.id]!.level} · ×${relicLevelPower(m.relics[sel.id]!.level).toFixed(2)}`}
                    {m.relics[sel.id]!.level < 10
                      ? ` · ${relicLevelCost(sel.rarity, m.relics[sel.id]!.level)} dust to next`
                      : ' · max level'}
                    {sel.feat ? ` · ${FEATS[sel.feat]?.text}` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <Button
                      tone="primary"
                      size="sm"
                      disabled={m.relics[sel.id]!.level >= 10 || m.dust < relicLevelCost(sel.rarity, m.relics[sel.id]!.level)}
                      onClick={() => {
                        const id = sel.id
                        museumStore.update((save) => levelRelic(save, id, 1))
                        syncMuseum(dispatch)
                      }}
                    >
                      Level
                    </Button>
                    <Button
                      tone="ghost"
                      size="sm"
                      onClick={() => {
                        const id = sel.id
                        museumStore.update((save) => levelRelic(save, id, 10))
                        syncMuseum(dispatch)
                      }}
                    >
                      Level what dust allows
                    </Button>
                    {m.sockets.includes(sel.id) ? (
                      <Button
                        tone="ghost"
                        size="sm"
                        onClick={() => {
                          const id = sel.id
                          museumStore.update((save) => unsocketRelic(save, id))
                          syncMuseum(dispatch)
                        }}
                      >
                        Unsocket
                      </Button>
                    ) : (
                      <Button
                        tone="secondary"
                        size="sm"
                        disabled={m.sockets.length >= socketCapFor(!!gs.projects?.done?.['pj-fifth-socket'])}
                        onClick={() => {
                          const id = sel.id
                          const cap = socketCapFor(!!gs.projects?.done?.['pj-fifth-socket'] || gs.horizon.socketsUnlocked >= 5)
                          museumStore.update((save) => socketRelic(save, id, cap))
                          syncMuseum(dispatch)
                        }}
                      >
                        Socket
                      </Button>
                    )}
                    {m.relics[sel.id]!.n > 1 ? (
                      <Button
                        tone="danger"
                        size="sm"
                        onClick={() => {
                          const id = sel.id
                          museumStore.update((save) => dustRelic(save, id))
                          syncMuseum(dispatch)
                        }}
                      >
                        Dust a copy
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <h3>{m.hints[sel.id] === 2 ? partialName(sel.name) : '???'}</h3>
                  <p className="mu-perk is-locked">
                    <span>Perk</span> {m.hints[sel.id] ? perkText(sel) : 'Hidden until you find it, or buy a hint.'}
                  </p>
                  <ul className="mu-hints">
                    <li>
                      <strong>Where:</strong> {sel.feat ? 'Not in any chest. Earned by a feat.' : WING_BY_ID[sel.wing].source}
                    </li>
                    {!sel.feat ? (
                      <li>
                        <strong>Odds:</strong> {RARITY_INFO[sel.rarity].label} relics come from{' '}
                        {RARITIES.filter((r) => (chestOdds(r)[sel.rarity] ?? 0) > 0)
                          .map((r) => RARITY_INFO[r].label)
                          .join(', ')}{' '}
                        chests.
                      </li>
                    ) : null}
                    {m.hints[sel.id] ? (
                      <li>
                        <strong>Hint:</strong>{' '}
                        {sel.feat ? FEATS[sel.feat]?.vague : `The name starts “${sel.name.split(' ')[0]}…”`}
                      </li>
                    ) : null}
                    {m.hints[sel.id] === 2 ? (
                      <li>
                        <strong>Exactly:</strong> {sel.feat ? FEATS[sel.feat]?.text : sel.flavor}
                      </li>
                    ) : null}
                  </ul>
                  {(m.hints[sel.id] ?? 0) < 2 ? (
                    <Button
                      tone="secondary"
                      size="sm"
                      disabled={m.dust < hintCost(sel, ((m.hints[sel.id] ?? 0) + 1) as 1 | 2)}
                      cost={`${hintCost(sel, ((m.hints[sel.id] ?? 0) + 1) as 1 | 2)} dust`}
                      onClick={() => museumStore.update((mm) => buyHint(mm, sel.id))}
                    >
                      {m.hints[sel.id] ? 'Bigger hint' : 'Buy a hint'}
                    </Button>
                  ) : null}
                  <p className="mu-detail__meta">Dust comes from duplicate relics. You have {m.dust}.</p>
                </>
              )}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </HubStage>

      {queue && queue.length > 0 ? (
        <ChestOpener
          chests={queue}
          bulk={queue.length > 1}
          reducedMotion={reducedMotion}
          onClose={() => {
            setQueue(null)
            syncMuseum(dispatch)
          }}
        />
      ) : null}
    </section>
  )
}

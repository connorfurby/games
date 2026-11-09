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
import { STAT_INFO, type StatId } from '../../content/upgrades/stats'
import { perkText, relicEffects } from '../../content/relicPerks'
import {
  FEATS,
  MUSEUM,
  buyChest,
  buyHint,
  chestOdds,
  completedWings,
  hintCost,
  partialName,
  relicCount,
  wingOpen,
  type Chest,
} from '../../sim/museum'
import { useGame } from '../GameContext'
import { ChestOpener } from './ChestOpener'
import { ChestArt, RelicIcon } from './RelicIcon'
import { museumStore, useMuseum } from './store'
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

export function MuseumPanel() {
  const { reducedMotion } = useGame()
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

  return (
    <section className="ge-panel mu" aria-label="Relic Museum">
      <header className="mu-hero">
        <div className="mu-hero__title">
          <h2>The Relic Museum</h2>
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
          <div className="mu-stat">
            <span>Wings done</span>
            <strong>
              {done.length} <small>/ {WINGS.length}</small>
            </strong>
          </div>
          <button type="button" className="mu-stat mu-stat--btn" onClick={() => setShowPerks((v) => !v)} aria-expanded={showPerks}>
            <span>Active perks</span>
            <strong>{owned}</strong>
            <small>{showPerks ? 'Hide' : 'See totals'}</small>
          </button>
        </div>
      </header>

      {showPerks ? <PerkTotals /> : null}

      <section className="mu-chests" aria-label="Chests">
        <div className="mu-chests__head">
          <h3>Chests {m.chests.length > 0 ? <span className="mu-count">{m.chests.length}</span> : null}</h3>
          {m.chests.length > 1 ? (
            <button type="button" className="g2-tag g2-tag--small" onClick={() => setQueue([...m.chests])}>
              <span className="g2-tag__price">Open all</span>
              <span className="g2-tag__label">{m.chests.length} chests</span>
            </button>
          ) : null}
        </div>
        {m.chests.length === 0 ? (
          <p className="mu-empty">
            No chests waiting. They come from goals, eras, rivals, Projects, milestones and time on the floor.
          </p>
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
          <summary>Dust shop: buy a chest with duplicates’ dust</summary>
          <div className="mu-shop__row">
            <label>
              Lean toward
              <select value={shopWing} onChange={(e) => setShopWing(e.target.value as WingId | '')}>
                <option value="">Any wing</option>
                {WINGS.filter((w) => w.id !== 'oddities' && wingOpen(m, w.id)).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            {(Object.entries(MUSEUM.shop) as [Rarity, number][]).map(([r, price]) => (
              <button
                key={r}
                type="button"
                className="dv-btn"
                disabled={m.dust < price}
                title={`Odds: ${Object.entries(chestOdds(r))
                  .map(([k, v]) => `${RARITY_INFO[k as Rarity].label} ${pct(v ?? 0)}`)
                  .join(' · ')}`}
                onClick={() => museumStore.update((mm) => buyChest(mm, r, shopWing || null) != null)}
              >
                {RARITY_INFO[r].label} · {price} dust
              </button>
            ))}
          </div>
        </details>
      </section>

      <nav className="mu-wings" aria-label="Wings">
        <button type="button" className={`mu-wingchip${wing === 'all' ? ' is-on' : ''}`} onClick={() => setWing('all')}>
          All wings
        </button>
        {WINGS.map((w) => {
          const list = relicsInWing(w.id)
          const have = list.filter((r) => m.relics[r.id]).length
          return (
            <button
              key={w.id}
              type="button"
              className={`mu-wingchip${wing === w.id ? ' is-on' : ''}${have === list.length ? ' is-done' : ''}`}
              style={{ '--wh': w.hue } as React.CSSProperties}
              onClick={() => setWing(w.id)}
            >
              {w.name}
              <small>
                {have}/{list.length}
              </small>
            </button>
          )
        })}
      </nav>

      <div className="mu-wall">
        {wings.map((w) => {
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
                      <RelicIcon id={r.id} shadow={!got} size={64} />
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

      <AnimatePresence>
        {sel ? (
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
                <RelicIcon id={sel.id} shadow={!m.relics[sel.id]} size={160} />
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
                    {sel.feat ? ` · ${FEATS[sel.feat]?.text}` : ''}
                  </p>
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
                    <button
                      type="button"
                      className="g2-tag"
                      disabled={m.dust < hintCost(sel, ((m.hints[sel.id] ?? 0) + 1) as 1 | 2)}
                      onClick={() => museumStore.update((mm) => buyHint(mm, sel.id))}
                    >
                      <span className="g2-tag__price">{hintCost(sel, ((m.hints[sel.id] ?? 0) + 1) as 1 | 2)} dust</span>
                      <span className="g2-tag__label">{m.hints[sel.id] ? 'Bigger hint' : 'Buy a hint'}</span>
                    </button>
                  ) : null}
                  <p className="mu-detail__meta">Dust comes from duplicate relics. You have {m.dust}.</p>
                </>
              )}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {queue && queue.length > 0 ? (
        <ChestOpener chests={queue} reducedMotion={reducedMotion} onClose={() => setQueue(null)} />
      ) : null}
    </section>
  )
}

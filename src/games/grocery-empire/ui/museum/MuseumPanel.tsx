import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { overlayRoot } from '../kit/hooks'
import {
  RARITIES,
  RARITY_INFO,
  RELICS,
  RELIC_BY_ID,
  WINGS,
  WING_BY_ID,
  relicsInWing,
  type Rarity,
  type RelicDef,
  type WingId,
} from '../../content/relics'
import { MENUS } from '../../content/menus'
import { STAT_INFO, type StatId } from '../../content/upgrades/stats'
import { perkText, relicEffects, relicSocketMul } from '../../content/relicPerks'
import {
  FEATS,
  MUSEUM,
  bestShowcase,
  buyChest,
  buyHint,
  chestOdds,
  canLightWing,
  completedWings,
  darkenWing,
  dustRelic,
  fillShowcase,
  hintCost,
  levelRelic,
  lightWing,
  litWingsOf,
  museumSync,
  partialName,
  relicCount,
  relicLevelCost,
  relicLevelPower,
  relicWorth,
  setAutoDust,
  socketCapFor,
  socketRelic,
  unsocketRelic,
  wingOpen,
  type Chest,
  type MuseumSave,
} from '../../sim/museum'
import { useGame } from '../GameContext'
import { HubStage } from '../components/HubStage'
import { Button, Select, Sheet, useConfirm, usePhone } from '../kit'
import type { VerbTrayProps } from '../play'
import { ChestOpener } from './ChestOpener'
import { MuseumGallery, mainPerk } from './MuseumGallery'
import { ChestArt, RelicIcon } from './RelicIcon'
import { museumStore, useMuseum } from './store'
import './museum.css'

type Dispatch = (cmd: { type: 'syncRelics' } & ReturnType<typeof museumSync>) => void

function syncMuseum(dispatch: Dispatch) {
  dispatch({ type: 'syncRelics', ...museumSync(museumStore.get()) })
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

/** What the wall adds to every run, by stat — levels and cases included, with the cases' share. */
function PerkTotals({ m }: { m: MuseumSave }) {
  const { state } = useGame()
  const rows = useMemo(() => {
    const levels: Record<string, number> = {}
    const owned: Record<string, number> = {}
    for (const [id, v] of Object.entries(m.relics)) {
      owned[id] = v.n
      levels[id] = v.level
    }
    const sum = (sockets: string[]) => {
      const out: Partial<Record<StatId, number>> = {}
      for (const src of relicEffects(state, owned, levels, sockets)) {
        for (const e of src.effects) out[e.stat] = (out[e.stat] ?? 0) + e.per * src.rank
      }
      return out
    }
    const withCases = sum(m.sockets)
    const without = sum([])
    return (Object.entries(withCases) as [StatId, number][])
      .map(([stat, v]) => ({ stat, v, cases: v - (without[stat] ?? 0) }))
      .sort((a, b) => b.v - a.v)
  }, [state, m])
  const [all, setAll] = useState(false)
  if (rows.length === 0) return null
  const shown = all ? rows : rows.slice(0, 6)
  return (
    <section className="mu-perks" aria-label="What your relics add">
      <h3>What your relics add to every run</h3>
      <ul>
        {shown.map(({ stat, v, cases }) => (
          <li key={stat} title={cases > 0.0005 ? `${(cases * 100).toFixed(1)}% of this comes from the showcase.` : undefined}>
            <span>{STAT_INFO[stat].label}</span>
            <strong>
              {STAT_INFO[stat].kind === 'cut' ? '−' : '+'}
              {(v * 100).toFixed(1)}%
            </strong>
            {cases > 0.0005 ? <em className="mu-perks__case">case +{(cases * 100).toFixed(1)}%</em> : null}
          </li>
        ))}
      </ul>
      {rows.length > 6 ? (
        <Button tone="ghost" size="sm" onClick={() => setAll((v) => !v)}>
          {all ? 'Show the top 6' : `Show all ${rows.length} stats`}
        </Button>
      ) : null}
    </section>
  )
}

/** Finished wings pay their bonus only while lit; only `cap` can be lit at once. */
function LitWings({ cap, dispatch }: { cap: number; dispatch: Dispatch }) {
  const m = useMuseum()
  const done = completedWings(m)
  if (done.length === 0) return null
  const lit = litWingsOf(m, cap)
  return (
    <section className="mu-sockets" aria-label="Lit wings" data-coach-id="museum-wing-sockets">
      <h3>
        Lit wings · {lit.length}/{cap}
      </h3>
      <p>A finished wing pays its bonus while it is lit. You can light {cap}; to light another, turn one off.</p>
      <ul>
        {done.map((id) => {
          const on = lit.includes(id)
          const why = on ? null : canLightWing(m, id, cap)
          const w = WING_BY_ID[id]
          return (
            <li key={id} className={on ? 'is-lit' : 'is-dark'}>
              <span>
                <strong>{w?.name ?? id}</strong>
                {w ? <small>+{Math.round(w.bonus.per * 100)}% {STAT_INFO[w.bonus.stat].label}</small> : null}
              </span>
              {on || !why ? (
                <Button
                  tone={on ? 'ghost' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    museumStore.update((save) => (on ? darkenWing(save, id, cap) : lightWing(save, id, cap)))
                    syncMuseum(dispatch)
                  }}
                >
                  {on ? 'Turn off' : 'Light it'}
                </Button>
              ) : (
                <span className="mu-sockets__why">All {cap} lit</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** One relic's card: art, perk, and the few things you can do with it. Same on phone and desktop. */
function RelicDetail({
  sel,
  m,
  cap,
  boost,
  dispatch,
  big,
}: {
  sel: RelicDef
  m: MuseumSave
  cap: number
  boost: number
  dispatch: Dispatch
  big: boolean
}) {
  const got = m.relics[sel.id]
  const inCase = m.sockets.includes(sel.id)
  const run = (fn: (save: MuseumSave) => boolean) => {
    museumStore.update(fn)
    syncMuseum(dispatch)
  }
  // When every case is full, offer to swap out the weakest one instead of a dead button.
  const weakest = [...m.sockets].sort((a, b) => relicWorth(m, a) - relicWorth(m, b))[0]
  const weakDef = weakest ? RELIC_BY_ID[weakest] : null
  const full = m.sockets.length >= cap

  return (
    <>
      <div className="mu-detail__art">
        <RelicIcon id={sel.id} shadow={!got} size={big ? 160 : 120} level={got?.level ?? 0} socketed={inCase} />
      </div>
      <p className="mu-detail__rarity">
        {RARITY_INFO[sel.rarity].label} · {WING_BY_ID[sel.wing].name}
        {inCase ? ' · in the showcase' : ''}
      </p>
      {got ? (
        <>
          {big ? <h3>{sel.name}</h3> : null}
          <p className="mu-detail__flavor">{sel.flavor}</p>
          <p className="mu-perk">
            <span>Perk</span> {perkText(sel)}
          </p>
          <p className="mu-detail__meta">
            Level {got.level} · ×{relicLevelPower(got.level).toFixed(2)}
            {got.n > 1 ? ` · ${got.n} copies` : ''}
            {inCase ? ` · now ${mainPerk(sel, got.level, boost)}` : ` · in a case: ${mainPerk(sel, got.level, boost)}`}
            {sel.feat ? ` · ${FEATS[sel.feat]?.text}` : ''}
          </p>
          <div className="mu-detail__acts">
            {inCase ? (
              <Button tone="ghost" size="sm" onClick={() => run((save) => unsocketRelic(save, sel.id))}>
                Take out of showcase
              </Button>
            ) : !full ? (
              <Button tone="primary" size="sm" onClick={() => run((save) => socketRelic(save, sel.id, cap))}>
                Put in showcase
              </Button>
            ) : weakest && weakDef && relicWorth(m, sel.id) > relicWorth(m, weakest) ? (
              <Button
                tone="primary"
                size="sm"
                onClick={() =>
                  run((save) => {
                    unsocketRelic(save, weakest)
                    return socketRelic(save, sel.id, cap)
                  })
                }
              >
                Swap in for {weakDef.name}
              </Button>
            ) : (
              <span className="mu-detail__note">Showcase full with stronger relics.</span>
            )}
            {got.level >= 10 ? (
              <span className="mu-detail__note">Max level.</span>
            ) : m.dust >= relicLevelCost(sel.rarity, got.level) ? (
              <Button
                tone="secondary"
                size="sm"
                cost={`${relicLevelCost(sel.rarity, got.level)} dust`}
                onClick={() => run((save) => levelRelic(save, sel.id, 10))}
                title="Spends dust on as many levels as it covers"
              >
                Level up
              </Button>
            ) : (
              <span className="mu-detail__note">
                Next level: {relicLevelCost(sel.rarity, got.level)} dust (you have {m.dust}).
              </span>
            )}
            {got.n > 1 ? (
              <Button tone="danger" size="sm" cost={`+${RARITY_INFO[sel.rarity].dust} dust`} onClick={() => run((save) => dustRelic(save, sel.id))}>
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
                <strong>Hint:</strong> {sel.feat ? FEATS[sel.feat]?.vague : `The name starts “${sel.name.split(' ')[0]}…”`}
              </li>
            ) : null}
            {m.hints[sel.id] === 2 ? (
              <li>
                <strong>Exactly:</strong> {sel.feat ? FEATS[sel.feat]?.text : sel.flavor}
              </li>
            ) : null}
          </ul>
          {(m.hints[sel.id] ?? 0) < 2 ? (
            m.dust >= hintCost(sel, ((m.hints[sel.id] ?? 0) + 1) as 1 | 2) ? (
              <Button
                tone="secondary"
                size="sm"
                cost={`${hintCost(sel, ((m.hints[sel.id] ?? 0) + 1) as 1 | 2)} dust`}
                onClick={() => museumStore.update((mm) => buyHint(mm, sel.id))}
              >
                {m.hints[sel.id] ? 'Bigger hint' : 'Buy a hint'}
              </Button>
            ) : (
              <p className="mu-detail__meta">
                A hint costs {hintCost(sel, ((m.hints[sel.id] ?? 0) + 1) as 1 | 2)} dust. Dust comes from duplicate relics; you
                have {m.dust}.
              </p>
            )
          ) : null}
        </>
      )}
    </>
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
  const owned = relicCount(m)
  const total = RELICS.length
  const done = completedWings(m)
  const cap = socketCapFor(!!gs.projects?.done?.['pj-fifth-socket'] || gs.horizon.socketsUnlocked >= 5)
  const boost = relicSocketMul(gs)

  const byRarity = useMemo(() => {
    const g: Partial<Record<Rarity, Chest[]>> = {}
    for (const c of m.chests) (g[c.rarity] ??= []).push(c)
    return g
  }, [m.chests])

  const sel = selected ? RELIC_BY_ID[selected] : null
  const best = bestShowcase(m, cap)
  const canFill = best.length > 0 && !(best.length === m.sockets.length && best.every((id) => m.sockets.includes(id)))
  const fill = () => {
    museumStore.update((save) => fillShowcase(save, cap))
    syncMuseum(dispatch)
  }

  const firstGroup = RARITIES.map((r) => ({ r, list: byRarity[r] ?? [] })).find((g) => g.list.length > 0)
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
            ? [{ key: 'all', label: 'Open all', fact: String(m.chests.length), onClick: openAll }]
            : []),
        ],
      }
    : {
          primary: {
            label: 'Open a chest',
            tone: 'free',
            size: 'lg',
            disabled: true,
            onClick: () => {},
          },
          failReason: 'No chests waiting. Goals, feats and the dust shop bring more.',
        }

  const wingCard = (w: (typeof WINGS)[number]) => {
    const list = relicsInWing(w.id)
    const have = list.filter((r) => m.relics[r.id]).length
    const complete = have === list.length
    const open = wingOpen(m, w.id)
    const lit = complete && litWingsOf(m, cap).includes(w.id)
    return (
      <button
        key={w.id}
        type="button"
        className={`mu-wingcard${complete ? ' is-complete' : ''}${lit ? ' is-lit' : ''}${!open && !complete ? ' is-sealed' : ''}`}
        style={{ '--wh': w.hue } as React.CSSProperties}
        onClick={() => setWing(w.id)}
        title={!open && !complete ? `Sealed: ${w.source}` : `See the ${w.name} wing`}
      >
        <span className="mu-wingcard__top">
          <strong>{w.name}</strong>
          <span className="mu-wingcard__n">
            {have}/{list.length}
          </span>
        </span>
        <span className="mu-wingcard__peek" aria-hidden>
          {list.slice(0, 6).map((r) => (
            <RelicIcon key={r.id} id={r.id} shadow={!m.relics[r.id]} size={28} level={0} />
          ))}
        </span>
        <span className="mu-wingcard__bar" aria-hidden>
          <i style={{ width: `${(have / list.length) * 100}%` }} />
        </span>
        <span className="mu-wingcard__bonus">
          {lit ? 'Lit · ' : complete ? 'Finished · ' : !open ? 'Sealed · ' : 'Finish for '}+{Math.round(w.bonus.per * 100)}%{' '}
          {STAT_INFO[w.bonus.stat].label}
        </span>
      </button>
    )
  }

  const w = wing === 'all' ? null : WING_BY_ID[wing]

  return (
    <section className="ge-panel mu" aria-label="Relic Museum">
      <HubStage
        purpose={MENUS.relics.purpose}
        department={MENUS.relics.name}
        tray={tray}
        scene={<MuseumGallery m={m} cap={cap} boost={boost} onSelect={setSelected} onFill={canFill ? fill : undefined} />}
      >
        {m.chests.length > 0 ? (
          <section className="mu-chests" aria-label="Chests" data-coach-id="museum-chests">
            <div className="mu-chests__head">
              <h3>
                Chests <span className="mu-count">{m.chests.length}</span>
              </h3>
            </div>
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
          </section>
        ) : null}

        <div className="mu-how" aria-label="How the museum works">
          <p>
            <b>1</b> Every relic you find gives a small perk to every run, forever.
          </p>
          <p>
            <b>2</b> Put your best {cap} in the showcase: they give +{Math.round((boost - 1) * 100)}% more.
          </p>
          <p>
            <b>3</b> Finish a wing for a bigger bonus. Up to {cap} finished wings can be lit at once.
          </p>
        </div>

        <PerkTotals m={m} />

        <LitWings cap={cap} dispatch={dispatch} />

        <section className="mu-wall" aria-label="Wings">
          <header className="mu-wall__head">
            {w ? (
              <Button tone="ghost" size="sm" onClick={() => setWing('all')}>
                ← All wings
              </Button>
            ) : (
              <h3>Wings</h3>
            )}
            <span className="mu-wall__count">
              {owned}/{total} relics · {done.length}/{WINGS.length} wings finished
            </span>
            <i className="mu-bar" aria-hidden>
              <b style={{ transform: `scaleX(${owned / total})` }} />
            </i>
          </header>

          {!w ? (
            <div className="mu-overview">{WINGS.map(wingCard)}</div>
          ) : (
            (() => {
              const list = relicsInWing(w.id)
              const have = list.filter((r) => m.relics[r.id]).length
              const complete = have === list.length
              const open = wingOpen(m, w.id)
              return (
                <section className={`mu-wing${complete ? ' is-complete' : ''}`} style={{ '--wh': w.hue } as React.CSSProperties}>
                  <header className="mu-wing__head">
                    <div>
                      <h3>{w.name}</h3>
                      <p>{w.blurb}</p>
                    </div>
                    <div className="mu-wing__meta">
                      <span className={complete ? 'is-done' : ''}>
                        {complete ? 'Finished: ' : 'Finish for '}+{Math.round(w.bonus.per * 100)}% {STAT_INFO[w.bonus.stat].label}
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
                          className={`mu-tile mu-tile--${r.rarity}${got ? '' : ' is-unknown'}${selected === r.id ? ' is-sel' : ''}${m.sockets.includes(r.id) ? ' is-cased' : ''}`}
                          onClick={() => setSelected(r.id)}
                          aria-label={got ? r.name : `Unknown ${RARITY_INFO[r.rarity].label} relic`}
                          title={got ? `${r.name}: ${perkText(r)}` : undefined}
                        >
                          <RelicIcon id={r.id} shadow={!got} size={64} level={got?.level ?? 0} socketed={m.sockets.includes(r.id)} />
                          <span className="mu-tile__name">{got ? r.name : m.hints[r.id] === 2 ? partialName(r.name) : '???'}</span>
                          {got && got.n > 1 ? <span className="mu-tile__n">×{got.n}</span> : null}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })()
          )}
        </section>

        <details className="mu-shop">
          <summary className="e2-summary">Dust shop · {m.dust} dust</summary>
          <p className="mu-shop__note">Duplicate relics turn into dust. Spend it on chests, hints and relic levels.</p>
          <div className="mu-shop__row">
            <label className="mu-shop__lean">
              <span>Lean toward</span>
              <Select
                aria-label="Dust shop wing lean"
                value={shopWing}
                onChange={(v) => setShopWing(v as WingId | '')}
                options={[
                  { value: '' as const, label: 'Any wing' },
                  ...WINGS.filter((x) => x.id !== 'oddities' && wingOpen(m, x.id)).map((x) => ({ value: x.id, label: x.name })),
                ]}
              />
            </label>
            {(Object.entries(MUSEUM.shop) as [Rarity, number][])
              .filter(([, price]) => m.dust >= price)
              .map(([r, price]) => (
                <Button
                  key={r}
                  tone="secondary"
                  size="sm"
                  cost={`${price} dust`}
                  title={`Odds: ${Object.entries(chestOdds(r))
                    .map(([k, v]) => `${RARITY_INFO[k as Rarity].label} ${pct(v ?? 0)}`)
                    .join(' · ')}`}
                  onClick={() => museumStore.update((mm) => buyChest(mm, r, shopWing || null) != null)}
                >
                  {RARITY_INFO[r].label} chest
                </Button>
              ))}
            {m.dust < Math.min(...Object.values(MUSEUM.shop)) ? (
              <span className="mu-shop__note">The cheapest chest costs {Math.min(...Object.values(MUSEUM.shop))} dust.</span>
            ) : null}
          </div>
          <label className="mu-shop__lean">
            <span title="New relics at or below this rarity turn straight into dust.">Auto-dust new relics</span>
            <Select
              aria-label="Auto-dust rarity ceiling"
              value={(m.autoDust ?? '') as '' | Rarity}
              options={[
                { value: '' as const, label: 'Off' },
                ...RARITIES.map((r) => ({ value: r, label: `${RARITY_INFO[r].label} and below` })),
              ]}
              onChange={async (next) => {
                if (!next) {
                  museumStore.update((save) => setAutoDust(save, null))
                  syncMuseum(dispatch)
                  return
                }
                const rarity = next as Rarity
                const ok = await confirm({
                  title: 'Auto-dust relics?',
                  body: `Dust new ${RARITY_INFO[rarity].label} relics, and anything more common?`,
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
        </details>

        {phone && sel ? (
          <Sheet open onClose={() => setSelected(null)} title={m.relics[sel.id] ? sel.name : 'Unknown relic'} reducedMotion={reducedMotion}>
            <div className={`mu-detail mu-detail--sheet mu-detail--${sel.rarity}`} style={{ '--rc': RARITY_INFO[sel.rarity].color } as React.CSSProperties}>
              <RelicDetail sel={sel} m={m} cap={cap} boost={boost} dispatch={dispatch} big={false} />
            </div>
          </Sheet>
        ) : null}

        {(() => {
          const root = overlayRoot()
          const tree = (
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
                <RelicDetail sel={sel} m={m} cap={cap} boost={boost} dispatch={dispatch} big />
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>
          )
          return root ? createPortal(tree, root) : tree
        })()}
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

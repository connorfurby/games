import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { RARITY_INFO, WING_BY_ID } from '../../content/relics'
import { openChest, type Chest, type OpenResult } from '../../sim/museum'
import { perkText } from '../../content/relicPerks'
import { ChestArt, RelicIcon } from './RelicIcon'
import { museumStore } from './store'

type Phase = 'idle' | 'burst' | 'reveal'

/** Taps needed to crack a single chest (each tap shakes harder). */
const TAPS = 3

function Sparks({ color, glow, count }: { color: string; glow: string; count: number }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        a: (i / count) * 360 + Math.random() * 14,
        d: 90 + Math.random() * 120,
        s: 4 + Math.random() * 6,
        t: 0.55 + Math.random() * 0.5,
        c: i % 3 === 0 ? glow : color,
      })),
    [color, glow, count],
  )
  return (
    <div className="co-sparks" aria-hidden>
      {sparks.map((p, i) => (
        <i
          key={i}
          style={
            {
              '--a': `${p.a}deg`,
              '--d': `${p.d}px`,
              '--s': `${p.s}px`,
              '--t': `${p.t}s`,
              background: p.c,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

function openAllChests(chests: Chest[]): OpenResult[] {
  const ids = chests.map((c) => c.id)
  const got: OpenResult[] = []
  museumStore.update((m) => {
    for (const id of ids) {
      const res = openChest(m, id)
      if (res) got.push(res)
    }
    return got.length > 0
  })
  return got
}

/**
 * Full-screen chest opening.
 * - One chest: tap ritual → burst → single relic card.
 * - Bulk (`bulk` or queue length > 1): one burst, every chest opens, then a reward sheet.
 */
export function ChestOpener({
  chests,
  reducedMotion,
  onClose,
  bulk,
}: {
  /** Queue to open, in order. */
  chests: Chest[]
  reducedMotion: boolean
  onClose: (opened: OpenResult[]) => void
  /** Force the one-animation / all-rewards path (Open all). */
  bulk?: boolean
}) {
  const isBulk = bulk || chests.length > 1
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>(isBulk ? 'burst' : 'idle')
  const [taps, setTaps] = useState(0)
  const [result, setResult] = useState<OpenResult | null>(null)
  const [opened, setOpened] = useState<OpenResult[]>([])
  const [bulkReady, setBulkReady] = useState(false)
  const chest = chests[index]

  // Bulk: crack every chest once on mount, then hold on burst → reveal.
  useEffect(() => {
    if (!isBulk) return
    const got = openAllChests(chests)
    setOpened(got)
    setBulkReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once for this queue
  }, [])

  useEffect(() => {
    if (phase !== 'burst') return
    if (isBulk && !bulkReady) return
    const t = window.setTimeout(() => setPhase('reveal'), reducedMotion ? 0 : isBulk ? 900 : 750)
    return () => window.clearTimeout(t)
  }, [phase, reducedMotion, isBulk, bulkReady])

  const crackOne = () => {
    if (!chest) return
    let res: OpenResult | null = null
    museumStore.update((m) => {
      res = openChest(m, chest.id)
      return res != null
    })
    if (!res) {
      nextOne()
      return
    }
    setResult(res)
    setOpened((o) => [...o, res!])
    setPhase('burst')
  }

  const tap = () => {
    if (isBulk || phase !== 'idle') return
    if (reducedMotion || taps + 1 >= TAPS) {
      setTaps(TAPS)
      crackOne()
    } else setTaps((t) => t + 1)
  }

  const nextOne = () => {
    if (index + 1 >= chests.length) {
      onClose(opened)
      return
    }
    setIndex((i) => i + 1)
    setPhase('idle')
    setTaps(0)
    setResult(null)
  }

  const finish = () => onClose(opened)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        finish()
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (isBulk) {
          if (phase === 'reveal') finish()
        } else if (phase === 'idle') tap()
        else if (phase === 'reveal') nextOne()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!chest && !isBulk) return null

  const lead = chest ?? chests[0]!
  const rc = RARITY_INFO[lead.rarity]
  const relic = result?.relic
  const relicRc = relic ? RARITY_INFO[relic.rarity] : rc
  const tier = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].indexOf(lead.rarity)
  const newCount = opened.filter((o) => o.isNew).length
  const dustTotal = opened.reduce((n, o) => n + (o.isNew ? 0 : o.dust), 0)

  return (
    <div
      className={`co co--${lead.rarity} co--${phase}${isBulk ? ' co--bulk' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={isBulk ? `Opening ${chests.length} chests` : `${rc.label} chest`}
      style={{ '--co-color': rc.color, '--co-glow': rc.glow, '--co-relic': relicRc.color } as React.CSSProperties}
    >
      <div className="co-backdrop" onClick={phase === 'reveal' ? (isBulk ? finish : nextOne) : undefined} />
      <div className="co-stage">
        <p className="co-kicker">
          {isBulk
            ? `${chests.length} chests`
            : `${rc.label} chest · ${lead.source}`}
        </p>

        <div className={`co-center${isBulk && phase === 'reveal' ? ' co-center--sheet' : ''}`}>
          {!reducedMotion && !(isBulk && phase === 'reveal') ? <div className="co-rays" aria-hidden /> : null}

          {isBulk ? (
            <AnimatePresence mode="wait">
              {phase !== 'reveal' ? (
                <motion.div
                  key="bulk-burst"
                  className="co-bulk-burst"
                  initial={reducedMotion ? false : { scale: 0.85, opacity: 0 }}
                  animate={{ scale: phase === 'burst' ? 1.12 : 1, opacity: 1 }}
                  exit={reducedMotion ? undefined : { scale: 1.4, opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                >
                  <ChestArt rarity={lead.rarity} open={phase === 'burst'} size={180} />
                  <p className="co-bulk-burst__n">×{chests.length}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="bulk-sheet"
                  className="co-sheet"
                  initial={reducedMotion ? false : { y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <header className="co-sheet__head">
                    <h2>Opened {opened.length}</h2>
                    <p>
                      {newCount} new
                      {dustTotal > 0 ? ` · +${dustTotal} dust from duplicates` : ''}
                    </p>
                  </header>
                  <ul className="co-sheet__grid" aria-label="Rewards">
                    {opened.map((o, i) => {
                      const info = RARITY_INFO[o.relic.rarity]
                      return (
                        <li key={`${o.chest.id}-${o.relic.id}-${i}`} className={`co-sheet__card co-sheet__card--${o.relic.rarity}`}>
                          {o.isNew ? <span className="co-new">New</span> : null}
                          <div className="co-sheet__art">
                            <RelicIcon id={o.relic.id} size={72} />
                          </div>
                          <p className="co-sheet__rarity">{info.label}</p>
                          <strong className="co-sheet__name">{o.relic.name}</strong>
                          <em className="co-sheet__wing">{WING_BY_ID[o.relic.wing].name}</em>
                          {!o.isNew ? <span className="co-sheet__dupe">+{o.dust} dust</span> : null}
                        </li>
                      )
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <AnimatePresence mode="wait">
              {phase !== 'reveal' ? (
                <motion.button
                  key={`chest-${chest!.id}`}
                  type="button"
                  className={`co-chest co-chest--shake-${taps}`}
                  onClick={tap}
                  aria-label={phase === 'idle' ? `Tap to open (${TAPS - taps} more)` : 'Opening'}
                  initial={reducedMotion ? false : { y: 40, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: phase === 'burst' ? 1.15 : 1 }}
                  exit={reducedMotion ? undefined : { scale: 1.6, opacity: 0, transition: { duration: 0.25 } }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                >
                  <ChestArt rarity={chest!.rarity} open={phase === 'burst'} size={200} />
                </motion.button>
              ) : (
                <motion.div
                  key={`relic-${relic?.id}`}
                  className={`co-card co-card--${relic?.rarity}`}
                  initial={reducedMotion ? false : { rotateY: 90, scale: 0.6, y: 30 }}
                  animate={{ rotateY: 0, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 16 }}
                >
                  {result?.isNew ? <span className="co-new">New</span> : null}
                  <div className="co-card__art">
                    <RelicIcon id={relic!.id} size={150} />
                  </div>
                  <p className="co-card__rarity">{relicRc.label}</p>
                  <h2 className="co-card__name">{relic!.name}</h2>
                  <p className="co-card__wing">{WING_BY_ID[relic!.wing].name} wing</p>
                  <p className="co-card__flavor">{relic!.flavor}</p>
                  <p className="co-card__perk">{perkText(relic!)}</p>
                  {!result?.isNew ? (
                    <p className="co-card__dupe">
                      Duplicate · +{result?.dust} dust{' '}
                      <span>(now ×{museumStore.get().relics[relic!.id]?.n ?? 2})</span>
                    </p>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {phase === 'burst' && !reducedMotion ? (
            <Sparks color={rc.color} glow={rc.glow} count={isBulk ? 28 + tier * 6 : 18 + tier * 8} />
          ) : null}
          {phase === 'reveal' && !isBulk && !reducedMotion && result?.isNew ? (
            <Sparks color={relicRc.color} glow={relicRc.glow} count={14 + tier * 4} />
          ) : null}
        </div>

        <div className="co-actions">
          {isBulk ? (
            phase === 'reveal' ? (
              <button type="button" className="co-btn" onClick={finish} autoFocus>
                Put them on the wall
              </button>
            ) : (
              <p className="co-hint">Opening…</p>
            )
          ) : phase === 'idle' ? (
            <>
              <p className="co-hint">
                {reducedMotion ? 'Tap to open' : `Tap the chest${taps > 0 ? ` — ${TAPS - taps} more` : ''}`}
              </p>
              <button type="button" className="co-btn co-btn--ghost" onClick={finish}>
                Later
              </button>
            </>
          ) : phase === 'reveal' ? (
            <button type="button" className="co-btn" onClick={nextOne} autoFocus>
              Put it on the wall
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { RARITY_INFO, WING_BY_ID } from '../../content/relics'
import { openChest, type Chest, type OpenResult } from '../../sim/museum'
import { perkText } from '../../content/relicPerks'
import { ChestArt, RelicIcon } from './RelicIcon'
import { museumStore } from './store'

type Phase = 'idle' | 'burst' | 'reveal'

/** Taps needed to crack a chest (each tap shakes harder). */
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

/**
 * Full-screen chest opening. Tap the chest (it shakes harder each time); the lid
 * bursts, light pours out in the chest's rarity color, and the relic card flips up.
 */
export function ChestOpener({
  chests,
  reducedMotion,
  onClose,
}: {
  /** Queue to open, in order. */
  chests: Chest[]
  reducedMotion: boolean
  onClose: (opened: OpenResult[]) => void
}) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [taps, setTaps] = useState(0)
  const [result, setResult] = useState<OpenResult | null>(null)
  const [opened, setOpened] = useState<OpenResult[]>([])
  const chest = chests[index]

  const crack = () => {
    if (!chest) return
    let res: OpenResult | null = null
    museumStore.update((m) => {
      res = openChest(m, chest.id)
      return res != null
    })
    if (!res) {
      next()
      return
    }
    setResult(res)
    setOpened((o) => [...o, res!])
    setPhase('burst')
  }

  useEffect(() => {
    if (phase !== 'burst') return
    const t = window.setTimeout(() => setPhase('reveal'), reducedMotion ? 0 : 750)
    return () => window.clearTimeout(t)
  }, [phase, reducedMotion])

  const tap = () => {
    if (phase !== 'idle') return
    if (reducedMotion || taps + 1 >= TAPS) {
      setTaps(TAPS)
      crack()
    } else setTaps((t) => t + 1)
  }

  const next = () => {
    if (index + 1 >= chests.length) {
      onClose(opened)
      return
    }
    setIndex((i) => i + 1)
    setPhase('idle')
    setTaps(0)
    setResult(null)
  }

  // Keyboard: Space/Enter taps or advances; Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose(opened)
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (phase === 'idle') tap()
        else if (phase === 'reveal') next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!chest) return null
  const rc = RARITY_INFO[chest.rarity]
  const relic = result?.relic
  const relicRc = relic ? RARITY_INFO[relic.rarity] : rc
  const tier = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].indexOf(chest.rarity)

  return (
    <div
      className={`co co--${chest.rarity} co--${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${rc.label} chest`}
      style={{ '--co-color': rc.color, '--co-glow': rc.glow, '--co-relic': relicRc.color } as React.CSSProperties}
    >
      <div className="co-backdrop" onClick={phase === 'reveal' ? next : undefined} />
      <div className="co-stage">
        <p className="co-kicker">
          {rc.label} chest · {chest.source}
          {chests.length > 1 ? ` · ${index + 1} of ${chests.length}` : ''}
        </p>

        <div className="co-center">
          {!reducedMotion ? <div className="co-rays" aria-hidden /> : null}
          <AnimatePresence mode="wait">
            {phase !== 'reveal' ? (
              <motion.button
                key={`chest-${chest.id}`}
                type="button"
                className={`co-chest co-chest--shake-${taps}`}
                onClick={tap}
                aria-label={phase === 'idle' ? `Tap to open (${TAPS - taps} more)` : 'Opening'}
                initial={reducedMotion ? false : { y: 40, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: phase === 'burst' ? 1.15 : 1 }}
                exit={reducedMotion ? undefined : { scale: 1.6, opacity: 0, transition: { duration: 0.25 } }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                <ChestArt rarity={chest.rarity} open={phase === 'burst'} size={200} />
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
                    Duplicate · +{result?.dust} dust <span>(now ×{(museumStore.get().relics[relic!.id]?.n ?? 2)})</span>
                  </p>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
          {phase === 'burst' && !reducedMotion ? <Sparks color={rc.color} glow={rc.glow} count={18 + tier * 8} /> : null}
          {phase === 'reveal' && !reducedMotion && result?.isNew ? (
            <Sparks color={relicRc.color} glow={relicRc.glow} count={14 + tier * 4} />
          ) : null}
        </div>

        <div className="co-actions">
          {phase === 'idle' ? (
            <>
              <p className="co-hint">{reducedMotion ? 'Tap to open' : `Tap the chest${taps > 0 ? ` — ${TAPS - taps} more` : ''}`}</p>
              <button type="button" className="co-btn co-btn--ghost" onClick={() => onClose(opened)}>
                Later
              </button>
            </>
          ) : phase === 'reveal' ? (
            <>
              <button type="button" className="co-btn" onClick={next} autoFocus>
                {index + 1 < chests.length ? `Next chest (${chests.length - index - 1} left)` : 'Put it on the wall'}
              </button>
              {index + 1 < chests.length ? (
                <button type="button" className="co-btn co-btn--ghost" onClick={() => onClose(opened)}>
                  Stop here
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

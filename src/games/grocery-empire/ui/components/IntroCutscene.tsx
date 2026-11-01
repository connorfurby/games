import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { INTRO_BEATS } from '../../content/intro'
import { Btn } from './Btn'

export function IntroCutscene({
  reducedMotion,
  onBeat,
  onFinish,
}: {
  reducedMotion: boolean
  /** Called when the player leaves a beat (Next or Skip-from-this-beat). Index is the beat just shown. */
  onBeat?: (index: number) => void
  onFinish: () => void
}) {
  const [i, setI] = useState(0)
  const beat = INTRO_BEATS[i] ?? INTRO_BEATS[INTRO_BEATS.length - 1]!
  const last = i >= INTRO_BEATS.length - 1

  const advance = (finish: boolean) => {
    onBeat?.(i)
    if (finish || last) onFinish()
    else setI((n) => n + 1)
  }

  return (
    <div className="ge-intro" role="dialog" aria-labelledby="ge-intro-title">
      <div className="ge-intro__stage" aria-hidden>
        <div className="ge-intro__skyline" />
        <div className="ge-intro__counter" />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={beat.title}
          className="ge-intro__card"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: reducedMotion ? 0 : 0.28, ease: 'easeOut' }}
        >
          <p className="ge-intro__kicker">{beat.kicker}</p>
          <h2 id="ge-intro-title">{beat.title}</h2>
          <p className="ge-intro__body">{beat.body}</p>
          {beat.ledger ? (
            <p className="ge-intro__whisper" aria-hidden>
              “{beat.ledger}”
            </p>
          ) : null}
          <div className="ge-intro__dots" aria-hidden>
            {INTRO_BEATS.map((_, d) => (
              <span key={d} className={`ge-intro__dot${d === i ? ' is-on' : ''}`.trim()} />
            ))}
          </div>
          <div className="ge-intro__actions">
            <Btn tone="ghost" onClick={() => advance(true)}>
              Skip intro
            </Btn>
            <Btn tone="primary" onClick={() => advance(false)}>
              {last ? 'Open the counter' : 'Next'}
            </Btn>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

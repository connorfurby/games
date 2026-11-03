import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { plateSrc } from '../../art/cast'
import { INTRO_BEATS } from '../../content/intro'
import { Btn } from './Btn'
import { SpeakerChrome } from './SpeakerChrome'

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
  const [typed, setTyped] = useState('')
  const beat = INTRO_BEATS[i] ?? INTRO_BEATS[INTRO_BEATS.length - 1]!
  const last = i >= INTRO_BEATS.length - 1
  const plate = plateSrc(beat.plate) ?? plateSrc('counter')

  useEffect(() => {
    setTyped('')
    if (reducedMotion) {
      setTyped(beat.body)
      return
    }
    let n = 0
    const full = beat.body
    const id = window.setInterval(() => {
      n += 1
      setTyped(full.slice(0, n))
      if (n >= full.length) window.clearInterval(id)
    }, 16)
    return () => window.clearInterval(id)
  }, [beat.body, i, reducedMotion])

  const advance = (finish: boolean) => {
    onBeat?.(i)
    if (finish || last) onFinish()
    else setI((n) => n + 1)
  }

  return (
    <div className="ge-intro" role="dialog" aria-labelledby="ge-intro-title">
      <div
        className="ge-intro__plate"
        style={{ backgroundImage: plate ? `url(${plate})` : undefined }}
        aria-hidden
      />
      <div className="ge-intro__veil" aria-hidden />
      <AnimatePresence mode="wait">
        <motion.div
          key={beat.title}
          className="ge-intro__card"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: reducedMotion ? 0 : 0.28, ease: 'easeOut' }}
        >
          <SpeakerChrome speaker={beat.speaker} size={64} />
          <p className="ge-intro__kicker">{beat.kicker}</p>
          <h2 id="ge-intro-title">{beat.title}</h2>
          <p className="ge-intro__body">
            {typed}
            {!reducedMotion && typed.length < beat.body.length ? (
              <span className="ge-intro__caret" aria-hidden>
                |
              </span>
            ) : null}
          </p>
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

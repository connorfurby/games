import { motion } from 'motion/react'
import { DIALOGUE_BY_ID, dialogueSpeaker } from '../../content/dialogue'
import { Btn } from './Btn'
import { SpeakerChrome } from './SpeakerChrome'

/** Bottom speaker strip — never covers Floor; waits under coach / receipt / chapter. */
export function DialogueStrip({
  lineId,
  reducedMotion,
  onNext,
  onSkip,
}: {
  lineId: string
  reducedMotion: boolean
  onNext: () => void
  onSkip: () => void
}) {
  const def = DIALOGUE_BY_ID[lineId]
  const text = def?.text ?? '…'
  const speaker = dialogueSpeaker(lineId)

  return (
    <motion.div
      className="ge-dialogue"
      role="dialog"
      aria-live="polite"
      aria-label="Story dialogue"
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: 8 }}
      transition={{ duration: reducedMotion ? 0 : 0.22 }}
    >
      <SpeakerChrome speaker={speaker} size={40} className="ge-dialogue__speaker" />
      <div className="ge-dialogue__copy">
        <span className="ge-dialogue__label">Story</span>
        <p className="ge-dialogue__text">{text}</p>
      </div>
      <div className="ge-dialogue__actions">
        <Btn tone="ghost" onClick={onSkip}>
          Skip
        </Btn>
        <Btn tone="primary" onClick={onNext}>
          Next
        </Btn>
      </div>
    </motion.div>
  )
}

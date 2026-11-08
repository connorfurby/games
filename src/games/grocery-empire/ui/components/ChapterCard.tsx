import { motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { plateSrc, type PlateId, type SpeakerId } from '../../art/cast'
import { CHAPTERS } from '../chapters'
import { Btn } from './Btn'
import { SpeakerChrome } from './SpeakerChrome'

const FALLBACK = {
  title: 'Chapter',
  body: 'A new chapter opens. Keep unpacking.',
  epigraph: 'The shelf remembers.',
  lines: ['A new chapter opens', 'Keep unpacking', 'Check the guide when stuck'] as [
    string,
    string,
    string,
  ],
  speaker: 'operations' as SpeakerId,
  plate: 'corner' as PlateId,
  beats: [
    { speaker: 'operations' as SpeakerId, body: 'A new chapter opens. Keep unpacking.' },
  ],
}

export function ChapterCard({
  era,
  reducedMotion,
  onAccept,
}: {
  era: number
  reducedMotion: boolean
  onAccept: () => void
}) {
  const def = CHAPTERS[era] ?? { ...FALLBACK, title: `Era ${era}` }
  const beats = def.beats.length > 0 ? def.beats : [{ speaker: def.speaker, body: def.body }]
  const [beatIdx, setBeatIdx] = useState(0)
  const beat = beats[Math.min(beatIdx, beats.length - 1)]!
  const last = beatIdx >= beats.length - 1
  const plate = plateSrc(def.plate)

  const next = () => {
    if (last) onAccept()
    else setBeatIdx((n) => n + 1)
  }

  return (
    <div className="ge-chapter" role="dialog" aria-labelledby="ge-chapter-title">
      <div
        className="ge-chapter__plate"
        style={{ backgroundImage: plate ? `url(${plate})` : undefined }}
        aria-hidden
      />
      <div className="ge-chapter__haze" aria-hidden />
      <motion.div
        className="ge-chapter__card"
        initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 380, damping: 28, mass: 0.85 }
        }
      >
        <SpeakerChrome speaker={beat.speaker} size={56} />
        <p className="ge-chapter__era">
          Chapter {era} · {beatIdx + 1}/{beats.length}
        </p>
        <h2 id="ge-chapter-title">{beat.title ?? def.title}</h2>
        {beatIdx === 0 ? <p className="ge-chapter__epigraph">“{def.epigraph}”</p> : null}
        <p className="ge-chapter__body">{beat.body}</p>
        {last ? (
          <>
            <ul className="ge-chapter__recap">
              {def.lines.slice(0, 3).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="ge-chapter__guide">
              <Link to="/guide/grocery-empire">Open strategy guide</Link>
            </p>
          </>
        ) : null}
        <div className="ge-chip-row">
          <Btn tone="ghost" onClick={onAccept}>
            Skip chapter
          </Btn>
          <Btn tone="primary" onClick={next}>
            {last ? 'Continue the story' : 'Next'}
          </Btn>
        </div>
      </motion.div>
    </div>
  )
}

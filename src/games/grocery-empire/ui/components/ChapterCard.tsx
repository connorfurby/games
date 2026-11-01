import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { CHAPTERS } from '../chapters'
import { Btn } from './Btn'

export function ChapterCard({
  era,
  reducedMotion,
  onAccept,
}: {
  era: number
  reducedMotion: boolean
  onAccept: () => void
}) {
  const def = CHAPTERS[era] ?? {
    title: `Era ${era}`,
    body: 'A new chapter opens. Keep unpacking.',
    epigraph: 'The shelf remembers.',
    recap: ['A new chapter opens', 'Keep unpacking', 'Check the guide when stuck'] as [
      string,
      string,
      string,
    ],
  }
  return (
    <div className="ge-chapter" role="dialog" aria-labelledby="ge-chapter-title">
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
        <p className="ge-chapter__era">Chapter {era}</p>
        <h2 id="ge-chapter-title">{def.title}</h2>
        <p className="ge-chapter__epigraph">“{def.epigraph}”</p>
        <p className="ge-chapter__body">{def.body}</p>
        <ul className="ge-chapter__recap">
          {def.recap.slice(0, 3).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="ge-chapter__guide">
          <Link to="/guide/grocery-empire">Open strategy guide</Link>
        </p>
        <Btn tone="primary" onClick={onAccept}>
          Continue the story
        </Btn>
      </motion.div>
    </div>
  )
}

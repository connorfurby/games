import { useEffect, useState } from 'react'
import { CHAPTER_BY_ERA } from '../../content/story'
import { getSignalEngine } from '../../sim/engine'
import { Portrait } from '../scenes/Portrait'
import { Button } from '../kit/Button'
import { useGame } from '../GameContext'
import './chapter.css'

/** Era chapter. One card, two beats, then the three-line mission. Hides the coach while it is up. */
export function ChapterCard() {
  const { state: s, dispatch, reducedMotion } = useGame()
  const chapter = CHAPTER_BY_ERA[s.era]
  const open = !!chapter && s.chapterSeen < s.era

  useEffect(() => {
    if (!open) return
    const eng = getSignalEngine()
    eng.setSoftPauseMul(0)
    return () => eng.setSoftPauseMul(1)
  }, [open])

  if (!open || !chapter) return null

  return (
    <ChapterBody
      key={chapter.era}
      chapter={chapter}
      reducedMotion={reducedMotion}
      onAccept={() => dispatch({ type: 'acceptChapter' })}
    />
  )
}

function ChapterBody({
  chapter,
  reducedMotion,
  onAccept,
}: {
  chapter: (typeof CHAPTER_BY_ERA)[number]
  reducedMotion: boolean
  onAccept: () => void
}) {
  const [beat, setBeat] = useState(0)
  const beats = chapter.beats
  const current = beats[Math.min(beat, beats.length - 1)]!
  const last = beat >= beats.length - 1

  return (
    <div className="sd-chapter" role="dialog" aria-labelledby="sd-chapter-title">
      <div className={`sd-chapter__card${reducedMotion ? '' : ' is-in'}`}>
        <Portrait id={current.speaker} name={current.name} size={56} />
        <p className="sd-chapter__kicker">
          Chapter {chapter.era} · {chapter.title} · {beat + 1}/{beats.length}
        </p>
        <h2 id="sd-chapter-title">{chapter.title}</h2>
        {beat === 0 ? <p className="sd-chapter__epi">“{chapter.epigraph}”</p> : null}
        <p className="sd-chapter__body">{current.body}</p>
        {last ? (
          <ul className="sd-chapter__mission">
            {chapter.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        <div className="sd-chapter__acts">
          <Button tone="ghost" onClick={onAccept}>
            Skip chapter
          </Button>
          <Button tone="free" onClick={() => (last ? onAccept() : setBeat((n) => n + 1))}>
            {last ? 'Start the night' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { OPENING_TOUR, TOURS, nextTour, type CoachStep, type Tour } from '../../content/tutorials'
import { getSignalEngine } from '../../sim/engine'
import { Button } from '../kit/Button'
import { useGame } from '../GameContext'
import './coach.css'

function stepDone(step: CoachStep, s: ReturnType<typeof useGame>['state'], introSeen: boolean): boolean {
  switch (step.done) {
    case 'intro':
      return introSeen
    case 'tuned':
      return s.air.tuned
    case 'held':
      return s.air.lastHoldAt > 0 || s.air.logFill > 0.05
    case 'logged':
      return s.depth.cleanLogsLifetime >= 1
    case 'aired':
      return s.air.lastBurstAt > 0 || (s.depth.cleanLogsLifetime >= 1 && s.cash > 12)
    case 'crystal':
      return (s.upgrades['crystal-gain'] ?? 0) >= 1
    case 'antenna':
      return s.antenna >= 1
    default:
      return false
  }
}

function OpeningCoach({ onDone }: { onDone: () => void }) {
  const { state: s, tick, dispatch, setActiveMenu, reducedMotion } = useGame()
  const [idx, setIdx] = useState(0)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('sd-coach-done') === '1' || s.introSeen
    } catch {
      return s.introSeen
    }
  })

  const step = OPENING_TOUR[idx] ?? null
  const finished = dismissed || idx >= OPENING_TOUR.length

  useEffect(() => {
    if (finished) onDone()
  }, [finished, onDone])

  useEffect(() => {
    if (!step?.menu || finished) return
    setActiveMenu(step.menu)
  }, [step?.menu, setActiveMenu, finished])

  // Soft-pause only slightly — never freeze the board under a black veil.
  useEffect(() => {
    const eng = getSignalEngine()
    if (finished || !step) {
      eng.setSoftPauseMul(1)
      return
    }
    eng.setSoftPauseMul(step.kind === 'act' ? 0.35 : 1)
    return () => eng.setSoftPauseMul(1)
  }, [step, finished])

  useEffect(() => {
    if (!step || finished) return
    if (step.kind === 'act' && stepDone(step, s, s.introSeen)) {
      setIdx((i) => i + 1)
    }
  }, [s, step, finished])

  const spotlight = useMemo(() => {
    if (!step?.target || finished || reducedMotion) return null
    const el = document.querySelector(`[data-coach-id="${step.target}"]`) as HTMLElement | null
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, left: r.left, width: r.width, height: r.height }
  }, [step, finished, tick, idx, reducedMotion])

  if (finished || !step) return null

  const finishTour = () => {
    setDismissed(true)
    try {
      localStorage.setItem('sd-coach-done', '1')
    } catch {
      /* ignore */
    }
    if (!s.introSeen) dispatch({ type: 'markIntro' })
    getSignalEngine().setSoftPauseMul(1)
  }

  return (
    <div className="sd-coach-layer" aria-live="polite">
      {spotlight ? (
        <div
          className="sd-coach-spot"
          style={{
            top: spotlight.top - 6,
            left: spotlight.left - 6,
            width: spotlight.width + 12,
            height: spotlight.height + 12,
          }}
        />
      ) : null}
      <div className="sd-coach-card" role="dialog" aria-label={step.title}>
        <strong>{step.title}</strong>
        <p>{step.body}</p>
        <div className="sd-coach-acts">
          {step.id === 'open-shack' ? (
            <Button
              tone="primary"
              size="sm"
              onClick={() => {
                dispatch({ type: 'markIntro' })
                setIdx((i) => i + 1)
              }}
            >
              Open the shack
            </Button>
          ) : null}
          {step.kind === 'say' ? (
            <Button
              tone="primary"
              size="sm"
              onClick={() => {
                if (idx + 1 >= OPENING_TOUR.length) finishTour()
                else setIdx((i) => i + 1)
              }}
            >
              Got it
            </Button>
          ) : step.id !== 'open-shack' ? (
            <span className="sd-coach-wait">Do the highlighted action</span>
          ) : null}
          <Button tone="ghost" size="sm" onClick={finishTour}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  )
}

const TOURS_KEY = 'sd-tours-done'

function readDone(): string[] {
  try {
    const raw = localStorage.getItem(TOURS_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string' && x in TOURS) : []
  } catch {
    return []
  }
}

function writeDone(ids: string[]) {
  try {
    localStorage.setItem(TOURS_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

/** After the opening: offer the next era-relevant tour, one at a time. Never blocks play. */
function TourCoach() {
  const { state: s } = useGame()
  const [done, setDone] = useState<string[]>(readDone)
  const [running, setRunning] = useState<Tour | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [snoozeUntil, setSnoozeUntil] = useState(0)
  const { setActiveMenu } = useGame()

  const offer = useMemo(() => nextTour(s.era, done), [s.era, done])
  const step = running?.steps[stepIdx] ?? null

  useEffect(() => {
    if (step?.menu) setActiveMenu(step.menu)
  }, [step?.menu, setActiveMenu])

  const mark = (id: string) => {
    setDone((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      writeDone(next)
      return next
    })
  }

  const finish = (tour: Tour) => {
    mark(tour.id)
    setRunning(null)
    setStepIdx(0)
    // Breathe between tours: five game-minutes.
    setSnoozeUntil(s.time + 300)
  }

  if (running && step) {
    const last = stepIdx + 1 >= running.steps.length
    return (
      <div className="sd-coach-layer" aria-live="polite">
        <div className="sd-coach-card" role="dialog" aria-label={step.title}>
          <strong>
            {running.title} · {stepIdx + 1}/{running.steps.length}
          </strong>
          <p>
            <em>{step.title}.</em> {step.body}
          </p>
          <div className="sd-coach-acts">
            <Button
              tone="primary"
              size="sm"
              onClick={() => (last ? finish(running) : setStepIdx((i) => i + 1))}
            >
              {last ? 'Done' : 'Next'}
            </Button>
            <Button tone="ghost" size="sm" onClick={() => finish(running)}>
              Skip
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!offer || s.time < snoozeUntil || s.paused) return null

  return (
    <div className="sd-coach-layer" aria-live="polite">
      <div className="sd-coach-card" role="dialog" aria-label="Tour offer">
        <strong>{offer.title}</strong>
        <p>A short tour for Era {offer.era}. {offer.steps.length} steps, no pressure.</p>
        <div className="sd-coach-acts">
          <Button
            tone="primary"
            size="sm"
            onClick={() => {
              setRunning(offer)
              setStepIdx(0)
            }}
          >
            Show me
          </Button>
          <Button tone="ghost" size="sm" onClick={() => setSnoozeUntil(s.time + 600)}>
            Later
          </Button>
          <Button tone="ghost" size="sm" onClick={() => mark(offer.id)}>
            Skip tour
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Coach() {
  const { state: s } = useGame()
  const [openingDone, setOpeningDone] = useState(() => {
    try {
      return localStorage.getItem('sd-coach-done') === '1' || s.introSeen
    } catch {
      return s.introSeen
    }
  })
  if (s.chapterSeen < s.era) return null
  if (!openingDone) return <OpeningCoach onDone={() => setOpeningDone(true)} />
  return <TourCoach />
}

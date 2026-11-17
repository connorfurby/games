import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TUTORIAL_BY_ID } from '../../content/tutorials'
import { isTutorialStepDone } from '../../sim/helpers'
import type { TutorialRun } from '../../sim/state'
import { menuForCoachId, menuForNavCoachId, needsInbox } from '../coachTargets'
import { requestInbox } from '../shell/uiBus'
import type { MenuId } from '../../content/menus'
import { useGame } from '../GameContext'
import { Btn } from './Btn'
import { SpeakerChrome } from './SpeakerChrome'
import { coachCardPlacement, type CoachHole } from './coachPlacement'

const CARD_W_FALLBACK = 360
const CARD_H_FALLBACK = 220

export function CoachOverlay({ active }: { active: TutorialRun }) {
  const { state, dispatch, setActiveMenu, activeMenu, reducedMotion, tick } = useGame()
  const tut = TUTORIAL_BY_ID[active.id]
  const step = tut?.steps[active.step]
  const present = step?.present ?? 'act'
  type Spot = { top: number; left: number; width: number; height: number }
  const [rect, setRect] = useState<Spot | null>(null)
  const [missingTarget, setMissingTarget] = useState(false)
  const [cardBox, setCardBox] = useState<{ top: number; left: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const scrolledForStep = useRef<string | null>(null)

  // Soft-navigate to the panel that hosts the spotlight target.
  useEffect(() => {
    if (!step?.coachId) return
    const menu = menuForCoachId(step.coachId)
    if (menu && activeMenu !== menu) setActiveMenu(menu)
    const nav = menuForNavCoachId(step.coachId, activeMenu as MenuId, (id) => !!state.menus[id])
    if (nav) setActiveMenu(nav)
  }, [step?.coachId, active.step, active.id, activeMenu, setActiveMenu, state.menus])

  // Memos / Attention / Ideas controls live in the Memos drawer — open it first.
  useEffect(() => {
    if (step?.coachId && needsInbox(step.coachId)) requestInbox('memos')
  }, [step?.coachId, active.step, active.id])

  // Spotlight: one scrollIntoView per step, then rAF-track the live rect (sheets animate in).
  useEffect(() => {
    if (!step?.coachId) {
      setRect(null)
      setMissingTarget(false)
      return
    }

    let cancelled = false
    let tries = 0
    let raf = 0
    const stepKey = `${active.id}:${active.step}:${step.coachId}:${step.followCoachId ?? ''}`

    const pickEl = (): Element | null => {
      if (step.followCoachId) {
        const follow = document.querySelector(`[data-coach-id="${CSS.escape(step.followCoachId)}"]`)
        if (follow) return follow
      }
      return document.querySelector(`[data-coach-id="${CSS.escape(step.coachId)}"]`)
    }

    const readSpot = (el: Element): Spot => {
      const r = el.getBoundingClientRect()
      return { top: r.top, left: r.left, width: r.width, height: r.height }
    }

    const applySpot = (next: Spot) => {
      setRect((prev) => {
        if (
          prev &&
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.left - next.left) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5
        ) {
          return prev
        }
        return next
      })
    }

    const tickSpot = () => {
      if (cancelled) return
      const el = pickEl()
      if (!el) {
        setMissingTarget(true)
        if (tries < 40) {
          tries += 1
        } else if (import.meta.env.DEV && tries === 40) {
          console.warn(`[coach] missing data-coach-id="${step.followCoachId ?? step.coachId}"`)
          tries += 1
        }
      } else {
        setMissingTarget(false)
        applySpot(readSpot(el))
        if (scrolledForStep.current !== stepKey) {
          scrolledForStep.current = stepKey
          if (!reducedMotion) {
            el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
          }
        }
      }
      raf = window.requestAnimationFrame(tickSpot)
    }

    raf = window.requestAnimationFrame(tickSpot)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
    }
  }, [step?.coachId, step?.followCoachId, active.step, active.id, reducedMotion, activeMenu])

  // Advance as soon as the step's condition is true. Depend on engine paint via tick.
  useEffect(() => {
    if (!step) return
    if (step.doneWhen.kind === 'always') return
    if (!isTutorialStepDone(state, step, active.baseline)) return
    dispatch({ type: 'completeTutorialStep', id: active.id, step: active.step })
  }, [tick, state, step, active.baseline, active.step, active.id, dispatch])

  // Dock the card off the hole so it never covers the VerbTray control.
  useLayoutEffect(() => {
    if (!rect) {
      setCardBox(null)
      return
    }
    const hole: CoachHole = {
      top: Math.max(0, rect.top - 8),
      left: Math.max(0, rect.left - 8),
      width: Math.max(0, rect.width + 16),
      height: Math.max(0, rect.height + 16),
    }
    const cardW = cardRef.current?.offsetWidth || Math.min(CARD_W_FALLBACK, window.innerWidth * 0.94)
    const cardH = cardRef.current?.offsetHeight || CARD_H_FALLBACK
    const box = coachCardPlacement(hole, window.innerHeight, window.innerWidth, cardW, cardH)
    setCardBox({ top: box.top, left: box.left })
  }, [rect, step?.id, present])

  const onSkip = () => dispatch({ type: 'skipTutorial' })
  const onNext = () => dispatch({ type: 'completeTutorialStep', id: active.id, step: active.step })
  const onDoForMe = () => {
    const action = step?.action
    if (action?.type === 'openMenu' && typeof action.params?.menu === 'string') {
      setActiveMenu(String(action.params.menu))
    }
    dispatch({ type: 'doTutorialForMe' })
  }

  if (!tut || !step) {
    return (
      <div className="ge-coach" aria-live="polite">
        <div className="ge-coach__card" style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)' }}>
          <p>Tour “{active.id}” has no steps yet.</p>
          <Btn tone="primary" onClick={onSkip}>
            Skip tour
          </Btn>
        </div>
      </div>
    )
  }

  const pad = 8
  const hole = rect
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: Math.max(0, rect.width + pad * 2),
        height: Math.max(0, rect.height + pad * 2),
      }
    : null

  // The card takes whichever side of the highlight has more room, so it never sits on
  // the control it is pointing at.
  const viewH = typeof window === 'undefined' ? 800 : window.innerHeight
  const cardOnTop = !!hole && hole.top > viewH - (hole.top + hole.height)

  const showDoForMe = !!step.action
  const stuck = missingTarget && !hole
  const look = present === 'look'
  const nextLabel =
    step.doneWhen.kind === 'always' || !step.action || look
      ? 'Got it'
      : active.step + 1 >= tut.steps.length
        ? 'Finish'
        : 'Next'

  const cardStyle = cardBox
    ? ({ position: 'fixed', top: cardBox.top, left: cardBox.left, marginBottom: 0 } as const)
    : ({ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', marginBottom: 0 } as const)

  return (
    <div
      className={`ge-coach${reducedMotion ? ' ge-coach--reduced' : ''}${look ? ' ge-coach--look' : ''}${cardOnTop ? ' ge-coach--top' : ''}`}
      aria-live="polite"
    >
      {/* act steps: veils leave a click-through hole. look / missing: no block. */}
      {hole && !look ? (
        <>
          <div className="ge-coach__veil ge-coach__veil--top" style={{ height: Math.max(0, hole.top) }} />
          <div
            className="ge-coach__veil ge-coach__veil--left"
            style={{ top: hole.top, height: hole.height, width: Math.max(0, hole.left) }}
          />
          <div
            className="ge-coach__veil ge-coach__veil--right"
            style={{
              top: hole.top,
              height: hole.height,
              left: hole.left + hole.width,
            }}
          />
          <div
            className="ge-coach__veil ge-coach__veil--bottom"
            style={{ top: hole.top + hole.height }}
          />
        </>
      ) : null}
      {hole ? (
        <div
          className="ge-coach__hole"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
        />
      ) : null}
      <div className="ge-coach__card" ref={cardRef} style={cardStyle}>
        <SpeakerChrome speaker="operations" size={48} className="ge-coach__speaker" />
        <div className="ge-coach__kicker">
          Operations · {tut.name}
          {tut.steps.length > 1 ? ` · ${active.step + 1}/${tut.steps.length}` : ''}
        </div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <p className="ge-coach__recovery">{step.recovery}</p>
        {stuck ? (
          <p className="ge-coach__recovery">
            You can&apos;t see that part right now. Tap {showDoForMe ? 'Do it for me' : nextLabel}, or skip the tour.
          </p>
        ) : look ? (
          <p className="ge-coach__recovery">Keep playing, and tap Got it when you&apos;ve seen it.</p>
        ) : (
          <p className="ge-coach__recovery">Tap the glowing part, or use the buttons below.</p>
        )}
        <div className="ge-coach__actions">
          <Btn tone="ghost" onClick={onSkip}>
            Skip tour
          </Btn>
          {stuck && showDoForMe ? (
            <Btn tone="primary" onClick={onDoForMe}>
              Do it for me
            </Btn>
          ) : null}
          <Btn
            tone={stuck && !showDoForMe ? 'primary' : showDoForMe && !stuck ? 'ghost' : 'primary'}
            onClick={onNext}
          >
            {nextLabel}
          </Btn>
          {showDoForMe && !stuck ? (
            <Btn tone="primary" onClick={onDoForMe}>
              Do it for me
            </Btn>
          ) : null}
        </div>
      </div>
    </div>
  )
}

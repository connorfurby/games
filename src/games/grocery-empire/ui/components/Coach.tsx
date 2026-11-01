import { useEffect, useState } from 'react'
import { TUTORIAL_BY_ID } from '../../content/tutorials'
import { isTutorialStepDone } from '../../sim/helpers'
import type { TutorialRun } from '../../sim/state'
import { menuForCoachId } from '../coachTargets'
import { useGame } from '../GameContext'
import { Btn } from './Btn'

export function CoachOverlay({ active }: { active: TutorialRun }) {
  const { state, dispatch, setActiveMenu, activeMenu, reducedMotion } = useGame()
  const tut = TUTORIAL_BY_ID[active.id]
  const step = tut?.steps[active.step]
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [missingTarget, setMissingTarget] = useState(false)

  // Soft-navigate to the panel that hosts the spotlight target.
  useEffect(() => {
    if (!step?.coachId) return
    const menu = menuForCoachId(step.coachId)
    if (menu && activeMenu !== menu) setActiveMenu(menu)
  }, [step?.coachId, active.step, active.id, activeMenu, setActiveMenu])

  // Spotlight cutout from getBoundingClientRect; track resize/scroll.
  useEffect(() => {
    if (!step?.coachId) {
      setRect(null)
      setMissingTarget(false)
      return
    }

    let cancelled = false
    let tries = 0

    const measure = () => {
      if (cancelled) return
      const el = document.querySelector(`[data-coach-id="${CSS.escape(step.coachId)}"]`)
      if (!(el instanceof HTMLElement)) {
        setRect(null)
        setMissingTarget(true)
        if (tries < 8) {
          tries += 1
          window.setTimeout(measure, 50)
        } else if (import.meta.env.DEV) {
          console.warn(`[coach] missing data-coach-id="${step.coachId}"`)
        }
        return
      }
      setMissingTarget(false)
      setRect(el.getBoundingClientRect())
      if (!reducedMotion && tries === 0) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelled = true
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step?.coachId, active.step, active.id, reducedMotion, activeMenu])

  // Guided action: advance when doneWhen is satisfied vs baselines (or menu opened in UI).
  useEffect(() => {
    if (!step) return
    if (step.doneWhen.kind === 'always') return

    // Menu steps: require the player (or Do-it-for-me) to open the tab — not mere unlock.
    if (step.doneWhen.kind === 'menu') {
      if (step.doneWhen.key && activeMenu === step.doneWhen.key) {
        dispatch({ type: 'completeTutorialStep' })
      }
      return
    }

    if (isTutorialStepDone(state, step, active.baseline)) {
      dispatch({ type: 'completeTutorialStep' })
    }
  }, [state, step, active.baseline, active.step, active.id, activeMenu, dispatch])

  const onSkip = () => dispatch({ type: 'skipTutorial' })
  const onNext = () => dispatch({ type: 'completeTutorialStep' })
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
        <div className="ge-coach__dim" />
        <div className="ge-coach__card">
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

  const showDoForMe = !!step.action
  const nextLabel =
    step.doneWhen.kind === 'always' || !step.action
      ? 'Got it'
      : active.step + 1 >= tut.steps.length
        ? 'Finish'
        : 'Next'

  return (
    <div
      className={`ge-coach ${reducedMotion ? 'ge-coach--reduced' : ''}`.trim()}
      aria-live="polite"
    >
      {/* Dim blocks stray clicks outside the spotlight hole so the tour feels intentional. */}
      {!hole ? <div className="ge-coach__dim ge-coach__dim--block" /> : null}
      {hole ? (
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
          <div
            className="ge-coach__hole"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
            }}
          />
        </>
      ) : null}
      <div className="ge-coach__card">
        <div className="ge-coach__kicker">
          Coach · {tut.name}
          {tut.steps.length > 1 ? ` · ${active.step + 1}/${tut.steps.length}` : ''}
        </div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <p className="ge-coach__recovery">{step.recovery}</p>
        {missingTarget ? (
          <p className="ge-coach__recovery">
            Target control is not on screen yet — use Next, Skip, or Do it for me.
          </p>
        ) : (
          <p className="ge-coach__recovery">
            Click the highlighted control, or use Next / Do it for me below.
          </p>
        )}
        <div className="ge-coach__actions">
          <Btn tone="ghost" onClick={onSkip}>
            Skip tour
          </Btn>
          <Btn tone={showDoForMe ? 'ghost' : 'primary'} onClick={onNext}>
            {nextLabel}
          </Btn>
          {showDoForMe ? (
            <Btn tone="primary" onClick={onDoForMe}>
              Do it for me
            </Btn>
          ) : null}
        </div>
      </div>
    </div>
  )
}

import { CrisisCard } from '../components/CrisisCard'
import { VisitorCard } from '../components/VisitorCard'
import { AnimatePresence, motion } from 'motion/react'
import type { ComponentProps } from 'react'
import type { MenuId } from '../../content/menus'
import type { Command } from '../../sim/commands'
import { sumQty } from '../../sim/helpers'
import type { Suggestion } from '../../sim/suggestions'
import type { GameState } from '../../sim/state'
import { ChapterCard } from '../components/ChapterCard'
import { CoachOverlay } from '../components/Coach'
import { createPortal } from 'react-dom'
import { DialogueStrip } from '../components/DialogueStrip'
import { usePhone } from '../kit/hooks'
import { HungryLawsModal } from '../components/HungryLaws'
import { IntroCutscene } from '../components/IntroCutscene'
import { OfflineReceiptModal } from '../components/OfflineReceipt'
import { HeadlineCard } from '../horizon/HeadlineCard'

export interface GameToast {
  id: number
  text: string
}

/**
 * Everything that sits above the game, in one place. Stacking order (first = lowest):
 * story line → offline receipt → intro → Hungry laws → chapter card → headline →
 * coach tour → toasts. Gates match the old inline chain exactly:
 * the receipt blocks intro / laws / chapter / headline / coach / tips, and
 * an open chapter card blocks laws-after-it, headlines, coach and tips.
 */
export function OverlayManager({
  state,
  toasts,
  reducedMotion,
  dispatch,
  followUp,
  onFollowUp,
  onNudge,
  onHungryConfirm,
}: {
  state: GameState
  toasts: GameToast[]
  reducedMotion: boolean
  dispatch: (cmd: Command) => void
  followUp: Suggestion | null
  onFollowUp: (s: Suggestion) => void
  /** Offline-receipt "do this next" button. */
  onNudge: (id: MenuId) => void
  onHungryConfirm: ComponentProps<typeof HungryLawsModal>['onConfirm']
}) {
  const offline = !!state.offlineReceipt
  const phone = usePhone()
  const chapterEra = state.chapterQueue[0]
  const clear = !offline && state.introSeen && !state.pendingAccept
  const pendingArrival = (state.pendingReveal?.length ?? 0) > 0
  // Hold headlines / visitors / crisis until the chapter and arrival are done, plus post-chapter calm.
  const arrivalHold =
    chapterEra != null || pendingArrival || state.time < (state.tutorials.calmUntil ?? 0)
  const showDialogue =
    !offline &&
    state.introSeen &&
    !state.pendingAccept &&
    !chapterEra &&
    !pendingArrival &&
    !state.tutorials.active &&
    !!state.dialogueQueue[0]

  const receipt = state.offlineReceipt
  const nudge = (() => {
    if (!receipt) return null
    const back = sumQty(state.backroom)
    if (receipt.spoiled > 0 && state.menus.backroom) {
      return { menu: 'backroom' as const, label: 'Check Backroom', hint: 'Spoilage hit while you were away.' }
    }
    if (back > 0) {
      return { menu: 'floor' as const, label: 'Unpack on Floor', hint: `${Math.floor(back)} waiting in the back.` }
    }
    if (state.menus.suppliers) {
      return { menu: 'suppliers' as const, label: 'Restock via Suppliers', hint: 'The shelf may be thin.' }
    }
    return null
  })()

  return (
    <>
      <AnimatePresence>
        {showDialogue
          ? // On wide screens the story line speaks from the storefront banner, so it never
            // sits on a room's buttons. Without a banner (phones, photo mode) it floats.
            (() => {
              const node = (
              <div className="g2-dialogue" key={state.dialogueQueue[0]}>
                <DialogueStrip
                  lineId={state.dialogueQueue[0]!}
                  reducedMotion={reducedMotion}
                  onNext={() => dispatch({ type: 'advanceDialogue' })}
                  onSkip={() => dispatch({ type: 'advanceDialogue' })}
                />
              </div>
              )
              const slot = phone ? null : document.getElementById('g2-dialogue-slot')
              return slot ? createPortal(node, slot, String(state.dialogueQueue[0])) : node
            })()
          : null}
      </AnimatePresence>

      {receipt ? (
        <OfflineReceiptModal
          receipt={receipt}
          reducedMotion={reducedMotion}
          onDismiss={() => dispatch({ type: 'dismissOfflineReceipt' })}
          followUp={followUp}
          onFollowUp={onFollowUp}
          nudge={nudge}
          onNudge={(id) => {
            if (state.menus[id]) onNudge(id)
          }}
        />
      ) : null}

      {!offline && !state.introSeen ? (
        <IntroCutscene
          reducedMotion={reducedMotion}
          onBeat={(index) => dispatch({ type: 'introBeat', index })}
          onFinish={() => dispatch({ type: 'finishIntro' })}
        />
      ) : null}

      {!offline && state.introSeen && state.pendingAccept ? <HungryLawsModal onConfirm={onHungryConfirm} /> : null}

      {clear && chapterEra != null ? (
        <ChapterCard era={chapterEra} reducedMotion={reducedMotion} onAccept={() => dispatch({ type: 'acceptChapter' })} />
      ) : null}

      {clear && !arrivalHold && state.horizon.headlineId && !state.corp?.more.crisis ? <HeadlineCard reducedMotion={reducedMotion} /> : null}

      {clear && !arrivalHold && !state.tutorials.active && state.corp?.more.crisis ? <CrisisCard reducedMotion={reducedMotion} /> : null}

      {clear && !arrivalHold && !state.horizon.headlineId && !state.tutorials.active && !state.corp?.more.crisis && state.visitors?.current ? (
        <VisitorCard reducedMotion={reducedMotion} />
      ) : null}

      {clear && !chapterEra && !pendingArrival && state.tutorials.active ? <CoachOverlay active={state.tutorials.active} /> : null}

      <div className="ge-toasts g2-toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className="ge-toast"
              initial={reducedMotion ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}

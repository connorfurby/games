import { motion, AnimatePresence } from 'motion/react'
import { MENUS, type MenuId } from '../../content/menus'
import type { Command } from '../../sim/commands'
import type { Suggestion } from '../../sim/suggestions'

const KIND_LABEL: Record<Suggestion['kind'], string> = {
  memo: 'Memo',
  upgrade: 'Upgrade',
  build: 'Build',
  office: 'Office',
  growth: 'Growth',
}

function channelLabel(channel: Suggestion['channel']): string {
  if (channel === 'memos') return 'Memos'
  return MENUS[channel]?.name ?? channel
}

function goLabel(tip: Suggestion): string {
  if (tip.channel === 'memos') return 'Show'
  return `Open ${channelLabel(tip.channel)}`
}

/** One-line next-buy strip — progression only. Hidden by the shell when it fights Next Goal. */
export function SuggestTip({
  tip,
  reducedMotion,
  onGo,
  onDo,
}: {
  tip: Suggestion | null
  reducedMotion: boolean
  onGo: (s: Suggestion) => void
  onDo?: (cmd: Command) => void
}) {
  if (!tip) return null

  const kind = KIND_LABEL[tip.kind]
  const where = channelLabel(tip.channel)
  const doLabel = tip.cta ?? 'Buy'

  return (
    <div className="ge-suggest-tip ge-suggest-tip--line" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.div
          key={tip.id}
          className={`ge-suggest-tip__card ge-suggest-tip__card--line ge-suggest-tip__card--${tip.kind}`}
          initial={reducedMotion ? false : { opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="ge-suggest-tip__line">
            <span className="ge-suggest-tip__eyebrow">
              Suggested · {kind}
            </span>
            <strong className="ge-suggest-tip__title">{tip.title}</strong>
            <span className="ge-suggest-tip__where">{where}</span>
          </p>
          <div className="ge-suggest-tip__actions">
            <button
              type="button"
              className="ge-suggest-tip__btn ge-suggest-tip__btn--ghost"
              onClick={() => onGo(tip)}
              title={tip.channel === 'memos' ? 'Jump to memos' : `Open ${where}`}
            >
              {goLabel(tip)}
            </button>
            {tip.action && onDo ? (
              <button
                type="button"
                className="ge-suggest-tip__btn ge-suggest-tip__btn--solid"
                onClick={() => onDo(tip.action!)}
                title={`${doLabel} now`}
              >
                {doLabel}
              </button>
            ) : null}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function channelToMenu(channel: Suggestion['channel']): MenuId | null {
  if (channel === 'memos') return null
  return channel
}

/** True when the tip already matches the Next Goal verb (or there is no goal action). */
export function tipAlignsWithGoal(
  tip: Suggestion | null,
  goalAction: Command | null,
  goalMenu: MenuId | 'memos' | null,
): boolean {
  if (!tip) return false
  if (!goalAction) return true
  if (tip.action && tip.action.type === goalAction.type) return true
  const tipMenu = tip.channel === 'memos' ? 'memos' : channelToMenu(tip.channel)
  return !!goalMenu && tipMenu === goalMenu
}

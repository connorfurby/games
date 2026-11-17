import { useEffect, useRef } from 'react'
import { useGameSelector } from '../useGameSelector'
import { celebrate } from './celebrate'

/** Empire ranks that earn a medium celebration (every 5th, so it stays rare). */
const RANK_STEP = 5

/**
 * Watches the sim for era and Empire-rank milestones and fires `celebrate()`.
 * Era changes get the big sweep only when no ChapterCard will cover them: chapters already
 * announce the era, so we keep it to a burst there to avoid doubling up.
 *
 * Skips the first read (loading a save is not a milestone) and any decrease (rebrand / reset).
 */
export function useMilestones(opts: { muted: boolean; enabled?: boolean }): void {
  const { muted, enabled = true } = opts
  const era = useGameSelector((s) => s.era)
  const rank = useGameSelector((s) => s.empire.level)
  const chapterPending = useGameSelector((s) => s.chapterQueue.length > 0)
  // Basket milestones: 1, 10, 100, 1,000 … (the order of magnitude of lifetime sales).
  const soldTier = useGameSelector((s) => (s.stats.sold >= 1 ? Math.floor(Math.log10(Math.max(1, s.stats.sold))) + 1 : 0))
  const hired = useGameSelector((s) => s.staff.length > 0)
  const last = useRef({ era, rank, soldTier, hired })
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  useEffect(() => {
    const prev = last.current
    last.current = { era, rank, soldTier, hired }
    if (!enabled) return

    // The first loop deserves a beat: first basket, then 10, 100, 1,000 … and the first hire.
    if (soldTier > prev.soldTier && soldTier - prev.soldTier === 1 && soldTier <= 7) {
      const n = Math.pow(10, soldTier - 1)
      celebrate('medium', undefined, {
        text: n === 1 ? 'First basket!' : `${n.toLocaleString('en-US')} baskets`,
        muted: mutedRef.current,
      })
    }
    if (hired && !prev.hired) {
      celebrate('medium', undefined, { text: 'First hire!', muted: mutedRef.current })
    }

    if (era > prev.era) {
      // Era sign on the Floor room via data-era; celebrate when no chapter covers it.
      document.documentElement.style.setProperty('--ge-era-lamp', era >= 7 ? 'worlds' : era >= 4 ? 'globe' : era >= 2 ? 'chain' : 'counter')
      document.querySelectorAll('[data-era]').forEach((el) => {
        el.setAttribute('data-era', String(era))
      })
      celebrate(chapterPending ? 'medium' : 'large', undefined, {
        text: chapterPending ? undefined : `Era ${era}`,
        muted: mutedRef.current,
      })
      return
    }
    if (rank > prev.rank) {
      const crossed = Math.floor(rank / RANK_STEP) > Math.floor(prev.rank / RANK_STEP)
      if (crossed) {
        celebrate('medium', undefined, { text: `Rank ${rank}`, muted: mutedRef.current })
      }
    }
  }, [era, rank, soldTier, hired, chapterPending, enabled])
}

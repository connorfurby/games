/** Coach lessons grouped into era tracks for the wiki's Lessons page. */
import { TUTORIALS, type TutorialDef } from '../tutorials'
import { ATLAS } from './atlas'
import type { MenuId } from '../menus'

export interface LessonTrack {
  era: number
  title: string
  lessons: TutorialDef[]
}

export const LESSON_TRACKS: LessonTrack[] = ATLAS.map((e) => ({
  era: e.era,
  title: e.title,
  lessons: TUTORIALS.filter((t) => t.era === e.era),
})).filter((t) => t.lessons.length > 0)

export const LESSON_COUNT = TUTORIALS.length

/** The department a lesson starts in, when its steps say so (used for `?m=` deep links). */
export function lessonMenu(t: TutorialDef): MenuId | undefined {
  for (const st of t.steps) {
    const m = st.action?.type === 'openMenu' ? (st.action.params?.menu as MenuId | undefined) : undefined
    if (m) return m
  }
  return undefined
}

/** First lesson at or below `era` that is not done yet. */
export function nextLesson(era: number, done: Record<string, boolean>): TutorialDef | undefined {
  return TUTORIALS.find((t) => t.era <= Math.max(0, era) && !done[t.id])
}

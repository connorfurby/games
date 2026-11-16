import { useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MENUS } from '@/games/grocery-empire/content/menus'
import { lessonMenu } from '@/games/grocery-empire/content/wiki/lessons'
import type { TutorialDef } from '@/games/grocery-empire/content/tutorials'
import { LinkButton } from '@/games/grocery-empire/ui/kit'
import { WikiBrowser } from '@/games/grocery-empire/ui/wiki/WikiBrowser'
import { navToPath, pathToNav, playHref, type WikiNav } from '@/games/grocery-empire/ui/wiki/nav'
import { loadGame } from '@/shared/save'
import { useMeta } from './MetaContext'
import { ShellFrame } from './ShellFrame'

interface SaveBits {
  era?: number
  tutorials?: { done?: Record<string, boolean> }
}

function readSave(): { era: number; done: Record<string, boolean> } {
  const s = loadGame<SaveBits>('grocery-empire')
  const era = typeof s?.era === 'number' && Number.isFinite(s.era) ? Math.max(0, Math.floor(s.era)) : 0
  return { era, done: s?.tutorials?.done ?? {} }
}

export function GuidePage() {
  const { meta, updateSettings } = useMeta()
  const params = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  // Read on every navigation so a run played in another tab shows up.
  const save = readSave()
  const nav = pathToNav(params['*'] ?? '', search)

  const go = useCallback(
    (n: WikiNav) => {
      // Typing in search replaces the entry instead of stacking history.
      navigate(navToPath(n), { replace: n.view === 'search' && nav.view === 'search' })
    },
    [navigate, nav.view],
  )

  return (
    <ShellFrame title="Guide">
      <div className="sd-page wk-page">
        <WikiBrowser
          nav={nav}
          go={go}
          playEra={save.era}
          spoilers={meta.settings.showSpoilers}
          onSpoilers={(v) => updateSettings({ showSpoilers: v })}
          lessonsDone={save.done}
          renderOpenMenu={(m, label) => (
            <LinkButton to={playHref({ menu: m })} tone="secondary" size="sm" title={MENUS[m].purpose}>
              {label}
            </LinkButton>
          )}
          renderPlayLesson={(t: TutorialDef, label) => (
            <LinkButton to={playHref({ tour: t.id, menu: lessonMenu(t) })} tone="free" size="sm">
              {label ?? 'Play this lesson'}
            </LinkButton>
          )}
        />
      </div>
    </ShellFrame>
  )
}

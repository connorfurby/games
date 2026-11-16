import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MENUS, type MenuId } from '@/games/grocery-empire/content/menus'
import { lessonMenu } from '@/games/grocery-empire/content/wiki/lessons'
import type { TutorialDef } from '@/games/grocery-empire/content/tutorials'
import { LinkButton } from '@/games/grocery-empire/ui/kit'
import { WikiBrowser } from '@/games/grocery-empire/ui/wiki/WikiBrowser'
import { navToPath, pathToNav, type WikiNav } from '@/games/grocery-empire/ui/wiki/nav'
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

/** Play deep link: `?m=` opens a department, `?tour=` starts a Coach lesson (handled in GroceryEmpireApp). */
export function playHref(opts: { menu?: MenuId; tour?: string }) {
  const p = new URLSearchParams()
  if (opts.menu) p.set('m', opts.menu)
  if (opts.tour) p.set('tour', opts.tour)
  const q = p.toString()
  return `/play/grocery-empire${q ? `?${q}` : ''}`
}

export function GuidePage() {
  const { meta, updateSettings } = useMeta()
  const params = useParams()
  const [search] = useSearchParams()
  const loc = useLocation()
  const navigate = useNavigate()
  const save = useMemo(() => readSave(), [loc.key])
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

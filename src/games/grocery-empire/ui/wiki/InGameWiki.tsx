import { useState } from 'react'
import { useMeta } from '@/shell/MetaContext'
import { MENUS, type MenuId } from '../../content/menus'
import { lessonMenu } from '../../content/wiki/lessons'
import { useGame } from '../GameContext'
import { Button } from '../kit'
import { WikiBrowser } from './WikiBrowser'
import type { WikiNav } from './nav'
import { setWikiLanding, wikiLanding } from './wikiLanding'

/** The Ops Wiki inside play (Menu drawer → Wiki). Same pages as the site Guide. */
export function InGameWiki({ onOpenMenu, onPlayLesson }: { onOpenMenu: (m: MenuId) => void; onPlayLesson: (id: string, menu?: MenuId) => void }) {
  const { state: s } = useGame()
  const { meta, updateSettings } = useMeta()
  const [nav, setNav] = useState<WikiNav>(wikiLanding)
  const unlocked = (m: MenuId) => !!s.menus[m]
  return (
    <WikiBrowser
      compact
      nav={nav}
      go={(n) => {
        setWikiLanding(n)
        setNav(n)
      }}
      playEra={s.era}
      spoilers={meta.settings.showSpoilers}
      onSpoilers={(v) => updateSettings({ showSpoilers: v })}
      lessonsDone={s.tutorials.done}
      renderOpenMenu={(m, label) => (
        <Button
          size="sm"
          tone="secondary"
          disabled={!unlocked(m)}
          title={unlocked(m) ? MENUS[m].purpose : `${MENUS[m].name} is not open yet`}
          onClick={() => onOpenMenu(m)}
        >
          {label}
        </Button>
      )}
      renderPlayLesson={(t, label) => (
        <Button size="sm" tone="free" onClick={() => onPlayLesson(t.id, lessonMenu(t))}>
          {label ?? 'Play this lesson'}
        </Button>
      )}
    />
  )
}

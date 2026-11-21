import { lazy, Suspense } from 'react'
import { motion } from 'motion/react'
import { isDevSave } from '../../sim/saveKey'
import { MoreSections, type MoreSection } from '../panels/MorePanel'
import { AutopilotPanel } from './AutopilotPanel'
import { NoticesPanel } from './NoticesPanel'
import { useUnreadNotices } from './notices'
import type { MenuId } from '../../content/menus'

/** Dev fixtures + wiki stay out of the first play paint. */
const DevModePanel = lazy(() => import('../components/DevModePanel').then((m) => ({ default: m.DevModePanel })))
const InGameWiki = lazy(() => import('../wiki/InGameWiki').then((m) => ({ default: m.InGameWiki })))

export type ToolsTab = 'dev' | 'wiki' | 'notices' | 'autopilot' | MoreSection

/** Five tabs, not eight: everything about this run lives under Game. */
const TABS: { id: ToolsTab; label: string }[] = [
  { id: 'dev', label: 'Dev' },
  { id: 'run', label: 'Game' },
  { id: 'autopilot', label: 'Autopilot' },
  { id: 'wiki', label: 'Guide' },
  { id: 'notices', label: 'Notices' },
  { id: 'settings', label: 'Settings' },
  { id: 'saves', label: 'Saves' },
]
/** Older deep links still name these; they now sit inside Game. */
const FOLDED: Partial<Record<ToolsTab, ToolsTab>> = { progress: 'run', go: 'run' }

/** Right-hand drawer for everything that isn't the store: dev tools, run, settings, saves, links. */
export function ToolsDrawer({
  tab,
  onTab,
  onClose,
  reducedMotion,
  onOpenMenu,
  onPlayLesson,
}: {
  tab: ToolsTab
  onTab: (t: ToolsTab) => void
  onClose: () => void
  reducedMotion: boolean
  /** Wiki "Open <department>" buttons. */
  onOpenMenu: (m: MenuId) => void
  /** Wiki "Play this lesson" buttons. */
  onPlayLesson: (id: string, menu?: MenuId) => void
}) {
  const inDev = isDevSave()
  const tabs = TABS.filter((t) => t.id !== 'dev' || inDev)
  const unread = useUnreadNotices()
  const wanted = FOLDED[tab] ?? tab
  const active = tabs.some((t) => t.id === wanted) ? wanted : tabs[0]!.id

  return (
    <>
    <motion.div
      key="tools-scrim"
      className="g2-scrim"
      onClick={onClose}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.15 }}
    />
    <motion.aside
      key="tools"
      className="g2-inbox g2-tools"
      aria-label="Menu"
      initial={reducedMotion ? false : { x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={reducedMotion ? undefined : { x: 40, opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.18, ease: 'easeOut' }}
    >
      <div className="g2-inbox__head g2-tools__head">
        <div className="g2-tools__top">
          <h2 className="g2-tools__title">Menu</h2>
          <button type="button" className="g2-icon-btn" onClick={onClose} title="Close (Esc)" aria-label="Close menu">
            ✕
          </button>
        </div>
        <div className="g2-tools__tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active === t.id}
              className={`g2-tools__tab${active === t.id ? ' is-active' : ''}`}
              onClick={() => onTab(t.id)}
            >
              {t.label}
              {t.id === 'notices' && unread > 0 && active !== 'notices' ? <span className="g2-tools__dot">{unread}</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div className={`g2-inbox__body${active === 'wiki' ? ' g2-tools__wiki' : ''}`}>
        {active === 'dev' ? (
          <Suspense fallback={<p className="ge-muted">Opening DevMode…</p>}>
            <DevModePanel />
          </Suspense>
        ) : active === 'wiki' ? (
          <Suspense fallback={<p className="ge-muted">Opening guide…</p>}>
            <InGameWiki onOpenMenu={onOpenMenu} onPlayLesson={onPlayLesson} />
          </Suspense>
        ) : active === 'notices' ? (
          <NoticesPanel />
        ) : active === 'autopilot' ? (
          <AutopilotPanel onOpenMenu={(m) => { onOpenMenu(m); onClose() }} />
        ) : active === 'run' ? (
          <>
            <MoreSections only="go" />
            <MoreSections only="run" />
            <MoreSections only="progress" onOpenMenu={onOpenMenu} />
          </>
        ) : (
          <MoreSections only={active as MoreSection} />
        )}
      </div>
    </motion.aside>
    </>
  )
}

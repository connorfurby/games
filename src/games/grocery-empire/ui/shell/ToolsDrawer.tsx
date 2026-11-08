import { motion } from 'motion/react'
import { isDevSave } from '../../sim/saveKey'
import { DevModePanel } from '../components/DevModePanel'
import { MoreSections, type MoreSection } from '../panels/MorePanel'

export type ToolsTab = 'dev' | MoreSection

const TABS: { id: ToolsTab; label: string }[] = [
  { id: 'dev', label: 'Dev' },
  { id: 'run', label: 'Run' },
  { id: 'settings', label: 'Settings' },
  { id: 'saves', label: 'Saves' },
  { id: 'progress', label: 'Progress' },
  { id: 'go', label: 'Go' },
]

/** Right-hand drawer for everything that isn't the store: dev tools, run, settings, saves, links. */
export function ToolsDrawer({
  tab,
  onTab,
  onClose,
  reducedMotion,
}: {
  tab: ToolsTab
  onTab: (t: ToolsTab) => void
  onClose: () => void
  reducedMotion: boolean
}) {
  const inDev = isDevSave()
  const tabs = TABS.filter((t) => t.id !== 'dev' || inDev)
  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0]!.id

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
      <div className="g2-inbox__head">
        <div className="g2-inbox__tabs g2-tools__tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active === t.id}
              className={`g2-subtab${active === t.id ? ' is-active' : ''}`}
              onClick={() => onTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" className="g2-icon-btn" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
      </div>
      <div className="g2-inbox__body">{active === 'dev' ? <DevModePanel /> : <MoreSections only={active} />}</div>
    </motion.aside>
    </>
  )
}

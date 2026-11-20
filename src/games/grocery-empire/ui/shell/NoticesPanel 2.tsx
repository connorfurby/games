import { useEffect, useState } from 'react'
import { Button, EmptyState, SegmentedControl } from '../kit'
import { clearNotices, markNoticesSeen, noticeAge, useNotices } from './notices'

const KIND_LABEL = { reward: 'Reward', blocked: 'Blocked', info: 'Notice' } as const

/** Menu → Notices: every toast from this visit, newest first. */
export function NoticesPanel() {
  const all = useNotices()
  const [show, setShow] = useState<'all' | 'reward' | 'blocked'>('all')
  // Opening the tab reads everything in it.
  useEffect(() => {
    markNoticesSeen()
  }, [all])
  const list = show === 'all' ? all : all.filter((n) => n.kind === show)
  if (all.length === 0) {
    return <EmptyState title="Nothing yet" body="Rewards, blocked actions and other notices from this visit collect here." />
  }
  return (
    <div className="g2-notices">
      <div className="g2-notices__head">
        <SegmentedControl
          aria-label="Show"
          value={show}
          onChange={setShow}
          options={[
            { value: 'all', label: `All · ${all.length}` },
            { value: 'reward', label: 'Rewards' },
            { value: 'blocked', label: 'Blocked' },
          ]}
        />
        <Button size="sm" onClick={clearNotices}>
          Clear
        </Button>
      </div>
      {list.length === 0 ? <p className="ge-muted">None of those this visit.</p> : null}
      <ul className="g2-notices__list">
        {list.map((n) => (
          <li key={n.id} className={`g2-notices__item is-${n.kind}`}>
            <span className="g2-notices__kind">{KIND_LABEL[n.kind]}</span>
            <span className="g2-notices__text">{n.text}</span>
            <time className="g2-notices__age">{noticeAge(n.at)}</time>
          </li>
        ))}
      </ul>
    </div>
  )
}

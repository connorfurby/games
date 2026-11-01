import { Link } from 'react-router-dom'
import { GUIDE_SECTIONS } from '@/games/grocery-empire/content/guide'
import { useMeta } from './MetaContext'

export function GuidePage() {
  const { meta, updateSettings } = useMeta()
  const sections = GUIDE_SECTIONS.filter((g) => meta.settings.showSpoilers || g.era <= 1)
  return (
    <div className="guide-page">
      <Link to="/">← Shelf</Link>
      <h1 className="brand">Guide</h1>
      <p className="guide-lore">
        Standing orders from Operations. Read when the aisle feels loud — never required to finish a
        basket.
      </p>
      <p className="muted">
        Era 0–1 open by default. Later chapters stay sealed until you enable spoilers.
      </p>
      <label className="guide-spoiler">
        <input
          type="checkbox"
          checked={meta.settings.showSpoilers}
          onChange={(e) => updateSettings({ showSpoilers: e.target.checked })}
        />{' '}
        Show spoilers
      </label>
      <p className="tokens">{sections.length} sections visible</p>
      {sections.map((g) => (
        <section key={g.id} className="guide-section">
          <h2>
            <span className="guide-era">E{g.era}</span> {g.title}
          </h2>
          <pre>{g.body}</pre>
        </section>
      ))}
    </div>
  )
}

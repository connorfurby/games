import { Link } from 'react-router-dom'
import { PLATES, type PlateId } from '@/games/grocery-empire/art/cast'
import { GUIDE_SECTIONS } from '@/games/grocery-empire/content/guide'
import { useMeta } from './MetaContext'

function plateForGuideEra(era: number): PlateId {
  if (era <= 1) return 'corner'
  if (era === 2) return 'counter'
  if (era === 3) return 'cold'
  return 'fleet'
}

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
      <div className="guide-grid">
        {sections.map((g) => {
          const plate = PLATES[plateForGuideEra(g.era)]
          return (
            <article key={g.id} className="guide-card">
              <div
                className="guide-card__plate"
                style={{ backgroundImage: `url(${plate})` }}
                aria-hidden
              />
              <header className="guide-card__head">
                <span className="guide-era">E{g.era}</span>
                <h2>{g.title}</h2>
              </header>
              <div className="guide-card__body">{g.body}</div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

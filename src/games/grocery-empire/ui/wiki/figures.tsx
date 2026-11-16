import type { ReactNode } from 'react'
import type { FigureId } from '../../content/wiki/blocks'
import { ATLAS, BAND_INFO } from '../../content/wiki/atlas'
import { MENUS } from '../../content/menus'
import { HUBS } from '../shell/hubs'
import { Icon, type IconName } from '../icons/Icon'

/**
 * Wiki diagrams. HTML + a little SVG so they reflow from 390 px to desktop and pick up
 * whichever texture pack (or the site palette) is active through the shared tokens.
 */

const LOOP: { icon: IconName; label: string; note: string; tone: 'tag' | 'tomato' | 'ink' }[] = [
  { icon: 'cash', label: 'Cash', note: 'buys crates', tone: 'tag' },
  { icon: 'wholesale', label: 'Truck', note: 'fills the backroom', tone: 'ink' },
  { icon: 'backroom', label: 'Backroom', note: 'crates wait here', tone: 'ink' },
  { icon: 'unpack', label: 'Unpack', note: 'puts stock on the shelf', tone: 'tomato' },
  { icon: 'baskets', label: 'Shoppers', note: 'check out baskets', tone: 'ink' },
]

function CoreLoop() {
  const n = LOOP.length
  return (
    <div className="wk-loop" role="img" aria-label="The core loop: cash buys crates, the truck fills the backroom, Unpack puts stock on the shelf, shoppers check out baskets that pay cash.">
      <svg className="wk-loop__ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <marker id="wk-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="currentColor" />
          </marker>
        </defs>
        <ellipse cx="50" cy="50" rx="38" ry="34" className="wk-loop__track" />
        <ellipse cx="50" cy="50" rx="38" ry="34" className="wk-loop__flow" />
      </svg>
      {LOOP.map((s, i) => {
        const a = (-90 + (360 / n) * i) * (Math.PI / 180)
        const x = 50 + Math.cos(a) * 38
        const y = 50 + Math.sin(a) * 34
        return (
          <div key={s.label} className={`wk-loop__node is-${s.tone}`} style={{ left: `${x}%`, top: `${y}%` }}>
            <span className="wk-loop__ico">
              <Icon name={s.icon} size={20} />
            </span>
            <strong>{s.label}</strong>
            <em>{s.note}</em>
            <i className="wk-loop__n">{i + 1}</i>
          </div>
        )
      })}
      <div className="wk-loop__hub">
        <span>Baskets</span>
        <strong>+ cash</strong>
      </div>
    </div>
  )
}

const NECKS: { id: string; label: string; icon: IconName; width: number; fix: string }[] = [
  { id: 'shelf', label: 'Shelf', icon: 'shelf', width: 82, fix: 'Buy crates, raise shelf space in Build.' },
  { id: 'unpack', label: 'Unpack', icon: 'unpack', width: 46, fix: 'Unpack faster: clerks, Box Cutter, Steady Rhythm.' },
  { id: 'checkout', label: 'Checkout', icon: 'role-cashier', width: 70, fix: 'Hire a cashier; open lanes.' },
  { id: 'demand', label: 'Demand', icon: 'marketing', width: 64, fix: 'Lower price toward Best ≈, marketing, more aisles.' },
]

function Bottleneck() {
  const min = Math.min(...NECKS.map((n) => n.width))
  return (
    <div className="wk-neck">
      {NECKS.map((n) => (
        <div key={n.id} className={`wk-neck__row${n.width === min ? ' is-lit' : ''}`}>
          <span className="wk-neck__label">
            <Icon name={n.icon} size={16} />
            {n.label}
          </span>
          <span className="wk-neck__pipe">
            <i style={{ width: `${n.width}%` }} />
          </span>
          <span className="wk-neck__fix">{n.fix}</span>
        </div>
      ))}
      <p className="wk-neck__sum">
        Sales per second = the <b>narrowest</b> pipe. Here that is Unpack — widening Shelf would change nothing.
      </p>
    </div>
  )
}

export function HubMap({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`wk-hubs${compact ? ' is-compact' : ''}`}>
      {HUBS.map((h, i) => (
        <article key={h.id} className="wk-hub" style={{ ['--i' as string]: i }}>
          <header>
            <span className="wk-hub__ico">
              <Icon name={h.icon} size={18} />
            </span>
            <strong>{h.name}</strong>
          </header>
          <p>{h.purpose}</p>
          <ul>
            {h.menus.map((m) => (
              <li key={m}>
                <Icon name={m} size={13} />
                {MENUS[m]?.name ?? m}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}

export function EraRibbon({ current, maxOpen, onPick }: { current?: number; maxOpen: number; onPick?: (era: number) => void }) {
  return (
    <ol className="wk-ribbon" aria-label="Eras">
      {ATLAS.map((e) => {
        const open = e.era <= maxOpen
        const band = BAND_INFO[e.band]
        const body: ReactNode = (
          <>
            <span className="wk-ribbon__n">{e.era}</span>
            <span className="wk-ribbon__t">{open ? e.title : '???'}</span>
          </>
        )
        return (
          <li
            key={e.era}
            className={`wk-ribbon__era${e.era === current ? ' is-now' : ''}${open ? '' : ' is-locked'}`}
            style={{ ['--h' as string]: band.hue }}
          >
            {onPick && open ? (
              <button type="button" onClick={() => onPick(e.era)} aria-label={`Era ${e.era}: ${e.title}`}>
                {body}
              </button>
            ) : (
              <span>{body}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function WorldsFiling() {
  return (
    <div className="wk-file">
      <div className="wk-file__step">
        <span className="sd-chip sd-chip--quiet">Practice 1</span>
        <em>stocks, no credit</em>
      </div>
      <span className="wk-file__arrow" aria-hidden>
        →
      </span>
      <div className="wk-file__step">
        <span className="sd-chip sd-chip--quiet">Practice 2</span>
        <em>stocks, no credit</em>
      </div>
      <span className="wk-file__arrow" aria-hidden>
        →
      </span>
      <div className="wk-file__doors">
        <div className="wk-file__door">
          <b>0.72</b>
          <span>Standard — the slow door</span>
        </div>
        <div className="wk-file__door is-fast">
          <b>0.85</b>
          <span>Clever — the fast door</span>
        </div>
      </div>
    </div>
  )
}

export function WikiFigure({ fig }: { fig: FigureId }) {
  switch (fig) {
    case 'core-loop':
      return <CoreLoop />
    case 'bottleneck':
      return <Bottleneck />
    case 'hub-map':
      return <HubMap />
    case 'era-ribbon':
      return <EraRibbon maxOpen={12} />
    case 'worlds-filing':
      return <WorldsFiling />
    default:
      return null
  }
}

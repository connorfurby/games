import type { CSSProperties } from 'react'
import type { MenuId } from '../../content/menus'

export type FloorIcon =
  | 'unpack'
  | 'price'
  | 'wholesale'
  | 'baskets'
  | 'cash'
  | 'shelf'
  | 'backroom'
  | 'memo'
  | 'help'

export type ExtraIcon =
  | 'role-clerk'
  | 'role-stocker'
  | 'role-cashier'
  | 'role-security'
  | 'role-night'
  | 'build-storefront'
  | 'build-storage'
  | 'build-cold'
  | 'build-production'
  | 'build-transit'
  | 'build-civic'
  | 'venture'
  | 'charter'
  | 'doctrine'
  | 'plant'
  | 'tank'
  | 'barge'
  | 'lane'
  | 'lobby'

export type IconName = MenuId | FloorIcon | ExtraIcon

type Tone = 'ink' | 'muted' | 'accent' | 'paper' | 'inherit'

const VIEW = 24

/** Compact SVG paths — bodega glyph set for rail, Floor, memos, headers. */
const PATHS: Record<IconName, string> = {
  floor: 'M4 18V8l8-4 8 4v10M4 10l8 4 8-4M12 14v8M8 18h8',
  backroom: 'M5 7h14v12H5zM5 11h14M9 7v4M15 7v4M8 15h3M13 15h3',
  suppliers: 'M3 16h18M5 16V9l3-3h8l3 3v7M8 16v2M16 16v2M9 11h6',
  staff: 'M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20c1.5-3 4-4.5 7-4.5S17.5 17 19 20',
  marketing: 'M4 10v4l7 3V7l-7 3zm7-1 8-4v14l-8-4M15 10.5v3',
  // Two storefronts facing off.
  rivals: 'M3 20V11l4-3 4 3v9M13 20v-9l4-3 4 3v9M5 20v-4h4v4M15 20v-4h4v4M2 20h20',
  books: 'M6 4h9a2 2 0 0 1 2 2v14H8a2 2 0 0 0-2 2V4zm0 0v16M11 8h4M11 12h4',
  invest: 'M4 18h16M6 14l4-5 3 3 5-7',
  build: 'M4 20V9l8-5 8 5v11M9 20v-6h6v6',
  upgrades: 'M12 4v12M8 10l4-4 4 4M6 20h12',
  ventures: 'M5 19V8l7-4 7 4v11M9 19v-5h6v5M12 8v3',
  land: 'M3 17l5-8 4 5 3-4 6 7H3zM5 20h14',
  strategy: 'M12 3l2.2 4.5L19 8.2l-3.5 3.4.8 4.9L12 14.3 7.7 16.5l.8-4.9L5 8.2l4.8-.7L12 3z',
  cold: 'M12 3v18M6.5 6.5l11 11M17.5 6.5l-11 11M5 12h14',
  politics: 'M5 20V9h3v11M11 20V5h3v15M17 20v-7h3v7M4 20h17',
  logistics: 'M3 13h11V8H3v5zm11 0h4l3 3v3h-2M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  fleet: 'M4 15c2-4 5-6 8-6s6 2 8 6M6 15l2 4h8l2-4M12 5v4M9 7h6',
  empire: 'M4 20h16M6 20V10l6-5 6 5v10M10 20v-5h4v5',
  // A pedestal with a gem on it.
  relics: 'M12 3l4 4-4 6-4-6 4-4zM8 7h8M6 21h12M8 21v-4h8v4M10 17v-2h4v2',
  map: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  coach:
    'M12 4a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1 0-6h1V8a4 4 0 0 1 4-4z',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  unpack: 'M4 8h16v11H4zM8 8V6h8v2M12 12v5M10 14h4',
  price:
    'M7 7h.01M12 5c-4 0-6 2.5-6 5.5S8 16 12 16s5-1.5 5-3.5c0-3-3-3.5-5-4.5-1.5-.7-2-1.5-2-2.5C10 4.5 11 4 12 4c2 0 3 .8 3 2M12 16v3',
  wholesale: 'M3 7h13l5 5v7H3V7zm0 5h18M7 17h.01M17 17h.01',
  baskets: 'M6 8l1.5 10h9L18 8M5 8h14M9 8V6a3 3 0 0 1 6 0v2',
  cash:
    'M4 7h16v10H4zM4 10c2 1.5 2 4.5 0 6M20 10c-2 1.5-2 4.5 0 6M12 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  shelf: 'M4 6h16M4 12h16M4 18h16M6 6v12M18 6v12',
  memo: 'M7 4h8l4 4v12H7V4zm8 0v4h4M10 12h6M10 16h5',
  help: 'M12 17h.01M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8v.5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  'role-clerk': 'M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 20c1.2-2.5 3.5-4 6-4s4.8 1.5 6 4M8 8l-2-2M16 8l2-2',
  'role-stocker': 'M4 7h16v4H4zM6 11v8h4V11M14 11v8h4V11',
  'role-cashier': 'M4 6h16v12H4zM8 10h8M8 14h5M7 18h.01',
  'role-security': 'M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3zM12 11v3M12 16h.01',
  'role-night': 'M14 4a7 7 0 1 0 6 10 5.5 5.5 0 0 1-6-10z',
  'build-storefront': 'M3 10l9-6 9 6v10H3V10zm6 10v-6h6v6',
  'build-storage': 'M4 6h16v14H4zM4 10h16M8 6v4M16 6v4',
  'build-cold': 'M12 3v18M7 7l10 10M17 7 7 17',
  'build-production': 'M4 18V9l4-4h8l4 4v9M8 18v-5h8v5',
  'build-transit': 'M3 14h11V8H3v6zm11 0h4l3 3v2h-2M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  'build-civic': 'M4 20h16M6 20V8l6-4 6 4v12M10 12h4',
  venture: 'M12 4v3M8 8h8l1 12H7L8 8zm0 0L6 5M16 8l2-3',
  charter: 'M6 4h9l3 3v13H6V4zm9 0v3h3M9 12h6M9 16h4',
  doctrine: 'M12 3l2 4 4 .6-3 3 .8 4.4L12 13.5 8.2 15l.8-4.4-3-3L10 7l2-4z',
  plant: 'M6 20h12M8 20V10l4-6 4 6v10M10 14h4',
  tank: 'M7 8h10v12H7zM9 8V6h6v2M10 13h4',
  barge: 'M4 15c2-3 5-5 8-5s6 2 8 5M6 15l2 3h8l2-3',
  lane: 'M4 18c4-8 12-8 16 0M8 10h8',
  lobby: 'M5 20V8h4v12M11 20V5h4v15M17 20v-8h4v8',
}

const TONE_COLOR: Record<Tone, string> = {
  ink: 'var(--ge-ink, currentColor)',
  muted: 'var(--ge-muted, currentColor)',
  accent: 'var(--ge-accent, currentColor)',
  paper: 'var(--ge-paper, currentColor)',
  inherit: 'currentColor',
}

export function Icon({
  name,
  size = 18,
  tone = 'inherit',
  className = '',
  title,
}: {
  name: IconName
  size?: number
  tone?: Tone
  className?: string
  title?: string
}) {
  const d = PATHS[name]
  const style: CSSProperties = {
    width: size,
    height: size,
    color: TONE_COLOR[tone],
    flexShrink: 0,
  }
  return (
    <svg
      className={`ge-icon ${className}`.trim()}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={size}
      height={size}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d={d} />
    </svg>
  )
}

export function menuIcon(id: MenuId): IconName {
  return id
}

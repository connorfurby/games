import type { StatId } from '../../content/upgrades/stats'

/** 24×24 line icons, one per stat, for tree nodes and stat chips. */
const PATHS: Record<StatId, string> = {
  demand: 'M8 7a3 3 0 1 0 0-.1M16 7a3 3 0 1 0 0-.1M3 20c0-4 2-6 5-6s5 2 5 6M11 20c0-4 2-6 5-6s5 2 5 6',
  value: 'M5 9h14l-1.5 11h-11zM9 9V6a3 3 0 0 1 6 0v3',
  margin: 'M4 7h16v12H4zM4 11h16M8 15h3',
  unpack: 'M4 9l8-5 8 5v10l-8 4-8-4zM4 9l8 5 8-5M12 14v9',
  checkout: 'M3 7h14v10H3zM17 10h3l1 3v4h-4M7 11h6M6 20a1.5 1.5 0 1 0 0-.1M16 20a1.5 1.5 0 1 0 0-.1',
  shelf: 'M4 4v16M20 4v16M4 9h16M4 15h16M7 6v3M10 6v3M14 12v3M17 12v3',
  backroom: 'M3 21V9l9-5 9 5v12M7 21v-7h10v7M7 17h10',
  network: 'M12 5a2 2 0 1 0 0-.1M5 18a2 2 0 1 0 0-.1M19 18a2 2 0 1 0 0-.1M12 7l-6 9M12 7l6 9M7 18h10',
  store: 'M4 10l2-5h12l2 5M4 10h16v10H4zM10 20v-5h4v5M4 10c0 2 4 2 4 0 0 2 4 2 4 0 0 2 4 2 4 0 0 2 4 2 4 0',
  district: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 3v18M4 7.5l16 9M20 7.5l-16 9',
  lane: 'M3 17c3 2 6 2 9 0s6-2 9 0M6 14l2-6h8l2 6M12 4v4',
  barge: 'M4 13c4-4 12-4 16 0-4 4-12 4-16 0zM12 9V4M9 6h6',
  cold: 'M12 3v18M4 7.5l16 9M20 7.5l-16 9M9 4l3 2 3-2M9 20l3-2 3 2',
  plantIncome: 'M4 21V11l5 3V9l5 3V7l6 4v10zM8 18h2M13 18h2',
  harvest: 'M12 12a7 7 0 1 0 0-.1M12 12a3 3 0 1 0 0-.1M3 12h3M18 12h3',
  attention: 'M2 12c3-5 7-7 10-7s7 2 10 7c-3 5-7 7-10 7s-7-2-10-7zM12 15a3 3 0 1 0 0-.1',
  ideas: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.8c.7.6 1 1.3 1 2.2h5c0-.9.3-1.6 1-2.2A6 6 0 0 0 12 3z',
  xp: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  wageCut: 'M7 9a3 3 0 1 0 0-.1M3 20c0-3 2-5 4-5s4 2 4 5M14 8l7 7M21 8l-7 7',
  spoilCut: 'M12 4c-4 0-7 3-7 8s3 8 7 8 7-3 7-8-3-8-7-8zM12 4c1-1 3-1 4 0M9 12l2 2 4-4',
  crateCut: 'M3 9l9-5 9 5v10l-9 4-9-4zM3 9l9 5 9-5M8 17l8-6',
  rivalCut: 'M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6zM9 12l2 2 4-4',
  dealCut: 'M3 12l5-5 4 4 4-4 5 5-5 5-4-4-4 4zM12 11v6',
}

export function StatGlyph({ stat, size = 22 }: { stat?: StatId; size?: number }) {
  const d = stat ? PATHS[stat] : 'M12 4l8 8-8 8-8-8z'
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}

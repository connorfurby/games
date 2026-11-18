/** Six wire marks, drawn as icons so a phrase is not a row of raw words. */
export function SymbolMark({ id, size = 18 }: { id: string; size?: number }) {
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg className="hz-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {id === 'can' ? (
        <>
          <rect x="7" y="4" width="10" height="16" rx="2" {...p} />
          <path d="M8 8 H16" {...p} />
        </>
      ) : null}
      {id === 'star' ? <path d="M12 3 L14.5 9 H21 L16 13 L18 20 L12 16 L6 20 L8 13 L3 9 H9.5 Z" {...p} /> : null}
      {id === 'wave' ? <path d="M3 14 C6 10 8 18 12 14 C16 10 18 18 21 14" {...p} /> : null}
      {id === 'leaf' ? (
        <>
          <path d="M5 19 C8 8 16 5 20 4 C19 12 14 18 5 19 Z" {...p} />
          <path d="M9 15 C12 12 15 9 18 7" {...p} />
        </>
      ) : null}
      {id === 'bell' ? (
        <>
          <path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L20 18 H4 Z" {...p} />
          <path d="M10 18 A2 2 0 0 0 14 18" {...p} />
        </>
      ) : null}
      {id === 'key' ? (
        <>
          <circle cx="9" cy="10" r="4" {...p} />
          <path d="M12.5 12.5 L20 20 M16 16 H19 M16 19 H18" {...p} />
        </>
      ) : null}
      {id !== 'can' && id !== 'star' && id !== 'wave' && id !== 'leaf' && id !== 'bell' && id !== 'key' ? (
        <circle cx="12" cy="12" r="4" {...p} />
      ) : null}
    </svg>
  )
}

const HABIT = {
  price: 'A price agent restocks the planet shelf for you.',
  stock: 'A stock agent tops up a world that is running low.',
  route: 'A route agent files your trade route again.',
  taste: 'A taste agent plants the season’s cross.',
} as const

export function habitLine(habit: string): string {
  return HABIT[habit as keyof typeof HABIT] ?? 'Files one habit and does not buy the ending.'
}

export function HabitMark({ habit }: { habit: string }) {
  const id = habit === 'taste' ? 'leaf' : habit === 'route' ? 'wave' : habit === 'stock' ? 'can' : 'star'
  return <SymbolMark id={id} size={16} />
}

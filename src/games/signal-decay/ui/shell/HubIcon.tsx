/** Tiny hub glyphs — own files, not GE Icon pack. */
export function HubIcon({ name, size = 20 }: { name: string; size?: number }) {
  const s = size
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, 'aria-hidden': true as const }
  switch (name) {
    case 'dial':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 12 L17 9" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'mast':
      return (
        <svg {...common}>
          <path d="M12 20 V5" />
          <path d="M7 9 H17" />
          <path d="M8 6 H16" />
          <circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'crew':
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="3" />
          <circle cx="16" cy="10" r="2.4" />
          <path d="M4 19c1.5-3 4-4.5 5-4.5s3.5 1.5 5 4.5" />
          <path d="M13 19c.6-1.6 1.8-2.6 3-2.6 1.4 0 2.6.9 3.4 2.6" />
        </svg>
      )
    case 'book':
      return (
        <svg {...common}>
          <path d="M5 5.5h9a3 3 0 0 1 3 3V19H8a3 3 0 0 0-3 3V5.5z" />
          <path d="M8 19V8.5" />
        </svg>
      )
    case 'net':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="9.5" opacity="0.55" />
          <circle cx="18" cy="8" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="7" cy="16" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="3" />
        </svg>
      )
  }
}

import { ERA_STORY } from '../../content/lore'

/** Crossfade the storefront sign text with the era title. */
export function eraSignText(era: number): string {
  return ERA_STORY[era]?.title ?? `Era ${era}`
}

export function eraLampVar(era: number): string {
  if (era >= 7) return 'var(--sc-lamp-worlds)'
  if (era >= 4) return 'var(--sc-lamp-globe)'
  if (era >= 2) return 'var(--sc-lamp-chain)'
  return 'var(--sc-lamp-counter)'
}

export function EraSign({ era, className = '' }: { era: number; className?: string }) {
  return (
    <text
      className={`rm-sign pf-era-sign${className ? ` ${className}` : ''}`.trim()}
      fill={eraLampVar(era)}
      textAnchor="middle"
    >
      {eraSignText(era)}
    </text>
  )
}

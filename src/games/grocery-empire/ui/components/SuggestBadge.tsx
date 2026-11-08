/** Quiet rail mark — tiny dot, not a glowing “!”. */

export function SuggestBadge({
  title,
  className = '',
}: {
  title?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  pulse?: boolean
}) {
  return (
    <span
      className={`ge-suggest-dot ${className}`.trim()}
      title={title ?? 'Suggested'}
      aria-label={title ?? 'Suggested'}
    />
  )
}

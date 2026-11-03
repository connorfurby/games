import { CAST, type SpeakerId } from '../../art/cast'

/** Shared portrait + nameplate for intro, chapter, coach, and story banner. */
export function SpeakerChrome({
  speaker,
  size = 56,
  className = '',
}: {
  speaker: SpeakerId
  size?: number
  className?: string
}) {
  const cast = CAST[speaker]
  return (
    <div className={`ge-speaker ${className}`.trim()}>
      <img
        className="ge-speaker__portrait"
        src={cast.portrait}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        decoding="async"
      />
      <div className="ge-speaker__meta">
        <span className="ge-speaker__name">{cast.name}</span>
        <span className="ge-speaker__role">{cast.role}</span>
      </div>
    </div>
  )
}

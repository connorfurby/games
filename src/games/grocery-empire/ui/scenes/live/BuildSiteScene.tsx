import { BUILD_TRACKS } from '../../../content/builds'
import { useGame } from '../../GameContext'
import { Hit, Person, ROOM_GROUND, RoomScene, Sign } from '../room'
import { Beam, Crane, CrateStack } from './primitives'

const QUEUE_SILHOUETTE: Record<string, { w: number; h: number; tint: string; label: string }> = {
  storefront: { w: 90, h: 70, tint: '#c9a15a', label: 'Storefront' },
  storage: { w: 80, h: 50, tint: '#8a96a2', label: 'Storage' },
  cold: { w: 70, h: 55, tint: '#9fd4e4', label: 'Cold' },
  production: { w: 85, h: 60, tint: '#7cc47f', label: 'Production' },
  transit: { w: 95, h: 45, tint: '#8fb6e0', label: 'Transit' },
  civic: { w: 75, h: 65, tint: '#e0a64a', label: 'Civic' },
}

/** Build site room: scaffold = owned tiers, queue silhouette with label, crane when active. */
export function BuildSiteScene() {
  const { state: s, reducedMotion } = useGame()
  const tiers = Object.values(s.builds ?? {}).reduce((n, v) => n + Math.max(0, v), 0)
  const queued = s.era >= 7 ? s.horizon?.buildQueue : null
  const floors = Math.max(1, Math.min(5, Math.ceil(tiers / 3)))
  const storefront = s.builds?.storefront ?? 1
  const sil = queued ? QUEUE_SILHOUETTE[queued] : null
  const pulse = !!queued && !reducedMotion && !s.paused
  const trackCount = BUILD_TRACKS.length
  const ownedTracks = BUILD_TRACKS.filter((t) => (s.builds?.[t.id] ?? 0) > 0).length

  return (
    <RoomScene
      label={`Build site, ${tiers} tiers built${queued ? `, ${queued} queued` : ''}`}
      chips={[
        { label: 'Tiers', value: String(tiers) },
        { label: 'Tracks', value: `${ownedTracks}/${trackCount}` },
        { label: 'Storefront', value: `T${storefront}` },
        { label: 'Queue', value: queued ? String(queued) : 'Idle' },
      ]}
      skyTop="#1c2530"
      skyBottom="#34402f"
    >
      <Hit x={80} y={70} w={220} h={180} label="Scaffold" coachId="build-storefront" menu="build">
        <g transform={`translate(100 ${ROOM_GROUND})`}>
          <rect x="0" y={-18 * floors} width="170" height={18 * floors} fill="#3a342d" opacity="0.9" />
          {Array.from({ length: floors + 1 }, (_, i) => (
            <path key={i} d={`M-8 ${-i * 18} H178`} stroke="#8a96a2" strokeWidth="2" />
          ))}
          {[-8, 60, 118, 178].map((x) => (
            <path key={x} d={`M${x} 0 V${-18 * floors - 6}`} stroke="#8a96a2" strokeWidth="2" />
          ))}
          <rect x="14" y="-26" width={Math.min(60, 22 + storefront * 8)} height="26" fill="#c9a15a" opacity="0.8" />
        </g>
        <Sign x={100} y={88} text={`${floors} floor${floors === 1 ? '' : 's'} · ${tiers} tiers`} />
      </Hit>

      {sil ? (
        <Hit x={320} y={90} w={sil.w + 40} h={sil.h + 60} label={`Queued ${sil.label}`} menu="build">
          <g transform={`translate(340 ${ROOM_GROUND})`} opacity={pulse ? undefined : 0.85}>
            <rect
              className={pulse ? 'ls-queue-pulse' : undefined}
              x="0"
              y={-sil.h}
              width={sil.w}
              height={sil.h}
              rx="3"
              fill={sil.tint}
              opacity="0.35"
              stroke={sil.tint}
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            <text x={sil.w / 2} y={14} textAnchor="middle" fontSize="11" fill="#efe9dc" fontWeight="700">
              {sil.label}
            </text>
            <text x={sil.w / 2} y={30} textAnchor="middle" fontSize="9" fill="#9aa7b4">
              In queue
            </text>
          </g>
        </Hit>
      ) : (
        <g transform="translate(340 120)">
          <rect width="160" height="80" rx="6" fill="#0f1317" stroke="#3a444e" strokeDasharray="4 4" />
          <Sign x={20} y={36} text="Queue empty" />
          <Sign x={20} y={54} text="Pick a build below" small />
        </g>
      )}

      <CrateStack x={sil ? 520 : 420} y={ROOM_GROUND - 30} count={Math.min(12, tiers)} cap={12} />
      <Sign x={sil ? 520 : 420} y={ROOM_GROUND + 10} text={`${Math.min(12, tiers)} material piles`} small />

      {queued ? (
        <>
          <Crane x={700} y={98} swing={0.6} />
          <Beam x={760} y={96} h={40} color="#e0a64a" />
        </>
      ) : null}

      <Person x={560} y={ROOM_GROUND - 10} tint="#e0a64a" delay={0.4} working={!!queued} />
      <Person x={610} y={ROOM_GROUND - 10} tint="#9fb9d4" delay={1.1} scale={0.9} working={!!queued} />
    </RoomScene>
  )
}

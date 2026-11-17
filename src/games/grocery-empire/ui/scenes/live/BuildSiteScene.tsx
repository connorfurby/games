import { BUILD_TRACKS, BUILD_VARIANT_BY_ID, ownedVariantsForTrack, pendingVariantChoice, type BuildFilter } from '../../../content/builds'
import { useGame } from '../../GameContext'
import { Hit, Person, ROOM_GROUND, RoomScene, Sign } from '../room'
import { Beam, Crane, CrateStack } from './primitives'

const QUEUE_SILHOUETTE: Record<string, { w: number; h: number; tint: string; label: string }> = {
  storefront: { w: 110, h: 78, tint: '#c9a15a', label: 'Storefront' },
  storage: { w: 100, h: 58, tint: '#8a96a2', label: 'Storage' },
  cold: { w: 88, h: 62, tint: '#9fd4e4', label: 'Cold' },
  production: { w: 96, h: 68, tint: '#7cc47f', label: 'Production' },
  transit: { w: 108, h: 52, tint: '#8fb6e0', label: 'Transit' },
  civic: { w: 90, h: 72, tint: '#e0a64a', label: 'Civic' },
}

/** Build site room: selected track is the whole silhouette; facings tint the face. */
export function BuildSiteScene({ focusTrack }: { focusTrack?: string } = {}) {
  const { state: s, reducedMotion } = useGame()
  const tiers = Object.values(s.builds ?? {}).reduce((n, v) => n + Math.max(0, v), 0)
  const queued = s.era >= 7 ? s.horizon?.buildQueue : null
  const floors = Math.max(1, Math.min(5, Math.ceil(tiers / 3)))
  const storefront = s.builds?.storefront ?? 1
  const focus = (focusTrack && QUEUE_SILHOUETTE[focusTrack] ? focusTrack : queued) as BuildFilter | string | null
  const sil = focus ? QUEUE_SILHOUETTE[focus] : null
  const pulse = !!queued && !reducedMotion && !s.paused
  const trackCount = BUILD_TRACKS.length
  const ownedTracks = BUILD_TRACKS.filter((t) => (s.builds?.[t.id] ?? 0) > 0).length
  const focusLvl = focusTrack ? (s.builds?.[focusTrack] ?? 0) : storefront
  const ownedFacing = focusTrack ? ownedVariantsForTrack(s, focusTrack as BuildFilter) : []
  const pending = focusTrack ? pendingVariantChoice(s, focusTrack as BuildFilter) : null
  const facingLabel = pending
    ? 'Choose'
    : ownedFacing.length
      ? ownedFacing.map((v) => v.name).join(' · ')
      : '—'
  const faceTint = ownedFacing[0] ? (ownedFacing[0].safe ? '#7cc47f' : '#e0a64a') : sil?.tint ?? '#c9a15a'
  const upkeepMin = BUILD_TRACKS.reduce((n, t) => n + (t.tiers[s.builds?.[t.id] ?? 0]?.upkeepPerMin ?? 0), 0)

  return (
    <RoomScene
      label={`Build site, ${tiers} tiers built${queued ? `, ${queued} queued` : ''}`}
      chips={[
        { label: 'Building', value: sil?.label ?? 'Site' },
        { label: 'Level', value: String(focusLvl) },
        { label: 'Facing', value: facingLabel.length > 18 ? facingLabel.slice(0, 16) + '…' : facingLabel },
        { label: 'Upkeep', value: upkeepMin > 0 ? `$${upkeepMin}/min` : 'none' },
      ]}
      phoneChipsOnly
      skyTop="#1c2530"
      skyBottom="#34402f"
    >
      {/* Selected track as the room's main mass */}
      {sil ? (
        <Hit
          x={70}
          y={55}
          w={sil.w + 80}
          h={sil.h + 90}
          label={pending ? `Facing open on ${sil.label}` : `Selected ${sil.label}`}
          coachId={focusTrack ? `build-${focusTrack}` : 'build-storefront'}
          menu="build"
        >
          <g transform={`translate(90 ${ROOM_GROUND})`}>
            <rect
              className={pulse || pending ? 'ls-queue-pulse' : undefined}
              x="0"
              y={-sil.h - focusLvl * 4}
              width={sil.w + 40}
              height={sil.h + focusLvl * 4}
              rx="4"
              fill={faceTint}
              opacity="0.42"
              stroke={faceTint}
              strokeWidth="2.5"
              strokeDasharray={pending ? '6 4' : queued === focus ? '5 4' : undefined}
            />
            {/* Facade / facing strip */}
            <rect
              x="8"
              y={-sil.h - focusLvl * 4 + 8}
              width={(sil.w + 40) * 0.55}
              height={Math.max(18, sil.h * 0.35)}
              rx="2"
              fill={pending ? '#efe9dc' : faceTint}
              opacity={pending ? 0.55 : 0.85}
            />
            {Array.from({ length: Math.min(4, Math.max(1, focusLvl)) }, (_, i) => (
              <rect
                key={i}
                x={14 + i * 18}
                y={-28 - i * 2}
                width="12"
                height="18"
                fill="#0f1317"
                opacity="0.45"
              />
            ))}
            <text x={(sil.w + 40) / 2} y={16} textAnchor="middle" fontSize="12" fill="#efe9dc" fontWeight="700">
              {sil.label}
            </text>
            <text x={(sil.w + 40) / 2} y={32} textAnchor="middle" fontSize="9" fill="#9aa7b4">
              {pending ? 'Facing open' : ownedFacing[0] ? BUILD_VARIANT_BY_ID[ownedFacing[0].id]?.name : `Tier ${focusLvl}`}
            </text>
          </g>
          <Sign x={90} y={88} text={`${floors} floor${floors === 1 ? '' : 's'} · ${tiers} tiers`} />
        </Hit>
      ) : (
        <Hit x={80} y={70} w={220} h={180} label="Scaffold" coachId="build-storefront" menu="build">
          <g transform={`translate(100 ${ROOM_GROUND})`}>
            <rect x="0" y={-18 * floors} width="170" height={18 * floors} fill="#3a342d" opacity="0.9" />
            {Array.from({ length: floors + 1 }, (_, i) => (
              <path key={i} d={`M-8 ${-i * 18} H178`} stroke="#8a96a2" strokeWidth="2" />
            ))}
          </g>
          <Sign x={100} y={88} text="Pick a track" />
        </Hit>
      )}

      <CrateStack x={380} y={ROOM_GROUND - 30} count={Math.min(12, tiers)} cap={12} />
      <Sign x={380} y={ROOM_GROUND + 10} text={`${ownedTracks}/${trackCount} tracks`} small />

      {queued ? (
        <>
          <Crane x={560} y={98} swing={0.6} />
          <Beam x={620} y={96} h={40} color="#e0a64a" />
        </>
      ) : null}

      <Person x={480} y={ROOM_GROUND - 10} tint="#e0a64a" delay={0.4} working={!!queued || !!pending} />
      <Person x={530} y={ROOM_GROUND - 10} tint="#9fb9d4" delay={1.1} scale={0.9} working={!!pending} />
    </RoomScene>
  )
}

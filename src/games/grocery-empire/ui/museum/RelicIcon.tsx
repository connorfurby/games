import { memo, type ReactElement } from 'react'
import { RARITY_INFO, RELIC_BY_ID, WING_BY_ID, relicSeed, type Glyph, type Rarity } from '../../content/relics'

/**
 * Procedural relic art: a rarity frame (plate → tile → hex → star badge → sunburst →
 * aurora) around one of ~57 hand-drawn glyphs, tinted by the relic's wing and nudged
 * by its id so no two relics look the same. `shadow` draws the uncollected silhouette.
 */

interface Ink {
  m: string // main
  a: string // accent
  d: string // dark
  l: string // light
}

type Draw = (c: Ink) => ReactElement

const G: Record<Glyph, Draw> = {
  can: (c) => (
    <g>
      <rect x="34" y="30" width="32" height="42" rx="4" fill={c.m} />
      <ellipse cx="50" cy="30" rx="16" ry="4" fill={c.l} />
      <rect x="34" y="42" width="32" height="16" fill={c.a} />
      <ellipse cx="50" cy="72" rx="16" ry="4" fill={c.d} />
    </g>
  ),
  jar: (c) => (
    <g>
      <rect x="38" y="26" width="24" height="8" rx="2" fill={c.d} />
      <path d="M36 36h28l4 8v26a6 6 0 0 1-6 6H38a6 6 0 0 1-6-6V44z" fill={c.m} />
      <rect x="38" y="48" width="24" height="14" rx="2" fill={c.a} />
      <circle cx="46" cy="54" r="2.5" fill={c.l} />
      <circle cx="54" cy="56" r="2" fill={c.l} />
    </g>
  ),
  bottle: (c) => (
    <g>
      <rect x="45" y="22" width="10" height="10" fill={c.d} />
      <path d="M44 32h12l6 12v30a4 4 0 0 1-4 4H42a4 4 0 0 1-4-4V44z" fill={c.m} />
      <rect x="40" y="52" width="20" height="12" fill={c.a} />
      <rect x="44" y="40" width="4" height="30" rx="2" fill={c.l} opacity=".5" />
    </g>
  ),
  coin: (c) => (
    <g>
      <circle cx="50" cy="51" r="22" fill={c.d} />
      <circle cx="50" cy="49" r="22" fill={c.m} />
      <circle cx="50" cy="49" r="16" fill="none" stroke={c.a} strokeWidth="3" />
      <path d="M53 39c-6-2-11 0-11 4s11 3 11 8-6 6-11 4M48 36v28" stroke={c.d} strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  receipt: (c) => (
    <g>
      <path d="M34 24h32v50l-4-3-4 3-4-3-4 3-4-3-4 3-4-3-4 3z" fill={c.l} />
      {[34, 42, 50, 58].map((y) => (
        <rect key={y} x="39" y={y} width={y === 58 ? 12 : 22} height="3" rx="1.5" fill={c.d} opacity=".7" />
      ))}
      <rect x="51" y="58" width="10" height="3" rx="1.5" fill={c.a} />
    </g>
  ),
  bell: (c) => (
    <g>
      <path d="M50 24c-12 0-16 10-16 22v12l-6 6h44l-6-6V46c0-12-4-22-16-22z" fill={c.m} />
      <rect x="28" y="62" width="44" height="5" rx="2.5" fill={c.d} />
      <circle cx="50" cy="72" r="5" fill={c.a} />
      <path d="M40 40c1-6 4-9 8-10" stroke={c.l} strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  key: (c) => (
    <g>
      <circle cx="38" cy="40" r="12" fill={c.m} />
      <circle cx="38" cy="40" r="5" fill={c.d} />
      <rect x="46" y="37" width="28" height="6" rx="3" fill={c.m} />
      <rect x="62" y="43" width="5" height="9" fill={c.a} />
      <rect x="69" y="43" width="5" height="6" fill={c.a} />
    </g>
  ),
  crate: (c) => (
    <g>
      <rect x="28" y="32" width="44" height="40" rx="2" fill={c.m} />
      <path d="M28 32l44 40M72 32L28 72" stroke={c.d} strokeWidth="4" />
      <rect x="28" y="32" width="44" height="40" rx="2" fill="none" stroke={c.d} strokeWidth="4" />
      <rect x="28" y="28" width="44" height="6" fill={c.a} />
    </g>
  ),
  truck: (c) => (
    <g>
      <rect x="22" y="34" width="36" height="26" rx="2" fill={c.m} />
      <path d="M58 42h12l8 10v8H58z" fill={c.a} />
      <rect x="62" y="45" width="8" height="6" fill={c.l} />
      <circle cx="34" cy="64" r="6" fill={c.d} />
      <circle cx="68" cy="64" r="6" fill={c.d} />
    </g>
  ),
  cart: (c) => (
    <g>
      <path d="M22 30h8l6 28h32l6-20H34" fill="none" stroke={c.m} strokeWidth="5" strokeLinejoin="round" />
      <path d="M36 40h36l-4 14H38z" fill={c.a} opacity=".6" />
      <circle cx="40" cy="68" r="5" fill={c.d} />
      <circle cx="64" cy="68" r="5" fill={c.d} />
    </g>
  ),
  basket: (c) => (
    <g>
      <path d="M36 42c0-12 28-12 28 0" fill="none" stroke={c.d} strokeWidth="4" />
      <path d="M26 42h48l-6 30H32z" fill={c.m} />
      <path d="M36 46v22M44 46v22M52 46v22M60 46v22" stroke={c.d} strokeWidth="2" opacity=".5" />
      <rect x="24" y="40" width="52" height="6" rx="3" fill={c.a} />
    </g>
  ),
  apple: (c) => (
    <g>
      <path d="M50 36c-6-6-22-4-22 14 0 14 10 24 16 24 3 0 4-2 6-2s3 2 6 2c6 0 16-10 16-24 0-18-16-20-22-14z" fill={c.m} />
      <path d="M50 36c0-6 2-10 6-12" stroke={c.d} strokeWidth="3" fill="none" />
      <path d="M52 30c6-6 12-4 12-4s-2 8-12 6z" fill={c.a} />
      <ellipse cx="40" cy="46" rx="4" ry="6" fill={c.l} opacity=".45" />
    </g>
  ),
  carrot: (c) => (
    <g>
      <path d="M38 38l26 4-22 34z" fill={c.m} />
      <path d="M44 48l8 2M42 58l6 1" stroke={c.d} strokeWidth="2" />
      <path d="M52 40c-2-10 2-16 2-16M56 40c4-8 12-10 12-10M48 38c-6-6-6-14-6-14" stroke={c.a} strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  ),
  banana: (c) => (
    <g>
      <path d="M28 40c4 22 26 32 44 20-14 2-30-6-36-24z" fill={c.m} />
      <path d="M28 40l-2-6 6 2z" fill={c.d} />
      <path d="M34 42c6 14 18 20 30 18" stroke={c.a} strokeWidth="2" fill="none" />
    </g>
  ),
  egg: (c) => (
    <g>
      <path d="M50 24c-12 0-20 20-20 32a20 20 0 0 0 40 0c0-12-8-32-20-32z" fill={c.m} />
      <ellipse cx="42" cy="46" rx="4" ry="8" fill={c.l} opacity=".5" />
      <path d="M36 62l6-4 6 4 6-4 6 4 6-4" stroke={c.a} strokeWidth="2.5" fill="none" />
    </g>
  ),
  milk: (c) => (
    <g>
      <path d="M38 34l6-10h12l6 10v40H38z" fill={c.l} />
      <path d="M38 34h24v14H38z" fill={c.m} />
      <rect x="44" y="18" width="12" height="6" fill={c.a} />
      <circle cx="50" cy="60" r="6" fill={c.a} />
    </g>
  ),
  cheese: (c) => (
    <g>
      <path d="M24 66V46l48-16v36z" fill={c.m} />
      <path d="M24 46l48-16 4 6-52 10z" fill={c.l} />
      <circle cx="40" cy="56" r="4" fill={c.d} opacity=".5" />
      <circle cx="58" cy="52" r="3" fill={c.d} opacity=".5" />
      <circle cx="54" cy="62" r="2.5" fill={c.d} opacity=".5" />
    </g>
  ),
  bread: (c) => (
    <g>
      <path d="M24 54c0-16 12-24 26-24s26 8 26 24v14H24z" fill={c.m} />
      <path d="M36 40l-4 10M48 36l-3 12M60 38l-2 12" stroke={c.d} strokeWidth="3" strokeLinecap="round" />
      <rect x="24" y="64" width="52" height="6" rx="2" fill={c.a} />
    </g>
  ),
  fish: (c) => (
    <g>
      <path d="M24 50c10-14 30-16 42 0-12 16-32 14-42 0z" fill={c.m} />
      <path d="M66 50l12-10v20z" fill={c.a} />
      <circle cx="34" cy="48" r="3" fill={c.d} />
      <path d="M44 42c4 4 4 12 0 16M52 42c4 4 4 12 0 16" stroke={c.l} strokeWidth="2" fill="none" opacity=".6" />
    </g>
  ),
  snowflake: (c) => (
    <g stroke={c.m} strokeWidth="4.5" strokeLinecap="round">
      {[0, 60, 120].map((r) => (
        <g key={r} transform={`rotate(${r} 50 50)`}>
          <path d="M50 24v52M42 30l8 8 8-8M42 70l8-8 8 8" fill="none" />
        </g>
      ))}
      <circle cx="50" cy="50" r="5" fill={c.a} stroke="none" />
    </g>
  ),
  thermo: (c) => (
    <g>
      <rect x="44" y="20" width="12" height="44" rx="6" fill={c.l} />
      <circle cx="50" cy="68" r="10" fill={c.m} />
      <rect x="47" y="36" width="6" height="30" fill={c.m} />
      {[28, 36, 44, 52].map((y) => (
        <rect key={y} x="58" y={y} width="7" height="2.5" fill={c.a} />
      ))}
    </g>
  ),
  ice: (c) => (
    <g>
      <path d="M30 38l20-10 20 10v26L50 74 30 64z" fill={c.m} opacity=".85" />
      <path d="M30 38l20 10 20-10M50 48v26" stroke={c.l} strokeWidth="2" fill="none" />
      <path d="M36 42l8 4" stroke={c.a} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  moon: (c) => (
    <g>
      <path d="M58 24a26 26 0 1 0 16 44 22 22 0 1 1-16-44z" fill={c.m} />
      <circle cx="44" cy="50" r="3" fill={c.d} opacity=".4" />
      <circle cx="52" cy="62" r="4" fill={c.d} opacity=".4" />
      <path d="M68 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={c.a} />
    </g>
  ),
  lamp: (c) => (
    <g>
      <path d="M50 18v8" stroke={c.d} strokeWidth="3" />
      <path d="M36 26h28l-4 12H40z" fill={c.d} />
      <path d="M40 38h20l4 22H36z" fill={c.a} />
      <circle cx="50" cy="49" r="6" fill={c.l} />
      <rect x="38" y="60" width="24" height="8" rx="2" fill={c.m} />
    </g>
  ),
  mug: (c) => (
    <g>
      <rect x="30" y="36" width="32" height="36" rx="4" fill={c.m} />
      <path d="M62 42h6a8 8 0 0 1 0 16h-6" fill="none" stroke={c.m} strokeWidth="5" />
      <rect x="30" y="36" width="32" height="6" fill={c.d} />
      <path d="M38 22c-2 4 2 6 0 10M48 22c-2 4 2 6 0 10" stroke={c.a} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  ),
  star: (c) => (
    <g>
      <path d="M50 20l9 20 21 2-16 14 5 21-19-11-19 11 5-21-16-14 21-2z" fill={c.m} />
      <path d="M50 30l5 12 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill={c.a} />
    </g>
  ),
  crown: (c) => (
    <g>
      <path d="M24 66l-2-30 16 12 12-20 12 20 16-12-2 30z" fill={c.m} />
      <rect x="24" y="64" width="52" height="8" rx="2" fill={c.d} />
      <circle cx="38" cy="58" r="3.5" fill={c.a} />
      <circle cx="50" cy="56" r="4" fill={c.l} />
      <circle cx="62" cy="58" r="3.5" fill={c.a} />
    </g>
  ),
  trophy: (c) => (
    <g>
      <path d="M34 24h32v14a16 16 0 0 1-32 0z" fill={c.m} />
      <path d="M34 28h-8c0 10 4 14 10 14M66 28h8c0 10-4 14-10 14" fill="none" stroke={c.m} strokeWidth="4" />
      <rect x="46" y="54" width="8" height="10" fill={c.d} />
      <rect x="36" y="64" width="28" height="8" rx="2" fill={c.a} />
    </g>
  ),
  gavel: (c) => (
    <g>
      <rect x="30" y="30" width="30" height="14" rx="3" transform="rotate(-30 45 37)" fill={c.m} />
      <rect x="48" y="40" width="6" height="34" rx="3" transform="rotate(-30 51 57)" fill={c.d} />
      <rect x="22" y="68" width="34" height="6" rx="2" fill={c.a} />
    </g>
  ),
  case: (c) => (
    <g>
      <rect x="40" y="26" width="20" height="10" rx="3" fill="none" stroke={c.d} strokeWidth="4" />
      <rect x="24" y="34" width="52" height="36" rx="4" fill={c.m} />
      <rect x="24" y="46" width="52" height="4" fill={c.d} />
      <rect x="45" y="44" width="10" height="8" rx="1" fill={c.a} />
    </g>
  ),
  chart: (c) => (
    <g>
      <rect x="26" y="26" width="48" height="48" rx="4" fill={c.l} />
      <rect x="32" y="54" width="7" height="14" fill={c.m} />
      <rect x="43" y="46" width="7" height="22" fill={c.m} />
      <rect x="54" y="38" width="7" height="30" fill={c.m} />
      <path d="M32 44l12-8 10 4 14-10" stroke={c.a} strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  scroll: (c) => (
    <g>
      <rect x="32" y="28" width="36" height="44" fill={c.l} />
      <rect x="28" y="24" width="44" height="8" rx="4" fill={c.m} />
      <rect x="28" y="68" width="44" height="8" rx="4" fill={c.m} />
      {[38, 45, 52, 59].map((y) => (
        <rect key={y} x="37" y={y} width="26" height="2.5" fill={c.d} opacity=".6" />
      ))}
      <circle cx="60" cy="62" r="4" fill={c.a} />
    </g>
  ),
  anchor: (c) => (
    <g fill="none" stroke={c.m} strokeWidth="5" strokeLinecap="round">
      <circle cx="50" cy="28" r="5" />
      <path d="M50 33v40M38 44h24M28 58c2 10 12 16 22 16s20-6 22-16" />
      <path d="M24 60l4-4 4 4M68 60l4-4 4 4" stroke={c.a} />
    </g>
  ),
  compass: (c) => (
    <g>
      <circle cx="50" cy="50" r="24" fill={c.d} />
      <circle cx="50" cy="50" r="20" fill={c.l} />
      <path d="M50 32l6 18-6 18-6-18z" fill={c.m} />
      <path d="M50 32l6 18H44z" fill={c.a} />
      <circle cx="50" cy="50" r="3" fill={c.d} />
    </g>
  ),
  ship: (c) => (
    <g>
      <path d="M22 58h56l-8 14H30z" fill={c.m} />
      <rect x="30" y="44" width="10" height="14" fill={c.a} />
      <rect x="42" y="40" width="10" height="18" fill={c.l} />
      <rect x="54" y="46" width="10" height="12" fill={c.a} />
      <path d="M20 76c6-3 10 3 16 0s10 3 16 0 10 3 16 0 10 3 12 0" stroke={c.l} strokeWidth="2.5" fill="none" />
    </g>
  ),
  globe: (c) => (
    <g>
      <circle cx="50" cy="48" r="24" fill={c.m} />
      <path d="M36 36c6 2 8 8 4 12s2 10 8 8M58 30c-2 6 4 8 8 6M60 58c4-2 8 0 10 4" stroke={c.a} strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="48" rx="24" ry="8" fill="none" stroke={c.l} strokeWidth="1.5" opacity=".6" />
      <rect x="40" y="72" width="20" height="5" rx="2" fill={c.d} />
    </g>
  ),
  rocket: (c) => (
    <g>
      <path d="M50 20c10 8 14 22 12 40H38c-2-18 2-32 12-40z" fill={c.l} />
      <circle cx="50" cy="40" r="6" fill={c.m} />
      <path d="M38 52l-8 12h10M62 52l8 12H60" fill={c.a} />
      <path d="M44 62c0 8 6 14 6 14s6-6 6-14z" fill={c.m} />
    </g>
  ),
  planet: (c) => (
    <g>
      <circle cx="50" cy="50" r="18" fill={c.m} />
      <path d="M40 42c6 4 14 4 20 0M38 54c8 4 16 4 24 0" stroke={c.d} strokeWidth="2.5" fill="none" opacity=".5" />
      <ellipse cx="50" cy="52" rx="32" ry="8" fill="none" stroke={c.a} strokeWidth="4" transform="rotate(-18 50 52)" />
    </g>
  ),
  satellite: (c) => (
    <g>
      <rect x="22" y="40" width="18" height="14" fill={c.a} transform="rotate(-20 31 47)" />
      <rect x="60" y="40" width="18" height="14" fill={c.a} transform="rotate(-20 69 47)" />
      <rect x="42" y="38" width="16" height="20" rx="3" fill={c.m} transform="rotate(-20 50 48)" />
      <path d="M50 60v12M44 74h12" stroke={c.d} strokeWidth="3" />
      <circle cx="50" cy="34" r="3" fill={c.l} />
    </g>
  ),
  hourglass: (c) => (
    <g>
      <rect x="30" y="22" width="40" height="6" rx="2" fill={c.d} />
      <rect x="30" y="72" width="40" height="6" rx="2" fill={c.d} />
      <path d="M34 28h32c0 12-12 16-12 22s12 10 12 22H34c0-12 12-16 12-22s-12-10-12-22z" fill={c.l} opacity=".8" />
      <path d="M40 36h20c-2 6-8 8-10 12-2-4-8-6-10-12zM38 70c2-6 8-10 12-10s10 4 12 10z" fill={c.m} />
    </g>
  ),
  laurel: (c) => (
    <g>
      <path d="M46 74C30 68 24 50 30 30M54 74c16-6 22-24 16-44" stroke={c.d} strokeWidth="3" fill="none" strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => {
        const t = i / 4
        const ly = 70 - t * 38
        const lx = 34 - Math.sin(t * 2.2) * 6
        const rx = 66 + Math.sin(t * 2.2) * 6
        return (
          <g key={i}>
            <ellipse cx={lx - 5} cy={ly} rx="7" ry="3.6" transform={`rotate(${-40 + t * 20} ${lx - 5} ${ly})`} fill={c.m} />
            <ellipse cx={lx + 4} cy={ly - 4} rx="6" ry="3.2" transform={`rotate(${-110 + t * 20} ${lx + 4} ${ly - 4})`} fill={c.a} />
            <ellipse cx={rx + 5} cy={ly} rx="7" ry="3.6" transform={`rotate(${40 - t * 20} ${rx + 5} ${ly})`} fill={c.m} />
            <ellipse cx={rx - 4} cy={ly - 4} rx="6" ry="3.2" transform={`rotate(${110 - t * 20} ${rx - 4} ${ly - 4})`} fill={c.a} />
          </g>
        )
      })}
      <circle cx="50" cy="74" r="5" fill={c.l} />
    </g>
  ),
  gem: (c) => (
    <g>
      <path d="M34 34h32l10 12-26 30-26-30z" fill={c.m} />
      <path d="M34 34l8 12h16l8-12M24 46h52M42 46l8 30 8-30" stroke={c.l} strokeWidth="1.8" fill="none" opacity=".75" />
      <path d="M42 46h16l-8-12z" fill={c.a} opacity=".7" />
    </g>
  ),
  ghost: (c) => (
    <g>
      <path d="M30 74V46a20 20 0 0 1 40 0v28l-7-6-6 6-7-6-7 6-6-6z" fill={c.l} />
      <circle cx="43" cy="46" r="4" fill={c.d} />
      <circle cx="57" cy="46" r="4" fill={c.d} />
      <ellipse cx="50" cy="58" rx="4" ry="3" fill={c.m} />
    </g>
  ),
  eye: (c) => (
    <g>
      <path d="M20 50c10-16 50-16 60 0-10 16-50 16-60 0z" fill={c.l} />
      <circle cx="50" cy="50" r="12" fill={c.m} />
      <circle cx="50" cy="50" r="5" fill={c.d} />
      <circle cx="46" cy="46" r="2.5" fill={c.l} />
      <path d="M24 38l-4-6M50 32v-7M76 38l4-6" stroke={c.a} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  flame: (c) => (
    <g>
      <path d="M50 20c4 14 20 18 20 36a20 20 0 0 1-40 0c0-10 6-14 8-22 4 6 4 10 8 12 2-8 0-16 4-26z" fill={c.m} />
      <path d="M50 46c2 6 10 8 10 16a10 10 0 0 1-20 0c0-6 6-8 10-16z" fill={c.a} />
    </g>
  ),
  clock: (c) => (
    <g>
      <circle cx="50" cy="50" r="24" fill={c.m} />
      <circle cx="50" cy="50" r="19" fill={c.l} />
      <path d="M50 38v13l9 6" stroke={c.d} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <rect x="44" y="20" width="12" height="6" rx="2" fill={c.a} />
    </g>
  ),
  magnet: (c) => (
    <g>
      <path d="M30 30v20a20 20 0 0 0 40 0V30H58v20a8 8 0 0 1-16 0V30z" fill={c.m} />
      <rect x="30" y="26" width="12" height="10" fill={c.l} />
      <rect x="58" y="26" width="12" height="10" fill={c.l} />
      <path d="M24 74l6-6M50 78v-6M76 74l-6-6" stroke={c.a} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  tag: (c) => (
    <g>
      <path d="M26 30h28l22 22-24 24-26-26z" fill={c.m} />
      <circle cx="36" cy="40" r="5" fill={c.d} />
      <path d="M48 52l10 10M44 58l8 8" stroke={c.a} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  scale: (c) => (
    <g>
      <path d="M50 24v46M30 34h40" stroke={c.d} strokeWidth="4" strokeLinecap="round" />
      <path d="M22 52l8-18 8 18z" fill={c.m} />
      <path d="M62 52l8-18 8 18z" fill={c.m} />
      <path d="M20 52h20a10 10 0 0 1-20 0zM60 52h20a10 10 0 0 1-20 0z" fill={c.a} />
      <rect x="38" y="70" width="24" height="6" rx="2" fill={c.d} />
    </g>
  ),
  chalk: (c) => (
    <g>
      <rect x="24" y="26" width="52" height="40" rx="3" fill={c.d} />
      <rect x="24" y="26" width="52" height="40" rx="3" fill="none" stroke={c.m} strokeWidth="4" />
      <path d="M32 38h20M32 46h28M32 54h14" stroke={c.l} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M36 66l-6 10M64 66l6 10" stroke={c.m} strokeWidth="4" />
    </g>
  ),
  broom: (c) => (
    <g>
      <rect x="47" y="18" width="6" height="36" rx="3" fill={c.d} transform="rotate(12 50 36)" />
      <path d="M38 52h24l8 24H30z" fill={c.m} />
      <path d="M38 60v14M46 60v16M54 60v16M62 60v14" stroke={c.d} strokeWidth="2" opacity=".5" />
      <rect x="38" y="52" width="24" height="6" fill={c.a} />
    </g>
  ),
  hat: (c) => (
    <g>
      <ellipse cx="50" cy="64" rx="28" ry="7" fill={c.d} />
      <path d="M36 64V36a14 6 0 0 1 28 0v28z" fill={c.m} />
      <rect x="36" y="52" width="28" height="6" fill={c.a} />
    </g>
  ),
  ticket: (c) => (
    <g>
      <path d="M24 36h52v8a6 6 0 0 0 0 12v8H24v-8a6 6 0 0 0 0-12z" fill={c.m} />
      <path d="M58 36v28" stroke={c.d} strokeWidth="2" strokeDasharray="3 3" />
      <path d="M34 46h16M34 54h10" stroke={c.l} strokeWidth="3" strokeLinecap="round" />
      <circle cx="67" cy="50" r="4" fill={c.a} />
    </g>
  ),
  die: (c) => (
    <g>
      <rect x="28" y="28" width="44" height="44" rx="8" fill={c.l} />
      {[
        [38, 38],
        [62, 38],
        [50, 50],
        [38, 62],
        [62, 62],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="4.5" fill={x === 50 ? c.a : c.m} />
      ))}
    </g>
  ),
  feather: (c) => (
    <g>
      <path d="M68 22C44 26 30 46 32 70c22-4 38-24 36-48z" fill={c.m} />
      <path d="M66 26L30 78" stroke={c.d} strokeWidth="2.5" />
      <path d="M58 34l-10 2M54 44l-12 2M48 54l-10 2" stroke={c.a} strokeWidth="2" />
    </g>
  ),
  mask: (c) => (
    <g>
      <path d="M24 40c10-8 42-8 52 0 0 18-10 30-26 30S24 58 24 40z" fill={c.m} />
      <ellipse cx="40" cy="46" rx="6" ry="4" fill={c.d} />
      <ellipse cx="60" cy="46" rx="6" ry="4" fill={c.d} />
      <path d="M42 60c4 4 12 4 16 0" stroke={c.a} strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  map: (c) => (
    <g>
      <path d="M24 30l16-6 20 6 16-6v46l-16 6-20-6-16 6z" fill={c.l} />
      <path d="M40 24v46M60 30v46" stroke={c.d} strokeWidth="1.5" opacity=".4" />
      <path d="M30 56c6-6 12 2 18-4s12-2 16-10" stroke={c.m} strokeWidth="3" fill="none" strokeDasharray="4 3" />
      <path d="M64 38l4 4M68 38l-4 4" stroke={c.a} strokeWidth="3" />
    </g>
  ),
}

function ink(hue: number, seed: number): Ink {
  const h = (hue + ((seed % 41) - 20) + 360) % 360
  const h2 = (h + 30 + (seed % 3) * 25) % 360
  return {
    m: `hsl(${h} 58% 60%)`,
    a: `hsl(${h2} 72% 70%)`,
    d: `hsl(${h} 38% 24%)`,
    l: `hsl(${h} 45% 88%)`,
  }
}

const SHADOW: Ink = { m: '#0c1013', a: '#11171b', d: '#080b0d', l: '#141a1e' }

function poly(n: number, r: number, rot = 0, cx = 50, cy = 50): string {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
}

function star(n: number, r1: number, r2: number, rot = -Math.PI / 2): string {
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = rot + (i / (n * 2)) * Math.PI * 2
    const r = i % 2 ? r2 : r1
    return `${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
}

function Frame({ rarity, color, shadow, uid }: { rarity: Rarity; color: string; shadow: boolean; uid: string }) {
  const fill = shadow ? '#151b1f' : `url(#rf-${uid})`
  const stroke = shadow ? 'rgba(255,255,255,0.16)' : color
  const sw = shadow ? 1.5 : 3
  const dash = shadow ? '4 4' : undefined
  switch (rarity) {
    case 'common':
      return <circle cx="50" cy="50" r="44" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
    case 'uncommon':
      return <rect x="7" y="7" width="86" height="86" rx="18" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
    case 'rare':
      return <polygon points={poly(6, 46, Math.PI / 6)} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
    case 'epic':
      return <polygon points={star(8, 47, 40)} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
    case 'legendary':
      return (
        <g>
          {!shadow ? <polygon points={star(16, 49, 36)} fill={color} opacity=".35" className="rl-rays" /> : null}
          <circle cx="50" cy="50" r="40" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
          {!shadow ? <circle cx="50" cy="50" r="34" fill="none" stroke={color} strokeWidth="1" opacity=".6" /> : null}
        </g>
      )
    case 'mythic':
      return (
        <g>
          {!shadow ? (
            <g className="rl-rays">
              <polygon points={star(12, 50, 30)} fill={`url(#rm-${uid})`} opacity=".6" />
            </g>
          ) : null}
          <polygon points={poly(8, 42, Math.PI / 8)} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
          {!shadow ? <polygon points={poly(8, 36, Math.PI / 8)} fill="none" stroke="#fff" strokeWidth="1" opacity=".4" /> : null}
        </g>
      )
  }
}

export const RelicIcon = memo(function RelicIcon({
  id,
  shadow = false,
  size = 64,
  className = '',
}: {
  id: string
  shadow?: boolean
  size?: number
  className?: string
}) {
  const r = RELIC_BY_ID[id]
  if (!r) return null
  const seed = relicSeed(id)
  const hue = WING_BY_ID[r.wing].hue
  const rc = RARITY_INFO[r.rarity]
  const c = shadow ? SHADOW : ink(hue, seed)
  const uid = id.replace(/[^a-z0-9]/gi, '')
  const draw = G[r.glyph] ?? G.star
  // Small per-relic marks so two relics with one glyph still differ.
  const marks = seed % 4
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`rl-icon rl-icon--${r.rarity}${shadow ? ' is-shadow' : ''} ${className}`.trim()}
      role="img"
      aria-label={shadow ? 'Unknown relic' : r.name}
    >
      <defs>
        <radialGradient id={`rf-${uid}`} cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor={`hsl(${hue} 30% 26%)`} />
          <stop offset="1" stopColor={`hsl(${hue} 30% 10%)`} />
        </radialGradient>
        <linearGradient id={`rm-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6b8b" />
          <stop offset=".5" stopColor="#ffd36b" />
          <stop offset="1" stopColor="#6bd5ff" />
        </linearGradient>
      </defs>
      <Frame rarity={r.rarity} color={rc.color} shadow={shadow} uid={uid} />
      <g
        transform="translate(50 50) scale(0.82) translate(-50 -50)"
        style={shadow ? { stroke: 'rgba(255,255,255,0.22)', strokeWidth: 1.2 } : undefined}
      >
        {draw(c)}
      </g>
      {!shadow && marks > 0 ? (
        <g fill={rc.color}>
          {Array.from({ length: marks }, (_, i) => (
            <circle key={i} cx={50 + (i - (marks - 1) / 2) * 7} cy="88" r="2" />
          ))}
        </g>
      ) : null}
    </svg>
  )
})

/** Chest art by rarity, with an optional open lid (for the reveal). */
export function ChestArt({ rarity, open = false, size = 96 }: { rarity: Rarity; open?: boolean; size?: number }) {
  const rc = RARITY_INFO[rarity]
  const tier = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].indexOf(rarity)
  const wood = ['#8a5a34', '#6f6a3a', '#3e5f80', '#5a3f82', '#8a6a1e', '#7a2f4a'][tier]
  return (
    <svg viewBox="0 0 120 110" width={size} height={size * (110 / 120)} className={`ch-art ch-art--${rarity}`} aria-hidden>
      <defs>
        <linearGradient id={`chw-${rarity}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={wood} />
          <stop offset="1" stopColor="#1c120b" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="100" rx="44" ry="6" fill="#000" opacity=".35" />
      <rect x="16" y="52" width="88" height="46" rx="6" fill={`url(#chw-${rarity})`} stroke={rc.color} strokeWidth="3" />
      <rect x="16" y="66" width="88" height="6" fill={rc.color} opacity=".85" />
      <rect x="28" y="52" width="6" height="46" fill={rc.color} opacity=".5" />
      <rect x="86" y="52" width="6" height="46" fill={rc.color} opacity=".5" />
      <g className="ch-lid" style={{ transformOrigin: '16px 52px', transform: open ? 'rotate(-38deg) translate(-6px,-8px)' : undefined }}>
        <path d="M16 52v-12c0-16 20-26 44-26s44 10 44 26v12z" fill={`url(#chw-${rarity})`} stroke={rc.color} strokeWidth="3" />
        <path d="M28 52V32M92 52V32" stroke={rc.color} strokeWidth="5" opacity=".5" />
      </g>
      <rect x="52" y="58" width="16" height="18" rx="3" fill={rc.color} />
      <circle cx="60" cy="66" r="3" fill="#1c120b" />
      {tier >= 3 ? <circle cx="60" cy="32" r="4" fill={rc.glow} className="ch-gem" /> : null}
    </svg>
  )
}

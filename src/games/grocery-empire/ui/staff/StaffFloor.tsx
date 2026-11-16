import type { CSSProperties, ReactNode } from 'react'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { HORIZON_ROLE_IDS, ROLES, isHorizonRole, type RoleId } from '../../content/staff'
import { sumQty } from '../../sim/helpers'
import type { Batch, StaffMember } from '../../sim/state'
import { rate } from '../format'
import { Badge, Hit, Person as RoomPerson, ROOM_W, Register, ShelfBay, Sign } from '../scenes/room'
import { usePhone } from '../kit/hooks'
import { RoomChips, RoomHud, type RoomHudChip } from '../scenes/room/RoomHud'
import { BAND_TOP } from '../scenes/room/RoomScene'
import '../scenes/room/room.css'

/**
 * Store floor plan (960 wide) with live shelf fills, station badges,
 * and — from Era 7 — the Worlds annex. Layout keeps people clear of shelves
 * and keeps the bottleneck line in the HUD (no overlapping banner).
 */

const SHIRT: Record<RoleId, string> = {
  clerk: '#c9a15a',
  receiver: '#b8956a',
  stocker: '#7cc47f',
  cashier: '#7fa3c9',
  security: '#3a4048',
  night: '#6d5a8a',
  shiftLead: '#d4b06a',
  produceLead: '#6fbf73',
  dairyClerk: '#8fb6e0',
  butcher: '#d9665b',
  storeManager: '#b8a070',
  plantOperator: '#6a9bb8',
  coldDriver: '#5a8fa8',
  lobbyistPerson: '#c9a070',
  dispatcher: '#6a90b0',
  franchiseLiaison: '#c4a878',
  purser: '#b89860',
  pilot: '#7a9ab8',
  steward: '#c8b890',
  hullTech: '#8a9aa8',
  surveyor: '#d7c4a1',
  planogramClerk: '#cbb896',
  broker: '#8fb6e0',
  stevedore: '#6a90b0',
  grower: '#6fbf73',
  seasonHand: '#5aaa70',
  taster: '#e0a060',
  translator: '#c9a0d4',
  nightOperator: '#6d5a8a',
  handler: '#7aa0b8',
  diplomat: '#e8d7a0',
  minutesClerk: '#c9a070',
  whip: '#b89860',
}

const CAT_TINT: Record<CategoryId, string> = {
  cans: '#c9a15a',
  household: '#a89880',
  produce: '#7cc47f',
  dairy: '#8fb6e0',
  meat: '#d9665b',
  deli: '#d98a5b',
  bakery: '#d4b06a',
  frozen: '#7ab0d4',
  privateLabel: '#c3aaf0',
  import: '#b89a6a',
  ration: '#9a8a6a',
}

/** Floor stations — kept below shelf art (shelf ends ~y 150). */
const STATION: Partial<Record<RoleId, { x: number; y: number }[]>> = {
  clerk: [
    { x: 56, y: 188 },
    { x: 100, y: 188 },
    { x: 144, y: 188 },
    { x: 78, y: 214 },
  ],
  stocker: [
    { x: 250, y: 188 },
    { x: 300, y: 188 },
    { x: 350, y: 188 },
    { x: 400, y: 214 },
  ],
  cashier: [
    { x: 560, y: 188 },
    { x: 620, y: 188 },
    { x: 590, y: 214 },
    { x: 650, y: 214 },
  ],
  security: [
    { x: 820, y: 170 },
    { x: 870, y: 198 },
  ],
  night: [
    { x: 470, y: 198 },
    { x: 510, y: 214 },
  ],
  receiver: [
    { x: 200, y: 214 },
    { x: 230, y: 214 },
  ],
  shiftLead: [
    { x: 170, y: 188 },
    { x: 190, y: 214 },
  ],
  produceLead: [
    { x: 280, y: 214 },
    { x: 320, y: 214 },
  ],
  dairyClerk: [
    { x: 360, y: 214 },
    { x: 390, y: 214 },
  ],
  butcher: [
    { x: 430, y: 214 },
    { x: 460, y: 214 },
  ],
}

const BOTTLENECK_WORD: Record<string, string> = {
  demand: 'Shoppers',
  unpack: 'Unpack',
  checkout: 'Checkout',
  shelf: 'Shelf',
}

const DESK_LABEL: Record<(typeof HORIZON_ROLE_IDS)[number], string> = {
  surveyor: 'Probe',
  planogramClerk: 'Shelf',
  broker: 'Route',
  stevedore: 'Dock',
  grower: 'Beds',
  seasonHand: 'Chore',
  taster: 'Taste',
  translator: 'Wire',
  nightOperator: 'Night',
  handler: 'Agent',
  diplomat: 'Treaty',
  minutesClerk: 'Minutes',
  whip: 'Whip',
}

const ANNEX_MENU: Record<(typeof HORIZON_ROLE_IDS)[number], string> = {
  surveyor: 'planets',
  planogramClerk: 'planets',
  broker: 'exchange',
  stevedore: 'exchange',
  grower: 'cultivars',
  seasonHand: 'cultivars',
  taster: 'cultivars',
  translator: 'signal',
  nightOperator: 'signal',
  handler: 'signal',
  diplomat: 'charter',
  minutesClerk: 'charter',
  whip: 'charter',
}

const FLOOR_H = 248
const ANNEX_H = 168
const DESK_X0 = 36
const DESK_STEP = 130
const SEAT_DX = [0, -22, 22]

function deskX(i: number) {
  return DESK_X0 + i * DESK_STEP
}

export function StaffFloor({
  roster,
  bottleneck,
  bottleneckLabel,
  motion,
  era = 0,
  working = [],
  shelf = [],
  shelfCapacity = 40,
  wagesPerSec = 0,
  annexStaffed = 0,
  unlockedCats,
}: {
  roster: StaffMember[]
  bottleneck: string
  bottleneckLabel?: string
  motion: boolean
  era?: number
  working?: readonly number[]
  shelf?: Batch[]
  shelfCapacity?: number
  wagesPerSec?: number
  annexStaffed?: number
  unlockedCats?: CategoryId[]
}) {
  const placed: { m: StaffMember; x: number; y: number }[] = []
  const overflow: Record<string, number> = {}
  const used: Record<string, number> = {}
  const annexOn = era >= 7
  const lit = new Set(working)
  const counts: Partial<Record<RoleId, number>> = {}

  for (const m of roster) {
    counts[m.role] = (counts[m.role] ?? 0) + 1
    const i = used[m.role] ?? 0
    used[m.role] = i + 1
    if (isHorizonRole(m.role)) continue
    const slot = STATION[m.role]?.[i]
    if (!slot) {
      overflow[m.role] = (overflow[m.role] ?? 0) + 1
      continue
    }
    placed.push({ m, x: slot.x, y: slot.y })
  }

  const annexPeople: { m: StaffMember; x: number; y: number; desk: number; on: boolean }[] = []
  const annexByRole: Partial<Record<RoleId, number>> = {}
  if (annexOn) {
    const seat: Record<string, number> = {}
    for (const m of roster) {
      if (!isHorizonRole(m.role)) continue
      annexByRole[m.role] = (annexByRole[m.role] ?? 0) + 1
      const desk = HORIZON_ROLE_IDS.indexOf(m.role)
      const k = seat[m.role] ?? 0
      seat[m.role] = k + 1
      const dx = SEAT_DX[k]
      if (dx === undefined) {
        overflow[m.role] = (overflow[m.role] ?? 0) + 1
        continue
      }
      annexPeople.push({ m, x: deskX(desk) + 32 + dx, y: FLOOR_H + 96, desk, on: lit.has(m.id) })
    }
  }

  const height = annexOn ? FLOOR_H + ANNEX_H : FLOOR_H
  const shownCats = (unlockedCats?.length ? unlockedCats : CATEGORY_IDS).slice(0, 6)
  const totalShelf = sumQty(shelf)
  const cap = Math.max(1, shelfCapacity)
  const perBay = Math.max(1, cap / Math.max(1, shownCats.length))

  const phone = usePhone()
  const clerkSlots = STATION.clerk?.length ?? 4
  const cashierSlots = STATION.cashier?.length ?? 4
  const clerks = counts.clerk ?? 0
  const cashiers = counts.cashier ?? 0
  const overflowN = Object.values(overflow).reduce((a, n) => a + n, 0)
  const headcount = roster.length
  // One word in the HUD chip so it never truncates when the room scales down to 390 px.
  // The full sentence lives in the caption and the panel tooltip.
  const bnShort = BOTTLENECK_WORD[bottleneck] ?? (bottleneck ? bottleneck.charAt(0).toUpperCase() + bottleneck.slice(1) : '—')

  const chips: RoomHudChip[] = [
    { label: 'Crew', value: String(headcount) },
    { label: 'Wages', value: rate(wagesPerSec) },
    { label: 'Limit', value: bnShort },
    ...(annexOn ? [{ label: 'Annex', value: String(annexStaffed || annexPeople.length) }] : []),
  ]

  // Phone: the same stations re-laid in portrait at close to 1:1, with the whole crew
  // standing in one row so nobody is cropped off the side.
  if (phone) {
    const PW = 360
    const PH = 296
    const groundY = PH - 52
    const crew = roster.filter((m) => !isHorizonRole(m.role))
    const row = crew.slice(0, 11)
    const bays = shownCats.slice(0, 4)
    return (
      <figure className={`sf rm rm--portrait${motion ? ' is-live' : ''}`}>
        <RoomChips chips={chips} label="Staff numbers" />
        <div className="rm-stage">
          <svg className="rm-svg" viewBox={`0 0 ${PW} ${PH}`} role="img" aria-label="Staff on the store floor">
            <defs>
              <linearGradient id="sf-sky-p" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#070b12" />
                <stop offset="1" stopColor="#1a2218" />
              </linearGradient>
            </defs>
            <rect width={PW} height={PH} fill="url(#sf-sky-p)" />
            <rect y={groundY} width={PW} height={PH - groundY} fill="#0c1014" />
            <rect y={groundY - 6} width={PW} height="6" fill="#1a1e24" />

            {/* Unload */}
            <rect x="8" y="10" width="118" height="96" rx="6" fill="#0a0e14" stroke="#ff5a43" strokeOpacity="0.4" />
            <Sign x={18} y={30} text="Unload" />
            <Badge x={18} y={38} text={clerks > clerkSlots ? `${clerks} clerks` : `${clerks}/${clerkSlots} clerks`} w={96} />
            {[0, 1, 2].map((i) => (
              <rect
                key={i}
                x={18 + i * 34}
                y={70}
                width="28"
                height="22"
                rx="3"
                fill={i < clerks ? '#ff5a43' : '#1a1512'}
                opacity={i < clerks ? 0.85 : 1}
              />
            ))}

            {/* Shelf */}
            <Sign x={140} y={30} text="Shelf" />
            <Badge x={186} y={16} text={`${Math.floor(totalShelf)}u`} w={52} />
            {bays.map((c, i) => (
              <ShelfBay
                key={c}
                x={140 + i * 52}
                y={40}
                w={44}
                h={66}
                fill={Math.min(1, sumQty(shelf, c) / perBay)}
                tint={CAT_TINT[c] ?? '#c9a15a'}
                label={CATEGORIES[c]?.short ?? c.slice(0, 3)}
                labelInside
              />
            ))}
            {shownCats.length > bays.length ? (
              <Sign x={352} y={30} text={`+${shownCats.length - bays.length} aisles`} small anchor="end" />
            ) : null}

            {/* Registers */}
            <Sign x={8} y={134} text="Registers" />
            <Badge x={88} y={120} text={cashiers > cashierSlots ? `${cashiers} on tills` : `${cashiers}/${cashierSlots} tills`} w={92} />
            <Register x={8} y={144} queue={bottleneck === 'checkout' ? Math.max(1, cashiers) : 0} />
            <Register x={78} y={144} queue={0} />
            {annexOn ? (
              <Badge x={196} y={120} text={`Annex ${annexStaffed || annexPeople.length}`} w={84} />
            ) : null}

            {/* The crew, one row */}
            {row.map((m, i) => {
              const on = lit.has(m.id)
              return (
                <g key={m.id} transform={`translate(${20 + i * 30} ${groundY - 24})`}>
                  <g className={`sf-person${motion && on ? ' is-live' : ''}${!on ? ' is-idle' : ''}`}>
                    <title>
                      {m.name} · {ROLES[m.role].name} · Lv {m.level}
                      {on ? ' · working' : ''}
                    </title>
                    <RoomPerson x={0} y={0} tint={SHIRT[m.role]} working={on} delay={(m.id % 5) * 0.2} />
                  </g>
                </g>
              )
            })}
            {roster.length === 0 ? (
              <text x={PW / 2} y={groundY - 22} textAnchor="middle" className="sf-empty">
                Nobody on the clock
              </text>
            ) : null}
            {crew.length > row.length ? (
              <Sign x={PW - 8} y={groundY + 22} text={`+${crew.length - row.length} more on the floor`} small anchor="end" />
            ) : null}
          </svg>
        </div>
        <figcaption>{bottleneckLabel ?? (roster.length === 0 ? 'Empty payroll.' : `${headcount} on the clock.`)}</figcaption>
      </figure>
    )
  }

  return (
    <figure className={`sf rm${phone ? ' rm--band' : ''}${motion ? ' is-live' : ''}${annexOn ? ' has-annex' : ''}`}>
      {phone ? <RoomChips chips={chips} label="Staff numbers" /> : null}
      <div className="rm-stage">
      <svg
        className="rm-svg"
        viewBox={phone ? `0 ${BAND_TOP} ${ROOM_W} ${height - BAND_TOP}` : `0 0 ${ROOM_W} ${height}`}
        role="img"
        aria-label="Staff on the store floor"
        style={phone ? { aspectRatio: `${ROOM_W} / ${height - BAND_TOP}` } : undefined}
      >
        <defs>
          <linearGradient id="sf-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#070b12" />
            <stop offset="1" stopColor="#1a2218" />
          </linearGradient>
        </defs>
        <rect width={ROOM_W} height={FLOOR_H} fill="url(#sf-sky)" />
        <rect y={FLOOR_H - 40} width={ROOM_W} height="40" fill="#0c1014" />
        <rect y={FLOOR_H - 44} width={ROOM_W} height="6" fill="#1a1e24" />

        {phone ? null : <RoomHud chips={chips} chipW={annexOn ? 148 : 170} />}

        {/* Unload / clerks — tomato free station */}
        <g>
          <rect x="28" y="52" width="168" height="52" rx="6" fill="#0a0e14" stroke="#ff5a43" strokeOpacity="0.4" />
          <Sign x={36} y={58} text="Unload" />
          <Badge x={96} y={44} text={clerks > clerkSlots ? `${clerks} clerks` : `${clerks}/${clerkSlots} clerks`} w={108} />
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={36 + i * 34}
              y={70}
              width="28"
              height="22"
              rx="3"
              fill={i < clerks ? '#ff5a43' : '#1a1512'}
              opacity={i < clerks ? 0.85 : 1}
            />
          ))}
        </g>

        {/* Shelf bays — labels inside bay so names never collide */}
        <g>
          <Sign x={230} y={58} text="Shelf" />
          <Badge x={280} y={44} text={`${Math.floor(totalShelf)}u`} w={52} />
          {shownCats.map((c, i) => {
            const n = sumQty(shelf, c)
            const fill = Math.min(1, n / perBay)
            return (
              <ShelfBay
                key={c}
                x={230 + i * 46}
                y={68}
                w={40}
                h={72}
                fill={fill}
                tint={CAT_TINT[c] ?? '#c9a15a'}
                label={CATEGORIES[c]?.short ?? c.slice(0, 3)}
                labelInside
              />
            )
          })}
        </g>

        {/* Registers */}
        <g>
          <Sign x={540} y={58} text="Registers" />
          <Badge x={620} y={44} text={cashiers > cashierSlots ? `${cashiers} on tills` : `${cashiers}/${cashierSlots} tills`} w={108} />
          <Register x={540} y={78} queue={bottleneck === 'checkout' ? Math.max(1, cashiers) : 0} />
          <Register x={610} y={78} queue={0} />
          {overflow.cashier ? <Badge x={680} y={78} text={`+${overflow.cashier}`} w={36} /> : null}
        </g>

        {/* Door */}
        <g transform="translate(860 58)">
          <rect width="70" height="120" fill="#141210" stroke="#3a322c" />
          <rect x="22" y="36" width="26" height="48" fill="#2c201c" />
          <Sign x={8} y={-6} text="Door" small />
        </g>

        {overflowN > 0 ? <Badge x={780} y={44} text={`+${overflowN} overflow`} w={90} /> : null}

        {/* People — no nameplates (title tooltip only) so they never cover shelf labels */}
        {placed.map(({ m, x, y }) => {
          const on = lit.has(m.id)
          return (
            <g key={m.id} transform={`translate(${x} ${y})`}>
              <g className={`sf-person${motion && on ? ' is-live' : ''}${!on ? ' is-idle' : ''}`}>
                <title>
                  {m.name} · {ROLES[m.role].name} · Lv {m.level}
                  {on ? ' · working' : ''}
                </title>
                <RoomPerson x={0} y={0} tint={SHIRT[m.role]} working={on} delay={(m.id % 5) * 0.2} />
              </g>
            </g>
          )
        })}

        {roster.length === 0 ? (
          <text x="480" y="170" textAnchor="middle" className="sf-empty">
            Nobody on the clock — the {bottleneck} waits
          </text>
        ) : null}

        {annexOn ? (
          <Annex people={annexPeople} litIds={lit} roster={roster} motion={motion} annexByRole={annexByRole} />
        ) : null}
      </svg>
      </div>
      <figcaption>
        {roster.length === 0
          ? 'Empty payroll.'
          : Object.entries(overflow)
              .filter(([, n]) => n > 0)
              .map(([role, n]) => `+${n} more ${ROLES[role as RoleId]?.name ?? role}`)
              .join(' · ') ||
            (annexOn && lit.size > 0
              ? `${lit.size} at work in the annex.`
              : bottleneckLabel
                ? `Limit: ${bottleneckLabel}`
                : 'Everyone on this floor is someone you hired.')}
      </figcaption>
    </figure>
  )
}

function Annex({
  people,
  litIds,
  roster,
  motion,
  annexByRole,
}: {
  people: { m: StaffMember; x: number; y: number; desk: number; on: boolean }[]
  litIds: ReadonlySet<number>
  roster: StaffMember[]
  motion: boolean
  annexByRole: Partial<Record<RoleId, number>>
}) {
  const deskLit = (role: RoleId) => roster.some((m) => m.role === role && litIds.has(m.id))
  const deskStaffed = (role: RoleId) => roster.some((m) => m.role === role)
  const top = FLOOR_H
  return (
    <g className="sf-annex">
      <rect y={top} width={ROOM_W} height={ANNEX_H} fill="#13110f" />
      <rect y={top} width={ROOM_W} height="3" fill="#3a322c" />
      <text x="16" y={top + 18} className="sf-label">
        Worlds annex
      </text>
      <g className="sf-annex-window" transform={`translate(${ROOM_W - 140} ${top + 6})`} aria-hidden>
        <rect width="120" height="28" rx="3" fill="#0b1018" stroke="#3a4048" />
        {[12, 36, 62, 88].map((x, i) => (
          <circle key={x} cx={x} cy={8 + ((i * 9) % 14)} r={i % 2 ? 1.2 : 1.6} fill="#cfe0ff" opacity="0.8" />
        ))}
      </g>

      {HORIZON_ROLE_IDS.map((role, i) => {
        const x = deskX(i)
        const on = deskLit(role)
        const staffed = deskStaffed(role)
        const y = top + 78
        const n = annexByRole[role] ?? 0
        return (
          <Hit key={role} x={x - 2} y={y - 36} w={70} h={90} label={DESK_LABEL[role]} menu={ANNEX_MENU[role]}>
            <g className={`sf-desk${on ? ' is-lit' : ''}${staffed ? ' is-staffed' : ''}`}>
              <title>
                {DESK_LABEL[role]} · {on ? 'working' : staffed ? 'waiting' : 'empty'}
                {n ? ` · ${n} on desk` : ''}
              </title>
              <rect x={x} y={y} width="60" height="11" rx="2" fill={staffed ? '#4a3d32' : '#2d2621'} />
              <rect x={x + 4} y={y + 11} width="4" height="22" fill="#2a221c" />
              <rect x={x + 52} y={y + 11} width="4" height="22" fill="#2a221c" />
              <rect x={x + 16} y={y - 22} width="28" height="18" rx="2" fill="#0d1115" stroke="#3a4048" />
              <rect
                className="sf-screen"
                x={x + 19}
                y={y - 19}
                width="22"
                height="12"
                rx="1"
                fill={on ? '#ffd98c' : '#1b232b'}
                opacity={on ? 0.9 : 0.7}
              />
              <DeskGlyph role={role} x={x + 30} y={y - 13} on={on} />
              <text x={x + 30} y={y + 46} textAnchor="middle" className="sf-label">
                {DESK_LABEL[role]}
              </text>
              <text x={x + 30} y={y + 60} textAnchor="middle" className="sf-name">
                {n > 0 ? `${n} on desk` : 'empty'}
              </text>
            </g>
          </Hit>
        )
      })}

      {people.map(({ m, x, y, desk, on }) => (
        <AnnexPerson
          key={m.id}
          x={x}
          y={y}
          member={m}
          on={on}
          dx={desk < HORIZON_ROLE_IDS.length - 1 ? DESK_STEP * 0.38 : -DESK_STEP * 0.38}
          motion={motion}
          delay={(desk * 0.37 + (m.id % 5) * 0.21) % 2.4}
        />
      ))}
    </g>
  )
}

function DeskGlyph({ role, x, y, on }: { role: (typeof HORIZON_ROLE_IDS)[number]; x: number; y: number; on: boolean }) {
  const c = on ? '#1c1916' : '#6d7a86'
  let body: ReactNode
  switch (role) {
    case 'surveyor':
      body = (
        <>
          <circle r="5" fill="none" stroke={c} strokeWidth="1.2" />
          <path d="M-5 0 H5 M0 -5 V5" stroke={c} strokeWidth="0.8" />
        </>
      )
      break
    case 'broker':
      body = (
        <>
          <path d="M-8 3 L-2 -3 L3 2 L8 -4" fill="none" stroke={c} strokeWidth="1.2" />
          <circle cx="-8" cy="3" r="1.4" fill={c} />
          <circle cx="8" cy="-4" r="1.4" fill={c} />
        </>
      )
      break
    case 'grower':
      body = (
        <>
          <path d="M0 5 V-2" stroke={c} strokeWidth="1.2" />
          <path d="M0 -1 Q-6 -2 -6 -6 Q0 -6 0 -1 M0 1 Q6 0 6 -4 Q0 -4 0 1" fill={c} />
        </>
      )
      break
    case 'taster':
      body = (
        <>
          <ellipse cx="-2" cy="-2" rx="3" ry="4" fill={c} />
          <path d="M-2 2 L4 6" stroke={c} strokeWidth="1.4" />
        </>
      )
      break
    case 'translator':
      body = <path d="M-8 0 L-6 -4 L-4 4 L-2 -5 L0 5 L2 -3 L4 3 L6 -2 L8 0" fill="none" stroke={c} strokeWidth="1.1" />
      break
    case 'handler':
      body = (
        <>
          <path d="M-6 1 V-1 A6 6 0 0 1 6 -1 V1" fill="none" stroke={c} strokeWidth="1.2" />
          <rect x="-7" y="1" width="3" height="4" fill={c} />
          <rect x="4" y="1" width="3" height="4" fill={c} />
        </>
      )
      break
    case 'diplomat':
      body = (
        <>
          <path d="M-5 5 V-5" stroke={c} strokeWidth="1.2" />
          <path d="M-5 -5 H5 L3 -2 L5 1 H-5" fill={c} />
        </>
      )
      break
  }
  return <g transform={`translate(${x} ${y})`}>{body}</g>
}

function AnnexPerson({
  x,
  y,
  member,
  on,
  dx,
  motion,
  delay,
}: {
  x: number
  y: number
  member: StaffMember
  on: boolean
  dx: number
  motion: boolean
  delay: number
}) {
  const walking = on && motion
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        className={`sf-stroll${walking ? ' is-live' : ''}`}
        style={walking ? ({ ['--sf-dx' as string]: `${dx}px`, animationDelay: `${delay}s` } as CSSProperties) : undefined}
      >
        <g className={`sf-person${motion && on ? ' is-live' : ''}${!on ? ' is-idle' : ''}`}>
          <title>
            {member.name} · {ROLES[member.role].name} · Lv {member.level}
            {on ? '' : ' · waiting'}
          </title>
          <ellipse cx="0" cy="14" rx="7" ry="2.5" fill="#000" opacity="0.35" />
          <path d="M-6 3 Q0 12 6 3 V-3 H-6 Z" fill={SHIRT[member.role]} opacity={on ? 1 : 0.75} />
          <circle cy="-9" r="5" fill="#e6c2a0" />
        </g>
      </g>
    </g>
  )
}

/** Small portrait used on the hire card. */
export function RolePortrait({ role }: { role: RoleId }) {
  return (
    <svg className="sf-portrait" viewBox="0 0 48 48" aria-hidden>
      <rect width="48" height="48" rx="6" fill="#1c1916" />
      <path d="M12 40 Q24 28 36 40 V44 H12 Z" fill={SHIRT[role]} />
      <circle cx="24" cy="18" r="8" fill="#e6c2a0" />
      {role === 'security' ? <rect x="16" y="10" width="16" height="4" rx="1" fill="#1a1c1e" /> : null}
      {role === 'clerk' ? <rect x="14" y="30" width="20" height="6" fill="#6c5b47" /> : null}
      {role === 'stocker' ? <rect x="30" y="26" width="8" height="10" fill="#7cc47f" /> : null}
      {role === 'cashier' ? <rect x="10" y="28" width="12" height="8" fill="#efe9dc" /> : null}
      {role === 'night' ? <circle cx="36" cy="12" r="3" fill="#ffd98c" /> : null}
      {role === 'handler' ? <path d="M15 18 A9 9 0 0 1 33 18" fill="none" stroke="#1a1c1e" strokeWidth="2.4" /> : null}
      {role === 'diplomat' ? <rect x="22" y="30" width="4" height="10" fill="#9b3f3a" /> : null}
      {role === 'taster' ? <circle cx="37" cy="30" r="4" fill="#efe9dc" /> : null}
      {role === 'surveyor' ? <circle cx="36" cy="12" r="4" fill="none" stroke="#d7c4a1" strokeWidth="1.6" /> : null}
      {role === 'grower' ? <path d="M36 14 q-5 -2 -5 -7 q5 0 5 7" fill="#6fbf73" /> : null}
    </svg>
  )
}

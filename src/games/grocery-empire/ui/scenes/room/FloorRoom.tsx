import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../../content/categories'
import { REGULAR_BY_ID } from '../../../content/depth'
import { backroomCap, manualUnpackAmount, salesBottleneck, shelfCap, shelfPrice } from '../../../sim/formulas'
import { sumQty } from '../../../sim/helpers'
import { useGame } from '../../GameContext'
import { usePhone } from '../../kit/hooks'
import { money, qty, rate } from '../../format'
import { Hit } from './Hit'
import { Badge, Person, Register, ShelfBay, Sign } from './primitivesV2'
import { ROOM_GROUND, RoomScene } from './RoomScene'

const WALKER_TINTS = ['#8fb6e0', '#c9a0d4', '#a8c090', '#e0a060']

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

const PORTRAIT_W = 360
const PORTRAIT_H = 346

/** Illustrated aisle for the Floor panel — live numbers + tappable stations. */
export function FloorRoom() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const phone = usePhone()
  const shelf = sumQty(s.shelf)
  const back = sumQty(s.backroom)
  const cap = Math.max(1, shelfCap(s))
  const backCap = Math.max(1, backroomCap(s))
  const bn = salesBottleneck(s)
  const cats = CATEGORY_IDS.filter((c) => s.categories[c]).slice(0, 6)
  const perBay = Math.max(1, cap / Math.max(1, cats.length))
  const unpackAmt = manualUnpackAmount(s)
  const price = shelfPrice(s, 'cans')
  const sold = s.rates.soldPerSec
  const cashiers = s.staff.filter((m) => m.role === 'cashier').length

  const activeReg = s.depth?.regulars?.activeId ? REGULAR_BY_ID[s.depth.regulars.activeId] : null
  const waitingReg = s.depth?.regulars?.waitingId ? REGULAR_BY_ID[s.depth.regulars.waitingId] : null

  const chips = [
    { label: 'Shelf', value: `${qty(shelf)}/${qty(cap)}` },
    { label: 'Back', value: qty(back) },
    { label: 'Price', value: money(s.price, numberFormat) },
    ...(activeReg ? [{ label: 'Serve', value: activeReg.name }] : []),
    ...(waitingReg ? [{ label: 'Waiting', value: waitingReg.name }] : []),
  ]

  // Short, scene-sized hint: always fits, no ellipsis. Demand is the healthy state, so it stays quiet.
  const bnLabel =
    bn.kind === 'shelf'
      ? back > 0 ? 'Shelf empty — tap Unpack' : null
      : bn.kind === 'unpack'
        ? 'Shelf draining — tap Unpack'
        : bn.kind === 'checkout'
          ? 'Line at the till — hire a cashier'
          : null

  const label = `Floor, shelf ${qty(shelf)} of ${qty(cap)}, back ${qty(back)}, ${rate(sold)} baskets per second`

  const unload = (
      <Hit
        x={24}
        y={70}
        w={150}
        h={160}
        label={`Unpack +${unpackAmt}`}
        className="rm-hit--unpack"
        coachId="floor-unpack"
        onActivate={() => {
          if (back > 0) dispatch({ type: 'unpack' })
        }}
      >
        <rect
          x="28"
          y="78"
          width="140"
          height="140"
          rx="8"
          fill="var(--sc-shelf, #0a0e14)"
          stroke="var(--sc-tomato, #ff5a43)"
          strokeOpacity="0.45"
        />
        <Sign x={40} y={98} text="Unpack" />
        <Badge x={40} y={108} text={`${qty(back)}/${qty(backCap)}`} w={72} />
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={40 + i * 36}
            y={160}
            width="28"
            height="22"
            rx="3"
            fill={back > i * (backCap / 3) ? 'var(--sc-tomato, #ff5a43)' : '#1a1512'}
            opacity={back > i * (backCap / 3) ? 0.85 : 1}
          />
        ))}
        <Sign x={40} y={210} text={back > 0 ? `Tap · +${unpackAmt}` : 'Empty'} small />
        <Person x={98} y={ROOM_GROUND - 24} tint="var(--sc-tomato, #ff5a43)" delay={0.2} working={back > 0 && shelf < cap} />
      </Hit>
  )
  const shelfBays = (
      <Hit x={190} y={70} w={320} h={150} label="Shelf stock" coachId="floor-wholesale" menu="floor">
        <Sign x={200} y={88} text="Shelf" />
        <Badge x={250} y={74} text={`${Math.round((shelf / cap) * 100)}%`} w={44} />
        {cats.map((c, i) => {
          const n = sumQty(s.shelf, c)
          return (
            <ShelfBay
              key={c}
              x={200 + i * 48}
              y={98}
              h={72}
              fill={n / perBay}
              tint={CAT_TINT[c] ?? '#c9a15a'}
              label={CATEGORIES[c]?.short ?? c.slice(0, 3)}
              labelInside
            />
          )
        })}
        {cats.length === 0 ? <Sign x={220} y={160} text="Unlock aisles" small /> : null}
      </Hit>
  )
  const priceTag = (
    <>
      <Hit
        x={530}
        y={78}
        w={110}
        h={70}
        label={`Price ${money(s.price, numberFormat)}`}
        coachId="floor-price"
      >
        <rect x="530" y="78" width="110" height="70" rx="6" fill="var(--ge-tag, #f2c14e)" />
        <text x="585" y="108" textAnchor="middle" fill="var(--ge-tag-ink, #1a1612)" fontSize="11" fontWeight="700">
          PRICE
        </text>
        <text
          x="585"
          y="132"
          textAnchor="middle"
          fill="var(--ge-tag-ink, #1a1612)"
          fontSize="16"
          fontWeight="700"
          fontFamily="var(--ge-font-mono, monospace)"
        >
          {money(s.price, numberFormat)}
        </text>
      </Hit>
      <Sign x={530} y={164} text={`Cans sell ${money(price, numberFormat)}`} small />
    </>
  )
  const registers = (
      <Hit x={660} y={90} w={140} h={110} label="Registers" coachId="staff-hire-clerk" menu="staff">
        <Sign x={668} y={108} text="Registers" />
        <Register x={668} y={120} queue={bn.kind === 'checkout' ? Math.max(1, Math.ceil(sold * 2)) : 0} />
        <Register x={736} y={120} queue={0} />
        <Badge x={668} y={162} text={`${cashiers} on till`} w={70} />
        {phone ? null : <Person x={700} y={ROOM_GROUND - 24} tint="#7fa3c9" delay={0.5} working={sold > 0.2} />}
      </Hit>
  )
  const emptyCard = (
    <>
      {shelf <= 0 && back <= 0 ? (
        <g>
          <rect x="200" y="110" width="380" height="72" rx="8" fill="#0f1317" stroke="#3a444e" opacity="0.94" />
          <text x="390" y="138" textAnchor="middle" className="rm-empty__title">
            Nothing to sell
          </text>
          <text x="390" y="158" textAnchor="middle" className="rm-empty__body">
            Order a crate, then unpack to the shelf.
          </text>
          <Hit x={300} y={162} w={180} h={18} label="Open suppliers" menu="suppliers" coachId="floor-wholesale">
            <text x="390" y={176} textAnchor="middle" className="rm-sign" fill="#f2c14e">
              Open suppliers →
            </text>
          </Hit>
        </g>
      ) : null}
    </>
  )

  // Phone: the same stations re-laid in portrait (shelf on top, unload left, price and
  // registers right) at close to 1:1, so every label stays readable. The door's rate
  // moves to a chip.
  if (phone) {
    return (
      <RoomScene
        label={label}
        chips={[...chips, { label: 'Sold', value: rate(sold) }]}
        skyTop="var(--sc-aisle, #070b12)"
        skyBottom="#1a2218"
        portrait={{ w: PORTRAIT_W, h: PORTRAIT_H }}
      >
        <g transform="translate(-170 -62)">{shelfBays}</g>
        <g transform="translate(-16 50)">{unload}</g>
        <g transform="translate(-350 38)">{priceTag}</g>
        <g transform="translate(-486 120)">{registers}</g>
        {bnLabel && !(shelf <= 0 && back <= 0) ? (
          <g>
            <rect x={PORTRAIT_W / 2 - 120} y={PORTRAIT_H - 34} width="240" height="26" rx="13" fill="#2a2414" stroke="#e8c262" strokeOpacity="0.6" />
            <text x={PORTRAIT_W / 2} y={PORTRAIT_H - 17} textAnchor="middle" fill="#f3dc9a" fontSize="12" fontWeight="700">
              {bnLabel}
            </text>
          </g>
        ) : null}
        <g transform="translate(-210 -40)">{emptyCard}</g>
      </RoomScene>
    )
  }

  return (
    <RoomScene label={label} chips={chips} skyTop="var(--sc-aisle, #070b12)" skyBottom="#1a2218">
      {/* Unload bay */}
      {unload}
      {/* Shelf bays */}
      {shelfBays}
      {priceTag}
      {registers}

      {/* Shoppers: in at the door, browse the shelf, pay, and out again. More when the store is busy. */}
      {!reducedMotion && sold > 0
        ? Array.from({ length: Math.min(4, Math.max(1, Math.ceil(sold * 3))) }, (_, i) => (
            <g key={`walker-${i}`} className="rm-walker" style={{ animationDelay: `${-i * 3.6}s` }}>
              <Person x={900} y={ROOM_GROUND - 24} tint={WALKER_TINTS[i % WALKER_TINTS.length]!} working={false} delay={i * 0.3} />
            </g>
          ))
        : null}
      {/* Door / traffic + regulars in the aisle */}
      <g transform="translate(860 80)">
        <rect width="70" height="120" fill="#141210" stroke="#3a322c" />
        <rect x="22" y="36" width="26" height="48" fill="#2c201c" />
        <Sign x={8} y={-6} text="Door" small />
        <Badge x={8} y={108} text={rate(sold)} w={54} />
      </g>
      {activeReg ? (
        <g>
          <Person x={820} y={ROOM_GROUND - 24} tint="var(--sc-tomato, #ff5a43)" delay={0.1} working />
          <Sign x={790} y={ROOM_GROUND - 48} text={activeReg.name} small />
        </g>
      ) : null}
      {waitingReg ? (
        <g key={waitingReg.id} className="rm-arrive">
          <Person x={790} y={ROOM_GROUND - 24} tint="#c9a15a" delay={0.35} working={false} />
          <Sign x={760} y={ROOM_GROUND - 36} text={waitingReg.name} small />
        </g>
      ) : null}

      {/* Bottleneck sits above the ground strip — never on the annex/ground seam */}
      {bnLabel && !(shelf <= 0 && back <= 0) ? (
        <g>
          <rect x="290" y="214" width="260" height="26" rx="13" fill="#2a2414" stroke="#e8c262" strokeOpacity="0.6" />
          <text x="420" y="231" textAnchor="middle" fill="#f3dc9a" fontSize="12" fontWeight="700">
            {bnLabel}
          </text>
        </g>
      ) : null}

      {emptyCard}
    </RoomScene>
  )
}

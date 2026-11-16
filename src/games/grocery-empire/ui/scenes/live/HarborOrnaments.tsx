import { ORNAMENTS } from '@/cosmetics/packs'
import { useMetaOptional } from '@/shell/MetaContext'

/**
 * Equipped shop ornaments, hung on the Fleet harbor pier. Same ids and classes as the shelf page
 * ornaments; this only gives them a second room to appear in. Never reads or changes the sim.
 */
export function HarborOrnaments() {
  const meta = useMetaOptional()?.meta
  const on = new Set(meta?.equippedOrnaments ?? [])
  const shown = ORNAMENTS.filter((o) => on.has(o.id))
  if (shown.length === 0) return null
  const has = (id: string) => shown.some((o) => o.id === id)
  return (
    <g className="hb-orn" aria-hidden data-ornaments={shown.map((o) => o.id).join(' ')}>
      {has('bodega-tape') ? <rect className="hb-orn__tape" x="200" y="174" width="270" height="5" /> : null}
      {has('aisle-star') ? (
        <path
          className="hb-orn__star"
          transform="translate(292 78)"
          d="M0 -9 L2.6 -3 L9 -2.6 L4 1.6 L5.6 8 L0 4.6 L-5.6 8 L-4 1.6 L-9 -2.6 L-2.6 -3 Z"
        />
      ) : null}
      {has('price-tag') ? (
        <g transform="translate(322 70)">
          <path className="hb-orn__tag" d="M0 0 H30 V16 H7 L0 9 Z" />
          <text className="hb-orn__tag-text" x="17" y="12" textAnchor="middle">
            $
          </text>
        </g>
      ) : null}
      {has('open-sign') ? (
        <g transform="translate(366 66)">
          <rect className="hb-orn__open-box" width="52" height="20" rx="4" />
          <text className="hb-orn__open" x="26" y="14" textAnchor="middle">
            OPEN
          </text>
        </g>
      ) : null}
      {has('receipt-corner') ? (
        <path className="hb-orn__paper" transform="translate(436 72)" d="M0 0 H26 V22 L20 18 L14 22 L8 18 L0 22 Z" />
      ) : null}
      {has('sold-stamp') ? (
        <text className="hb-orn__stamp" x="410" y="171" textAnchor="middle" transform="rotate(-6 410 171)">
          SOLD
        </text>
      ) : null}
    </g>
  )
}

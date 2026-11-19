import { TICKERS } from '../../content/corp/tickers'
import { portfolioBasis, portfolioValue } from '../../sim/corp/market'
import { useGame } from '../GameContext'
import { usePhone } from '../kit/hooks'
import { money } from '../format'
import { ROOM_GROUND, RoomScene } from '../scenes/room'
import { changePct, pctLabel } from './pct'

const G = ROOM_GROUND

/** The exchange floor: a quote board, the big chart for the stock you picked and a news tape. */
export function MarketScene({ selected, onPick }: { selected: string | null; onPick: (id: string) => void }) {
  const { state: s, numberFormat } = useGame()
  const phone = usePhone()
  const c = s.corp
  const listed = TICKERS.filter((d) => c.tickers[d.id]?.listed)
  const pick = (selected && c.tickers[selected]?.listed ? selected : listed[0]?.id) ?? null
  const t = pick ? c.tickers[pick] : null
  const def = TICKERS.find((d) => d.id === pick)
  const value = portfolioValue(s)
  const gain = value - portfolioBasis(s)
  const board = listed.slice(0, phone ? 8 : 12)
  const W = phone ? 600 : 960
  // Phone scenes are drawn smaller, so type is set larger there.
  const fs = (n: number) => (phone ? Math.round(n * 1.5) : n)
  const chartX = phone ? 30 : 470
  const chartY = phone ? 304 : 60
  const chartW = phone ? 540 : 460
  const chartH = phone ? 170 : 186
  const hist = t?.hist ?? []
  const lo = hist.length ? Math.min(...hist) : 0
  const hi = hist.length ? Math.max(...hist) : 1
  const span = hi - lo || hi || 1
  const pts = hist.map((v, i) => `${chartX + 14 + (i / Math.max(1, hist.length - 1)) * (chartW - 28)},${chartY + chartH - 18 - ((v - lo) / span) * (chartH - 60)}`)
  const up = changePct(hist) >= 0
  const tape = [...c.tape].reverse().slice(0, 6)

  return (
    <RoomScene
      label={`Exchange: ${listed.length} companies listed, your shares worth ${money(value, numberFormat)}`}
      chips={[
        { label: 'Your shares', value: money(value, numberFormat) },
        { label: 'Gain', value: `${gain >= 0 ? '+' : '−'}${money(Math.abs(gain), numberFormat)}` },
        { label: 'Crate price', value: (s.wholesale?.index ?? 1).toFixed(2) },
      ]}
      skyTop="#070b14"
      skyBottom="#0d1424"
      portrait={{ w: 600, h: 520 }}
      className="mk"
    >
      <rect x="0" y="0" width={W} height={phone ? 520 : G + 52} fill="#0a0f1a" />
      {/* Quote board */}
      <g aria-label="Quote board">
        <rect x="20" y={phone ? 64 : 60} width={phone ? 560 : 430} height={phone ? 226 : 186} rx="6" fill="#05070c" stroke="#1d2a40" />
        {board.map((d, i) => {
          const tt = c.tickers[d.id]!
          const col = phone ? i % 2 : i % 2
          const row = Math.floor(i / 2)
          const x = 34 + col * (phone ? 275 : 208)
          const y = (phone ? 90 : 86) + row * (phone ? 34 : 29)
          const ch = changePct(tt.hist.slice(-30))
          const sel = d.id === pick
          return (
            <g key={d.id} className="mk-quote" onClick={() => onPick(d.id)} role="button" aria-label={`${d.name}`}>
              <rect x={x - 6} y={y - 17} width={phone ? 262 : 198} height="26" rx="3" fill={sel ? '#16243a' : 'transparent'} />
              <text x={x} y={y} fontSize={fs(14)} fontWeight="800" fill="#f2c14e" fontFamily="var(--ge-font-mono, monospace)">
                {d.sym}
              </text>
              <text x={x + (phone ? 84 : 62)} y={y} fontSize={fs(13)} fill="#d9e2f0" fontFamily="var(--ge-font-mono, monospace)">
                {money(tt.price, numberFormat)}
              </text>
              <text x={x + (phone ? 250 : 190)} y={y} fontSize={fs(12)} textAnchor="end" fontWeight="700" fill={ch >= 0 ? '#5fd38a' : '#ff7a5c'} fontFamily="var(--ge-font-mono, monospace)">
                {ch >= 0 ? '▲' : '▼'} {pctLabel(ch)}
              </text>
            </g>
          )
        })}
        {listed.length === 0 ? (
          <text x="40" y="110" fontSize={fs(14)} fill="#7f8aa0">
            The board lights up as companies list.
          </text>
        ) : null}
      </g>
      {/* Big chart */}
      <g aria-label="Price chart">
        <rect x={chartX} y={chartY} width={chartW} height={chartH} rx="6" fill="#05070c" stroke="#1d2a40" />
        {Array.from({ length: 4 }, (_, i) => (
          <line key={i} x1={chartX + 10} x2={chartX + chartW - 10} y1={chartY + 40 + i * ((chartH - 60) / 3)} y2={chartY + 40 + i * ((chartH - 60) / 3)} stroke="#121b2b" />
        ))}
        {def && t ? (
          <>
            <text x={chartX + 14} y={chartY + 24} fontSize={fs(15)} fontWeight="800" fill="#efe6cf">
              {def.sym} · {def.name}
            </text>
            <text x={chartX + chartW - 14} y={chartY + 24} fontSize={fs(14)} textAnchor="end" fontWeight="800" fill={up ? '#5fd38a' : '#ff7a5c'}>
              {money(t.price, numberFormat)} {pctLabel(changePct(hist))}
            </text>
            {pts.length > 1 ? (
              <>
                <polygon
                  points={`${pts.join(' ')} ${chartX + chartW - 14},${chartY + chartH - 14} ${chartX + 14},${chartY + chartH - 14}`}
                  fill={up ? 'rgb(95 211 138 / 0.12)' : 'rgb(255 122 92 / 0.12)'}
                />
                <polyline points={pts.join(' ')} fill="none" stroke={up ? '#5fd38a' : '#ff7a5c'} strokeWidth="2.2" strokeLinejoin="round" />
              </>
            ) : null}
          </>
        ) : null}
      </g>
      {/* News tape */}
      <g aria-label="News tape" className="mk-tape-wrap">
        <rect x="0" y={phone ? 488 : G + 14} width={W} height="26" fill="#f2c14e" />
        <g className="mk-tape">
          {tape.map((n, i) => (
            <text key={`${n.t}-${i}`} x={20 + i * 420} y={(phone ? 488 : G + 14) + 18} fontSize={fs(13)} fontWeight="700" fill="#1a1206">
              {n.up ? '▲' : '▼'} {n.text}
            </text>
          ))}
        </g>
      </g>
    </RoomScene>
  )
}

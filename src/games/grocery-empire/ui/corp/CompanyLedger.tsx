import { corpCrateMul, corpDemandMul, corpLedger, corpVentureMul, corpWageMul, softCapInfo } from '../../sim/corp/effects'
import { CO } from '../../sim/balance'
import { useGame } from '../GameContext'
import { Button } from '../kit'
import './ledger.css'

const pct = (m: number) => `${m >= 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 1000) / 10}%`

/** Everything the company and the town are doing to the store right now, and where it comes from. */
export function CompanyLedger({ compact = false }: { compact?: boolean }) {
  const { state: s, setActiveMenu } = useGame()
  const lines = corpLedger(s)
  const totals = [
    { k: 'Shoppers', v: corpDemandMul(s), good: (m: number) => m >= 1 },
    { k: 'Wages', v: corpWageMul(s), good: (m: number) => m <= 1 },
    { k: 'Crates', v: corpCrateMul(s), good: (m: number) => m <= 1 },
    { k: 'Venture tills', v: corpVentureMul(s), good: (m: number) => m >= 1 },
  ]
  const cap = softCapInfo(s)
  return (
    <section className="lg" aria-label="What your company does to the store">
      <h3 className="lg-h">What your company does to the store</h3>
      <div className="lg-totals">
        {totals.map((t) => (
          <div key={t.k} className={Math.abs(t.v - 1) < 0.0005 ? '' : t.good(t.v) ? 'is-up' : 'is-down'}>
            <span>{t.k}</span>
            <strong>{Math.abs(t.v - 1) < 0.0005 ? '—' : pct(t.v)}</strong>
          </div>
        ))}
      </div>
      {cap.raw > 0.05 ? (
        <p className="lg-note">
          Stacked shopper bonuses add up to +{Math.round(cap.raw * 100)}%; past a point they taper, so it counts as +{Math.round(cap.capped * 100)}%
          (soft cap {CO.softCap * 100}%).
        </p>
      ) : null}
      {lines.length === 0 ? (
        <p className="lg-note">Nothing yet. Every system here is optional: the store runs the same until you take part.</p>
      ) : (
        <ul className={`lg-list${compact ? ' is-compact' : ''}`}>
          {(compact ? lines.slice(0, 6) : lines).map((l, i) => (
            <li key={`${l.source}-${i}`} className={l.good ? 'is-good' : 'is-bad'}>
              <span className="lg-src">{l.source}</span>
              <span className="lg-text">{l.text}</span>
              <Button size="sm" tone="ghost" onClick={() => setActiveMenu(l.menu)}>
                Open
              </Button>
            </li>
          ))}
        </ul>
      )}
      {compact && lines.length > 6 ? <p className="lg-note">And {lines.length - 6} more in the Boardroom.</p> : null}
    </section>
  )
}

import { CELEBRITY_ENDCAP, MARKETING } from '../../sim/balance'
import { can } from '../../sim/commands'
import { adMul, demandPerSec, salesBottleneck, varietyMul } from '../../sim/formulas'
import { matchCouponCost, RIVAL_COPY, rivalAnswerCost } from '../../sim/systems/events'
import type { MarketingPosture } from '../../sim/state'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import { MarketingBand } from '../scenes/DepartmentBands'
import { DeptDiorama } from '../scenes/DeptDiorama'

const POSTURES: { id: MarketingPosture; label: string; blurb: string }[] = [
  { id: 'neighborhood', label: 'Neighborhood', blurb: 'Baseline ads — steady glances.' },
  { id: 'circular', label: 'Circular', blurb: '+18% shoppers · −8% ticket.' },
  { id: 'houseBrand', label: 'House brand', blurb: '−8% shoppers · +16% ticket · private label pulls harder.' },
]

export function MarketingPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const war = s.events?.couponWar
  const warLeft = war?.active ? Math.max(0, Math.ceil(war.endsAt - s.time)) : 0
  const matchCost = matchCouponCost(s)
  const celebUntil = s.campaigns?.celebrityUntil ?? 0
  const celebLeft = celebUntil > s.time ? Math.max(0, Math.ceil(celebUntil - s.time)) : 0
  const canAd = s.cash >= s.adCost
  const refundCheck = can(s, { type: 'refundAd' })
  const matchCheck = can(s, { type: 'matchCoupons' })
  const rivalKind = s.events?.rival?.kind ?? null
  const rivalLeft = rivalKind ? Math.max(0, Math.ceil((s.events?.rival?.endsAt ?? 0) - s.time)) : 0
  const rivalCost = rivalAnswerCost(s)
  const rivalCheck = can(s, { type: 'answerRival' })
  const bottleneck = salesBottleneck(s)
  const before = adMul(s)
  // Hypothetical +1 ad: same multiplier stack as the sim, one level higher.
  const afterApprox = adMul({ ...s, ads: s.ads + 1 })
  const demandNow = demandPerSec(s) * varietyMul(s)
  const gainFrac = before > 0 ? afterApprox / before - 1 : 0.08
  const celebCheck = can(s, { type: 'buyMemo', id: 'celebrity-endcap' })
  const showCelebBuy = celebLeft <= 0 && (celebCheck.ok || !!s.memoSeen['celebrity-endcap'])
  const extraRev = demandNow * Math.max(0, gainFrac) * s.price
  const paybackSec = extraRev > 1e-6 ? s.adCost / extraRev : Number.POSITIVE_INFINITY
  const paybackWarn = paybackSec > MARKETING.paybackWarnSec

  return (
    <Panel
      title="Marketing"
      purpose="Buy demand — only when shoppers are the limit."
      lore="marketing"
      scene={
        <>
          <MarketingBand state={s} />
          <DeptDiorama kind="marketing" />
        </>
      }
    >
      {bottleneck.kind !== 'demand' ? (
        <div className="ge-dept-callout" role="status">
          <div className="ge-dept-callout__copy">
            <h3>Ads won’t move baskets</h3>
            <p>
              Limit is {bottleneck.kind} — {bottleneck.label} Clear that before buying more glances.
            </p>
          </div>
        </div>
      ) : null}

      {celebLeft > 0 ? (
        <div className="ge-dept-callout" role="status">
          <div className="ge-dept-callout__copy">
            <h3>Celebrity endcap</h3>
            <p>Demand +25% for {celebLeft}s. Brand may take a nick when they leave.</p>
          </div>
        </div>
      ) : null}

      {showCelebBuy ? (
        <div className="ge-dept-callout">
          <div className="ge-dept-callout__copy">
            <h3>Celebrity endcap</h3>
            <p>
              +25% demand for {CELEBRITY_ENDCAP.durationSec}s · {money(CELEBRITY_ENDCAP.cashCost, numberFormat)} +{' '}
              {CELEBRITY_ENDCAP.ideasCost} Ideas.
            </p>
          </div>
          <Btn
            tone={celebCheck.ok ? 'primary' : 'ghost'}
            disabled={!celebCheck.ok}
            title={!celebCheck.ok ? celebCheck.reason : undefined}
            onClick={() => dispatch({ type: 'buyMemo', id: 'celebrity-endcap' })}
          >
            Book celebrity
          </Btn>
        </div>
      ) : null}

      {war?.active ? (
        <div className="ge-dept-callout" role="status">
          <div className="ge-dept-callout__copy">
            <h3>Coupon war · {warLeft}s</h3>
            <p>Rival circulars out — demand −8%. Match early to hold Brand.</p>
          </div>
          <Btn
            tone="primary"
            disabled={!matchCheck.ok}
            title={!matchCheck.ok ? matchCheck.reason : undefined}
            onClick={() => dispatch({ type: 'matchCoupons' })}
          >
            Match · {money(matchCost, numberFormat)}
          </Btn>
        </div>
      ) : null}

      {rivalKind ? (
        <div className="ge-dept-callout" role="status" data-coach-id="marketing-rival">
          <div className="ge-dept-callout__copy">
            <h3>
              {RIVAL_COPY[rivalKind].name} · {rivalLeft}s
            </h3>
            <p>
              {rivalKind === 'poach'
                ? 'Crew morale dips while the rival hands out flyers.'
                : rivalKind === 'undercut'
                  ? 'Demand −6% while the chalk price stands.'
                  : rivalKind === 'raid'
                    ? 'Demand −4% while their display blocks your door-side endcap.'
                    : 'Demand −5% while the rumor travels.'}{' '}
              Answer to end it early; it fades on its own.
            </p>
          </div>
          <Btn
            tone="primary"
            disabled={!rivalCheck.ok}
            title={!rivalCheck.ok ? rivalCheck.reason : undefined}
            onClick={() => dispatch({ type: 'answerRival' })}
          >
            {RIVAL_COPY[rivalKind].verb} · {money(rivalCost, numberFormat)}
          </Btn>
        </div>
      ) : null}

      <div className="ge-dept-split">
        <article className="ge-card">
          <header className="ge-empire-block__head">
            <h3>Posture</h3>
            <p>One voice at a time. Switch costs ${MARKETING.switchFee}.</p>
          </header>
          <div className="ge-chip-row">
            {POSTURES.map((p) => {
              const on = (s.marketingPosture ?? 'neighborhood') === p.id
              const check = can(s, { type: 'setMarketingPosture', posture: p.id })
              return (
                <Btn
                  key={p.id}
                  tone={on ? 'primary' : 'ghost'}
                  disabled={on || !check.ok}
                  title={on ? p.blurb : !check.ok ? check.reason : p.blurb}
                  onClick={() => dispatch({ type: 'setMarketingPosture', posture: p.id })}
                >
                  {p.label}
                </Btn>
              )
            })}
          </div>
          <p className="ge-muted">
            {POSTURES.find((p) => p.id === (s.marketingPosture ?? 'neighborhood'))?.blurb}
          </p>
        </article>

        <article className={`ge-card${canAd ? ' is-ready' : ''}`.trim()}>
          <header className="ge-empire-block__head">
            <h3>Ads</h3>
            <p>Buy glances. Cost climbs; pull rises slowly.</p>
          </header>
          <div className="ge-card__meta">
            <div className="ge-card__meta-row">
              <span>Level</span>
              <strong>{s.ads}</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Next</span>
              <strong>{money(s.adCost, numberFormat)}</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Est. gain</span>
              <strong>~+{(gainFrac * 100).toFixed(0)}% demand</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Payback</span>
              <strong>
                {Number.isFinite(paybackSec)
                  ? paybackSec < 60
                    ? `~${Math.ceil(paybackSec)}s`
                    : `~${Math.ceil(paybackSec / 60)} min`
                  : '—'}
              </strong>
            </div>
          </div>
          {bottleneck.kind === 'demand' && paybackWarn ? (
            <p className="ge-muted">
              Payback is slow — staff seats or a managed store may buy more baskets than another ad.
            </p>
          ) : null}
          <div className="ge-card__actions">
            <Btn
              tone={canAd ? 'primary' : 'ghost'}
              coachId="marketing-ads"
              disabled={!canAd}
              title={!canAd ? `Need ${money(s.adCost, numberFormat)}` : undefined}
              onClick={() => dispatch({ type: 'buyAd' })}
            >
              Buy ad · {money(s.adCost, numberFormat)}
            </Btn>
            <Btn
              tone="ghost"
              disabled={!refundCheck.ok}
              title={!refundCheck.ok ? refundCheck.reason : undefined}
              onClick={() => dispatch({ type: 'refundAd' })}
            >
              Undo
            </Btn>
          </div>
        </article>

        {s.loyalty.tier > 0 ? (
          <article className="ge-card">
            <header className="ge-empire-block__head">
              <h3>Loyalty</h3>
              <p>More shoppers now; rewards owed on the tape.</p>
            </header>
            <div data-coach-id="marketing-loyalty">
              <div className="ge-card__meta">
                <div className="ge-card__meta-row">
                  <span>Tier</span>
                  <strong>{s.loyalty.tier}</strong>
                </div>
                <div className="ge-card__meta-row">
                  <span>Owed</span>
                  <strong>{money(s.loyalty.liability, numberFormat)}</strong>
                </div>
              </div>
              <Btn
                tone="ghost"
                disabled={s.loyalty.liability < 0.5 || s.cash < 0.5}
                onClick={() => dispatch({ type: 'redeemLoyalty' })}
              >
                Redeem rewards
              </Btn>
            </div>
          </article>
        ) : null}

      </div>

      <HelpCard title="Paper and promises">
        Posture picks volume vs ticket. Ads buy glances until payback stretches — then hire or open a
        door. Loyalty spends later so regulars return now.
      </HelpCard>
    </Panel>
  )
}

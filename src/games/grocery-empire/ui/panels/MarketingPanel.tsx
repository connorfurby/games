import { useState } from 'react'
import { CELEBRITY_ENDCAP, DEPTH, LATE } from '../../sim/balance'
import { can } from '../../sim/commands'
import { adMul, demandPerSec, salesBottleneck, varietyMul } from '../../sim/formulas'
import { celebrityCashCost, postureFee } from '../../sim/lateCost'
import { matchCouponCost, RIVAL_COPY, rivalAnswerCost } from '../../sim/systems/events'
import { broadcastClimates, wireAdActive } from '../../sim/systems/late'
import type { MarketingPosture, RivalKind } from '../../sim/state'
import { useGame } from '../GameContext'
import { money } from '../format'
import { PlayFrame } from '../play'
import { Badge, Button, Chip, SegmentedControl, Sheet } from '../kit'
import { BillboardScene } from '../scenes/live/BillboardScene'

const POSTURES: { id: MarketingPosture; label: string; blurb: string }[] = [
  { id: 'neighborhood', label: 'Neighborhood', blurb: 'Baseline ads — steady glances.' },
  { id: 'circular', label: 'Circular', blurb: '+18% shoppers · −8% ticket.' },
  { id: 'houseBrand', label: 'House brand', blurb: '−8% shoppers · +16% ticket · private label pulls harder.' },
]

const RIVAL_EFFECT: Record<RivalKind, string> = {
  poach: 'Crew morale dips while the rival hands out flyers.',
  undercut: 'Demand −6% while the chalk price stands.',
  raid: 'Demand −4% while their display blocks your door-side endcap.',
  smear: 'Demand −5% while the rumor travels.',
}

export function MarketingPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const [flyerSheet, setFlyerSheet] = useState(false)
  const war = s.events?.couponWar
  const matchCost = matchCouponCost(s)
  const celebUntil = s.campaigns?.celebrityUntil ?? 0
  const celebLeft = celebUntil > s.time ? Math.max(0, Math.ceil(celebUntil - s.time)) : 0
  const canAd = s.cash >= s.adCost
  const refundCheck = can(s, { type: 'refundAd' })
  const fee = postureFee(s)
  const climates = s.era >= 7 ? broadcastClimates(s) : []
  const wireLeft = wireAdActive(s) ? Math.max(0, Math.ceil((s.late?.wireAdsUntil ?? 0) - s.time)) : 0
  const [discountBand, setDiscountBand] = useState<'soft' | 'mid' | 'deep'>('soft')
  const flyerCheck = can(s, {
    type: 'printFlyerWeek',
    aisles: ['cans', 'produce'],
    discountBand,
    promise: 'hours',
  })
  const printFlyer = () => {
    const cats = (['cans', 'produce', 'dairy', 'household', 'bakery', 'deli'] as const).filter(
      (c) => s.categories[c],
    )
    if (cats.length < 2) return
    dispatch({
      type: 'printFlyerWeek',
      aisles: [cats[0]!, cats[1]!],
      discountBand,
      promise: 'hours',
    })
  }
  const flyerWeeks = s.depth?.flyerWeeks ?? 0
  const flyerLive = (s.depth?.flyer?.until ?? 0) > s.time
  const flyerCopy = s.depth?.counterFlyerNeeded
    ? 'Penny counter-flyer out — print a week to clear it.'
    : flyerLive
      ? `Live on ${s.depth?.flyer?.aisles.join(' + ')} · band ${s.depth?.flyer?.discount}${
          s.depth?.flyer?.bandHeld === false ? ' · BROKEN' : ' · held'
        } · ${Math.ceil((s.depth!.flyer!.until - s.time) / 60)}m left`
      : (s.depth?.flyer?.cooldownUntil ?? 0) > s.time
        ? `Cooldown ${Math.ceil((s.depth!.flyer!.cooldownUntil - s.time) / 60)}m · ${flyerWeeks} weeks held`
        : `Print a week (2 aisles). Hold the band. ${flyerWeeks} / ${DEPTH.flyerWeeksNeed} toward the cold permit.`
  const wireCheck = can(s, { type: 'wireAd' })
  const matchCheck = can(s, { type: 'matchCoupons' })
  const rivalKind = s.events?.rival?.kind ?? null
  const rivalCost = rivalAnswerCost(s)
  const rivalCheck = can(s, { type: 'answerRival' })
  const curb = !!war?.active || !!rivalKind
  const bottleneck = salesBottleneck(s)
  const before = adMul(s)
  const afterApprox = adMul({ ...s, ads: s.ads + 1 })
  const demandNow = demandPerSec(s) * varietyMul(s)
  const gainFrac = before > 0 ? afterApprox / before - 1 : 0.08
  const celebCheck = can(s, { type: 'buyMemo', id: 'celebrity-endcap' })
  const showCelebBuy = celebLeft <= 0 && (celebCheck.ok || !!s.memoSeen['celebrity-endcap'])
  const extraRev = demandNow * Math.max(0, gainFrac) * s.price
  const paybackSec = extraRev > 1e-6 ? s.adCost / extraRev : Number.POSITIVE_INFINITY
  const posture = s.marketingPosture ?? 'neighborhood'
  const loyaltyOn = s.loyalty.tier > 0 || !!s.memos['punch-card']
  const paybackText = Number.isFinite(paybackSec)
    ? paybackSec < 60
      ? `~${Math.ceil(paybackSec)}s`
      : `~${Math.ceil(paybackSec / 60)} min`
    : '—'

  const printReady = s.era >= 2 && flyerCheck.ok && (flyerWeeks < DEPTH.flyerWeeksNeed || s.depth?.counterFlyerNeeded)

  return (
    <section className="ge-panel">
      <PlayFrame
        purpose="Staff, marketing, rivals and side businesses."
        department="Marketing"
        room={<BillboardScene />}
        tray={{
          primary: curb
            ? war?.active
              ? {
                  label: 'Match coupons',
                  tone: 'primary',
                  size: 'lg',
                  coachId: 'marketing-rival',
                  disabled: !matchCheck.ok,
                  title: !matchCheck.ok ? matchCheck.reason : undefined,
                  cost: money(matchCost, numberFormat),
                  onClick: () => dispatch({ type: 'matchCoupons' }),
                }
              : rivalKind
                ? {
                    label: RIVAL_COPY[rivalKind].verb,
                    tone: 'primary',
                    size: 'lg',
                    coachId: 'marketing-rival',
                    disabled: !rivalCheck.ok,
                    title: !rivalCheck.ok ? rivalCheck.reason : RIVAL_EFFECT[rivalKind],
                    cost: money(rivalCost, numberFormat),
                    onClick: () => dispatch({ type: 'answerRival' }),
                  }
                : {
                    label: 'Buy ad',
                    tone: 'primary',
                    size: 'lg',
                    coachId: 'marketing-ads',
                    disabled: !canAd,
                    cost: money(s.adCost, numberFormat),
                    onClick: () => dispatch({ type: 'buyAd' }),
                  }
            : printReady
              ? {
                  label: `Print week · ${discountBand}`,
                  tone: 'free',
                  size: 'lg',
                  onClick: () => setFlyerSheet(true),
                }
              : {
                  label: 'Buy ad',
                  tone: 'primary',
                  size: 'lg',
                  coachId: 'marketing-ads',
                  disabled: !canAd,
                  title: !canAd ? `Need ${money(s.adCost, numberFormat)}` : undefined,
                  cost: money(s.adCost, numberFormat),
                  feedback: true,
                  onClick: () => dispatch({ type: 'buyAd' }),
                },
          failReason: curb
            ? war?.active
              ? matchCheck.reason
              : rivalCheck.reason
            : printReady
              ? flyerCheck.reason
              : !canAd
                ? `Need ${money(s.adCost, numberFormat)}`
                : undefined,
          secondaries: [
            ...(s.era >= 2
              ? [{ key: 'flyer', label: 'Flyer desk', fact: `${flyerWeeks}/${DEPTH.flyerWeeksNeed}`, onClick: () => setFlyerSheet(true) }]
              : []),
            {
              key: 'undo',
              label: 'Undo ad',
              disabled: !refundCheck.ok,
              title: !refundCheck.ok ? refundCheck.reason : undefined,
              onClick: () => dispatch({ type: 'refundAd' }),
            },
          ],
        }}
      >
        <div className="p6-row">
          <Badge tone="muted">Ads Lv {s.ads}</Badge>
          {bottleneck.kind !== 'demand' ? (
            <Badge tone="warn" title={`Limit is ${bottleneck.kind}. ${bottleneck.label}`}>
              Ads won’t move baskets
            </Badge>
          ) : (
            <Badge tone="success">Shoppers are the limit · payback {paybackText}</Badge>
          )}
          {celebLeft > 0 ? <Badge tone="muted">Celeb {celebLeft}s</Badge> : null}
        </div>
      <div className="p6-row">
        <Button
          tone="ghost"
          size="sm"
          disabled={!refundCheck.ok}
          title={!refundCheck.ok ? refundCheck.reason : undefined}
          onClick={() => dispatch({ type: 'refundAd' })}
        >
          Undo ad
        </Button>
        {showCelebBuy ? (
          <Button
            tone={celebCheck.ok ? 'primary' : 'ghost'}
            size="sm"
            disabled={!celebCheck.ok}
            title={
              !celebCheck.ok
                ? celebCheck.reason
                : `+25% for ${CELEBRITY_ENDCAP.durationSec}s · ${money(celebrityCashCost(s), numberFormat)} + ${CELEBRITY_ENDCAP.ideasCost} Ideas`
            }
            onClick={() => dispatch({ type: 'buyMemo', id: 'celebrity-endcap' })}
          >
            Celebrity
          </Button>
        ) : null}
      </div>

      <div className="p6-stack">
        <div className="p6-row" title={`Posture fee ${money(fee, numberFormat)}`}>
          {POSTURES.map((p) => {
            const on = posture === p.id
            const check = can(s, { type: 'setMarketingPosture', posture: p.id })
            return (
              <span key={p.id} title={on ? p.blurb : !check.ok ? check.reason : p.blurb}>
                <Chip
                  selected={on}
                  disabled={on || !check.ok}
                  onClick={() => dispatch({ type: 'setMarketingPosture', posture: p.id })}
                >
                  {p.label}
                </Chip>
              </span>
            )
          })}
        </div>

        {s.era >= 2 ? (
          <Sheet
            open={flyerSheet}
            onClose={() => setFlyerSheet(false)}
            title="Flyer Desk"
            reducedMotion={reducedMotion}
            footer={
              <Button tone="ghost" onClick={() => setFlyerSheet(false)}>
                Done
              </Button>
            }
          >
            <div className="p6-stack" data-coach-id="marketing-flyer-band">
              <p className="p6-copy">{flyerCopy}</p>
              <SegmentedControl
                aria-label="Discount band"
                value={discountBand}
                onChange={(v) => setDiscountBand(v as 'soft' | 'mid' | 'deep')}
                options={[
                  { value: 'soft', label: 'Soft', title: 'Safe, pays less' },
                  { value: 'mid', label: 'Mid', title: 'Balanced week' },
                  { value: 'deep', label: 'Deep', title: 'Higher pull · spoil risk on perishables' },
                ]}
              />
              <Button
                tone="primary"
                size="lg"
                disabled={!flyerCheck.ok}
                title={flyerCheck.ok ? undefined : flyerCheck.reason}
                onClick={printFlyer}
              >
                Print week · {discountBand}
              </Button>
            </div>
          </Sheet>
        ) : null}

          {s.era >= 7 ? (
            <div data-coach-id="marketing-broadcast" className="p6-row">
              <span className="p6-muted">Broadcast</span>
              {climates.length === 0 ? (
                <span className="p6-muted">Stock a world first.</span>
              ) : (
                climates.map((climate) => {
                  const check = can(s, { type: 'broadcast', climate })
                  const left = Math.ceil(s.late?.broadcasts?.[climate] ?? 0)
                  return (
                    <Button
                      key={climate}
                      size="sm"
                      tone={left > 0 || check.ok ? 'primary' : 'secondary'}
                      disabled={!check.ok}
                      title={
                        !check.ok
                          ? check.reason
                          : `+${Math.round(LATE.broadcastSalesBump * 100)}% off-world sales per world in this climate for ${LATE.broadcastDurationSec}s.`
                      }
                      onClick={() => dispatch({ type: 'broadcast', climate })}
                    >
                      {climate} · {left > 0 ? `${left}s` : `${LATE.broadcastSurveyCost} survey`}
                    </Button>
                  )
                })
              )}
            </div>
          ) : null}

          {s.era >= 10 ? (
            <div data-coach-id="marketing-wire-ad" className="p6-row">
              <Button
                size="sm"
                tone={wireCheck.ok ? 'primary' : 'secondary'}
                disabled={!wireCheck.ok}
                title={!wireCheck.ok ? wireCheck.reason : undefined}
                onClick={() => dispatch({ type: 'wireAd' })}
              >
                {wireLeft > 0 ? `Wire ad · ${wireLeft}s` : `Wire ad · ${LATE.wireAdSignalCost} signal`}
              </Button>
              <span className="p6-muted">
                ×{LATE.wireAdMul} for {LATE.wireAdDurationSec}s · Signal {(s.horizon?.signal ?? 0).toFixed(1)}
              </span>
            </div>
          ) : null}
      </div>

        {loyaltyOn ? (
          <div className="p6-row" data-coach-id="marketing-loyalty" role="group">
            <span>
              Loyalty T{s.loyalty.tier} · owed {money(s.loyalty.liability, numberFormat)}
            </span>
            <Button
              tone="ghost"
              size="sm"
              disabled={s.loyalty.liability < 0.5 || s.cash < 0.5}
              onClick={() => dispatch({ type: 'redeemLoyalty' })}
            >
              Redeem
            </Button>
          </div>
        ) : null}
      </PlayFrame>
    </section>
  )
}

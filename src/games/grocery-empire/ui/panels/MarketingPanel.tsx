import { INSPECTION } from '../../sim/balance'
import { can } from '../../sim/commands'
import { matchCouponCost } from '../../sim/systems/events'
import { useGame } from '../GameContext'
import { money, pct } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Line } from '../components/Line'
import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

export function MarketingPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const war = s.events?.couponWar
  const warLeft = war?.active ? Math.max(0, Math.ceil(war.endsAt - s.time)) : 0
  const matchCost = matchCouponCost(s)
  const celebUntil = s.campaigns?.celebrityUntil ?? 0
  const celebLeft = celebUntil > s.time ? Math.max(0, Math.ceil(celebUntil - s.time)) : 0

  return (
    <Panel title="Marketing" purpose="Ads, regulars, and the punch card." lore="marketing">
      {celebLeft > 0 ? (
        <Section label="Celebrity endcap">
          <p className="ge-coupon-war" role="status">
            Celebrity on the endcap — demand +25% for {celebLeft}s. Brand may take a nick when they leave.
          </p>
        </Section>
      ) : null}
      {war?.active ? (
        <Section label="Coupon war">
          <p className="ge-coupon-war" role="status">
            Rival circulars are out — demand −8% for {warLeft}s. Match to end early and hold Brand.
          </p>
          <Btn
            tone="primary"
            disabled={!can(s, { type: 'matchCoupons' }).ok}
            onClick={() => dispatch({ type: 'matchCoupons' })}
          >
            Match coupons · {money(matchCost, numberFormat)}
          </Btn>
        </Section>
      ) : null}

      <Section label="Ads">
        <Line left="Level" right={String(s.ads)} />
        <Line left="Next cost" right={money(s.adCost, numberFormat)} />
        <div className="ge-chip-row">
          <Btn
            tone="primary"
            coachId="marketing-ads"
            disabled={s.cash < s.adCost}
            onClick={() => dispatch({ type: 'buyAd' })}
          >
            Buy ad · {money(s.adCost, numberFormat)}
          </Btn>
          <Btn tone="ghost" onClick={() => dispatch({ type: 'refundAd' })}>
            Refund last (10s)
          </Btn>
        </div>
      </Section>

      <Section label="Loyalty">
        <div data-coach-id="marketing-loyalty">
          {s.loyalty.tier <= 0 ? (
            <p className="ge-empty">Punch cards unlock with a memo.</p>
          ) : (
            <>
              <Line left="Tier" right={String(s.loyalty.tier)} />
              <Line left="Liability" right={money(s.loyalty.liability, numberFormat)} muted />
              <Btn
                tone="ghost"
                disabled={s.loyalty.liability < 0.5 || s.cash < 0.5}
                onClick={() => dispatch({ type: 'redeemLoyalty' })}
              >
                Redeem rewards
              </Btn>
            </>
          )}
        </div>
      </Section>

      <Section label="Inspection">
        <Meter
          value={s.inspection.meter}
          max={1}
          label={pct(s.inspection.meter)}
          tone={s.inspection.meter > 0.7 ? 'danger' : 'warn'}
        />
        <Btn
          coachId="call-inspector"
          disabled={s.cash < INSPECTION.inspectorCost}
          onClick={() => dispatch({ type: 'callInspector' })}
        >
          Call inspector · {money(INSPECTION.inspectorCost, numberFormat)}
        </Btn>
      </Section>

      <HelpCard title="Paper and promises">
        Ads buy glances; loyalty buys returns. Ad cost doubles while pull rises slowly — a few buys,
        then price and stock matter more. Inspection is a soft meter with prep, not a game over.
      </HelpCard>
    </Panel>
  )
}

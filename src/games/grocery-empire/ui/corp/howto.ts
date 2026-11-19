import { CO, CORP, CREDIT, CRISIS, EXEC, FRANCHISE, LAB, LAW, PROPERTY, RIVALRY, TOWN } from '../../sim/balance'

/**
 * "How this works" for each company and town screen: four or five plain lines with the
 * real numbers, so nothing has to be guessed.
 */
export const HOWTO: Record<string, string[]> = {
  boardroom: [
    `Your company is worth about ${CO.valMin} minutes of sales, more with a good name and a streak of good quarters.`,
    `Selling a slice gets you cash now. In return, outside owners take ${Math.round(CO.payoutShare * 100)}% of sales split by what they own, every minute, until you buy them back.`,
    'Each owner also changes how the store runs, more strongly the bigger their slice. You always keep at least 30%.',
    `Going public (Era ${CO.ipoEra}+) sells to everyone at once. Every ${CO.quarterSec / 60}-minute quarter you must beat last quarter's sales by about ${Math.round(CO.targetGrowth * 100)}%; miss it and shareholders want a meeting.`,
    'Owners and the public vote on board proposals. Over half the shares wins; lunch can win an owner over.',
  ],
  execs: [
    `Six chairs. Each executive earns a salary every minute (a few seconds of sales) and improves one part of the company.`,
    `They level up the longer they stay (every ${EXEC.levelEverySec / 60} minutes, up to ${EXEC.levelMax}).`,
    'Traits matter: Brilliant is strong and pricey; Loose cannons post unwise things; Shady ones get results and may skim.',
    'If the payroll bounces, they quit.',
  ],
  market: [
    `Every company has ${CORP.sharesPerCompany} shares. Prices wander, react to market news and to rival store counts.`,
    'Young companies grow for about an era after they list, then settle; dividend stocks pay every minute.',
    `Each trade costs ${CORP.tradeFee * 100}% (a CFO halves it). Own 51% of a rival and you can take them over.`,
    `The crate desk: lock crate prices for ${CORP.hedgeSec / 60} minutes, or bet on where they go in ${CORP.betSec / 60}.`,
  ],
  treasury: [
    `Credit runs from ${CREDIT.min} to ${CREDIT.max}. It climbs while you carry a bond and pay on time.`,
    `Bonds give you cash now; coupons every ${CREDIT.couponEverySec / 60} minutes and the rest after ${CREDIT.bondTermSec / 60}. Better credit, cheaper money.`,
    `Miss a payment and it lands in arrears: creditors take ${Math.round(CREDIT.garnishShare * 100)}% of sales until it's paid, and nobody lends to you meanwhile.`,
    `At ${CREDIT.primeAt}+ (prime), crates cost a little less.`,
    'Insurance premiums come out every minute; claims pay back part of a loss and raise that premium for a while.',
  ],
  court: [
    `Answer a lawsuit within ${LAW.answerSec / 60} minutes, or lose by default and pay half again on top.`,
    `Settling pays ${Math.round(LAW.settleShare * 100)}% of the claim and ends it. A trial is a roll: lawyers, the judge and your General Counsel shift the odds.`,
    `Win at trial and they pay your costs. Lose and you pay the claim (liability cover pays part).`,
    `You can sue a rival whose grudge is ${LAW.sueGrudge}+. Customer suits start in Era ${LAW.customerEra}.`,
  ],
  lab: [
    'One project at a time. Each invention leaves a lasting effect for the rest of the run.',
    `Patent it within ${LAB.copyAfterSec / 60} minutes or a rival copies it, and it counts for half.`,
    'A patent can be licensed to rivals: royalties every minute, but it counts for half for you.',
    'Expand the lab, fund the Library, or hire a Head of Research to work faster.',
  ],
  property: [
    'Each lot you own near the store brings a few shoppers.',
    `Values grow slowly (faster with a good name). Selling costs ${Math.round(PROPERTY.sellFee * 100)}%.`,
    'Let a lot to a café for steady rent, to a rival for top rent (they take a few shoppers), or keep it as your own annex (more shoppers, no rent).',
  ],
  franchise: [
    `From Era ${FRANCHISE.era}, sell up to ${FRANCHISE.perEra} franchises an era. Each pays ${FRANCHISE.feeMin} minutes of sales up front.`,
    'Royalties come in every minute, by how well they run the store. Some get better, some get sloppy.',
    `Below ${FRANCHISE.badBelow}% quality a franchise sours your brand. Inspect it to lift quality, or pull the licence.`,
  ],
  customers: [
    'Seven groups shop with you. Each wants a price level, certain aisles and sometimes certain hours or causes.',
    'Their loyalty drifts toward how well you fit them. Loyal groups bring more shoppers; unhappy ones bring fewer.',
    'Court one group to win its loyalty faster and draw more of it in. Nothing changes until you start courting.',
  ],
  foundation: [
    `Giving builds goodwill: shoppers (up to +${Math.round(TOWN.goodwillDemandCap * 100)}%), a little cooler Heat, and character witnesses (${TOWN.witnessCost} goodwill softens one sentence).`,
    `Each cause levels up as you give. At level ${TOWN.perkAt} it unlocks a perk that grows with more levels.`,
    `Goodwill fades slowly. Hold ${TOWN.awardGoodwill}+ when the judges meet to win the Golden Basket (brand).`,
  ],
  cityhall: [
    'Follow an election to start the race. Donations move the vote; your press can endorse.',
    `The winner's platform is the law for ${TOWN.termSec / 60} minutes: it can help or hurt you.`,
    `Back the winner and they owe you ${TOWN.favorsPerWin} favours. Back the loser and they remember (Heat +${TOWN.loserGrudgeHeat}).`,
  ],
  union: [
    `Your crew forms a union at ${TOWN.unionStaff} staff. Demands come every ${TOWN.demandGapSec / 60} minutes or so.`,
    'Sign one and the contract changes wages and service for good. Leave it and nothing happens.',
    `Refuse ${TOWN.strikeAfterRefusals} in a row and they strike: half the shoppers until it ends or you give in on pay.`,
  ],
  press: [
    'Each outlet you own brings a few shoppers and makes every story louder.',
    'Stories spend credibility; it comes back over time. Low credibility, weaker stories.',
    'Hyping a stock is a bit illegal: it adds Heat.',
  ],
  rivals: [
    `Bosses only hold a grudge for what you do: price wars, moles, lawsuits, buying their shares. Past ${RIVALRY.actAt} they hit back.`,
    'A price war is best of three: undercut beats hold, match beats undercut, hold beats match. Bosses learn your last move.',
    'A mole loses cover over time and with every job. A caught mole costs Heat, brand and a lawsuit.',
    `Own ${RIVALRY.takeoverShares / 10}% of a rival on the Exchange to take them over. Past ${RIVALRY.pillAt / 10}% they dilute you.`,
  ],
  crisis: [`Crises only find a company in the public eye (listed, with owners, press or executives). Answer within ${CRISIS.waitSec / 60} minutes.`],
}

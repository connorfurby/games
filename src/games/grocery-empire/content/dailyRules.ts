import { DAILY_RULE_ORDER, DAILY_RULES, type DailyRuleId } from '../sim/balance'

/** Player-facing words for each daily twist. Numbers live in balance.ts. */
export const DAILY_RULE_TEXT: Record<DailyRuleId, { name: string; line: string }> = {
  'morning-rush': { name: 'Morning rush', line: 'More shoppers all day, but the crew wants more pay.' },
  'delivery-day': { name: 'Delivery day', line: 'Trucks arrive much sooner, but crates cost a little more.' },
  'market-day': { name: 'Market day', line: 'Crates are cheaper, but the market down the road draws some shoppers away.' },
  payday: { name: 'Payday', line: 'Everyone is spending, so more shoppers. Wholesalers know it too: crates cost more.' },
  'school-run': { name: 'School run', line: 'A few more shoppers, but traffic slows the trucks.' },
  'late-shift': { name: 'Late shift', line: 'Wages are lower, and a few fewer shoppers come by.' },
  'street-fair': { name: 'Street fair', line: 'Crowds everywhere: lots more shoppers, and the crew earns overtime.' },
  'stock-take': { name: 'Stock take', line: 'Crates are much cheaper, but trucks crawl.' },
}

/** The rule for a daily seed. Same pick as the daily theme's second word, so the name fits. */
export function dailyRuleForSeed(seed: number): DailyRuleId {
  return DAILY_RULE_ORDER[Math.abs(Math.floor(seed / 8)) % DAILY_RULE_ORDER.length]!
}

/** "+15% shoppers · +15% wages" from the numbers, for tooltips and tests. */
export function dailyRuleFigures(id: DailyRuleId): string {
  const mods = DAILY_RULES[id]
  const parts: string[] = []
  const pct = (m: number) => `${m > 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)}%`
  if (mods.demand) parts.push(`${pct(mods.demand)} shoppers`)
  if (mods.crateCost) parts.push(`${pct(mods.crateCost)} crate prices`)
  if (mods.truckTime) parts.push(`${pct(mods.truckTime)} truck time`)
  if (mods.wages) parts.push(`${pct(mods.wages)} wages`)
  return parts.join(' · ')
}

import type { GameState } from '../sim/state'

export const TREE_IDS = ['floor', 'people', 'supply', 'brand', 'capital', 'automation', 'space'] as const
export type TreeId = (typeof TREE_IDS)[number]

export const TREES: Record<TreeId, { name: string; blurb: string }> = {
  floor: { name: 'Floor', blurb: 'Hands, shelves, and how much each shopper carries out.' },
  people: { name: 'People', blurb: 'Wages, morale, and how fast staff learn.' },
  supply: { name: 'Supply', blurb: 'Cheaper crates, faster trucks, more room in back.' },
  brand: { name: 'Brand', blurb: 'Ads, loyalty, weather, and inspection goodwill.' },
  capital: { name: 'Capital', blurb: 'Interest, debt, and soft landings.' },
  automation: { name: 'Automation', blurb: 'Less clicking, same store.' },
  space: { name: 'Space', blurb: 'Shell, survey, drift resist — Era 5+. Mild until barges exist.' },
}

export interface UpgradeDef {
  id: string
  tree: TreeId
  name: string
  /** Effect of one level, phrased for the next-level preview. */
  per: string
  blurb: string
  max: number
  base: number
  growth: number
  /** Optional visibility gate. Hidden nodes never block a tree. */
  visible?: (s: GameState) => boolean
}

const hasStaff = (s: GameState) => s.staff.length > 0

export const UPGRADES: UpgradeDef[] = [
  // Floor
  { id: 'quick-hands', tree: 'floor', name: 'Quick Hands', per: '+1 unit per Unpack click', blurb: 'Two hands, then three, then a technique.', max: 5, base: 30, growth: 2.2 },
  { id: 'basket-size', tree: 'floor', name: 'Bigger Baskets', per: '+5% units per shopper', blurb: 'Wider handles. People fill what they carry.', max: 10, base: 60, growth: 1.7 },
  { id: 'shelf-depth', tree: 'floor', name: 'Deeper Shelves', per: '+10 shelf capacity', blurb: 'More facings before the shelf looks full.', max: 8, base: 45, growth: 1.6 },
  { id: 'price-iq', tree: 'floor', name: 'Price IQ', per: 'Show the best-profit price', blurb: 'A pencil note on the register: where profit peaks at today’s cost.', max: 1, base: 75, growth: 1 },
  { id: 'hold-unpack', tree: 'floor', name: 'Steady Rhythm', per: 'Hold Unpack to repeat', blurb: 'Hold the button instead of clicking it.', max: 1, base: 40, growth: 1 },
  { id: 'endcap-design', tree: 'floor', name: 'Endcap Design', per: '+1% demand per endcap', blurb: 'Endcaps that people actually notice.', max: 5, base: 200, growth: 1.9, visible: (s) => s.menus.build },
  // People
  { id: 'wage-eff', tree: 'people', name: 'Fair Scheduling', per: '−4% wages', blurb: 'Shifts that match the rush.', max: 10, base: 50, growth: 1.6, visible: hasStaff },
  { id: 'morale-regen', tree: 'people', name: 'Break Room Coffee', per: '+20% morale recovery', blurb: 'The cheapest morale in retail.', max: 5, base: 40, growth: 1.8, visible: hasStaff },
  { id: 'xp-gain', tree: 'people', name: 'Shadowing', per: '+25% staff XP', blurb: 'New hires follow someone good.', max: 5, base: 70, growth: 1.9, visible: hasStaff },
  { id: 'training', tree: 'people', name: 'Training Manuals', per: '+1 staff level cap', blurb: 'Binders with tabs. Somebody reads them.', max: 5, base: 120, growth: 2.1, visible: hasStaff },
  { id: 'hiring-fair', tree: 'people', name: 'Hiring Fair', per: '−5% hiring cost', blurb: 'Folding table, clipboard, free cookies.', max: 5, base: 60, growth: 1.8, visible: hasStaff },
  { id: 'night-bonus', tree: 'people', name: 'Night Rhythm', per: '+5% night efficiency', blurb: 'The late crowd likes a calm store.', max: 5, base: 150, growth: 1.8, visible: (s) => !!s.memos['night-latch'] },
  // Supply
  { id: 'wholesale-discount', tree: 'supply', name: 'Haggle', per: '−2% wholesale cost', blurb: 'Small, permanent, compounding.', max: 10, base: 40, growth: 1.7, visible: (s) => s.stats.ordersPlaced > 0 },
  { id: 'delivery-speed', tree: 'supply', name: 'Phone Ahead', per: '−10% delivery time', blurb: 'Trucks leave sooner if you call first.', max: 5, base: 50, growth: 1.8, visible: (s) => s.stats.ordersPlaced > 0 },
  { id: 'racks', tree: 'supply', name: 'Backroom Racks', per: '+25 backroom capacity', blurb: 'Vertical space is free space.', max: 10, base: 35, growth: 1.55 },
  { id: 'crate-size', tree: 'supply', name: 'Bigger Crates', per: '+4 units per crate', blurb: 'Same truck, better packing.', max: 5, base: 80, growth: 1.9, visible: (s) => s.stats.ordersPlaced >= 3 },
  { id: 'shrink-sense', tree: 'supply', name: 'Shrink Sense', per: '−6% shrink', blurb: 'Counting things makes them stay.', max: 5, base: 60, growth: 1.8, visible: (s) => s.stats.shrunk > 0 },
  { id: 'supplier-terms', tree: 'supply', name: 'Discount Terms', per: '−20% short-ship chance', blurb: 'Reliable customers get reliable trucks.', max: 4, base: 100, growth: 1.9, visible: (s) => !!s.memos['second-wholesaler'] },
  // Brand
  { id: 'ad-eff', tree: 'brand', name: 'Better Copy', per: '+0.5% per ad level', blurb: 'Same ad budget, sharper words.', max: 5, base: 80, growth: 1.9, visible: (s) => s.menus.marketing },
  { id: 'curb-appeal', tree: 'brand', name: 'Curb Appeal', per: '+3% demand', blurb: 'Swept sidewalk, lit sign.', max: 10, base: 55, growth: 1.65 },
  { id: 'loyalty-earn', tree: 'brand', name: 'Loyal Regulars', per: '+10% loyalty bonus', blurb: 'They come back for the punch card and stay for you.', max: 5, base: 120, growth: 1.8, visible: (s) => s.loyalty.tier > 0 },
  { id: 'inspection-cushion', tree: 'brand', name: 'Good Standing', per: '−10% inspection fines', blurb: 'Inspectors remember a tidy store.', max: 5, base: 70, growth: 1.7, visible: (s) => s.inspection.meter > 0.1 || s.stats.inspections > 0 },
  { id: 'weather-read', tree: 'brand', name: 'Weather Window', per: '+20% weather bonuses', blurb: 'Umbrellas by the door when it rains.', max: 3, base: 90, growth: 2, visible: (s) => s.era >= 1 },
  // Capital
  { id: 'passbook-rate', tree: 'capital', name: 'Better Passbook', per: '+15% passbook interest', blurb: 'Ask the teller nicely.', max: 10, base: 100, growth: 1.75, visible: (s) => s.menus.invest },
  { id: 'debt-plan', tree: 'capital', name: 'Repayment Plan', per: '+25% debt paydown', blurb: 'Pay it off faster, worry less.', max: 4, base: 40, growth: 1.8, visible: (s) => s.debt.taken > 0 },
  { id: 'arrears-grace', tree: 'capital', name: 'Landlord Rapport', per: '+20% arrears cap', blurb: 'A landlord who knows your name.', max: 3, base: 50, growth: 2, visible: (s) => s.stats.rentPaid > 10 },
  { id: 'cash-drawer', tree: 'capital', name: 'Cash Drawer Float', per: '+$5 on bailouts', blurb: 'A twenty taped under the drawer.', max: 3, base: 30, growth: 2 },
  // Automation
  { id: 'clerk-throughput', tree: 'automation', name: 'Box-Cutter Holsters', per: '+8% staff unpack', blurb: 'Every second fumbling for a cutter is a second not stocking.', max: 10, base: 60, growth: 1.6, visible: hasStaff },
  { id: 'restock-smarts', tree: 'automation', name: 'Restock Smarts', per: 'Auto-restock waits for dips', blurb: 'The clipboard learns to wait for a dip.', max: 3, base: 300, growth: 2.2, visible: (s) => !!s.memos['auto-order'] },
  { id: 'auto-collect', tree: 'automation', name: 'Venture Runner', per: 'Ventures pay out on their own', blurb: 'A kid on a bike brings the cart money in.', max: 1, base: 400, growth: 1, visible: (s) => s.menus.ventures },
  { id: 'auto-inspector', tree: 'automation', name: 'Standing Appointment', per: 'Calls the inspector at 80%', blurb: 'The inspector comes before it gets bad.', max: 1, base: 250, growth: 1, visible: (s) => s.stats.inspectorCalls > 0 },
  { id: 'auto-pizza', tree: 'automation', name: 'Pizza Standing Order', per: 'Pizza when morale dips', blurb: 'Friday comes on its own.', max: 1, base: 200, growth: 1, visible: (s) => !!s.memos['pizza-friday'] },
  // Space (Era 5+ teasers; mild until fleet systems read these levels)
  { id: 'shell-eff', tree: 'space', name: 'Shell Efficiency', per: '+4% shell value', blurb: 'Thinner armor, same survival curve.', max: 10, base: 1e6, growth: 1.55, visible: (s) => s.era >= 5 },
  { id: 'survey-yield', tree: 'space', name: 'Survey Yield', per: '+5% survey finds', blurb: 'Better charts of empty places.', max: 8, base: 2e6, growth: 1.6, visible: (s) => s.era >= 5 },
  { id: 'drift-resist', tree: 'space', name: 'Drift Resist', per: '+3% Off-Brand resistance', blurb: 'Your label stays yours.', max: 8, base: 3e6, growth: 1.65, visible: (s) => s.era >= 5 },
  { id: 'legacy-gain', tree: 'space', name: 'Legacy Gain', per: '+5% Legacy from war', blurb: 'Plaques remember winners.', max: 5, base: 5e6, growth: 1.7, visible: (s) => s.era >= 5 },
  { id: 'reboot-discount', tree: 'space', name: 'Reboot Discount', per: '−8% Reboot Fleet cost', blurb: 'Respec without the lecture.', max: 5, base: 4e6, growth: 1.8, visible: (s) => s.era >= 5 },
]

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]))

export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.ceil(def.base * Math.pow(def.growth, level))
}

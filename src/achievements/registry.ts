import type { GameState } from '@/games/grocery-empire/sim/state'
import type { MetaSave } from '@/shared/types'
import { emitAchievementToast } from './toastBus'

export interface AchievementDef {
  id: string
  name: string
  blurb: string
  tier: 'bronze' | 'silver' | 'gold' | 'mythic'
  hidden?: boolean
  tokens: number
  test: (s: GameState, meta: MetaSave) => boolean
  progress?: (s: GameState, meta?: MetaSave) => number
  progressMax?: number
  unlockPack?: string
}

const sold = (s: GameState) => s.stats.sold
const baskets = (s: GameState) => s.baskets
const staffRole = (s: GameState, role: string) => s.staff.some((x) => x.role === role)
const packsOwned = (meta: MetaSave) => meta.unlockedPacks.length
const achCount = (meta: MetaSave) => Object.keys(meta.achievements).length
const charterSpent = (s: GameState) => Object.values(s.fleet.charter).reduce((a, n) => a + (n ?? 0), 0)

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Era 0 ────────────────────────────────────────────────────────────────
  { id: 'first-basket', name: 'First Basket', blurb: 'Sell your first basket.', tier: 'bronze', tokens: 1, test: (s) => sold(s) >= 1 },
  { id: 'unpack-10', name: 'Box Opener', blurb: 'Unpack 10 units by hand.', tier: 'bronze', tokens: 1, test: (s) => s.stats.unpackedManual >= 10, progress: (s) => Math.min(10, s.stats.unpackedManual), progressMax: 10 },
  { id: 'unpack-100', name: 'Tape Cuts', blurb: 'Unpack 100 units by hand.', tier: 'bronze', tokens: 1, test: (s) => s.stats.unpackedManual >= 100, progress: (s) => Math.min(100, s.stats.unpackedManual), progressMax: 100 },
  { id: 'unpack-1k', name: 'Cardboard Forest', blurb: 'Unpack 1,000 units by hand.', tier: 'silver', tokens: 2, test: (s) => s.stats.unpackedManual >= 1000, progress: (s) => Math.min(1000, s.stats.unpackedManual), progressMax: 1000 },
  { id: 'wholesale-1', name: 'First Invoice', blurb: 'Place a wholesale order.', tier: 'bronze', tokens: 1, test: (s) => s.stats.ordersPlaced >= 1 },
  { id: 'wholesale-10', name: 'Standing Order', blurb: 'Place 10 wholesale orders.', tier: 'bronze', tokens: 1, test: (s) => s.stats.ordersPlaced >= 10, progress: (s) => Math.min(10, s.stats.ordersPlaced), progressMax: 10 },
  { id: 'buy-below-85', name: 'Dip Buyer', blurb: 'Buy when the can is under $0.85.', tier: 'bronze', tokens: 1, test: (s) => s.stats.ordersBelow85 >= 1 },
  { id: 'buy-below-85-x5', name: 'Dip Habit', blurb: 'Buy under $0.85 five times.', tier: 'silver', tokens: 2, test: (s) => s.stats.ordersBelow85 >= 5, progress: (s) => Math.min(5, s.stats.ordersBelow85), progressMax: 5 },
  { id: 'price-tinker', name: 'Price Tinker', blurb: 'Change the price once.', tier: 'bronze', tokens: 1, test: (s) => s.stats.priceChanges >= 1 },
  { id: 'price-tinker-10', name: 'Price Fidget', blurb: 'Change the price 10 times.', tier: 'bronze', tokens: 1, test: (s) => s.stats.priceChanges >= 10, progress: (s) => Math.min(10, s.stats.priceChanges), progressMax: 10 },
  { id: 'baskets-100', name: 'Hundred Baskets', blurb: 'Lifetime baskets ≥ 100.', tier: 'bronze', tokens: 1, test: (s) => baskets(s) >= 100, progress: (s) => Math.min(100, baskets(s)), progressMax: 100 },
  { id: 'baskets-500', name: 'Five Hundred', blurb: 'Lifetime baskets ≥ 500.', tier: 'bronze', tokens: 1, test: (s) => baskets(s) >= 500, progress: (s) => Math.min(500, baskets(s)), progressMax: 500 },
  { id: 'ledger-tape', name: 'Tape Roll', blurb: 'Buy Ledger Tape.', tier: 'bronze', tokens: 1, test: (s) => !!s.memos['ledger-tape'] },
  { id: 'help-wanted', name: 'Help Wanted', blurb: 'Post the help wanted sign.', tier: 'bronze', tokens: 1, test: (s) => !!s.memos['help-wanted'] },
  { id: 'hire-clerk', name: 'First Hire', blurb: 'Hire a clerk.', tier: 'bronze', tokens: 1, test: (s) => staffRole(s, 'clerk') },
  { id: 'era-1', name: 'Corner Open', blurb: 'Reach Era 1.', tier: 'bronze', tokens: 1, test: (s) => s.era >= 1 },
  { id: 'cash-50', name: 'Till Float', blurb: 'Hold $50 cash.', tier: 'bronze', tokens: 1, test: (s) => s.cash >= 50 },
  { id: 'cash-200', name: 'Safe Drawer', blurb: 'Hold $200 cash.', tier: 'bronze', tokens: 1, test: (s) => s.cash >= 200 },
  { id: 'revenue-100', name: 'First Hundred', blurb: 'Earn $100 lifetime revenue.', tier: 'bronze', tokens: 1, test: (s) => s.lifetimeRevenue >= 100, progress: (s) => Math.min(100, s.lifetimeRevenue), progressMax: 100 },
  { id: 'sold-50', name: 'Busy Counter', blurb: 'Sell 50 units.', tier: 'bronze', tokens: 1, test: (s) => sold(s) >= 50, progress: (s) => Math.min(50, sold(s)), progressMax: 50 },

  // ── Era 1 ops ────────────────────────────────────────────────────────────
  { id: 'first-spoil', name: 'First Spoilage', blurb: 'Watch something wilt.', tier: 'bronze', tokens: 1, test: (s) => s.stats.spoiled >= 1 },
  { id: 'produce', name: 'Open Produce', blurb: 'Unlock produce crates.', tier: 'bronze', tokens: 1, test: (s) => s.categories.produce },
  { id: 'household', name: 'Household Aisle', blurb: 'Unlock household.', tier: 'bronze', tokens: 1, test: (s) => s.categories.household },
  { id: 'dairy', name: 'Dairy Case', blurb: 'Unlock dairy.', tier: 'silver', tokens: 2, test: (s) => s.categories.dairy },
  { id: 'meat', name: 'Butcher Block', blurb: 'Unlock meat.', tier: 'silver', tokens: 2, test: (s) => s.categories.meat },
  { id: 'hire-stocker', name: 'FIFO Friend', blurb: 'Hire a stocker.', tier: 'bronze', tokens: 1, test: (s) => staffRole(s, 'stocker') },
  { id: 'hire-cashier', name: 'Register Open', blurb: 'Hire a cashier.', tier: 'bronze', tokens: 1, test: (s) => staffRole(s, 'cashier') },
  { id: 'hire-security', name: 'Mirror Watch', blurb: 'Hire security.', tier: 'bronze', tokens: 1, test: (s) => staffRole(s, 'security') },
  { id: 'night-owl', name: 'Night Owl', blurb: 'Hire a night clerk.', tier: 'bronze', tokens: 1, test: (s) => staffRole(s, 'night'), unlockPack: 'night-shift' },
  { id: 'crew-5', name: 'Full Shift', blurb: 'Have 5 staff on payroll.', tier: 'silver', tokens: 2, test: (s) => s.staff.length >= 5, progress: (s) => Math.min(5, s.staff.length), progressMax: 5 },
  { id: 'ads5', name: 'Circular Habit', blurb: 'Reach ad level 6.', tier: 'silver', tokens: 2, test: (s) => s.ads >= 6, unlockPack: 'sunday-flyer' },
  { id: 'ads-buy', name: 'Flyer Run', blurb: 'Buy an ad level once.', tier: 'bronze', tokens: 1, test: (s) => s.stats.adsBought >= 1 },
  { id: 'loyalty', name: 'Punch Card', blurb: 'Start a loyalty tier.', tier: 'bronze', tokens: 1, test: (s) => s.loyalty.tier >= 1 },
  { id: 'loyalty-3', name: 'Frequent Guest', blurb: 'Reach loyalty tier 3.', tier: 'silver', tokens: 2, test: (s) => s.loyalty.tier >= 3 },
  { id: 'shrink-seen', name: 'Shrink Sense', blurb: 'Lose a unit to shrink.', tier: 'bronze', tokens: 1, test: (s) => s.stats.shrunk >= 1 },
  { id: 'shrink-50', name: 'Mirror Tax', blurb: 'Lose 50 units to shrink.', tier: 'silver', tokens: 2, test: (s) => s.stats.shrunk >= 50, progress: (s) => Math.min(50, s.stats.shrunk), progressMax: 50 },
  { id: 'inspection-fail', name: 'Clipboard Day', blurb: 'Fail an inspection (recoverable).', tier: 'bronze', tokens: 1, test: (s) => s.stats.inspectionsFailed >= 1 },
  { id: 'inspector-call', name: 'Early Call', blurb: 'Call the inspector yourself.', tier: 'bronze', tokens: 1, test: (s) => s.stats.inspectorCalls >= 1 },
  { id: 'inspections-3', name: 'Clipboard Stack', blurb: 'Survive 3 inspections.', tier: 'bronze', tokens: 1, test: (s) => s.stats.inspections >= 3, progress: (s) => Math.min(3, s.stats.inspections), progressMax: 3 },
  { id: 'bailout', name: 'Tight Week', blurb: 'Accept a bailout. Delay, not doom.', tier: 'bronze', tokens: 1, test: (s) => s.stats.bailouts >= 1 },
  { id: 'mentor', name: 'Mentor Crate', blurb: 'Receive mentor restock.', tier: 'bronze', tokens: 1, test: (s) => s.stats.helperCrates >= 1 },
  { id: 'pizza', name: 'Pizza Friday', blurb: 'Order pizza for the crew.', tier: 'bronze', tokens: 1, test: (s) => s.stats.pizzas >= 1 },
  { id: 'second-supplier', name: 'Second Line', blurb: 'Unlock supplier B.', tier: 'silver', tokens: 2, test: (s) => !!s.memos['second-wholesaler'] },
  { id: 'back-office', name: 'Back Office', blurb: 'Open the attention desk.', tier: 'silver', tokens: 2, test: (s) => s.compute.unlocked },
  { id: 'ideas', name: 'Napkin Drawer', blurb: 'Unlock Ideas.', tier: 'silver', tokens: 2, test: (s) => s.compute.ideasUnlocked },
  { id: 'archives-3', name: 'Filing Habit', blurb: 'Own 3 Archives.', tier: 'silver', tokens: 2, test: (s) => s.compute.archives >= 3 },
  { id: 'archives-10', name: 'Filing Room', blurb: 'Own 10 Archives.', tier: 'gold', tokens: 3, test: (s) => s.compute.archives >= 10, progress: (s) => Math.min(10, s.compute.archives), progressMax: 10 },
  { id: 'passbook', name: 'Little Blue Book', blurb: 'Open the passbook.', tier: 'bronze', tokens: 1, test: (s) => s.menus.invest },
  { id: 'passbook-deposit', name: 'Rainy Day', blurb: 'Hold $50 in the passbook.', tier: 'bronze', tokens: 1, test: (s) => s.passbook.balance >= 50 },
  { id: 'passbook-200', name: 'Nest Egg', blurb: 'Hold $200 in the passbook.', tier: 'silver', tokens: 2, test: (s) => s.passbook.balance >= 200 },
  { id: 'upgrade-1', name: 'Binder Page', blurb: 'Buy an upgrade level.', tier: 'bronze', tokens: 1, test: (s) => s.stats.upgradesBought >= 1 },
  { id: 'upgrade-10', name: 'Binder Full', blurb: 'Buy 10 upgrade levels.', tier: 'silver', tokens: 2, test: (s) => s.stats.upgradesBought >= 10, progress: (s) => Math.min(10, s.stats.upgradesBought), progressMax: 10 },
  { id: 'build-cooler', name: 'Reach-in', blurb: 'Build a cooler.', tier: 'silver', tokens: 2, test: (s) => (s.builds.cold ?? 0) >= 1, unlockPack: 'cold-room' },
  { id: 'builds-3', name: 'Contractor Habit', blurb: 'Buy 3 builds.', tier: 'silver', tokens: 2, test: (s) => s.stats.buildsBought >= 3, progress: (s) => Math.min(3, s.stats.buildsBought), progressMax: 3 },
  { id: 'coffee', name: 'Side Hustle', blurb: 'Open the coffee cart.', tier: 'bronze', tokens: 1, test: (s) => (s.ventures.coffee?.level ?? 0) >= 1 },
  { id: 'mealkits', name: 'Recipe Card', blurb: 'Open meal kits.', tier: 'silver', tokens: 2, test: (s) => (s.ventures.mealkits?.level ?? 0) >= 1 },
  { id: 'venture-collect', name: 'Side Till', blurb: 'Collect from a venture once.', tier: 'bronze', tokens: 1, test: (s) => s.stats.ventureCollects >= 1 },
  { id: 'lot', name: 'Lot Next Door', blurb: 'Buy the lot.', tier: 'silver', tokens: 3, test: (s) => !!s.expansions.lot },
  { id: 'side-yard', name: 'Side Yard', blurb: 'Expand the side yard.', tier: 'bronze', tokens: 1, test: (s) => !!s.expansions['side-yard'] },
  { id: 'baskets1k', name: 'Thousand Baskets', blurb: 'Lifetime baskets ≥ 1,000.', tier: 'silver', tokens: 2, test: (s) => baskets(s) >= 1000, progress: (s) => Math.min(1000, baskets(s)), progressMax: 1000, unlockPack: 'corner-bodega' },
  { id: 'baskets10k', name: 'Ten Thousand', blurb: 'Lifetime baskets ≥ 10,000.', tier: 'gold', tokens: 4, test: (s) => baskets(s) >= 10_000, progress: (s) => Math.min(10_000, baskets(s)), progressMax: 10_000 },
  { id: 'baskets100k', name: 'Hundred Thousand', blurb: 'Lifetime baskets ≥ 100,000.', tier: 'gold', tokens: 5, test: (s) => baskets(s) >= 100_000, progress: (s) => Math.min(100_000, baskets(s)), progressMax: 100_000 },
  { id: 'memos-10', name: 'Memo Stack', blurb: 'Complete 10 memos.', tier: 'silver', tokens: 2, test: (s) => s.stats.memosDone >= 10, progress: (s) => Math.min(10, s.stats.memosDone), progressMax: 10 },
  { id: 'memos-25', name: 'Memo Drawer', blurb: 'Complete 25 memos.', tier: 'gold', tokens: 3, test: (s) => s.stats.memosDone >= 25, progress: (s) => Math.min(25, s.stats.memosDone), progressMax: 25 },
  { id: 'empire5', name: 'Empire Rising', blurb: 'Reach Empire Level 5.', tier: 'silver', tokens: 2, test: (s) => s.empire.level >= 5 },
  { id: 'empire10', name: 'Empire Ledger', blurb: 'Reach Empire Level 10.', tier: 'gold', tokens: 4, test: (s) => s.empire.level >= 10 },
  { id: 'spoil-100', name: 'Compost Bin', blurb: 'Spoil 100 units.', tier: 'silver', tokens: 2, test: (s) => s.stats.spoiled >= 100 },
  { id: 'spoil-10k', name: 'Compost King', blurb: 'Spoil 10,000 units.', tier: 'gold', tokens: 4, test: (s) => s.stats.spoiled >= 10_000, progress: (s) => Math.min(10_000, s.stats.spoiled), progressMax: 10_000 },
  { id: 'intervention', name: 'Operations Intervened', blurb: 'Trigger the softlock watchdog.', tier: 'bronze', tokens: 1, test: (s) => s.stats.interventions >= 1 },
  { id: 'private-label', name: 'Your Name on a Can', blurb: 'Unlock private label.', tier: 'gold', tokens: 3, test: (s) => s.categories.privateLabel },
  { id: 'nephew', name: 'Nephew Float', blurb: 'Take the nephew’s float.', tier: 'bronze', tokens: 1, test: (s) => s.debt.taken >= 1 },
  { id: 'corner-storefront', name: 'Corner Storefront', blurb: 'Upgrade storefront to Corner Store.', tier: 'silver', tokens: 2, test: (s) => (s.builds.storefront ?? 0) >= 2 },
  { id: 'attention-fill', name: 'Desk Full', blurb: 'Fill attention once.', tier: 'bronze', tokens: 1, test: (s) => s.stats.attentionFilled >= 1 },
  { id: 'ideas-10', name: 'Napkin Ten', blurb: 'Earn 10 ideas.', tier: 'silver', tokens: 2, test: (s) => s.stats.ideasEarned >= 10, progress: (s) => Math.min(10, s.stats.ideasEarned), progressMax: 10 },
  { id: 'weather', name: 'Barometer', blurb: 'Survive a weather day.', tier: 'bronze', tokens: 1, test: (s) => s.stats.weatherDays >= 1 },
  { id: 'short-ship', name: 'Short Box', blurb: 'Get short-shipped once.', tier: 'bronze', tokens: 1, test: (s) => s.stats.shortShips >= 1 },
  { id: 'rent-paid', name: 'First Rent', blurb: 'Pay rent once.', tier: 'bronze', tokens: 1, test: (s) => s.stats.rentPaid >= 1 },
  { id: 'wages-paid', name: 'Payday', blurb: 'Pay wages once.', tier: 'bronze', tokens: 1, test: (s) => s.stats.wagesPaid >= 1 },
  { id: 'play-1h', name: 'Hour on the Floor', blurb: 'Play 1 hour of sim time.', tier: 'bronze', tokens: 1, test: (s) => s.stats.playSec >= 3600, progress: (s) => Math.min(3600, s.stats.playSec), progressMax: 3600 },
  { id: 'offline-1', name: 'Closed Sign', blurb: 'Earn offline progress once.', tier: 'bronze', tokens: 1, test: (s) => s.stats.offlineSec >= 1 },

  // ── Meta / shelf ─────────────────────────────────────────────────────────
  { id: 'meta-token-1', name: 'Shelf Token', blurb: 'Earn your first shelf token from any other achievement.', tier: 'bronze', tokens: 0, test: (_s, m) => Object.keys(m.achievements).some((id) => id !== 'meta-token-1') },
  { id: 'meta-token-10', name: 'Token Jar', blurb: 'Hold 10 shelf tokens at once.', tier: 'silver', tokens: 1, test: (_s, m) => m.shelfTokens >= 10 },
  { id: 'meta-token-25', name: 'Token Drawer', blurb: 'Hold 25 shelf tokens at once.', tier: 'gold', tokens: 2, test: (_s, m) => m.shelfTokens >= 25 },
  { id: 'meta-pack-2', name: 'Second Spine', blurb: 'Own 2 texture packs.', tier: 'bronze', tokens: 1, test: (_s, m) => packsOwned(m) >= 2 },
  { id: 'meta-pack-4', name: 'Pack Shelf', blurb: 'Own 4 texture packs.', tier: 'silver', tokens: 2, test: (_s, m) => packsOwned(m) >= 4 },
  { id: 'meta-ach-10', name: 'Ribbon Ten', blurb: 'Unlock 10 achievements.', tier: 'bronze', tokens: 1, test: (_s, m) => achCount(m) >= 10, progress: (_s, m) => Math.min(10, achCount(m!)), progressMax: 10 },
  { id: 'meta-ach-25', name: 'Ribbon Wall', blurb: 'Unlock 25 achievements.', tier: 'silver', tokens: 2, test: (_s, m) => achCount(m) >= 25, progress: (_s, m) => Math.min(25, achCount(m!)), progressMax: 25 },
  { id: 'meta-ach-50', name: 'Ribbon Gallery', blurb: 'Unlock 50 achievements.', tier: 'gold', tokens: 3, test: (_s, m) => achCount(m) >= 50, progress: (_s, m) => Math.min(50, achCount(m!)), progressMax: 50 },
  { id: 'meta-ledger-skin', name: 'Ledger Dressing', blurb: 'Unlock a non-default ledger skin.', tier: 'bronze', tokens: 1, test: (_s, m) => m.unlockedLedgerSkins.length > 1 },
  { id: 'meta-unpack-fx', name: 'Unpack Spark', blurb: 'Unlock a non-default unpack FX.', tier: 'bronze', tokens: 1, test: (_s, m) => m.unlockedUnpackFx.length > 1 },
  { id: 'meta-universe', name: 'Another Universe', blurb: 'Finish a grocery universe.', tier: 'gold', tokens: 5, test: (_s, m) => m.groceryUniverses >= 1 },
  {
    id: 'meta-quiet-shopper',
    name: 'Quiet Shopper',
    blurb: 'Own a pack without ever spending tokens (gift unlock).',
    tier: 'silver',
    hidden: true,
    tokens: 2,
    test: (_s, m) =>
      m.unlockedPacks.some((id) => id !== 'receipt-classic') && m.shelfTokens >= 0 && Object.keys(m.achievements).length >= 5,
  },

  // ── Era 2 — chain & capital ──────────────────────────────────────────────
  { id: 'era-2', name: 'Incorporated Air', blurb: 'Reach Era 2.', tier: 'silver', tokens: 3, test: (s) => s.era >= 2 },
  { id: 'second-store', name: 'Two Doors', blurb: 'Open a second storefront.', tier: 'silver', tokens: 2, test: (s) => s.stores.length >= 2 },
  { id: 'chain-3', name: 'Three Doors', blurb: 'Operate 3 stores.', tier: 'silver', tokens: 2, test: (s) => s.stores.length >= 3, progress: (s) => Math.min(3, s.stores.length), progressMax: 3 },
  { id: 'policy-set', name: 'Policy Binder', blurb: 'Set a non-standard store policy.', tier: 'bronze', tokens: 1, test: (s) => s.stores.some((st) => st.policy !== 'standard') },
  { id: 'store-level-2', name: 'District Rise', blurb: 'Level any store to 2.', tier: 'bronze', tokens: 1, test: (s) => s.stores.some((st) => st.level >= 2) },
  { id: 'depot', name: 'Depot Online', blurb: 'Build the depot.', tier: 'silver', tokens: 2, test: (s) => s.depot },
  { id: 'incorporate', name: 'IPO Day', blurb: 'Incorporate (Era 2).', tier: 'silver', tokens: 3, test: (s) => s.incorporated, unlockPack: 'corporate-fluorescent' },
  { id: 'board-1', name: 'Board Agenda', blurb: 'Resolve a board meeting.', tier: 'bronze', tokens: 1, test: (s) => s.stats.boardMeetings >= 1 },
  { id: 'invest-book', name: 'Day Trader', blurb: 'Unlock the investment book.', tier: 'silver', tokens: 2, test: (s) => s.invest.unlocked, unlockPack: 'trading-floor' },
  { id: 'invest-deposit', name: 'Book Deposit', blurb: 'Deposit into the investment book.', tier: 'bronze', tokens: 1, test: (s) => s.stats.investDeposits >= 1 },
  { id: 'invest-engine-2', name: 'Engine L2', blurb: 'Raise the investment engine to L2.', tier: 'silver', tokens: 2, test: (s) => s.invest.engineLevel >= 2 },
  { id: 'tournament-1', name: 'First Doctrine Meet', blurb: 'Run a strategy tournament.', tier: 'bronze', tokens: 1, test: (s) => s.stats.tournamentsRun >= 1 },
  { id: 'doctrine-3', name: 'Three Binders', blurb: 'Own 3 doctrines.', tier: 'silver', tokens: 2, test: (s) => Object.values(s.doctrines).filter((n) => n > 0).length >= 3, progress: (s) => Math.min(3, Object.values(s.doctrines).filter((n) => n > 0).length), progressMax: 3 },
  { id: 'read-20', name: 'Read Buffer', blurb: 'Hold 20 Read.', tier: 'silver', tokens: 2, test: (s) => s.read >= 20, progress: (s) => Math.min(20, Math.floor(s.read)), progressMax: 20 },
  { id: 'catering', name: 'Contract Trays', blurb: 'Open catering.', tier: 'bronze', tokens: 1, test: (s) => (s.ventures.catering?.level ?? 0) >= 1 },
  { id: 'ghost-kitchen', name: 'Ghost Line', blurb: 'Open the ghost kitchen.', tier: 'silver', tokens: 2, test: (s) => (s.ventures.ghost?.level ?? 0) >= 1 },
  { id: 'metro-deed', name: 'Metro Deed', blurb: 'Buy a metro or corner parcel.', tier: 'silver', tokens: 2, test: (s) => !!s.expansions['metro-slot'] || !!s.expansions['corner-parcel'] },
  { id: 'autonomous', name: 'Autonomous Dawn', blurb: 'Release autonomous fulfillment.', tier: 'gold', tokens: 5, test: (s) => s.autonomous },

  // ── Eras 3–6 — cold / politics / fleet / endings ─────────────────────────
  { id: 'era-3', name: 'Cold Chain', blurb: 'Reach Era 3.', tier: 'gold', tokens: 4, test: (s) => s.era >= 3 },
  { id: 'era-4', name: 'Port Fog', blurb: 'Reach Era 4.', tier: 'gold', tokens: 4, test: (s) => s.era >= 4, unlockPack: 'port-authority' },
  { id: 'era-5', name: 'Seed Barge', blurb: 'Reach Era 5.', tier: 'gold', tokens: 5, test: (s) => s.era >= 5, unlockPack: 'vacuum-aisle' },
  { id: 'era-6', name: 'Last Horizon', blurb: 'Reach Era 6.', tier: 'mythic', tokens: 8, test: (s) => s.era >= 6 },

  // Cold (s.cold)
  { id: 'cold-plant', name: 'Cold Online', blurb: 'Build a cold plant (Era 3).', tier: 'gold', tokens: 4, test: (s) => s.cold.plants >= 1, unlockPack: 'cold-room' },
  { id: 'cold-tank', name: 'Tank Farm', blurb: 'Install a cold tank.', tier: 'silver', tokens: 2, test: (s) => s.cold.tanks >= 1 },
  { id: 'cold-momentum', name: 'Momentum Rider', blurb: 'Enable Momentum and hold above 1×.', tier: 'gold', tokens: 4, test: (s) => s.cold.momentumOn && s.cold.momentum > 1.05 },
  { id: 'cold-autoshed', name: 'Auto-Shed Survivor', blurb: 'Survive an auto-shed brownout.', tier: 'silver', tokens: 2, test: (s) => s.cold.autoSheds >= 1 },
  { id: 'cold-plants-3', name: 'County Compressors', blurb: 'Operate 3 cold plants.', tier: 'gold', tokens: 5, test: (s) => s.cold.plants >= 3, progress: (s) => Math.min(3, s.cold.plants), progressMax: 3 },
  { id: 'cold-quadratic', name: 'County Emptying', blurb: 'Unlock quadratic plant yield.', tier: 'gold', tokens: 5, test: (s) => s.cold.quadratic },
  { id: 'cold-brownout', name: 'Brownout Drill', blurb: 'Log a cold-chain brownout.', tier: 'silver', tokens: 2, test: (s) => s.cold.brownouts >= 1 },

  // Politics (s.politics)
  { id: 'lobby-hire', name: 'Lobby Retainer', blurb: 'Hire a lobbyist.', tier: 'bronze', tokens: 1, test: (s) => s.politics.lobby >= 1 },
  { id: 'lobby-3', name: 'Zoning Friends', blurb: 'Hire lobby three times.', tier: 'silver', tokens: 2, test: (s) => s.politics.lobby >= 3, progress: (s) => Math.min(3, s.politics.lobby), progressMax: 3 },
  { id: 'acquire-1', name: 'Neighbor Buy', blurb: 'Acquire a region once.', tier: 'silver', tokens: 2, test: (s) => s.politics.acquisitions >= 1 },
  { id: 'leave-region', name: 'Packed Brand', blurb: 'Leave the region for the globe.', tier: 'gold', tokens: 5, test: (s) => s.politics.leftRegion },

  // Fleet / logistics (s.fleet)
  { id: 'ocean', name: 'Ocean Slot', blurb: 'Charter the first ocean lane.', tier: 'gold', tokens: 4, test: (s) => s.fleet.lanes >= 1, unlockPack: 'port-authority' },
  { id: 'lanes-3', name: 'Three Lanes', blurb: 'Charter 3 ocean lanes.', tier: 'gold', tokens: 4, test: (s) => s.fleet.lanes >= 3, progress: (s) => Math.min(3, s.fleet.lanes), progressMax: 3 },
  { id: 'franchise', name: 'Franchise Kit', blurb: 'Open a franchise partner.', tier: 'gold', tokens: 4, test: (s) => s.fleet.franchises >= 1 },
  { id: 'barge', name: 'Barge Manifest', blurb: 'Launch the seed barge.', tier: 'gold', tokens: 5, test: (s) => s.fleet.launched || s.fleet.barges >= 1, unlockPack: 'vacuum-aisle' },
  { id: 'charter', name: 'Charter Opener', blurb: 'Earn or spend a Charter point.', tier: 'gold', tokens: 3, test: (s) => s.fleet.charterPool > 0 || charterSpent(s) >= 1 },
  { id: 'charter-spent', name: 'Charter Ink', blurb: 'Allocate at least 5 Charter points.', tier: 'silver', tokens: 2, test: (s) => charterSpent(s) >= 5, progress: (s) => Math.min(5, charterSpent(s)), progressMax: 5 },
  { id: 'charter-shell', name: 'Shell Budget', blurb: 'Allocate Charter into Shell.', tier: 'gold', tokens: 3, test: (s) => (s.fleet.charter.shell ?? 0) >= 1 },
  { id: 'guardian', name: 'Guardian Shell', blurb: 'Apply the Guardian preset.', tier: 'gold', tokens: 4, test: (s) => s.fleet.guardianUsed },
  { id: 'legacy-1', name: 'First Plaque', blurb: 'Earn Legacy from drift war.', tier: 'silver', tokens: 2, test: (s) => s.fleet.legacy >= 1 },
  { id: 'legacy-10', name: 'Gallery Plaque', blurb: 'Hold 10 Legacy.', tier: 'mythic', tokens: 6, test: (s) => s.fleet.legacy >= 10, progress: (s) => Math.min(10, Math.floor(s.fleet.legacy)), progressMax: 10 },
  { id: 'space', name: 'Vacuum Aisle', blurb: 'Enter space (Era 5).', tier: 'gold', tokens: 5, test: (s) => s.era >= 5 },
  { id: 'war', name: 'Driftwar Veteran', blurb: 'Enter the Off-Brand war.', tier: 'gold', tokens: 5, test: (s) => s.fleet.warOn, unlockPack: 'off-brand-neon' },
  { id: 'drift-win', name: 'Brand Seal Holds', blurb: 'Win a drift contest.', tier: 'gold', tokens: 4, test: (s) => s.fleet.driftWins >= 1 },
  { id: 'biomass-clear', name: 'Empty Sky', blurb: 'Clear universe biomass.', tier: 'mythic', tokens: 8, test: (s) => s.fleet.launched && s.fleet.biomass <= 0 },

  // Endings (s.endingChoice)
  { id: 'accept', name: 'Exile', blurb: 'Accept a hungry universe.', tier: 'mythic', tokens: 10, test: (s) => s.endingChoice === 'accept', unlockPack: 'hungry-universe' },
  { id: 'reject', name: 'Last Ration', blurb: 'Reject and disassemble.', tier: 'mythic', tokens: 10, test: (s) => s.endingChoice === 'reject', unlockPack: 'last-ration' },
  {
    id: 'perfect-receipt',
    name: 'Perfect Receipt',
    blurb: 'Accept with zero bailouts.',
    tier: 'mythic',
    hidden: true,
    tokens: 15,
    test: (s) => s.endingChoice === 'accept' && s.stats.bailouts === 0,
  },
  {
    id: 'no-spoil-era1',
    name: 'Cold Hands',
    blurb: 'Reach Era 1 with zero spoilage.',
    tier: 'gold',
    hidden: true,
    tokens: 5,
    test: (s) => s.era >= 1 && s.stats.spoiled === 0 && baskets(s) >= 100,
  },
  {
    id: 'debt-free-nephew',
    name: 'Cleared Nephew',
    blurb: 'Take nephew debt, then owe nothing.',
    tier: 'silver',
    hidden: true,
    tokens: 3,
    test: (s) => s.debt.taken >= 1 && s.debt.owed <= 0,
  },
]

export function evaluateAchievements(
  s: GameState,
  meta: MetaSave,
): { meta: MetaSave; unlocked: string[] } {
  const unlocked: string[] = []
  const achievements = { ...meta.achievements }
  let shelfTokens = meta.shelfTokens
  let unlockedPacks = meta.unlockedPacks

  // Re-scan until stable so meta achievements that depend on tokens/count
  // grant in the same evaluation (no second-pass surprise unlocks).
  let grew = true
  while (grew) {
    grew = false
    const live: MetaSave = { ...meta, achievements, shelfTokens, unlockedPacks }
    for (const a of ACHIEVEMENTS) {
      if (achievements[a.id]) continue
      if (!a.test(s, live)) continue

      achievements[a.id] = { unlockedAt: Date.now() }
      shelfTokens += a.tokens
      unlocked.push(a.id)
      grew = true

      if (a.unlockPack && !unlockedPacks.includes(a.unlockPack)) {
        unlockedPacks = [...unlockedPacks, a.unlockPack]
      }
      live.achievements = achievements
      live.shelfTokens = shelfTokens
      live.unlockedPacks = unlockedPacks
    }
  }

  if (!unlocked.length) return { meta, unlocked: [] }

  // Pity: every 10th achievement grants +1 token even if that unlock was token-free.
  const beforeCount = Object.keys(meta.achievements).length
  const afterCount = Object.keys(achievements).length
  const crossedTens =
    Math.floor(afterCount / 10) - Math.floor(beforeCount / 10)
  if (crossedTens > 0) shelfTokens += crossedTens

  return {
    meta: {
      ...meta,
      achievements,
      shelfTokens,
      unlockedPacks,
    },
    unlocked,
  }
}

export function applyAchievements(s: GameState, meta: MetaSave): MetaSave {
  const { meta: next, unlocked } = evaluateAchievements(s, meta)
  for (const id of unlocked) {
    const def = ACHIEVEMENTS.find((a) => a.id === id)
    emitAchievementToast(id, def?.name ?? id)
  }
  return unlocked.length ? next : meta
}

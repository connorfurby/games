import type { GameState } from '../../sim/state'
import { describeEffects, type StatEffect, type StatId } from './stats'
import type { TreeId, UpgradeBand, UpgradeDef } from './types'

/**
 * Grocery Empire 2.0 upgrade content. Every node here multiplies a real stat
 * (see stats.ts), doubles at ranks 10 / 25 / 50, and counts toward tree mastery.
 *
 * Prices follow the era the node appears in and its band, so a node never shows up
 * either trivially cheap or out of reach for the economy around it.
 */

/** Cash a band-0 node costs at rank 0, by the era it unlocks in. */
const ERA_BASE = [45, 450, 25_000, 2e6, 1e9, 1e11, 1e13] as const
const BAND_MUL: Record<UpgradeBand, number> = { 0: 1, 1: 6, 2: 50, 3: 500 }
const BAND_GROWTH: Record<UpgradeBand, number> = { 0: 1.55, 1: 1.45, 2: 1.38, 3: 1.3 }
const BAND_MAX: Record<UpgradeBand, number> = { 0: 15, 1: 25, 2: 30, 3: 40 }
/** Global tuning knob for every 2.0 node's per-rank effect. */
const PER_SCALE = 0.6

type Row = [
  id: string,
  name: string,
  blurb: string,
  effects: [StatId, number][],
  band: UpgradeBand,
  era: number,
  extra?: Partial<UpgradeDef> & { needs?: [string, number][] },
]

function build(tree: TreeId, rows: Row[]): UpgradeDef[] {
  return rows.map(([id, name, blurb, fx, band, era, extra], i) => {
    const scale = era >= 4 ? PER_SCALE * 0.6 : PER_SCALE
    const effects: StatEffect[] = fx.map(([stat, per]) => ({ stat, per: Math.round(per * scale * 10000) / 10000 }))
    const { needs, ...rest } = extra ?? {}
    const def: UpgradeDef = {
      id,
      tree,
      name,
      per: describeEffects(effects),
      blurb,
      max: BAND_MAX[band],
      base: Math.round(ERA_BASE[Math.min(era, ERA_BASE.length - 1)]! * BAND_MUL[band] * (1 + (i % 4) * 0.35)),
      growth: BAND_GROWTH[band],
      band,
      col: i % 5,
      row: 10 + Math.floor(i / 5),
      effects,
      visible: (s: GameState) => s.era >= era,
      ...(needs ? { requires: needs.map(([rid, level]) => ({ id: rid, level })) } : {}),
      ...rest,
    }
    return def
  })
}

// ── Floor ──────────────────────────────────────────────────────────────────
const FLOOR: Row[] = [
  ['fl-wide-aisles', 'Wide Aisles', 'Two carts can pass. Nobody leaves because of a traffic jam.', [['demand', 0.03]], 0, 0],
  ['fl-hand-baskets', 'Hand Baskets by the Door', 'A stack of red baskets says “take more than you planned.”', [['value', 0.025]], 0, 0],
  ['fl-tidy-rows', 'Tidy Rows', 'Faced cans unpack faster: everyone knows where things go.', [['unpack', 0.04]], 0, 0],
  ['fl-bell', 'Door Bell', 'A bell on the door. The register perks up every time.', [['checkout', 0.04]], 0, 1],
  ['fl-gondola', 'Gondola Shelving', 'Two-sided shelves where the wall used to be.', [['shelf', 0.05]], 0, 1],
  ['fl-impulse', 'Impulse Rack', 'Gum, batteries, a postcard of the neighborhood.', [['margin', 0.03]], 0, 1],
  ['fl-floor-tile', 'Checkerboard Tile', 'People walk slower on a floor that looks this nice.', [['demand', 0.025], ['value', 0.015]], 1, 1, { needs: [['fl-wide-aisles', 5]] }],
  ['fl-scanner', 'Barcode Scanner', 'Beep. Next.', [['checkout', 0.05]], 1, 1, { needs: [['fl-bell', 5]] }],
  ['fl-roll-cages', 'Roll Cages', 'Stock rolls out of the back already sorted.', [['unpack', 0.05]], 1, 1, { needs: [['fl-tidy-rows', 5]] }],
  ['fl-mirror-wall', 'Mirror Wall', 'The store looks twice as full. So does the shelf.', [['shelf', 0.04], ['demand', 0.01]], 1, 2],
  ['fl-self-checkout', 'Self-Checkout', 'Four lanes, one attendant, no line.', [['checkout', 0.06]], 2, 2, { needs: [['fl-scanner', 10]] }],
  ['fl-flagship-reno', 'Flagship Renovation', 'The first store gets the new floor first. Every copy follows.', [['store', 0.03]], 2, 2],
  ['fl-endcap-program', 'Endcap Program', 'Every aisle ends in a reason to buy something else.', [['margin', 0.035]], 2, 2, { needs: [['fl-impulse', 5]] }],
  ['fl-night-stock', 'Night Stocking Crew', 'The shelves are full when the doors open.', [['unpack', 0.06], ['shelf', 0.02]], 2, 3],
  ['fl-planogram-ai', 'Planogram Engine', 'Every facing is placed by last week’s receipts.', [['value', 0.03]], 3, 3, { needs: [['fl-floor-tile', 10]] }],
  ['fl-flagship-cap-a', 'The Wall of Everything', 'Capstone. Every shelf, every aisle, all the time.', [['shelf', 0.08], ['demand', 0.03]], 3, 3, { fork: 'fl-cap' }],
  ['fl-flagship-cap-b', 'The Corner Shop Forever', 'Capstone. Small, exact, beloved. Every basket is worth more.', [['value', 0.06]], 3, 3, { fork: 'fl-cap' }],
  ['fl-flagship-cap-c', 'The Endless Aisle', 'Capstone. The store keeps going; so do the shoppers.', [['demand', 0.06]], 3, 3, { fork: 'fl-cap' }],
  ['fl-holo-signage', 'Holo Signage', 'Prices float at eye level and change with the weather.', [['margin', 0.04], ['demand', 0.02]], 2, 4],
  ['fl-drone-facing', 'Facing Drones', 'Little fans keep every can label forward.', [['unpack', 0.07]], 2, 5],
  ['fl-zero-g-aisle', 'Zero-G Aisle', 'Shelves on the ceiling, too.', [['shelf', 0.1]], 3, 5],
]

// ── People ─────────────────────────────────────────────────────────────────
const PEOPLE: Row[] = [
  ['pp-name-tags', 'Name Tags', 'Regulars say hi by name. They stay longer.', [['demand', 0.025]], 0, 1],
  ['pp-stool', 'A Stool Behind the Counter', 'Happier cashiers ring faster.', [['checkout', 0.04]], 0, 1],
  ['pp-gloves', 'Work Gloves', 'Box edges stop winning.', [['unpack', 0.04]], 0, 1],
  ['pp-payday', 'Payday Lunch', 'One lunch a month. Wages feel bigger than they are.', [['wageCut', 0.03]], 0, 1],
  ['pp-cross-skill', 'Cross-Skilling', 'Anyone can work any station.', [['unpack', 0.03], ['checkout', 0.03]], 1, 1, { needs: [['pp-gloves', 5]] }],
  ['pp-mentors', 'Mentors', 'The first hire teaches the next ten.', [['xp', 0.03], ['unpack', 0.02]], 1, 1],
  ['pp-uniforms', 'Uniforms', 'Shoppers trust a store that matches.', [['demand', 0.02], ['value', 0.02]], 1, 2, { needs: [['pp-name-tags', 5]] }],
  ['pp-benefits', 'Health Plan', 'People stay. Training sticks. Hiring costs fall.', [['wageCut', 0.04]], 1, 2, { needs: [['pp-payday', 5]] }],
  ['pp-store-managers', 'Store Managers', 'Every door gets someone who owns it.', [['store', 0.04]], 2, 2],
  ['pp-district-leads', 'District Leads', 'One person per district, one phone that always answers.', [['district', 0.05]], 2, 3],
  ['pp-academy', 'Grocery Academy', 'A training school with your logo on the door.', [['store', 0.03], ['xp', 0.03]], 2, 3, { needs: [['pp-mentors', 10]] }],
  ['pp-union', 'Fair Contract', 'A good contract. Nobody walks out mid-shift.', [['checkout', 0.04], ['wageCut', 0.02]], 2, 2],
  ['pp-crew-cap-a', 'Family Business', 'Capstone. Small crews that never leave. Wages barely matter.', [['wageCut', 0.08], ['checkout', 0.03]], 3, 3, { fork: 'pp-cap' }],
  ['pp-crew-cap-b', 'Union Shop', 'Capstone. Big, skilled, proud crews. Every store runs hotter.', [['store', 0.06]], 3, 3, { fork: 'pp-cap' }],
  ['pp-crew-cap-c', 'Gig Floor', 'Capstone. Staff on demand. Unpacking never waits.', [['unpack', 0.08], ['demand', 0.02]], 3, 3, { fork: 'pp-cap' }],
  ['pp-ship-crews', 'Ship Crews', 'Lanes run on people who know the water.', [['lane', 0.05]], 2, 4],
  ['pp-orbital-shifts', 'Orbital Shifts', 'Twelve-hour days, ninety-minute sunsets.', [['barge', 0.05]], 2, 5],
  ['pp-recognition', 'Employee of the Month', 'A photo by the door. Everyone works for the next one.', [['checkout', 0.03], ['unpack', 0.03]], 1, 3],
  ['pp-chain-culture', 'Chain Culture', 'Every store sounds the same on the phone. In a good way.', [['network', 0.025]], 3, 4],
  ['pp-legacy-staff', 'Lifers', 'Thirty-year veterans. They know where everything is.', [['store', 0.04], ['wageCut', 0.03]], 3, 5],
]

// ── Supply ─────────────────────────────────────────────────────────────────
const SUPPLY: Row[] = [
  ['su-haggle', 'Haggle at the Dock', 'A smile and a coffee knocks a little off every crate.', [['crateCut', 0.03]], 0, 0],
  ['su-pallets', 'Pallets', 'Stack it high, move it once.', [['backroom', 0.06]], 0, 0],
  ['su-fifo', 'First In, First Out', 'Oldest stock goes out first. Less goes in the bin.', [['spoilCut', 0.04]], 0, 1],
  ['su-route', 'Delivery Route', 'Same truck, same time, same driver.', [['unpack', 0.03], ['crateCut', 0.015]], 0, 1],
  ['su-contracts', 'Supply Contracts', 'Lock a price for a year; the index stops mattering as much.', [['crateCut', 0.035]], 1, 1, { needs: [['su-haggle', 5]] }],
  ['su-racking', 'Pallet Racking', 'The backroom goes up instead of out.', [['backroom', 0.06], ['shelf', 0.02]], 1, 1, { needs: [['su-pallets', 5]] }],
  ['su-cold-trucks', 'Refrigerated Trucks', 'Produce arrives younger.', [['spoilCut', 0.05]], 1, 2, { needs: [['su-fifo', 5]] }],
  ['su-private-label', 'Own-Label Line', 'Your name on the can. Your margin inside it.', [['value', 0.03], ['crateCut', 0.02]], 1, 2],
  ['su-depot-network', 'Depot Network', 'Every store is one truck away from a depot.', [['store', 0.035], ['network', 0.01]], 2, 2],
  ['su-farm-direct', 'Farm Direct', 'Skip three middlemen. Keep their cut.', [['crateCut', 0.04], ['value', 0.015]], 2, 3, { needs: [['su-contracts', 10]] }],
  ['su-dc', 'Distribution Center', 'One giant building feeds forty doors.', [['network', 0.03]], 2, 3],
  ['su-cap-a', 'One Vendor', 'Capstone. One supplier, one price, forever.', [['crateCut', 0.08]], 3, 3, { fork: 'su-cap' }],
  ['su-cap-b', 'Many Docks', 'Capstone. Ten suppliers fighting for your order.', [['crateCut', 0.04], ['unpack', 0.04]], 3, 3, { fork: 'su-cap' }],
  ['su-cap-c', 'Vertical Farm', 'Capstone. Grow it upstairs; sell it downstairs.', [['value', 0.05], ['spoilCut', 0.03]], 3, 3, { fork: 'su-cap' }],
  ['su-containers', 'Container Yard', 'Ten thousand boxes, all with your logo.', [['lane', 0.05]], 2, 4],
  ['su-cold-ships', 'Reefer Ships', 'Cold chain that floats.', [['lane', 0.03], ['cold', 0.03]], 2, 4],
  ['su-sorting-ai', 'Sorting Machines', 'Robots sort the trucks before they leave the depot.', [['unpack', 0.06], ['network', 0.015]], 3, 4],
  ['su-orbital-cache', 'Orbital Cache', 'Stock that waits in orbit until it’s needed.', [['backroom', 0.1], ['barge', 0.03]], 2, 5],
  ['su-biomass-press', 'Biomass Press', 'Turns what the barges find into something a shelf can hold.', [['harvest', 0.05]], 2, 5],
  ['su-just-in-time', 'Just in Time', 'Nothing sits. Nothing spoils.', [['spoilCut', 0.06]], 3, 4],
]

// ── Brand ──────────────────────────────────────────────────────────────────
const BRAND: Row[] = [
  ['br-flyers', 'Window Flyers', 'Hand-drawn specials in the window.', [['demand', 0.03]], 0, 0],
  ['br-chalk', 'Sidewalk Chalk', 'An arrow on the pavement points to the door.', [['demand', 0.025]], 0, 1],
  ['br-jingle', 'A Jingle', 'Four notes everyone in the neighborhood can hum.', [['demand', 0.03], ['xp', 0.01]], 0, 1],
  ['br-coupons', 'Coupon Book', 'Small discounts, big baskets.', [['value', 0.02], ['demand', 0.015]], 0, 1],
  ['br-logo', 'A Real Logo', 'A shape people recognize from across the street.', [['demand', 0.03]], 1, 1, { needs: [['br-flyers', 5]] }],
  ['br-loyalty-app', 'Loyalty App', 'Points, streaks, and a push notice when bread comes out.', [['demand', 0.02], ['value', 0.02]], 1, 2, { needs: [['br-coupons', 5]] }],
  ['br-radio', 'Radio Spots', 'Morning drive time, every weekday.', [['demand', 0.035]], 1, 2],
  ['br-sponsorship', 'Little League Sponsor', 'Your name on the jersey. Their parents shop with you.', [['demand', 0.02], ['store', 0.02]], 1, 2],
  ['br-tv', 'TV Campaign', 'Thirty seconds that make every store busier.', [['network', 0.025]], 2, 2, { needs: [['br-radio', 10]] }],
  ['br-celebrity', 'Celebrity Chef', 'A famous face picks your tomatoes on camera.', [['value', 0.035]], 2, 3],
  ['br-mascot', 'Mascot', 'A giant can with arms. Children love it. So do the numbers.', [['demand', 0.04]], 2, 3, { needs: [['br-logo', 10]] }],
  ['br-cap-a', 'Neighborhood Saint', 'Capstone. Every store feels like the corner shop.', [['demand', 0.07]], 3, 3, { fork: 'br-cap' }],
  ['br-cap-b', 'Circular Machine', 'Capstone. A sale somewhere, every single day.', [['demand', 0.04], ['margin', 0.03]], 3, 3, { fork: 'br-cap' }],
  ['br-cap-c', 'Luxury House', 'Capstone. Fewer shoppers, much bigger receipts.', [['value', 0.08]], 3, 3, { fork: 'br-cap' }],
  ['br-global-brand', 'Global Brand', 'The logo works in every language.', [['district', 0.04], ['network', 0.02]], 2, 4],
  ['br-franchise-kit', 'Franchise Playbook', 'A binder that turns any storefront into yours.', [['store', 0.05]], 2, 4],
  ['br-stars-ad', 'Ad in the Stars', 'Your logo, visible from orbit.', [['demand', 0.06]], 2, 5],
  ['br-nostalgia', 'Nostalgia Line', 'Old labels, original recipes, new prices.', [['value', 0.04]], 3, 4],
  ['br-viral', 'Viral Moment', 'Something about a can went around the world.', [['demand', 0.03], ['xp', 0.03]], 1, 3],
  ['br-anthem', 'Company Anthem', 'Staff sing it on Fridays. Customers join in.', [['checkout', 0.03], ['demand', 0.02]], 2, 5],
]

// ── Automation ─────────────────────────────────────────────────────────────
const AUTOMATION: Row[] = [
  ['au-cash-register', 'Cash Register', 'It adds things up so you don’t have to.', [['checkout', 0.045]], 0, 0],
  ['au-conveyor', 'Belt Conveyor', 'Groceries slide to the cashier.', [['checkout', 0.04]], 0, 1],
  ['au-hand-truck', 'Electric Hand Truck', 'One person moves a pallet.', [['unpack', 0.045]], 0, 1],
  ['au-inventory', 'Inventory Sheet', 'You know what you have before you order it.', [['spoilCut', 0.03], ['crateCut', 0.015]], 0, 1],
  ['au-spreadsheet', 'The Spreadsheet', 'Every number in one place. Attention stops leaking.', [['attention', 0.04]], 1, 1],
  ['au-pos', 'Point of Sale', 'Every sale is data. The data pays for itself.', [['checkout', 0.04], ['ideas', 0.02]], 1, 1, { needs: [['au-cash-register', 5]] }],
  ['au-auto-order', 'Auto-Reorder', 'The truck knows when to come.', [['unpack', 0.04], ['spoilCut', 0.02]], 1, 2, { needs: [['au-inventory', 5]] }],
  ['au-forklifts', 'Forklifts', 'The backroom gets a driver.', [['unpack', 0.05], ['backroom', 0.03]], 1, 2, { needs: [['au-hand-truck', 5]] }],
  ['au-mainframe', 'Mainframe', 'A humming room that thinks for every store.', [['attention', 0.04], ['store', 0.02]], 2, 2],
  ['au-robot-stock', 'Stocking Robots', 'They don’t take breaks. They don’t need gloves.', [['unpack', 0.06]], 2, 3, { needs: [['au-forklifts', 10]] }],
  ['au-smart-carts', 'Smart Carts', 'Carts that ring themselves up.', [['checkout', 0.06]], 2, 3, { needs: [['au-pos', 10]] }],
  ['au-cap-a', 'Hands-On', 'Capstone. People and machines side by side. Everything is faster.', [['unpack', 0.05], ['checkout', 0.05]], 3, 3, { fork: 'au-cap' }],
  ['au-cap-b', 'Hands-Off', 'Capstone. The stores run themselves. You run the empire.', [['store', 0.07]], 3, 3, { fork: 'au-cap' }],
  ['au-cap-c', 'The Algorithm', 'Capstone. It prices, stocks and markets. It’s usually right.', [['margin', 0.05], ['ideas', 0.03]], 3, 3, { fork: 'au-cap' }],
  ['au-routing', 'Route Optimizer', 'Every lane takes the shortest way round the world.', [['lane', 0.04], ['network', 0.01]], 2, 4],
  ['au-swarm', 'Drone Swarm', 'Last-mile delivery in eleven minutes.', [['network', 0.025]], 3, 4],
  ['au-barge-autopilot', 'Barge Autopilot', 'The fleet flies while the crew sleeps.', [['barge', 0.05], ['harvest', 0.02]], 2, 5],
  ['au-attention-grid', 'Attention Grid', 'Every analyst’s screen is wired to every store.', [['attention', 0.05]], 2, 3],
  ['au-dark-store', 'Dark Stores', 'Warehouses that only sell online. No lights needed.', [['store', 0.035], ['network', 0.015]], 3, 4],
  ['au-quantum-ledger', 'Quantum Ledger', 'Books that balance before the sale.', [['ideas', 0.05], ['margin', 0.02]], 3, 5],
]

// ── Capital ────────────────────────────────────────────────────────────────
const CAPITAL: Row[] = [
  ['ca-cash-box', 'Locked Cash Box', 'Less goes missing between the till and the bank.', [['margin', 0.02]], 0, 1],
  ['ca-bookkeeper', 'Bookkeeper', 'Someone who reads the receipts.', [['margin', 0.02], ['attention', 0.02]], 0, 1],
  ['ca-bulk-credit', 'Trade Credit', 'Pay for the crates after you sell them.', [['crateCut', 0.025]], 1, 1],
  ['ca-property', 'Buy the Building', 'No more rent. The landlord is you.', [['margin', 0.03]], 1, 2],
  ['ca-chain-finance', 'Chain Finance Office', 'Every store’s cash pooled overnight.', [['network', 0.02]], 2, 2],
  ['ca-acquisitions', 'Acquisitions Desk', 'Lawyers who love a small regional chain.', [['district', 0.06]], 2, 3],
  ['ca-bonds', 'Store Bonds', 'Investors pay for the next ten doors.', [['store', 0.035]], 2, 3, { needs: [['ca-chain-finance', 5]] }],
  ['ca-holding', 'Holding Company', 'A company that owns the company.', [['network', 0.025], ['district', 0.02]], 2, 3],
  ['ca-cap-a', 'Passbook House', 'Capstone. Slow, safe, enormous.', [['margin', 0.06]], 3, 3, { fork: 'ca-cap' }],
  ['ca-cap-b', 'Risk Desk', 'Capstone. Leverage every door.', [['store', 0.05], ['district', 0.03]], 3, 3, { fork: 'ca-cap' }],
  ['ca-cap-c', 'Sovereign Fund', 'Capstone. Countries borrow from you.', [['district', 0.07]], 3, 3, { fork: 'ca-cap' }],
  ['ca-shipping-line', 'Buy a Shipping Line', 'Own the ships, not just the lanes.', [['lane', 0.06]], 2, 4],
  ['ca-exchange', 'Ration Exchange', 'A market where everything is priced in your cans.', [['value', 0.03], ['network', 0.015]], 3, 4],
  ['ca-orbital-bank', 'Orbital Bank', 'Interest compounds faster in low orbit.', [['barge', 0.04], ['margin', 0.02]], 2, 5],
  ['ca-ipo', 'IPO', 'Ring the bell. Everyone owns a can.', [['xp', 0.04], ['store', 0.02]], 2, 2],
  ['ca-tax-team', 'Tax Team', 'Six people who make the rest of the numbers bigger.', [['margin', 0.035]], 3, 4],
]

// ── Lab (new) ──────────────────────────────────────────────────────────────
const LAB: Row[] = [
  ['lb-test-kitchen', 'Test Kitchen', 'Try a recipe; sell what people finish.', [['value', 0.03]], 0, 2],
  ['lb-shelf-science', 'Shelf Science', 'Which shelf height sells best? Now you know.', [['demand', 0.03]], 0, 2],
  ['lb-idea-board', 'Idea Board', 'A corkboard where analysts pin things.', [['ideas', 0.05]], 0, 2],
  ['lb-focus-groups', 'Focus Groups', 'Twelve strangers and a plate of cookies.', [['value', 0.02], ['demand', 0.02]], 0, 2],
  ['lb-packaging', 'Better Packaging', 'Cans that stack higher and spoil slower.', [['shelf', 0.04], ['spoilCut', 0.03]], 1, 2, { needs: [['lb-test-kitchen', 5]] }],
  ['lb-forecasting', 'Demand Forecasting', 'You order Tuesday’s bread on Sunday.', [['spoilCut', 0.04], ['crateCut', 0.02]], 1, 2],
  ['lb-analysts-guild', 'Analysts’ Guild', 'They meet weekly. Attention doubles at the meetings.', [['attention', 0.05]], 1, 2, { needs: [['lb-idea-board', 5]] }],
  ['lb-new-aisles', 'New Aisle Research', 'Every new category starts in the lab.', [['value', 0.03], ['shelf', 0.02]], 1, 3],
  ['lb-prepared-food', 'Prepared Food', 'Dinner, already made, at three times the price.', [['value', 0.04]], 2, 3, { needs: [['lb-new-aisles', 5]] }],
  ['lb-neuro', 'Neuromarketing', 'Lighting, music and smell tuned to the gram.', [['demand', 0.04]], 2, 3, { needs: [['lb-shelf-science', 10]] }],
  ['lb-synthetic', 'Synthetic Protein', 'Meat without the animal or the spoilage.', [['spoilCut', 0.05], ['value', 0.02]], 2, 4],
  ['lb-cap-a', 'The Long Shelf Life', 'Capstone. Nothing spoils, ever.', [['spoilCut', 0.1], ['value', 0.02]], 3, 4, { fork: 'lb-cap' }],
  ['lb-cap-b', 'The Perfect Can', 'Capstone. One product, perfected, everywhere.', [['value', 0.07]], 3, 4, { fork: 'lb-cap' }],
  ['lb-cap-c', 'The Think Tank', 'Capstone. Ideas compound into everything else.', [['ideas', 0.08], ['xp', 0.03]], 3, 4, { fork: 'lb-cap' }],
  ['lb-ration-science', 'Ration Science', 'Calories per cubic meter, maximized.', [['harvest', 0.05], ['value', 0.02]], 2, 5],
  ['lb-hydroponics', 'Hydroponic Bays', 'Barges that grow food on the way.', [['barge', 0.05]], 2, 5],
  ['lb-xp-curriculum', 'Empire Curriculum', 'Every lesson the chain learns, written down.', [['xp', 0.05]], 1, 3],
  ['lb-cold-fusion', 'Better Compressors', 'Half the power, twice the cold.', [['cold', 0.05]], 1, 3],
  ['lb-flavor-map', 'Flavor Map', 'What every district wants, on one chart.', [['district', 0.04]], 2, 3],
  ['lb-sim-store', 'Simulated Store', 'Test a new layout on a store that doesn’t exist.', [['store', 0.03], ['ideas', 0.02]], 3, 3],
]

// ── Fresh (new) ────────────────────────────────────────────────────────────
const FRESH: Row[] = [
  ['fr-misters', 'Produce Misters', 'A fine mist every ninety seconds.', [['spoilCut', 0.05]], 0, 3],
  ['fr-deli', 'Deli Counter', 'Sliced to order, priced to match.', [['value', 0.035]], 0, 3],
  ['fr-bakery', 'In-Store Bakery', 'The smell does the marketing.', [['demand', 0.04]], 0, 3],
  ['fr-compressors', 'Plant Compressors', 'Plants that hum a little lower and pay a little more.', [['plantIncome', 0.06]], 0, 3],
  ['fr-cold-dock', 'Cold Dock', 'Trucks unload straight into the cold.', [['cold', 0.04], ['spoilCut', 0.02]], 1, 3, { needs: [['fr-compressors', 5]] }],
  ['fr-butcher', 'Master Butcher', 'Cuts people drive across town for.', [['value', 0.04]], 1, 3, { needs: [['fr-deli', 5]] }],
  ['fr-sushi', 'Sushi Bar', 'Fresh fish, fresher margins.', [['value', 0.03], ['demand', 0.02]], 1, 3],
  ['fr-farmers-market', 'Farmers’ Market Saturdays', 'The parking lot fills with stalls and shoppers.', [['demand', 0.035], ['store', 0.015]], 1, 3, { needs: [['fr-bakery', 5]] }],
  ['fr-cold-grid', 'Cold Grid', 'Every plant shares a single cold line.', [['cold', 0.05]], 2, 3, { needs: [['fr-cold-dock', 10]] }],
  ['fr-district-kitchens', 'District Kitchens', 'One kitchen per district cooks for every store in it.', [['district', 0.05]], 2, 3],
  ['fr-flash-freeze', 'Flash Freeze', 'Picked at noon, frozen at 12:05.', [['spoilCut', 0.06], ['plantIncome', 0.03]], 2, 4],
  ['fr-cap-a', 'Farm to Shelf', 'Capstone. Every store has a farm behind it.', [['value', 0.06], ['spoilCut', 0.03]], 3, 4, { fork: 'fr-cap' }],
  ['fr-cap-b', 'Flash Frozen Empire', 'Capstone. Cold chain so good momentum never slips.', [['cold', 0.09]], 3, 4, { fork: 'fr-cap' }],
  ['fr-cap-c', 'Chef’s Counter', 'Capstone. Restaurants inside every store.', [['value', 0.04], ['demand', 0.04]], 3, 4, { fork: 'fr-cap' }],
  ['fr-reefer-lanes', 'Reefer Lanes', 'Lanes that carry cold.', [['lane', 0.04], ['cold', 0.02]], 2, 4],
  ['fr-greenhouse', 'Rooftop Greenhouses', 'Lettuce grown above the checkout.', [['value', 0.03], ['store', 0.02]], 1, 4],
  ['fr-bio-domes', 'Bio-Domes', 'Fresh food grown under glass, in orbit.', [['harvest', 0.04], ['barge', 0.03]], 2, 5],
  ['fr-seasonal', 'Seasonal Menus', 'Something new every three weeks.', [['demand', 0.03], ['xp', 0.02]], 1, 3],
  ['fr-zero-waste', 'Zero-Waste Pledge', 'Nothing in the bin. Everything in a recipe.', [['spoilCut', 0.05], ['demand', 0.015]], 3, 4],
  ['fr-pantry-program', 'Neighborhood Pantry', 'Day-old bread goes to people who need it. They remember.', [['demand', 0.03], ['district', 0.02]], 2, 3],
]

// ── Logistics (new) ────────────────────────────────────────────────────────
const LOGISTICS: Row[] = [
  ['lg-depots', 'Regional Depots', 'A depot per district shortens every truck.', [['district', 0.05]], 0, 3],
  ['lg-dispatch', 'Dispatch Office', 'One room, one map, every truck.', [['network', 0.02]], 0, 3],
  ['lg-rail', 'Rail Spur', 'A train to the back door.', [['store', 0.03], ['backroom', 0.03]], 0, 3],
  ['lg-hub', 'Hub Warehouse', 'Every road leads to one building.', [['network', 0.025]], 1, 3, { needs: [['lg-dispatch', 5]] }],
  ['lg-harbor', 'Harbor Office', 'Paperwork for ships, done before they dock.', [['lane', 0.05]], 0, 4],
  ['lg-tugs', 'Tugboats', 'Ships in and out in half the time.', [['lane', 0.04]], 1, 4, { needs: [['lg-harbor', 5]] }],
  ['lg-customs', 'Customs Broker', 'A handshake at every border.', [['lane', 0.03], ['district', 0.03]], 1, 4],
  ['lg-air-freight', 'Air Freight', 'Strawberries cross an ocean overnight.', [['network', 0.025], ['spoilCut', 0.02]], 1, 4],
  ['lg-megaport', 'Megaport', 'A port that only ships your cans.', [['lane', 0.06]], 2, 4, { needs: [['lg-tugs', 10]] }],
  ['lg-global-grid', 'Global Grid', 'Every store on every continent on one schedule.', [['network', 0.035]], 2, 4, { needs: [['lg-hub', 10]] }],
  ['lg-cap-a', 'Hub and Spoke', 'Capstone. One giant hub, perfectly fed.', [['network', 0.06]], 3, 4, { fork: 'lg-cap' }],
  ['lg-cap-b', 'The Mesh', 'Capstone. Every store ships to every other store.', [['store', 0.05], ['district', 0.03]], 3, 4, { fork: 'lg-cap' }],
  ['lg-cap-c', 'Last Mile', 'Capstone. Your can is at the door before they ask.', [['demand', 0.05], ['lane', 0.03]], 3, 4, { fork: 'lg-cap' }],
  ['lg-launch-pad', 'Launch Pad', 'Barges leave from your own coast.', [['barge', 0.06]], 2, 5],
  ['lg-orbital-lanes', 'Orbital Lanes', 'Shipping routes between moons.', [['barge', 0.04], ['lane', 0.03]], 2, 5],
  ['lg-tracking', 'Live Tracking', 'Every crate, every second, on one screen.', [['network', 0.02], ['attention', 0.02]], 1, 3],
  ['lg-cross-dock', 'Cross-Docking', 'Trucks in one side, out the other.', [['store', 0.035]], 2, 3],
  ['lg-autonomous-trucks', 'Driverless Trucks', 'The night shift that never yawns.', [['network', 0.03]], 3, 5],
  ['lg-fuel-cells', 'Fuel Cells', 'Lanes burn less and carry more.', [['lane', 0.04]], 1, 4],
  ['lg-weather-routing', 'Weather Routing', 'Ships go around the storm.', [['lane', 0.03], ['spoilCut', 0.02]], 2, 4],
]

// ── Orbital (Space) additions ──────────────────────────────────────────────
const ORBITAL: Row[] = [
  ['or-docking', 'Docking Ring', 'Barges berth in minutes.', [['barge', 0.05]], 0, 5],
  ['or-scoops', 'Biomass Scoops', 'Wider mouths, fuller holds.', [['harvest', 0.06]], 0, 5],
  ['or-beacons', 'Brand Beacons', 'Your logo blinks between the stars.', [['demand', 0.04]], 0, 5],
  ['or-tethers', 'Orbital Tethers', 'Cargo slides down a cable to the depot.', [['network', 0.03]], 1, 5, { needs: [['or-docking', 5]] }],
  ['or-seed-vaults', 'Seed Vaults', 'Every recipe, frozen in a mountain on the moon.', [['value', 0.04]], 1, 5],
  ['or-gravity-farms', 'Gravity Farms', 'Spinning drums grow food at one-third gee.', [['harvest', 0.05], ['value', 0.02]], 1, 5, { needs: [['or-scoops', 5]] }],
  ['or-colony-stores', 'Colony Stores', 'A corner shop on every station.', [['store', 0.05]], 2, 5],
  ['or-fleet-ai', 'Fleet Mind', 'The barges learn from each other.', [['barge', 0.06]], 2, 5, { needs: [['or-docking', 10]] }],
  ['or-cap-a', 'Seed Ark', 'Capstone. One ship carries a whole economy.', [['barge', 0.09]], 3, 6, { fork: 'or-cap' }],
  ['or-cap-b', 'Ration Belt', 'Capstone. A ring of food around the planet.', [['harvest', 0.08], ['network', 0.02]], 3, 6, { fork: 'or-cap' }],
  ['or-cap-c', 'Star Brand', 'Capstone. The universe knows your logo.', [['demand', 0.06], ['value', 0.03]], 3, 6, { fork: 'or-cap' }],
  ['or-dyson-shelf', 'Dyson Shelf', 'A shelf around a star. Mostly cans.', [['shelf', 0.08], ['network', 0.02]], 2, 6],
  ['or-universal-pantry', 'Universal Pantry', 'Every planet stocked, every night.', [['network', 0.04]], 3, 6],
]

export const V2_UPGRADES: UpgradeDef[] = [
  ...build('floor', FLOOR),
  ...build('people', PEOPLE),
  ...build('supply', SUPPLY),
  ...build('brand', BRAND),
  ...build('automation', AUTOMATION),
  ...build('capital', CAPITAL),
  ...build('lab', LAB),
  ...build('fresh', FRESH),
  ...build('logistics', LOGISTICS),
  ...build('space', ORBITAL),
]

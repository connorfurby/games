# Changelog — this chat arc (2026-11)

Two stacked overhauls on Grocery Empire 2.0, then the **2.0 expansion megaplan**, then the **feel overhaul**, then **4.0**, then **40.0**. `SAVE_VERSION` moved **12 → 36** (40.0 Phase 8 is SAVE 36); the company layer is SAVE 44–45.

## AR. Company layer woven into progression (2026-11-19, on `main`, SAVE 45)

- **Icons**: Company hub gets its own briefcase icon (was the Money ledger). Treasury is now a vault (looked like City Hall/Town). Exchange (Era 8), Signal and Map stop borrowing Truck, Star and Orbit.
- **Staggered opening** (`CORP_OPENS` in `sim/corp/tick.ts`, one list with a plain "why"): Foundation → Boardroom → Customers in Era 1; Exchange + Courthouse at Era 2, then City Hall, Press, Lab and Treasury across Era 2 by sales; Executives at Era 3, Property later in Era 3, Franchises at Era 4; Union when the crew organises. Bot probe (seed 1): 41m, 49m, 52m, 3.5h, 3.9h, 4.2h, 4.8h, 5.9h, 8.6h…
- **Story beats**: every company/town screen now has a `MENU_LORE` line and a speaker, so opening one plays a strip line like the store screens.
- **Ambitions** (`content/corp/ambitions.ts`, `sim/corp/ambitions.ts`): three optional goals per screen (39), shown at the top of each screen and in **Side roads** under Road ahead (Tools → Game). Pay automatically, priced in seconds of best sales (2/5/12 min). Every step needs a player choice, so the bots and pacing never touch them. Not on the HUD spine.
- **Company upgrade tree** (`content/upgrades/company.ts`, 15 nodes): one desk per system (Grant writers, Investor relations, Quant desk, In-house counsel, Proxy advisors, Dividend club, Newsroom, Skunkworks, Credit desk, Claims adjuster, Property managers, Talent pipeline, War room, Crisis team, Franchise academy). Each shows only once you've used its system; prices scale with best sales (new `UpgradeDef.costScale`); two ranks open per era from the system's era (`rankGate`). All read through `upgradeEffect` in `sim/corp/*`.
- **Company memos** (`content/corp/memos.ts`, 11): Giving Charter, Letter to Owners, Trading Rules, Retainer Letter, Campaign Office, Open Books, Patent Pool, Credit Policy, Standard Lease, Crisis Playbook, Franchise Manual. Same engagement gates, priced by best sales.
- Crisis card shows the real odds and cost (after exec, Crisis team and Playbook) via `crisisOdds`/`crisisCost`.
- Wiki glossary: Ambitions, Town goodwill, Crowds, Owners, Shares, Lawsuits, Elections, Press trust, Inventions, Credit, Executives, Franchises, Company upgrades.
- SAVE 45: `corp.ambitions`, `corp.ambitionCash` (deep-filled). Tests: `sim/corp/integration.test.ts`.

## AM. Build street, real build tiers, growing showcase (2026-11-18, on `main`)

- **Build page rebuilt** (`BuildPanel` + `scenes/live/BuildStreetScene`): a street where each track is a building that grows with its level; tap one to jump to its card. One card per track: what you have, the style choice, what's next, one Build button; Queue / Close / Sell live under **More**. Scene upkeep reads `upkeepPerSec` (matches the strip).
- **Every build tier does what its card says** (`BUILD_TIERS` in `balance.ts`). Before, Regional DC, Cold Plant, Tank Farm, Cryo Hub, Pack Line, Factory, Truck→Barge and HQ Wing→Museum of Baskets did little or nothing beyond vague copy. Now: storage adds 2k/5k/8k/12k backroom, cold stretches perishable life up to 2.4×, transit keeps cutting delivery time (to −72%), Truck adds 12 per crate, Pack Line / Factory raise produce to 3/s and 8/s, civic copy states its real demand bonus.
- **Four end-game tiers** (Eras 11–12): Star Granary (storage 8: +20k backroom, vault +25%), Frost Ring (cold 7: perishables 3×, seed decay ×0.75), Harvest Spire (production 8: off-world sales ×1.1), Lightsail Dock (transit 9: +1 last convoy bay). All listed in `BUILD_CLAIM_READERS`.
- **The street evolves**: open starry sky with the worlds you reached from Era 7, beacons/spires/rings/sail for late tiers, a museum portico at Museum of Baskets, shoppers walking the pavement (more as the store grows). **Phone** gets a two-row street (storefront row, then garden/storage/civic) cropped to the tallest building instead of a pannable band.
- **Level-up moment**: confetti and a "Grand opening!" / "Built!" sign over the building that grew; the card itself glows. Reduced motion: sign only.
- **Museum showcase grows through the run**: base 3 (5 with the fifth-socket project) +1 case at Era 3, 6, 9 and 12, +1 for Museum of Baskets (civic 5). Only cases the run has opened pay (`relicEffects` ignores sockets past `socketCapOf`); a locked "Another case · Opens in Era N" tile shows what's coming.

## AQ. Company layer: balance, clarity, integration (2026-11-19, on `main`)

- **Balance** (`sim/corp/budget.test.ts` now guards it): young-stock growth ÷6 (≤ ~13%/hr), dividends ÷2.5, invention prices ×5 and licence royalties ÷4, rent ÷3 and appreciation 0.08%/min, franchise fee 10 min and royalty 1 s/min each, press reach halved, union and invention shopper bonuses trimmed, property cap 8%. **Profit sharing**: outside owners take `CO.payoutShare` (15%) of sales × their share every minute, so selling equity is cash now for a slice of every sale. **Soft cap**: the stacked company shopper bonus counts as b / (1 + b / 1.5).
- **Clarity**: "How this works" (`ui/corp/HowItWorks.tsx`, rules + real numbers from `howto.ts`) on every company/town screen and the rival bosses. **What your company does to the store** (`CompanyLedger`, `corpLedger()`): totals for shoppers/wages/crates/venture tills, the soft-cap note, and one line per active source with an Open button (Boardroom, compact on Customers). **Company money, per minute** in the Treasury (`corpCashFlow()`): dividends, rent, royalties in; owner dividends, salaries, premiums, coupons, garnishing out; net as % of sales. Offer and IPO cards state the dividend they cost.
- **Integration** (`sim/corp/actions.ts`): your share price reacts to being caught, losing in court, inventions and crises (tape lines once listed). Four new visitors reach into the company (an angel investor, a tinkerer, a defecting clerk who becomes a mole, a headhunter). Three board proposals do too (fund the lab, a headhunter, match crew giving). A law-and-order office raises back-alley catch odds. Market rival rows link to their boss; boss cards link to the Exchange and Courthouse.
- Lint: `useWitnesses`/`useFavor` were flagged as hooks; renamed `callWitnesses`/`callFavor` (command `callFavor`).

## AP. The company layer: Company + Town hubs (2026-11-19, on `main`, SAVE 44)

All of it lives in `sim/corp/*` (state slice `corp`, its **own random stream** `corp.rng`, ticked once per second by `tickCorp`), content in `content/corp/*`, commands in `sim/commandsCorp.ts`, UI in `ui/corp/*`. Every effect on the store flows through `sim/corp/effects.ts` (`corpDemandMul` → Books "Company", `corpWageMul`, `corpCrateMul(s, cat)`, `corpVentureMul`, `corpHeatCoolMul`, `corpLifeMul`). Rule: **nothing touches the store until the player takes part** (bots never do), except mild customer lawsuits from Era 2 — long pacing stays green with no target moved.

- **Exchange** (`market.ts`): 21 tickers (every rival as it opens, suppliers, utilities, startups, space). Walk + news + rival store count; young companies grow ~1 era then settle; 0.5% fee; dividends each minute. Crate-price desk: 5-min hedge, 3-min up/down bets.
- **Boardroom** (`company.ts`): valuation (sales × 120 min × brand × momentum × walk); 8 owners with levers scaled by stake (Ivo, Harlow, Vulture, Rosa, Pension (vetoes the alley at 10%), Orbital, Grudge (votes against you), Colony); offers; IPO from Era 3; 10-min quarters with targets, streaks, shareholder meetings; buyback/issue/go private/buy owners out; board votes on 10 proposals with lobbying; rival stakes vote against you.
- **Rival bosses** (`rivalry.ts`, in Team › Rivals): temper, grudge (only from your actions), moves past 40 (smear, poach, buy into you, sue), truce; best-of-three price war (undercut/match/hold, bosses read you); moles (steal recipes, sabotage, cover, caught → Heat/brand/grudge/lawsuit); 51% share takeover via `foldRival` (refactored out of `buyout`), poison pills past 30%.
- **Courthouse** (`court.ts`): rival, customer, espionage suits; 5 judges, 4 lawyers, settle/trial/default; sue a rival who turned on you.
- **Treasury** (`treasury.ts`): credit 300–850 (builds while carrying debt), 3 bond sizes, coupons, arrears + garnishing, prime crates; insurance (spoilage, weather, fines, liability) with claim bumps. Scheme: stage a little flood.
- **Town hub** (`town.ts`): Foundation (8 causes, perks at L3, goodwill → shoppers/witnesses/Golden Basket), City Hall (4 offices, campaigns, favours, platforms as law), Union Hall (forms at 8 staff; pay/benefits/hours; strikes after 2 refusals), Press (5 outlets, puff/attack/bury/pump/endorse, credibility), Customers (7 segments, fit → loyalty, court one).
- **Lab, Property, Franchises, Executives, Crises** (`more.ts`): 10 inventions (patent or get copied; license for royalties), 8 lots (rent, appreciation, tenants), franchisees with traits and quality, 6 C-suite chairs with traits/levels/incidents, 8 crises for companies in the public eye.
- Hub badges count waiting decisions (`companyAttention`, `townAttention`). Crisis card outranks headline and visitor cards.

## AO. Back alley, visitors, venture rushes (2026-11-19, on `main`, SAVE 43)

- **The back alley** (`content/crime.ts`, `sim/systems/crime.ts`, `sim/commandsCrime.ts`, `ui/ventures/BackAlley.tsx`, `CRIME` in balance): 18 optional schemes from Era 1 (Relabel the dates, Borrow from the charity jar, Water down the coffee) to Era 12 (The Last Aisle heist). Each pays now (shoppers, cash, faster tills, cheaper wages, free stock, ends a rival move) and adds **Heat**. Heat cools 10/min; **Lie low** cools 3× and shuts the alley; **Envelope for the inspector** (Era 4+) cuts 35 Heat or backfires. Catch odds = (heat + half the scheme's heat) / 170, capped 60%; above 70 Heat surprise raids can come. Punishments escalate: warning letter → fine (scheme cancelled) → padlock (shoppers ×0.2 for 1 min) → scandal / frozen venture tills / probation. Fines are seconds of sales, never more than half your cash. Rap sheet + alley rank (Honest grocer → Legend of the back alley); BUSTED stamp on the card. Bots never use it, so pacing is unchanged by design.
- **Visitors at the door** (`content/visitors.ts`, `sim/systems/visitors.ts`, `components/VisitorCard.tsx`, `VISITOR` in balance): 29 characters across Eras 1–12, at least two per era. One knocks every ~4 min, waits 90 s in a corner card, two choices (shoppers, tills, wages, cash, brand, stock, coin flips, Heat up or down). Never shown over a chapter card, a headline or a tutorial.
- **Venture rushes** (`content/ventureRushes.ts`, `VENTURE_RUSH`): about every 4 min one open till fills 3× for 30 s, with its own line ("A tour bus just parked by the Coffee Cart."); the card glows with a Rush badge.
- **Books**: demand multipliers now use plain names and only list the ones that move.
- State: `crime`, `visitors`, `ventureRush` (SAVE 43, migrate paths, version pins bumped).

## AN. Signage track (2026-11-19, on `main`)

- **Seventh build track, Signage** (`content/builds.ts`, `BUILD_TIERS.signageDemand`, `signageMul` in `demandBreakdown`): Chalkboard ($120, Era 1) → Painted Sign → Neon Sign → Billboard → Video Tower → Sky Banner → Aurora Sign → Orbital Billboard (Era 11), +4% to +26% demand. Opens after $150 lifetime revenue. Bots buy it like any track (`BUILD_FILTERS`); late tiers have claim readers.
- **Street art**: chalkboard by the door, rooftop board (behind the name plate) or facade board on tall stores, neon hum, video board, blimp with banner, aurora, a billboard in orbit. No flicker (owner rule: never flash).
- **Suppliers dock redrawn** (`DockScene`): price board on a pole (▼ Low / ● Normal / ▲ High), road with trucks placed by their real arrival time and an ETA pill each, a RECEIVING warehouse whose bay door rolls up as a truck pulls in, crates stacked inside by backroom fill and a fill bar on the wall; a parked forklift when nothing is on the road. Replaced the doubled ticker and the empty tally box.
- Locked chips are muted by colour, not opacity, so their "go there" link keeps full contrast.

## AL. Loading and motion pass (2026-11-18, on `main`)

- **Boot splash** in `index.html` (pure CSS, compositor-only animation) so the first frame is never white.
- **Welcome-back loading screen** (`CatchUpScreen`): away gaps ≥ 60 s catch up a slice per frame via `beginOffline` (step/progress/finish) instead of freezing the page; saves wait until done; the receipt then prints in (CSS `g2-print`).
- **Page transitions** (`PAGE_VARIANTS` in GroceryEmpireApp): direction-aware springs (sub-tab slides from the side you moved to; a new hub rises with a soft blur), page blocks rise in staggered. **Modals**: scrim fades, card springs. **Entering the game**: HUD drops, rail slides, room rises.
- **Shop-shutter curtain** (`withCurtain` in `components/curtainBus.ts`) for Rebrand and restoring a backup.
- **Money formatting**: "Upkeep $2.3000000000000003/min" fixed; ~40 sim strings now use `cashLabel`. `/home/claude/audit/nums.cjs` scans every page's text nodes, titles and labels at Era 1/2/4/7/10/12 for long decimals, NaN, Infinity, undefined, null, [object: 0 hits.
- Everything respects reduced motion (OS setting and the in-game toggle via `.ge-reduced-motion`).

## AK. The bot follows the HUD now · SAVE **42**

- **Sticky goals** (`goalsDone`, SAVE 42): `stampGoals` marks goals done once per sim second; `nextGoal` never shows a completed goal again. Found because "Run a wire ad" un-completed every 3 min (the ad's end reset `wireAdsUntil` to 0; it now keeps its timestamp).
- **Era 7 "Open the exchange" Do-it looped** refiling a world that already counted; the next step is now always another probe.
- **Bot follows `nextGoal`** (the HUD's list; `botSpine.mode = 'hud'`). `_spine_debug.test.ts` (SPINE_DEBUG=1, BOT_SPINE, SPINE_FROM=fresh|era8…) prints the goal timeline. Seed 1: Era 6 ≈ 21.4 h, Era 12 ≈ 38.0 h.
- **Targets moved, with reasons in `pacing.test.ts`:** Era 6 lower bound 22 h → 21 h; Era 12 window 40–50 h → 36–50 h. The old bot was slowed by a stuck HUD goal, not by the game.

## AJ. Waits debug, goal spine fixes (2026-11-18, on `main`)

- **`_waits_debug.test.ts`** (WAITS_DEBUG=1, optional WAITS_FROM=era8 WAITS_HOURS=8): runs the bot and prints the longest stretches with nothing but churn, with the goal on screen. Found: Era 1 dock check-in taps every 2 min for an hour (now automatic after 5); Era 8–9 HUD showing an **Era 10** goal ("Run a wire ad") for hours.
- **Goal spine**: `wire-ad-goal` moved into the Era 10 block; a test asserts goals are listed in era order. HUD `nextGoal` skips undone goals from past eras and never shows a future-era goal.
- ~~**Bot keeps the old spine**~~ (superseded the same day, see AK) (`nextGoalInOrder`): the long pacing run showed the bot's late tuning depended on the HUD being stuck on Era 6's board agenda (Era 6 landed 0.6 h early, Era 12 missed 50 h when the bot followed the fixed HUD). Long pacing passes again. **Backlog:** retune the bot to follow `nextGoal`, then check the Era 6 lower bound and the Era 12 window.
- Every cooldown reason reads as a wait ("21m 37s", `waitLabel`), in the sim and the UI.

## AI. Designer round — autopilot, story, safety, the late game (2026-11-17/18, on `main`) · SAVE **41**

- **Autopilot (P6-02).** Menu → Autopilot (and the palette) lists every chore that can run itself: unpacking (clerks), paying invoices, restocking (Auto-Order Clipboard), dock check-ins, the cooler log (Plant Operator on shift), collecting tills (Venture Runner / Cart Runner), tournaments (Tourney While Full), dusting duplicates. On/off, a toggle once earned, or how to earn it with a link. `AutopilotPanel.tsx`.
- **Dock check-ins run themselves** after the 28 by hand (`depth.autoDock`, SAVE 40; `sim/systems/dock.ts`), to the lowest-stock aisle; a log line marks the moment. `collectAllVentures` command; Ventures' Claim and the return receipt use it.
- **Return receipt "Catch up"** collects tills and pays invoices in one tap (P6-03).
- **Run story (P6-04)** in Menu → Game: baskets, takings, most cash, stores, and a bar per era. `stats.eraAt` (SAVE 41) is stamped by `setEra`.
- **Road ahead**: the goals left to the next era as a path, current step with hint and progress, the door starred. The Next goal eyebrow ("Next goal · road ahead ›") opens it.
- **Automatic backups (P6-09)**: a snapshot every 10 min of play, newest 3, restorable in Saves; restoring snapshots the current run first; New Game and Rebrand clear them.
- **Late game, finally looked at.** DevMode has Era 8/10/11/12 stages from bot-played saves (`sim/devFixtures`, code-split; regenerate with `GEN_FIXTURES=1`). Found and fixed: the Next goal sat on an Era 6 side goal through Era 12 (nextGoal now skips undone goals from eras already left); headlines were a full-screen modal every six minutes (now a corner card with a life bar); "Oc" read as "0c" in the mono face (thin space before Qa+ suffixes); HUD cash and baskets show the spoken number on hover ("949.27 octillion").

## AH. Round 6 — page-by-page visual pass (2026-11-17, on `main`) · SAVE **39** (unchanged)

- **Goal plate.** A tray primary that can't be used yet and has no price is no longer a greyed button: it renders as a dashed "Not yet" plate with the reason under it (`.pf__goal` in VerbTray). Priced primaries stay buttons.
- Fail reasons ending "in Memos." get an **Open Memos →** link automatically (FailReason → `requestInbox`).
- HUD: Undo sits outside the pause pill, so the pill doesn't show an empty slot now that speed buttons are gone.
- Menu tabs size to their words and wrap (no "Notices…" ellipsis).
- De-duplication: Invest's second Savings card, Books' second Incorporate button (coach now points at the tray), Museum's second Fill button, Empire's Last/Next reward pair (the rank hall shows them; the board keeps what the next reward does).
- Land keeps the street as its room in Era 7+ until a world is stocked; the Map hides System/Cluster/Galaxy until a probe reveals a world; Planets stops saying "affordable now" when a memo is the blocker.
- Upgrades: the group blurb no longer stretches 14rem tall on phones; the bonus track reads "14/50 levels · ×1.1 next". Tray hints have their own small muted style.
- Council seats lost their overlapping numbers. Ventures' empty lots show a faint preview of their sign. The store scene's Shrink button says **Collapse**.
- Plain words: Next strategy, Sea routes (map), Richer plants (law), "The region’s supply is empty", Books late table column **Source**. Opening cutscene rewritten: Day one, Three jobs, no "Era 0".

## AG. Owner round — fewer clicks, one speed, a museum you can read (2026-11-17, on `main`) · SAVE **39**

- **Invoices pay themselves.** New `depth.autoPayInvoices` (default on; SAVE 39 turns it on for old saves) settles open invoices oldest first, early, whenever cash covers them, quietly. The Invoices desk has the toggle and one **Pay all N** button (`payAllInvoices`) instead of a Pay button per invoice. Shared logic in `sim/systems/invoices.ts`.
- **No time speed-ups.** The 2×/4×/8× HUD buttons, the phone speed cycler and the Speed setting are gone. `setSpeed` only accepts 1; migrate, invariants and reset force `speed = 1`. The "Speed Demon" relic now asks for 100 baskets in a run's first three minutes.
- **Upgrades:** the plaque wall (a copy of the group tabs) is gone. The room is the group tabs, the group's blurb and a **group bonus track** (current ×, levels to the next step).
- **No hover on things that do nothing.** Scene zones are tappable only for an action, another page or a live suggestion; zones that only scrolled to a control already on the page (Rank hall trait points) are plain art. Memo cards and ledger rows lost their hover highlight. Probe: `/home/claude/audit/hover.cjs`.
- **Museum rebuilt.** The room is a lit **Showcase**: one display case per socket, showing each relic's perk before → after the +35%. Empty cases say what to do; **Fill with my best** (`fillShowcase`, `bestShowcase`, `relicWorth` in `sim/museum.ts`) fills them in one tap. A three-step "how it works" strip, a **What your relics add** grid that finally includes levels and cases (with the cases' share), **Lit wings** (wing sockets, renamed) with the bonus on each row, wing cards with relic silhouettes and a Lit state, a back button instead of the wing picker, and the dust shop holding Auto-dust. The relic card is one component for phone and desktop, portals to the game root (it was off-screen on long pages), and swaps a stronger relic into a full showcase instead of greying the button. Player copy says showcase/case, never socket.
- `sim/sockets.test.ts` proves a case raises the stat by ×1.35 and unsocketing restores it, and that Fill picks the strongest relics.

## AE. New-player playtest, Era 0→2 (2026-11-17, on `main`) · SAVE **38** (unchanged)

- Walked a fresh save at 390 px and 1440 px with "Do it for me" on every tour step.
- Guidance copy (tour, Next goal hints, checklist, atlas, lore) no longer points at old openers like "Open Price" or "Shift Board"; it names the desk to use.
- "Ring the Market Bell thrice" → **Buy on three price dips**. Restock on the Floor now says whether the crate price is low, normal or high and counts dip progress (`wholesaleIsDip` in formulas; the command uses it too).
- Wholesale index numbers are gone from player view: Suppliers and the Dock room say Low / Normal / High.
- Phone: room chips wrap two to a row instead of scrolling off the edge; award toasts drop below the money row while a tour card is up; the Dock room shows chips only.
- Memo desk hides search, Ready-only, Jump, and empty Standing/Filed tabs until there is enough to sort.
- Plain words: Unload → Unpack everywhere, "drifting" stores → "need a visit", Books chips Burn/Side → Costs/Other, Attention tip rewritten.
- Starter crate button only appears when usable (law 15).
- Museum (phone): chest reveal now portals to the game root and covers the money bar; page title and gallery come first, stats move under Chests; duplicate "Active perks" stat removed.
- Awards: the save-picture button only appears once you pick awards (was a dead button).
- Era 2–6 tour steps and goal hints rewritten in plain words (no drift war, covenants, Orbit on Mid, Swear exam holds, yield, Momentum jargon in guidance). Goal titles renamed: Pass route inspections, Redo the shelf layout after Import, Staff the middle shift, Hold the line, Staff produce and cold.
- Logistics: "exam hold / swear exam / exam-ready" is now **inspection** (For inspection, Pass inspection). Circuits and Convoys chips only appear once those features exist. HUD alert says "A store needs a visit". Fleet tip rewritten.
- Era 7–12 goal hints and the stretch tours (weather, rivals, invoices, planogram, cooler log, manifest, hauler, hearing) rewritten plainly; puzzle scores read as percentages (72%, 85%) instead of 0.72 / 0.85. Goals renamed: Serve a picky guest, Settle a stop with a cost, Make a clause final, Fill the list, Practise the list.
- Every puzzle score on screen (Planets, Exchange, Convoy, Last Aisle, Floor planogram, map pins, wiki, lore, atlas, checklist) now shows as a percentage via `pct()`. "Planet layer", "Worlds layers" and the Exchange "Keel" chip are reworded; an unset route reads Open instead of a dash.
- Desktop mid-game pass: Politics shows a county hall (bills, lobbyists, capital, region supply gauge) until the Council exists in Era 7, instead of 14 empty council seats; scrutiny gauge no longer prints its value twice; `Gauge` label is optional. Fleet charter drydock draws one labelled row per axis (no overlapping names; Brand Seal reads Brand); pier labels no longer sit on the barges. Logistics lanes say fuelled / no fuel instead of wet / dry. Phone HUD keeps cents under $100.
- Map: removed the Zoom in / Zoom out tray buttons that duplicated the ring picker. Marketing room chips read Celebrity and Price war.
- Rooms: the number row now paints after the art (and ignores taps), so billboard bulbs and similar art never cover the chips. Cold tanks no longer repeat the shared fill % under every tank.
- Tip deck: about 30 tips rewritten in plain words (no wet/dry lanes, doctrines with teeth, drift, Momentum, county yield, files the silence).
- Late game: the Worlds hub no longer shows a season-minutes badge that read like an unread count; Signal's mast is a lattice radio tower (the old pole looked like a gallows); Greenhouse labels sit on a dark plate and empty beds are dashed outlines so they read on the pale spring sky; Exchange says "No convoys yet: plan a route"; Last Aisle purpose matches the five-line list.
- Tablet (820 px): hub sub-tabs share the row evenly (`flex: 1 1 0; min-width: max-content`) so six tabs fit instead of wrapping five-plus-one; segmented pickers wrap instead of hiding options behind a hidden scroll; desks are size containers and stack label-over-control under 26rem. Crawls t9 (tablet, 121 screens) and p9 (phone, 125 screens): 0 errors, 0 overflow, 0 shifts.
- Late rooms: captions moved off the floor line into the ground band.
- Notices: about 35 sim log lines rewritten in plain words (power dip, investments restarted, you owe too much, visited a store, harvest, strategy learned); puzzle scores in notices read as percentages; money stays in dollars.
- First-loop beats (P5-02): `useMilestones` now bursts "First basket!", then 10 / 100 / 1,000 … baskets, and "First hire!" (reduced motion keeps the sound only, as before).
- HUD: Undo is invisible (slot kept, so nothing shifts) until there is something to undo, instead of sitting there greyed out.
- Phone crawl p8: 123 screens, 0 errors, 0 overflow, 0 shifts, no new dead buttons; low-contrast hits down from 14 to 2.

## AF. Audit 3 — taps, wraps and rooms (2026-11-17, on `main`) · SAVE **38** (unchanged)

- Inline "go there" links (`.pf-chip__link`) are now bordered pills with an arrow, 32 px tall (40 px on touch), not underlined text.
- Owned-strategy chips are 36 px tall.
- Map: a tap that misses every pin picks the nearest pin within ~28 px (`snapToNearestPin` in BlockMap), so phone pins are usable.
- Long primary verbs wrap to two lines instead of running off both edges (Strategy's tournament button on phones).
- Rooms that only cropped badly on phones show their numbers only: Council, Ventures street, Invest.
- Invest room chips: Savings, Invested, then Holdings / Returns once instruments exist (was Lots / Yield/s / Book / Pads at zero).
- Story: about 25 character lines and chapter cards keep their voice but drop jargon (drift, yield, Momentum, surplus, dry lanes, doctrine with teeth) and say where to act.
- Menu drawer: Undo only appears when there is something to undo; News / Guide / Awards / Shop are cards instead of small underlined links; empty save slots hide Load (column kept). "Arrears" is "unpaid rent" in Books, the rent lesson and the story line.
- Every finished Next goal rings the goal bar with a "Goal done" burst (same era only; era changes keep their own sweep).
- Keyboard: a picker with nothing chosen yet (e.g. the first facing) is now reachable with Tab (first option takes focus); the pause button is named "Pause" for screen readers. Tab order checked on Floor and Empire.
- Performance (production build, Era 7): 86% idle unthrottled; one ~55 ms long task in 6 s at 4× CPU throttle. Nothing to fix.
- Build room chips: Building, Level, Facing, Upkeep ($/min or none). Billboard and Build rooms show numbers only on phones (their band was a bad crop).
- Next goal hints are short directions in Hub → Page → Section form ("Store → Floor → Regulars.") so they fit the bar without an ellipsis; full text on hover.
- Empire rewards: last/next reward now say what they do (blurb) and use "rank" consistently; "See all rewards" and the Museum dust shop are real disclosure buttons with an edge.
- Land: store rows say "80% slipping", "Attention 33%" and a **Visit** button (was Walk the floor / drift / Attn); deeds say Bought. Another ~25 blurbs, checklist lines and wiki titles lose drift / yield / wet / stance / Momentum.
- Consistent controls: Land's per-store policy picker is the kit `SegmentedControl` and Fleet's charter axes use the kit `Stepper` (hand-rolled `.ld-seg` / `.fl-stepper` / `.fv-stepper` CSS deleted). Fleet: Haulers / Replicators / Arks tabs, "Take on Off-Brand" (shows the reason as text when not ready), Off-Brand desk title and axis effects without war/drift jargon.
- Pages with only desks no longer add an empty body gap; desks sit 8 px under the primary verb (was ~40 px).
- Lessons and wiki: 13 lesson titles renamed (Go public, Hand over the chain, Invest spare cash, Guardian shield, Keep supply ahead, Open a route…) and their bodies rewritten; the long guide reference, glossary and memo lines lose the old jargon and decimal scores. "Release Autonomous" is "Hand over the chain" everywhere.
- Memo effects: about 30 effect lines rewritten so they say what the memo does ("Theft −30%", "Lets you build Cold Plants", "+6 Charter points to spend") instead of flags, nodes, paths and tiers.
- Room numbers audit: chips that only meant something while running (Celebrity, Price war, Keel & Sons, Other income) now appear only when they apply; empty values read "none ordered", "none", "not yet" instead of a dash; Cold says Spare cold / Tanks N (x% full) / Freshness; Staff says Holding back.
- One word for one thing: the items bought on the Strategy page are **strategies** everywhere a player reads (panel, tips, memos, rebrand carry, notices, glossary). Code ids stay `doctrine`.
- **Text size setting** (Normal / Large / Larger) in the menu drawer and full Settings. It sets the root font size (112.5% / 125%), so text and controls scale together; the money bar and hub bar counter-scale with `zoom` so their numbers never collide. Phone crawl at 125%: 125 screens, 0 errors / overflow / shifts. Meta setting with a default, so no save migration.
- Welcome back: says "You were away 8 hours" (was "480 min simulated"), hides a zero Spoiled line, and its secondary buttons are solid instead of grey-looking. Award pop-ups move under the money bar while any window is open on a phone. Settings: Close button instead of Esc, plain number-format hint.
- Spacing (P1): 340 gap/margin/padding declarations in grocery.css, g2.css, play.css and shell.css snapped to the `--s-*` scale when within 1 px (`/home/claude/tools/spacing.py`); calc() left alone. Desktop crawl d10: 0 errors / overflow / shifts, pixel diffs under 5% (live numbers and 1 px nudges). Phone floor visual baseline refreshed (it predated this round's copy). Strategy room sign: Strategy board.
- Audit 5 (on-screen text dump of every page in six eras, searched for internal words): fixed barge gate / MegaMart snipes / Puzzle currencies gate verbs / layer log-share note / tap a node / yield per s / Momentum badge / Prestige-adjacent / Stock tier / hotter war / brownout drills / wet import lanes / Surplus and buffer signs. "Shrink" is "theft" in every description (memo and upgrade names kept).
- Build: the building choice is a **Style** (Facing already means featured cans on the Floor); levels instead of tiers; "N of 6 building types"; Sell top level; Hibernate is "Close for now" with a plain confirm.
- Logistics: Dispatch rows show the route's name and cargo ("Spice Route · carries Household · not filed yet") instead of raw ids like `spice-route → import`; the page, room and guidance say **routes** (Route 1, Routes 4/4, Open route); flavour names like Lane Boss stay.
- Text re-scan after the sweep: last stragglers fixed (fast-run fuel reason, loyalty level, matching-policy perk, Politics seat and Capital notes, Empire pair note). Remaining hits are flavour names or ordinary words.
- Rivals: room chips read Your stores / Rival chains / Bought out; the price war row names its target and says what it does ("$78.75K · closes 2 of their stores").
- Marketing: the weekly flyer explains its one rule (keep shelf price at or below the flyer price) and the Deep / Mid / Soft trade-off in words; Produce Lead and cooler-log notices plain.
- Suppliers / Backroom: Restock priority has one home (Backroom) instead of appearing on both pages; with only Express available the supplier shows as plain text, not a one-option picker; the Backroom room shows numbers only on phones.
- Kit: a `SegmentedControl` whose only possible option is already chosen renders as plain text (`.gk-seg-static`) instead of a lone toggle, everywhere. Phone crawl p11: 121 screens, 0 errors / overflow / shifts.
- Invest: one name, **Savings**, for the passbook (card, sheet, advisor, lesson, glossary); the duplicate status-chip row under the room is gone (the room already shows those numbers). Books room: "More money streams appear later".
- Cold / Politics / Land pass: every "Need $X" reason now uses the shared money label ("Need $400.00K." not "Need $400000."); Cold's primary is **Add cold capacity**, power-dip notes are plain, the plant/tank badge row is gone (the room shows it), the tank % hides with no tanks; Politics bills are a real desk of rows with what each does and why it is locked (were greyed chips), the repeated Capital / Neighbours chips are gone (Monopoly heat stays); Land's policy picker gets its own line on phones, "Store visits during a block event", "More plots open in later eras".
- Phone sub-tabs: an even grid that wraps to a second row (Worlds' six tabs show as 3 + 3) instead of a sideways scroll that cut tabs off.
- Late pages: Cultivar beds show Harvest only when there is something to take; Last Aisle lines show Fill only when ready and otherwise say what to do ("Stock that world on Planets, then fill"), shelf targets read as % ("at 72%"), plain labels (Chance a practice misses, crossed out, At the end…); Exchange hides the Keel note at zero convoys; Signal agent lines say what each agent does; "Unlocks: buy the X memo in Memos". Phone crawl p12: 123 screens clean.
- Fleet: the status row drops the Pockets chip the room already shows; "N pockets waiting · 1 hauler at a time", "Round trips" (was Turnarounds), and the pocket note says what to do.
- One card voice: late-page card titles (puzzle heads, goal heads, Politics/Invest cards and callouts) use the same display face as desk titles, so early and late pages read as one game. Invest: "Investment book".
- Late rooms no longer repeat the currency (Seed, Freight, Signal, Seal) as a chip; the strip under the goal shows it with its per-second rate and the tour still points there.
- Empire hub: Upgrades speak of **levels** (37 "per rank" blurbs → "per level", Buy the best upgrades in X, Buy the best in every group) and the duplicate Mastery tag became "Next bonus at N levels"; Strategy's Next chip says All owned when the era's strategies are bought; Map's verb is "Go to Floor" and its legend says your first store / rival store.
- Museum: the 21-wing chip cloud is one "Show" picker with progress per wing ("Corner Store · 3/25"); "Active perks" only appears once you own a relic. Ventures: the ready-only filter appears from three open tills.
- Upgrades room chips: Upgrade groups, Levels bought, Can afford, <group> bonus.

## AD. Daily twist, phone rooms, CSS cut (2026-11-17, on `main`) · SAVE **38**

- **Daily twist (SAVE 38).** `GameState.dailyRule: DailyRuleId | null` (default null; migrate keeps only known ids). `balance.ts` `DAILY_RULES` / `DAILY_RULE_ORDER`: eight rules, each one upside and one downside on demand, crate cost, truck time or wages. `formulas.dailyMod(s, key)` multiplies `demandPerSec`, `crateCost`, `deliveryTime`, `wagesPerSec`; 1 in every normal run, so pacing is untouched. Command `setDailyRule` only before the first sale and only once. Starting Today's corner sets the rule from the seed (`content/dailyRules.dailyRuleForSeed`, same pick as the theme name). Floor shows "Today: …" with one plain line; the Menu daily section and confirm say which twist. Tests `sim/dailyRule.test.ts`.
- **Rebrand keeps the store name** (was lost) and the daily rule.
- **Phone rooms:** Empire hall has a portrait layout (ring + rank, next reward, points); `RoomScene phoneChipsOnly` for lettering-heavy rooms (Books, Upgrades, Strategy) shows only chips on a phone.
- **Dead CSS cut:** ~3,500 lines from `grocery.css` and `g2.css` (rules whose classes no code uses, prefix-aware). Before/after full crawl compared pixel by pixel: no visual change beyond live values and animation frames.
- **Contrast:** danger button ink mixed toward ink.

## AC. 1.0 fourth pass — every panel, Worlds era, ambience, collection (2026-11-17, on `main`) · SAVE **37** (unchanged)

No state or balance changes; pacing untouched (`driftShopperLoss` is a pure extraction).

- **Clarity pass, Store/Money/Empire:** Backroom (scanner says what it gives; perishables, bonded cage, seed vault as desks; no repeated meters), Books (dollar table with plain lines, advice callout with an Open button, only real actions in the tray), Upgrades (buy button names tree and first rank; hall cards are art), Strategy (one "Next doctrine" row, held doctrines as tags), Rivals (scene signs match names; "takes N% of your shoppers"), Ventures (Ready-only switch, no repeated footers).
- **Naming:** Empire's trait-point unlocks are **Perks** in player text; Strategy keeps **Doctrines** (Read). Code names unchanged.
- **Worlds era:** "File the standard" replaced by what it does per panel (Send the standard convoy / Plant the standard cross / Stock the standard shelf / Send the standard phrase / Fill with the standard). Exchange packing board uses kit `Select`; Cultivars parent pickers are `Field` + `SegmentedControl` with season wants starred; Signal agent habits are segmented; Charter table shows four slots, hearing copy uses "Downside", shared lock reasons show once. `PuzzleFrame` never renders a dead Standard/Commit button. Greenhouse scene no longer draws over its chips.
- **Copy:** Era 7–12 tour template and bodies, coach recovery lines, checklist, goals and several tutorials rewritten without "gate", "fork", "docket", "verb", "sim", "layer". Floor planogram and write-off controls only when usable.
- **Ambience:** `startEraAmbience(ambienceForEra(era))` — street/birds, shop murmur/door chime, cooler hum/compressor, harbour waves/gulls, space drone/shimmer; replaces the pack hum while the game is open; under Settings → Room tone. Audio restarts a tick after settings change.
- **Room life:** Floor shoppers walk door → shelf → till (count follows sales); Backroom stocker carries crates while trucks are inbound. Both off under reduced motion. Fake "tap here →" prompts removed from Backroom, Cold and Lane scenes; `RoomEmpty` never links to the page it is on.
- **Ventures art** revived from the stash (visuals only): `ui/ventures/VentureArt` + `ventureLook` (UI-only hue/sign table) + `ventureArt.css`; empty lot → cart → shop → two storeys → tower by level.
- **Land:** one line on what drift costs (`driftShopperLoss`); the block event shows once.
- **Collection on the street:** each completed museum wing flies a pennant above the storefront sign (`StoreScene pennants`); completing a wing gets a banner line and the award cue.
- **After the story:** Next Goal frames endless play with milestones (5, 10, 25, 50, 100…) and a Show me to Planets.
- **Photo export:** Photo mode → Save picture (`ui/scene/exportPng.ts`, computed paint inlined, 2x PNG with caption). e2e `photo.spec.ts`.
- **Notices:** All/Rewards/Blocked filter, unread count on the Menu tab, no ding for blocked.
- **Phone:** `Hit` pads small zones to 48 units; Fleet charter bars read Hull/Copy/Scout/Speed/Brand.
- **Dev:** era jump goes to 12.

## AB. 1.0 third feedback pass — desks, no dead buttons, music (2026-11-17, on `main`) · SAVE **37** (unchanged)

No state or balance changes; pacing untouched. Owner asks: thin side sheets are pointless, small bottom buttons hide big actions, invoices/slips/doctrines are hard to find, buttons that cannot be pressed should not exist, scene zones that glow and bounce but do nothing, Staff room looks messy, menu tabs clip, more music and sound variety.

- **Desks replace opener+sheet pairs.** `PlayFrame desks={…}` (also on `HubStage`, `ScreenPanel`, `LateHubShell`). A kit `Sheet` inside the desk area renders in place as a titled card (`.pf-desk`, `--wide` spans the row) via `kit/desk.ts` `DeskInline`; `deskHidden` hides a card until it applies. Sheets nested inside a desk are real sheets again. `scrollToDesk(cls)` brings a desk into view. Converted: Floor (Regulars, Shelf price, Restock, Off-world bay), Staff (Hire, Crew, Department rules, Shifts & hours), Empire (Doctrines full width, Autonomous, Rebrand, Hungry laws), Suppliers (Invoices with a Pay button per invoice, Dock check-in, Auto-restock; price lock moved into the order form), Marketing, Logistics, Cold, Build, Charter, Fleet, Invest. Item-detail sheets (rival dossier, strategy detail, map node, museum) stay sheets. When converting, point the old opener at `scrollToDesk`, then remove openers the desk makes redundant.
- **No dead buttons.** `ActionRow disabled` renders an info line with the reason (`.pf-row--info`, `.pf-row__why`); usable rows end in a verb pill. `VerbTray` drops disabled secondaries and accepts `primary: null` (no tray when there is nothing to do). `SegmentedControl`/`Tabs` leave out disabled options (the current one always shows). Disabled `Chip` is a plain tag. Panel sweeps: Politics petitions, Map zoom levels, Invest deposit/withdraw/risk/instruments, Land walk/train/charter, Fleet charter, Books incorporate, Cold plants/treaty, Staff policies, Dock check-in aisles. Crawler (`audit.cjs`) now lists visible disabled buttons per screen; remaining ones are prices (relic dust, venture costs) and stepper bounds.
- **Room zones.** `Hit` is tappable only when it does something (an action, another panel, or a real control on the page to scroll to); otherwise it renders as art (`.rm-art`). Fake prompts drawn into scenes ("Tap bay to place an order →", "Dock check-in →", the Doctrine badge) are gone.
- **Floor hint is truthful.** `salesBottleneck` only calls unpack the limit when the shelf is under half full; labels are short. The room shows a calm amber pill that never truncates.
- **Empire ring** shows just the rank, centred; the duplicate Rank chip is gone. Reward facts are text, not disabled rows. "Spend N trait points" is the primary when points are waiting.
- **Staff room rebuilt:** chips on their own row, stations aligned, crew lined up under the station they work with "+N" overflow. Room `Person` is slimmer (legs, torso, hair) everywhere.
- **Menu drawer:** "Menu" title + close, then an equal-width tab track that always fits (Dev, Game, Guide, Notices, Settings, Saves).
- **Music:** scores play A A B A with a recurring motif, era lead voices (pluck/bell/soft), arpeggio and shaker where they fit, and an occasional key lift. New `harbor` (Eras 5–6) and `night` (22:00–05:00 player clock) moods; `moodForEra(era, hour)`.
- **Sound:** new cues `toggle`, `coin`, `truck`, `hire`, `goal`, `rank`, `notice`; repeated cues vary in pitch; the till walks a little tune. `fx/useSoundDirector` plays hire/rank/memo/delivery/sale from state diffs (quiet on loads and big jumps). Toggles and notices make their own sound.
- **Copy:** full aisle names in pickers; plain wording for routes, dispatch, upkeep, cooler log, plants, shifts, invoices, doctrines ("Refund all points"), restock priority.
- **Tests:** `npm test` 409 passed; e2e 20/20. Crawls at 1440 and 390: 0 console errors, 0 overflow, 0 layout shifts.

## AA. 1.0 second pass, continued — awards wall, music, photo mode (2026-11-16, on `main`) · SAVE **37** (unchanged)

- **Awards wall** (`shell/AchievementsPage` + `awards.css`, `achievements/groups.ts`): awards grouped on shelves with plaques, progress and a hall total.
- **Sound set + music** (`shared/audio.ts`): `sfx` cues (click, open, blocked, unpack, sale, purchase, unlock, chest, era, award), generative score per era, Settings → Sound (volume, music + level, room tone). Wakes on first gesture.
- **Photo mode** on the storefront banner; **High contrast** setting (`html.a11y-contrast`).
- **One title per screen:** hub title is sr-only; the storefront banner sits on every hub and carries the dialogue slot.
- **Menu** folded to fewer tabs (Game holds run, progress and leave).

## Z. 1.0 features and second feedback pass (2026-11-16, on `main`) · SAVE **37** · GAME_VERSION **1.0**

One new save field (`storeName`, display only). No balance changes; pacing untouched.

- **SAVE 37 — `storeName`.** Default `''` in `createInitialState`; `migrate` reads it through `cleanStoreName` (one line, trimmed, ≤ 22 chars). Command `setStoreName`. `storeDisplayName(s)` is what the sign, HUD brand and chapter card print. UI: Name / Rename button on the storefront banner → `shell/StoreNameDialog`.
- **Storefront:** banner reacts to growth (`storeGrowth` in `SceneStrip`: era, build tiers, stores, staff) with a ring and one overlaid line. `ChapterCard` shows the store band and four run numbers and plays the era sting.
- **Collection vs run (owner ask).** A *run* is the campaign save. The *collection* is the Museum (`grocery-museum`), awards and shop (site `meta`); it outlives runs on purpose. Every start-over path now goes through `shell/applyReset.ts`. **New game** (Home and Menu → Run) opens `shell/NewGameDialog`: *Keep my collection* or *Start completely fresh* (run + slots + museum + awards + shop). Nothing is pre-selected. `window.confirm` is gone from Home.
- **Sound:** `shared/audio.ts` has a mixer (`setAudioMix`: muted, volume, ambience) fed from `settings.volume` / `settings.ambience` (new, defaulted). Every `Button` with a `cost` plays the purchase cue. Settings has a Sound block. Still silent by default.
- **Notices:** `shell/notices.ts` keeps the last 40 toasts of the visit; Menu → Notices (`NoticesPanel`).
- **Regulars:** Floor → Regulars (`panels/RegularsSheet`), from `depth.regulars.seen`. No new state.
- **Daily:** `dailyTheme(seed)` names the day (flavour only); `streakWeek` drives a Monday–Sunday strip on Home.
- **Buttons:** ghost `Button`s have a hairline edge everywhere. Design rule: no bare clickable words.
- **Motion:** `play.css` `@layer motion` — rooms rise in, secondaries and cards lift, the primary pulses once when it becomes available, tips slide in. Opacity/transform only; all off under reduced motion.
- **Copy (owner ask): write for players, not for the build.** Room purpose lines (`content/menus.ts`), tagline, launch article, hotkey list and shop/wiki/settings text were rewritten. Do not put pacing claims ("about an hour to…"), seeds, slot mechanics, "sim", "HUD", "verb tray", "hub" jargon or version talk in player-facing text. Spell out Attention, Reputation, Tournament.
- **Fixes:** negative-width rects in narrow storefront views; notices hidden behind an open dialog.
- **Tests:** `npm test` 404 passed; e2e 20/20 (`store-name`, `new-game` new).

## Y. 1.0 owner feedback pass — overlays, forms, no shifting, scoped reset (2026-11-16) · SAVE **36** (unchanged)

UI and shell only. No sim or balance changes.

- **Overlays:** `Sheet` and `Modal` render through `createPortal(…, overlayRoot())` (the `.ge-root`, else `body`). Panels animate with a transform, which had pinned "fixed" sheets to the panel and under the HUD. Toasts move left of a side sheet and hide under a bottom sheet.
- **Forms:** `play/Field.tsx` (`Field`, `FieldSet`). Suppliers order is a labelled form (Crates / Aisle / Supplier) built from `SegmentedControl`. `.pf__body` is a flex column with `gap: var(--s-3)`, so panel children are never flush.
- **Kit:** `Stepper` has two 44 px raised buttons and never stretches full width; ghost buttons in a sheet/modal footer get an edge.
- **No shifting (design law 13):** the HUD alert is one element (`.g2-alert--hang`) absolutely placed on the HUD's bottom edge; `.pf__primary` reserves its reason line; `PanelHelp` picks its tip once per room visit, never times out on screen, and files itself on leaving after 8 s on screen.
- **Phone portrait rooms:** Fleet (`TALL` layout in `FleetHarborScene`) and Staff (`StaffFloor` phone branch) join Floor.
- **Reset:** `shell/resetData.ts` (`ResetScope`, `resetMeta`, `normalizeScope`, `describeScope`) + `museumStore.reset()`. Settings → Reset lets the player tick run, save slots, museum, shop and tokens, achievements. Achievements imply shop. Settings are never touched.
- **Storefront banner (P7-01, first half):** `StoreScene` takes `band` (crops the sky, keeps the street; `BAND` slice in the view box). `SceneStrip` now always renders on the Store hub: a 6.75 rem banner by default (5.25 rem on phones, hidden on short landscape), `Expand`/`Shrink` for the full scene. The hub-head "Show storefront" button is gone.
- **Form language (P4-F):** Floor restock aisle and Backroom dump aisle are `Field` + `SegmentedControl`; the Upgrades "Can buy" and Memos "Ready only" filters are labelled switches (`.pf-switch`). No panel uses `Chip` as a picker any more.
- **Tests:** `npm test` 383 passed (`resetData.test.ts`); e2e 17/17 (`reset.spec.ts` new).

## Opening lesson (2026-11-16) · SAVE unchanged · GAME_VERSION **1.0**

- One continuous Era 0 `opening` tour after the intro (Unpack → Baskets look-note → Price → Restock). Legacy unpack/baskets/price/wholesale stay in the Coach catalog; rent and meta-shelf leave the auto-queue.
- Opening strip dialogue no longer auto-queues; finishIntro marks openers seen and starts the tour immediately. SuggestTip stays muted while any coach is active; first-action tips/lines are silenced as each step completes.
- Coach spotlight: measure once then track (no per-tick scroll jump); card docks above VerbTray holes; follows `floor-price-step` / `floor-wholesale-buy` into sheets; z-index above sheet scrim; look steps and missing targets do not full-block the screen. Soft-pause only on `act` steps.
- Tests: `openingLesson.test.ts`, `coachPlacement.test.ts`; docs 09-ui.

## X. 1.0 Phases 1–3 + first hour — one look, every size, one voice (2026-11-16) · SAVE **36** (unchanged) · GAME_VERSION **1.0**

UI only. No sim, balance or save changes; pacing untouched.

- **Type:** game UI CSS uses only `--t-2xs … --t-3xl` (11–48 px). `design/typeScale.test.ts` fails on a raw rem size anywhere, and on raw px outside the five files that style SVG scene text (px there are viewBox units).
- **Buttons:** blocked = same colour family, 6–7% fill, dashed edge, readable ink (`.gk-btn:disabled`, `.is-short`). `VerbTray` secondaries are `tone="secondary"`, 44 px (48 on phones, odd last one spans the row). Primary verb is one row (icon · label · amount), 52 px. Navigation primaries are not yellow (`EmpireBoard` "Open Upgrades →").
- **Rooms:** `RoomScene` has three modes. `wide` (desktop): stage background repeats the sky/floor/ground so wide panels show no bands. `band` (phone default): `RoomChips` (HTML) + a pannable 8.5 rem illustration with scene lettering hidden. `portrait` (phone, opt-in via the `portrait` prop; caller branches on `usePhone()`): Floor is re-laid at 360×346. `StaffFloor` uses the band. **Fleet and Staff portrait layouts are still to do.**
- **Phone chrome:** `shortFigure` (three significant digits, cut not rounded) for HUD cash and baskets; hub title row hidden when tabs exist; storefront toggle is a ghost button in the hub head (`useScenePref`), no full-width bar; `.pf__primary` is `position: sticky; bottom: 0` (the tray is `display: contents` on phones) so the verb is always in thumb reach; toasts and the story line stack above it.
- **Guidance:** Next Goal has one button: `Do it` when ready, `Show me` (opens the room) while saving; the Go link is gone. `PanelHelpButton` (`?`) → `requestWiki(wikiForMenu(menu))` → Menu drawer on that article. `PanelHelp` shows `panelTip(s, menu)` in the panel flow (More / Got it, auto-files after 60 s); `TIP_MENU` in `content/tips.ts` maps tips to rooms. `PlayFrame` no longer renders `department`.
- **Coach:** the card takes the side of the highlight with more room (`.ge-coach--top`).
- **Fixes on the way:** Fleet pocket labels cut to four letters; Museum back-pay toasts; status chips stretched into full-width bars; forced Title Case (`text-transform: capitalize`) on callouts and wrapped segments; tree tier label at 9 px.
- **Crawler** (`audit-2026-11-16/audit.cjs`): parses `color(srgb …)` and inherited opacity, so blocked-button contrast is measured for real.
- **Tests:** `npm test` 378 passed (type scale, `shortFigure`); e2e 16/16 (`help.spec.ts` new; visual baselines refreshed).

## W. 1.0 Phase 0 — stop-ship fixes and owner decisions (2026-11-16) · SAVE **36** (unchanged) · GAME_VERSION **1.0**

UI and tests only. No sim, balance or save changes; pacing untouched. Plan and progress log: [13-release-1.0-plan.md](13-release-1.0-plan.md).

- **Version:** display version is **1.0**. `content/news.ts` holds one launch article; pre-1.0 bulletins were erased on the owner's call. (`40.0`/`40.1` section names below are historical.)
- **Guidance:** floating tip card and the Suggested strip are gone. Next Goal is the single voice; `suggestNext` now only marks tabs. Tips still file themselves in the sim after 20 s.
- **Phone HUD:** fits 360–430 px; one cycling speed button; Coach icon lives in the palette/Menu on phones. Toasts sit bottom-right (desktop) or above the tab bar (phone).
- **Museum:** opens on wing cards (`.mu-wingcard`); a wing's wall renders only when chosen. Escape in `ChestOpener` is capture-phase and stops, so it no longer leaves the Museum. Bulk open guards against Strict Mode's double mount.
- **Land / Strategy / Books:** deed cards, valid DOM for fail reasons, spoiler sign reworded.
- **Tests:** all 14 e2e green; phone visual baseline refreshed. `npm test` 374 passed.

## V. 40.1 — front door, Ops Wiki, Bulletin, one button system (2026-11-16) · SAVE **36** (unchanged) · GAME_VERSION **40.1**

Presentation and shell only. No sim, balance or save changes; pacing untouched.

- **Ops Wiki** (`/guide/grocery-empire/*`): `content/wiki/` — `blocks.ts` (block model + `parseGuideBody`, which turns the plain-text `guide.ts` bodies into headings / steps / checklists / term rows / flows / see-also), `articles.ts` (`WIKI_ARTICLES`, rich rewrites of start-what + start-controls, figure inserts, menus + lesson per article, search), `atlas.ts` (13 eras: focus, door out, departments, pressure), `glossary.ts` (~30 terms), `lessons.ts` (Coach tours grouped by era). UI in `ui/wiki/`: `WikiBrowser` (home, article, topic, search, lessons, atlas, glossary, hubs), `WikiBlocks` (glossary words auto-link on first mention; checklists persist per device), `figures.tsx` (core loop, bottleneck, hub map, era ribbon, Worlds filing), `nav.ts` (URL ⇄ view, `playHref`), `wiki.css` (`@layer panels`). Spoilers still follow `settings.showSpoilers` and the save era.
- **Wiki in play:** Menu drawer tab **Wiki** (`InGameWiki`) renders the same browser; Open buttons call `setActiveMenu`, Play this lesson dispatches `startTutorial`.
- **Deep links:** `/play/grocery-empire?tour=<id>&m=<menu>` starts a Coach lesson once (effect declared *after* the boot reload, or the reload drops it) and the `m` sync strips `tour` from the URL.
- **News:** `NewsPage` is "The Block Bulletin" (`src/shell/news.css`): masthead, band sections, lead story with plate art + byline portrait, *In this edition* highlight cards, bold lead-ins, wiki links, older/newer pager, editions rail + version history. `NewsArticle` gained optional `kicker`, `highlights`, `wiki`, `art`, `by`; `newsArt()` picks a default.
- **Home** (`Shelf.tsx` + `home.css`): storefront stage with the selected game's marquee, Continue/Start (tomato), Today's corner, New game, a run card (era, baskets, rate, played), spines on a board, and a desk of four cards (Bulletin, next lesson, Awards, Shop). Ornament + pack-chrome selectors in `index.css` now also target the new hosts (`.hm-shelf`, `.hm-marquee`, `.hm-shelf__row`, `.hm-title`, `.hm-stage`).
- **Shop** (`ShopPage.tsx` + `shop.css`): wallet, tabs with owned counts, live pack preview (HUD, room, tray in the pack's colours), cards with shelf-tag prices, plain-word moods instead of unlock codes, "N short" buy state.
- **Awards / Settings / Saves:** kit buttons, shared header and tabs.
- **One button system:** `html.shell-ds` carries the same tokens as `.ge-root` (`design/tokens.css` + `src/shell/ds.css`), `main.tsx` imports `layers.css` first, so the kit `Button` and new `LinkButton` render identically on every site page. Legacy `Btn` now renders kit `Button` (`primary` → tomato free verb, `spend` → tag yellow, `paper` → secondary). The global `a { color }` moved into `@layer reset`.
- **Tests:** e2e `guide.spec.ts` (wiki views + lesson deep link), `shelf.spec.ts`, `shop-tabs.spec.ts` updated. `npm test` 374 passed. Seven e2e specs in `live` / `shell-2` / `visual` were already failing on `main` before this work (see 11-backlog).

## U. Grocery Empire 40.0 Phase 12 — prove (2026-11-16) · SAVE **36** · GAME_VERSION **40.0**

- `npm test` 374 passed / 4 skipped; `npm run build` + `npm run lint` green (warnings only).
- `LONG=1` Era 3–6 green. `LONG_HORIZON=1` Era 12 green (~40.10 h seed 1).
- Pack: README snapshot, 11-backlog rewritten for post-40.0, 07-pacing note, 12-expansion marked shipped.
- Browser smoke: Shelf → Play Floor → Hubs/Charter path at 390 + 1280 when dev server available.

## T. Grocery Empire 40.0 Phase 11 — app shell (2026-11-15) · SAVE unchanged

- **Shelf:** `Shelf.tsx` — one primary (Continue with a save, Start without). A glance line under it reads `Era N · rate · age` (rate = `rates.soldPerSec` from the save, same format as the HUD). Today's corner carries a note that it parks the current run in slot 3 (also in its tooltip). Coming-soon spines lose hover lift and tap scale. The Guide/Awards/Shop link row is gone from the shelf (the shell bar already has them); only DevMode remains in dev.
- **News:** `NewsArticle.bands` (`NewsBand`: `e01 | e23 | e46 | e712 | meta`, `NEWS_BANDS`). `/news` opens the newest receipt (40.0) above the list; `/news/:id` opens that one. Band filter tabs (All + five bands) narrow the list only. The list stays the dense two-row grid; the "All bulletins" back link is gone because the list is always on the page.
- **Guide:** new topic **Decisions** (`choices`) with Safe/Bold facing, two regulars + invoice fork, flyer stance, manifest stance, charter fork, endless mutations. Era-gated like everything else (spoilers off hides E12 entries). `sys-depth-eight` and `late-worlds-endless` point to it. Search already indexes title, blurb, body and topic.
- **Awards:** `ShellFrame` primary nav is now Play · News · Guide · Awards · Shop; Awards is removed from the waffle menu (one place, not two). Three decision achievements in `achievements/registry.ts`: `first-bold-facing` (bronze), `first-charter-fork` (gold; Boutique or Co-op), `first-endless-mutation` (gold; `horizon.listMutations ≥ 1`). Tier filter and share card unchanged; test in `registry.test.ts`.
- **Settings / Tools:** both already render `SaveSlots` (Settings modal, and Tools → Saves via `MoreSections`). Export, import and hard reset stay.
- **Tools → Go:** News, Guide, Awards and Shop no longer get full cards; Go keeps Home, Keys and Campaign/Dev, with one quiet `Also:` text row for the four site routes (play has no shell bar, so they must stay reachable). Version chip stays off the HUD; it lives on News (shell bar), More/Go footer and Settings.
- **Tests:** `npm test` and `npm run build` green; e2e `shelf.spec.ts` updated (Start label, Awards in the bar, `/news` opens 40.0, Meta filter).

## S. Grocery Empire 40.0 Phase 9 — content: guests, pads, projects, Ration Board, news (2026-11-15) · SAVE unchanged (content-only)

- **Climate guests:** `content/horizon/guests.ts` — six named guests (Pilar Quenby, Ansel Voss, Orla Finch, Tamsin Rook, Bram Hollis, Ismay Crane) covering all eight climates, eras 7–9, each with an aisle want and a served line. `currentClimateGuest` (horizonVerbs) picks from the visiting climate + `climateServed`; `serveClimateNeighbor` logs the served line and names the guest in the ban warning. PlanetsPanel shows "At the door · name · want". No new aisle, no new state.
- **Verb upgrades (five new nodes, `upgradeEffect`):** `guest-patience` (Pantry E7; `climateBanPullMul` in `formulas.ts`, used by `facingPullMul`, FloorPanel and PlanetsPanel), `bed-lock-pad` (Cultivar E9; `bedLockOpenFrac` / `bedLockOpensIn`, `canPlantCross`, CultivarPanel), `clause-amend-pad` (Signal E11; `amendsPerDocket`), `endless-edit-pad` (Signal E12, after Accept; `endlessMutateEvery`), `mutation-clear-pad` (Signal E12, after Accept; `clearHorizonRival('ration')` strips the `|mut` mark and restores line score). The climate-serve, yield-haul, clause-seat and rehearsal pads already existed. Constants in `DEPTH` / `HORIZON` (`guestPatienceCap`, `bedLockOpenCap`, `mutationClearCap`, `endlessEditMaxExtra`…).
- **Projects:** `pj-guest-awning` (E7), `pj-bed-glass` (E9), `pj-embassy-chair` (E11) — timed builds whose reward is read in sim (`s.projects.done`) as the matching pad's flat bonus; `startProject` unchanged.
- **Ration-week pressure:** `rationBoardBehind` / `rationBoardDemandMul` in `systems/rivals.ts` (folded into `rivalDemandMul`). During ration week, once `DEPTH.rationBoardGraceFrac` of the ledger day passes with no stamp, demand × `DEPTH.rationBoardDemandMul` (0.93) until `stampLedger`; one warn log per day. Stateless (no SAVE). `ledgerDayLength` moved from `fleet.ts` to `rivals.ts`. FleetPanel warn chip. The bot stamps as soon as it can, so pacing is unchanged.
- **Copy:** checklist items (climate guest, season chore, optional amend, endless mutation); era-locked guide sections; News **40.0** article ("What's new in 40.0", Phases 1–9) and `GAME_VERSION` **40.0**.
- **Tests:** `phase9.content.test.ts` (guest cast, patience/awning, bed lock tail, amend cap, mutate cadence, projects start, Board skim). `wired.test.ts` green. Pacing: see 07 (unchanged).

## S′. Grocery Empire 40.0 Phase 8 — loadout: endless bans, carry, wing sockets (2026-11-15) · SAVE **36**

- **Endless mutation bans a loadout piece:** `horizon.endlessBan { kind: 'clause' | 'ventureFork', id } | null`. `mutateEndlessList` (extracted from `launchProbe`, still gated by `endlessMutateEvery(s)`) now also picks one kept clause or one set venture fork (`pickEndlessBan`, deterministic) and `enforceEndlessBan` releases / unsets it (and re-checks every tick for loaded saves). `canToggleClause` / `canSetVenturePolicy` refuse the banned id; toggling another clause / setting another venture's fork lifts it. Probes stay climate copies, harmonic thinning unchanged. `EndlessBanNote` on LastAisle / Planets / Ventures + disabled fork buttons with the reason.
- **Rebrand carry:** `RebrandCarry` (doctrine | facing | null) in `systems/prestige.ts`, `canCarry`, `carryOptions`; `freshRunKeepingMeta` / `rebrand` / `acceptEnding` / `Engine.rebrand` / `acceptEnding { carry? }` take it. Exactly one of doctrine or facing; a doubled or unowned carry is refused or dropped whole. Goodwill is still the cube-root curve; the bot never rebrands.
- **Shared prestige sheet:** `PrestigeKeepSheet` (keep-list, Hungry laws, carry picker) shown through `ConfirmModal`'s new `sheet` slot by EmpireBoard (Rebrand) and FleetPanel (Era 6 Accept, replacing the old copy-only confirm).
- **Museum wing sockets:** `MuseumSave.litWings` / `state.relics.litWings` (null = first `cap` finished wings). A finished wing pays only while lit; at full sockets, lighting one needs another left dark (`lightWing(..., swapOut)`, `setWingSocket` command). Cap is 3, or 5 with `pj-fifth-socket`. `stats.ts` reads `litWingIds`; the stat cache signature includes it. MuseumPanel "Wing sockets" section. Wing sizes untouched (25; Oddities 26). No new relics/feats — deferred.
- **Migrate/tests:** `horizon.endlessBan` and `relics.litWings` explicit copies + junk drops (`migrate.ts`), defaults in `emptyHorizon` / `createInitialState` / `invariants.ts`, `normalizeMuseum` handles `litWings`. `phase8.loadout.test.ts`: mutation bans a clause / a fork and the lift rules, carry is exactly doctrine | facing (Rebrand and Accept), Goodwill curve, bot never rebrands, socket mutual exclusion (museum + command + stats), SAVE 36 pins. Older SAVE pins → 36 / "current". Pacing: unchanged (see 07).

## R. Grocery Empire 40.0 Phase 7 — Signal / Charter / Last Aisle decisions (2026-11-15) · SAVE **35**

- **Posted habit:** credited `fileStandardPhrase` (and a clever `commitPhrase` ≥0.85 with no live watch) calls `startHabitWatch` → `postHabitWatch`, writing `horizon.postedHabit { habit, until, agentId }`. The posted agent is locked (`canSetAgentHabit` / `canFireAgent` refuse), skipped by `tickAgents`, and the watch credits only if they still hold the habit. Unheld posts are claimed by `setAgentHabit` to the posted habit. Fixes the pre-35 bug where the watch read the (already cleared) phrase and always matched. SignalPanel: "Posted" pocket + locked agent row. Bot matches the phrase habit before filing and claims unheld posts.
- **Seated-clause hearing:** `seatingClause` / `seatedClauses` / `heardClauses` / `amendedClauses`. `seatClause` opens Concord's session on the clause it seats (`nextHearingClause`, `openHearingSession` in `horizonCore.ts`); the Concord rival tick no longer picks from a random pool. Minutes Clerk amends one session per docket (grudge struck via `activeGrudges(kept, amended)`, seat kept) instead of deleting the clause. CharterPanel hearing sheet is a session (Clause · Grudge · Minutes Clerk) with one primary.
- **Charter on Next Goal:** `GoalDef.choices` + `GoalChoice`; `charter-signed` offers Standard / Boutique / Co-op with `CHARTERS[id].fork` one-liners (`CHARTER_IDS`). NextGoal renders a three-up fork row (`.g2-goal__forks`). Bot action still signs Standard. Co-op confirm copy fixed (was showing Boutique's).
- **Rehearsal can miss:** `rehearseAccept` tries below 0.85 (always misses) or at it (`HORIZON.rehearsalMissChance` 0.2 − pad, cap 0.08); a miss scratches the weakest filled line (`rehearsalScratch`) and waits `rehearsalRetrySec`. Accept still needs 0.85. LastAislePanel: "Scratch risk N%". Bot and the goal one-click only rehearse at 0.85.
- **Goals 10–12:** "Post the habit", "Seat this clause", "Sign the charter" (forks), "Rehearse the list"; `GoalDef.counts` puts filing counts under the hint (`.g2-goal__counts`).
- **Migrate/tests:** explicit copies + junk drops for all new fields; `phase7.charter.test.ts` (posted habit blocks setAgentHabit/fire, claim, fail; hearing uses the seated clause; amend; charter forks; rehearsal scratch; SAVE 35 pins). SAVE pins → 35 (Phase 6 pin now checks "current"). Pacing: see 07.

## Q. Grocery Empire 40.0 Phase 6 — Worlds trade-offs (2026-11-15) · SAVE **34**

- **Climate guest vs facing:** `serveClimateNeighbor` writes `depth.climateFacingBan { tag, cat, until }` for the strongest featured facing until the next shift-day boundary; `facingPullMul` cuts that category ×0.85 (`DEPTH.climateFacingBanPullMul`) while the facing stays featured. PlanetsPanel (goal room) and the Floor Facing sheet show a warn StatusChip; the serve tooltip names what the guest will ban.
- **Stop personality:** credited standard convoys arm `horizon.pendingStop`; `settleStop` locks it as `circuit.settledKind`. Spoil cuts that circuit's route weight, tariff cuts the freight trickle, delay stretches the next settlement ETA (`HORIZON.stopSpoilCut / stopTariffCut / stopTariffFloor / stopDelayPerCircuit / stopDelayCap`). ExchangePanel: "Settle {kind} stop" + "You live with: …" before Settle, tax on circuit rows.
- **Season bed lock:** `horizon.bedLockedChore` set by `doSeasonChore`, cleared at the season turn; blocks other chores and clever `plantCross` (standard cross still files). CultivarPanel: locked chip + named-chase line.
- **Trays:** Planets secondary "Clever shelf" (reopens the shelf with File the standard), Exchange always offers "File the standard · 0.72" when Settle/Keel owns the primary, Cultivars always lists "File standard cross · 0.72" plus "Clever cross".
- **Goals:** `climate-guest-facing` (Era 7), `settle-stop-tax` (Era 8), `season-chore` → "Lock a season bed" (Era 9); removed hire-only `hire-planogram-clerk` / `hire-stevedore`. Bot reads the chore from Next Goal.
- **Migrate/tests:** explicit copies + junk drops for all new fields; `phase6.worlds.test.ts` (SAVE 34 pins, ban/dodge/expiry, settle taxes, bed lock, goals); SAVE pins → 34. Pacing: see 07.

## P. Grocery Empire 40.0 Phase 5 — stance, two pockets, facings, Accept (2026-11-15) · SAVE **33**

- **Manifest stance:** one filing = ONE of `clean | exam | fast` (`setManifestStance { laneId, stance }`; `setManifest` gains optional `stance`, default `exam`). Clean credits `cleanManifests` at once (own `lastCleanAt` clock); exam opens the exam hold and `swearExam` now credits `examsHeld` **only**; fast pays a cash burst, burns fuel, credits nothing and leaves the lane open so existing MegaMart pressure snipes it. `dispatch` gains `lastCleanAt`, `laneStances`, `fastFiled` (migrate/invariants/emptyDispatch). LogisticsPanel shows three ActionRows per lane with a FailReason under each blocked stance. Goals (`exam-holds`, `clean-manifests`, `launch`) use the stance command. Bot: exam-ready while exams short, else clean; cleans and exams tick separate 70-min clocks so pacing is unchanged (documented in `botsFleet.ts`).
- **Two pockets, one hauler:** `pocketConcurrency` / `openPocketRations` / `pocketsOutrunHauler` in `systems/fleet.ts`; `pocket-concurrent` (Second Berth) is the choice to feed both. FleetPanel lists both open pockets, adds a StatusChip when 2+ rations are open and concurrency is 1, and the dispatch FailReason names Second Berth. Wrong ration still wastes.
- **Era 5–6 facings:** `storefront:7`, `cold:5`, `transit:6` — safe/bold pairs, soft cap 1.35, Civic untouched; `normalizeBuildVariants` re-keys to the def's slot.
- **Accept = Rebrand:** `freshRunKeepingMeta` (shared with `rebrand`) + `replaceStateInPlace`; Accept now wipes store/staff/upgrades/fleet/depth, keeps Empire, museum, Goodwill (banks pending), tutorials/tips and appetite/tipSharpness, then opens the Hungry laws board as before. Engine clears undo on Accept. FleetPanel: Continue / Accept / Reject ActionRows, Accept lists the law options.
- **Tests:** `phase5.stance.test.ts` (SAVE 33 pins, stance mutual exclusion, two pockets, facings, Accept wipe); SAVE pins → 33. Pacing: see 07.

## O. Grocery Empire 40.0 Phase 4 — rival stance & plant cost (2026-11-15) · SAVE **32**

- **Flyer vs rivals:** live flyer band (read from `depth.flyer`, `sim/systems/flyerStance.ts`) — Deep raises Penny lock chance/shortens gap; Soft raises FreshWay spoil mul (even with tunnel + log); Mid neutral (bot). Cold permit still reads completed `flyerWeeks`. Marketing Flyer Desk sheet shows the one-line consequence.
- **Plant power cost:** `depth.blastSuppressesTunnelUntilLog` — set when blast is powered (`setPlantPower` / blast buy), cleared on `signCoolerLog`; suppresses `tunnelFreshAgeMul` meanwhile. ColdPanel FailReason explains it. Bot unchanged (powers blast + tunnel, signs logs); pacing green.
- **Staff policies:** StaffPanel lists every unlocked department's policies with blurbs (not just Fresh).
- **Land hot trait:** callout/line/chip show the live trait and the matching store policies.
- **Migrate/tests:** new flag copied explicitly in `migrate.ts`; `emptyDepth` default; SAVE pins → 32; `phase4.stance.test.ts`.

## M. Grocery Empire 40.0 Phase 3 — concurrency (2026-11-15) · SAVE **31**

- **Two regulars:** `DepthRegulars` gains `waitingId`, `waitingPatienceUntil`, `waitingLayaway`. Second shopper spawns after the visit gap while the primary is unserved; both patiences tick; waiting expiry = star nick (`settleVisit`). Serve targets `activeId`; promotion keeps remaining patience. New command `focusRegular { which: 'active' | 'waiting' }` swaps them. Migrate copies fields explicitly and drops orphan waiting; invariants sanitize.
- **Bot:** `pushRegularsAndDock` switches focus only when the primary is unservable and the waiting shopper is servable. Pacing floors unchanged (Era 1 still >35m ≤55m; pacing suite green).
- **Float vs hire:** Invoice Book shows "Early pay saves X · next clerk costs Y" (`hireCost(s,'clerk')`). Bot invoice logic untouched.
- **Facing sheet:** "{Name} wants {facing} on {cats}" for the primary; "Also waiting: Name · Ns" + "Switch to Name" (tray secondary too below Era 7). `data-coach-id`: `floor-switch-regular`, `floor-regular-want`, `suppliers-float-vs-hire`.
- **Tests:** `regulars.two.test.ts`; SAVE pins → 31.

## N. Grocery Empire 40.0 Phase 2 — QoL (2026-11-15) · SAVE **31** (no bump; Phase 3 bumped)

- Command palette: Coach + query search over upgrades/memos/roles (cap 40).
- Human undo labels + seconds left + “Undid …” toast (`undoAction.ts`).
- Suppliers ×min / ×5 / Fill quantity; unified `SaveSlots` in Settings + Tools; slot 3 labeled for Today’s corner.
- Hidden-tab notifications reuse HUD alert (`hudAlert.ts`); FailReason actions (Suppliers→Build, Cold→log, Floor→Suppliers/Staff).
- Upgrade Best / Buy Best show effect-per-cost clause under the primary.

## L. Grocery Empire 40.0 Phase 1 — one frame + phone (2026-11-15) · SAVE **30**

- LateHubShell / HubStage / ScreenPanel accept `tray`; Money + Worlds + Land/Ventures/Museum/Map on VerbTray.
- Hub head drops purpose paragraph (PlayFrame owns the sentence); Floor/Suppliers/Cold/Logistics use `MENUS.*.purpose`.
- Phone Hubs badges: Empire doctrine-ready, Worlds filing-ready, Museum chests; sheet lists each menu with purpose.
- Worlds icon → `planets`. Subtab overflow fade. Single phone `.g2-dialogue` bottom above hub bar.
- Staff tray owns Shifts/Hire (duplicate ActionRows removed). EmptyStates on Marketing/Rivals/Fleet/Politics/Land.
- FailReason on disabled tray primaries across converted panels.

## K. Grocery Empire 40.0 Phase 0 — foundation (2026-11-15) · SAVE **30**

Refactor-only. Bot landings unchanged (seeds 1/42 identical over 40k sim-sec compare).

- **Bots split:** `botsShared` / `botsEarly` / `botsChain` / `botsFleet` / `botsWorlds`; `bots.ts` composes `campaignCommands` + `runPacing`. Shared early helpers kill attentive/campaign facing/regular/dock/shift duplication.
- **Horizon split:** `horizonCore` (ensure/practice/hearing), `horizonVerbs` (climate/settle/haul/seat/rehearse), `horizonTick` (agents/seasons/phrases/keel/headlines/trickles/wages). `horizon.ts` stays the puzzle + `maybeOpenEras` coordinator and re-exports public APIs.
- **tipSharpness** now reads: checkout ×(1+min(3,tip)×0.05); star regen ×(1+min(3,tip)×0.1).
- **LATE_MEMOS** dead import/`void` removed from `memos.ts` (`lateEras.ts` still exports ENDING_BEATS / CHARTER).
- **migrateSlice** helper in `migrate.ts`; prestigeCarry uses it.
- Pace debug already `describe.runIf(PACE_DEBUG)`.

## J. Grocery Empire 4.0 real (2026-11-15) — GAME_VERSION **4.0** · SAVE **30**

First 4.0 pass was sim tokens + skins; rebuild shipped as:

- **Fix0 Next Goal HUD:** free goals use tomato CTA (no `.g2-tag` punch-hole); paid keep yellow tag; stars off title flex on phone; compact alert on its own HUD row.
- **Wave A Strategy:** full doctrine ladder as ActionRows; RankHall-quality `StrategyHallScene`; FailReasons navigate Att→Memos / Read bank.
- **Wave B Build:** facings across eras 1–4 (slot keys); soft-cap **1.35**; living track room + first-class facing beat; Books upkeep chip; museum FEAT `facing`.
- **Wave C panels:** Fleet harbor, Empire rank ring, Planets sticky wants, Memos desk (filters simplified), Upgrades PlayFrame + Upgrade Best; Marketing Celebrity in sheet; Staff hire primary + annex rows; `buyMemoSweep` **effect/cost then cheapest**.
- **Wave D shell:** denser News; calm Settings column; version chip only News/More/Settings; cross-links Strategy↔Memos, Build→Suppliers, Fleet→Strategy, Cold brownout FailReason; dead `.fl-dock` / `.ge-floor` cut.
- **Sim knobs kept:** tournament cooldown 600s, doctrineGrowth 1.65, depot 12 / Autonomous 48 Read, `bank-read`, SAVE 30 migrate.

## I. Feel overhaul (2026-11-14) — GAME_VERSION **3.0** · SAVE **29**

- Cascade unlock: `grocery.css` + `g2.css` imported `@layer legacy` (lowest). Titles/purpose visible again.
- `ui/play/PlayFrame` + VerbTray / ActionRow / StatusChip / FailReason / SheetStagger / EraSign. Button default `ghost`. HubStage → PlayFrame wrapper.
- Floor / Backroom / Build / Suppliers / Cold / Logistics / Staff / Marketing on real trays. ScreenPanel + LateHubShell + HubStage wrap PlayFrame for remaining hubs.
- Phone bar keeps Money; Empire/Worlds/Museum behind **Hubs**. HUD drops duplicate alert; SuggestTip hides when it matches Next Goal.
- Sim decisions: HH/PL facings; Close/Mid shifts; Chain Patrol/Push; dock aisle/short; climate shelf pull; habit watch fail; **setPlantPower** (2 of 3); flyer soft/mid/deep (+ deep spoil); logistics/survey policy readers; ~40 regulars; bot prints mid flyers + powers blast+tunnel.
- Motion: ShelfFill / CrateHop / Pressable; scene tokens; map spin removed; brownout respects `html.ge-reduced-motion`. News receipt for 3.0.

## H. Shell chrome + News receipt (2026-11-14)

- Shared `ShellFrame`: brand + Play/News/Guide/Shop + version chip + waffle; overlays wood Shelf; wraps News/Guide/Shop/Awards. Orphan `shell-subpage__nav` strips removed.
- News redesigned as warm paper bulletin (not dashboard cards). Shelf detail: title → CTAs → single What’s new receipt → quiet stats/links. Wood cards kept.

## G. Customer-ready sweep (2026-11-14)

- Tutorial calm: mute SuggestTip/toasts during coach; queue cap 3; 10s calm; Era 2 / Worlds one opener; coachId audit test; short Era 0–1 copy; missing-target escape.
- Shelf homepage wood + game cards restored; DevMode gated to `import.meta.env.DEV`.
- Living news desk: `GAME_VERSION` **2.0**, `/news`, More + Hud chip. `SAVE_VERSION` **27** (`tutorials.calmUntil`).
- Staff hire sheet; Staff/Cold/Dock night punch.

## F. Density / After Hours lock-in (2026-11-14)

User rejected progression-only work as not the overhaul. Shipped:

- Floor = room + one tomato primary (Serve/Unpack) + Facing/Price/Restock/Bay sheets; meter stacks gone.
- `ButtonTone` **`free`** (tomato) vs **`primary`** (tag yellow spends).
- Night case tokens (`--ge-bg` `#0e1218`, tomato accent); FloorRoom unload bay tomato-lit.
- HelpCards stripped from remaining panels; Books alerts + “the tape” killed.
- Free verbs promoted: Swear / Settle / Seat / Stamp / Sign log / Dock check-in / Dispatch.
- Marketing / Suppliers / Cold / Build cut off Card stacks; one primary line each.
- Still open: Staff role-card grid + SVG room art punch beyond Floor (see backlog).

## E. 2.0 expansion megaplan (2026-11-14)

**Plan:** lengthen Last Aisle to 40–50 h via one hard-gated verb per era + After Hours UI usefulness (no new hub).

| Phase | Verbs / work | SAVE | CI |
| --- | --- | --- | --- |
| 0 | Remeasure, Empire/Worlds 390px, invoice sheet, kill competing HelpCards, delete DepartmentBands | 21 | no raise |
| 1 | Layaway slip + dock check-in | 22 | Era1 35–55m |
| 2 | Band lock + hot-trait walks | 23 | Era2 3.5–5h; Era3 8–11h |
| 3 | Exam hold + berth turnaround + ration ledger | 24→26 | Era4–6 plan windows |
| 4 | Climate neighbor + stop settlement + yield haul | 26 | LONG_HORIZON spot-check |
| 5 | Habit watch + clause seating + accept rehearsal | 26 | Era12 >40≤50h |
| 6 | Remeasure table, pack + 2.0-plan decision log, 390 audit | 26 | docs |

Measured seed 1 after Phase 3 stretch: Era3 ~8.57h · Era4 ~13.21h · Era5 ~17.88h · Era6 ~23.54h.

## A. Era depth overhaul

**Plan:** era depth / balance expansion across all eras.  
**Outcome:** departments, facings, contracts, place traits, typed plants, named bills, barge classes / pockets (v1), puzzle bars 0.72/0.85, many new roles, aisles (deli/bakery/frozen/import/ration), late hub polish, payroll past Era 3, old-layer caps, checklist through 12.

**Problem left:** bot still cleared doors as **checkboxes** → Era 1 ~9–15 min, Era 2 ~75–80 min, Era 3 ~2.3 h. CI floors were set to *measured* landings, not plan targets.

Phases (depth): framework → chain/cold → globe/barges → worlds → pass. See also `docs/2.0-plan.md` decision log 2026-11-11/12.

## B. Pacing stretch megaplan

**Plan:** hit real CI windows by adding sustained loops + eight systems; do not lower asserts.

| Phase | What shipped | SAVE | Measured milestone |
| --- | --- | --- | --- |
| 1 Early spine | Regulars, Shift Board v1, invoices, flagship planogram, 3× bells, early demand, hard side-yard | 17 | Era1 ~26m, Era2 ~2.65h |
| 2 Chain craft | Flyer Desk, star gates, matched-store cold permit, block events, Penny counter-flyer | 18 | Era3 ~6.30h |
| 3 Cold/Globe | Cooler Log, Dispatch Board, leave/barge hard gates | 19 | Era4 ~10.94h, Era5 ~14.64h |
| 4 Fleet/Ration | Pocket Ops ETAs, Orbit Mid, ration week star freeze | 20 | Era6 ~19.11h |
| 5 Worlds | Practice filings, desk gap, season chores, hearing docket | 21 | Era12 ~32.21h |
| 6 Polish | Checklist/lore/guide, HUD stars, 390px sheets, fix practice/trip bypasses | 21 | Docs synced |

### Post-polish hotfix

- Seed 1 Era 2 at **8992 s** (8 s under 2.5 h).  
- Fix: `DEPTH.openDaysNeedSideYard` **3 → 4**. Default pacing green again.

## C. What “done” means right now

- Plan pacing windows are **CI**, not aspirational.
- Depth content + stretch loops are in the sim and bot.
- Docs pack (`docs/grocery-empire/`) exists for agent handoff.

## D. UI density overhaul (2026-11-14)

No `SAVE_VERSION` bump — layout and teaching only.

- **Shell:** hub-aware `ScreenHeader` (stats only inside a hub), one-line Suggested next that defers to Next Goal, clause-level Next Goal hint, 390px speed/Undo, Sheet focus trap, reduced-motion scroll on Hits.
- **Store:** Floor phone Unpack dock only; facing/regulars/planogram in one sheet; Backroom hides empty Incoming; Build drops status band.
- **Supply / Team:** one supplier order and one hire row; cooler/routes/dispatch/franchises/shifts/flyers/rivals/venture bulk in Sheets; no empty truck/loyalty/curb cards; department bands removed.
- **Money / Empire / Worlds / Museum:** bands removed; Books four stats + Cashflow/History tabs; Charter progress `n/4`; Worlds `primary` is goal strip only; Museum gallery height capped.
- **Teaching:** stretch coach tours for regulars, shifts, invoices, planogram, flyers, cooler, dispatch, pockets, hearing; stuck-doctor prefers the current Next Goal verb.

## E. Phase 0 shell UI (started 2026-11-14)

No `SAVE_VERSION` bump. Baseline remeasure (seeds 1 and 42) was not run.

- Worlds panels and Upgrades use `ScreenHeader hub`. Museum keeps the gallery and drops the competing hero title.
- Charter goal **Open fork** scrolls to Standard / Boutique / Co-op. It does not sign Standard.
- Invoice book is a one-line status plus a Sheet. HelpCards that restated Next Goal are gone from Floor, Staff, Suppliers, Charter, Cold, Logistics, and Marketing.
- Empire rank line no longer repeats the header Stat. Doctrine board collapses once two doctrines are owned. Autonomous stays one line until release can succeed.
- Deleted unused `DepartmentBands` and `StatusBand`.

## G. 40.0 Phase 10 visual system (2026-11-15)

No `SAVE_VERSION` bump. Presentation only.

- **Shell layer:** HUD, stats, Next Goal bar, hubs, hub head, menu drawer / inbox and command palette moved from `g2.css` into `shell.css` under `@layer shell` (about 1,000 lines). Overlapping legacy and old shell rules were merged (the old shell overrides won in practice, so the dead legacy duplicates and the 1180px HUD block were dropped). Phone inbox label is now visually hidden instead of `display: none`.
- **Rooms:** `UpgradesHallScene`, `EarlyLandStreet`, map sky/ground on `--sc-night-*` (Rank and Strategy Hall share them).
- **Beats:** `useBeat` + `Beat` (fx), second regular arrival (Floor), manifest stance tick (Logistics), bed lock thunk + `ShelfFill` meter (Cultivar), `Seated n/3` meter + `CrateHop` (Charter).
- **Shop:** ledger skin on the Books room, unpack FX on the Floor room, ornaments on the Fleet harbor; `useMetaOptional` so scenes render without a provider.
- Verified: `npm test`, `npm run build`, `npm run lint` (no new warnings). Not browser-checked at 390px or in DevTools from this run.

## F. Related plans (Cursor)

Do not treat as live truth — this pack + code win:

- Era depth overhaul plan (prior)
- Pacing stretch megaplan (prior)

Update **this file** when you finish a phase or change SAVE_VERSION / measured times.

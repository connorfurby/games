# Grocery Empire 1.0 — release plan

**Goal:** a version players can start on any screen, understand in the first ten minutes, and love for forty hours. No new eras; the work is clarity, polish, comfort, feel and a handful of features that make the long game rewarding to live in.

**Status:** plan written 2026-11-16 from a full audit (below). Work happens on branch `release-1.0` (stacked on `shell-refresh` / PR #2). Tick items here as they land; move finished phases into [10-changelog-chat.md](10-changelog-chat.md).

**Read first:** [00-agent-protocol.md](00-agent-protocol.md), [09-ui.md](09-ui.md), [07-pacing.md](07-pacing.md). Every sim rule in `CLAUDE.md` still applies; nothing in this plan may lower a pacing floor.

### Progress log

| Date | Done | Notes |
| --- | --- | --- |
| 2026-11-16 | Plan + audit · **P0-01** phone HUD (no overlap at 360/390/430; speed is one cycling button on phones, Coach icon moves to palette/Menu) · **P0-02** suggestion strip uses kit buttons · **P0-03** Land deed cards (owned deeds no longer bare text; readable prices) · **P0-04** Strategy invalid DOM (0 console errors) · **P0-05/06** toasts sit bottom-right (desktop) / above the tab bar (phone), never over the HUD; tip card 13 px, 2-line clamp on phones, page pads for it · **P0-07** active hub tab scrolls into view · **P0-08** not a bug (hover) · **P0-12** Books spoiler sign | Decisions 1, 3, 4 applied (1.0 + fresh news, tip card and Suggested strip removed). Remaining P0 then: 09, 10/11, crawler rerun. |
| 2026-11-16 | **P0-09** Museum opens on wing cards, one wing's wall at a time (phone 23k → 2.5k px, desktop 10k → 1.5k) · **P0-10/11** all 14 e2e green (selectors updated to the room scenes, intro skipped in the live spec, phone baseline refreshed) · found and fixed on the way: Escape in the chest reveal also left the Museum; bulk reward sheet came up blank in dev (Strict Mode double mount) | — |
| 2026-11-16 | **P0 closed.** Crawler rerun, 244 screens (Eras 0–7, 1440 and 390): 0 console errors (was 4 on Strategy), 0 horizontal overflow, tallest page 3.2k px (Land, phone; was 23.5k Museum). | Next: P1 design system (type scale, raw button classes, disabled-primary colour), then P2 phone rooms. |

---

## 0. What "1.0" means — the release gates

1.0 ships when every gate below is green. Each phase lists which gates it serves.

| # | Gate | How we check it |
| --- | --- | --- |
| G1 | **No stop-ship bugs.** No console errors, no overlapping HUD, no invisible text, no dead buttons on any screen. | Audit crawler (`audit-2026-11-16/audit.cjs`) reports 0 errors, 0 overlaps, 0 contrast < 3:1 on game text. |
| G2 | **Every screen size works.** 360, 390, 430 (phones), 768 (tablet portrait), 1024, 1280, 1440, 1920 (desktop), and phone landscape (844×390). | Crawler matrix + one human pass per size. No horizontal scroll; all primary verbs reachable without scrolling the page. |
| G3 | **One visual language.** One type scale, one spacing scale, one button system, one card, one chip, one empty state, one disabled look. | ≤ 8 font sizes per screen (today 14–22). Zero raw styled `<button>` outside the kit (today ~25 classes). |
| G4 | **One voice of guidance.** The player always knows the next step, and is never told it three ways at once. | Next Goal is the spine; tips/suggestions/toasts/alerts follow the guidance rules in §3. |
| G5 | **First hour is lovable.** A new player reaches the corner store (Era 1) without reading the wiki and without a "what now?" moment. | 5 fresh human playtests; bot Era 1 still 35–55 min. |
| G6 | **Comfort.** Accessibility (contrast, focus, keyboard, screen reader labels, reduced motion), offline return, save safety, settings that matter. | Checklist in Phase 8. |
| G7 | **Fast.** First load < 2.5 s on a mid phone (4G), 60 fps in rooms, no jank opening drawers. | Bundle ≤ 600 kB initial JS (today 2.2 MB single chunk), Lighthouse perf ≥ 85 mobile. |
| G8 | **Green CI.** `npm run build`, `npm test`, `npm run lint` (0 new warnings), full e2e (today 7 stale failures), `LONG=1`, `LONG_HORIZON=1`. | CI. |
| G9 | **Shipped story.** Version 1.0 bulletin, wiki current, docs pack current, changelog. | Review. |

---

## 1. Audit — what we found

**Method.** A Playwright crawler loaded every dev stage (Era 0 → Era 7), jumped to every unlocked department through the command palette, screenshotted it at **1440×900** and **390×844**, and measured: horizontal overflow, tap targets < 28 px, text contrast < 3:1, text < 11 px, clipped text, raw (non-kit) buttons, distinct font sizes, page height and console errors. 242 screens. Evidence: `audit-2026-11-16/` (contact sheets + `crawl-*.txt`). Rerun after each phase:

```bash
# dev server on :5200, then
node docs/grocery-empire/audit-2026-11-16/audit.cjs 1440 900 desk
node docs/grocery-empire/audit-2026-11-16/audit.cjs 390 844 phone
python3 docs/grocery-empire/audit-2026-11-16/analyze.py desk   # (paths inside the scripts point at /home/claude/audit — adjust)
```

### 1.1 Numbers

| Measure | Desktop | Phone | Target |
| --- | --- | --- | --- |
| Screens crawled | 121 | 121 | — |
| Console errors | Strategy: `<p>` inside `<p>`, `<div>` inside `<p>` (4) | same | 0 |
| Distinct font sizes per screen | 14–22 (avg 18) | 12–21 (avg 16.5) | ≤ 8 |
| Text under 11 px on every screen | tip card (9.3–9.9 px), hub badges (10.6 px), devbar | Next Goal "Go" (10.9 px), devbar | none under 11 px in play |
| Tap targets under 28 px on every screen | tip buttons, Next Goal "Go", HUD alert, sliders | same + SVG hit groups | ≥ 32 px (44 px on phone for primaries) |
| Invisible text (contrast 1.0) | Land deed prices `$5.00K` / `$6.00K` | same | none |
| Low-contrast toasts | — | 4 toast variants | ≥ 4.5:1 |
| Museum page height | ~10,000 px | ~23,500 px | ≤ 3 screens; paginate / virtualize |
| Raw button classes outside the kit | ~25 (`g2-hub`, `g2-subtab`, `g2-goal__do/go`, `g2-alert`, `pf-row`, `ge-suggest-tip__btn`, `bd-facing__card`, `ld-lot`, `mu-*`, `p6-choice`, `(none)`…) | same | kit only (Button, IconButton, Seg, Chip, Card-as-button) |
| JS bundle | 2.21 MB single chunk · CSS 390 kB | — | ≤ 600 kB initial, routes + eras split |
| Legacy CSS | `grocery.css` 6,974 lines + `g2.css` 3,922 lines | — | < 3,000 combined |
| Hex colours in TSX | 1,020 · inline `style={{}}` 132 | — | scenes only; panels use tokens |
| e2e | 7 specs fail on `main` (stale selectors / changed boot) | — | 0 |

### 1.2 What a player sees (by eye, from the contact sheets)

**Phone (390 px) — the worst of it**
1. **HUD collides with itself.** Cash truncates to `$2.8…` / `$1.0…`; the Baskets value (`3.87K`, `400.00K`) prints *on top of* the pause/speed buttons. The single most visible bug in the game.
2. **Chrome eats the screen.** Devbar + HUD + Next Goal card + HUD alert + hub head + subtabs + "Suggested" strip ≈ 45% of an 844 px phone before any department content. Then the tip card covers another ~20% at the bottom, above the tab bar.
3. **Rooms shrink to thumbnails.** Each RoomScene (~960×300) scales down to ~360×110 on a phone; its labels become 4–5 px and unreadable. The room is the department's main picture, and on phones it is decoration.
4. **"Suggested" strip buttons overlap.** `SHOW` / `BUY` render as a squashed red/grey blob over the memo name.
5. **Subtabs clip** (Empire: the fifth tab is cut, no affordance that it scrolls).
6. **Toasts** ("37 chests are waiting…", "3 Oddities found…") stack over the HUD and the Next Goal card, low contrast.

**Desktop (1440 px)**
7. **Three names for one screen.** "Store / Floor" (hub head) → "Floor" (active subtab) → "FLOOR" (eyebrow) → purpose sentence. Pick one title + one sentence.
8. **Rooms are letterboxed.** A fixed ~1000 px stage sits centered with dark empty bands; many rooms are mostly empty floor (Invest "Trading floor quiet", Logistics "Dry dock", Ventures "No tills open", Books with a lone figure).
9. **Secondary verbs look like text.** Under every verb tray: "Facing · Price · Restock", "Queue · Sell last · Upkeep", "Open store 2 · Walk all drifting · Depot · Even out Attention" — no button affordance, no hover, inconsistent with the kit.
10. **Disabled primaries look broken.** Olive bars with dim yellow text (Buy The Lot, Launch hauler, Hire Cashier, Run tournament, Seat a delegate) — low contrast, reads as "loading" not "not yet"; the reason is a small orange line under it.
11. **Two guidance strips + a tip card + toasts** on the same screen as the Next Goal (see §3).
12. **Number/label noise.** Room HUD chips repeat what the stat row under the tray already says (Books: Net/Sales/Burn/Side in the room *and* CASH/NET/BURN chips below). Abbreviations: "Tourny", "Att", "PC", "Keel —". Title-cased sentences ("Shoppers Are The Limit — Ads, Price, Or Another Door.").
13. **Broken layouts.** Land → Expansions: "The Lot" card renders, "Side Yard" and "Filed" float as bare text; "FILED 1" full-width bar with no meaning. Strategy: "Jump to Memos / Att · Ready / now" reads as debug text; big empty right half.
14. **Spoilers in chrome.** Books shows "Horizon opens Era 7" in Era 2.
15. **Next Goal card has two CTAs** ("Go" link + "Do it" button) with different meanings and a 10.9 px "Go".
16. **Hub subtab hover/active ambiguity** — Upgrades appears highlighted while Land is active (two filled tabs).
17. **Museum**: 500 tiles in one scroll; chest row and relic wall fight for attention; filters are 22 seg buttons.
18. **Era 7 floor** still shows Era 0 numbers ($1.50 price, 39/90 shelf) next to $1.00Qi cash — the flagship scale reads as a bug to a player even when it is the design (needs framing: "Flagship · Worlds feed off its sales ×N").

**Code health**
19. Two legacy stylesheets still lead (`grocery.css`, `g2.css`) under the layered system; 132 inline styles; 1,020 hex literals in TSX (mostly scenes, but many panels).
20. z-index values scattered (0–999) despite `--z-*` tokens.
21. 36 panels; `MemosPanel` 1,018 lines, several 500–600 line panels — hard to keep consistent.

---

## 2. Design laws for 1.0 (apply to every task)

1. **One title, one sentence.** Hub head shows `Hub · Department`; the PlayFrame shows the purpose sentence. No eyebrow repeating the department name.
2. **One home per number.** A value lives in the RoomHud *or* the tray chips *or* the HUD — never two.
3. **One guidance channel.** Next Goal says what to do. Everything else is either a *reason* (FailReason under a blocked verb), a *notice* (inbox), or *help* (wiki/tooltips). See §3.
4. **Buttons are the kit.** `Button` / `IconButton` / `SegmentedControl` / `Chip` / `Card asButton`. Tones: tomato = the free verb, tag yellow = spend, secondary = open/equip/navigate-with-weight, ghost = dismiss/back, danger = destroy. A blocked button keeps its shape and colour family at 45% with the reason **inside** a tooltip *and* one line under it.
5. **Type scale (8 steps):** 11 · 12 · 13 · 15 · 18 · 24 · 32 · 48. Nothing under 11 px in play. Numbers use tabular mono at 13/15/18.
6. **Spacing scale:** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40. Panels pad 16 (phone 12). Gaps between sections 24.
7. **Contrast:** body text ≥ 4.5:1, large text/icons ≥ 3:1, disabled text ≥ 3:1 (yes, disabled too).
8. **Tap targets:** ≥ 44 px for primaries on phone, ≥ 32 px everything else.
9. **Rooms earn their space.** On phones a room is either legible (≥ 11 px labels) or replaced by its RoomHud chips + one illustration strip. Never a 110 px thumbnail of a desktop scene.
10. **Nothing empty.** Empty rooms show what will fill them and the verb that starts it.
11. **Spoiler-safe chrome.** No era > current mentioned outside the wiki with spoilers on.
12. **Numbers read as words where it helps.** "Cash $2.84K · +$17/s" not "+$17.34/s" mid-HUD on phones; full precision in tooltips/Books.

---

## 3. Guidance model (the clarity backbone)

Today a single screen can show: Next Goal card (+ Go + Do it), HUD alert pill, "Suggested · memo" strip (Show/Buy), tip card (Got it), ambient toasts, Coach spotlight, FailReason lines, and dialogue. 1.0 collapses this to **four channels with strict jobs**:

| Channel | Job | Where | Rules |
| --- | --- | --- | --- |
| **Next Goal** | The one next step toward the door | HUD centre (desktop) / under HUD (phone) | One CTA: **Do it** (does the verb or navigates + spotlights). Progress bar + star chip. Never duplicated elsewhere. |
| **Reason** | Why *this* button is blocked | One line under the blocked verb + tooltip | Links to the room that unblocks it ("Need 120 Att → Memos"). |
| **Notice** | Something happened you may care about | Inbox (Memos drawer → *Notices* tab) + a quiet badge; a toast only for rewards and urgent risk | Max 1 toast visible; never over HUD; auto-collapse into inbox after 4 s. Chest/relic counts go to the Museum badge, not toasts. |
| **Help** | Teach | Coach lessons (opt-in after FTUE), wiki links (`?` on each panel head), tooltips | Tips become *wiki cards* shown once per topic in the panel's empty space, not a floating card. |

Remove: the "Suggested" strip (merge its logic into Next Goal ranking and the Memos drawer "Ready" filter), the floating tip card, the HUD alert pill duplicates (keep one HUD alert slot that opens the room).

---

## 4. Phases

Sizes: **S** ≤ ½ day, **M** 1–2 days, **L** 3–5 days (agent-days). Each task has an ID for commits (`1.0/P0-03`).

### Phase 0 — Stop-ship bugs (G1, G2) · ~2 days

| ID | Task | Size | Done when |
| --- | --- | --- | --- |
| P0-01 | **Phone HUD**: rebuild `ui/shell/Hud.tsx` phone row — cash + rate left, baskets right on one line, transport + memos + menu on a second compact row; no overlap at 360/390/430. | M | Crawler: no element overlap in `.g2-hud`; manual check at 360. |
| P0-02 | **Suggested strip buttons** overlap — fix immediately (then removed in P3-02). | S | No overlap at 390. |
| P0-03 | **Land deed prices invisible** (`$5.00K` contrast 1.0) and Expansions row half-rendered ("Side Yard / Filed"). | S | Contrast ≥ 4.5; three deed cards render the same. |
| P0-04 | **Strategy invalid DOM** (`<p>` in `<p>`, `<div>` in `<p>`) — console errors. | S | 0 console errors on every screen. |
| P0-05 | **Tip card** covers content on every screen (9–10 px text, 22 px buttons). Move into flow (panel bottom) on phone; min 12 px / 32 px buttons. | S | Never overlaps tray or tab bar. |
| P0-06 | **Toasts** over HUD/Next Goal on phone; low contrast. Anchor above the tab bar, max 1, ≥ 4.5:1. | S | — |
| P0-07 | **Subtab overflow** (Empire 5 tabs at 390): scroll with fade edge + active tab scrolled into view. | S | — |
| P0-08 | **Double-highlighted subtab** (hover style persists / two filled). | S | Exactly one active tab. |
| P0-09 | **Museum 23k px page**: paginate wall by wing (one wing at a time + wing picker), lazy-render tiles. | M | Page ≤ 3 screens; scroll 60 fps. |
| P0-10 | **Repair 7 stale e2e specs** (`live`, `shell-2`, `visual`) to the 40.0 shell; they guard everything after. | M | Full e2e green. |
| P0-11 | `live.spec`: till did not tick after reload in a fresh run — confirm it's the intro soft-pause, not a real freeze; if real, fix. | S | Spec green with a real assertion. |
| P0-12 | Spoiler leaks in chrome ("Horizon opens Era 7" in Books, Worlds annex in early staff). | S | No era > current named outside the wiki. |

### Phase 1 — Design-system completion (G3) · ~4 days

| ID | Task | Size |
| --- | --- | --- |
| P1-01 | **Type tokens**: lock the 8-step scale in `tokens.css`; codemod `font-size:` in panels/scenes CSS to tokens; lint rule (stylelint or a test) that fails on raw px font sizes outside scenes. | M |
| P1-02 | **Spacing tokens** in panels; remove ad-hoc rem/px paddings. Panel = 16/12, section gap 24. | M |
| P1-03 | **Disabled state** redesign for all tones (shape kept, 45% fill, ≥ 3:1 text, lock glyph optional) + `Button reason` prop rendering the FailReason line. | S |
| P1-04 | **Secondary verbs**: `VerbTray` secondaries become `Button tone="secondary" size="sm"` with icon + cost; same row height everywhere. | S |
| P1-05 | **Kit coverage**: replace the ~25 raw button classes (`g2-hub`, `g2-subtab`, `g2-goal__*`, `g2-alert`, `pf-row`, `pf-chip__link`, `bd-facing__card`, `ld-lot`, `p6-choice`, `mu-*`, `st-node`…) with kit primitives or documented kit variants (`Card asButton`, `Tabs`, `HubButton`). Test: crawler raw-button count = 0 outside scenes. | L |
| P1-06 | **Chips & badges**: one `Chip` (tones: neutral, good, warn, bad, info) + one `Badge` (count). Remove `ge-chip`, `sd-chip` duplicates in play. | S |
| P1-07 | **Card**: one card (surface, border, radius 12, pad 16) with header/body/footer slots; migrate panel cards. | M |
| P1-08 | **Empty state**: kit `EmptyState` with illustration slot + verb; use in every empty room. | S |
| P1-09 | **z-index**: replace literals with `--z-*`; one overlay stack (scrim < drawer < sheet < modal < toast < coach). | S |
| P1-10 | **Legacy CSS cut**: delete unused selectors from `grocery.css` / `g2.css` (coverage via crawler: collect used classes per screen, diff against selectors). Target < 3k lines combined. | L |
| P1-11 | **Colour roles in panels**: replace hex in panel TSX with tokens (scenes may keep palettes but via `--sc-*`). | M |
| P1-12 | Kit gallery page (`KitGallery.tsx`) updated as the living spec; screenshot test of it. | S |

### Phase 2 — Every screen size (G2) · ~5 days

| ID | Task | Size |
| --- | --- | --- |
| P2-01 | **Breakpoint matrix** in tokens + docs: `phone ≤ 480`, `phablet 481–720`, `tablet 721–1023`, `desktop 1024–1439`, `wide ≥ 1440`, plus `landscape-phone (max-height: 500px)`. | S |
| P2-02 | **Chrome budget on phone**: HUD ≤ 64 px, Next Goal ≤ 56 px (collapsible to a chip), hub head + subtabs ≤ 48 px. Department content starts ≤ 180 px from top. Devbar collapses to an icon in DevMode. | M |
| P2-03 | **Rooms on phone**: `RoomScene` gets a `compact` mode — either a re-laid portrait composition (stacked stations, larger labels) or HUD chips + a 120 px illustration band. Pick per room; no text under 11 px. | L |
| P2-04 | **Rooms on wide screens**: stage fills the panel width (no letterbox bands); scene art extends (floor tiles, wall) instead of black bars. | M |
| P2-05 | **Tablet layout** (768–1023): hub rail as icons, panels two-column where they have side content (Strategy, Books, Map). | M |
| P2-06 | **Landscape phone**: HUD + tab bar slim; Next Goal as chip; room hidden by default with a toggle. | M |
| P2-07 | **1920+**: max content width 1440 with side gutters; Memos drawer can pin open as a side column. | S |
| P2-08 | **Drawers & sheets**: Memos and Menu drawers become bottom sheets on phone with drag handle and snap points (½ / full). | M |
| P2-09 | **Safe areas**: `env(safe-area-inset-*)` on HUD and tab bar (iOS notch / home indicator). | S |
| P2-10 | Crawler matrix in CI (nightly): 360, 390, 768, 1280, 1920, 844×390 × all stages. | M |

### Phase 3 — Guidance & clarity (G4, G5) · ~4 days

| ID | Task | Size |
| --- | --- | --- |
| P3-01 | Next Goal: single **Do it** CTA (navigate + spotlight + optionally act); "Go" link removed; phone collapsible. | S |
| P3-02 | Remove the **Suggested strip**; feed its ranking into Next Goal tie-breaks and a *Ready* badge on the Memos button. | M |
| P3-03 | **Notices inbox**: Memos drawer gets *Notices* (relic found, chest ready, rival move, era opened…). Toast only for rewards and risks; museum counts move to the Museum badge. | M |
| P3-04 | **Tips → panel help cards**: one dismissible card in the panel's own flow, linked to the wiki article (`requestWiki(id)`), shown once per topic. Floating tip card deleted. | M |
| P3-05 | **`?` on every panel head** opens the matching wiki article in the Menu drawer (wire `MENUS[id].wiki`). | S |
| P3-06 | **One title rule**: drop the eyebrow; hub head `Hub · Department`; purpose sentence once. | S |
| P3-07 | **Copy pass**: sentence case everywhere; no unexplained abbreviations ("Tourny" → Tournament, "Att" → Attention in labels, keep "Att" only in costs); every stat has a tooltip with formula + where it comes from. | M |
| P3-08 | **Blocked verbs** always show reason + link to the unblocking room (extend `FailReason`). Audit every `can()` reason string for plain language. | M |
| P3-09 | **Number formatting**: one helper per context (HUD short, tray medium, Books full); rates as `/s` or `/min` by magnitude; never `0.00/s` — show "idle". | S |
| P3-10 | **Late-game scale framing**: flagship panels in Era 4+ show "Your flagship · the network copies ×N" so small store numbers next to Qi cash read as intended. | S |
| P3-11 | **Era transitions**: chapter card lists what just opened (departments, verbs) with "Show me" buttons; Next Goal points at the first new verb. | M |

### Phase 4 — Per-screen pass (G1–G4) · ~8 days

Every department gets the same checklist: one title + sentence · room legible at 390 and filling at 1440 · RoomHud chips not duplicated · primary verb + ≤ 4 secondaries as kit buttons · blocked reasons · empty state · wiki `?` · no spoilers · crawler clean.

| Screen | Specific findings | Size |
| --- | --- | --- |
| **Floor** | Price tag station and "Cans sell $X" duplicate the Price chip; Unload "Tap +6" label; Facing/Price/Restock look like text; scene letterbox. Late eras: frame flagship scale. | M |
| **Backroom** | Mostly empty room ("No trucks"); stock pile bar tiny; Perishables row low affordance. Add age bands (fresh/aging/spoiling) visual. | S |
| **Build** | "Facing · Deep counter" tomato bar unclear (is it a verb?); track chips at the bottom clipped; tiers ladder hard to read. Make the ladder a vertical track per row with next cost. | M |
| **Suppliers** | Dense chip soup (Index dear · 1 on the road · 0 open · CAN HSE PRD · Express · Budget · Fill-1); Dock tally box empty. Group into Order card (aisle seg → qty seg → Buy) + Trucks card. | M |
| **Cold** | Plant grid fine; buffer/tank labels tiny; "Surplus" twice. | S |
| **Logistics** | "Dry dock — no ocean lanes yet" empty room; red "Swear exam 0/8" reads as error. Use warn tone, show the exam hold path. | S |
| **Staff** | Room repeats Floor; roster hidden under the fold; Worlds annex row shows locked stations early. Roster first on phone; annex only when unlocked. | M |
| **Marketing** | Billboard art strong; "Print week · soft" ambiguous (stance vs verb); Flyer desk row text-only. Stance as seg control above the verb. | S |
| **Rivals** | Disabled "Buy Penny Pantry $717.50K" olive bar; price-war/bought labels tiny. | S |
| **Ventures** | "No tills open" box in an empty room plus cards below → merge: cards *are* the room on phone. | M |
| **Books** | Room HUD + chip row duplicate; "Horizon opens Era 7" spoiler; title-cased advice line. | S |
| **Invest** | Empty "Trading floor quiet" room; chips duplicate. Show passbook cap meter as the room. | S |
| **Politics** | "Seat a delegate · $400.00K + 25 PC" disabled; dial art unlabeled. | S |
| **Empire** | Rank ring good; Rewards/Projects/Totals tabs cramped at bottom; doctrine tree (from PR #2) needs phone pass. | M |
| **Map** | "Open Floor" tomato button as primary is odd; ring tabs (City…Galaxy) unclear; details panel float. | M |
| **Upgrades** | Tree view (PR #2) at 390: nodes small; Trees seg wraps; "Best: …" line long. Tree pan/zoom hints. | M |
| **Strategy** | Invalid DOM (P0-04); "Jump to Memos / Att · Ready now" debug-looking; right half empty; Tourny abbreviation. | S |
| **Land** | Invisible prices + broken Expansions (P0-03); "FILED 1" bar; secondaries text-like. Block map art (stash) worth reviving. | M |
| **Fleet** | Charter bars unlabeled at phone; biomass diagram labels tiny; "Launch hauler" disabled olive. | M |
| **Museum** | 23k px; chest row vs wall; 22 filter segs. Wing-by-wing view, chest shelf on top, filters in a sheet. | M |
| **Planets / Exchange / Cultivars / Signal / Charter / Last Aisle** | Not reached by the crawler past Era 7 stage — add dev stages for Eras 8–12, then crawl. Puzzle chrome parity (backlog item). | L |
| **Memos drawer** | 1,018-line panel; filters + back office + ledger in one; phone sheet. Split into Ready / All / Office / Ledger tabs. | M |
| **Menu drawer** | Dev / Wiki / Run / Settings / Saves / Progress / Go — 7 tabs; overflow at 390. Group: Wiki · Settings · Saves · More. | S |
| **Coach** | Lesson catalog duplicates wiki Lessons — make Coach open wiki Lessons in the drawer. | S |
| **Chapter / Offline receipt / Confirm / Prestige keep sheet** | Already kit Button (PR #2); check sizes at 390 and contrast. | S |

### Phase 5 — First hour (G5) · ~3 days

| ID | Task | Size |
| --- | --- | --- |
| P5-01 | FTUE script audit: intro (5 cards) → story dialogue → Coach lesson 1. Today three systems talk in a row. Make it: 3-card intro → first Unpack with spotlight → dialogue lines interleaved as *results* ("First basket!") not lectures. | M |
| P5-02 | "Juice" for the first loop: unpack crate pop, basket counter tick, first-sale celebration, first $ milestone, first hire. Respect reduced motion. | M |
| P5-03 | Progressive HUD: show only Cash, Baskets, Next Goal in Era 0; reveal speed/undo/memos as they become useful. | S |
| P5-04 | First 10 Next Goals reviewed for one-verb clarity and a visible reward. | S |
| P5-05 | 5 human playtests (fresh players, phone + desktop), notes in `11-backlog.md`; fix top 5 confusions. | M |

### Phase 6 — Quality of life (G6) · ~4 days

| ID | Feature | Size |
| --- | --- | --- |
| P6-01 | **Buy max / hold-to-repeat** consistently on every repeatable purchase (hire, crates, levels, upgrades) + quantity seg (×1 ×10 ×Max) in one place. | M |
| P6-02 | **Automation unlocks** surfaced as toggles in one "Autopilot" sheet (auto-restock, auto-collect ventures, auto-walk stores, auto-stamp ledger) — each unlocked by an upgrade/memo so it stays earned. | M |
| P6-03 | **Offline return**: receipt shows earnings, what finished, what's waiting, and a "Do the obvious" button (collect all, restock). | S |
| P6-04 | **Run stats & history screen** (Progress tab): cash/baskets curves, era timeline with dates, best rates, time per era. | M |
| P6-05 | **Notifications** (opt-in browser) for long timers: truck arrived, project done, pocket trip landed, chest ready. | S |
| P6-06 | **Hotkeys pass**: number keys switch hubs, Q/E cycle departments, B buy best, documented in `?` overlay and wiki. | S |
| P6-07 | **Search everything** in the palette: upgrades, memos, roles, wiki articles, settings. | S |
| P6-08 | **Undo** covers every spend (today: purchases only?) with a visible timer. | S |
| P6-09 | **Save safety**: cloud-free export reminder every N hours, import validation with preview, 3 rolling autosave backups with restore. | M |
| P6-10 | **Settings that matter**: text size (S/M/L), number format, motion, sound, colour-blind safe palette, compact density, tooltips delay. | M |
| P6-11 | **Pin a department** to the phone tab bar slot 4. | S |

### Phase 7 — Lovable features & expansions · ~6 days

Pick the ones that survive playtests; all must keep pacing (no free speed).

| ID | Feature | Why players love it | Size |
| --- | --- | --- | --- |
| P7-01 | **Store you can see grow**: the storefront strip (Floor top) reflects builds, facings, staff count, weather, time of day — every purchase visibly changes it. | Core thesis of 2.0 | L |
| P7-02 | **Era celebration**: full-screen chapter moment with the new storefront, stats of the era just finished, shareable card. | Milestones feel earned | M |
| P7-03 | **Regulars with memory**: named regulars get a tiny profile (visits, favourite aisle, mood) in a "Regulars" sheet; serving them builds a visible relationship. | Attachment | M |
| P7-04 | **Daily corner 2.0**: seeded daily with a modifier, local best, streak calendar on Home. | Return reason | M |
| P7-05 | **Photo mode** polish: hide UI, pick time of day, export PNG with store name. | Sharing | S |
| P7-06 | **Sound pass**: one soft till chime, crate thunk, era sting, ambience per era; mixer in settings (`shared/audio.ts` exists). | Feel | M |
| P7-07 | **Collections**: Museum wings tie to eras; completing a wing unlocks a cosmetic (not power). | Long-term goals | M |
| P7-08 | **Store naming & sign**: name your store at start; it appears on the sign, receipts, share cards. | Ownership | S |
| P7-09 | **Endless mode framing** after Era 12: a clear "post-game" board with weekly mutations and a score. | Endgame | M |
| P7-10 | **Accessibility themes as cosmetics**: high-contrast pack free for everyone. | Inclusive | S |

### Phase 8 — Accessibility (G6) · ~3 days

| ID | Task | Size |
| --- | --- | --- |
| P8-01 | Focus order & visible focus on every control (kit already has focus ring; audit custom buttons). | M |
| P8-02 | Keyboard: every verb reachable; drawers trap focus; Esc closes the top layer only. | M |
| P8-03 | Screen reader: rooms get `aria-label` summaries (exists for Floor — extend); live region for basket/cash milestones (throttled). | M |
| P8-04 | Contrast ≥ 4.5 body / 3.0 large everywhere; colour never the only signal (add icons to good/bad chips). | S |
| P8-05 | Reduced motion respected by scenes, FX, chest opener, wiki loop diagram (done), museum. | S |
| P8-06 | Text size setting scales the type tokens (not a CSS zoom). | S |

### Phase 9 — Performance & tech (G7, G8) · ~4 days

| ID | Task | Size |
| --- | --- | --- |
| P9-01 | **Code-split**: route-level (`/play`, shell pages), era-level (horizon panels/puzzles 7–12 lazy), museum, wiki, dev tools. Target ≤ 600 kB initial. | M |
| P9-02 | Render perf: memo selectors per panel; avoid re-rendering the whole tree per tick (profile Floor, Map, Museum). 60 fps target on a mid phone. | M |
| P9-03 | CSS: drop dead legacy (P1-10) → CSS ≤ 150 kB. | — |
| P9-04 | **Error boundary** per hub with "Report / Reload panel" and a local crash log in Settings → Saves. | S |
| P9-05 | **PWA**: manifest, icons, offline cache; installable on phones; works offline (it's local-save). | M |
| P9-06 | Save size & migration test for SAVE 36 → 1.0 (no state change expected; if any, bump with migrate path). | S |
| P9-07 | Lint: 0 warnings in `src/` (today ~25 pre-existing). | S |

### Phase 10 — Balance & pacing feel (G5) · ~3 days

| ID | Task | Size |
| --- | --- | --- |
| P10-01 | Human playtest protocol (Era 0–2, ~4 h) with a timing sheet: where players wait with nothing to do, where they're confused, where they quit. | M |
| P10-02 | Replace any "dead wait" > 3 min in Era 0–2 with a decision or a side verb (law 5: decisions, not cooldown pads). Bot + floors unchanged or raised only. | M |
| P10-03 | Offline/idle tuning: 8 h away should feel rewarding, never punishing (produce spoil message reframed). | S |
| P10-04 | Era 12 margin (~6 min over floor) — add seating decision padding if any later change pulls it under. | S |

### Phase 11 — QA & test matrix (G8) · ~3 days

| ID | Task | Size |
| --- | --- | --- |
| P11-01 | e2e: one smoke per hub per era band (0–1, 2–3, 4–6, 7–12) at desktop + phone. | M |
| P11-02 | Visual regression baselines for kit gallery + 10 key screens × 3 sizes. | M |
| P11-03 | Dev stages for Eras 8–12 (needed by crawler and e2e). | M |
| P11-04 | Crawler as a script in `scripts/audit/` with configurable paths; CI artifact of contact sheets. | S |
| P11-05 | Save fuzz: load 50 random dev-stage saves, tick 10 min, assert invariants (exists: `invariants.ts`). | S |

### Phase 12 — Ship 1.0 (G9) · ~1 day

| ID | Task |
| --- | --- |
| P12-01 | Version decision (see §6): display version and News/edition naming. |
| P12-02 | Bulletin: "Grocery Empire 1.0" edition with highlights linking to the wiki. |
| P12-03 | Wiki: update Start here + Reading the screen for the new HUD/guidance; regenerate lessons list. |
| P12-04 | Docs pack: README snapshot, 09-ui (guidance model, breakpoints), 10 changelog, 11 backlog for post-1.0. |
| P12-05 | Full gate run (G1–G9), tag `v1.0.0`, merge to `main`, Vercel deploy check. |

---

## 5. Order, milestones and dependencies

```
M0  Stop-ship (P0)                    ──► everything else sits on a sane HUD + green e2e
M1  Foundations (P1-01..09)  ║  Guidance (P3-01..06)        (parallel; P3 needs P1-03/04 buttons)
M2  Screen sizes (P2)        ║  Per-screen pass (P4)        (P4 uses P1 + P2 compact rooms)
M3  First hour (P5) + QoL (P6) + A11y (P8)
M4  Lovable features (P7, playtest-driven) + Perf (P9)
M5  Pacing feel (P10) + QA matrix (P11) + Ship (P12)
```

| Milestone | Exit | Est. |
| --- | --- | --- |
| **M0** | G1 crawler clean on the known bugs; e2e green | 2 d |
| **M1** | ≤ 8 font sizes/screen; 0 raw buttons in panels; one guidance channel live | 5 d |
| **M2** | G2 at all sizes; every department passes the checklist | 10 d |
| **M3** | G5 + G6 checklists | 7 d |
| **M4** | G7 numbers; chosen P7 features in | 7 d |
| **M5** | G8 + G9 | 5 d |

Total ≈ 36 agent-days of focused work. Each phase lands as its own PR into `release-1.0`; `release-1.0` merges to `main` at M5.

---

## 6. Decisions (answered by Connor, 2026-11-16)

1. **Version number: 1.0, history erased.** `GAME_VERSION = '1.0'`; `content/news.ts` holds one launch article and grows from there. Do not restore v2–v40 bulletins. *(Done.)*
2. **Rooms on phone: simplified.** Illustration band + chips for most departments; full portrait layouts only for Floor, Staff and Fleet. *(P2.)*
3. **Tips: floating tip card removed.** Help moves to in-panel cards + wiki (P3). Tips still file themselves in the sim so saves stay clean. *(Card removed; panel help is P3.)*
4. **Suggested strip: removed.** Next Goal is the one guidance voice. The setting stays, but now only marks the suggested tab. *(Done.)*
5. **P7 order:** growing storefront → era celebration → name your store → sound → better daily challenge → regulars with profiles.
6. **Stash: revive visuals only.** Land block map and Ventures tier visuals from `git stash` "ventures-land-fleet wip", rewritten against the current save format; none of its sim/balance changes. *(P4.)*

---

## 7. Definition of done (per task)

- [ ] Works at 360, 390, 768, 1280, 1920 and 844×390.
- [ ] Kit components only; tokens only (no new hex in panels, no raw px font sizes).
- [ ] Reduced motion respected.
- [ ] Crawler shows no new findings on touched screens.
- [ ] `npm run build`, `npm test`, `npm run lint` (no new warnings), relevant e2e.
- [ ] Docs pack row updated; News line if player-visible.

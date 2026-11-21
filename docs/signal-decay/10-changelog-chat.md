# Changelog

## 2026-11-20 — cool memory / main-thread heat

- Autosave **45s**; cloud identical-payload skip; campaign glance cache for Social/Shelf.
- UI paint **2.5 Hz**; skip React notify while hidden; undo HUD uses one timeout (no 500ms interval).
- No `SAVE_VERSION` / `GAME_VERSION` bump.

## 2026-11-20 — 1.2.1 pause clock

- Opening a save clears a player pause, including a Quiet sign-off, so the station starts on air. Time away while paused is not caught up. A double reject stays parked.
- After 30 real seconds of pause, a clock hangs under the header with Resume.
- `GAME_VERSION` **1.2.1**. No save or economy change.

## 2026-11-17 — 1.2 trees and the mission

- Plant · Trees is a pannable board (Grocery’s tree grammar, Signal’s own files): ten families, era tiers, path links, rank rings, a detail pane on desktop and a sheet on a phone. Links do not gate buys, so the campaign bot’s purchase order is unchanged.
- Each era opens as a chapter card before the coach. Walkthroughs now cover eras 7–12, and the offer prefers the era you are in. The department `?` and the Next strip repeat the mission.
- `GAME_VERSION` **1.2** · `SAVE_VERSION` **4** (`chapterSeen`). News `sd-1.2`.

## 2026-11-17 — 1.1 decision breadth

- Shows: safe/bold program per daypart. Bold pulls ×1.12 and heats ×1.22. Unset stays the old format fit, so the campaign bot is unchanged.
- Quiet laws all read in formulas: richer night, weird elasticity, faster decay, costlier air.
- Choir hum cuts audience until Answer. Bold shows and a fast manifest's open lane make the Choir (and, for the lane, Orbital) grow every tick. A live deep promo week baits Pirate the same way.
- Tower policy match / push / quiet. Fast manifest pays cash, credits nothing, leaves the lane open.
- Retune carries one owned doctrine or one slotted show. Six doctrines are buyable from Night Skip.
- Antenna and tower quantity, 1–10, at the growing price. Next strip aside defers to the goal.
- `GAME_VERSION` **1.1** · `SAVE_VERSION` **3**. News `sd-1.1`.

## 2026-11-17 — 1.0 (phases F+G)

- Late presentation: Plant gets a *Desks* list (Heat log, Band plan, Birds, Quiet door) because the four-slot tray hid Band Plan and Quiet door once Skip arrived. Quiet door sheet is Stay / Retune / Sign off with two laws, doctrine carry and confirms. Band plan (exam / clean / region) and Birds (haul / berth) are their own sheets with meters and cooldown chips.
- Dial boards: Network lists all six boards (locked ones with an era chip) with per-board status chips; phrase board shows live legal / illegal-pair / clever feedback from `grammar.ts`.
- Sim: the Choir rival (`s.rivals.choir`) wakes at era ≥ 7 via `setEra` and Quiet Stay; `content/rivals.ts` marks it live (era 7). Era 12 measured ~40.7 h (was ~40.58 h).
- `ui/shell/WhisperToast.tsx`: a dialogue line every 90 s of game time.
- DevMode: Opening / Era 2 / Quiet (now a full ledger) / Dial / Last Carrier stages.
- Tests: `sim/choir.test.ts`; `opening-coach.test.ts` also pins ≥40 tours.
- `GAME_VERSION` **1.0** · `SAVE_VERSION` 2 (unchanged: `rivals` already persisted). News `sd-1.0` is the newest bulletin.

## 2026-11-17 — Full wing 0.6 (phases C+D+E)

- Rooms: `ui/scenes/DepartmentPlate.tsx` puts the art/cast plate behind Air, Plant, Crew, Net and Books (solid fallback). `Portrait.tsx` for faces. ShackScene gains era-gated props; RoomHud capped at 3 chips.
- Teaching: `content/tutorials.ts` → `TOURS` (44 named tours, eras 0–6) + 50 tips; Coach offers the next unfinished tour after the opening (`sd-tours-done` in localStorage, no save change).
- Archive: `content/memos.ts` (89) · `content/dialogue.ts` (156 whispers) · `content/staff.ts` (24 roles) · `content/rivals.ts` (pirate/metrowave/orbital/choir faces).
- Wiki is a browser (`ui/wiki/WikiBrowser.tsx`: sidebar topics + article). Museum wings: Relics | Rivals | Facings | Chests, portraits + `state.buyouts`.
- Upgrades 204 → 308: second shelf `EXTRA_BY_ERA_B` appended after the originals so the bot's buy order and pacing are unchanged.
- `GAME_VERSION` **0.6** · `SAVE_VERSION` 2 (unchanged). `content/content-density.test.ts` guards counts.

## 2026-11-17 — Audit follow-ups

- Clever Dial fact shows block reason when clever fails (was inverted).
- PanelHelp tips rewritten; sticky phone primary tray; Books Retune uses Confirm.
- NextGoal: tower/skip/region/bird → Net; richer progress meters; failAction jumps on Plant/Calls.

## 2026-11-17 — Hub subtabs + department depth

- GE-style HubHead: `Air / Loop`, `Plant / Mast|Trees|Desks`, `Crew / Shifts|Staff|Rivals`, `Books / Ledger|Calls`, `Net / Map|Dial`.
- Plant/Crew/Books/Net rebuilt as sub-views (not sheet dumps); Trees upgrades inline; Dial boards own tab.
- Air room interactive hits; Hold recovers harder under the clarity floor; Era 0 star nick softened.
- Kit weight: solid free/tag buttons, denser shift/ledger/invoice/tree/rings chrome; celebrate on air/log/hire/buy.

## 2026-11-17 — Air as one primary verb

- Air loop rebuilt GE-style: one hero verb (Sweep / Hold / Log / Air) + secondary row; Hold is the tomato free press-and-hold.
- Room strip shows Clarity · Buffer · Ready live; taller shack; neighborhood meter top-left.
- Buttons: solid free (tomato) / primary (shelf-tag gold), dashed disabled — GE kit language.
- Plant early primary is Crystal Gain; coach offer card sits corner, not center stage.

## 2026-11-17 — GE-familiar shell chrome

- App grid mirrors GE: HUD top, hub rail left (desktop) / bottom bar (phone); hubs rail 96px.
- Hud breakpoints match GE: desktop `brand · money · goal · controls`; phone hides brand, money+controls then goal.
- Next Goal: NEXT kicker, progress meter, shelf-tag / free Do it, Show me when off-hub.
- Hubhead title + one-line purpose; Air loop step cue (Sweep→Hold→Log→Air) with numbered verbs.

## 2026-11-17 — Shell sense pass

- Home link on brand (back to shelf). HUD is brand · money · controls + Next Goal tag.
- Air loop restored as four big verbs (Sweep / Hold / Log / Air) — Hold is the free verb.
- Plant upgrades and Crew rivals/roles moved into sheets (no body dumps).
- Coach no longer blacks out the board; Skip works; soft-pause is partial.

## 2026-11-17 — GE-caliber parity 1.0

- P0: tokens/layers, kit (Button/Meter/Sheet/…), PlayFrame + VerbTray, Hud + NextGoal; all hubs on the frame.
- P1: continuous opening coach + spotlight, tips/checklist, dense Shack Hits + RoomHud, juice.
- P2–P3: department scenes/sheets, named rival cards (war/buyout), UpgradeBoard, ~204 upgrades, format clock puzzle, staff catalog.
- P4: Band Plan / Quiet door / Dial boards + phrase grammar UI / Charter / Last Carrier; era-gated shack props.
- P5: Wiki + Museum in More, Undo (5s) + Buy Best, DevMode stages, news bulletin, `GAME_VERSION` **1.0**, `SAVE_VERSION` 2.
- Hard rule kept: no Grocery panel/CSS imports.

## 2026-11-17 — Feel pass 0.2

- Press-and-hold Lock fills the buffer (~8s); Air pays a cash burst floater.
- Illustrated shack grows with antenna / towers / tape wall; ON AIR lamp; waveform.
- Opening goals: 3 airs → Crystal Gain → antenna → log pile → Neighborhood door.
- Soft-cap formula fix (empty stats no longer ×2 everything).
- Engine singleton on `globalThis` for Vite HMR.
- `GAME_VERSION` **0.2**.

## 2026-11-16 — Phases 0–8 first ship

- Registered `signal-decay` as playable; replaced `coming-soon-a`.
- Full sim spine Eras 0–12: air loop, decay, callers, shifts, invoices, promos, heat, skip, spectrum, birds, quiet door, Dial layers, charter, last carrier.
- Campaign bot + default pacing test (Era 1–2). `SD_LONG` / `SD_HORIZON` gated.
- Five-hub UI with shack scene and opening coach.
- PlayPage wipe seam routes by active game.
- Briefing pack under `docs/signal-decay/`.
- `GAME_VERSION` 0.1 · `SAVE_VERSION` 1.

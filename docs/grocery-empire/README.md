# Grocery Empire — agent briefing pack

**Purpose:** hand this folder to any agent (or human) so they understand the game structure, the economy, the pacing contract, what this chat shipped, and what is still open — without re-deriving it from the whole repo.

**Also read:** repo root [`CLAUDE.md`](../../CLAUDE.md) (working rules) and [`docs/2.0-plan.md`](../2.0-plan.md) (2.0 thesis + pacing table). This pack is the **living** briefing; `2.0-plan.md` is the historical design spine.

| File | Contents |
| --- | --- |
| [00-agent-protocol.md](00-agent-protocol.md) | How to work here and **always update this pack** |
| [01-overview.md](01-overview.md) | Thesis, hubs, architecture diagram |
| [02-file-map.md](02-file-map.md) | Where code and content live |
| [03-sim-rules.md](03-sim-rules.md) | Commands, state, migrate, `SAVE_VERSION` |
| [04-economy-math.md](04-economy-math.md) | Income formula, ladders, key constants |
| [05-eras.md](05-eras.md) | Eras 0–12, hard gates, doors |
| [06-depth-systems.md](06-depth-systems.md) | Depth + pacing-stretch systems |
| [07-pacing.md](07-pacing.md) | CI windows, measured bot times, how to remeasure |
| [08-content-catalog.md](08-content-catalog.md) | Aisles, roles, upgrades, rivals, goals |
| [09-ui.md](09-ui.md) | Hubs, panels, mobile rules |
| [10-changelog-chat.md](10-changelog-chat.md) | What the era-depth + pacing-stretch chats shipped |
| [11-backlog.md](11-backlog.md) | Known gaps, leftover polish, do-not-do list |
| [12-expansion-megaplan.md](12-expansion-megaplan.md) | **Next megaplan:** lengthen to ~40–50h, one new hard gate per era, UI throughout |

**Current snapshot (update when wrong):** `SAVE_VERSION` **29** · display `GAME_VERSION` **3.0** · default CI Era 1 **>35m ≤55m** (~40.5m), Era 2 **>3.5h ≤5h** (~3.50h). `LONG=1` Eras 3–6 plan windows; `LONG_HORIZON=1` Era 12 **>40h ≤50h**. See [12-expansion-megaplan.md](12-expansion-megaplan.md).

Last pack review: 2026-11-14 (Feel overhaul day: PlayFrame trays, plant power, flyer bands, policy readers, motion primitives).

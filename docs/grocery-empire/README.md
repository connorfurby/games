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
| [13-release-1.0-plan.md](13-release-1.0-plan.md) | **Active:** the 1.0 release plan — audit, gates, phases P0–P12 |
| [12-expansion-megaplan.md](12-expansion-megaplan.md) | **Shipped (2026-11-14):** lengthen to ~40–50h. Live generation work is **40.0** (Phases 0–12 below). |

**Current snapshot (update when wrong):** `SAVE_VERSION` **37** · display `GAME_VERSION` **1.0** (launch numbering; pre-1.0 bulletins erased) · default CI Era 1 **>35m ≤55m**, Era 2 **>3.5h ≤5h**. `LONG=1` Eras 3–6 plan windows; `LONG_HORIZON=1` Era 12 **>40h ≤50h**. Tournament cooldown **600s**; doctrine growth **1.65**; depot needs **12 Read**; Autonomous needs **48 Read**.

Last pack review: 2026-11-16 (**1.0 Phases 0–3 + first hour** + fluid opening lesson: one type scale, phone rooms, single Next Goal button, in-room help, one continuous `opening` coach tour; see changelog Y–W; before that 40.1 shell + Ops Wiki; earlier the same day: 40.0 prove). Phases 0–12 shipped: foundation → one frame + phone → QoL → era decisions 0–12 → postgame/museum → content + News 40.0 → visual `@layer shell` → app shell → prove. Measured seed-1 landings still inside plan windows (Era 12 ~40.10 h). See [10-changelog-chat.md](10-changelog-chat.md).

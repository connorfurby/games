# Sim rules

- `SAVE_VERSION` **4**. `chapterSeen` is the last accepted era chapter (`-1` until the shack card). Retune keeps it. Dev stages set it to the staged era so the card does not cover a jump.
- New persisted fields from 1.1 still apply: `depth.programs`, `depth.choirHushUntil`, `depth.laneOpen`, tower `policy` (`match` | `push` | `quiet`), and `prestigeCarry` (one doctrine or one show).
- Commands return `{ ok: true }` or `{ ok: false, reason }`. UI toasts the reason.
- `repair()` clamps stars, heat, focus, era after every tick and dispatch.
- Offline catch-up runs decay (lossy). Away receipt shows clarity lost.
- Retune / Quiet Retune rebuild the shack and keep Archive + Listener Trust + **one** doctrine **or** one slotted show. An unknown carry is dropped. Quiet laws chosen on the door are written after the reset.

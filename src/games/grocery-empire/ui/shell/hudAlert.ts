import type { MenuId } from '../../content/menus'
import { salesBottleneck } from '../../sim/formulas'
import type { GameState } from '../../sim/state'
import { canResolveBoard } from '../../sim/systems/capital'

export interface HudAlert {
  text: string
  menu: MenuId
  tone: 'warn' | 'danger'
  /** Stable key per condition, used to fire a notification once per onset. */
  kind: 'board' | 'drift' | 'shelf' | 'unpack' | 'checkout'
}

const LIMIT_COPY: Record<string, string> = {
  shelf: 'Shelves run empty',
  unpack: 'Unpacking can’t keep up',
  checkout: 'The checkout line is the limit',
  demand: 'More shoppers would sell more',
}

/** One alert at a time, most urgent first. Shared by the HUD banner and hidden-tab notifications. */
export function computeHudAlert(s: GameState): HudAlert | null {
  if (s.era >= 2 && canResolveBoard(s) === null) {
    return { text: 'The board is waiting on an agenda', menu: 'books', tone: 'danger', kind: 'board' }
  }
  if (s.era >= 2 && s.stores.some((st) => (st.drift ?? 0) >= 0.55)) {
    return { text: 'A store is drifting — walk it', menu: 'land', tone: 'warn', kind: 'drift' }
  }
  if (s.era >= 1 && s.stats.sold > 0) {
    const b = salesBottleneck(s)
    if (b.kind !== 'demand') {
      const dest: MenuId = b.kind === 'shelf' ? (s.backroom.length ? 'floor' : 'suppliers') : 'staff'
      return {
        text: LIMIT_COPY[b.kind] ?? b.label,
        menu: s.menus[dest] ? dest : 'floor',
        tone: 'warn',
        kind: b.kind === 'shelf' || b.kind === 'unpack' || b.kind === 'checkout' ? b.kind : 'shelf',
      }
    }
  }
  return null
}

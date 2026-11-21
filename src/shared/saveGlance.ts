/**
 * Tiny campaign glance cache — updated on autosave so Shelf / Social / AppMenu
 * never re-parse a ~280KB GameState just for era / baskets / play time.
 */

export interface CampaignGlance {
  era: number
  lifetimeRevenue: number
  headline: number
  playSec: number
  lastSavedAt: number
  /** Grocery baskets or Signal calls — for run cards. */
  headlineLabel: string
}

const glances = new Map<string, CampaignGlance>()

export function setCampaignGlance(slotId: string, glance: CampaignGlance) {
  glances.set(slotId, glance)
}

export function getCampaignGlance(slotId: string): CampaignGlance | null {
  return glances.get(slotId) ?? null
}

export function clearCampaignGlances() {
  glances.clear()
}

export function hasCampaignSave(slotId: string): boolean {
  return glances.has(slotId)
}

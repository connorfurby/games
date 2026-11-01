export interface PerkDef {
  id: string
  name: string
  per: string
  max: number
  cost: number
}

/** Empire perks are mild by design: nothing here is required to progress. */
export const PERKS: PerkDef[] = [
  { id: 'starting-cash', name: 'Nest Egg', per: '+$10 now (run-local cash bump)', max: 5, cost: 1 },
  { id: 'slow-spoil', name: 'Cool Hands', per: '−3% spoilage speed', max: 5, cost: 1 },
  { id: 'extra-archive', name: 'Spare Drawer', per: '+1 Archive once the back office opens', max: 2, cost: 2 },
  { id: 'quick-unpack', name: 'Tape Habit', per: '+1 unit per Unpack click', max: 3, cost: 1 },
  { id: 'tip-jar', name: 'Tip Jar', per: '+1% revenue', max: 5, cost: 1 },
  { id: 'calm-staff', name: 'Easygoing Crew', per: '+2% base morale', max: 5, cost: 1 },
  { id: 'lucky-trucks', name: 'Lucky Trucks', per: '−10% short-ship chance', max: 3, cost: 1 },
  { id: 'window-display', name: 'Window Display', per: 'Atmospheric storefront art + 1% demand', max: 1, cost: 1 },
]

export const PERK_BY_ID: Record<string, PerkDef> = Object.fromEntries(PERKS.map((p) => [p.id, p]))

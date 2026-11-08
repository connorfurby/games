/** Rare Ideas-gated ledger lines — almost verse (Part K). Era-tagged so late lines never spoil early ones. */
export interface ReceiptPoem {
  /** Minimum era at which the line may appear. */
  era: number
  text: string
}

export const RECEIPT_POEM_DEFS: readonly ReceiptPoem[] = [
  // Era 0–1 · counter / corner
  { era: 0, text: 'A can of beans remembers the shelf better than we do.' },
  { era: 0, text: 'Receipt paper yellows; baskets do not.' },
  { era: 0, text: 'A chalkboard is a flag for people who still look down.' },
  { era: 0, text: 'The register sings one note and calls it a day.' },
  { era: 1, text: 'The cooler hums a hymn only stockers hear.' },
  { era: 1, text: 'Price tags flip like coins that never land.' },
  { era: 1, text: 'Produce browns on schedule. We call it honesty.' },
  { era: 1, text: 'Somewhere a nephew floats eighty dollars forever.' },
  { era: 1, text: 'Attention fills Archives the way rain fills gutters.' },
  { era: 1, text: 'Rent pauses into arrears; the street keeps walking.' },
  { era: 1, text: 'Wholesale walks; we only choose which step to board.' },
  { era: 1, text: 'Night latch: the door that pretends the day never closed.' },
  { era: 1, text: 'Memos are doors that charge admission in cash and Attention.' },
  { era: 1, text: 'Rain on the awning is the only ad that never invoices.' },
  // Era 2 · chain
  { era: 2, text: 'Empire is a word cashiers invent when the till gets heavy.' },
  { era: 2, text: 'Drift is what a brand does when nobody walks the aisle.' },
  { era: 2, text: 'A second door is a second apology waiting to happen.' },
  { era: 2, text: 'The board meets. The cans do not care. The cans are right.' },
  // Era 3 · cold & state
  { era: 3, text: 'Cold plants invent tomorrow’s freshness out of tonight’s fuel.' },
  { era: 3, text: 'A brownout is a held breath the whole county shares.' },
  { era: 3, text: 'Capital is a polite word for owing someone dinner.' },
  // Era 4 · globe
  { era: 4, text: 'Distance is just another aisle with a fuel bill.' },
  { era: 4, text: 'Off-Brand smiles with our fonts.' },
  // Era 5 · barges
  { era: 5, text: 'Barges carry seed the way clerks carry crates — carefully, and with names.' },
  { era: 5, text: 'A hull is a shelf that learned to leave.' },
  // Era 6 · ending
  { era: 6, text: 'The last ration is a sentence with no period.' },
  { era: 6, text: 'The hungry universe asks politely. Then it asks again.' },
  { era: 6, text: 'You can only arrive later than the story wanted — and the door will still be lit.' },
]

/** All verse, unfiltered (legacy export). */
export const RECEIPT_POEMS: readonly string[] = RECEIPT_POEM_DEFS.map((p) => p.text)

/** Verse eligible at or below the given era. Always non-empty (era 0 has lines). */
export function poemsForEra(era: number): readonly ReceiptPoem[] {
  const out = RECEIPT_POEM_DEFS.filter((p) => p.era <= era)
  return out.length > 0 ? out : RECEIPT_POEM_DEFS
}

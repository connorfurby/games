/** Staff roles — flavor + guidance for the Crew desk. The sim hires `board` ops; roles name how to use them. */

import type { PortraitId } from '../art/cast'

export type StaffDesk = 'air' | 'plant' | 'crew' | 'net' | 'books'

export interface StaffRole {
  id: string
  title: string
  blurb: string
  /** First era the role makes sense to talk about. */
  era: number
  /** Which room this role helps in. */
  desk: StaffDesk
  /** Shift slot the role is best parked in. */
  shift?: 'dawn' | 'day' | 'night'
  portrait?: PortraitId
}

export const STAFF_ROLES: StaffRole[] = [
  { id: 'board-op', title: 'Board op', blurb: 'Keeps Lock honest while you look elsewhere.', era: 1, desk: 'air', shift: 'day', portrait: 'maya' },
  { id: 'dawn-hand', title: 'Dawn hand', blurb: 'Opens the shack before the neighbors wake. Dawn days gate the Net.', era: 1, desk: 'crew', shift: 'dawn', portrait: 'otto' },
  { id: 'night-ear', title: 'Night ear', blurb: 'Listens past midnight. Farther skip reach.', era: 1, desk: 'net', shift: 'night', portrait: 'lena' },
  { id: 'promo-desk', title: 'Promo desk', blurb: 'Prints the week: soft, mid or deep.', era: 2, desk: 'crew', shift: 'day', portrait: 'ross' },
  { id: 'caller-screener', title: 'Caller screener', blurb: 'Tells you what format the line wants before you pick up.', era: 1, desk: 'air', shift: 'day' },
  { id: 'log-clerk', title: 'Log clerk', blurb: 'Labels every clean copy so the shoebox stays findable.', era: 1, desk: 'books', shift: 'day' },
  { id: 'tower-hand', title: 'Tower hand', blurb: 'Climbs the mast when the guy wires hum.', era: 2, desk: 'plant', shift: 'day' },
  { id: 'invoice-runner', title: 'Invoice runner', blurb: 'Walks the bill to the clerk before the due date.', era: 2, desk: 'books', shift: 'dawn' },
  { id: 'format-chief', title: 'Format chief', blurb: 'Owns the six-slot clock and calls the segue.', era: 2, desk: 'crew', shift: 'day' },
  { id: 'heat-watch', title: 'Heat watch', blurb: 'Signs the heat log before the board cooks out.', era: 3, desk: 'plant', shift: 'night' },
  { id: 'skip-plotter', title: 'Skip plotter', blurb: 'Charts which towers match tonight’s hot trait.', era: 3, desk: 'net', shift: 'night' },
  { id: 'exam-coach', title: 'Exam coach', blurb: 'Drills the hold until the inspector is bored.', era: 4, desk: 'books', shift: 'day' },
  { id: 'manifest-clerk', title: 'Manifest clerk', blurb: 'Files clean copies and exam holds separately.', era: 4, desk: 'books', shift: 'day' },
  { id: 'region-surveyor', title: 'Region surveyor', blurb: 'Draws a county-sized slice of the dial.', era: 4, desk: 'net', shift: 'day' },
  { id: 'van-driver', title: 'Van driver', blurb: 'Takes field hauls out and brings them home.', era: 5, desk: 'plant', shift: 'day' },
  { id: 'bird-wrangler', title: 'Bird wrangler', blurb: 'Keeps the satellite berth booked.', era: 5, desk: 'net', shift: 'night' },
  { id: 'quiet-keeper', title: 'Quiet keeper', blurb: 'Stamps the ledger when the cooldown clears.', era: 6, desk: 'books', shift: 'night' },
  { id: 'archivist', title: 'Archivist', blurb: 'Restores tape and protects the museum wing.', era: 6, desk: 'books', shift: 'day' },
  { id: 'subcarrier-tech', title: 'Subcarrier tech', blurb: 'Trims the voice under the voice.', era: 7, desk: 'net', shift: 'night' },
  { id: 'packet-sorter', title: 'Packet sorter', blurb: 'Settles stops with a drop, tariff or delay.', era: 8, desk: 'net', shift: 'day' },
  { id: 'garden-hand', title: 'Night gardener', blurb: 'Keeps the bed tidy so clever filings stay legal.', era: 9, desk: 'crew', shift: 'night' },
  { id: 'grammarian', title: 'Grammarian', blurb: 'Knows which marks legally sit together.', era: 10, desk: 'net', shift: 'day' },
  { id: 'clause-clerk', title: 'Clause clerk', blurb: 'Seats clauses one at a time and answers the hearing.', era: 11, desk: 'books', shift: 'day' },
  { id: 'last-chair', title: 'Last chair', blurb: 'Rehearses the list until the mean holds.', era: 12, desk: 'crew', shift: 'night' },
]

export function staffForEra(era: number): StaffRole[] {
  return STAFF_ROLES.filter((r) => r.era <= era)
}

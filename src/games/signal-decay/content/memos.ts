/** Radio memos — short archive notes unlocked by era. Lore only; the sim never reads these. */

export interface Memo {
  id: string
  title: string
  body: string
  era: number
  /** Optional cash value printed on the memo (flavor / future shop hook). */
  cost?: number
}

/** [era, title, body, cost?] */
type Row = [number, string, string, number?]

const ROWS: Row[] = [
  // ---- Era 0 · The Shack ----
  [0, 'Found the set', 'A crystal receiver under a tarp in the basement. It still hums.'],
  [0, 'First carrier', 'A thin tone near the bottom of the dial. It answered when I stopped asking.'],
  [0, 'Hold, do not tap', 'The buffer fills while the key is down. My thumb ached by midnight.', 4],
  [0, 'The clean copy', 'One good copy beats ten smeared ones. Label it before the noise comes back.'],
  [0, 'Mast in the window', 'The wire I strung looks silly. The meter does not care.', 8],
  [0, 'Dead air', 'The carrier dropped for six seconds. It felt like six minutes.'],
  [0, 'Shoebox of tapes', 'I keep them in a shoebox. The box is getting heavy.'],
  [0, 'Neighbor at the door', 'Someone from three doors down heard me on their kitchen radio.'],

  // ---- Era 1 · Neighborhood ----
  [1, 'First caller', 'She wanted weather. I gave her talk. She called again anyway.'],
  [1, 'Format card', 'Six formats on an index card. Tape it to the bench.'],
  [1, 'Check in', 'A check-in costs nothing and the line stays warm for a minute.'],
  [1, 'Board op', 'Maya reads the meter better than I do. She keeps Lock honest.', 15],
  [1, 'Dawn hand', 'Otto opens the shack at six. The neighbors say they hear him humming.'],
  [1, 'Night ear', 'Lena listens past midnight. She says the quiet has a shape.'],
  [1, 'Two on the line', 'One caller on, one waiting. Never lose both.'],
  [1, 'Station ID', 'The card says “you are listening to...” and then I forget the name.'],

  // ---- Era 2 · The Net ----
  [2, 'Tower lease', 'The clerk asked for a letter of intent. I wrote three paragraphs.', 40],
  [2, 'Relays copy', 'A tower copies the carrier at margin. The margin is the point.'],
  [2, 'Invoice on the bench', 'The power book arrived in a brown envelope. Early pays less.', 20],
  [2, 'Format clock', 'Six slots in an hour. Practice twice, then credit it.'],
  [2, 'Promo week', 'Soft, mid, deep. The deep one drew a pirate out of the woodwork.'],
  [2, 'Pirate 88', 'A garage transmitter skipped across my band. Same frequency, different voice.'],
  [2, 'Depot talk', 'Four towers and still no roof. The depot lifts the penalty.', 80],
  [2, 'Ear', 'Tournaments pay Ear. Ear pays the depot.'],

  // ---- Era 3 · Night Skip ----
  [3, 'The board cooks', 'Heat climbs when I air without breaks. Sign the log before it blows.'],
  [3, 'Skip chart', 'The county opens after dark. Charts say when.', 55],
  [3, 'Hot trait', 'The skip named a trait tonight. Walk the towers that match it.'],
  [3, 'MetroWave', 'A chain with a lawyer on retainer moved into my county.'],
  [3, 'June on the line', 'A voice from nowhere on a skip. She gave me a call sign.'],
  [3, 'Retune', 'Start the run again and keep the archive. I am not ready yet.'],
  [3, 'Doctrine', 'A permanent perk. Each costs more than the last.', 120],
  [3, 'Graveyard pad', 'A thermos keeps the graveyard shift honest.'],

  // ---- Era 4 · Band Plan ----
  [4, 'Exam day', 'The inspector wants a hold. Then another. Then another.'],
  [4, 'Clean manifest', 'Clean and exam credit apart. File both.'],
  [4, 'Region on the map', 'A county-sized slice of the dial. I drew it by hand.', 140],
  [4, 'Filing clerk', 'She stamps faster than the form can print.'],
  [4, 'Band plan binder', 'Every filing lives in a binder now. I sleep better.'],
  [4, 'Archive level', 'The archive grows with revenue. It is the one thing that stays.'],
  [4, 'Spectrum counsel', 'My lawyer says never to say “probably.”'],

  // ---- Era 5 · Birds ----
  [5, 'Field haul', 'The van went out at dawn and returned at dusk with a crate of tapes.'],
  [5, 'First bird', 'A berth in orbit. It costs more than my first tower, my second, and my car.', 300],
  [5, 'Orbital', 'A satellite net that never sleeps and never says hello.'],
  [5, 'Horizon ring', 'Birds and subcarriers sit far out. They light the edge of the map.'],
  [5, 'Bird guard', 'A guard keeps birds from drifting off the berth.'],
  [5, 'Quiet before the quiet', 'The sky is loud. I miss the basement.'],

  // ---- Era 6 · The Quiet ----
  [6, 'Quiet ledger', 'Stamp it when the cooldown clears. Stamps stack.'],
  [6, 'Stay', 'The safe door. The one the bot always takes.'],
  [6, 'Retune again', 'I almost took the second door. My thumb knew better.'],
  [6, 'Quiet laws', 'Decay faster, nights richer. Pick two.'],
  [6, 'Museum case', 'Every buyout lands a case. I bought one out and stood in front of it.'],
  [6, 'Humidity seal', 'The vault shelf needs a seal against the damp.'],
  [6, 'Moonlit skip', 'A skip on a moonless night. Nobody believes me.'],

  // ---- Era 7 · Subcarrier ----
  [7, 'Voice under the voice', 'A subcarrier crystal. It speaks when the main voice stops.'],
  [7, 'Reel board', 'Practice a reel until the file counts.'],
  [7, 'Guest ear', 'A guest bans a format for a while. Hear them out anyway.'],
  [7, 'Tape baker', 'We bake the tapes before we digitize them.'],
  [7, 'Rotor mast', 'The mast turns slowly. It points at whatever the Net wants.'],
  [7, 'Exciter rack', 'Four modules, one hum.'],

  // ---- Era 8 · Packet Net ----
  [8, 'Settle the stop', 'Drop it, tax it, or delay it. Every route has a stop.'],
  [8, 'Packet modem', 'The modem screams for three seconds then goes silent.'],
  [8, 'Route board', 'File routes one at a time. Never two at once.'],
  [8, 'Ghost window', 'A window that opens and closes. I never saw it open.'],
  [8, 'Solar array', 'The roof is shingled in panels.'],
  [8, 'Shoutout wall', 'A wall of names. Each one a listener.'],

  // ---- Era 9 · Night Garden ----
  [9, 'The bed', 'A chore locks the bed. Clever filings are refused until it is done.'],
  [9, 'Season board', 'A season has eight weeks and no reruns.'],
  [9, 'Pilot episode', 'The pilot never airs. It sits in the vault.'],
  [9, 'Superfan tier', 'A tier of listeners who never missed a broadcast.'],
  [9, 'Grid tie', 'We plug into the grid. It plugs into us.'],
  [9, 'Night gardener', 'He waters the bed before dawn.'],

  // ---- Era 10 · Grammar ----
  [10, 'Six marks', 'Marks that legally sit together form a phrase.'],
  [10, 'Phrase board', 'Chain marks; the handler decides what stays.'],
  [10, 'Habit watch', 'Post a habit for the handler to keep.'],
  [10, 'The Choir', 'Callers who learned your phrases and repeat them back.'],
  [10, 'Phrase clock', 'The clock slips if the phrase is wrong.'],
  [10, 'Charter amendment', 'Add a clause to the call sign. Do not add two.'],

  // ---- Era 11 · Charter of Air ----
  [11, 'Seat a clause', 'Seat clauses one at a time and answer the hearing.'],
  [11, 'Hearing', 'The hearing asks the same thing three ways.'],
  [11, 'Fork', 'Public, Archive or Co-op. A charter cannot be unsigned.'],
  [11, 'Final filing', 'The last filing is always the shortest.'],
  [11, 'Trust deed', 'A deed to the shack, signed by every listener.'],
  [11, 'Seal vault', 'The seal vault holds what cannot be re-aired.'],

  // ---- Era 12 · Last Carrier ----
  [12, 'Fill the list', 'The last carrier fills one line at a time over the accept mean.'],
  [12, 'Rehearse', 'A bad take scratches a line. Rehearse again.'],
  [12, 'Accept', 'Accept once rehearsed — or sign off. A second refusal pauses the run.'],
  [12, 'Archive of record', 'Everything you aired is in the book.'],
  [12, 'Standing room', 'The crowd in the basement doorway has been there for years.'],
  [12, 'The shack, again', 'The set is still on the bench. The light is on.'],
  [12, 'Signal crown', 'A crown for the last carrier. It is just a loop of copper.'],
]

export const MEMOS: Memo[] = ROWS.map(([era, title, body, cost], i) => ({
  id: `memo-${String(i + 1).padStart(3, '0')}`,
  title,
  body,
  era,
  ...(cost != null ? { cost } : {}),
}))

export function memosForEra(era: number): Memo[] {
  return MEMOS.filter((m) => m.era <= era)
}

/** Whispers — one-line voices on the dial. Lore only; the sim never reads these. */

export type Speaker =
  | 'pete'
  | 'june'
  | 'maya'
  | 'ross'
  | 'otto'
  | 'lena'
  | 'pirate'
  | 'metrowave'
  | 'orbital'
  | 'choir'
  | 'static'

export interface Whisper {
  id: string
  era: number
  speaker: Speaker
  text: string
}

/** [era, speaker, text] */
type Row = [number, Speaker, string]

const ROWS: Row[] = [
  // ---- Era 0 · The Shack ----
  [0, 'static', 'Something is under the hiss. Wait for it.'],
  [0, 'static', 'A carrier, thin as a thread.'],
  [0, 'pete', 'Hold the key. Not tap. Hold.'],
  [0, 'static', 'The buffer is almost full.'],
  [0, 'pete', 'Label the tape before you air it.'],
  [0, 'static', 'Noise creeps back when you look away.'],
  [0, 'pete', 'Crystal first, then the mast.'],
  [0, 'static', 'A kitchen radio three doors down just caught you.'],
  [0, 'pete', 'Dead air is just a long breath.'],
  [0, 'static', 'The shack hums at a lower pitch than it did.'],
  [0, 'pete', 'Every great set starts under a tarp.'],
  [0, 'static', 'Your shoebox is getting heavy.'],

  // ---- Era 1 · Neighborhood ----
  [1, 'pete', 'Feature what they want. Then Serve.'],
  [1, 'maya', 'Meter says clarity is holding. Keep going.'],
  [1, 'otto', 'Dawn is open. Coffee is on.'],
  [1, 'lena', 'It is quiet. Quiet is a good sign.'],
  [1, 'maya', 'I will take Lock while you work the line.'],
  [1, 'pete', 'Two on the line. Never drop both.'],
  [1, 'otto', 'Six a.m. and a caller already.'],
  [1, 'lena', 'The county is awake after midnight, you know.'],
  [1, 'maya', 'You can check in. It keeps the line warm.'],
  [1, 'pete', 'A station ID is a promise. Say your name.'],
  [1, 'otto', 'The neighbor with the red door asked about you.'],
  [1, 'maya', 'Stars are slipping. Recover them before the Net.'],

  // ---- Era 2 · The Net ----
  [2, 'pete', 'A tower copies your carrier at margin. Margin is the point.'],
  [2, 'ross', 'Soft, mid or deep. Choose a week.'],
  [2, 'pirate', 'Heard you on 88. We were first.'],
  [2, 'ross', 'Invoice on the desk. Pay early.'],
  [2, 'maya', 'The clock has six slots. Fill them in order.'],
  [2, 'pirate', 'We never filed a form. We never will.'],
  [2, 'lena', 'The block is lit tonight. Count the lamps.'],
  [2, 'ross', 'Deep promos draw attention. Not all of it kind.'],
  [2, 'pete', 'Four towers and no depot? Ouch.'],
  [2, 'otto', 'The depot needs Ear. Run a tournament.'],
  [2, 'pirate', 'Try a price war. We can take it.'],
  [2, 'static', 'Another transmitter on your channel. Pirate, probably.'],

  // ---- Era 3 · Night Skip ----
  [3, 'june', 'It is June. I am calling from nowhere.'],
  [3, 'june', 'The skip is open. Tonight the county is yours.'],
  [3, 'lena', 'Walk the hot trait. The towers will thank you.'],
  [3, 'metrowave', 'MetroWave is your city’s number one for everything.'],
  [3, 'ross', 'A promo week earns the skip. You know the drill.'],
  [3, 'june', 'Sign the heat log before the board cooks.'],
  [3, 'metrowave', 'We have a lawyer on retainer. Do you?'],
  [3, 'lena', 'The graveyard hour is longer than it looks.'],
  [3, 'pete', 'Retune is a door. You do not have to walk through it.'],
  [3, 'june', 'Doctrines are forever. Pick carefully.'],
  [3, 'metrowave', 'Noise is the price of competition.'],
  [3, 'maya', 'Cooling is a habit, not a purchase.'],

  // ---- Era 4 · Band Plan ----
  [4, 'ross', 'The inspector is in the lobby. Smile.'],
  [4, 'maya', 'Exam first. Then the clean copy.'],
  [4, 'june', 'Draw the region wide. Fill it later.'],
  [4, 'otto', 'The manifest has your name on it. Sign here.'],
  [4, 'metrowave', 'We filed first. We always file first.'],
  [4, 'lena', 'Binders on the shelf. Binders on the bench.'],
  [4, 'pete', 'Archive level is climbing. Quietly.'],
  [4, 'ross', 'The clerk asked about your call sign.'],
  [4, 'june', 'A region is a county with ambition.'],
  [4, 'maya', 'Hold the exam until the inspector looks away.'],
  [4, 'pirate', 'We are on the band you just filed. Say hello.'],
  [4, 'otto', 'Spectrum counsel called. Twice.'],

  // ---- Era 5 · Birds ----
  [5, 'orbital', 'We are above you. We have been above you.'],
  [5, 'maya', 'The van is back. Finish the haul.'],
  [5, 'lena', 'A bird. At last. Do you hear it humming?'],
  [5, 'ross', 'A berth costs more than a car. Worth it.'],
  [5, 'orbital', 'Coverage is a promise we keep from above.'],
  [5, 'june', 'The horizon ring is lit. It looks like a crown.'],
  [5, 'otto', 'Hauls are piling up. Finish one.'],
  [5, 'pete', 'The sky is loud. The basement was quieter.'],
  [5, 'orbital', 'We do not sleep. We do not say hello.'],
  [5, 'maya', 'Guard the bird. The wind is high tonight.'],
  [5, 'lena', 'The satellite pass is at 02:14.'],
  [5, 'metrowave', 'You are on our horizon now.'],

  // ---- Era 6 · The Quiet ----
  [6, 'lena', 'The Quiet is not silence. It is attention.'],
  [6, 'pete', 'Stay. The door is open, but stay.'],
  [6, 'june', 'Retune is a beginning. Stay is a decision.'],
  [6, 'maya', 'Stamp the ledger. Again.'],
  [6, 'otto', 'The vault is dry. The seal held.'],
  [6, 'ross', 'The museum added a case. It has your name on it.'],
  [6, 'lena', 'Pick two laws. Not three.'],
  [6, 'pete', 'Sign off ends the run. I would not.'],
  [6, 'june', 'A moonlit skip. I swear it.'],
  [6, 'maya', 'Nights are richer. Mornings are heavier.'],
  [6, 'static', 'The set is still warm.'],
  [6, 'choir', '...we heard you, we heard you...'],

  // ---- Era 7 · Subcarrier ----
  [7, 'lena', 'A voice under the voice. Do you hear it?'],
  [7, 'maya', 'Practice the reel before you file.'],
  [7, 'otto', 'A guest in the lobby. He bans talk.'],
  [7, 'june', 'The rotor mast is turning on its own.'],
  [7, 'ross', 'Credit the reel. The desk is waiting.'],
  [7, 'pete', 'Tapes are baked. Digitize them next.'],
  [7, 'lena', 'The exciter rack hums in B-flat.'],
  [7, 'orbital', 'Your subcarrier is audible from orbit.'],
  [7, 'maya', 'Guest ears pay in patience.'],
  [7, 'june', 'The dial has layers. Reel first.'],
  [7, 'choir', 'Sub... carrier... sub... carrier...'],
  [7, 'metrowave', 'We can hear you under your own voice.'],

  // ---- Era 8 · Packet Net ----
  [8, 'maya', 'Settle the stop. Drop, tax or delay.'],
  [8, 'otto', 'Route board is open. One route at a time.'],
  [8, 'june', 'The packet modem screams for three seconds. Be patient.'],
  [8, 'lena', 'A ghost window opened and closed.'],
  [8, 'ross', 'Tariff or not, the route files itself.'],
  [8, 'pete', 'The roof is solar now. The shack hums happier.'],
  [8, 'orbital', 'Packets cross us every day. Yours are polite.'],
  [8, 'maya', 'Credit the route. Then rest.'],
  [8, 'otto', 'The shoutout wall is full.'],
  [8, 'lena', 'A drop is a delay with manners.'],
  [8, 'june', 'Nobody asked for a tariff. Everybody pays.'],
  [8, 'choir', 'Route... route... route...'],

  // ---- Era 9 · Night Garden ----
  [9, 'otto', 'The bed is locked. Finish the chore.'],
  [9, 'lena', 'Seasons do not rerun. Remember that.'],
  [9, 'maya', 'Clever filings are refused while the bed is locked.'],
  [9, 'june', 'The pilot is in the vault.'],
  [9, 'ross', 'A season is eight weeks. We have six.'],
  [9, 'pete', 'The garden is quiet. The beds are tidy.'],
  [9, 'otto', 'He waters at dawn. I water at dusk.'],
  [9, 'lena', 'Superfans sit in the second row.'],
  [9, 'choir', 'Season... season... season...'],
  [9, 'orbital', 'Every night garden looks green from above.'],
  [9, 'maya', 'Grid-tie is live. Watch the surge.'],
  [9, 'june', 'We are growing. It is a little frightening.'],

  // ---- Era 10 · Grammar ----
  [10, 'lena', 'Six marks. Legal pairs only.'],
  [10, 'maya', 'Chain marks that legally sit together.'],
  [10, 'otto', 'Post a habit. The handler will keep it.'],
  [10, 'june', 'A phrase is a path through the grammar.'],
  [10, 'ross', 'Credit the phrase. File it.'],
  [10, 'choir', 'We know the words. We were listening.'],
  [10, 'pete', 'Phrase clock slipped. Reset it.'],
  [10, 'lena', 'Adjacent pairs are the whole game.'],
  [10, 'choir', 'Say it again. Say it again.'],
  [10, 'maya', 'Clever phrases fail quietly.'],
  [10, 'otto', 'A habit watch is a long afternoon.'],
  [10, 'june', 'The grammar has no exceptions. It has edge cases.'],

  // ---- Era 11 · Charter of Air ----
  [11, 'pete', 'Seat the clause. One at a time.'],
  [11, 'maya', 'The hearing asks the same thing three ways.'],
  [11, 'lena', 'Public, Archive or Co-op. Pick.'],
  [11, 'june', 'A charter cannot be unsigned.'],
  [11, 'otto', 'The clerk wants your handwriting.'],
  [11, 'ross', 'Answer the hearing as if the Net is listening.'],
  [11, 'choir', 'Seat... seat... seat...'],
  [11, 'pete', 'Final filings are the shortest.'],
  [11, 'orbital', 'A charter is a promise we keep from above.'],
  [11, 'maya', 'Four clauses seated. One to go.'],
  [11, 'lena', 'The fork is ahead. No rush.'],
  [11, 'june', 'Sign it when you are ready.'],

  // ---- Era 12 · Last Carrier ----
  [12, 'lena', 'Fill the list. One line at a time.'],
  [12, 'maya', 'Rehearse. A bad take scratches a line.'],
  [12, 'pete', 'Accept when you are ready. Or do not.'],
  [12, 'june', 'The last carrier is just the first one, louder.'],
  [12, 'otto', 'Standing room only in the doorway.'],
  [12, 'ross', 'Everything you aired is in the book.'],
  [12, 'choir', 'We will hold the note until you finish.'],
  [12, 'orbital', 'We will remember you from orbit.'],
  [12, 'metrowave', 'You were a good competitor.'],
  [12, 'pirate', 'We never filed a form. You never missed a night.'],
  [12, 'static', 'Hold. Hold. Hold.'],
  [12, 'pete', 'The shack is still on the bench. The light is on.'],
]

export const WHISPERS: Whisper[] = ROWS.map(([era, speaker, text], i) => ({
  id: `whisper-${String(i + 1).padStart(3, '0')}`,
  era,
  speaker,
  text,
}))

/** Whispers available at this era, optionally from one speaker. */
export function whispersForEra(era: number, speaker?: Speaker): Whisper[] {
  return WHISPERS.filter((w) => w.era <= era && (!speaker || w.speaker === speaker))
}

/** Deterministic pick from a seed — keeps the sim and UI free of Math.random. */
export function pickWhisper(era: number, seed: number): Whisper | null {
  const pool = WHISPERS.filter((w) => w.era === era)
  if (pool.length === 0) return null
  return pool[Math.abs(Math.floor(seed)) % pool.length] ?? null
}

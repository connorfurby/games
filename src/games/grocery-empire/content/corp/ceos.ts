import type { RivalId } from '../rivals'

/**
 * The people who run the rival chains. Each one has a temper (how fast a grudge builds and
 * fades), a price-war style, and things they say. Grudges only grow from what you do to them:
 * leave them alone and they leave you alone.
 */
export type WarMove = 'undercut' | 'match' | 'hold'
export type CeoMove = 'smear' | 'poach' | 'buyIn' | 'sue'

export interface CeoDef {
  rival: RivalId
  temper: 'hot' | 'proud' | 'cold' | 'sly'
  /** Grudge multiplier (hot bosses anger fast). */
  grudgeMul: number
  /** Price-war habits (weights). */
  style: Record<WarMove, number>
  /** Moves they make when angry (weights). */
  moves: Partial<Record<CeoMove, number>>
  angry: string
  calm: string
  truce: string
  winWar: string
  loseWar: string
  caughtSpy: string
  takeover: string
}

export const CEOS: Record<RivalId, CeoDef> = {
  penny: {
    rival: 'penny',
    temper: 'hot',
    grudgeMul: 1.4,
    style: { undercut: 5, match: 2, hold: 1 },
    moves: { smear: 3, poach: 1, sue: 1 },
    angry: '“You want cheap? I’ll show you cheap.”',
    calm: '“Live and let live. And let me have Tuesdays.”',
    truce: '“Fine. A truce. Keep your chalk off my lot.”',
    winWar: '“Told you. Nobody out-cheaps Penny.”',
    loseWar: '“…This isn’t over. It’s just paused.”',
    caughtSpy: '“A mole? In MY stockroom? Oh, it is ON.”',
    takeover: '“You bought my own shares out from under me. Respect. Keep the chalkboards.”',
  },
  freshway: {
    rival: 'freshway',
    temper: 'proud',
    grudgeMul: 1,
    style: { undercut: 1, match: 2, hold: 5 },
    moves: { smear: 2, poach: 3 },
    angry: '“You can’t buy taste. We’ll prove it.”',
    calm: '“There’s room for two kinds of grocer. We’re the good kind.”',
    truce: '“A truce, then. Our customers would rather we were civil.”',
    winWar: '“Quality holds. It always holds.”',
    loseWar: '“Cheap won this round. Cheap always wins one round.”',
    caughtSpy: '“A spy among the misters. How… tacky.”',
    takeover: '“The farm is yours. Water the basil.”',
  },
  megamart: {
    rival: 'megamart',
    temper: 'cold',
    grudgeMul: 0.8,
    style: { undercut: 3, match: 4, hold: 1 },
    moves: { buyIn: 3, sue: 2, poach: 1 },
    angry: '“Noted. Legal will be in touch.”',
    calm: '“You are a rounding error. For now.”',
    truce: '“Agreed. Terms attached. All forty pages.”',
    winWar: '“Scale wins. It is simple arithmetic.”',
    loseWar: '“An anomaly. We will correct it.”',
    caughtSpy: '“Industrial espionage. Our lawyers thank you for the work.”',
    takeover: '“The board has voted. Apparently it is your board now.”',
  },
  halo: {
    rival: 'halo',
    temper: 'proud',
    grudgeMul: 1.1,
    style: { undercut: 1, match: 2, hold: 5 },
    moves: { smear: 3, poach: 2 },
    angry: '“We don’t compete with discount. We correct it.”',
    calm: '“Halo customers wouldn’t shop with you anyway.”',
    truce: '“A truce. Shall we say, in writing, on nice paper?”',
    winWar: '“Premium never panics.”',
    loseWar: '“Momentary. Halos don’t tarnish.”',
    caughtSpy: '“Your spy wore last season’s shoes. Obviously.”',
    takeover: '“Keep the halos polished. Please.”',
  },
  drift: {
    rival: 'drift',
    temper: 'sly',
    grudgeMul: 1.2,
    style: { undercut: 3, match: 3, hold: 2 },
    moves: { buyIn: 2, smear: 2, sue: 1 },
    angry: '“Currents change. So do markets.”',
    calm: '“We float. You stand still. It’s fine.”',
    truce: '“A truce, like two boats sharing a harbour.”',
    winWar: '“You never saw the tide turn.”',
    loseWar: '“We’ll drift back. We always do.”',
    caughtSpy: '“A mole on a boat. Bold. Wet.”',
    takeover: '“She’s yours. Mind the anchors.”',
  },
  keelmark: {
    rival: 'keelmark',
    temper: 'cold',
    grudgeMul: 0.9,
    style: { undercut: 2, match: 4, hold: 2 },
    moves: { buyIn: 3, poach: 1, sue: 2 },
    angry: '“The convoys will route around you. Then over you.”',
    calm: '“Freight is patient. So am I.”',
    truce: '“Truce. Lanes stay where they are.”',
    winWar: '“Logistics. It was always logistics.”',
    loseWar: '“A convoy can turn. Watch for it.”',
    caughtSpy: '“Found your stowaway. Returning them by the slow route.”',
    takeover: '“The fleet is yours, captain.”',
  },
  verdant: {
    rival: 'verdant',
    temper: 'proud',
    grudgeMul: 1,
    style: { undercut: 2, match: 2, hold: 4 },
    moves: { smear: 3, sue: 1 },
    angry: '“Your seed is sad and so are you.”',
    calm: '“Grow what you like. We’ll grow it better.”',
    truce: '“A truce. Seeds need peace to sprout.”',
    winWar: '“Roots run deep.”',
    loseWar: '“Every harvest has a bad week.”',
    caughtSpy: '“A mole in the seed vault. Moles eat roots, you know.”',
    takeover: '“Tend the greenhouses. They remember.”',
  },
  static: {
    rival: 'static',
    temper: 'sly',
    grudgeMul: 1.3,
    style: { undercut: 4, match: 2, hold: 2 },
    moves: { smear: 2, buyIn: 2, poach: 2 },
    angry: '“We’ll jam your frequency.”',
    calm: '“Night shift is ours. Days are yours.”',
    truce: '“Truce. Radio silence.”',
    winWar: '“You lost the signal.”',
    loseWar: '“Static clears. Static returns.”',
    caughtSpy: '“We heard your spy breathing on the line.”',
    takeover: '“The frequency is yours. Say something nice on it.”',
  },
  concord: {
    rival: 'concord',
    temper: 'cold',
    grudgeMul: 0.7,
    style: { undercut: 2, match: 4, hold: 3 },
    moves: { sue: 3, buyIn: 2 },
    angry: '“We will see you at the treaty court.”',
    calm: '“Concord. It means agreement. Agree with us.”',
    truce: '“Truce, by clause seven, subsection b.”',
    winWar: '“As negotiated.”',
    loseWar: '“We will table a motion.”',
    caughtSpy: '“A breach of protocol. Filed.”',
    takeover: '“The treaty passes to you. Sign here, and here.”',
  },
  ration: {
    rival: 'ration',
    temper: 'hot',
    grudgeMul: 1.3,
    style: { undercut: 5, match: 2, hold: 1 },
    moves: { smear: 2, buyIn: 2, sue: 2, poach: 1 },
    angry: '“Grey boxes. Everywhere. Including your parking lot.”',
    calm: '“Efficient. Sufficient. That’s all anyone needs.”',
    truce: '“Truce. Rationed, of course.”',
    winWar: '“Less is more. More is waste.”',
    loseWar: '“Inefficient. Recalculating.”',
    caughtSpy: '“Your spy was found. Their ration has been reduced.”',
    takeover: '“The boxes are yours. They’re all the same box.”',
  },
}

/** Rock-paper-scissors for the head-to-head price war. */
export function warBeats(a: WarMove, b: WarMove): boolean {
  return (a === 'undercut' && b === 'hold') || (a === 'match' && b === 'undercut') || (a === 'hold' && b === 'match')
}

export const WAR_MOVES: { id: WarMove; name: string; hint: string }[] = [
  { id: 'undercut', name: 'Undercut', hint: 'Slash prices. Beats a rival who holds; loses to one who matches.' },
  { id: 'match', name: 'Match', hint: 'Match them penny for penny. Beats an undercut; loses to a held line.' },
  { id: 'hold', name: 'Hold the line', hint: 'Keep prices, lean on your name. Beats matching; loses to an undercut.' },
]

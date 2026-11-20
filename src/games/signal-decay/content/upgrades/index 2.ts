import type { GameState } from '../../sim/state'
import { softCap } from '../../sim/helpers'

export type UpgradeTree =
  | 'antenna'
  | 'tuner'
  | 'transmitter'
  | 'format'
  | 'audience'
  | 'power'
  | 'license'
  | 'archive'
  | 'night'
  | 'capital'

export interface UpgradeDef {
  id: string
  name: string
  tree: UpgradeTree
  baseCost: number
  growth: number
  /** Flat bonus to a named stat before soft-cap. */
  stat?: string
  perRank: number
  verb?: boolean
  era: number
}

/** [tree, id, name, stat] rows grouped by era. Cost, growth and perRank are derived below. */
type ExtraRow = [UpgradeTree, string, string, string]

const EXTRA_BY_ERA: [number, ExtraRow[]][] = [
  // Era 0
  [0, [
    ['antenna', 'antenna-wire', 'Longer Wire', 'carrier'],
    ['antenna', 'ground-stake', 'Ground Stake', 'groundPlane'],
    ['antenna', 'rabbit-ears', 'Rabbit Ears', 'carrier'],
    ['tuner', 'dial-grease', 'Dial Grease', 'fineStep'],
    ['tuner', 'drift-trim', 'Drift Trim', 'drift'],
    ['tuner', 'quiet-knob', 'Quiet Knob', 'noiseCut'],
    ['tuner', 'thumb-weight', 'Thumb Weight', 'holdPush'],
    ['transmitter', 'key-contacts', 'Clean Key Contacts', 'modDepth'],
    ['transmitter', 'sidetone', 'Sidetone Level', 'pilotTone'],
    ['format', 'hello-script', 'Hello Script', 'patience'],
    ['format', 'station-id-card', 'Station ID Card', 'jingleLift'],
    ['audience', 'porch-listener', 'Porch Listener', 'callerFlow'],
    ['audience', 'neighbor-ear', 'Neighbor Ear', 'loyalty'],
    ['power', 'battery-swap', 'Battery Swap', 'batteryHold'],
    ['power', 'fuse-wire', 'Fuse Wire', 'fuseMargin'],
    ['license', 'form-one', 'Form One', 'filingSpeed'],
    ['license', 'call-sign-pen', 'Call Sign Pen', 'callSign'],
    ['archive', 'shoebox-tapes', 'Shoebox Tapes', 'shelfDepth'],
    ['archive', 'label-maker', 'Label Maker', 'indexing'],
    ['night', 'night-kettle', 'Night Kettle', 'graveyardPad'],
    ['night', 'dx-notebook', 'DX Notebook', 'dxRange'],
    ['capital', 'coin-jar', 'Coin Jar', 'reserve'],
    ['capital', 'petty-drawer', 'Petty Drawer', 'goodwill'],
  ]],
  // Era 1
  [1, [
    ['antenna', 'roof-mast', 'Roof Mast', 'carrier'],
    ['antenna', 'ladder-clamp', 'Ladder Clamp', 'groundPlane'],
    ['tuner', 'vernier-dial', 'Vernier Dial', 'fineStep'],
    ['tuner', 'lock-latch', 'Lock Latch', 'lockSpeed'],
    ['tuner', 'static-gate', 'Static Gate', 'noiseCut'],
    ['transmitter', 'log-ink', 'Log Ink', 'logSpeed'],
    ['transmitter', 'carbon-mic', 'Carbon Mic', 'modDepth'],
    ['format', 'call-board', 'Call Board', 'patience'],
    ['format', 'top-of-hour', 'Top of Hour', 'clockSlip'],
    ['format', 'walk-in-slot', 'Walk-in Slot', 'checkInPad'],
    ['audience', 'front-porch-line', 'Front Porch Line', 'airRate'],
    ['audience', 'pen-pal-drawer', 'Pen Pal Drawer', 'loyalty'],
    ['audience', 'request-box', 'Request Box', 'callerFlow'],
    ['power', 'line-filter', 'Line Filter', 'surge'],
    ['power', 'tube-socket', 'Tube Socket', 'tubeLife'],
    ['license', 'postmark-stamp', 'Postmark Stamp', 'filingSpeed'],
    ['license', 'clerk-handshake', 'Clerk Handshake', 'auditShield'],
    ['archive', 'dust-sleeve', 'Dust Sleeve', 'quietPad'],
    ['archive', 'index-cards', 'Index Cards', 'indexing'],
    ['night', 'dusk-log', 'Dusk Log', 'skipForecast'],
    ['capital', 'layaway-ledger', 'Layaway Ledger', 'reserve'],
    ['capital', 'sponsor-card', 'Sponsor Card', 'leverage'],
  ]],
  // Era 2
  [2, [
    ['antenna', 'yagi-sketch', 'Yagi Sketch', 'sidelobe'],
    ['antenna', 'guy-wires', 'Guy Wires', 'carrier'],
    ['tuner', 'crystal-oven', 'Crystal Oven', 'drift'],
    ['tuner', 'ferrite-slug', 'Ferrite Slug', 'lockSpeed'],
    ['transmitter', 'pilot-lamp', 'Pilot Lamp', 'pilotTone'],
    ['transmitter', 'duty-timer', 'Duty Timer', 'dutyCycle'],
    ['format', 'segue-card', 'Segue Card', 'segueTight'],
    ['format', 'hot-clock', 'Hot Clock', 'clockSlip'],
    ['audience', 'club-roster', 'Club Roster', 'loyalty'],
    ['audience', 'shout-sheet', 'Shout Sheet', 'shoutout'],
    ['power', 'ballast-bank', 'Ballast Bank', 'cooling'],
    ['power', 'surge-strip', 'Surge Strip', 'surge'],
    ['license', 'tower-lease', 'Tower Lease', 'towerWeight'],
    ['license', 'inspector-lunch', 'Inspector Lunch', 'auditShield'],
    ['archive', 'reel-rack', 'Reel Rack', 'shelfDepth'],
    ['archive', 'splice-block', 'Splice Block', 'restoreSpeed'],
    ['night', 'late-shift-thermos', 'Late Shift Thermos', 'graveyardPad'],
    ['night', 'skip-chart', 'Skip Chart', 'skipForecast'],
    ['capital', 'bank-note', 'Bank Note', 'leverage'],
    ['capital', 'ledger-lamp', 'Ledger Lamp', 'reserve'],
  ]],
  // Era 3
  [3, [
    ['antenna', 'phased-pair', 'Phased Pair', 'polar'],
    ['antenna', 'bird-guard', 'Bird Guard', 'birdMul'],
    ['tuner', 'notch-filter', 'Notch Filter', 'noiseCut'],
    ['tuner', 'auto-lock', 'Auto Lock', 'lockSpeed'],
    ['transmitter', 'linear-stage', 'Linear Stage', 'dutyCycle'],
    ['transmitter', 'limiter-coil', 'Limiter Coil', 'modDepth'],
    ['format', 'jingle-cart', 'Jingle Cart', 'jingleLift'],
    ['format', 'rotation-wheel', 'Rotation Wheel', 'segueTight'],
    ['audience', 'call-in-line', 'Call-in Line', 'callerFlow'],
    ['audience', 'fan-club-stamp', 'Fan Club Stamp', 'starRecover'],
    ['power', 'fan-cowl', 'Fan Cowl', 'cooling'],
    ['power', 'diesel-backup', 'Diesel Backup', 'batteryHold'],
    ['license', 'lawyer-retainer', 'Lawyer Retainer', 'auditShield'],
    ['license', 'exam-flashcards', 'Exam Flashcards', 'examPad'],
    ['archive', 'acetate-sleeves', 'Acetate Sleeves', 'quietPad'],
    ['archive', 'reel-index', 'Reel Index', 'indexing'],
    ['night', 'dx-window', 'DX Window', 'dxRange'],
    ['night', 'skip-ledger', 'Skip Ledger', 'skipMul'],
    ['capital', 'line-of-credit', 'Line of Credit', 'leverage'],
    ['capital', 'rainy-day-fund', 'Rainy Day Fund', 'reserve'],
  ]],
  // Era 4
  [4, [
    ['antenna', 'dipole-array', 'Dipole Array', 'sidelobe'],
    ['antenna', 'radial-field', 'Radial Field', 'groundPlane'],
    ['tuner', 'rf-preselector', 'RF Preselector', 'noiseCut'],
    ['tuner', 'fine-tune-gear', 'Fine-tune Gear', 'fineStep'],
    ['transmitter', 'modulation-monitor', 'Modulation Monitor', 'modDepth'],
    ['format', 'daypart-grid', 'Daypart Grid', 'clockSlip'],
    ['audience', 'listener-diary', 'Listener Diary', 'loyalty'],
    ['power', 'cooling-loop', 'Cooling Loop', 'cooling'],
    ['license', 'filing-clerk', 'Filing Clerk', 'filingSpeed'],
    ['archive', 'transfer-deck', 'Transfer Deck', 'restoreSpeed'],
    ['night', 'graveyard-slot', 'Graveyard Slot', 'graveyardPad'],
    ['capital', 'credit-union', 'Credit Union', 'goodwill'],
  ]],
  // Era 5
  [5, [
    ['antenna', 'tower-top-beacon', 'Tower-top Beacon', 'carrier'],
    ['antenna', 'stacked-yagis', 'Stacked Yagis', 'polar'],
    ['tuner', 'pll-board', 'PLL Board', 'lockSpeed'],
    ['tuner', 'drift-lock', 'Drift Lock', 'drift'],
    ['transmitter', 'pa-bias', 'PA Bias', 'dutyCycle'],
    ['transmitter', 'sideband-filter', 'Sideband Filter', 'modDepth'],
    ['format', 'season-bible', 'Season Bible', 'seasonGain'],
    ['format', 'segue-script', 'Segue Script', 'segueTight'],
    ['audience', 'street-team', 'Street Team', 'callerFlow'],
    ['audience', 'radio-club', 'Radio Club', 'loyalty'],
    ['power', 'transformer-oil', 'Transformer Oil', 'cooling'],
    ['power', 'tube-bank', 'Tube Bank', 'tubeLife'],
    ['license', 'renewal-calendar', 'Renewal Calendar', 'filingSpeed'],
  ]],
  // Era 6
  [6, [
    ['antenna', 'aperture-tilt', 'Aperture Tilt', 'gainTilt'],
    ['transmitter', 'peak-meter', 'Peak Meter', 'pilotTone'],
    ['format', 'sweeps-prep', 'Sweeps Prep', 'jingleLift'],
    ['audience', 'drive-time-crowd', 'Drive-time Crowd', 'airRate'],
    ['license', 'call-sign-vanity', 'Vanity Call Sign', 'callSign'],
    ['license', 'audit-binder', 'Audit Binder', 'auditShield'],
    ['archive', 'vault-shelf', 'Vault Shelf', 'shelfDepth'],
    ['archive', 'humidity-seal', 'Humidity Seal', 'quietPad'],
    ['night', 'dx-atlas', 'DX Atlas', 'dxRange'],
    ['night', 'moonlit-skip', 'Moonlit Skip', 'skipMul'],
    ['capital', 'bond-issue', 'Bond Issue', 'leverage'],
  ]],
  // Era 7
  [7, [
    ['antenna', 'rotor-mast', 'Rotor Mast', 'polar'],
    ['antenna', 'high-gain-lobe', 'High-gain Lobe', 'gainTilt'],
    ['tuner', 'spectrum-scope', 'Spectrum Scope', 'fineStep'],
    ['transmitter', 'exciter-rack', 'Exciter Rack', 'modDepth'],
    ['format', 'format-wheel', 'Format Wheel', 'clockSlip'],
    ['audience', 'appointment-listening', 'Appointment Listening', 'loyalty'],
    ['power', 'generator-hall', 'Generator Hall', 'batteryHold'],
    ['license', 'lease-extension', 'Lease Extension', 'towerWeight'],
    ['archive', 'tape-baker', 'Tape Baker', 'restoreSpeed'],
    ['archive', 'digitizing-queue', 'Digitizing Queue', 'indexing'],
    ['capital', 'endowment-seed', 'Endowment Seed', 'reserve'],
  ]],
  // Era 8
  [8, [
    ['antenna', 'sky-hook', 'Sky Hook', 'birdMul'],
    ['tuner', 'noise-blanker', 'Noise Blanker', 'noiseCut'],
    ['tuner', 'lockstep-dial', 'Lockstep Dial', 'lockSpeed'],
    ['transmitter', 'packet-modem', 'Packet Modem', 'logSpeed'],
    ['format', 'promo-rotator', 'Promo Rotator', 'seasonGain'],
    ['audience', 'shoutout-wall', 'Shoutout Wall', 'shoutout'],
    ['power', 'solar-array', 'Solar Array', 'surge'],
    ['license', 'spectrum-counsel', 'Spectrum Counsel', 'auditShield'],
    ['archive', 'cold-storage', 'Cold Storage', 'shelfDepth'],
    ['night', 'packet-beacon', 'Packet Beacon', 'packetGain'],
    ['night', 'ghost-window', 'Ghost Window', 'skipForecast'],
  ]],
  // Era 9
  [9, [
    ['antenna', 'phased-quad', 'Phased Quad', 'sidelobe'],
    ['tuner', 'pilot-servo', 'Pilot Servo', 'drift'],
    ['transmitter', 'duty-governor', 'Duty Governor', 'dutyCycle'],
    ['format', 'pilot-episode', 'Pilot Episode', 'seasonGain'],
    ['audience', 'superfan-tier', 'Superfan Tier', 'starRecover'],
    ['power', 'grid-tie', 'Grid Tie', 'surge'],
    ['license', 'renewal-lobby', 'Renewal Lobby', 'filingSpeed'],
    ['archive', 'restoration-bay', 'Restoration Bay', 'restoreSpeed'],
    ['night', 'all-night-ledger', 'All-night Ledger', 'graveyardPad'],
    ['capital', 'syndication-fee', 'Syndication Fee', 'goodwill'],
  ]],
  // Era 10
  [10, [
    ['antenna', 'aperture-array', 'Aperture Array', 'carrier'],
    ['tuner', 'lock-cascade', 'Lock Cascade', 'lockSpeed'],
    ['transmitter', 'harmonic-trap', 'Harmonic Trap', 'modDepth'],
    ['format', 'phrase-clock', 'Phrase Clock', 'clockSlip'],
    ['audience', 'listening-party', 'Listening Party', 'callerFlow'],
    ['power', 'tube-museum', 'Tube Museum', 'tubeLife'],
    ['license', 'charter-amendment', 'Charter Amendment', 'callSign'],
    ['archive', 'phrase-index', 'Phrase Index', 'indexing'],
    ['night', 'deep-skip', 'Deep Skip', 'dxRange'],
    ['capital', 'dividend-policy', 'Dividend Policy', 'leverage'],
  ]],
  // Era 11
  [11, [
    ['antenna', 'skywave-horn', 'Skywave Horn', 'gainTilt'],
    ['tuner', 'zero-drift-core', 'Zero-drift Core', 'drift'],
    ['transmitter', 'broadcast-bus', 'Broadcast Bus', 'pilotTone'],
    ['format', 'sign-off-script', 'Sign-off Script', 'segueTight'],
    ['audience', 'chorus-of-callers', 'Chorus of Callers', 'loyalty'],
    ['power', 'reserve-bank', 'Reserve Bank', 'batteryHold'],
    ['license', 'final-filing', 'Final Filing', 'auditShield'],
    ['archive', 'seal-vault', 'Seal Vault', 'shelfDepth'],
    ['night', 'dawn-handoff', 'Dawn Handoff', 'skipForecast'],
    ['capital', 'trust-deed', 'Trust Deed', 'reserve'],
  ]],
  // Era 12
  [12, [
    ['antenna', 'last-lobe', 'Last Lobe', 'polar'],
    ['tuner', 'perfect-pitch', 'Perfect Pitch', 'fineStep'],
    ['transmitter', 'signal-crown', 'Signal Crown', 'dutyCycle'],
    ['format', 'encore-card', 'Encore Card', 'jingleLift'],
    ['audience', 'standing-room', 'Standing Room', 'shoutout'],
    ['power', 'quiet-grid', 'Quiet Grid', 'fuseMargin'],
    ['license', 'eternal-license', 'Eternal License', 'towerWeight'],
    ['archive', 'archive-of-record', 'Archive of Record', 'restoreSpeed'],
    ['archive', 'rehearsal-tape', 'Rehearsal Tape', 'tapeGain'],
    ['night', 'last-skip', 'Last Skip', 'skipMul'],
    ['capital', 'legacy-fund', 'Legacy Fund', 'goodwill'],
  ]],
]

/** Second shelf (v0.6) — appended after every original row so the campaign bot's buy order is unchanged. */
const EXTRA_BY_ERA_B: [number, ExtraRow[]][] = [
  [0, [
    ['antenna', 'wire-insulators', 'Wire Insulators', 'carrier'],
    ['antenna', 'copper-tape', 'Copper Tape', 'groundPlane'],
    ['tuner', 'dial-lamp', 'Dial Lamp', 'fineStep'],
    ['tuner', 'knob-washer', 'Knob Washer', 'drift'],
    ['transmitter', 'mic-cable', 'Mic Cable', 'modDepth'],
    ['audience', 'kitchen-radio', 'Kitchen Radio', 'callerFlow'],
    ['power', 'extension-cord', 'Extension Cord', 'fuseMargin'],
    ['night', 'blackout-curtain', 'Blackout Curtain', 'graveyardPad'],
  ]],
  [1, [
    ['antenna', 'chimney-bracket', 'Chimney Bracket', 'carrier'],
    ['tuner', 'reduction-gear', 'Reduction Gear', 'fineStep'],
    ['transmitter', 'patch-cable', 'Patch Cable', 'logSpeed'],
    ['format', 'weather-strip', 'Weather Strip', 'patience'],
    ['audience', 'bake-sale-flyer', 'Bake Sale Flyer', 'airRate'],
    ['license', 'notary-visit', 'Notary Visit', 'filingSpeed'],
    ['archive', 'cassette-rack', 'Cassette Rack', 'shelfDepth'],
    ['capital', 'cigar-box', 'Cigar Box', 'reserve'],
  ]],
  [2, [
    ['antenna', 'tower-paint', 'Tower Paint', 'towerWeight'],
    ['tuner', 'slug-tuning-kit', 'Slug Tuning Kit', 'lockSpeed'],
    ['transmitter', 'tank-coil', 'Tank Coil', 'dutyCycle'],
    ['format', 'rundown-sheet', 'Rundown Sheet', 'clockSlip'],
    ['audience', 'pledge-drive-mug', 'Pledge Drive Mug', 'loyalty'],
    ['power', 'cable-trough', 'Cable Trough', 'surge'],
    ['license', 'permit-folder', 'Permit Folder', 'auditShield'],
    ['capital', 'payroll-ledger', 'Payroll Ledger', 'leverage'],
  ]],
  [3, [
    ['antenna', 'counterpoise', 'Counterpoise', 'groundPlane'],
    ['tuner', 'band-switch', 'Band Switch', 'noiseCut'],
    ['transmitter', 'heat-sleeve', 'Heat Sleeve', 'dutyCycle'],
    ['format', 'night-rotation', 'Night Rotation', 'segueTight'],
    ['power', 'fan-bearing', 'Fan Bearing', 'cooling'],
    ['archive', 'cleaning-fluid', 'Cleaning Fluid', 'quietPad'],
    ['night', 'skip-almanac', 'Skip Almanac', 'skipForecast'],
    ['capital', 'overdraft-note', 'Overdraft Note', 'leverage'],
  ]],
  [4, [
    ['antenna', 'sector-panel', 'Sector Panel', 'sidelobe'],
    ['tuner', 'vernier-lock', 'Vernier Lock', 'lockSpeed'],
    ['transmitter', 'monitor-scope', 'Monitor Scope', 'pilotTone'],
    ['audience', 'diary-keepers', 'Diary Keepers', 'loyalty'],
    ['license', 'exam-tutor', 'Exam Tutor', 'examPad'],
    ['archive', 'catalog-drawers', 'Catalog Drawers', 'indexing'],
    ['night', 'weather-window', 'Weather Window', 'dxRange'],
    ['capital', 'region-bond', 'Region Bond', 'goodwill'],
  ]],
  [5, [
    ['antenna', 'dish-feed', 'Dish Feed', 'gainTilt'],
    ['tuner', 'phase-detector', 'Phase Detector', 'drift'],
    ['transmitter', 'driver-stage', 'Driver Stage', 'dutyCycle'],
    ['format', 'van-schedule', 'Van Schedule', 'seasonGain'],
    ['audience', 'haul-fan-club', 'Haul Fan Club', 'starRecover'],
    ['power', 'van-inverter', 'Van Inverter', 'batteryHold'],
    ['license', 'bird-filing', 'Bird Filing', 'filingSpeed'],
    ['archive', 'haul-crate', 'Haul Crate', 'tapeGain'],
  ]],
  [6, [
    ['antenna', 'moon-bounce-array', 'Moon-bounce Array', 'polar'],
    ['tuner', 'quiet-gate', 'Quiet Gate', 'noiseCut'],
    ['transmitter', 'night-driver', 'Night Driver', 'modDepth'],
    ['format', 'quiet-hours-card', 'Quiet Hours Card', 'jingleLift'],
    ['audience', 'candlelit-listeners', 'Candlelit Listeners', 'callerFlow'],
    ['power', 'silent-fan', 'Silent Fan', 'cooling'],
    ['archive', 'dehumidifier', 'Dehumidifier', 'quietPad'],
    ['night', 'long-night-ledger', 'Long Night Ledger', 'graveyardPad'],
  ]],
  [7, [
    ['antenna', 'sub-dipole', 'Sub-dipole', 'sidelobe'],
    ['tuner', 'sub-detent', 'Sub-detent', 'fineStep'],
    ['transmitter', 'sub-oscillator', 'Sub-oscillator', 'pilotTone'],
    ['format', 'reel-calendar', 'Reel Calendar', 'seasonGain'],
    ['audience', 'guest-book', 'Guest Book', 'loyalty'],
    ['power', 'sub-battery', 'Sub Battery', 'batteryHold'],
    ['license', 'reel-clearance', 'Reel Clearance', 'auditShield'],
    ['archive', 'tape-oven', 'Tape Oven', 'restoreSpeed'],
  ]],
  [8, [
    ['antenna', 'packet-yagi', 'Packet Yagi', 'carrier'],
    ['tuner', 'packet-squelch', 'Packet Squelch', 'noiseCut'],
    ['transmitter', 'burst-buffer', 'Burst Buffer', 'logSpeed'],
    ['format', 'route-card', 'Route Card', 'clockSlip'],
    ['audience', 'stop-poll', 'Stop Poll', 'airRate'],
    ['power', 'relay-battery', 'Relay Battery', 'batteryHold'],
    ['license', 'tariff-brief', 'Tariff Brief', 'auditShield'],
    ['night', 'stop-sign-ledger', 'Stop-sign Ledger', 'packetGain'],
  ]],
  [9, [
    ['antenna', 'garden-trellis', 'Garden Trellis', 'polar'],
    ['tuner', 'season-detent', 'Season Detent', 'lockSpeed'],
    ['transmitter', 'bloom-filter', 'Bloom Filter', 'modDepth'],
    ['format', 'rerun-ban', 'Rerun Ban', 'seasonGain'],
    ['audience', 'second-row', 'Second Row', 'starRecover'],
    ['power', 'night-grid', 'Night Grid', 'surge'],
    ['archive', 'seed-vault', 'Seed Vault', 'shelfDepth'],
    ['capital', 'greenhouse-fund', 'Greenhouse Fund', 'reserve'],
  ]],
  [10, [
    ['antenna', 'mark-antenna', 'Mark Antenna', 'carrier'],
    ['tuner', 'pair-checker', 'Pair Checker', 'fineStep'],
    ['transmitter', 'phrase-modulator', 'Phrase Modulator', 'modDepth'],
    ['format', 'edge-case-card', 'Edge-case Card', 'segueTight'],
    ['audience', 'choir-roster', 'Choir Roster', 'loyalty'],
    ['power', 'handler-lamp', 'Handler Lamp', 'fuseMargin'],
    ['license', 'habit-binder', 'Habit Binder', 'filingSpeed'],
    ['archive', 'phrase-ledger', 'Phrase Ledger', 'phraseGain'],
  ]],
  [11, [
    ['antenna', 'charter-mast', 'Charter Mast', 'towerWeight'],
    ['tuner', 'clause-detent', 'Clause Detent', 'lockSpeed'],
    ['transmitter', 'seal-stamper', 'Seal Stamper', 'dutyCycle'],
    ['format', 'hearing-script', 'Hearing Script', 'patience'],
    ['audience', 'public-gallery', 'Public Gallery', 'shoutout'],
    ['license', 'clause-clerk-desk', 'Clause Clerk Desk', 'filingSpeed'],
    ['archive', 'charter-chest', 'Charter Chest', 'sealGain'],
    ['capital', 'co-op-share', 'Co-op Share', 'goodwill'],
  ]],
  [12, [
    ['antenna', 'final-aperture', 'Final Aperture', 'gainTilt'],
    ['tuner', 'last-lock', 'Last Lock', 'lockSpeed'],
    ['transmitter', 'accept-driver', 'Accept Driver', 'pilotTone'],
    ['format', 'curtain-call', 'Curtain Call', 'jingleLift'],
    ['audience', 'doorway-crowd', 'Doorway Crowd', 'loyalty'],
    ['power', 'last-light', 'Last Light', 'batteryHold'],
    ['archive', 'record-of-record', 'Record of Record', 'rehearsalPad'],
    ['capital', 'closing-fund', 'Closing Fund', 'reserve'],
  ]],
]

/** Base cost per era; tier multiplier spreads costs inside an era. */
const ERA_BASE_COST = [11, 17, 26, 38, 70, 120, 190, 280, 400, 560, 780, 1050, 1400]
const TIER_MUL = [0.7, 1, 1.4, 2, 3]
const PER_RANK_VARIANCE = [1, 0.9, 1.1, 1]

/** Default perRank by stat; unknown (new) stats use NEW_STAT_PER. */
const STAT_PER: Record<string, number> = {
  carrier: 0.08, noiseCut: 0.06, holdPush: 0.05, logSpeed: 0.07, airRate: 0.08, patience: 0.06,
  towerWeight: 0.05, cooling: 0.08, skipMul: 0.07, examPad: 0.05, birdMul: 0.06, quietPad: 0.05,
  tapeGain: 0.08, packetGain: 0.08, seasonGain: 0.08, phraseGain: 0.08, sealGain: 0.08,
  rehearsalPad: 0.04, checkInPad: 0.08, starRecover: 0.04,
}
const NEW_STAT_PER = 0.05

/** Active-feel upgrades (flagged for UI that wants to highlight verbs). */
const VERB_IDS = new Set([
  'walk-in-slot', 'call-in-line', 'dx-window', 'packet-modem', 'shoutout-wall', 'sidetone', 'hot-clock',
])

function buildExtraUpgrades(table: [number, ExtraRow[]][], tierOffset = 0): UpgradeDef[] {
  const out: UpgradeDef[] = []
  for (const [era, rows] of table) {
    rows.forEach(([tree, id, name, stat], i) => {
      const tier = i + tierOffset
      const baseCost = Math.max(8, Math.round(ERA_BASE_COST[era]! * TIER_MUL[tier % TIER_MUL.length]!))
      const growth = Math.round(Math.min(1.26, 1.13 + era * 0.011 + (tier % 3) * 0.005) * 100) / 100
      const perRank =
        Math.round((STAT_PER[stat] ?? NEW_STAT_PER) * PER_RANK_VARIANCE[tier % PER_RANK_VARIANCE.length]! * 1000) / 1000
      const def: UpgradeDef = { id, name, tree, baseCost, growth, stat, perRank, era }
      if (VERB_IDS.has(id)) def.verb = true
      out.push(def)
    })
  }
  return out
}

const ORIGINAL_UPGRADES: UpgradeDef[] = [
  { id: 'crystal-gain', name: 'Crystal Gain', tree: 'antenna', baseCost: 8, growth: 1.14, stat: 'carrier', perRank: 0.08, era: 0 },
  { id: 'noise-floor', name: 'Noise Floor Pad', tree: 'tuner', baseCost: 10, growth: 1.15, stat: 'noiseCut', perRank: 0.06, era: 0 },
  { id: 'hold-push', name: 'Hold Push', tree: 'tuner', baseCost: 12, growth: 1.14, stat: 'holdPush', perRank: 0.05, era: 0 },
  { id: 'log-speed', name: 'Log Speed', tree: 'transmitter', baseCost: 14, growth: 1.15, stat: 'logSpeed', perRank: 0.07, era: 1 },
  { id: 'air-rate', name: 'Air Rate', tree: 'audience', baseCost: 16, growth: 1.16, stat: 'airRate', perRank: 0.08, era: 1 },
  { id: 'caller-patience', name: 'Caller Patience', tree: 'format', baseCost: 18, growth: 1.15, stat: 'patience', perRank: 0.06, era: 1 },
  { id: 'tower-weight', name: 'Tower Weight', tree: 'license', baseCost: 40, growth: 1.18, stat: 'towerWeight', perRank: 0.05, era: 2 },
  { id: 'heat-sink', name: 'Heat Sink', tree: 'power', baseCost: 45, growth: 1.17, stat: 'cooling', perRank: 0.08, era: 3 },
  { id: 'skip-window', name: 'Skip Window', tree: 'night', baseCost: 55, growth: 1.18, stat: 'skipMul', perRank: 0.07, era: 3 },
  { id: 'exam-pad', name: 'Exam Pad', tree: 'license', baseCost: 80, growth: 1.2, stat: 'examPad', perRank: 0.05, era: 4 },
  { id: 'bird-pass', name: 'Bird Pass', tree: 'antenna', baseCost: 120, growth: 1.2, stat: 'birdMul', perRank: 0.06, era: 5 },
  { id: 'quiet-pad', name: 'Quiet Pad', tree: 'archive', baseCost: 150, growth: 1.2, stat: 'quietPad', perRank: 0.05, era: 6 },
  { id: 'reel-desk', name: 'Reel Desk', tree: 'archive', baseCost: 200, growth: 1.22, stat: 'tapeGain', perRank: 0.08, era: 7 },
  { id: 'packet-desk', name: 'Packet Desk', tree: 'night', baseCost: 260, growth: 1.22, stat: 'packetGain', perRank: 0.08, era: 8 },
  { id: 'season-desk', name: 'Season Desk', tree: 'format', baseCost: 320, growth: 1.22, stat: 'seasonGain', perRank: 0.08, era: 9 },
  { id: 'phrase-desk', name: 'Phrase Desk', tree: 'archive', baseCost: 400, growth: 1.22, stat: 'phraseGain', perRank: 0.08, era: 10 },
  { id: 'seal-desk', name: 'Seal Desk', tree: 'capital', baseCost: 500, growth: 1.22, stat: 'sealGain', perRank: 0.08, era: 11 },
  { id: 'rehearsal-pad', name: 'Rehearsal Pad', tree: 'capital', baseCost: 600, growth: 1.25, stat: 'rehearsalPad', perRank: 0.04, era: 12 },
  { id: 'check-in-pad', name: 'Check-in Pad', tree: 'format', baseCost: 20, growth: 1.14, stat: 'checkInPad', perRank: 0.08, era: 1 },
  { id: 'star-glow', name: 'Star Glow', tree: 'audience', baseCost: 22, growth: 1.15, stat: 'starRecover', perRank: 0.04, era: 1 },
]

export const UPGRADES: UpgradeDef[] = [
  ...ORIGINAL_UPGRADES,
  ...buildExtraUpgrades(EXTRA_BY_ERA),
  ...buildExtraUpgrades(EXTRA_BY_ERA_B, 2),
]

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
)

/** Soft-capped magnitude for a curve node. Never multiply raw ranks for curve reads. */
export function upgradeMagnitude(s: GameState, id: string): number {
  const def = UPGRADE_BY_ID[id]
  if (!def) return 0
  const ranks = s.upgrades[id] ?? 0
  if (ranks <= 0) return 0
  return softCap(ranks * def.perRank)
}

export function upgradeEffect(s: GameState, id: string): number {
  return upgradeMagnitude(s, id)
}

export function upgradeCost(s: GameState, id: string): number {
  const def = UPGRADE_BY_ID[id]
  if (!def) return Infinity
  const ranks = s.upgrades[id] ?? 0
  return def.baseCost * Math.pow(def.growth, ranks)
}

/** Additive bonus for a named stat (already soft-capped per source). */
export function statBonus(s: GameState, stat: string): number {
  let sum = 0
  for (const u of UPGRADES) {
    if (u.stat === stat) sum += upgradeMagnitude(s, u.id)
  }
  for (const d of s.doctrines) {
    if (d === `doc-${stat}`) sum += softCap(0.12)
  }
  return sum
}

/** Nodes that must be read somewhere — kept in sync by wired.test.ts */
export const WIRED_READS = new Set(UPGRADES.map((u) => u.id))

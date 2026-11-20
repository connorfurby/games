export interface NewsArticle {
  id: string
  title: string
  body: string
  atVersion: string
}

export const NEWS: NewsArticle[] = [
  {
    id: 'sd-1.2.1',
    title: 'A paused broadcast tells you',
    body: 'Opening the station starts the broadcast, even if you had paused before you left. Time you were away while paused stays where you left it. Stay paused and a clock appears after half a minute, with Resume. GAME_VERSION 1.2.1.',
    atVersion: '1.2.1',
  },
  {
    id: 'sd-1.2',
    title: 'Trees, chapters, and the walkthrough',
    body: 'Plant · Trees is now a board you pan and tap, one family at a time, with the path drawn between ranks. Each era opens as a chapter: a voice, an epigraph, and the three things the door asks. After the chapter, the walkthrough for that era offers itself. The Next strip carries the mission when a goal has no closer hint. GAME_VERSION 1.2.',
    atVersion: '1.2',
  },
  {
    id: 'sd-1.1',
    title: 'Shows, laws, and the Choir',
    body: 'Each format now has a safe show and a bold one. Bold pulls more ears and runs hotter, and a Retune can carry that show or one doctrine. All four Quiet laws change the air. The Choir hums under your show until you answer them. Towers take a policy — match, push, or quiet — and a fast manifest pays cash while leaving the lane open. Antenna and towers can be raised in quantity. GAME_VERSION 1.1.',
    atVersion: '1.1',
  },
  {
    id: 'sd-1.0',
    title: 'The whole dial, on air',
    body: 'Every hub is a PlayFrame with a room, a verb tray and sheets. The Quiet door asks Stay, Retune or Sign off with two laws, Band Plan and Birds have their own desks, and the six late Dial boards (reel, route, season, phrase, charter, Last Carrier) show live grammar and status. The Choir wakes with Subcarrier, whispers surface every ninety seconds, and 308 upgrades, 44 tours, 156 whispers and four rival faces fill the shelf. GAME_VERSION 1.0.',
    atVersion: '1.0',
  },
  {
    id: 'sd-0.6',
    title: 'The full wing',
    body: 'Department plates behind every room, a richer shack with era props, 44 named tours, 50 tips, 89 radio memos and 156 whispers. The Wiki is now a browser with sidebar topics. The Museum gets Relics, Rivals, Facings and Chests wings with portraits. 308 upgrades, staff roles and rival faces. GAME_VERSION 0.6.',
    atVersion: '0.6',
  },
  {
    id: 'sd-0.4',
    title: 'New chrome on the dial',
    body: 'Radio-skinned Modal, Toast, Tooltip, Tabs, Confirm, Chip, Field, Segmented and Stepper kit. FX layer with floaters and era-door sparks. The HUD gains a 1/2/4/8 speed ladder, Undo, and one bottleneck alert for clarity, heat, or an unpaid invoice. GAME_VERSION 0.4.',
    atVersion: '0.4',
  },
  {
    id: 'sd-0.2',
    title: 'Press and hold',
    body: 'The Lock key is a hold. The buffer fills while you press. Air pays a burst. Antenna and Crystal Gain change the shack you see.',
    atVersion: '0.2',
  },
  {
    id: 'sd-0.1',
    title: 'Crystal set online',
    body: 'Signal Decay opens the shack. Tune, hold, log, and air — the Net is listening.',
    atVersion: '0.1',
  },
]

export interface TexturePack {
  id: string
  name: string
  blurb: string
  unlock: string
  tokenCost: number
  vars: Record<string, string>
  fontDisplay: string
  fontMono: string
  /** Optional chrome pattern layered behind the shelf/shop. */
  pattern?: string
  chromeClass?: string
}

export interface LedgerSkin {
  id: string
  name: string
  blurb: string
  tokenCost: number
  /** Applied as `ledger-skin--{id}` on the ledger root. */
  cssClass: string
}

export interface UnpackFx {
  id: string
  name: string
  blurb: string
  tokenCost: number
  /** Applied as `unpack-fx--{id}` on documentElement. */
  cssClass: string
}

export interface ShopBundle {
  id: string
  name: string
  blurb: string
  packIds: string[]
  ledgerSkinIds?: string[]
  unpackFxIds?: string[]
  /** Discounted total vs sum of pack costs. */
  tokenCost: number
}

/** Shelf stickers / receipt stamps — CSS-only, presentation only. */
export interface Ornament {
  id: string
  name: string
  blurb: string
  tokenCost: number
  /** Applied as `ornament--{id}` on documentElement when equipped. */
  cssClass: string
}

export const TEXTURE_PACKS: TexturePack[] = [
  {
    id: 'receipt-classic',
    name: 'Receipt Classic',
    blurb: 'Warm near-black, cream ink, price-tag red — the default aisle light.',
    unlock: 'default',
    tokenCost: 0,
    vars: {
      '--bg': '#1a1612',
      '--bg2': '#241f19',
      '--paper': '#f3ead7',
      '--ink': '#f3ead7',
      '--muted': '#a89880',
      '--accent': '#c45c3e',
      '--danger': '#d4564e',
      '--success': '#6a9a6a',
      '--grain': 'rgba(255,240,200,0.03)',
      '--chrome-edge': '#3a2e24',
      '--chrome-shine': 'rgba(255,220,160,0.08)',
    },
    fontDisplay: '"Libre Baskerville", serif',
    fontMono: '"IBM Plex Mono", monospace',
    chromeClass: 'pack-chrome--receipt',
    pattern:
      'repeating-linear-gradient(0deg, transparent 0 11px, rgba(255,240,200,0.04) 11px 12px)',
  },
  {
    id: 'corner-bodega',
    name: 'Corner Bodega',
    blurb: 'Fluorescent green, linoleum, hand-lettered signs. Corner-store midnight.',
    unlock: 'baskets:1000',
    tokenCost: 5,
    vars: {
      '--bg': '#0e1a12',
      '--bg2': '#142218',
      '--paper': '#d6f5c8',
      '--ink': '#d6f5c8',
      '--muted': '#7aa87a',
      '--accent': '#7CFF6B',
      '--danger': '#ff6b6b',
      '--success': '#9dff9d',
      '--grain': 'rgba(120,255,100,0.04)',
      '--chrome-edge': '#1e3a28',
      '--chrome-shine': 'rgba(120,255,100,0.1)',
    },
    fontDisplay: '"Space Grotesk", sans-serif',
    fontMono: '"IBM Plex Mono", monospace',
    chromeClass: 'pack-chrome--bodega',
    pattern:
      'repeating-linear-gradient(90deg, rgba(120,255,100,0.05) 0 2px, transparent 2px 28px)',
  },
  {
    id: 'sunday-flyer',
    name: 'Sunday Flyer',
    blurb: 'Newsprint, CMYK bleed, coupon scissors. Sunday circular energy.',
    unlock: 'ads:5',
    tokenCost: 5,
    vars: {
      '--bg': '#2a2620',
      '--bg2': '#353028',
      '--paper': '#e8e0d0',
      '--ink': '#1a1a1a',
      '--muted': '#666',
      '--accent': '#e23d8a',
      '--danger': '#ff3b30',
      '--success': '#00a3e0',
      '--grain': 'rgba(0,0,0,0.08)',
      '--chrome-edge': '#4a4034',
      '--chrome-shine': 'rgba(226,61,138,0.12)',
    },
    fontDisplay: '"Space Grotesk", sans-serif',
    fontMono: '"IBM Plex Mono", monospace',
    chromeClass: 'pack-chrome--flyer',
    pattern:
      'repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 8px)',
  },
  {
    id: 'corporate-fluorescent',
    name: 'Corporate Fluorescent',
    blurb: 'Cool gray, teal accent, badge fonts.',
    unlock: 'incorporated',
    tokenCost: 8,
    vars: {
      '--bg': '#12151a',
      '--bg2': '#1a1f27',
      '--paper': '#dce4ec',
      '--ink': '#dce4ec',
      '--muted': '#7a8a9a',
      '--accent': '#2ec4b6',
      '--danger': '#e85d5d',
      '--success': '#5dba7a',
      '--grain': 'rgba(180,200,220,0.03)',
      '--chrome-edge': '#2a3440',
      '--chrome-shine': 'rgba(46,196,182,0.1)',
    },
    fontDisplay: '"Space Grotesk", sans-serif',
    fontMono: '"IBM Plex Mono", monospace',
    chromeClass: 'pack-chrome--corp',
    pattern: 'linear-gradient(180deg, rgba(46,196,182,0.06), transparent 40%)',
  },
  {
    id: 'cold-room',
    name: 'Cold Room',
    blurb: 'Blue-white, condensation, frost on panels.',
    unlock: 'coldPlant',
    tokenCost: 8,
    vars: {
      '--bg': '#0a1218',
      '--bg2': '#102028',
      '--paper': '#c8e8f5',
      '--ink': '#c8e8f5',
      '--muted': '#6a90a0',
      '--accent': '#7ad7ff',
      '--danger': '#ff8a80',
      '--success': '#80cbc4',
      '--grain': 'rgba(180,230,255,0.04)',
      '--chrome-edge': '#1a3040',
      '--chrome-shine': 'rgba(122,215,255,0.12)',
    },
    fontDisplay: '"Libre Baskerville", serif',
    fontMono: '"IBM Plex Mono", monospace',
    chromeClass: 'pack-chrome--cold',
    pattern:
      'radial-gradient(ellipse at 20% 0%, rgba(180,230,255,0.12), transparent 50%)',
  },
  {
    id: 'night-shift',
    name: 'Night Shift',
    blurb: 'Amber sodium lamps, empty aisles.',
    unlock: 'nightClerk',
    tokenCost: 6,
    vars: {
      '--bg': '#120e08',
      '--bg2': '#1c160c',
      '--paper': '#ffd59a',
      '--ink': '#ffd59a',
      '--muted': '#a08050',
      '--accent': '#ffb347',
      '--danger': '#ff7043',
      '--success': '#c5e1a5',
      '--grain': 'rgba(255,180,80,0.04)',
      '--chrome-edge': '#2a2010',
      '--chrome-shine': 'rgba(255,179,71,0.12)',
    },
    fontDisplay: '"Libre Baskerville", serif',
    fontMono: '"IBM Plex Mono", monospace',
    chromeClass: 'pack-chrome--night',
    pattern: 'radial-gradient(circle at 70% 10%, rgba(255,179,71,0.15), transparent 45%)',
  },
  {
    id: 'trading-floor',
    name: 'Trading Floor',
    blurb: 'Black + ticker green.',
    unlock: 'investBook',
    tokenCost: 8,
    vars: {
      '--bg': '#050805',
      '--bg2': '#0a120a',
      '--paper': '#33ff66',
      '--ink': '#33ff66',
      '--muted': '#1a8a3a',
      '--accent': '#00ff88',
      '--danger': '#ff3333',
      '--success': '#66ff99',
      '--grain': 'rgba(0,255,100,0.03)',
      '--chrome-edge': '#0a2010',
      '--chrome-shine': 'rgba(0,255,136,0.1)',
    },
    fontDisplay: '"IBM Plex Mono", monospace',
    fontMono: '"IBM Plex Mono", monospace',
    chromeClass: 'pack-chrome--ticker',
    pattern:
      'repeating-linear-gradient(0deg, transparent 0 14px, rgba(0,255,100,0.06) 14px 15px)',
  },
  {
    id: 'port-authority',
    name: 'Port Authority',
    blurb: 'Rust, containers, stencil type.',
    unlock: 'ocean',
    tokenCost: 10,
    vars: {
      '--bg': '#1a120e',
      '--bg2': '#241810',
      '--paper': '#e8c9a8',
      '--ink': '#e8c9a8',
      '--muted': '#8a7060',
      '--accent': '#d35400',
      '--danger': '#c0392b',
      '--success': '#27ae60',
      '--grain': 'rgba(200,120,60,0.05)',
      '--chrome-edge': '#3a2418',
      '--chrome-shine': 'rgba(211,84,0,0.12)',
    },
    fontDisplay: '"Space Grotesk", sans-serif',
    fontMono: '"IBM Plex Mono", monospace',
    chromeClass: 'pack-chrome--port',
    pattern:
      'repeating-linear-gradient(90deg, rgba(211,84,0,0.08) 0 12px, transparent 12px 48px)',
  },
  {
    id: 'vacuum-aisle',
    name: 'Vacuum Aisle',
    blurb: 'Soft black, white ink, thin cyan.',
    unlock: 'barge',
    tokenCost: 12,
    vars: {
      '--bg': '#060608',
      '--bg2': '#0c0c10',
      '--paper': '#f0f4f8',
      '--ink': '#f0f4f8',
      '--muted': '#6a7080',
      '--accent': '#00e5ff',
      '--danger': '#ff4081',
      '--success': '#69f0ae',
      '--grain': 'rgba(0,220,255,0.03)',
      '--chrome-edge': '#141820',
      '--chrome-shine': 'rgba(0,229,255,0.1)',
    },
    fontDisplay: '"Space Grotesk", sans-serif',
    fontMono: '"IBM Plex Mono", monospace',
    chromeClass: 'pack-chrome--vacuum',
    pattern: 'radial-gradient(ellipse at 50% 100%, rgba(0,229,255,0.1), transparent 55%)',
  },
  {
    id: 'off-brand-neon',
    name: 'Off-Brand Neon',
    blurb: 'Hostile pink/green, glitch ledger.',
    unlock: 'driftWar',
    tokenCost: 12,
    vars: {
      '--bg': '#0a0010',
      '--bg2': '#120018',
      '--paper': '#ff4ecd',
      '--ink': '#b8ff4e',
      '--muted': '#8860a0',
      '--accent': '#ff4ecd',
      '--danger': '#ff1744',
      '--success': '#b8ff4e',
      '--grain': 'rgba(255,0,200,0.05)',
      '--chrome-edge': '#2a0030',
      '--chrome-shine': 'rgba(255,78,205,0.14)',
    },
    fontDisplay: '"Space Grotesk", sans-serif',
    fontMono: '"IBM Plex Mono", monospace',
    chromeClass: 'pack-chrome--neon',
    pattern:
      'repeating-linear-gradient(-12deg, rgba(255,78,205,0.08) 0 3px, transparent 3px 18px)',
  },
  {
    id: 'last-ration',
    name: 'Last Ration',
    blurb: 'Almost no color. One red line.',
    unlock: 'ending',
    tokenCost: 15,
    vars: {
      '--bg': '#0c0c0c',
      '--bg2': '#141414',
      '--paper': '#c8c8c8',
      '--ink': '#c8c8c8',
      '--muted': '#666',
      '--accent': '#c41e1e',
      '--danger': '#c41e1e',
      '--success': '#888',
      '--grain': 'rgba(255,255,255,0.02)',
      '--chrome-edge': '#222',
      '--chrome-shine': 'rgba(196,30,30,0.1)',
    },
    fontDisplay: '"Libre Baskerville", serif',
    fontMono: '"IBM Plex Mono", monospace',
    chromeClass: 'pack-chrome--ration',
    pattern: 'linear-gradient(90deg, transparent 0 96%, #c41e1e 96% 100%)',
  },
  {
    id: 'hungry-universe',
    name: 'Hungry Universe',
    blurb: 'Prestige appetite-colored accent.',
    unlock: 'accept',
    tokenCost: 0,
    vars: {
      '--bg': '#140a08',
      '--bg2': '#1e100c',
      '--paper': '#ffe0c2',
      '--ink': '#ffe0c2',
      '--muted': '#a07050',
      '--accent': '#ff6a3d',
      '--danger': '#ff3d3d',
      '--success': '#ffb347',
      '--grain': 'rgba(255,100,50,0.04)',
      '--chrome-edge': '#3a1810',
      '--chrome-shine': 'rgba(255,106,61,0.12)',
    },
    fontDisplay: '"Libre Baskerville", serif',
    fontMono: '"IBM Plex Mono", monospace',
    chromeClass: 'pack-chrome--hungry',
    pattern: 'radial-gradient(circle at 50% 30%, rgba(255,106,61,0.14), transparent 50%)',
  },
]

/** Three ledger skins — visual only (CSS class on ledger). */
export const LEDGER_SKINS: LedgerSkin[] = [
  {
    id: 'torn-receipt',
    name: 'Torn Receipt',
    blurb: 'Default perforated edge, cream tape.',
    tokenCost: 0,
    cssClass: 'ledger-skin--torn-receipt',
  },
  {
    id: 'carbon-copy',
    name: 'Carbon Copy',
    blurb: 'Blue carbon-paper ghost, tight mono rows.',
    tokenCost: 4,
    cssClass: 'ledger-skin--carbon-copy',
  },
  {
    id: 'thermal-fade',
    name: 'Thermal Fade',
    blurb: 'Heat-paper gray that softens older lines.',
    tokenCost: 4,
    cssClass: 'ledger-skin--thermal-fade',
  },
]

/** Three unpack FX — visual only (document class). */
export const UNPACK_FX: UnpackFx[] = [
  {
    id: 'none',
    name: 'None',
    blurb: 'Clean unpack. No flourishes.',
    tokenCost: 0,
    cssClass: 'unpack-fx--none',
  },
  {
    id: 'confetti-crumbs',
    name: 'Confetti Crumbs',
    blurb: 'Tiny receipt scraps on unpack.',
    tokenCost: 3,
    cssClass: 'unpack-fx--confetti-crumbs',
  },
  {
    id: 'stamp-thud',
    name: 'Stamp Thud',
    blurb: 'Heavy ink stamp pulse on unpack.',
    tokenCost: 3,
    cssClass: 'unpack-fx--stamp-thud',
  },
  {
    id: 'can-clink',
    name: 'Can Clink',
    blurb: 'Tin-can tap on every unpack.',
    tokenCost: 2,
    cssClass: 'unpack-fx--can-clink',
  },
]

export const SHOP_BUNDLES: ShopBundle[] = [
  {
    id: 'bodega-starter',
    name: 'Bodega Starter',
    blurb: 'Corner Bodega + can-clink FX + torn-receipt ledger.',
    packIds: ['corner-bodega'],
    ledgerSkinIds: ['torn-receipt'],
    unpackFxIds: ['can-clink'],
    tokenCost: 6,
  },
  {
    id: 'starter-aisle',
    name: 'Starter Aisle',
    blurb: 'Bodega + Flyer at a discount.',
    packIds: ['corner-bodega', 'sunday-flyer'],
    tokenCost: 8,
  },
  {
    id: 'after-hours',
    name: 'After Hours',
    blurb: 'Night Shift + Cold Room.',
    packIds: ['night-shift', 'cold-room'],
    tokenCost: 11,
  },
  {
    id: 'deep-shelf',
    name: 'Deep Shelf',
    blurb: 'Trading Floor + Port + Vacuum.',
    packIds: ['trading-floor', 'port-authority', 'vacuum-aisle'],
    tokenCost: 24,
  },
]

/** Small shelf stickers / receipt stamps — visual only. */
export const ORNAMENTS: Ornament[] = [
  {
    id: 'price-tag',
    name: 'Price Tag',
    blurb: 'Little red corner tag on the shelf wood.',
    tokenCost: 0,
    cssClass: 'ornament--price-tag',
  },
  {
    id: 'sold-stamp',
    name: 'Sold Stamp',
    blurb: 'Ink “SOLD” mark on the shelf hero.',
    tokenCost: 2,
    cssClass: 'ornament--sold-stamp',
  },
  {
    id: 'aisle-star',
    name: 'Aisle Star',
    blurb: 'Gold foil star near the game cards.',
    tokenCost: 2,
    cssClass: 'ornament--aisle-star',
  },
  {
    id: 'bodega-tape',
    name: 'Bodega Tape',
    blurb: 'Torn packing tape stripe across the shelf.',
    tokenCost: 3,
    cssClass: 'ornament--bodega-tape',
  },
  {
    id: 'receipt-corner',
    name: 'Receipt Corner',
    blurb: 'Perforated scrap tucked under the brand.',
    tokenCost: 3,
    cssClass: 'ornament--receipt-corner',
  },
  {
    id: 'open-sign',
    name: 'Open Sign',
    blurb: 'Neon OPEN glow along the shelf hero — the counter never really closes.',
    tokenCost: 4,
    cssClass: 'ornament--open-sign',
  },
]

function swapPrefixedClass(prefix: string, next?: string) {
  const root = document.documentElement
  for (const c of [...root.classList]) {
    if (c.startsWith(prefix)) root.classList.remove(c)
  }
  if (next) root.classList.add(next)
}

export function applyPack(packId: string) {
  const pack = TEXTURE_PACKS.find((p) => p.id === packId) ?? TEXTURE_PACKS[0]
  const root = document.documentElement
  for (const [k, v] of Object.entries(pack.vars)) root.style.setProperty(k, v)
  // Mirror into --ge-* so grocery HUD picks up pack chrome even before CSS cascade.
  const mirror: Record<string, string> = {
    '--bg': '--ge-bg',
    '--bg2': '--ge-bg2',
    '--paper': '--ge-paper',
    '--ink': '--ge-ink',
    '--muted': '--ge-muted',
    '--accent': '--ge-accent',
    '--danger': '--ge-danger',
    '--success': '--ge-success',
    '--grain': '--ge-grain',
  }
  for (const [from, to] of Object.entries(mirror)) {
    const v = pack.vars[from]
    if (v) root.style.setProperty(to, v)
  }
  root.style.setProperty('--font-display', pack.fontDisplay)
  root.style.setProperty('--font-mono', pack.fontMono)
  root.style.setProperty('--ge-font-display', pack.fontDisplay)
  root.style.setProperty('--ge-font-mono', pack.fontMono)
  if (pack.pattern) root.style.setProperty('--pack-pattern', pack.pattern)
  else root.style.removeProperty('--pack-pattern')
  root.dataset.pack = pack.id
  swapPrefixedClass('pack-chrome--', pack.chromeClass)
}

export function applyLedgerSkin(skinId: string) {
  const skin = LEDGER_SKINS.find((s) => s.id === skinId) ?? LEDGER_SKINS[0]
  document.documentElement.dataset.ledgerSkin = skin.id
  swapPrefixedClass('ledger-skin--', skin.cssClass)
}

export function applyUnpackFx(fxId: string) {
  const fx = UNPACK_FX.find((f) => f.id === fxId) ?? UNPACK_FX[0]
  document.documentElement.dataset.unpackFx = fx.id
  swapPrefixedClass('unpack-fx--', fx.cssClass)
}

/** Sync multi-equip ornament classes on <html> (presentation only). */
export function applyOrnaments(ids: string[]) {
  const root = document.documentElement
  const wanted = new Set(
    ids
      .map((id) => ORNAMENTS.find((o) => o.id === id)?.cssClass)
      .filter((c): c is string => !!c),
  )
  for (const c of [...root.classList]) {
    if (c.startsWith('ornament--') && !wanted.has(c)) root.classList.remove(c)
  }
  for (const c of wanted) root.classList.add(c)
  root.dataset.ornaments = [...wanted].join(' ') || ''
}

export function applyCosmetics(opts: {
  packId: string
  ledgerSkinId?: string
  unpackFxId?: string
  ornamentIds?: string[]
}) {
  applyPack(opts.packId)
  if (opts.ledgerSkinId) applyLedgerSkin(opts.ledgerSkinId)
  if (opts.unpackFxId) applyUnpackFx(opts.unpackFxId)
  if (opts.ornamentIds) applyOrnaments(opts.ornamentIds)
}

export function previewPackVars(packId: string): Record<string, string> {
  const pack = TEXTURE_PACKS.find((p) => p.id === packId) ?? TEXTURE_PACKS[0]
  return {
    ...pack.vars,
    '--font-display': pack.fontDisplay,
    '--font-mono': pack.fontMono,
  }
}

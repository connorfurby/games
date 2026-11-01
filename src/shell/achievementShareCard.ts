import type { AchievementDef } from '@/achievements/registry'

const W = 720
const H = 400

const TIER_COLOR: Record<AchievementDef['tier'], string> = {
  bronze: '#b87333',
  silver: '#c0c7d0',
  gold: '#d4a84b',
  mythic: '#c45c3e',
}

export type AchievementShareCard = {
  a: Pick<AchievementDef, 'id' | 'name' | 'blurb' | 'tier'>
  unlockedAt: number
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (ctx.measureText(next).width > maxWidth && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = next
    }
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 4)
}

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return new Date(ms).toISOString().slice(0, 10)
  }
}

function triggerPngDownload(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) {
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      return
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
  }, 'image/png')
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  card: AchievementShareCard,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const { a, unlockedAt } = card
  const tierColor = TIER_COLOR[a.tier] ?? '#c45c3e'
  const pad = Math.max(16, Math.round(w * 0.055))
  const scale = w / W

  const grad = ctx.createLinearGradient(x, y, x + w, y + h)
  grad.addColorStop(0, '#2a2018')
  grad.addColorStop(1, '#120e0a')
  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, h)

  ctx.fillStyle = tierColor
  ctx.fillRect(x, y, Math.max(6, Math.round(12 * scale)), h)

  ctx.fillStyle = '#a89880'
  ctx.font = `${Math.round(16 * scale)}px "IBM Plex Mono", ui-monospace, monospace`
  ctx.fillText('GROCERY EMPIRE · ACHIEVEMENT', x + pad, y + Math.round(48 * scale))

  ctx.fillStyle = '#f3ead7'
  ctx.font = `bold ${Math.round(42 * scale)}px "Libre Baskerville", Georgia, serif`
  ctx.fillText(a.name.slice(0, 42), x + pad, y + Math.round(120 * scale))

  ctx.fillStyle = '#c8b8a0'
  ctx.font = `${Math.round(20 * scale)}px "IBM Plex Mono", ui-monospace, monospace`
  const lines = wrapLines(ctx, a.blurb, w - pad * 2)
  lines.forEach((line, i) =>
    ctx.fillText(line, x + pad, y + Math.round(170 * scale) + i * Math.round(28 * scale)),
  )

  ctx.fillStyle = tierColor
  ctx.font = `bold ${Math.round(18 * scale)}px "IBM Plex Mono", ui-monospace, monospace`
  ctx.fillText(a.tier.toUpperCase(), x + pad, y + h - Math.round(48 * scale))

  ctx.fillStyle = '#a89880'
  ctx.font = `${Math.round(16 * scale)}px "IBM Plex Mono", ui-monospace, monospace`
  const date = formatDate(unlockedAt)
  const dateW = ctx.measureText(date).width
  ctx.fillText(date, x + w - pad - dateW, y + h - Math.round(48 * scale))
}

/** Draw a simple achievement card and trigger a PNG download. No external deps. */
export function downloadAchievementShareCard(
  a: Pick<AchievementDef, 'id' | 'name' | 'blurb' | 'tier'>,
  unlockedAt: number,
): void {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  drawCard(ctx, { a, unlockedAt }, 0, 0, W, H)
  triggerPngDownload(canvas, `achievement-${a.id}.png`)
}

/**
 * Collage PNG of up to 4 selected unlocked achievements (2×2 grid).
 * Single selection falls back to the solo share card.
 */
export function downloadAchievementGallery(cards: AchievementShareCard[]): void {
  const slice = cards.slice(0, 4)
  if (slice.length === 0) return
  if (slice.length === 1) {
    downloadAchievementShareCard(slice[0].a, slice[0].unlockedAt)
    return
  }

  const cols = slice.length <= 2 ? slice.length : 2
  const rows = Math.ceil(slice.length / cols)
  const gap = 16
  const cellW = W
  const cellH = H
  const canvas = document.createElement('canvas')
  canvas.width = cols * cellW + (cols + 1) * gap
  canvas.height = rows * cellH + (rows + 1) * gap
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#0c0a08'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#a89880'
  ctx.font = '18px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText('GROCERY EMPIRE · GALLERY', gap, gap + 14)

  slice.forEach((card, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = gap + col * (cellW + gap)
    const y = gap + 10 + row * (cellH + gap)
    drawCard(ctx, card, x, y, cellW, cellH)
  })

  const ids = slice.map((c) => c.a.id).join('-').slice(0, 48)
  triggerPngDownload(canvas, `achievement-gallery-${ids}.png`)
}

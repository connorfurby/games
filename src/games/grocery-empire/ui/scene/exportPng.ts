/**
 * Save what is on screen in a container (one or more stacked SVGs) as a PNG.
 * Scene colours come from CSS variables, so each element's computed paint is copied
 * inline before the SVG is drawn onto a canvas.
 */
const PROPS = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'fill-opacity',
  'opacity',
  'stop-color',
  'stop-opacity',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
  'text-anchor',
  'visibility',
  'display',
] as const

function inlineStyles(src: Element, dst: Element) {
  const cs = getComputedStyle(src)
  const style = PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';')
  dst.setAttribute('style', style)
  const a = src.children
  const b = dst.children
  for (let i = 0; i < a.length && i < b.length; i++) inlineStyles(a[i]!, b[i]!)
}

function svgToImage(svg: SVGSVGElement, w: number, h: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  inlineStyles(svg, clone)
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const xml = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

export async function exportScenePng(container: HTMLElement, caption: { title: string; sub: string }, fileName: string) {
  const box = container.getBoundingClientRect()
  const scale = 2
  const captionH = 64
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(box.width * scale)
  canvas.height = Math.round((box.height + captionH) * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(scale, scale)
  ctx.fillStyle = '#0d1114'
  ctx.fillRect(0, 0, box.width, box.height + captionH)
  for (const svg of Array.from(container.querySelectorAll('svg'))) {
    const r = svg.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    try {
      const img = await svgToImage(svg, r.width, r.height)
      ctx.drawImage(img, r.left - box.left, r.top - box.top, r.width, r.height)
    } catch {
      /* skip a layer that will not rasterise */
    }
  }
  ctx.fillStyle = '#efe9dc'
  ctx.font = '600 20px Georgia, serif'
  ctx.fillText(caption.title, 20, box.height + 30)
  ctx.fillStyle = '#a9b0a8'
  ctx.font = '14px system-ui, sans-serif'
  ctx.fillText(caption.sub, 20, box.height + 52)
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

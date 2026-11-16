const { chromium } = require('/home/claude/games/node_modules/playwright')
const fs = require('fs')
const MENUS = ['floor','backroom','build','suppliers','cold','logistics','staff','marketing','rivals','ventures','books','invest','politics','empire','map','upgrades','strategy','land','fleet','relics','planets','exchange','cultivars','signal','charter','lastaisle']
const NAMES = {floor:'Floor',backroom:'Backroom',build:'Build',suppliers:'Suppliers',cold:'Cold',logistics:'Logistics',staff:'Staff',marketing:'Marketing',rivals:'Rivals',ventures:'Ventures',books:'Books',invest:'Invest',politics:'Politics',empire:'Empire',map:'Map',upgrades:'Upgrades',strategy:'Strategy',land:'Land',fleet:'Fleet',relics:'Relics',planets:'Planets',exchange:'Exchange',cultivars:'Cultivars',signal:'Signal',charter:'Charter',lastaisle:'Last Aisle'}
const STAGES = process.env.ONE ? ['Era 2 · Chain'] : ['Era 0 · Mid counter','Era 1 · Corner store','Era 2 · Chain','Era 3 · Cold chain','Era 4 · Globe','Era 5 · Seed barges','Era 6 · Ending ready','Era 7 · Worlds']
;(async () => {
  const [,, w, h, tag] = process.argv
  const out = `/home/claude/audit/${tag}`; fs.mkdirSync(out, { recursive: true })
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
  const ctx = await b.newContext({ viewport: { width: +w, height: +h } })
  const p = await ctx.newPage(); p.setDefaultTimeout(5000)
  let errs = []
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)))
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 200)) })
  const results = []
  for (const stage of STAGES) {
    await p.goto('http://localhost:5200/play/grocery-empire/dev', { timeout: 30000 }); await p.waitForTimeout(1200)
    try {
      await p.getByTitle('Saves, settings and tools').click(); await p.waitForTimeout(300)
      const tabDev = p.locator('.g2-tools__tabs [role=tab]', { hasText: 'Dev' }); if (await tabDev.count()) await tabDev.click()
      await p.locator('.ge-dev-stage', { hasText: stage }).first().click(); await p.waitForTimeout(900)
    } catch (e) { console.log('stage fail', stage, e.message.slice(0,120)); results.push({ stage, error: 'stage select failed ' + e.message.slice(0, 100) }); continue }
    const seen = new Set()
    await p.keyboard.press('Escape').catch(() => {})
    for (const m of MENUS) {
      errs = []
      try {
        for (let i = 0; i < 2; i++) await p.keyboard.press('Escape').catch(() => {})
        await p.locator('body').click({ position: { x: 5, y: 300 }, force: true }).catch(() => {})
        await p.keyboard.press('k')
        await p.waitForSelector('.g2-palette__input', { timeout: 2000 })
        const label = await p.evaluate((id) => id, m)
        await p.fill('.g2-palette__input', NAMES[m])
        await p.waitForTimeout(150)
        const first = p.locator('.g2-palette__row').filter({ hasText: new RegExp('^Go to ' + NAMES[m] + '(?![a-z ])') }).first()
        if (!(await first.count())) { await p.keyboard.press('Escape'); continue }
        await first.click(); await p.waitForTimeout(700)
      } catch (e) { console.log('nav fail', m, e.message.slice(0,80)); continue }
      const active = await p.evaluate(() => new URLSearchParams(location.search).get('m'))
      if (active !== m || seen.has(active)) { console.log('skip', m, active); continue }
      seen.add(active)
      const file = `${out}/${stage.split(' ·')[0].replace(' ', '')}-${m}.png`
      await p.screenshot({ path: file, fullPage: false })
      const data = await p.evaluate(() => {
        const vw = innerWidth
        const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 }
        const name = (el) => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '')).slice(0, 80)
        const inScroller = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true } return false }
        const overflow = []
        for (const el of document.querySelectorAll('.ge-root *')) { if (!vis(el)) continue; const r = el.getBoundingClientRect(); if (r.right > vw + 2 && !inScroller(el)) overflow.push(name(el)) }
        const small = []
        for (const el of document.querySelectorAll('.ge-root button, .ge-root a, .ge-root [role=button], .ge-root input, .ge-root select')) { if (!vis(el)) continue; const r = el.getBoundingClientRect(); if (r.height < 28 || r.width < 24) small.push(name(el) + ` ${Math.round(r.width)}x${Math.round(r.height)}`) }
        const lum = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, bb, a = 1] = m.map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return { L: 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bb), a } }
        const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const c = lum(cs.backgroundColor); if (c && c.a > 0.85) return c } return lum('rgb(0,0,0)') }
        const lowc = []; let tiny = 0; const tinyEx = []
        const leaves = [...document.querySelectorAll('.ge-root *')].filter((el) => el.childElementCount === 0 && el.textContent.trim().length > 1 && vis(el) && !(el.closest('svg')))
        for (const el of leaves) {
          const cs = getComputedStyle(el)
          const fs = parseFloat(cs.fontSize); if (fs < 11) { tiny++; if (tinyEx.length < 6) tinyEx.push(name(el) + ' ' + fs + 'px "' + el.textContent.trim().slice(0, 30) + '"') }
          const fg = lum(cs.color); const bg = bgOf(el); if (!fg || !bg) continue
          const op = parseFloat(cs.opacity) * fg.a
          const L1 = Math.max(fg.L, bg.L), L2 = Math.min(fg.L, bg.L); let ratio = (L1 + 0.05) / (L2 + 0.05)
          if (op < 1) ratio = 1 + (ratio - 1) * op
          if (ratio < 3) lowc.push(name(el) + ` ${ratio.toFixed(2)} "${el.textContent.trim().slice(0, 30)}"`)
        }
        const clipped = []
        for (const el of leaves) { const cs = getComputedStyle(el); if (el.scrollWidth > el.clientWidth + 2 && cs.overflow.includes('hidden') && cs.textOverflow !== 'ellipsis') clipped.push(name(el) + ' "' + el.textContent.trim().slice(0, 30) + '"') }
        const rawBtn = {}
        for (const el of document.querySelectorAll('.ge-root button')) { if (!vis(el) || el.classList.contains('gk-btn')) continue; const k = (el.className || '(none)').toString().split(/\s+/)[0]; rawBtn[k] = (rawBtn[k] || 0) + 1 }
        const fonts = {}
        for (const el of leaves) { const f = getComputedStyle(el).fontSize; fonts[f] = (fonts[f] || 0) + 1 }
        const pageH = document.querySelector('.g2-main, main')?.scrollHeight ?? 0
        return { docOverflow: document.documentElement.scrollWidth > vw + 1, overflow: [...new Set(overflow)].slice(0, 8), small: small.slice(0, 10), smallN: small.length, lowc: lowc.slice(0, 10), lowcN: lowc.length, tiny, tinyEx, clipped: clipped.slice(0, 8), rawBtn, fontSizes: Object.keys(fonts).length, pageH }
      })
      results.push({ stage, menu: m, file, errs: [...new Set(errs)].slice(0, 5), ...data })
    }
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1))
  }
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1))
  console.log('done', results.length); await b.close()
})()

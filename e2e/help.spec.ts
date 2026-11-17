import { expect, test } from '@playwright/test'

/** 1.0 guidance: every department has a `?` that opens its wiki page; tips sit in the room, not over it. */
test('department help opens the wiki page for that room', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/play/grocery-empire/dev')
  await page.getByTitle('Saves, settings and tools').click()
  await page.locator('.ge-dev-stage', { hasText: 'Era 2' }).first().click()
  await page.keyboard.press('Escape')

  await page.locator('.g2-hub', { hasText: 'Team' }).click()
  await page.getByRole('button', { name: 'How Staff works' }).click()
  const wiki = page.locator('.g2-tools__wiki')
  await expect(wiki).toBeVisible()
  await expect(wiki.locator('h1')).toContainText(/staff/i)
})

test('a tip is a card in the room and Got it files it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/play/grocery-empire/dev')
  await page.getByTitle('Saves, settings and tools').click()
  await page.locator('.ge-dev-stage', { hasText: 'Era 1' }).first().click()
  await page.keyboard.press('Escape')
  // A tip is picked when a room opens (never popped in mid-visit), so walk out and back in.
  await page.locator('.g2-subtab', { hasText: 'Backroom' }).click()
  await expect(page.locator('.g2-subtab.is-active', { hasText: 'Backroom' })).toBeVisible()
  await expect(page.locator('.pf__primary button').first()).toBeVisible()
  await page.waitForTimeout(400) // let the room swap finish so Floor opens fresh
  await page.locator('.g2-subtab', { hasText: 'Floor' }).click()

  const tip = page.locator('.pf-help')
  await expect(tip).toBeVisible()
  const first = await tip.locator('.pf-help__text').textContent()
  // In the panel's flow: nothing floats over the primary verb.
  await expect(page.locator('.g2-whisper')).toHaveCount(0)
  await tip.getByRole('button', { name: 'Got it' }).click()
  await expect(page.locator('.pf-help__text', { hasText: first! })).toHaveCount(0)
  await expect(page.locator('.pf__primary button').first()).toBeInViewport()
})

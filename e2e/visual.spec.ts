import { expect, test } from '@playwright/test'

/**
 * Lightweight visual baselines for the UI refresh.
 * Capture HUD + Floor at desktop and phone; update with `npx playwright test e2e/visual.spec.ts --update-snapshots`.
 */
test.describe('visual baselines', () => {
  test('desktop floor shell', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/play/grocery-empire/dev')
    await page.getByTitle('Saves, settings and tools').click()
    await page.locator('.ge-dev-stage, .dv-stage', { hasText: 'Era 1' }).first().click()
    await page.keyboard.press('Escape')
    await page.locator('.g2-hub', { hasText: 'Store' }).click()
    await expect(page.locator('.g2-hud')).toBeVisible()
    await expect(page.locator('.g2-main')).toHaveScreenshot('desktop-floor.png', {
      maxDiffPixelRatio: 0.04,
    })
  })

  test('phone floor shell', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/play/grocery-empire/dev')
    await page.getByTitle('Saves, settings and tools').click()
    await page.locator('.ge-dev-stage, .dv-stage', { hasText: 'Era 1' }).first().click()
    await page.keyboard.press('Escape')
    await page.locator('.g2-hub', { hasText: 'Store' }).click()
    await expect(page.locator('.fl-dock .ge-unpack, .ge-unpack').first()).toBeVisible()
    await expect(page.locator('.g2-stat--baskets')).toBeVisible()
    await expect(page.locator('.ge-root')).toHaveScreenshot('phone-floor.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('empire map pins stay wired', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/play/grocery-empire/dev')
    await page.getByTitle('Saves, settings and tools').click()
    await page.locator('.ge-dev-stage, .dv-stage', { hasText: 'Era 2' }).first().click()
    await page.keyboard.press('Escape')
    await page.locator('.g2-hub', { hasText: 'Empire' }).click()
    await page.locator('.g2-subtab, .g2-hub-sub', { hasText: 'Map' }).first().click()
    await expect(page.locator('.mp-svg')).toBeVisible()
    await expect(page.locator('.mp-pin--store').first()).toBeVisible()
  })
})

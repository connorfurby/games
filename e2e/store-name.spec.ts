import { expect, test } from '@playwright/test'

/** Name your store: it lands on the storefront sign and the top bar, and survives a reload. */
test('naming the store puts it on the sign and the HUD', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/play/grocery-empire/dev')
  await page.getByTitle('Saves, settings and tools').click()
  await page.locator('.ge-dev-stage', { hasText: 'Era 2' }).first().click()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Name your store' }).click()
  const input = page.getByLabel('Store name')
  await input.fill('  Penny   Lane Market ')
  await page.getByRole('button', { name: 'Put it on the sign' }).click()

  await expect(page.locator('.g2-hud__home')).toHaveText('Penny Lane Market')
  await expect(page.locator('.sc-sign-text').first()).toHaveText('Penny Lane Market')
  await expect(page.getByRole('button', { name: 'Rename' })).toBeVisible()
})

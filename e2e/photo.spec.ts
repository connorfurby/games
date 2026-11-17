import { expect, test } from '@playwright/test'

test('Photo mode saves the street as a PNG', async ({ page }) => {
  await page.goto('/play/grocery-empire/dev')
  await page.getByTitle('Saves, settings and tools').click()
  await page.locator('.ge-dev-stage', { hasText: 'Era 2' }).first().click()
  await page.keyboard.press('Escape')
  await page.locator('button', { hasText: /^Photo$/ }).first().click()
  await expect(page.locator('.g2-photo')).toBeVisible()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save picture' }).click()])
  expect(download.suggestedFilename()).toMatch(/\.png$/)
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('.g2-photo')).toHaveCount(0)
})

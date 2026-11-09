import { expect, test } from '@playwright/test'

test('play route reloads in place and the till keeps ticking', async ({ page }) => {
  await page.goto('/play/grocery-empire')
  await expect(page.getByText("This page doesn't exist")).toHaveCount(0)
  await expect(page.locator('.ge-top__cash-num')).toBeVisible()

  const live = page.locator('.ge-live')
  const title1 = await live.getAttribute('title')
  await expect.poll(async () => live.getAttribute('title'), { timeout: 3000 }).not.toBe(title1)

  await page.reload()
  await expect(page).toHaveURL(/\/play\/grocery-empire/)
  await expect(page.locator('.ge-top__cash-num')).toBeVisible()
  await expect(page.locator('.ge-top__pace-item', { hasText: 'Cash' })).toBeVisible()
})

import { expect, test } from '@playwright/test'

test('library shelf and shell routes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Grocery Empire').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Play|Continue|Start/i }).first()).toBeVisible()

  await expect(page.locator('.hm-card--news')).toBeVisible()

  await page.goto('/shop')
  await expect(page.getByRole('heading', { name: /Dress the counter/i })).toBeVisible()

  await expect(page.locator('.shell-bar__nav').getByRole('link', { name: 'Awards' })).toBeVisible()

  await page.goto('/achievements')
  await expect(page.getByRole('heading', { name: /The wall/i })).toBeVisible()

  await page.goto('/news')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Block/)
  await expect(page.locator('.nw-lead h2')).toBeVisible()
  await page.locator('.nw-sections button', { hasText: 'Meta' }).click()
  await expect(page.locator('.nw-editions li')).toHaveCount(2)

  await page.goto('/guide/grocery-empire')
  await expect(page.getByRole('heading', { name: /night supervisor/i })).toBeVisible()
})
